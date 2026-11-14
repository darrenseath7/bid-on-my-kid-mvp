import { NextRequest } from 'next/server';
import { database, responseError, schoolCode, schoolIdentity } from '@/lib/server/schoolUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

async function scope(request: NextRequest, code: string | null) {
  const email = await schoolIdentity(request);
  const db = database();
  if (!email || !code) return null;
  const { data, error } = await db.from('bragwall_school_upload_access')
    .select('auction_code').eq('auction_code', code).eq('email', email).eq('active', true).maybeSingle();
  if (error || !data) return null;
  return { db, email, code };
}

export async function GET(request: NextRequest) {
  try {
    const access = await scope(request, schoolCode(request.nextUrl.searchParams.get('code')));
    if (!access) return responseError('School access is not available for this account.', 403);
    const { db, email, code } = access;
    const { data: school } = await db.from('demo_school_profile').select('school_name')
      .eq('auction_code', code).single();
    const { data: batches, error } = await db.from('bragwall_school_upload_batches')
      .select('id,status,created_at,expected_count').eq('auction_code', code)
      .eq('submitter_email', email).order('created_at', { ascending: false }).limit(20);
    if (error || !school) return responseError('School could not be loaded.', 500);
    return Response.json({ school: school.school_name, batches }, { headers: noStore });
  } catch { return responseError('Could not load school uploads.', 500); }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const code = schoolCode(String(data.get('code') || ''));
    const access = await scope(request, code);
    if (!access) return responseError('School access is not available for this account.', 403);
    const { db, email } = access;
    const action = String(data.get('action') || '');
    const batchId = String(data.get('batchId') || '');
    if (action === 'start') {
      const count = Number(data.get('count'));
      if (!Number.isInteger(count) || count < 1 || count > 500) return responseError('Choose 1–500 artworks.');
      const { data: school } = await db.from('demo_school_profile').select('auction_code').eq('auction_code', code!).maybeSingle();
      if (!school) return responseError('School no longer exists.', 404);
      const id = crypto.randomUUID();
      const { error } = await db.from('bragwall_school_upload_batches').insert({ id, auction_code: code, submitter_email: email, expected_count: count });
      if (error) return responseError('Could not start submission.', 500);
      return Response.json({ batchId: id }, { headers: noStore });
    }
    if (!/^[\da-f-]{36}$/i.test(batchId)) return responseError('Invalid submission.');
    const { data: batch, error: lookupError } = await db.from('bragwall_school_upload_batches')
      .select('id,status,expected_count').eq('id', batchId).eq('auction_code', code!)
      .eq('submitter_email', email).maybeSingle();
    if (lookupError || !batch || batch.status !== 'draft') return responseError('Submission is no longer editable.', 409);
    if (action === 'complete') {
      const { data: ok, error } = await db.rpc('bragwall_complete_school_upload', { p_batch: batchId, p_email: email });
      if (error) return responseError('Could not complete submission.', 500);
      if (!ok) return responseError('Some artworks are missing. Keep this tab open and retry.', 409);
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (action !== 'row') return responseError('Unknown action.');
    const index = Number(data.get('index'));
    const text = (key: string, max: number) => String(data.get(key) || '').trim().slice(0, max);
    const filename = text('filename', 160);
    const firstName = text('firstName', 100);
    const surname = text('surname', 100);
    const grade = text('grade', 60);
    const className = text('className', 60);
    if (!Number.isInteger(index) || index < 0 || index >= batch.expected_count ||
      !filename || !firstName || !surname || !grade || filename.includes('/') || filename.includes('\\'))
      return responseError('Artwork details are incomplete or invalid.');
    const { data: existing } = await db.from('bragwall_school_upload_rows').select('row_number')
      .eq('batch_id', batchId).eq('row_number', index).maybeSingle();
    if (existing) return Response.json({ ok: true, existing: true }, { headers: noStore });
    const file = data.get('image');
    if (!(file instanceof File) || file.size < 100 || file.size > 3_500_000 ||
      !['image/jpeg','image/png','image/webp'].includes(file.type)) return responseError('Use a JPG, PNG or WEBP image under 3.5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 :
      file.type === 'image/png' ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e :
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57;
    if (!valid) return responseError('The image content does not match its file type.');
    const imagePath = `${code}/${batchId}/${index}-${crypto.randomUUID()}`;
    const { error: imageError } = await db.storage.from('school-submissions').upload(imagePath, bytes, { contentType: file.type });
    if (imageError) return responseError('Could not store image.', 500);
    let voicePath: string | null = null;
    const voice = data.get('voice');
    if (voice instanceof File && voice.size) {
      const consent = data.get('voiceConfirmed') === 'true';
      if (!consent || voice.size > 2_000_000 ||
        !['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/x-m4a'].includes(voice.type)) {
        await db.storage.from('school-submissions').remove([imagePath]);
        return responseError('Voice note needs school permission confirmation and must be an MP3, M4A, OGG or WebM file under 2 MB.');
      }
      voicePath = `${code}/${batchId}/${index}-${crypto.randomUUID()}`;
      const { error: voiceError } = await db.storage.from('school-voices')
        .upload(voicePath, new Uint8Array(await voice.arrayBuffer()), { contentType: voice.type });
      if (voiceError) { await db.storage.from('school-submissions').remove([imagePath]); return responseError('Could not store voice note.', 500); }
    }
    const { error: rowError } = await db.from('bragwall_school_upload_rows').insert({
      batch_id: batchId, auction_code: code, row_number: index, filename, first_name: firstName,
      surname, grade, class_name: className || null, storage_path: imagePath, voice_path: voicePath,
    });
    if (rowError) {
      await db.storage.from('school-submissions').remove([imagePath]);
      if (voicePath) await db.storage.from('school-voices').remove([voicePath]);
      return responseError('Could not save this artwork. Retry the row.', 500);
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch { return responseError('Submission failed. Please try again.', 500); }
}

import { NextRequest } from 'next/server';
import { POST as addArtwork } from '@/app/api/admin/setup-action/route';
import { adminIdentity, database, responseError, schoolCode } from '@/lib/server/schoolUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  if (!await adminIdentity(request)) return responseError('Admin login required.', 401);
  try {
    const db = database();
    const batchId = request.nextUrl.searchParams.get('batchId');
    if (batchId) {
      if (!/^[\da-f-]{36}$/i.test(batchId)) return responseError('Invalid batch.');
      const { data: batch } = await db.from('bragwall_school_upload_batches').select('*').eq('id', batchId).maybeSingle();
      if (!batch || batch.status === 'draft') return responseError('Submission not found.', 404);
      const { data: rows, error } = await db.from('bragwall_school_upload_rows').select('*')
        .eq('batch_id', batchId).order('row_number');
      if (error) return responseError('Could not load artworks.', 500);
      const withPreviews = await Promise.all((rows || []).map(async row => {
        const { data: image } = await db.storage.from('school-submissions').createSignedUrl(row.storage_path, 600);
        const { data: voice } = row.voice_path
          ? await db.storage.from('school-voices').createSignedUrl(row.voice_path, 600)
          : { data: null };
        return { ...row, image_url: image?.signedUrl || '', voice_url: voice?.signedUrl || '' };
      }));
      return Response.json({ batch, rows: withPreviews }, { headers });
    }
    const { data, error } = await db.from('bragwall_school_upload_batches').select('*')
      .in('status', ['submitted', 'approved']).order('created_at', { ascending: false }).limit(100);
    if (error) return responseError('Could not load submissions.', 500);
    return Response.json({ batches: data }, { headers });
  } catch { return responseError('Could not load submissions.', 500); }
}

export async function POST(request: NextRequest) {
  if (!await adminIdentity(request)) return responseError('Admin login required.', 401);
  try {
    const payload = await request.json();
    const db = database();
    if (payload.action === 'access') {
      const code = schoolCode(String(payload.code || ''));
      const email = String(payload.email || '').trim().toLowerCase();
      if (!code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250)
        return responseError('Enter a valid school code and email.');
      const { data: school } = await db.from('demo_school_profile').select('auction_code').eq('auction_code', code).maybeSingle();
      if (!school) return responseError('Create the school first.', 404);
      const { error } = await db.from('bragwall_school_upload_access')
        .upsert({ auction_code: code, email, active: payload.active !== false });
      if (error) return responseError('Could not change school access.', 500);
      return Response.json({ ok: true }, { headers });
    }
    const batchId = String(payload.batchId || '');
    if (!/^[\da-f-]{36}$/i.test(batchId)) return responseError('Invalid batch.');
    const { data: batch } = await db.from('bragwall_school_upload_batches')
      .select('id,auction_code,status,expected_count').eq('id', batchId).maybeSingle();
    if (!batch || batch.status !== 'submitted') return responseError('Batch is not awaiting review.', 409);
    const { data: rows, error: rowsError } = await db.from('bragwall_school_upload_rows')
      .select('*').eq('batch_id', batchId).order('row_number');
    if (rowsError || !rows || rows.length !== batch.expected_count) return responseError('Batch rows are incomplete.', 409);
    if (payload.action === 'complete') {
      if (rows.some(row => !row.added_at)) return responseError('Review and add every row first.', 409);
      const { error } = await db.from('bragwall_school_upload_batches').update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', batchId).eq('status', 'submitted');
      if (error) return responseError('Could not complete review.', 500);
      return Response.json({ ok: true }, { headers });
    }
    if (payload.action !== 'approveRow') return responseError('Unknown action.');
    const index = Number(payload.index);
    const row = rows.find(item => item.row_number === index);
    if (!row) return responseError('Artwork not found.', 404);
    if (row.added_at) return Response.json({ ok: true, alreadyAdded: true }, { headers });
    const { data: source, error: downloadError } = await db.storage.from('school-submissions').download(row.storage_path);
    if (downloadError || !source) return responseError('Original image is missing; leave this batch for review.', 409);
    const { data: artworks, error: listError } = await db.from('demo_artworks').select('sort_order')
      .eq('auction_code', batch.auction_code).order('sort_order', { ascending: false }).limit(1);
    if (listError) return responseError('Could not check artwork order.', 500);
    const form = new FormData();
    form.set('action', 'upload-artwork'); form.set('bulkUpload', 'true');
    form.set('bulkSourceKey', `${batchId}:${index}`); form.set('auctionCode', batch.auction_code);
    form.set('childName', row.first_name); form.set('childSurname', row.surname);
    form.set('grade', row.grade); form.set('className', row.class_name || '');
    form.set('nextSortOrder', String((Number(artworks?.[0]?.sort_order) || 0) + 1));
    form.set('storyPreview', `${row.first_name} ${row.surname} created this artwork.`);
    form.set('enhanceArtwork', 'false');
    form.set('file', new File([source], row.filename.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
    const internalRequest = new NextRequest(new URL('/api/admin/setup-action', request.url), {
      method: 'POST', headers: { cookie: request.headers.get('cookie') || '' }, body: form,
    });
    const result = await addArtwork(internalRequest);
    if (!result.ok) {
      const body = await result.json().catch(() => ({}));
      return responseError(String(body.error || 'Could not add artwork.'), result.status);
    }
    if (row.voice_path) {
      const { error } = await db.from('demo_artworks').update({ child_voice_path: row.voice_path })
        .eq('auction_code', batch.auction_code).eq('bulk_source_key', `${batchId}:${index}`);
      if (error) return responseError('Artwork added, but voice note linking failed. Retry this row.', 500);
    }
    const { error: saved } = await db.from('bragwall_school_upload_rows').update({ added_at: new Date().toISOString() })
      .eq('batch_id', batchId).eq('row_number', index);
    if (saved) return responseError('Artwork added; retry to finish recording the review.', 500);
    return Response.json({ ok: true }, { headers });
  } catch { return responseError('Could not update school submission.', 500); }
}

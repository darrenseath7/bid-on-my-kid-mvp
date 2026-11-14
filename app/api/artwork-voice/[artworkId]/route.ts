import { NextRequest } from 'next/server';
import { database, responseError } from '@/lib/server/schoolUpload';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, { params }: { params: Promise<{ artworkId: string }> }) {
  const { artworkId } = await params;
  if (!/^[\da-f-]{36}$/i.test(artworkId)) return responseError('Voice note not found.', 404);
  try {
    const db = database();
    const { data: artwork } = await db.from('demo_artworks')
      .select('child_voice_path,status').eq('id', artworkId).maybeSingle();
    if (!artwork?.child_voice_path || !['pending','live','sold','archived'].includes(artwork.status || ''))
      return responseError('Voice note not found.', 404);
    const { data: file, error } = await db.storage.from('school-voices').download(artwork.child_voice_path);
    if (error || !file) return responseError('Voice note unavailable.', 404);
    const range = request.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), file.size - 1) : file.size - 1;
    if (start >= file.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } });
    return new Response(file.slice(start, end + 1), {
      status: range ? 206 : 200,
      headers: { 'Content-Type': file.type || 'audio/mpeg', 'Cache-Control': 'public, max-age=120',
        'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${file.size}` } : {}),
      },
    });
  } catch { return responseError('Voice note unavailable.', 500); }
}

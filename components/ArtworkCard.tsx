import type { Artwork } from '@/lib/types';

export function ArtworkCard({ artwork }: { artwork: Artwork | null }) {
  if (!artwork) {
    return <div className="rounded-3xl bg-white p-8 text-center shadow-sm">No artwork live yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-orange-100 to-purple-100 p-6">
        {artwork.framed_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artwork.framed_image_url} alt="Artwork" className="max-h-full max-w-full rounded-xl border-[12px] border-white object-contain shadow-xl" />
        ) : (
          <div className="rounded-xl border-[12px] border-white bg-cream p-12 text-center shadow-xl">Artwork preview</div>
        )}
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-zesty">{artwork.grade}</p>
        <h2 className="text-2xl font-black">{artwork.child_name} {artwork.child_surname}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{artwork.ai_intro || 'A rare masterpiece is about to enter the arena.'}</p>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { validWinnerToken, winnerDb } from "@/lib/server/winnerWhatsapp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your BragWall SOLD moment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ artworkId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function WinnerMoment({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { token } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(artworkId) || !token) notFound();

  const db = winnerDb();
  const { data: message, error: lookupError } = await db
    .from("auction_winner_whatsapp")
    .select("artwork_id,auction_code,bidder_contact_id")
    .eq("artwork_id", artworkId).maybeSingle();
  if (lookupError || !message ||
      !validWinnerToken(artworkId, message.bidder_contact_id, token)) notFound();

  const { data: artwork, error: artworkError } = await db
    .from("demo_artworks")
    .select("id,auction_code,status,child_name,child_surname,grade,artwork_url,enhanced_artwork_url,mc_audio_url,sold_amount")
    .eq("id", artworkId).eq("auction_code", message.auction_code).maybeSingle();
  if (artworkError || !artwork || artwork.status !== "sold") notFound();
  const displayUrl = artwork.enhanced_artwork_url || artwork.artwork_url;
  if (!displayUrl) notFound();
  const artist = [artwork.child_name, artwork.child_surname].filter(Boolean).join(" ");

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#070d1c] px-4 py-8 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_0%_75%,rgba(151,63,45,.36),transparent_40%),radial-gradient(circle_at_100%_18%,rgba(255,200,87,.2),transparent_38%)]" />
      <div aria-hidden="true" className="winner-paint pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 32 }, (_, i) => (
          <span key={i} className="winner-confetti absolute -top-8 block h-3 w-2 rounded-sm"
            style={{
              left: `${(i * 47) % 100}%`,
              backgroundColor: ["#ffc857", "#13ed77", "#ff737a", "#63c8ff"][i % 4],
              animationDelay: `${(i * 0.31) % 3}s`,
              animationDuration: `${3.5 + (i % 5) * 0.6}s`,
            }} />
        ))}
      </div>

      <article className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[28px] border border-[#e8ba70] bg-[#08142a]/95 p-4 shadow-[0_28px_90px_rgba(0,0,0,.65)] sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black tracking-tight">BragWall</p>
            <p className="text-xs font-black tracking-[.16em] text-[#ffc857]">YOUNG ART. BIG PRIDE.</p>
          </div>
          <p className="rounded-full bg-[#13ed77] px-4 py-2 text-sm font-black text-[#07152b]">SOLD!</p>
        </header>

        <div className="relative flex h-[min(50dvh,450px)] items-center justify-center overflow-hidden rounded-[20px] border border-[#ffc857]/60 bg-[#07152b]">
          {/* The original artwork is always shown without cropping. */}
          <img src={displayUrl} alt={`Artwork by ${artist}`} referrerPolicy="no-referrer"
            className="h-full w-full object-contain" />
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[.22em] text-[#13ed77]">Your winning artwork</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{artist || "A young artist"}</h1>
        <div className="mt-2 flex items-center justify-between text-sm font-bold text-[#ffc857]">
          <span>{artwork.grade || "School artwork"}</span>
          <span>R{Number(artwork.sold_amount || 0).toLocaleString("en-ZA")}</span>
        </div>

        {artwork.mc_audio_url ? (
          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <p className="mb-2 text-sm font-bold">Hear the MC introduce your artwork</p>
            <audio controls preload="none" src={artwork.mc_audio_url}
              controlsList="nodownload" className="w-full" />
          </div>
        ) : <p className="mt-4 text-xs text-white/60">MC audio is unavailable for this artwork.</p>}
        <p className="mt-4 text-center text-xs text-white/70">A moment to celebrate. Thank you for supporting young art.</p>
      </article>
      <style>{`
        .winner-paint { animation: winner-splash 1.1s ease-out both; background:
          radial-gradient(circle at 13% 50%, rgba(19,237,119,.2) 0 5%, transparent 18%),
          radial-gradient(circle at 90% 74%, rgba(255,200,87,.26) 0 4%, transparent 20%),
          radial-gradient(circle at 53% 12%, rgba(255,114,122,.17) 0 3%, transparent 16%); }
        .winner-confetti { animation: winner-fall linear infinite; }
        @keyframes winner-splash { from { opacity: 0; transform: scale(.65) rotate(-8deg); }
          to { opacity: .6; transform: scale(1) rotate(0); } }
        @keyframes winner-fall { from { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; } to { transform: translate3d(42px,115vh,0) rotate(840deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .winner-confetti { animation: none; display: none; }
          .winner-paint { animation: none; } }
      `}</style>
    </main>
  );
}

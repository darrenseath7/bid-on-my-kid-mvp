import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { validWinnerToken, winnerDb } from "@/lib/server/winnerWhatsapp";
import WinnerMomentReveal from "./WinnerMomentReveal";

export const dynamic = "force-dynamic";
const baseMetadata: Metadata = {
  title: "Your BragWall SOLD moment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ artworkId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { artworkId } = await params;
  const { token } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(artworkId) || !token) return baseMetadata;

  const db = winnerDb();
  const { data } = await db.from("auction_winner_whatsapp")
    .select("bidder_contact_id").eq("artwork_id", artworkId).maybeSingle();
  if (!data || !validWinnerToken(artworkId, data.bidder_contact_id, token)) {
    return baseMetadata;
  }

  const origin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BRAGWALL_PUBLIC_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const image = new URL(
    `/api/winner-keepsake/${artworkId}?token=${encodeURIComponent(token)}&variant=preview`,
    origin
  ).toString();

  return {
    ...baseMetadata,
    openGraph: {
      title: "Your BragWall SOLD moment is ready!",
      description: "Open your winning artwork, celebrate its young artist and hear the MC.",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "BragWall SOLD artwork preview" }],
    },
  };
}
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
    .select("id,auction_code,status,child_name,child_surname,grade,artwork_url,enhanced_artwork_url,mc_audio_url,child_voice_path,sold_amount,winning_bidder")
    .eq("id", artworkId).eq("auction_code", message.auction_code).maybeSingle();
  if (artworkError || !artwork || artwork.status !== "sold") notFound();
  const displayUrl = artwork.enhanced_artwork_url || artwork.artwork_url;
  if (!displayUrl) notFound();
  const artist = [artwork.child_name, artwork.child_surname].filter(Boolean).join(" ");
  const rawWinnerFirstName = String(artwork.winning_bidder || "").trim().split(/\s+/)[0];
  const winnerFirstName = rawWinnerFirstName
    ? rawWinnerFirstName.charAt(0).toLocaleUpperCase() + rawWinnerFirstName.slice(1)
    : "";
  const artistFirstName = String(artwork.child_name || "").trim();
  const keepsakeUrl = `/api/winner-keepsake/${artworkId}?token=${encodeURIComponent(token)}`;

  return (
    <main className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#050d1b] px-3 py-5 text-white sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_22%,rgba(255,200,87,.16),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(19,237,119,.11),transparent_36%)]" />
      <div aria-hidden="true" className="winner-paint pointer-events-none absolute inset-0" />
      <WinnerMomentReveal winnerName={winnerFirstName}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 26 }, (_, i) => (
          <span key={i} className="winner-confetti absolute -top-8 block h-3 w-2 rounded-sm"
            style={{
              left: `${(i * 47 + 9) % 100}%`,
              backgroundColor: ["#ffc857", "#13ed77", "#ff737a", "#63c8ff"][i % 4],
              animationDelay: `${(i * 0.17) % 2.1}s`,
              animationDuration: `${3.2 + (i % 5) * 0.45}s`,
            }} />
        ))}
      </div>

      <article className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#e8ba70]/70 bg-[#08142a]/95 shadow-[0_28px_90px_rgba(0,0,0,.6)] sm:rounded-[36px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-8 sm:py-5">
          <div className="leading-tight">
            <p className="text-2xl font-black tracking-tight sm:text-3xl">BragWall</p>
            <p className="text-[10px] font-black tracking-[.2em] text-[#ffc857] sm:text-xs">YOUNG ART. BIG PRIDE.</p>
          </div>
          <p className="rounded-full bg-[#13ed77] px-4 py-2 text-sm font-black text-[#07152b] shadow-[0_0_24px_rgba(19,237,119,.24)]">SOLD!</p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
          <div className="flex items-center justify-center bg-[#101c30] p-3 sm:p-6 lg:min-h-[520px] lg:p-8">
            <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[20px] border border-[#ffc857]/50 bg-[#07152b] p-2 shadow-[0_20px_60px_rgba(0,0,0,.3)] sm:p-3">
              {/* Show the full artwork, including its original proportions. */}
              <img src={displayUrl} alt={`Artwork by ${artist || "a young artist"}`} referrerPolicy="no-referrer"
                className="winner-art-reveal block max-h-[44dvh] w-full object-contain lg:max-h-[min(70dvh,640px)]" />
              <span aria-hidden="true" className="winner-sold-stamp pointer-events-none absolute bottom-4 right-4 rotate-[-9deg] rounded-xl border-[3px] border-[#ffc857] bg-[#07152b]/95 px-5 py-2 text-xl font-black tracking-[.12em] text-[#ffc857] shadow-2xl sm:text-3xl">
                SOLD!
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
            <p className="text-[11px] font-black uppercase tracking-[.24em] text-[#13ed77]">The moment you won</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {winnerFirstName ? `${winnerFirstName}, ` : ""}you did it<span className="text-[#ffc857]">!</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              {artistFirstName ? `${artistFirstName} made something special.` : "A young artist made something special."}
              {" "}You saw it. Your winning bid gives that creativity a moment worth celebrating.
            </p>

            <div className="mt-7 rounded-2xl border border-white/15 bg-white/[.06] p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#13ed77]">Your winning artwork</p>
              <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">{artist || "A young artist"}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-bold">
                <div className="rounded-xl bg-white/[.06] p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-white/60">Artist's class</span>
                  <span className="mt-1 block text-white">{artwork.grade || "School artwork"}</span>
                </div>
                <div className="rounded-xl bg-[#ffc857]/10 p-3">
                  <span className="block text-[10px] uppercase tracking-wider text-white/60">Winning bid</span>
                  <span className="mt-1 block text-[#ffc857]">R{Number(artwork.sold_amount || 0).toLocaleString("en-ZA")}</span>
                </div>
              </div>
            </div>

            {artwork.child_voice_path && <div className="mt-5 rounded-2xl border border-[#13ed77]/30 bg-[#13ed77]/[.07] p-4 sm:p-5"><p className="text-sm font-black text-[#13ed77]">A message from the young artist</p><p className="mt-1 text-xs text-white/65">Press play to hear the child describe their artwork.</p><audio controls preload="none" data-winner-voice src={`/api/artwork-voice/${artworkId}`} className="mt-3 w-full" aria-label="Play the young artist’s voice note" /></div>}

            {artwork.mc_audio_url ? (
              <div className="mt-5 rounded-2xl border border-[#ffc857]/30 bg-[#ffc857]/[.07] p-4 sm:p-5">
                <p className="text-sm font-black text-[#ffc857]">Hear the moment it all began</p>
                <p className="mt-1 text-xs text-white/65">Press play to hear the MC introduce this artwork.</p>
                <audio id="winner-mc-audio" controls preload="metadata" src={artwork.mc_audio_url}
                  controlsList="nodownload" className="mt-3 w-full" aria-label="Play the artwork introduction" />
              </div>
            ) : <p className="mt-5 text-sm text-white/60">MC audio is unavailable for this artwork.</p>}

            <a href={keepsakeUrl} download="BragWall-SOLD-moment.png" rel="noreferrer"
              className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-[#13ed77] px-5 py-3 text-center text-base font-black text-[#07152b] shadow-[0_14px_32px_rgba(19,237,119,.18)] transition hover:bg-[#65f4a1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc857]">
              Save your SOLD keepsake
            </a>
            <p className="mt-2 text-center text-xs text-white/60">
              A picture to keep on your phone and share with family.
            </p>

            <p className="mt-7 text-sm leading-relaxed text-white/60">
              A young artist made this. You made this moment. Thank you for believing in young art.
            </p>
          </div>
        </div>
      </article>
      </WinnerMomentReveal>
      <style>{`
        .winner-paint { background:
          radial-gradient(circle at 10% 50%, rgba(19,237,119,.18) 0 5%, transparent 25%),
          radial-gradient(circle at 90% 74%, rgba(255,200,87,.2) 0 4%, transparent 24%); }
        .winner-confetti { animation: winner-fall linear both; }
        .winner-art-reveal { animation: winner-art-unveil 1.25s ease-out .15s both; }
        .winner-sold-stamp { animation: winner-stamp-pop .65s cubic-bezier(.16,1.4,.35,1) 1.15s both; }
        @keyframes winner-art-unveil { from { clip-path: inset(0 100% 0 0); opacity: .8; }
          to { clip-path: inset(0 0 0 0); opacity: 1; } }
        @keyframes winner-stamp-pop { from { opacity: 0; transform: rotate(-16deg) scale(2); }
          to { opacity: 1; transform: rotate(-9deg) scale(1); } }
        @keyframes winner-fall { from { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; } to { transform: translate3d(42px,110vh,0) rotate(840deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .winner-confetti { display: none; }
          .winner-art-reveal, .winner-sold-stamp { animation: none; } }
      `}</style>
    </main>
  );
}

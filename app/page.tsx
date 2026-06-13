import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020b18] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.13),transparent_32%),radial-gradient(circle_at_52%_88%,rgba(11,99,206,0.14),transparent_38%),linear-gradient(180deg,#061124,#020b18_58%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:52px_52px]" />
      <div className="fixed inset-3 pointer-events-none rounded-[32px] border border-[#c78b25]/20 shadow-[inset_0_0_70px_rgba(199,139,37,0.07)]" />
      <PremiumArtDecor />

      <div className="relative">
        <header className="max-w-7xl mx-auto px-5 md:px-8 py-6 flex items-center justify-between gap-5">
          <Link href="/" className="inline-flex items-center gap-3">
            <BragWallLogoCard size="large" />
          </Link>

          <nav className="hidden lg:flex items-center gap-9 text-sm font-black text-white/82">
            <a href="#how-it-works" className="hover:text-[#16d66d]">
              How it works
            </a>
            <a href="#for-schools" className="hover:text-[#16d66d]">
              For Schools
            </a>
            <a href="#live-preview" className="hover:text-[#16d66d]">
              Live Auction
            </a>
            <a href="#contact" className="hover:text-[#16d66d]">
              Contact
            </a>
          </nav>

          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#16d66d] bg-[#16d66d]/8 px-5 py-3 text-sm font-black text-white shadow-[0_0_28px_rgba(22,214,109,0.12)] hover:bg-[#16d66d] hover:text-[#07152b] transition"
          >
            <span>🔐</span>
            Admin Login
          </Link>
        </header>

        <section className="relative max-w-7xl mx-auto px-5 md:px-8 pt-8 md:pt-14 pb-8 md:pb-14">
          <div className="absolute inset-x-5 md:inset-x-8 top-4 bottom-4 pointer-events-none rounded-[42px] border border-[#c78b25]/18 shadow-[inset_0_0_55px_rgba(255,200,87,0.035)]" />
          <div className="absolute right-8 md:right-14 top-5 h-px w-40 bg-gradient-to-l from-[#ffc857]/50 to-transparent" />
          <div className="absolute left-8 md:left-14 bottom-5 h-px w-40 bg-gradient-to-r from-[#16d66d]/45 to-transparent" />

          <div className="relative grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-16 items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/8 border border-white/10 px-4 py-3 mb-7 shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
                <span className="uppercase tracking-[0.34em] text-[10px] font-black text-white/64">
                  School fundraising. Made live.
                </span>
              </div>

              <h1 className="text-[58px] sm:text-[78px] md:text-[95px] xl:text-[108px] font-black leading-[0.82] tracking-[-0.085em] mb-7 max-w-4xl">
                Turn school artwork into a{" "}
                <span className="text-[#16d66d] drop-shadow-[0_0_24px_rgba(22,214,109,0.22)]">
                  live fundraising event.
                </span>
              </h1>

              <div className="w-24 h-1.5 bg-[#ffc857] rounded-full mb-7" />

              <p className="text-lg md:text-xl text-white/68 leading-relaxed max-w-2xl mb-8 font-semibold">
                BragWall helps schools upload student artwork, present each
                piece like a masterpiece, run a live mobile auction, and capture
                winner details for invoices, certificates, and collection.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#16d66d] px-7 py-4 text-[#07152b] font-black shadow-[0_18px_48px_rgba(22,214,109,0.26)] hover:scale-[1.02] transition"
                >
                  How it works
                  <span>→</span>
                </a>

                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#16d66d]/70 bg-white/[0.03] px-7 py-4 text-white font-black hover:bg-white/10 transition"
                >
                  Book a demo
                </a>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
                <HeroPill label="Auction" value="Live mobile bidding" />
                <HeroPill label="Artwork" value="Premium gallery view" />
                <HeroPill label="Admin" value="One control room" />
              </div>
            </div>

            <HeroArtworkPreview />
          </div>
        </section>

        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12"
        >
          <div className="relative rounded-[34px] md:rounded-[44px] border border-white/10 bg-white/[0.045] p-5 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.05em]">
                How BragWall works
              </h2>
              <div className="w-14 h-1 bg-[#ffc857] rounded-full mx-auto mt-4" />
            </div>

            <div className="grid md:grid-cols-4 gap-6 md:gap-4">
              <HowStep
                icon="☁️"
                number="01"
                title="Upload artwork"
                text="Schools upload student artwork, child details, grade, and auction notes."
              />
              <HowStep
                icon="🪄"
                number="02"
                title="Generate stories"
                text="AI helps create a fun intro so every artwork feels like a masterpiece."
              />
              <HowStep
                icon="🔨"
                number="03"
                title="Run live auction"
                text="The control room presents artwork, opens bidding, and gets parents involved."
              />
              <HowStep
                icon="🏆"
                number="04"
                title="Capture winners"
                text="Winner details are recorded for invoices, certificates, and collection."
              />
            </div>

            <div
              id="for-schools"
              className="mt-8 md:mt-10 rounded-[28px] border border-white/10 bg-[#061124]/70 p-5 md:p-7"
            >
              <h3 className="text-center text-2xl md:text-3xl font-black text-[#16d66d] mb-7">
                For schools
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <SchoolFeature icon="👥" title="Easy onboarding" />
                <SchoolFeature icon="🖼️" title="Artwork gallery" />
                <SchoolFeature icon="🔐" title="Live control room" />
                <SchoolFeature icon="📱" title="Parent mobile bidding" />
                <SchoolFeature icon="📄" title="Winner records & invoicing" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="live-preview"
          className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12"
        >
          <div className="relative overflow-hidden rounded-[34px] md:rounded-[44px] border border-white/10 bg-white/[0.045] p-5 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_74%_42%,rgba(22,214,109,0.16),transparent_32%),radial-gradient(circle_at_30%_0%,rgba(255,200,87,0.08),transparent_30%)]" />

            <div className="relative grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.8)]" />
                  <p className="uppercase tracking-[0.28em] text-[10px] text-[#16d66d] font-black">
                    Live auction preview
                  </p>
                </div>

                <h2 className="text-4xl md:text-6xl font-black tracking-[-0.06em] leading-[0.9] mb-5">
                  Artwork goes live.
                </h2>

                <p className="text-white/68 text-lg md:text-xl leading-relaxed font-semibold max-w-xl mb-7">
                  Each piece is introduced, parents bid from their phones, and
                  the winning details are captured before the next artwork
                  begins.
                </p>

              </div>

              <div className="relative min-h-[360px] md:min-h-[440px]">
                <div className="absolute right-0 left-0 mx-auto top-6 w-[88%] max-w-[560px] rounded-[38px] border border-white/10 bg-[#07152b] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                  <div className="rounded-[28px] bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-3 shadow-[0_0_45px_rgba(255,200,87,0.14)]">
                    <div className="rounded-[20px] bg-white p-4">
                      <div className="h-[250px] rounded-[16px] bg-[#fff7e8] flex items-center justify-center overflow-hidden">
                        <VisibleArtwork />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-white text-[#07152b] p-4">
                      <p className="uppercase tracking-[0.24em] text-[9px] text-slate-400 font-black mb-1">
                        Highest bid
                      </p>
                      <p className="text-3xl font-black text-[#16d66d]">
                        R450
                      </p>
                    </div>

                    <div className="rounded-[22px] bg-[#16d66d] text-[#07152b] p-4">
                      <p className="uppercase tracking-[0.24em] text-[9px] font-black mb-1 opacity-70">
                        Status
                      </p>
                      <p className="text-2xl font-black">Live</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-4 md:right-10 rounded-full bg-[#16d66d] text-[#07152b] px-4 py-2 font-black text-xs shadow-xl">
                  STATUS • Live
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12"
        >
          <div className="rounded-[34px] md:rounded-[44px] bg-[#fbf8f1] text-[#07152b] p-6 md:p-9 shadow-2xl overflow-hidden">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
              <div>
                <p className="uppercase tracking-[0.32em] text-[10px] text-[#0b63ce] font-black mb-4">
                  Built for school auction nights
                </p>

                <h2 className="text-4xl md:text-6xl font-black leading-[0.92] tracking-[-0.06em] mb-5">
                  Less admin. More energy. Bigger pride.
                </h2>

                <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-bold">
                  BragWall gives schools one setup flow, one live control room,
                  one parent auction link, and clear records of sold artworks
                  and winner details.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <ProcessCard
                  title="School setup"
                  text="Bank details, reference codes, bid increments, and collection notes."
                />
                <ProcessCard
                  title="Artwork setup"
                  text="Upload artwork, add child details, and prepare the auction story."
                />
                <ProcessCard
                  title="Live room"
                  text="Run intros, open bidding, mark sold, archive unsold, and move on."
                />
              </div>
            </div>
          </div>
        </section>

        <footer className="max-w-7xl mx-auto px-5 md:px-8 pt-8 pb-10">
          <div className="grid md:grid-cols-[1fr_1.2fr_0.7fr_0.7fr] gap-8 border-t border-white/10 pt-8">
            <div>
              <BragWallLogoCard size="footer" />
            </div>

            <div>
              <p className="text-white/62 leading-relaxed font-semibold max-w-md">
                BragWall is a live fundraising platform for schools. Young art.
                Big impact.
              </p>
            </div>

            <div>
              <p className="font-black mb-3">Quick links</p>
              <div className="space-y-2 text-white/58 font-semibold">
                <p>
                  <a href="#how-it-works" className="hover:text-[#16d66d]">
                    How it works
                  </a>
                </p>
                <p>
                  <a href="#for-schools" className="hover:text-[#16d66d]">
                    For Schools
                  </a>
                </p>
                <p>
                  <Link href="/admin/login" className="hover:text-[#16d66d]">
                    Admin Login
                  </Link>
                </p>
              </div>
            </div>

            <div>
              <p className="font-black mb-3">Parent access</p>
              <p className="text-white/58 font-semibold leading-relaxed">
                Parent auction links are shared privately by the school.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-5 text-white/38 text-sm font-semibold">
            © 2026 BragWall. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}

function BragWallLogoCard({ size }: { size: "large" | "footer" }) {
  const imageClass =
    size === "large" ? "h-16 md:h-20" : "h-14 md:h-16";

  return (
    <div className="inline-flex flex-col items-center bg-white rounded-2xl px-5 py-3.5 shadow-xl border border-white/15">
      <img
        src="/bragwall-logo.png"
        alt="BragWall"
        className={`${imageClass} w-auto object-contain`}
      />

      <p className="mt-1 text-center text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-[#07152b]/55">
        Young Art - Big Pride
      </p>
    </div>
  );
}

function PremiumArtDecor() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute left-5 right-5 top-5 hidden h-px bg-gradient-to-r from-transparent via-[#c78b25]/22 to-transparent md:block" />
      <div className="absolute left-5 right-5 bottom-5 hidden h-px bg-gradient-to-r from-transparent via-[#16d66d]/16 to-transparent md:block" />
      <div className="absolute left-5 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[#c78b25]/14 to-transparent md:block" />
      <div className="absolute right-5 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[#c78b25]/14 to-transparent md:block" />

      <div className="absolute -right-24 top-28 hidden h-72 w-72 rounded-full border border-[#c78b25]/10 bg-[radial-gradient(circle,rgba(255,200,87,0.10),transparent_64%)] blur-[1px] lg:block" />
      <div className="absolute -left-24 bottom-24 hidden h-80 w-80 rounded-full border border-[#16d66d]/10 bg-[radial-gradient(circle,rgba(22,214,109,0.10),transparent_66%)] blur-[1px] lg:block" />

      <PremiumPalette className="absolute -left-7 bottom-32 hidden xl:block opacity-60" />
      <PremiumBrushStroke className="absolute right-[-78px] top-[22%] hidden h-44 w-80 rotate-[-18deg] opacity-55 lg:block" tone="warm" />
      <PremiumBrushStroke className="absolute left-[-96px] bottom-[18%] hidden h-40 w-72 rotate-[16deg] opacity-40 xl:block" tone="green" />

      <div className="absolute left-[9%] top-[22%] h-2.5 w-2.5 rounded-full bg-[#ffc857] shadow-[0_0_22px_rgba(255,200,87,0.85)]" />
      <div className="absolute right-[14%] top-[26%] h-2 w-2 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.8)]" />
      <div className="absolute right-[22%] bottom-[18%] text-[#8b7cff]/55 text-3xl font-black rotate-12">✦</div>
    </div>
  );
}

function PremiumPalette({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative h-24 w-36 rounded-[52%] border border-[#f4d681]/35 bg-gradient-to-br from-[#f2d68d] via-[#b9823d] to-[#5c3212] shadow-[0_24px_65px_rgba(0,0,0,0.42)]">
        <div className="absolute right-5 bottom-5 h-8 w-10 rounded-full bg-[#020b18] shadow-inner" />
        <div className="absolute left-6 top-6 h-4 w-4 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.45)]" />
        <div className="absolute left-14 top-4 h-4 w-4 rounded-full bg-[#ffc857] shadow-[0_0_18px_rgba(255,200,87,0.45)]" />
        <div className="absolute left-10 bottom-7 h-4 w-4 rounded-full bg-[#ff5c8a] shadow-[0_0_18px_rgba(255,92,138,0.35)]" />
        <div className="absolute right-9 top-9 h-4 w-4 rounded-full bg-[#46a7ff] shadow-[0_0_18px_rgba(70,167,255,0.35)]" />
      </div>
    </div>
  );
}

function PremiumBrushStroke({
  className,
  tone,
}: {
  className?: string;
  tone: "warm" | "green";
}) {
  const main = tone === "warm" ? "bg-[#ffc857]/22" : "bg-[#16d66d]/18";
  const second = tone === "warm" ? "bg-[#ff5c8a]/18" : "bg-[#46a7ff]/14";
  const third = tone === "warm" ? "bg-[#46a7ff]/16" : "bg-[#ffc857]/14";

  return (
    <div className={className}>
      <div className={`absolute left-0 top-9 h-10 w-[82%] rounded-full ${main} blur-[0.5px]`} />
      <div className={`absolute left-[12%] top-[54px] h-6 w-[70%] rounded-full ${second}`} />
      <div className={`absolute left-[22%] top-[78px] h-4 w-[56%] rounded-full ${third}`} />
      <div className="absolute right-[4%] top-10 h-3 w-3 rounded-full bg-white/18" />
      <div className="absolute left-[16%] top-4 h-2 w-2 rounded-full bg-[#ffc857]/40" />
    </div>
  );
}

function StudioBrushAccent({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative h-32 w-40">
        <div className="absolute left-10 bottom-0 h-16 w-24 rounded-b-[28px] rounded-t-[16px] border border-white/12 bg-gradient-to-b from-[#3b455c] to-[#1f2636] shadow-[0_22px_60px_rgba(0,0,0,0.38)]" />
        <div className="absolute left-3 bottom-[62px] h-3 w-28 origin-right rotate-[-34deg] rounded-full bg-gradient-to-r from-[#6b370f] via-[#d79a43] to-[#f4d681] shadow-lg" />
        <div className="absolute left-0 bottom-[82px] h-7 w-11 rotate-[-34deg] rounded-full bg-gradient-to-r from-[#222b3d] via-[#cfd6df] to-[#f8fafc]" />
        <div className="absolute left-[70px] bottom-[66px] h-3 w-24 origin-left rotate-[20deg] rounded-full bg-gradient-to-r from-[#f4d681] via-[#b86b2a] to-[#6b370f] shadow-lg" />
        <div className="absolute left-[150px] bottom-[94px] h-8 w-8 rotate-[20deg] rounded-t-full rounded-b-[10px] bg-gradient-to-b from-[#16d66d] to-[#0d7f43]" />
        <div className="absolute left-[80px] bottom-5 h-3 w-14 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function GalleryHalo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="absolute inset-0 rounded-[45%] bg-[#16d66d]/10 blur-2xl" />
      <div className="absolute inset-x-[14%] top-[30%] h-px bg-gradient-to-r from-transparent via-[#ffc857]/35 to-transparent" />
      <div className="absolute inset-y-[22%] left-[30%] w-px bg-gradient-to-b from-transparent via-[#16d66d]/28 to-transparent" />
      <div className="absolute left-[12%] top-[24%] h-2 w-2 rounded-full bg-[#ffc857]/55" />
      <div className="absolute right-[22%] bottom-[26%] h-2.5 w-2.5 rounded-full bg-[#16d66d]/45" />
    </div>
  );
}

function HeroArtworkPreview() {
  return (
    <div className="relative min-h-[520px] lg:min-h-[620px]">
      <GalleryHalo className="absolute right-[0%] top-[12%] h-72 w-72 opacity-80" />
      <PremiumBrushStroke className="absolute right-[4%] top-[8%] hidden h-36 w-72 rotate-[-10deg] opacity-35 md:block" tone="warm" />
      <StudioBrushAccent className="absolute left-[0%] bottom-[3%] hidden opacity-80 lg:block" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[22%] left-[10%] w-[68%] h-[44%] rounded-full border border-dashed border-[#16d66d]/25 rotate-[-22deg]" />
        <div className="absolute top-[30%] right-[12%] w-[50%] h-[34%] rounded-full border border-dashed border-[#16d66d]/20 rotate-[18deg]" />
        <div className="absolute top-[26%] left-[18%] w-3 h-3 bg-[#16d66d] rounded-full shadow-[0_0_18px_rgba(22,214,109,0.8)]" />
        <div className="absolute top-[18%] right-[12%] text-[#8b7cff] text-xl font-black">
          ✦
        </div>
        <div className="absolute bottom-[25%] left-[8%] text-[#ffc857] text-2xl font-black">
          +
        </div>
      </div>

      <div className="absolute left-[8%] top-[7%] w-[58%] max-w-[420px]">
        <div className="mx-auto w-16 h-20 rounded-t-[14px] bg-gradient-to-b from-[#d79a43] to-[#8a4d1b] shadow-xl" />

        <div className="relative -mt-4 rounded-[18px] bg-gradient-to-br from-[#c78b25] via-[#f4d681] to-[#6f3d10] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)] rotate-[2deg]">
          <div className="rounded-[12px] bg-[#fff8e8] p-5 shadow-inner">
            <div className="aspect-[1.28/1] rounded-[12px] bg-[#cfefff] overflow-hidden border border-[#e5d6ad]">
              <HeroDrawing />
            </div>
          </div>
        </div>

        <div className="relative h-52">
          <div className="absolute left-[28%] top-[-2px] w-8 h-56 bg-gradient-to-b from-[#9f5c22] to-[#5b2f0d] rounded-b-full rotate-[8deg]" />
          <div className="absolute right-[28%] top-[-2px] w-8 h-56 bg-gradient-to-b from-[#9f5c22] to-[#5b2f0d] rounded-b-full rotate-[-8deg]" />
          <div className="absolute left-[10%] right-[10%] top-20 h-6 bg-gradient-to-r from-[#6b370f] via-[#bb762c] to-[#6b370f] rounded-full" />
        </div>
      </div>

      <div className="absolute right-[2%] md:right-[8%] top-[34%] w-[215px] md:w-[245px] rotate-[5deg]">
        <div className="rounded-[42px] bg-[#050914] border-[7px] border-[#1f2937] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.62)]">
          <div className="mx-auto mb-4 h-2 w-20 rounded-full bg-white/10" />

          <div className="rounded-[28px] bg-[#07152b] border border-white/10 p-4 min-h-[390px]">
            <p className="text-white/55 text-xs font-black mb-3">
              Current Artwork
            </p>

            <div className="grid grid-cols-[70px_1fr] gap-3 items-center mb-5">
              <div className="rounded-2xl bg-white p-2">
                <div className="h-16 rounded-xl bg-[#cfefff] overflow-hidden">
                  <PhoneMiniDrawing />
                </div>
              </div>

              <div>
                <p className="text-white text-lg font-black leading-tight">
                  Sunshine Garden
                </p>
                <p className="text-white/58 text-xs font-bold mt-1">
                  by Mia
                </p>
                <p className="text-white/42 text-xs font-bold">Grade 2</p>
              </div>
            </div>

            <div className="rounded-[22px] bg-white/[0.055] border border-white/10 p-4 text-center">
              <p className="text-white/62 text-sm font-bold mb-2">
                Bidding opens in
              </p>
              <p className="text-[#16d66d] text-4xl font-black tracking-[-0.06em]">
                00:45
              </p>
            </div>

            <div className="mt-4 rounded-[22px] bg-[#16d66d] text-[#07152b] p-4">
              <p className="uppercase tracking-[0.22em] text-[9px] font-black opacity-70">
                Next bid
              </p>
              <p className="text-3xl font-black">R250</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroDrawing() {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-b from-[#bde8ff] to-[#eaffd8]" />
      <div className="absolute right-8 top-8 w-16 h-16 bg-[#ffc857] rounded-full shadow-[0_0_30px_rgba(255,200,87,0.6)]" />
      <div className="absolute left-8 top-12 w-24 h-10 bg-white/90 rounded-full" />
      <div className="absolute left-20 top-9 w-20 h-10 bg-white/90 rounded-full" />

      <div className="absolute left-[34%] top-[36%] w-[34%] h-[34%] bg-[#f4a340] rounded-t-[8px]" />
      <div className="absolute left-[31%] top-[28%] w-[40%] h-[18%] bg-[#e84e4e] rotate-[-2deg] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <div className="absolute left-[47%] top-[50%] w-[8%] h-[20%] bg-[#6d3b16] rounded-t-full" />
      <div className="absolute left-[38%] top-[43%] w-[8%] h-[8%] bg-[#77d9ff] rounded-full" />
      <div className="absolute right-[40%] top-[43%] w-[8%] h-[8%] bg-[#77d9ff] rounded-full" />

      <div className="absolute left-0 right-0 bottom-0 h-[24%] bg-[#6fd36f]" />
      <div className="absolute left-[28%] bottom-[13%] w-[34%] h-[18%] border-[8px] border-[#d9904f] rounded-t-full border-b-0" />

      <Flower x="12%" y="62%" color="#e84e4e" />
      <Flower x="77%" y="58%" color="#f36b9d" />
      <Flower x="68%" y="70%" color="#8b7cff" />
      <Flower x="20%" y="72%" color="#ffc857" />
    </div>
  );
}

function VisibleArtwork() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#bde8ff] via-[#f7fbff] to-[#dff7d6]">
      <div className="absolute right-8 top-7 w-16 h-16 rounded-full bg-[#ffc857] shadow-[0_0_24px_rgba(255,200,87,0.55)]" />
      <div className="absolute left-8 top-9 w-24 h-10 rounded-full bg-white/90" />
      <div className="absolute left-20 top-6 w-20 h-10 rounded-full bg-white/90" />

      <div className="absolute left-0 right-0 bottom-0 h-[26%] bg-[#76d672]" />
      <div className="absolute left-[11%] bottom-[18%] w-[22%] h-[16%] rounded-[50%] border-[8px] border-[#d9904f] border-t-0" />

      <div className="absolute left-[36%] top-[38%] w-[28%] h-[31%] bg-[#f4a340] rounded-t-md border-2 border-[#c77424]" />
      <div className="absolute left-[32%] top-[28%] w-[36%] h-[18%] bg-[#e84e4e] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <div className="absolute left-[48%] top-[51%] w-[7%] h-[18%] bg-[#6d3b16] rounded-t-full" />
      <div className="absolute left-[40%] top-[45%] w-[7%] h-[7%] bg-[#77d9ff] rounded-full border-2 border-white" />
      <div className="absolute left-[57%] top-[45%] w-[7%] h-[7%] bg-[#77d9ff] rounded-full border-2 border-white" />

      <div className="absolute left-[17%] top-[48%] w-3 h-[98px] bg-[#358f45] rounded-full rotate-[-6deg]" />
      <div className="absolute left-[13%] top-[39%] w-14 h-14 rounded-full bg-[#ff6b8a]" />
      <div className="absolute left-[19%] top-[39%] w-14 h-14 rounded-full bg-[#ff6b8a]" />
      <div className="absolute left-[16%] top-[34%] w-14 h-14 rounded-full bg-[#ff6b8a]" />
      <div className="absolute left-[18.5%] top-[42%] w-5 h-5 rounded-full bg-[#ffc857]" />

      <Flower x="74%" y="50%" color="#f36b9d" />
      <Flower x="70%" y="68%" color="#8b7cff" />
      <Flower x="24%" y="69%" color="#ffc857" />
      <Flower x="80%" y="70%" color="#e84e4e" />
    </div>
  );
}

function PhoneMiniDrawing() {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-b from-[#bde8ff] to-[#eaffd8]" />
      <div className="absolute right-2 top-2 w-5 h-5 bg-[#ffc857] rounded-full" />
      <div className="absolute left-[32%] top-[38%] w-[38%] h-[33%] bg-[#f4a340]" />
      <div className="absolute left-[28%] top-[30%] w-[46%] h-[18%] bg-[#e84e4e] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <div className="absolute left-0 right-0 bottom-0 h-[22%] bg-[#6fd36f]" />
    </div>
  );
}

function Flower({
  x,
  y,
  color,
}: {
  x: string;
  y: string;
  color: string;
}) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      <div className="relative w-10 h-10">
        <div
          className="absolute left-3 top-0 w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute left-0 top-3 w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute right-0 top-3 w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute left-3 bottom-0 w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="absolute left-[14px] top-[14px] w-3 h-3 bg-[#ffc857] rounded-full" />
      </div>
    </div>
  );
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.075] px-4 py-4 shadow-xl">
      <p className="uppercase tracking-[0.24em] text-[8px] text-white/38 font-black mb-2">
        {label}
      </p>
      <p className="text-sm md:text-base font-black text-white">{value}</p>
    </div>
  );
}

function HowStep({
  icon,
  number,
  title,
  text,
}: {
  icon: string;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="relative text-center px-3 py-4">
      <div className="text-5xl mb-5">{icon}</div>
      <div className="mx-auto mb-4 w-10 h-10 rounded-full border border-[#ffc857]/70 bg-[#07152b] flex items-center justify-center text-xs font-black">
        {number}
      </div>
      <h3 className="text-xl font-black mb-3">{title}</h3>
      <p className="text-white/62 leading-relaxed font-semibold">{text}</p>
    </div>
  );
}

function SchoolFeature({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="text-center px-4 py-3">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="font-black text-white leading-tight">{title}</p>
    </div>
  );
}

function ProcessCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[26px] bg-white border border-black/5 p-5 shadow-xl">
      <div className="w-12 h-12 rounded-2xl bg-[#eafff2] text-[#16b85d] flex items-center justify-center text-2xl mb-5">
        ✓
      </div>
      <h3 className="text-2xl font-black mb-3 leading-tight">{title}</h3>
      <p className="text-slate-600 leading-relaxed font-bold">{text}</p>
    </div>
  );
}

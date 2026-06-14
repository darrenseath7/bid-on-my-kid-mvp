import Link from "next/link";

const schoolLogos = [
  { name: "MAPLEWOOD", type: "PRIMARY SCHOOL", icon: "shield" },
  { name: "RIVERSIDE", type: "COLLEGE", icon: "wave" },
  { name: "HILLSIDE", type: "ACADEMY", icon: "book" },
  { name: "SUNFIELD", type: "PRIMARY", icon: "sun" },
  { name: "OAKRIDGE", type: "COLLEGE", icon: "tree" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden scroll-smooth bg-[#020b18] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(22,214,109,0.18),transparent_31%),radial-gradient(circle_at_80%_12%,rgba(255,200,87,0.13),transparent_33%),radial-gradient(circle_at_50%_86%,rgba(11,99,206,0.16),transparent_40%),linear-gradient(180deg,#061124,#020b18_56%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="fixed inset-3 pointer-events-none rounded-[32px] border border-[#c78b25]/18 shadow-[inset_0_0_70px_rgba(199,139,37,0.07)]" />

      <div className="relative">
        <header className="mx-auto flex max-w-[1480px] items-center justify-between gap-5 px-5 py-6 md:px-8 lg:px-10">
          <Link href="/" className="inline-flex flex-col items-start gap-3">
            <BragWallLogo />
            <p className="ml-1 text-[11px] font-black uppercase tracking-[0.48em] text-white/84 md:text-sm">
              Young Art - Big Pride
            </p>
          </Link>

          <nav className="hidden items-center gap-10 text-base font-bold text-white/86 lg:flex">
            <a href="#how-it-works" className="transition hover:text-[#16d66d]">
              How It Works
            </a>
            <a href="#for-schools" className="transition hover:text-[#16d66d]">
              For Schools
            </a>
            <a href="#for-parents" className="transition hover:text-[#16d66d]">
              For Parents
            </a>
            <a href="#live-auction" className="transition hover:text-[#16d66d]">
              Live Auction
            </a>
            <a href="#about" className="transition hover:text-[#16d66d]">
              About Us
            </a>
          </nav>

          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#16d66d]/80 bg-[#16d66d]/8 px-5 py-3 text-sm font-black text-[#16d66d] shadow-[0_0_28px_rgba(22,214,109,0.12)] transition hover:bg-[#16d66d] hover:text-[#07152b] md:px-7 md:py-4 md:text-base"
          >
            <ShieldIcon />
            Admin Login
          </Link>
        </header>

        <section className="mx-auto max-w-[1480px] px-5 pb-8 pt-7 md:px-8 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] xl:gap-14">
            <div>
              <div className="mb-8 inline-flex rounded-full border border-[#16d66d]/20 bg-[#16d66d]/14 px-5 py-3 shadow-[0_18px_45px_rgba(22,214,109,0.10)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16d66d] md:text-sm">
                  Auction platform for schools
                </p>
              </div>

              <h1 className="max-w-3xl text-[54px] font-black leading-[0.93] tracking-[-0.075em] text-white sm:text-[68px] md:text-[78px] xl:text-[86px]">
                Every child is an{" "}
                <span className="text-[#16d66d] drop-shadow-[0_0_28px_rgba(22,214,109,0.25)]">
                  artist.
                </span>{" "}
                Every piece has value.
              </h1>

              <p className="mt-7 max-w-2xl text-xl font-medium leading-relaxed text-white/72 md:text-2xl">
                BragWall helps schools run exciting art auctions that bring
                communities together and raise more funds for our kids.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#16d66d] px-8 py-5 text-lg font-black text-[#07152b] shadow-[0_22px_55px_rgba(22,214,109,0.24)] transition hover:scale-[1.02]"
                >
                  See How It Works
                  <span className="text-2xl leading-none">→</span>
                </a>
              </div>

              <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                <HeroPoint icon={<PeopleIcon />} title="Trusted by" text="Schools" />
                <HeroPoint icon={<ChartIcon />} title="More Funds" text="for Our Kids" />
                <HeroPoint icon={<HeartIcon />} title="Stronger" text="Communities" />
              </div>
            </div>

            <HeroImageCard />
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-6 md:px-8 lg:px-10"
        >
          <div className="grid gap-0 overflow-hidden rounded-[28px] border border-[#16d66d]/18 bg-white/[0.045] shadow-[0_28px_90px_rgba(0,0,0,0.35)] md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={<PictureIcon />}
              title="Showcase Young Artists"
              text="Display every child's artwork in a beautiful online gallery."
              tone="green"
            />
            <FeatureCard
              icon={<GavelIcon />}
              title="Run Live Auctions"
              text="Easy, exciting, and engaging live auction experience."
              tone="purple"
            />
            <FeatureCard
              icon={<HandHeartIcon />}
              title="Raise More Funds"
              text="More bids. More support. More impact for your school."
              tone="blue"
            />
            <FeatureCard
              icon={<CommunityIcon />}
              title="Bring Communities Together"
              text="Parents, families, and supporters all in one place for our kids."
              tone="yellow"
            />
          </div>
        </section>

        <section
          id="live-auction"
          className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10"
        >
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div
              id="for-schools"
              className="scroll-mt-28 rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-9"
            >
              <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#16d66d]">
                For schools
              </p>
              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-6xl">
                One control room for the whole auction night.
              </h2>
              <p className="mt-6 text-lg font-medium leading-relaxed text-white/68">
                Upload artwork, start the AI MC intro, open bidding, mark sold,
                archive unsold pieces, and keep the event moving from one
                premium admin screen.
              </p>
            </div>

            <div
              id="for-parents"
              className="scroll-mt-28 rounded-[34px] border border-white/10 bg-[#fbf8f1] p-7 text-[#07152b] shadow-2xl md:p-9"
            >
              <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#0b63ce]">
                For parents
              </p>
              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-6xl">
                Bid from the phone. Celebrate from the heart.
              </h2>
              <p className="mt-6 text-lg font-bold leading-relaxed text-slate-600">
                Parents join with a simple auction link, hear the artwork intro,
                place bids live, and submit winner details when they win.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 pb-14 pt-5 md:px-8 lg:px-10">
          <p className="text-center text-xs font-black uppercase tracking-[0.55em] text-[#16d66d]">
            Trusted by schools. Loved by parents.
          </p>

          <div className="mt-8 grid grid-cols-2 items-center gap-8 opacity-35 sm:grid-cols-3 lg:grid-cols-5">
            {schoolLogos.map((school) => (
              <SchoolLogo key={school.name} school={school} />
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-[1480px] px-5 pb-8 md:px-8 lg:px-10">
          <div className="border-t border-white/10 pt-6 text-center text-sm font-bold text-white/40 md:flex md:items-center md:justify-between md:text-left">
            <p>© 2026 BragWall. All rights reserved.</p>
            <p className="mt-3 md:mt-0">Parent auction links are shared privately by the school.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function BragWallLogo() {
  return (
    <div className="flex items-center">
      <img
        src="/bragwall-logo.png"
        alt="BragWall"
        className="h-16 w-auto object-contain md:h-24 lg:h-28"
      />
    </div>
  );
}

function HeroImageCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[38px] bg-[radial-gradient(circle_at_50%_30%,rgba(22,214,109,0.16),transparent_55%)] blur-xl" />

      <div className="relative overflow-hidden rounded-[30px] border border-[#16d66d]/24 bg-[#061124] p-2 shadow-[0_34px_100px_rgba(0,0,0,0.48)] md:rounded-[36px]">
        <div className="relative overflow-hidden rounded-[24px] bg-[#020b18] md:rounded-[30px]">
          <video
            src="/bragwall-intro.mp4"
            poster="/bragwall-hero-paint-hands.jpg"
            className="h-[430px] w-full bg-[#020b18] object-contain md:h-[560px] lg:h-[610px]"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            aria-label="BragWall intro video"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020b18]/70 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-[#020b18]/35 to-transparent" />

          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/12 bg-[#061124]/86 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/78 shadow-xl backdrop-blur-md md:left-7 md:top-7">
            BragWall Intro
          </div>

          <div className="pointer-events-none absolute bottom-5 left-5 right-5 max-w-[520px] rounded-[24px] border border-white/10 bg-[#061124]/90 p-5 shadow-2xl backdrop-blur-md md:bottom-7 md:left-7 md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#16d66d]/28 bg-[#16d66d]/10 text-[#16d66d]">
                <GavelIcon />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#16d66d] md:text-2xl">
                  Live Auctions. Real Impact.
                </h3>
                <p className="mt-1 text-base font-bold text-white md:text-lg">
                  Turn young creativity into opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPoint({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 border-white/10 sm:border-r sm:last:border-r-0">
      <div className="text-[#16d66d]">{icon}</div>
      <div>
        <p className="text-base font-bold text-white/82">{title}</p>
        <p className="text-base font-bold text-white/82">{text}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: "green" | "purple" | "blue" | "yellow";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#16d66d]/14 text-[#16d66d] border-[#16d66d]/20 shadow-[0_0_38px_rgba(22,214,109,0.12)]"
      : tone === "purple"
      ? "bg-[#8b5cf6]/16 text-[#a77cff] border-[#8b5cf6]/22 shadow-[0_0_38px_rgba(139,92,246,0.12)]"
      : tone === "blue"
      ? "bg-[#0b63ce]/16 text-[#4b9cff] border-[#0b63ce]/22 shadow-[0_0_38px_rgba(11,99,206,0.12)]"
      : "bg-[#ffc857]/12 text-[#ffc857] border-[#ffc857]/22 shadow-[0_0_38px_rgba(255,200,87,0.10)]";

  return (
    <div className="border-white/8 p-7 md:border-r md:last:border-r-0 lg:p-8">
      <div className="flex items-center gap-5">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border ${toneClass}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-2 text-base font-medium leading-relaxed text-white/72">{text}</p>
        </div>
      </div>
    </div>
  );
}

function SchoolLogo({ school }: { school: { name: string; type: string; icon: string } }) {
  return (
    <div className="flex items-center justify-center gap-3 text-white/55">
      <SchoolMark icon={school.icon} />
      <div>
        <p className="text-xl font-black leading-none tracking-wide">{school.name}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.15em]">{school.type}</p>
      </div>
    </div>
  );
}

function SchoolMark({ icon }: { icon: string }) {
  if (icon === "shield") return <ShieldSchoolIcon />;
  if (icon === "wave") return <WaveIcon />;
  if (icon === "book") return <BookIcon />;
  if (icon === "sun") return <SunIcon />;
  return <TreeIcon />;
}

function ShieldIcon() {
  return (
    <IconSvg small>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconSvg>
  );
}

function PeopleIcon() {
  return (
    <IconSvg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconSvg>
  );
}

function ChartIcon() {
  return (
    <IconSvg>
      <path d="M3 21h18" />
      <path d="M7 17V9" />
      <path d="M12 17V5" />
      <path d="M17 17v-7" />
      <path d="m14 6 3-3 3 3" />
    </IconSvg>
  );
}

function HeartIcon() {
  return (
    <IconSvg>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </IconSvg>
  );
}

function PictureIcon() {
  return (
    <IconSvg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
      <path d="m12 17 3-3 6 6" />
    </IconSvg>
  );
}

function GavelIcon() {
  return (
    <IconSvg>
      <path d="m14 13-7 7" />
      <path d="m8 8 8 8" />
      <path d="m9 7 4-4 8 8-4 4z" />
      <path d="m4 21 5-5" />
    </IconSvg>
  );
}

function HandHeartIcon() {
  return (
    <IconSvg>
      <path d="M3 15h4l3 3h4l7-7a2.8 2.8 0 0 0-4-4l-3 3" />
      <path d="M7 15V9a4 4 0 0 1 4-4h1" />
      <path d="M16 4.5c1.2-1.2 3.1-.3 3.1 1.4 0 2.4-3.1 4.1-3.1 4.1s-3.1-1.7-3.1-4.1c0-1.7 1.9-2.6 3.1-1.4Z" />
    </IconSvg>
  );
}

function CommunityIcon() {
  return (
    <IconSvg>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M14 17a5 5 0 0 1 7 3" />
    </IconSvg>
  );
}

function ShieldSchoolIcon() {
  return (
    <IconSvg large>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v8" />
      <path d="m8.5 12 3.5 4 3.5-4" />
    </IconSvg>
  );
}

function WaveIcon() {
  return (
    <IconSvg large>
      <path d="M3 15c3-5 7 3 10-2s6-4 8-1" />
      <path d="M3 19c4-4 7 2 11-2 3-3 5-2 7 0" />
      <path d="M4 11c3-4 6 1 9-3 3-3 5-2 7 0" />
    </IconSvg>
  );
}

function BookIcon() {
  return (
    <IconSvg large>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22Z" />
      <path d="M4 5.5V22" />
      <path d="M12 6h4" />
      <path d="M12 10h4" />
    </IconSvg>
  );
}

function SunIcon() {
  return (
    <IconSvg large>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </IconSvg>
  );
}

function TreeIcon() {
  return (
    <IconSvg large>
      <path d="M12 22V10" />
      <path d="M8 22h8" />
      <path d="M12 10c-4 0-7-2-7-5 3 0 5 .8 7 5Z" />
      <path d="M12 10c4 0 7-2 7-5-3 0-5 .8-7 5Z" />
      <path d="M12 14c-4 0-7-2-7-5 3 0 5 .8 7 5Z" />
      <path d="M12 14c4 0 7-2 7-5-3 0-5 .8-7 5Z" />
    </IconSvg>
  );
}

function IconSvg({
  children,
  small = false,
  large = false,
}: {
  children: React.ReactNode;
  small?: boolean;
  large?: boolean;
}) {
  const className = small ? "h-5 w-5" : large ? "h-12 w-12" : "h-8 w-8";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

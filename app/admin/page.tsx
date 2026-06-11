import { ReactNode } from "react";
import BrandHeader from "@/components/BrandHeader";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(135deg,#061124,#020b18_52%,#111827)]" />

      <div className="fixed inset-0 pointer-events-none opacity-[0.11] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <section className="relative min-h-screen p-5 lg:p-7">
        <div className="min-h-[calc(100vh-40px)] rounded-[34px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="grid xl:grid-cols-[270px_1fr] min-h-[calc(100vh-40px)]">
            <aside className="border-b xl:border-b-0 xl:border-r border-white/10 bg-[#061124]/86 backdrop-blur-2xl p-5 xl:sticky xl:top-0 xl:h-screen">
              <div className="bg-white rounded-[20px] p-4 shadow-2xl mb-7">
                <BrandHeader center />
              </div>

              <nav className="space-y-3 mb-7">
                <AdminNavLink
                  href="/admin"
                  label="Dashboard"
                  icon={<HomeIcon />}
                  active
                  tone="green"
                />
                <AdminNavLink
                  href="/admin/live"
                  label="Live Room"
                  icon={<GavelIcon />}
                  tone="yellow"
                />
                <AdminNavLink
                  href="/admin/artworks"
                  label="Artwork Upload"
                  icon={<PaletteIcon />}
                  tone="purple"
                />
                <AdminNavLink
                  href="/admin/school"
                  label="School Profile"
                  icon={<SchoolIcon />}
                  tone="blue"
                />
                <AdminNavLink
                  href="/admin/events/new"
                  label="New Event"
                  icon={<CalendarIcon />}
                  tone="white"
                />
                <AdminNavLink
                  href="/admin/sales"
                  label="Sales Records"
                  icon={<CardIcon />}
                  tone="blue"
                />
                <AdminNavLink
                  href="/auction/demo"
                  label="Parent View"
                  icon={<PeopleIcon />}
                  tone="purple"
                />
              </nav>

              <div className="rounded-[22px] bg-white/[0.045] border border-white/12 p-5 mb-5 shadow-xl">
                <p className="uppercase tracking-[0.35em] text-[10px] text-white/45 font-black mb-4">
                  Admin Mode
                </p>

                <p className="text-3xl font-black text-[#16d66d] leading-none">
                  LIVE
                </p>

                <p className="text-white/62 text-sm font-medium mt-3 leading-relaxed">
                  BragWall event control centre
                </p>
              </div>

              <AdminLogoutButton />
            </aside>

            <section className="min-h-screen">
              <header className="p-6 lg:p-10 border-b border-white/10 bg-[#020b18]/55 backdrop-blur-xl">
                <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-8">
                  <div>
                    <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/12 px-5 py-3 mb-5 shadow-xl">
                      <span className="h-3 w-3 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.9)]" />
                      <span className="uppercase tracking-[0.35em] text-[10px] font-black text-white/72">
                        BragWall Admin
                      </span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-black leading-[0.88] tracking-[-0.055em]">
                      Your <span className="text-[#16d66d]">auction</span>{" "}
                      command centre.
                    </h1>

                    <p className="text-white/72 text-lg lg:text-xl font-medium mt-5 max-w-4xl leading-relaxed">
                      Prepare school artwork, run the live auction, track bids,
                      capture winners, and manage the event from one premium
                      control room.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-full 2xl:min-w-[560px]">
                    <MetricCard
                      label="Auction"
                      value="Demo"
                      icon={<CalendarIcon />}
                      tone="white"
                    />
                    <MetricCard
                      label="Status"
                      value="Ready"
                      icon={<CheckCircleIcon />}
                      tone="green"
                    />
                    <MetricCard
                      label="Mode"
                      value="Live"
                      icon={<BroadcastIcon />}
                      tone="yellow"
                    />
                  </div>
                </div>
              </header>

              <div className="p-5 lg:p-8 space-y-6">
                <section className="rounded-[34px] bg-white/[0.04] border border-white/10 p-4 lg:p-6 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
                  <div className="grid xl:grid-cols-[1fr_340px] gap-5">
                    <div className="rounded-[32px] bg-[#061124]/92 border border-white/12 p-6 lg:p-8 shadow-2xl">
                      <p className="uppercase tracking-[0.35em] text-[10px] text-[#16d66d] font-black mb-5">
                        Event Workflow
                      </p>

                      <h2 className="text-4xl lg:text-5xl font-black leading-[0.95] tracking-[-0.04em] mb-5">
                        From upload to{" "}
                        <span className="text-[#16d66d]">SOLD.</span>
                      </h2>

                      <p className="text-white/68 text-lg font-medium leading-relaxed max-w-4xl mb-8">
                        Start by loading artwork into the studio, then open the
                        live room to control bidding, SOLD moments, and parent
                        follow-up.
                      </p>

                      <div className="grid lg:grid-cols-3 gap-5 items-stretch">
                        <WorkflowCard
                          number="01"
                          title="Upload"
                          text="Add each child’s artwork, grade, story, and optional AI enhancement."
                          icon={<UploadIcon />}
                          tone="green"
                        />
                        <WorkflowCard
                          number="02"
                          title="Go Live"
                          text="Start the auction room and move artworks onto the stage."
                          icon={<BroadcastIcon />}
                          tone="yellow"
                        />
                        <WorkflowCard
                          number="03"
                          title="Collect"
                          text="Capture winner details for invoices, certificates, and collection."
                          icon={<TrophyIcon />}
                          tone="blue"
                        />
                      </div>
                    </div>

                    <div className="rounded-[32px] bg-[#061124]/92 border border-[#ffc857]/35 p-6 shadow-2xl flex flex-col">
                      <div className="text-center rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.18),transparent_46%),#020b18] border border-[#ffc857]/35 p-7 mb-5 shadow-[0_0_45px_rgba(255,200,87,0.1)]">
                        <div className="mx-auto mb-5 h-24 w-24 rounded-full border border-[#c678ff]/55 bg-[#c678ff]/10 text-[#f2c8ff] flex items-center justify-center">
                          <LargeGavelIcon />
                        </div>

                        <p className="text-[#ffc857] text-5xl lg:text-6xl font-black leading-none tracking-[-0.05em]">
                          READY
                        </p>

                        <p className="text-white/70 font-medium mt-4">
                          Auction cockpit standing by
                        </p>
                      </div>

                      <a
                        href="/admin/live"
                        className="rounded-[20px] bg-[#16d66d] text-[#07152b] px-6 py-5 text-center text-lg font-black shadow-[0_18px_45px_rgba(22,214,109,0.28)] hover:scale-[1.02] transition mb-4"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <HomeIcon />
                        </span>
                        Open Live Room
                      </a>

                      <a
                        href="/auction/demo"
                        className="rounded-[20px] bg-white text-[#07152b] px-6 py-5 text-center text-lg font-black shadow-xl hover:scale-[1.02] transition"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <HomeIcon />
                        </span>
                        View Parent Screen
                      </a>
                    </div>
                  </div>
                </section>

                <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <DashboardTile
                    href="/admin/artworks"
                    icon={<PaletteIcon />}
                    title="Artwork Studio"
                    text="Upload child artwork, preview the gold frame, and prepare AI auction stories."
                    action="Upload Artwork"
                    tone="green"
                  />

                  <DashboardTile
                    href="/admin/live"
                    icon={<GavelIcon />}
                    title="Live Auction Room"
                    text="Control the auction rhythm, bids, queue, automatic going once, going twice, and SOLD."
                    action="Run Auction"
                    tone="yellow"
                  />

                  <DashboardTile
                    href="/admin/sales"
                    icon={<CardIcon />}
                    title="Sales Records"
                    text="Review sold artworks, winners, invoice emails, and certificate follow-up."
                    action="View Sales"
                    tone="blue"
                  />

                  <DashboardTile
                    href="/admin/school"
                    icon={<SchoolIcon />}
                    title="School Profile"
                    text="Manage school information used across the BragWall event setup."
                    action="Edit Profile"
                    tone="purple"
                  />
                </section>

                <section className="grid xl:grid-cols-[0.8fr_1.2fr] gap-5">
                  <div className="rounded-[30px] bg-white text-[#07152b] p-6 shadow-2xl">
                    <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                      Quick Launch
                    </p>

                    <h3 className="text-4xl font-black leading-none tracking-[-0.04em] mb-5">
                      Recommended order
                    </h3>

                    <div className="space-y-3">
                      <QuickStep number="1" text="Set up your school profile." />
                      <QuickStep
                        number="2"
                        text="Create or confirm the event."
                      />
                      <QuickStep
                        number="3"
                        text="Upload artwork into the studio."
                      />
                      <QuickStep
                        number="4"
                        text="Open the live room and start bidding."
                      />
                      <QuickStep
                        number="5"
                        text="Check sales records after SOLD."
                      />
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-[#061124]/92 border border-white/10 p-6 shadow-2xl">
                    <p className="uppercase tracking-[0.3em] text-[10px] text-[#16d66d] font-black mb-4">
                      BragWall Event Night
                    </p>

                    <div className="grid md:grid-cols-3 gap-4">
                      <EventNightCard
                        icon={<PhoneIcon />}
                        title="Parent mobile view"
                        text="Parents join from their phones and bid from the live auction screen."
                        tone="green"
                      />

                      <EventNightCard
                        icon={<ArtworkIcon />}
                        title="Premium artwork stage"
                        text="Each piece appears inside the gold BragWall frame."
                        tone="yellow"
                      />

                      <EventNightCard
                        icon={<TrophyIcon />}
                        title="Winner capture"
                        text="Winning parents submit email details for invoice and certificate."
                        tone="blue"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminNavLink({
  href,
  label,
  icon,
  active = false,
  tone,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  tone: "green" | "yellow" | "blue" | "purple" | "white";
}) {
  const toneClass = getToneText(tone);

  return (
    <a
      href={href}
      className={`flex items-center gap-4 rounded-[18px] px-4 py-4 font-black transition border ${
        active
          ? "bg-[#16d66d]/22 text-white border-[#16d66d]/75 shadow-[0_0_30px_rgba(22,214,109,0.18)]"
          : "bg-white/[0.045] text-white/76 border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`h-6 w-6 flex items-center justify-center ${toneClass}`}>
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "green" | "yellow" | "white";
}) {
  const textClass = getToneText(tone);

  return (
    <div className="rounded-[24px] bg-white/[0.055] border border-white/12 p-5 shadow-xl flex items-center gap-4">
      <div className={`h-12 w-12 flex items-center justify-center ${textClass}`}>
        {icon}
      </div>

      <div>
        <p className="uppercase tracking-[0.28em] text-[10px] text-white/48 font-black mb-2">
          {label}
        </p>

        <p className={`text-2xl lg:text-3xl font-black leading-none ${textClass}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function WorkflowCard({
  number,
  title,
  text,
  icon,
  tone,
}: {
  number: string;
  title: string;
  text: string;
  icon: ReactNode;
  tone: "green" | "yellow" | "blue";
}) {
  const textClass = getToneText(tone);
  const borderClass = getToneBorder(tone);

  return (
    <div className="relative rounded-[26px] bg-white/[0.045] border border-white/10 p-6 min-h-[210px] overflow-hidden">
      <div
        className={`mb-5 h-20 w-20 rounded-full border ${borderClass} ${textClass} bg-[#020b18]/35 flex items-center justify-center`}
      >
        {icon}
      </div>

      <div className="flex items-end gap-4 mb-3">
        <p className={`text-3xl font-black ${textClass}`}>{number}</p>
        <h3 className="text-2xl font-black">{title}</h3>
      </div>

      <p className="text-white/62 font-medium leading-relaxed">{text}</p>
    </div>
  );
}

function DashboardTile({
  href,
  icon,
  title,
  text,
  action,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  tone: "green" | "yellow" | "blue" | "purple";
}) {
  const textClass = getToneText(tone);
  const borderClass = getToneBorder(tone);
  const buttonClass =
    tone === "green"
      ? "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
      : tone === "yellow"
      ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
      : "bg-white/[0.08] text-white border-white/15 group-hover:bg-white group-hover:text-[#07152b]";

  return (
    <a
      href={href}
      className="group rounded-[30px] bg-[#061124]/92 border border-white/10 p-6 shadow-2xl hover:-translate-y-1 hover:bg-[#071b38] transition min-h-[360px] flex flex-col"
    >
      <div
        className={`h-20 w-20 rounded-full border ${borderClass} ${textClass} bg-[#020b18]/35 flex items-center justify-center mb-7 shadow-xl`}
      >
        {icon}
      </div>

      <h3 className="text-3xl font-black leading-none tracking-[-0.04em] mb-4">
        {title}
      </h3>

      <p className="text-white/68 text-lg font-medium leading-relaxed mb-7">
        {text}
      </p>

      <div className={`mt-auto rounded-[18px] px-5 py-4 text-center font-black border transition ${buttonClass}`}>
        <span className="inline-flex align-middle mr-3">
          {icon}
        </span>
        {action}
      </div>
    </a>
  );
}

function QuickStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] bg-[#fbf8f1] border border-black/5 p-4">
      <div className="w-11 h-11 rounded-2xl bg-[#16d66d] text-[#07152b] flex items-center justify-center font-black shrink-0">
        {number}
      </div>

      <p className="font-black text-slate-700">{text}</p>
    </div>
  );
}

function EventNightCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: "green" | "yellow" | "blue";
}) {
  const textClass = getToneText(tone);
  const borderClass = getToneBorder(tone);

  return (
    <div className="rounded-[24px] bg-white/[0.045] border border-white/10 p-5">
      <div
        className={`h-16 w-16 rounded-full border ${borderClass} ${textClass} bg-[#020b18]/35 flex items-center justify-center mb-5`}
      >
        {icon}
      </div>

      <h3 className="text-2xl font-black mb-3">{title}</h3>

      <p className="text-white/62 font-medium leading-relaxed">{text}</p>
    </div>
  );
}

function getToneText(tone: string) {
  if (tone === "green") return "text-[#16d66d]";
  if (tone === "yellow") return "text-[#ffc857]";
  if (tone === "blue") return "text-[#4b9cff]";
  if (tone === "purple") return "text-[#d36cff]";
  return "text-white";
}

function getToneBorder(tone: string) {
  if (tone === "green") return "border-[#16d66d]/60";
  if (tone === "yellow") return "border-[#ffc857]/70";
  if (tone === "blue") return "border-[#4b9cff]/60";
  if (tone === "purple") return "border-[#d36cff]/60";
  return "border-white/20";
}

function IconSvg({
  children,
  large = false,
}: {
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={large ? "h-12 w-12" : "h-6 w-6"}
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <IconSvg>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
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

function LargeGavelIcon() {
  return (
    <IconSvg large>
      <path d="m14 13-7 7" />
      <path d="m8 8 8 8" />
      <path d="m9 7 4-4 8 8-4 4z" />
      <path d="m4 21 5-5" />
    </IconSvg>
  );
}

function PaletteIcon() {
  return (
    <IconSvg>
      <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.4 4-3.2 4H17a2 2 0 0 0-2 2c0 2.2-1.8 4-3 4Z" />
      <circle cx="7.5" cy="10.5" r=".8" />
      <circle cx="10.5" cy="7.5" r=".8" />
      <circle cx="14.5" cy="7.5" r=".8" />
      <circle cx="16.5" cy="11.5" r=".8" />
    </IconSvg>
  );
}

function SchoolIcon() {
  return (
    <IconSvg>
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
    </IconSvg>
  );
}

function CalendarIcon() {
  return (
    <IconSvg>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </IconSvg>
  );
}

function CardIcon() {
  return (
    <IconSvg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
      <path d="M15 15h2" />
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

function CheckCircleIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-5" />
    </IconSvg>
  );
}

function BroadcastIcon() {
  return (
    <IconSvg>
      <path d="M8.5 16.5a6 6 0 0 1 0-9" />
      <path d="M15.5 7.5a6 6 0 0 1 0 9" />
      <path d="M5 20a11 11 0 0 1 0-16" />
      <path d="M19 4a11 11 0 0 1 0 16" />
      <circle cx="12" cy="12" r="1.5" />
    </IconSvg>
  );
}

function UploadIcon() {
  return (
    <IconSvg>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16.5A4.5 4.5 0 0 0 15.5 12H15a6 6 0 1 0-11.5 2" />
      <path d="M4 20h16" />
    </IconSvg>
  );
}

function TrophyIcon() {
  return (
    <IconSvg>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M5 5H3v3a4 4 0 0 0 4 4" />
      <path d="M19 5h2v3a4 4 0 0 1-4 4" />
    </IconSvg>
  );
}

function PhoneIcon() {
  return (
    <IconSvg>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </IconSvg>
  );
}

function ArtworkIcon() {
  return (
    <IconSvg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
      <path d="m12 17 3-3 6 6" />
    </IconSvg>
  );
}
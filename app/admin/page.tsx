import { ReactNode } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default function AdminDashboardPage() {
  return (
    <main className="h-screen bg-[#020b18] text-white overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .bragwall-admin-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.18) transparent;
            }

            .bragwall-admin-scroll::-webkit-scrollbar {
              width: 8px;
            }

            .bragwall-admin-scroll::-webkit-scrollbar-track {
              background: transparent;
            }

            .bragwall-admin-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.16);
              border-radius: 999px;
            }

            .bragwall-admin-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.26);
            }
          `,
        }}
      />

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_14%,rgba(22,214,109,0.22),transparent_29%),radial-gradient(circle_at_78%_18%,rgba(255,200,87,0.14),transparent_28%),linear-gradient(135deg,#061124_0%,#020b18_48%,#111827_100%)]" />

      <div className="fixed inset-0 pointer-events-none opacity-[0.105] bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <section className="relative h-screen p-3.5">
        <div className="h-full rounded-[30px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.72)] overflow-hidden">
          <div className="grid h-full grid-cols-[248px_1fr]">
            <aside className="h-full border-r border-white/10 bg-[#061124]/92 backdrop-blur-2xl p-4 flex flex-col">
              <div className="rounded-[18px] bg-white p-3.5 shadow-2xl mb-5">
                <img
                  src="/bragwall-logo.png"
                  alt="BragWall"
                  className="w-full h-auto object-contain"
                />

                <p className="mt-2.5 text-center uppercase tracking-[0.42em] text-[8px] text-slate-400 font-black">
                  Young Art • Big Pride
                </p>
              </div>

              <nav className="space-y-2.5">
                <SidebarLink
                  href="/admin"
                  label="Dashboard"
                  icon={<HomeIcon />}
                  active
                  tone="green"
                />
                <SidebarLink
                  href="/admin/live"
                  label="Live Room"
                  icon={<GavelIcon />}
                  tone="yellow"
                />
                <SidebarLink
                  href="/admin/artworks"
                  label="Artwork Upload"
                  icon={<PaletteIcon />}
                  tone="purple"
                />
                <SidebarLink
                  href="/admin/school"
                  label="School Profile"
                  icon={<SchoolIcon />}
                  tone="blue"
                />
                <SidebarLink
                  href="/admin/events/new"
                  label="New Event"
                  icon={<CalendarIcon />}
                  tone="white"
                />
                <SidebarLink
                  href="/admin/sales"
                  label="Sales Records"
                  icon={<CardIcon />}
                  tone="blue"
                />
                <SidebarLink
                  href="/auction/demo"
                  label="Parent View"
                  icon={<PeopleIcon />}
                  tone="purple"
                />
              </nav>

              <div className="mt-auto rounded-[20px] border border-white/12 bg-white/[0.045] p-4 shadow-xl">
                <p className="uppercase tracking-[0.34em] text-[8px] text-white/45 font-black mb-3">
                  Admin Mode
                </p>

                <p className="text-[28px] font-black text-[#16d66d] leading-none">
                  LIVE
                </p>

                <p className="text-white/62 text-[13px] font-medium mt-2.5 leading-relaxed">
                  BragWall event control centre
                </p>
              </div>

              <div className="mt-4">
                <AdminLogoutButton />
              </div>
            </aside>

            <section className="h-full overflow-y-auto bragwall-admin-scroll">
              <div className="px-7 pt-6 pb-5">
                <div className="flex items-start justify-between gap-8">
                  <div>
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-5 py-2 shadow-xl mb-4">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.9)]" />
                      <span className="uppercase tracking-[0.35em] text-[8px] font-black text-white/72">
                        BragWall Admin
                      </span>
                    </div>

                    <h1 className="text-[54px] font-black leading-[0.9] tracking-[-0.065em]">
                      Your <span className="text-[#16d66d]">auction</span>{" "}
                      command centre.
                    </h1>

                    <p className="max-w-4xl text-white/72 text-base leading-relaxed font-medium mt-3">
                      Prepare school artwork, run the live auction, track bids,
                      capture winners, and manage the event from one premium
                      control room.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5 min-w-[470px] pt-4">
                    <StatusCard
                      label="Auction"
                      value="Demo"
                      icon={<CalendarIcon />}
                      tone="white"
                    />
                    <StatusCard
                      label="Status"
                      value="Ready"
                      icon={<CheckCircleIcon />}
                      tone="green"
                    />
                    <StatusCard
                      label="Mode"
                      value="Live"
                      icon={<BroadcastIcon />}
                      tone="yellow"
                    />
                  </div>
                </div>
              </div>

              <div className="px-7 pb-7">
                <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-4.5 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
                  <div className="grid grid-cols-[1fr_306px] gap-4.5">
                    <div className="rounded-[28px] border border-white/12 bg-[#061124]/95 p-6 shadow-2xl">
                      <p className="uppercase tracking-[0.35em] text-[8px] text-[#16d66d] font-black mb-3.5">
                        Event Workflow
                      </p>

                      <h2 className="text-[41px] font-black leading-[0.95] tracking-[-0.05em] mb-3.5">
                        From upload to{" "}
                        <span className="text-[#16d66d]">SOLD.</span>
                      </h2>

                      <p className="text-white/68 text-base font-medium leading-relaxed max-w-4xl mb-5.5">
                        Start by loading artwork into the studio, then open the
                        live room to control bidding, SOLD moments, and parent
                        follow-up.
                      </p>

                      <div className="grid grid-cols-3 gap-4.5">
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

                    <div className="rounded-[28px] border border-[#ffc857]/38 bg-[#061124]/95 p-4.5 shadow-2xl flex flex-col">
                      <div className="flex-1 rounded-[24px] border border-[#ffc857]/35 bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.2),transparent_49%),#020b18] p-5 flex flex-col items-center justify-center text-center shadow-[0_0_45px_rgba(255,200,87,0.12)]">
                        <div className="mb-5 h-[92px] w-[92px] rounded-full border border-[#d36cff]/65 bg-[#d36cff]/12 text-[#f2c8ff] flex items-center justify-center shadow-[0_0_36px_rgba(211,108,255,0.17)]">
                          <LargeGavelIcon />
                        </div>

                        <p className="text-[#ffc857] text-[49px] font-black leading-none tracking-[-0.065em] drop-shadow-[0_0_16px_rgba(255,200,87,0.18)]">
                          READY
                        </p>

                        <p className="text-white/70 text-sm font-medium mt-4">
                          Auction cockpit standing by
                        </p>
                      </div>

                      <a
                        href="/admin/live"
                        className="mt-3.5 rounded-[17px] bg-[#16d66d] text-[#07152b] px-5 py-3.5 text-center text-[15px] font-black shadow-[0_18px_45px_rgba(22,214,109,0.28)] hover:scale-[1.02] transition"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <HomeIcon />
                        </span>
                        Open Live Room
                      </a>

                      <a
                        href="/auction/demo"
                        className="mt-2.5 rounded-[17px] bg-white text-[#07152b] px-5 py-3.5 text-center text-[15px] font-black shadow-xl hover:scale-[1.02] transition"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <HomeIcon />
                        </span>
                        View Parent Screen
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-4.5 grid grid-cols-4 gap-4.5">
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
                    text="Control the auction rhythm, bids, queue, going once, going twice, and SOLD."
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
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function SidebarLink({
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
  tone: Tone;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3.5 rounded-[15px] px-3.5 py-3.5 text-[13px] font-black transition border ${
        active
          ? "bg-[#16d66d]/24 text-white border-[#16d66d]/75 shadow-[0_0_30px_rgba(22,214,109,0.2)]"
          : "bg-white/[0.045] text-white/76 border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`h-5.5 w-5.5 flex items-center justify-center ${toneText(tone)}`}>
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function StatusCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: Tone;
}) {
  return (
    <div className="rounded-[20px] bg-white/[0.06] border border-white/12 p-4 shadow-xl flex items-center gap-3.5">
      <div className={`h-10 w-10 flex items-center justify-center ${toneText(tone)}`}>
        {icon}
      </div>

      <div>
        <p className="uppercase tracking-[0.28em] text-[8px] text-white/48 font-black mb-1.5">
          {label}
        </p>

        <p className={`text-[22px] font-black leading-none ${toneText(tone)}`}>
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
  tone: Tone;
}) {
  return (
    <div className="rounded-[22px] bg-white/[0.05] border border-white/10 p-4.5 min-h-[170px] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div
        className={`mb-3.5 h-[66px] w-[66px] rounded-full border ${toneBorder(
          tone
        )} ${toneText(tone)} bg-[#020b18]/45 flex items-center justify-center shadow-[0_0_24px_rgba(0,0,0,0.18)]`}
      >
        {icon}
      </div>

      <div className="flex items-end gap-3 mb-2.5">
        <p className={`text-[28px] font-black leading-none ${toneText(tone)}`}>
          {number}
        </p>
        <h3 className="text-[22px] font-black leading-none">{title}</h3>
      </div>

      <p className="text-white/62 text-[13px] font-medium leading-relaxed">
        {text}
      </p>
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
  tone: Tone;
}) {
  const buttonClass =
    tone === "green"
      ? "bg-[#16d66d] text-[#07152b] border-[#16d66d] shadow-[0_14px_35px_rgba(22,214,109,0.2)]"
      : tone === "yellow"
      ? "bg-[#ffc857] text-[#07152b] border-[#ffc857] shadow-[0_14px_35px_rgba(255,200,87,0.18)]"
      : "bg-white/[0.08] text-white border-white/15 group-hover:bg-white group-hover:text-[#07152b]";

  return (
    <a
      href={href}
      className="group rounded-[26px] bg-[#061124]/95 border border-white/10 p-4.5 shadow-2xl hover:-translate-y-1 hover:bg-[#071b38] transition min-h-[248px] flex flex-col"
    >
      <div
        className={`h-[70px] w-[70px] rounded-full border ${toneBorder(
          tone
        )} ${toneText(tone)} bg-[#020b18]/45 flex items-center justify-center mb-5 shadow-xl`}
      >
        {icon}
      </div>

      <h3 className="text-[25px] font-black leading-none tracking-[-0.04em] mb-3">
        {title}
      </h3>

      <p className="text-white/68 text-sm font-medium leading-relaxed mb-5">
        {text}
      </p>

      <div
        className={`mt-auto rounded-[15px] px-4 py-3 text-center text-[14px] font-black border transition ${buttonClass}`}
      >
        <span className="inline-flex align-middle mr-2.5">{icon}</span>
        {action}
      </div>
    </a>
  );
}

type Tone = "green" | "yellow" | "blue" | "purple" | "white";

function toneText(tone: Tone) {
  if (tone === "green") return "text-[#16d66d]";
  if (tone === "yellow") return "text-[#ffc857]";
  if (tone === "blue") return "text-[#4b9cff]";
  if (tone === "purple") return "text-[#d36cff]";
  return "text-white";
}

function toneBorder(tone: Tone) {
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
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={large ? "h-12 w-12" : "h-5.5 w-5.5"}
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
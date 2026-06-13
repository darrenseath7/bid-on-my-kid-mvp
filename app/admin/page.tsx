import { ReactNode } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
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

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.13),transparent_32%),radial-gradient(circle_at_52%_88%,rgba(11,99,206,0.14),transparent_38%),linear-gradient(180deg,#061124,#020b18_58%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:52px_52px]" />
      <div className="fixed inset-3 pointer-events-none rounded-[32px] border border-[#c78b25]/20 shadow-[inset_0_0_70px_rgba(199,139,37,0.07)]" />
      <DashboardArtDecor />

      <section className="relative h-screen p-3.5">
        <div className="h-full rounded-[30px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.72)] overflow-hidden">
          <div className="grid h-full grid-cols-[248px_1fr]">
            <aside className="h-full border-r border-white/10 bg-[#061124]/92 backdrop-blur-2xl p-4 flex flex-col">
              <LogoBlock />

              <nav className="space-y-2.5 mt-5">
                <SidebarLink
                  href="/admin"
                  label="Dashboard"
                  icon={<HomeIcon />}
                  active
                  tone="green"
                />
                <SidebarLink
                  href="/admin/setup"
                  label="Add School & Artwork"
                  icon={<PaletteIcon />}
                  tone="purple"
                />
                <SidebarLink
                  href="/admin/live"
                  label="Live Room"
                  icon={<GavelIcon />}
                  tone="yellow"
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
                  icon={<PhoneIcon />}
                  tone="purple"
                />
              </nav>

              <div className="mt-auto rounded-[24px] border border-white/12 bg-white/[0.045] p-4 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('/bragwall-hero-paint-hands.jpg')] bg-cover bg-center opacity-18" />
                <div className="absolute inset-0 bg-[#020b18]/72" />

                <div className="relative">
                  <p className="uppercase tracking-[0.34em] text-[8px] text-white/55 font-black mb-3">
                    Admin Mode
                  </p>

                  <p className="text-[31px] font-black text-[#16d66d] leading-none">
                    READY
                  </p>

                  <p className="text-white/70 text-[13px] font-bold mt-2.5 leading-relaxed">
                    BragWall event control centre
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <AdminLogoutButton />
              </div>
            </aside>

            <section className="h-full overflow-y-auto bragwall-admin-scroll">
              <div className="px-7 pt-6 pb-5">
                <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#061124]/70 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
                  <div className="absolute inset-0 bg-[url('/bragwall-hero-paint-hands.jpg')] bg-cover bg-center opacity-25" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#020b18_0%,rgba(2,11,24,0.92)_42%,rgba(2,11,24,0.68)_100%)]" />
                  <div className="absolute right-8 top-8 h-32 w-32 rounded-full bg-[#16d66d]/16 blur-3xl" />
                  <div className="absolute right-32 bottom-3 h-28 w-28 rounded-full bg-[#ffc857]/14 blur-3xl" />

                  <div className="relative flex items-start justify-between gap-8">
                    <div>
                      <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-5 py-2 shadow-xl mb-4">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.9)]" />
                        <span className="uppercase tracking-[0.35em] text-[8px] font-black text-white/72">
                          BragWall Admin
                        </span>
                      </div>

                      <h1 className="text-[56px] font-black leading-[0.9] tracking-[-0.065em] max-w-4xl">
                        Your <span className="text-[#16d66d]">auction</span>{" "}
                        command centre.
                      </h1>

                      <p className="max-w-3xl text-white/76 text-base leading-relaxed font-semibold mt-4">
                        Prepare artwork, run the live room, capture winners, and
                        manage every school fundraising moment from one polished
                        BragWall dashboard.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3.5 min-w-[480px] pt-4">
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
              </div>

              <div className="px-7 pb-7">
                <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-4.5 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
                  <div className="grid grid-cols-[1fr_330px] gap-4.5">
                    <div className="rounded-[30px] border border-white/12 bg-[#061124]/95 p-6 shadow-2xl overflow-hidden relative">
                      <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#16d66d]/10 blur-3xl" />
                      <div className="absolute right-16 bottom-[-70px] h-44 w-44 rounded-full bg-[#ffc857]/10 blur-3xl" />

                      <div className="relative">
                        <p className="uppercase tracking-[0.35em] text-[8px] text-[#16d66d] font-black mb-3.5">
                          Event Workflow
                        </p>

                        <h2 className="text-[43px] font-black leading-[0.95] tracking-[-0.05em] mb-3.5">
                          From school setup to{" "}
                          <span className="text-[#16d66d]">SOLD.</span>
                        </h2>

                        <p className="text-white/70 text-base font-semibold leading-relaxed max-w-4xl mb-5.5">
                          Start with school details, payment references, bid
                          increments, and artwork. Then open the live room and
                          let parents bid from their phones.
                        </p>

                        <div className="grid grid-cols-3 gap-4.5">
                          <WorkflowCard
                            number="01"
                            title="Setup"
                            text="Add school details, banking, payment reference, bid increment, and artworks."
                            icon={<PaletteIcon />}
                            tone="purple"
                          />
                          <WorkflowCard
                            number="02"
                            title="Go Live"
                            text="Start the auction room and move each artwork onto the stage."
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
                    </div>

                    <div className="rounded-[30px] border border-[#ffc857]/34 bg-[#061124]/95 p-4.5 shadow-2xl flex flex-col">
                      <div className="relative flex-1 overflow-hidden rounded-[26px] border border-[#ffc857]/30 bg-[#020b18] p-5 flex flex-col items-center justify-center text-center shadow-[0_0_45px_rgba(255,200,87,0.12)]">
                        <div className="absolute inset-0 bg-[url('/bragwall-hero-paint-hands.jpg')] bg-cover bg-center opacity-24" />
                        <div className="absolute inset-0 bg-[#020b18]/68" />

                        <div className="relative mb-5 h-[92px] w-[92px] rounded-full border border-[#d36cff]/65 bg-[#d36cff]/12 text-[#f2c8ff] flex items-center justify-center shadow-[0_0_36px_rgba(211,108,255,0.17)]">
                          <LargeGavelIcon />
                        </div>

                        <p className="relative text-[#ffc857] text-[50px] font-black leading-none tracking-[-0.065em] drop-shadow-[0_0_16px_rgba(255,200,87,0.18)]">
                          READY
                        </p>

                        <p className="relative text-white/76 text-sm font-bold mt-4">
                          Auction cockpit standing by
                        </p>
                      </div>

                      <a
                        href="/admin/live"
                        className="mt-3.5 rounded-[18px] bg-[#16d66d] text-[#07152b] px-5 py-3.5 text-center text-[15px] font-black shadow-[0_18px_45px_rgba(22,214,109,0.28)] hover:scale-[1.02] transition"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <GavelIcon />
                        </span>
                        Open Live Room
                      </a>

                      <a
                        href="/auction/demo"
                        className="mt-2.5 rounded-[18px] bg-white text-[#07152b] px-5 py-3.5 text-center text-[15px] font-black shadow-xl hover:scale-[1.02] transition"
                      >
                        <span className="inline-flex align-middle mr-3">
                          <PhoneIcon />
                        </span>
                        View Parent Screen
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-4.5 grid grid-cols-4 gap-4.5">
                  <DashboardTile
                    href="/admin/setup"
                    icon={<PaletteIcon />}
                    title="Add School & Artwork"
                    text="Set up school details, banking, payment reference, bid increments, and artwork uploads."
                    action="Open Setup"
                    tone="green"
                  />

                  <DashboardTile
                    href="/admin/live"
                    icon={<GavelIcon />}
                    title="Live Auction Room"
                    text="Control the auction rhythm, intros, bids, queue, going once, going twice, and SOLD."
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
                    href="/auction/demo"
                    icon={<PhoneIcon />}
                    title="Parent View"
                    text="Open the mobile parent auction arena and test the live bidding experience."
                    action="Open Parent View"
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

function LogoBlock() {
  return (
    <div className="rounded-[22px] bg-white p-3.5 shadow-2xl border border-white/15">
      <img
        src="/bragwall-logo.png"
        alt="BragWall"
        className="w-full h-auto object-contain"
      />

      <p className="mt-2.5 text-center uppercase tracking-[0.36em] text-[8px] text-[#07152b]/55 font-black">
        Young Art - Big Pride
      </p>
    </div>
  );
}

function DashboardArtDecor() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute left-5 right-5 top-5 hidden h-px bg-gradient-to-r from-transparent via-[#c78b25]/22 to-transparent md:block" />
      <div className="absolute left-5 right-5 bottom-5 hidden h-px bg-gradient-to-r from-transparent via-[#16d66d]/16 to-transparent md:block" />
      <div className="absolute -right-24 top-28 hidden h-72 w-72 rounded-full border border-[#c78b25]/10 bg-[radial-gradient(circle,rgba(255,200,87,0.10),transparent_64%)] blur-[1px] lg:block" />
      <div className="absolute -left-24 bottom-24 hidden h-80 w-80 rounded-full border border-[#16d66d]/10 bg-[radial-gradient(circle,rgba(22,214,109,0.10),transparent_66%)] blur-[1px] lg:block" />
      <div className="absolute left-[9%] top-[22%] h-2.5 w-2.5 rounded-full bg-[#ffc857] shadow-[0_0_22px_rgba(255,200,87,0.85)]" />
      <div className="absolute right-[14%] top-[26%] h-2 w-2 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.8)]" />
      <div className="absolute right-[22%] bottom-[18%] text-[#8b7cff]/55 text-3xl font-black rotate-12">
        ✦
      </div>
    </div>
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
      <span
        className={`h-5.5 w-5.5 flex items-center justify-center ${toneText(
          tone
        )}`}
      >
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
    <div className="rounded-[20px] bg-white/[0.08] border border-white/12 p-4 shadow-xl flex items-center gap-3.5 backdrop-blur">
      <div
        className={`h-10 w-10 flex items-center justify-center ${toneText(
          tone
        )}`}
      >
        {icon}
      </div>

      <div>
        <p className="uppercase tracking-[0.28em] text-[8px] text-white/50 font-black mb-1.5">
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
    <div className="rounded-[24px] bg-white/[0.055] border border-white/10 p-4.5 min-h-[178px] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div
        className={`mb-3.5 h-[66px] w-[66px] rounded-full border ${toneBorder(
          tone
        )} ${toneText(
          tone
        )} bg-[#020b18]/45 flex items-center justify-center shadow-[0_0_24px_rgba(0,0,0,0.18)]`}
      >
        {icon}
      </div>

      <div className="flex items-end gap-3 mb-2.5">
        <p className={`text-[28px] font-black leading-none ${toneText(tone)}`}>
          {number}
        </p>
        <h3 className="text-[22px] font-black leading-none">{title}</h3>
      </div>

      <p className="text-white/66 text-[13px] font-semibold leading-relaxed">
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
      className="group rounded-[28px] bg-[#061124]/95 border border-white/10 p-4.5 shadow-2xl hover:-translate-y-1 hover:bg-[#071b38] transition min-h-[252px] flex flex-col overflow-hidden relative"
    >
      <div className="absolute right-[-60px] top-[-60px] h-36 w-36 rounded-full bg-white/[0.035] blur-2xl group-hover:bg-[#16d66d]/10" />

      <div
        className={`relative h-[70px] w-[70px] rounded-full border ${toneBorder(
          tone
        )} ${toneText(
          tone
        )} bg-[#020b18]/45 flex items-center justify-center mb-5 shadow-xl`}
      >
        {icon}
      </div>

      <h3 className="relative text-[25px] font-black leading-none tracking-[-0.04em] mb-3">
        {title}
      </h3>

      <p className="relative text-white/70 text-sm font-semibold leading-relaxed mb-5">
        {text}
      </p>

      <div
        className={`relative mt-auto rounded-[16px] px-4 py-3 text-center text-[14px] font-black border transition ${buttonClass}`}
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

function PhoneIcon() {
  return (
    <IconSvg>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
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

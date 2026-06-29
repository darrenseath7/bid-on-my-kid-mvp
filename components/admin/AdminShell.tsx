"use client";

import { ReactNode } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type AdminNavKey = "dashboard" | "setup" | "live" | "sales" | "parent";

type AdminShellProps = {
  active: AdminNavKey;
  eyebrow?: string;
  title: string;
  description?: string;
  status?: ReactNode;
  selector?: ReactNode;
  children: ReactNode;
};

const navItems: Array<{ key: AdminNavKey; href: string; label: string; icon: ReactNode }> = [
  { key: "dashboard", href: "/admin", label: "Dashboard", icon: <HomeIcon /> },
  { key: "setup", href: "/admin/setup", label: "Add School & Artwork", icon: <SchoolIcon /> },
  { key: "live", href: "/admin/live", label: "Live Room", icon: <GavelIcon /> },
  { key: "sales", href: "/admin/sales", label: "Sales Records", icon: <CardIcon /> },
  { key: "parent", href: "/auction/demo", label: "Parent View", icon: <PhoneIcon /> },
];

export default function AdminShell({
  active,
  eyebrow = "BragWall admin",
  title,
  description,
  status,
  selector,
  children,
}: AdminShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020b18] text-white">
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="admin-blank-space-artwork-layer pointer-events-none fixed left-[560px] top-[225px] z-[2] hidden h-[330px] w-[840px] rounded-[38px] object-cover opacity-70 saturate-150 contrast-125 lg:block"
        aria-hidden="true"
      />
      <div
        className="admin-blank-space-artwork-layer pointer-events-none fixed left-[560px] top-[225px] z-[3] hidden h-[330px] w-[840px] rounded-[38px] bg-gradient-to-r from-[#071224] via-[#071224]/18 to-transparent lg:block"
        aria-hidden="true"
      />
      <div
        className="admin-blank-space-artwork-layer pointer-events-none fixed left-[560px] top-[225px] z-[4] hidden h-[330px] w-[840px] rounded-[38px] bg-gradient-to-b from-transparent via-transparent to-[#071224]/35 lg:block"
        aria-hidden="true"
      />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="admin-section-artwork-layer pointer-events-none fixed right-[22px] top-[175px] z-[2] hidden h-[390px] w-[590px] rounded-[34px] object-cover opacity-70 saturate-150 contrast-125 lg:block"
        aria-hidden="true"
      />
      <div
        className="admin-section-artwork-layer pointer-events-none fixed right-[22px] top-[175px] z-[3] hidden h-[390px] w-[590px] rounded-[34px] bg-gradient-to-r from-[#071224] via-[#071224]/22 to-transparent lg:block"
        aria-hidden="true"
      />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="admin-section-artwork-layer pointer-events-none fixed right-[38px] bottom-[55px] z-[2] hidden h-[280px] w-[420px] rotate-[-5deg] rounded-[30px] object-cover opacity-45 saturate-150 contrast-125 xl:block"
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_8%,rgba(22,214,109,0.20),transparent_26%),radial-gradient(circle_at_85%_6%,rgba(255,200,87,0.12),transparent_30%),linear-gradient(180deg,#071327,#020b18_58%,#010712)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.055] bg-[linear-gradient(rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.13)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="pointer-events-none fixed right-[-72px] top-[168px] z-[1] hidden h-[560px] w-[450px] object-contain opacity-42 lg:block"
        aria-hidden="true"
      />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="pointer-events-none fixed bottom-[-120px] left-[212px] z-[1] hidden h-[500px] w-[410px] rotate-[-10deg] object-contain opacity-30 xl:block"
        aria-hidden="true"
      />

      <section className="relative z-10 h-screen p-2 md:p-3">
        <div className="grid h-full overflow-hidden rounded-[30px] border border-white/10 bg-[#061124]/78 shadow-[0_34px_150px_rgba(0,0,0,0.76)] lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-white/10 bg-[#061124]/95 lg:flex lg:flex-col">
            <div className="shrink-0 px-5 pb-5 pt-5">
              <div className="w-fit rounded-[18px] bg-white p-3 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <img src="/bragwall-logo.png" alt="BragWall" className="h-auto w-[122px]" />
              </div>
              <p className="mt-3 text-[8px] font-black uppercase tracking-[0.34em] text-white/42">
                Young Art - Big Pride
              </p>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-4 pb-4">
              {navItems.map((item) => (
                <AdminShellNavItem key={item.key} href={item.href} label={item.label} icon={item.icon} active={active === item.key} />
              ))}
            </nav>

            <div className="shrink-0 space-y-3 px-4 pb-4">
              <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                <img
                  src="/bragwall-paint-splatter.jpg"
                  alt=""
                  className="pointer-events-none absolute right-[-26px] top-[-38px] h-28 w-24 object-contain opacity-40"
                  aria-hidden="true"
                />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Need help?</p>
                  <p className="mt-2 text-sm font-black leading-snug text-white">View guides & tips</p>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-3">
                <AdminLogoutButton />
              </div>
            </div>
          </aside>

          <section className="min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 lg:px-7 lg:py-6">
            <div className="mx-auto max-w-[1480px]">
              <header className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#07162b]/88 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.38)] md:p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_35%,rgba(22,214,109,0.12),transparent_34%)]" />
                  <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-[#16d66d]">
                        {eyebrow}
                      </p>
                      <h1 className="text-4xl font-black leading-none tracking-[-0.06em] md:text-6xl">
                        {title}
                      </h1>
                      {description && (
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-white/58 md:text-base">
                          {description}
                        </p>
                      )}
                    </div>
                    {status}
                  </div>
                </div>

                {selector}
              </header>

              {children}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminShellNavItem({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <a
      href={href}
      className={`flex min-w-0 items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-black transition ${
        active
          ? "border-[#16d66d]/55 bg-[#16d66d]/22 text-white shadow-[0_0_32px_rgba(22,214,109,0.18)]"
          : "border-transparent text-white/68 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className={active ? "text-[#16d66d]" : "text-white/54"}>{icon}</span>
      <span className="min-w-0 leading-tight">{label}</span>
    </a>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {children}
    </svg>
  );
}

function HomeIcon() {
  return <Icon><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></Icon>;
}

function SchoolIcon() {
  return <Icon><path d="M3 21h18" /><path d="M4 10 12 4l8 6" /><path d="M6 10v10" /><path d="M18 10v10" /><path d="M9 21v-7h6v7" /></Icon>;
}

function GavelIcon() {
  return <Icon><path d="m14 13-7 7-3-3 7-7" /><path d="m16 3 5 5" /><path d="m8 11 7-7 5 5-7 7" /></Icon>;
}

function CardIcon() {
  return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /><path d="M15 15h2" /></Icon>;
}

function PhoneIcon() {
  return <Icon><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Icon>;
}




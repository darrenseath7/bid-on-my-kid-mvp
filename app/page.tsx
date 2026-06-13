"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("darren@roadprotect.co.za");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(22,214,109,0.2),transparent_28%),radial-gradient(circle_at_70%_18%,rgba(255,200,87,0.12),transparent_26%),linear-gradient(135deg,#061124_0%,#020b18_46%,#151922_100%)]" />

      <div className="fixed inset-0 opacity-[0.13] bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.09),transparent_23%),radial-gradient(circle_at_42%_28%,rgba(11,99,206,0.12),transparent_22%)]" />

      <section className="relative min-h-screen px-5 py-6 lg:p-8">
        <div className="relative min-h-[calc(100vh-48px)] rounded-[34px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="pointer-events-none hidden lg:block absolute top-0 bottom-0 left-[51.5%] w-px bg-white/10 z-20" />
          <div className="pointer-events-none hidden lg:block absolute top-[7%] bottom-[7%] left-[51.5%] w-px bg-[#ffc857]/80 shadow-[0_0_35px_rgba(255,200,87,0.8)] z-30" />
          <div className="pointer-events-none hidden lg:block absolute top-[22%] bottom-[22%] left-[51.5%] w-[3px] -translate-x-1/2 bg-[#ffc857]/60 blur-[5px] z-30" />

          <div className="grid min-h-[calc(100vh-48px)] lg:grid-cols-[1.06fr_0.94fr]">
            <section className="relative p-7 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(22,214,109,0.22),transparent_26%),radial-gradient(circle_at_78%_28%,rgba(11,99,206,0.16),transparent_26%)]" />
              <div className="absolute inset-x-0 bottom-0 h-[58%] opacity-35 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.95),transparent_62%)]" />

              <div className="relative">
                <div className="mb-11">
                  <img
                    src="/bragwall-logo.png"
                    alt="BragWall"
                    className="h-20 sm:h-24 lg:h-28 w-auto object-contain drop-shadow-2xl"
                  />

                  <p className="mt-5 uppercase tracking-[0.58em] text-[11px] text-white/60 font-black">
                    Young Art <span className="text-[#16d66d]">•</span> Big
                    Pride
                  </p>
                </div>

                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-5 py-3 shadow-xl backdrop-blur mb-8">
                  <span className="h-3 w-3 rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.9)]" />
                  <span className="uppercase tracking-[0.3em] text-xs font-black text-white/85">
                    Live Auction Experience
                  </span>
                </div>

                <h1 className="max-w-3xl text-[54px] sm:text-[70px] lg:text-[76px] xl:text-[86px] font-black leading-[0.88] tracking-[-0.075em] mb-8">
                  A live art auction that feels like{" "}
                  <span className="text-[#16d66d]">a big night out.</span>
                </h1>

                <div className="h-1.5 w-24 rounded-full bg-[#ffc857] shadow-[0_0_18px_rgba(255,200,87,0.45)] mb-7" />

                <p className="max-w-xl text-lg sm:text-xl text-white/75 leading-relaxed font-semibold mb-9">
                  BragWall turns student artwork into a premium mobile auction
                  experience — framed masterpieces, live bids, dramatic SOLD
                  moments, and winner follow-up built in.
                </p>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-10 max-w-4xl">
                  <FeaturePill
                    icon={<ArtworkIcon />}
                    title="Original student masterpieces"
                    accent="green"
                  />
                  <FeaturePill
                    icon={<GavelIcon />}
                    title="Live bidding with auction MC"
                    accent="yellow"
                  />
                  <FeaturePill
                    icon={<MoneyIcon />}
                    title="Secure payments & invoicing"
                    accent="green"
                  />
                  <FeaturePill
                    icon={<TrophyIcon />}
                    title="Winner certificates & follow-up"
                    accent="yellow"
                  />
                </div>

                <button
                  onClick={() => router.push("/auction/demo")}
                  className="group w-full max-w-xl rounded-[24px] bg-[#16d66d] px-8 py-6 text-[#07152b] text-2xl font-black shadow-[0_0_45px_rgba(22,214,109,0.35)] transition hover:scale-[1.015] hover:bg-[#1ff07e] active:scale-[0.99]"
                >
                  <span className="inline-flex items-center justify-center mr-4 align-middle">
                    <PeopleIcon />
                  </span>
                  Join the Auction
                </button>

                <p className="max-w-xl text-center text-white/55 font-semibold mt-4">
                  Perfect for parents, family & friends
                </p>
              </div>

              <div className="relative mt-10 grid grid-cols-2 sm:grid-cols-4 rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl overflow-hidden max-w-4xl">
                <StatBlock
                  icon={<PeopleIcon />}
                  value="250+"
                  label="Families"
                  accent="green"
                />
                <StatBlock
                  icon={<ArtworkIcon />}
                  value="500+"
                  label="Artworks"
                  accent="yellow"
                />
                <StatBlock
                  icon={<GavelIcon />}
                  value="3.2K+"
                  label="Bids"
                  accent="green"
                />
                <StatBlock
                  icon={<TrophyIcon />}
                  value="R450K+"
                  label="Raised"
                  accent="yellow"
                />
              </div>
            </section>

            <section className="relative p-7 sm:p-10 lg:p-14 xl:p-16 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(11,99,206,0.14),transparent_24%),radial-gradient(circle_at_30%_80%,rgba(22,214,109,0.1),transparent_26%)]" />

              <div className="relative w-full max-w-[620px] rounded-[34px] border border-white/15 bg-[#071426]/86 p-6 sm:p-9 lg:p-11 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-5 py-3 mb-8 shadow-lg">
                    <span className="text-[#16d66d]">
                      <LockIcon />
                    </span>
                    <span className="uppercase tracking-[0.3em] text-xs font-black text-white/90">
                      Admin Access
                    </span>
                  </div>

                  <h2 className="text-5xl sm:text-6xl font-black tracking-[-0.06em] leading-none mb-5">
                    Welcome <span className="text-[#16d66d]">back.</span>
                  </h2>

                  <p className="text-white/70 text-lg sm:text-xl leading-relaxed font-medium max-w-md mx-auto">
                    Use your Supabase admin account to access the BragWall
                    control room.
                  </p>
                </div>

                <form onSubmit={signIn} className="space-y-6">
                  <div>
                    <label className="block uppercase tracking-[0.25em] text-xs font-black text-white/60 mb-3">
                      Admin Email
                    </label>

                    <div className="flex items-center gap-4 rounded-2xl border border-white/25 bg-white/[0.06] px-5 py-4 focus-within:border-[#16d66d] transition">
                      <span className="text-white/65">
                        <MailIcon />
                      </span>

                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        className="w-full bg-transparent outline-none text-white text-lg font-semibold placeholder:text-white/30 appearance-none"
                        style={{ WebkitTextFillColor: "white" }}
                        placeholder="admin@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block uppercase tracking-[0.25em] text-xs font-black text-white/60 mb-3">
                      Password
                    </label>

                    <div className="flex items-center gap-4 rounded-2xl border border-white/25 bg-white/[0.06] px-5 py-4 focus-within:border-[#16d66d] transition">
                      <span className="text-white/65">
                        <LockIcon />
                      </span>

                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        className="w-full bg-transparent outline-none text-white text-lg font-semibold placeholder:text-white/30 appearance-none"
                        style={{ WebkitTextFillColor: "white" }}
                        placeholder="••••••••"
                      />

                      <span className="text-white/45">
                        <EyeIcon />
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#16d66d] px-8 py-5 text-[#07152b] text-xl font-black shadow-[0_0_40px_rgba(22,214,109,0.25)] transition hover:bg-[#1ff07e] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    <span className="inline-flex align-middle mr-3">
                      <LockIcon />
                    </span>
                    {loading ? "Signing In..." : "Sign In to Admin"}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-8">
                  <div className="h-px flex-1 bg-white/10" />
                  <p className="uppercase tracking-[0.38em] text-xs text-white/45 font-black whitespace-nowrap">
                    Secure <span className="text-[#16d66d]">•</span> Private{" "}
                    <span className="text-[#16d66d]">•</span> Protected
                  </p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <LoginTile
                    icon={<ShieldIcon />}
                    title="Secure"
                    text="Enterprise-grade data protection"
                    color="green"
                  />
                  <LoginTile
                    icon={<GavelIcon />}
                    title="Live Control"
                    text="Run the auction with confidence"
                    color="yellow"
                  />
                  <LoginTile
                    icon={<PaletteIcon />}
                    title="Studio Tools"
                    text="Upload, manage & track everything"
                    color="blue"
                  />
                </div>

                <p className="text-center mt-8 text-[#6aa8ff] font-medium">
                  Need help? Contact support
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeaturePill({
  icon,
  title,
  accent,
}: {
  icon: ReactNode;
  title: string;
  accent: "green" | "yellow";
}) {
  const borderClass =
    accent === "green" ? "border-[#16d66d]/70" : "border-[#ffc857]/80";

  const textClass = accent === "green" ? "text-[#16d66d]" : "text-[#ffc857]";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-12 w-12 rounded-full border ${borderClass} ${textClass} flex items-center justify-center shrink-0 bg-[#061124]/60`}
      >
        {icon}
      </div>

      <p className="text-sm text-white/85 font-semibold leading-tight">
        {title}
      </p>
    </div>
  );
}

function StatBlock({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  accent: "green" | "yellow";
}) {
  const colorClass = accent === "green" ? "text-[#16d66d]" : "text-[#ffc857]";

  return (
    <div className="relative px-5 py-6 text-center border-r border-white/10 last:border-r-0">
      <div className={`mx-auto mb-3 flex h-9 w-9 items-center justify-center ${colorClass}`}>
        {icon}
      </div>

      <div className="text-3xl font-black leading-none">{value}</div>

      <p className="text-white/65 font-medium mt-2">{label}</p>
    </div>
  );
}

function LoginTile({
  icon,
  title,
  text,
  color,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  color: "green" | "yellow" | "blue";
}) {
  const colorClass =
    color === "green"
      ? "text-[#16d66d]"
      : color === "yellow"
      ? "text-[#ffc857]"
      : "text-[#4b9cff]";

  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-5 text-center min-h-[150px] flex flex-col items-center justify-center">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center ${colorClass}`}>
        {icon}
      </div>

      <h3 className={`font-black text-lg mb-2 ${colorClass}`}>{title}</h3>

      <p className="text-white/62 text-sm leading-relaxed font-medium">
        {text}
      </p>
    </div>
  );
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {children}
    </svg>
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

function MoneyIcon() {
  return (
    <IconSvg>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M7 9v.01" />
      <path d="M17 15v.01" />
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

function LockIcon() {
  return (
    <IconSvg>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconSvg>
  );
}

function MailIcon() {
  return (
    <IconSvg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconSvg>
  );
}

function EyeIcon() {
  return (
    <IconSvg>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </IconSvg>
  );
}

function ShieldIcon() {
  return (
    <IconSvg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
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
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useState(() => {
    if (typeof window !== "undefined") {
      const safeNextPath =
        new URLSearchParams(window.location.search).get("next") || "/admin";
      setNextPath(safeNextPath);
    }
  });

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter your admin email and password.");
      return;
    }

    setSigningIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session?.access_token) {
      setSigningIn(false);
      setErrorMessage(error?.message || "Could not create admin session.");
      return;
    }

    const sessionResponse = await fetch("/api/admin-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken: data.session.access_token,
      }),
    });

    const sessionResult = (await sessionResponse.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!sessionResponse.ok) {
      await supabase.auth.signOut();
      setSigningIn(false);
      setErrorMessage(
        sessionResult?.error || "Could not create secure admin session."
      );
      return;
    }

    router.replace(nextPath);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020b18] text-white relative">
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="login-visible-paint-splatter pointer-events-none absolute left-[-105px] top-[90px] z-[1] h-[290px] w-[290px] rounded-full object-cover opacity-48 blur-[0.5px] saturate-150 contrast-125 sm:h-[360px] sm:w-[360px] lg:left-[-145px] lg:top-[110px] lg:h-[460px] lg:w-[460px]"
        aria-hidden="true"
      />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="login-visible-paint-splatter pointer-events-none absolute right-[-115px] bottom-[80px] z-[1] h-[300px] w-[300px] rounded-full object-cover opacity-44 blur-[0.5px] saturate-150 contrast-125 sm:h-[370px] sm:w-[370px] lg:right-[-155px] lg:bottom-[100px] lg:h-[470px] lg:w-[470px]"
        aria-hidden="true"
      />
      <div
        className="login-visible-paint-splatter pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_0%_25%,rgba(7,18,36,0.12),rgba(7,18,36,0.92)_34%,transparent_62%),radial-gradient(circle_at_100%_74%,rgba(7,18,36,0.08),rgba(7,18,36,0.9)_32%,transparent_62%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.16),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div
        className="admin-login-paint-accent pointer-events-none absolute left-[-180px] top-[90px] hidden h-[520px] w-[460px] -rotate-[12deg] bg-[url('/bragwall-paint-splatter.jpg')] bg-cover bg-center opacity-[0.24] blur-[1px] brightness-125 saturate-150 md:block"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 72%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 72%)",
        }}
        aria-hidden="true"
      />

      <div
        className="admin-login-paint-accent pointer-events-none absolute right-[-210px] bottom-[80px] hidden h-[560px] w-[500px] rotate-[14deg] bg-[url('/bragwall-paint-splatter.jpg')] bg-cover bg-center opacity-[0.20] blur-[1.5px] brightness-125 saturate-150 lg:block"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 74%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 74%)",
        }}
        aria-hidden="true"
      />

      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-5 py-6 md:px-8 md:py-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div>
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.32em] text-white/60">
              Admin Access
            </span>
          </div>

          <h1 className="mb-6 text-6xl font-black leading-[0.86] tracking-tight md:text-8xl">
            Enter the BragWall{" "}
            <span className="text-[#16d66d]">control room.</span>
          </h1>

          <div className="mb-6 h-1.5 w-24 rounded-full bg-[#ffc857]" />

          <p className="mb-8 max-w-xl text-xl leading-relaxed text-white/65">
            Sign in to upload artwork, run the live auction, control SOLD
            moments, and manage winner follow-up.
          </p>

          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            <MiniMetric label="Studio" value="Upload" />
            <MiniMetric label="Auction" value="Live" />
            <MiniMetric label="Winners" value="Track" />
          </div>

          <div className="mt-6 max-w-xl overflow-hidden rounded-[30px] border border-[#16d66d]/20 bg-white/[0.045] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="relative overflow-hidden rounded-[24px] bg-[#020b18]">
              <video
                src="/bragwall-intro.mp4"
                poster="/bragwall-hero-paint-hands.jpg"
                className="h-[220px] w-full bg-[#020b18] object-contain"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="BragWall intro video"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#020b18]/80 to-transparent" />
              <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-[#061124]/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/70 backdrop-blur-md">
                BragWall Intro
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-[20px] border border-white/10 bg-[#061124]/88 p-4 backdrop-blur-md">
                <p className="text-sm font-black text-[#16d66d]">
                  Live Auctions. Real Impact.
                </p>
                <p className="mt-1 text-sm font-bold text-white/78">
                  Turn young creativity into opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-[#16d66d]/10 blur-3xl" />
          <div className="absolute left-1/2 top-8 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#ffc857]/10 blur-3xl" />

          <div className="relative mx-auto max-w-xl rounded-[44px] border border-white/10 bg-white/5 p-4 shadow-[0_35px_100px_rgba(0,0,0,0.45)]">
            <div className="rounded-[38px] bg-white p-6 text-[#07152b] shadow-2xl md:p-8">
              <div className="mb-7 flex justify-center">
                <div className="rounded-[28px] border border-black/5 bg-white px-4 py-3 shadow-xl">
                  <BrandHeader center />
                </div>
              </div>

              <div className="mb-7 text-center">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-slate-400">
                  Secure Login
                </p>

                <h2 className="mb-3 text-4xl font-black leading-none md:text-5xl">
                  Welcome back.
                </h2>

                <p className="font-bold leading-relaxed text-slate-500">
                  Use your Supabase admin account to access the BragWall event
                  tools.
                </p>
              </div>

              <form onSubmit={login} className="space-y-5">
                <div>
                  <label className="mb-3 block text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                    Admin Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@email.com"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none focus:border-[#16b85d]"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none focus:border-[#16b85d]"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-[24px] border border-[#ffc6c1] bg-[#fff1ef] p-5 font-black leading-relaxed text-[#b42318]">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full rounded-[24px] bg-[#16d66d] px-8 py-5 text-xl font-black text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.25)] transition hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {signingIn ? "Signing In..." : "Sign In to Admin"}
                </button>
              </form>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <TrustItem icon="🔒" label="Secure" />
                <TrustItem icon="🔨" label="Live" />
                <TrustItem icon="🎨" label="Studio" />
              </div>

              <div className="mt-6 text-center">
                <a
                  href="/"
                  className="font-black text-slate-500 transition hover:text-[#07152b]"
                >
                  Back to homepage
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>

      <p className="text-lg font-black leading-tight text-white">{value}</p>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#fbf8f1] p-4 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <p className="text-xs font-black text-slate-600">{label}</p>
    </div>
  );
}
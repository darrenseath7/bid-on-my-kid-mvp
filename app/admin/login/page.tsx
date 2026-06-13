"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/admin");
        return;
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, [router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter your admin email and password.");
      return;
    }

    setSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSigningIn(false);
      setErrorMessage(error.message);
      return;
    }

    router.replace("/admin");
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center overflow-hidden">
        <BackgroundTexture />

        <div className="relative text-center">
          <LogoCard compact />
          <p className="text-white/65 font-black mt-5">
            Checking admin access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <BackgroundTexture />

      <section className="relative min-h-screen max-w-7xl mx-auto px-5 md:px-8 py-6 md:py-8 grid lg:grid-cols-[0.94fr_1.06fr] gap-8 lg:gap-14 items-center">
        <div className="relative z-10">
          <a href="/" className="inline-flex mb-10">
            <LogoWordmark />
          </a>

          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 md:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.38)] max-w-2xl">
            <div className="absolute inset-0 opacity-[0.18] bg-[url('/bragwall-login-paintbrush.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b18]/92 via-[#020b18]/72 to-[#020b18]/50" />

            <div className="relative">
              <div className="inline-flex items-center gap-3 rounded-full bg-[#16d66d]/12 border border-[#16d66d]/25 px-4 py-3 mb-6 shadow-[0_18px_55px_rgba(22,214,109,0.08)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
                <span className="uppercase tracking-[0.32em] text-[10px] font-black text-[#16d66d]">
                  Admin Access
                </span>
              </div>

              <h1 className="text-[56px] sm:text-[70px] md:text-[88px] font-black leading-[0.84] tracking-[-0.085em] mb-6 max-w-3xl">
                Enter the BragWall{" "}
                <span className="text-[#16d66d] drop-shadow-[0_0_24px_rgba(22,214,109,0.2)]">
                  control room.
                </span>
              </h1>

              <div className="w-24 h-1.5 bg-[#ffc857] rounded-full mb-6" />

              <p className="text-lg md:text-xl text-white/72 leading-relaxed max-w-xl mb-8 font-semibold">
                Sign in to upload artwork, run the live auction, control SOLD
                moments, and manage winner follow-up from one polished BragWall
                dashboard.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 max-w-xl">
                <MiniMetric label="Studio" value="Upload" />
                <MiniMetric label="Auction" value="Live" />
                <MiniMetric label="Winners" value="Track" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="absolute -inset-8 bg-[#16d66d]/10 blur-3xl rounded-full" />
          <div className="absolute left-1/2 top-8 -translate-x-1/2 w-[420px] h-[420px] bg-[#ffc857]/10 blur-3xl rounded-full" />

          <div className="relative max-w-xl mx-auto rounded-[44px] bg-white/[0.055] border border-white/10 p-4 shadow-[0_35px_100px_rgba(0,0,0,0.48)] overflow-hidden">
            <div className="absolute inset-0 opacity-[0.26] bg-[url('/bragwall-login-paintbrush.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-[#020b18]/68" />

            <div className="relative rounded-[38px] bg-[#fbf8f1] text-[#07152b] p-6 md:p-8 shadow-2xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-32 bg-[url('/bragwall-login-paintbrush.jpg')] bg-cover bg-center opacity-95" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/12 via-white/12 to-[#fbf8f1]" />
              <div className="absolute inset-x-0 top-24 h-20 bg-gradient-to-b from-transparent to-[#fbf8f1]" />

              <div className="relative flex justify-center pt-10 mb-7">
                <LogoCard />
              </div>

              <div className="relative text-center mb-7">
                <p className="uppercase tracking-[0.32em] text-xs text-slate-400 font-black mb-3">
                  Secure Login
                </p>

                <h2 className="text-4xl md:text-5xl font-black leading-none mb-3 tracking-[-0.045em]">
                  Welcome back.
                </h2>

                <p className="text-slate-500 font-bold leading-relaxed">
                  Use your Supabase admin account to access the BragWall event
                  tools.
                </p>
              </div>

              <form onSubmit={login} className="relative space-y-5">
                <div>
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                    Admin Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@email.com"
                    className="w-full rounded-2xl border border-slate-200 bg-[#eef4ff] px-5 py-5 text-lg font-medium text-[#07152b] outline-none focus:border-[#16b85d] focus:ring-4 focus:ring-[#16d66d]/15 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-2xl border border-slate-200 bg-[#eef4ff] px-5 py-5 text-lg font-medium text-[#07152b] outline-none focus:border-[#16b85d] focus:ring-4 focus:ring-[#16d66d]/15 transition"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-[24px] bg-[#fff1ef] border border-[#ffc6c1] text-[#b42318] p-5 font-black leading-relaxed">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full rounded-[24px] bg-[#16d66d] text-[#07152b] px-8 py-5 font-black text-xl shadow-[0_18px_45px_rgba(22,214,109,0.25)] hover:scale-[1.01] transition disabled:opacity-50 disabled:hover:scale-100"
                >
                  {signingIn ? "Signing In..." : "Sign In to Admin"}
                </button>
              </form>

              <div className="relative mt-6 grid grid-cols-3 gap-3">
                <TrustItem icon="🔒" label="Secure" />
                <TrustItem icon="🔨" label="Live" />
                <TrustItem icon="🎨" label="Studio" />
              </div>

              <div className="relative mt-6 text-center">
                <a
                  href="/"
                  className="text-slate-500 font-black hover:text-[#07152b] transition"
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

function BackgroundTexture() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.16),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="absolute inset-0 opacity-[0.11] bg-[url('/bragwall-login-paintbrush.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[#020b18]/76" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-3 pointer-events-none rounded-[32px] border border-[#c78b25]/20 shadow-[inset_0_0_70px_rgba(199,139,37,0.07)]" />
    </>
  );
}

function LogoWordmark() {
  return (
    <div className="inline-flex flex-col items-start">
      <img
        src="/bragwall-logo.png"
        alt="BragWall"
        className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_18px_42px_rgba(0,0,0,0.35)]"
      />

      <p className="mt-1 uppercase tracking-[0.48em] text-[9px] text-white/78 font-black">
        Young Art - Big Pride
      </p>
    </div>
  );
}

function LogoCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`inline-flex flex-col items-center bg-white rounded-[28px] px-5 py-4 shadow-xl border border-black/5 ${
        compact ? "mx-auto" : ""
      }`}
    >
      <img
        src="/bragwall-logo.png"
        alt="BragWall"
        className={`${compact ? "h-20" : "h-24"} w-auto object-contain`}
      />

      <p className="mt-1 text-center uppercase tracking-[0.32em] text-[8px] text-slate-400 font-black">
        Young Art - Big Pride
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 border border-white/10 p-4 shadow-xl backdrop-blur-xl">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/42 font-black mb-2">
        {label}
      </p>

      <p className="text-lg font-black text-white leading-tight">{value}</p>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-[22px] bg-white border border-black/5 p-4 text-center shadow-sm">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-black text-slate-600">{label}</p>
    </div>
  );
}

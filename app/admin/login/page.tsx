"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const safeNextPath = new URLSearchParams(window.location.search).get("next") || "/admin";
    setNextPath(safeNextPath);

    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace(nextPath);
        return;
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, [router]);

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

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-[28px] p-5 mb-5 shadow-2xl">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-24 w-auto object-contain"
            />
          </div>

          <p className="text-white/60 font-black">Checking admin access...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.16),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <section className="relative min-h-screen max-w-7xl mx-auto px-5 md:px-8 py-6 md:py-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-3 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
            <span className="uppercase tracking-[0.32em] text-[10px] font-black text-white/60">
              Admin Access
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-[0.86] tracking-tight mb-6">
            Enter the BragWall{" "}
            <span className="text-[#16d66d]">control room.</span>
          </h1>

          <div className="w-24 h-1.5 bg-[#ffc857] rounded-full mb-6" />

          <p className="text-xl text-white/65 leading-relaxed max-w-xl mb-8">
            Sign in to upload artwork, run the live auction, control SOLD
            moments, and manage winner follow-up.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 max-w-xl">
            <MiniMetric label="Studio" value="Upload" />
            <MiniMetric label="Auction" value="Live" />
            <MiniMetric label="Winners" value="Track" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-[#16d66d]/10 blur-3xl rounded-full" />
          <div className="absolute left-1/2 top-8 -translate-x-1/2 w-[420px] h-[420px] bg-[#ffc857]/10 blur-3xl rounded-full" />

          <div className="relative rounded-[44px] bg-white/5 border border-white/10 p-4 shadow-[0_35px_100px_rgba(0,0,0,0.45)] max-w-xl mx-auto">
            <div className="rounded-[38px] bg-white text-[#07152b] p-6 md:p-8 shadow-2xl">
              <div className="flex justify-center mb-7">
                <div className="bg-white rounded-[28px] px-4 py-3 shadow-xl border border-black/5">
                  <BrandHeader center />
                </div>
              </div>

              <div className="text-center mb-7">
                <p className="uppercase tracking-[0.32em] text-xs text-slate-400 font-black mb-3">
                  Secure Login
                </p>

                <h2 className="text-4xl md:text-5xl font-black leading-none mb-3">
                  Welcome back.
                </h2>

                <p className="text-slate-500 font-bold leading-relaxed">
                  Use your Supabase admin account to access the BragWall event
                  tools.
                </p>
              </div>

              <form onSubmit={login} className="space-y-5">
                <div>
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
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
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
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

              <div className="mt-6 grid grid-cols-3 gap-3">
                <TrustItem icon="🔒" label="Secure" />
                <TrustItem icon="🔨" label="Live" />
                <TrustItem icon="🎨" label="Studio" />
              </div>

              <div className="mt-6 text-center">
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 border border-white/10 p-4">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-lg font-black text-white leading-tight">{value}</p>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-[22px] bg-[#fbf8f1] border border-black/5 p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-black text-slate-600">{label}</p>
    </div>
  );
}
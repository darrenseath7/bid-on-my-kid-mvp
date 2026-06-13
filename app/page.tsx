"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      setAdminSessionActive(Boolean(data.session));
      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function login() {
    if (!email.trim()) {
      alert("Please enter your admin email address.");
      return;
    }

    if (!password.trim()) {
      alert("Please enter your password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.15),transparent_32%),radial-gradient(circle_at_50%_88%,rgba(11,99,206,0.18),transparent_38%),linear-gradient(180deg,#061124,#020b18_58%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:52px_52px]" />

      <section className="relative max-w-7xl mx-auto px-5 md:px-8 py-5 md:py-8">
        <header className="flex items-center justify-between gap-4 mb-8 md:mb-14">
          <div className="bg-white rounded-[26px] px-4 py-3 shadow-2xl">
            <BrandHeader />
          </div>

          <div className="hidden md:flex items-center gap-3 rounded-full bg-white/8 border border-white/10 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
            <span className="uppercase tracking-[0.32em] text-[10px] text-white/60 font-black">
              Young Art • Big Pride
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_430px] gap-7 lg:gap-10 items-start">
          <section className="min-w-0">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-3 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffc857] shadow-[0_0_14px_rgba(255,200,87,0.7)]" />
              <span className="uppercase tracking-[0.35em] text-[10px] font-black text-white/60">
                School fundraising, made live
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl xl:text-9xl font-black leading-[0.84] tracking-[-0.08em] mb-7 max-w-5xl">
              Turn school artwork into a{" "}
              <span className="text-[#16d66d]">live fundraising event.</span>
            </h1>

            <div className="w-24 h-1.5 bg-[#ffc857] rounded-full mb-7" />

            <p className="text-xl md:text-2xl text-white/68 leading-relaxed max-w-3xl mb-7 font-medium">
              BragWall helps schools upload student artwork, present each piece
              like a masterpiece, run a live mobile auction, and capture winner
              details for invoices, certificates, and collection.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mb-7">
              <HeroMetric label="Auction" value="Live mobile bidding" />
              <HeroMetric label="Artwork" value="Premium gallery view" />
              <HeroMetric label="Admin" value="One control room" />
            </div>

            <div className="rounded-[34px] bg-white/[0.055] border border-white/10 p-5 md:p-6 shadow-2xl max-w-4xl">
              <div className="grid md:grid-cols-4 gap-4">
                <HowItWorksStep
                  number="01"
                  title="Upload"
                  text="School adds artwork, child details, grade, and auction story."
                />
                <HowItWorksStep
                  number="02"
                  title="Preview"
                  text="Parents can view the gallery before and during the event."
                />
                <HowItWorksStep
                  number="03"
                  title="Bid"
                  text="The live room controls each artwork and parents bid by phone."
                />
                <HowItWorksStep
                  number="04"
                  title="Settle"
                  text="Winner email is captured for invoice and certificate follow-up."
                />
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <AdminAccessPanel
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              login={login}
              loading={loading}
              checkingSession={checkingSession}
              adminSessionActive={adminSessionActive}
            />

            <ParentAccessPanel />

            <AuctionPreviewCard />
          </aside>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="grid md:grid-cols-4 gap-5">
          <Feature
            icon="⚡"
            title="Real-time bidding"
            text="Parents bid live from their phones while the admin room controls the auction rhythm."
          />
          <Feature
            icon="🎤"
            title="Auction storytelling"
            text="Each artwork can get a playful, premium, child-specific auction intro."
          />
          <Feature
            icon="🖼️"
            title="Gallery preview"
            text="Parents can browse uploaded artwork before and during the live auction."
          />
          <Feature
            icon="🏆"
            title="Winner follow-up"
            text="Winners submit email details for invoice, certificate, and collection."
          />
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-5 md:px-8 pb-14">
        <div className="rounded-[42px] bg-[#fbf8f1] text-[#07152b] p-6 md:p-8 shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-[#0b63ce] font-black mb-4">
                Built for school auction nights
              </p>

              <h2 className="text-5xl md:text-7xl font-black leading-[0.9] mb-5">
                Less admin. More energy. Bigger pride.
              </h2>

              <p className="text-slate-600 text-xl leading-relaxed font-bold">
                The school gets one setup flow, one live control room, one
                parent auction link, and a clear record of sold artworks and
                winner details.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <ProcessCard
                title="School setup"
                text="Bank details, payment reference, bid increment, and collection instructions."
              />
              <ProcessCard
                title="Artwork setup"
                text="Upload artwork, child name, grade, auction story, and enhanced display image."
              />
              <ProcessCard
                title="Live room"
                text="Run bids, mark sold, move to next artwork, and watch the bidder count."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminAccessPanel({
  email,
  password,
  setEmail,
  setPassword,
  login,
  loading,
  checkingSession,
  adminSessionActive,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  login: () => void;
  loading: boolean;
  checkingSession: boolean;
  adminSessionActive: boolean;
}) {
  return (
    <section className="rounded-[34px] bg-white text-[#07152b] p-5 md:p-6 shadow-2xl border border-black/5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="uppercase tracking-[0.3em] text-[10px] text-slate-400 font-black mb-3">
            Admin Access
          </p>

          <h2 className="text-4xl font-black leading-none">
            Control room login.
          </h2>
        </div>

        <div className="w-14 h-14 rounded-[22px] bg-[#16d66d] text-[#07152b] flex items-center justify-center text-3xl shadow-xl">
          🔐
        </div>
      </div>

      {checkingSession ? (
        <div className="rounded-[24px] bg-[#f7f5f0] p-5 font-black text-slate-500">
          Checking admin session...
        </div>
      ) : adminSessionActive ? (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-[#eafff2] border border-[#16d66d]/30 p-5">
            <p className="uppercase tracking-[0.25em] text-[10px] text-[#16b85d] font-black mb-2">
              Signed in
            </p>

            <p className="text-xl font-black leading-snug">
              Your admin session is active.
            </p>
          </div>

          <a
            href="/admin"
            className="block w-full text-center bg-[#07152b] text-white rounded-2xl py-5 font-black text-xl shadow-xl hover:scale-[1.01] transition"
          >
            Open Admin Dashboard
          </a>
        </div>
      ) : (
        <div>
          <p className="text-slate-600 font-bold leading-relaxed mb-5">
            Log in to set up the school, upload artwork, run the live room, and
            review sales records.
          </p>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-bold outline-none mb-3 placeholder:text-slate-400"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                login();
              }
            }}
            placeholder="Password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-bold outline-none mb-4 placeholder:text-slate-400"
          />

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-[#16d66d] text-[#07152b] rounded-2xl py-5 font-black text-xl shadow-xl disabled:opacity-50 hover:scale-[1.01] transition"
          >
            {loading ? "Logging in..." : "Login to Admin"}
          </button>
        </div>
      )}
    </section>
  );
}

function ParentAccessPanel() {
  return (
    <section className="rounded-[34px] bg-[#061124]/92 border border-white/10 p-5 md:p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="uppercase tracking-[0.3em] text-[10px] text-[#ffc857] font-black mb-3">
            Parent Access
          </p>

          <h2 className="text-3xl font-black leading-none">
            Auction link for parents.
          </h2>
        </div>

        <div className="w-14 h-14 rounded-[22px] bg-[#ffc857] text-[#07152b] flex items-center justify-center text-3xl shadow-xl">
          📱
        </div>
      </div>

      <p className="text-white/62 font-bold leading-relaxed mb-4">
        Parents join from their phones using the auction link below.
      </p>

      <div className="rounded-[22px] bg-white text-[#07152b] p-4 mb-4">
        <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
          Parent auction URL
        </p>

        <p className="font-black text-xl break-all">/auction/demo</p>
      </div>

      <a
        href="/auction/demo"
        className="block text-center rounded-2xl bg-[#ffc857] text-[#07152b] px-5 py-4 font-black shadow-xl hover:scale-[1.01] transition"
      >
        Open Parent Auction
      </a>
    </section>
  );
}

function AuctionPreviewCard() {
  return (
    <section className="rounded-[34px] bg-[#061124]/92 border border-white/10 p-4 shadow-2xl overflow-hidden">
      <div className="rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.20),transparent_42%),#020b18] border border-[#ffc857]/25 p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="uppercase tracking-[0.3em] text-[9px] text-[#16d66d] font-black mb-2">
              Live Auction Preview
            </p>

            <h3 className="text-3xl font-black leading-none">
              Artwork goes live.
            </h3>
          </div>

          <div className="rounded-2xl bg-[#16d66d] text-[#07152b] px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-[0.18em] font-black">
              Status
            </p>
            <p className="font-black">Live</p>
          </div>
        </div>

        <div className="rounded-[28px] overflow-hidden bg-[#16110b] border border-white/10 shadow-xl">
          <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-4">
            <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[22px]">
              <div className="bg-[#f8f5ef] rounded-[16px] p-3">
                <div className="rounded-[12px] overflow-hidden bg-white h-[175px] flex items-center justify-center">
                  <div className="w-full h-full bg-[radial-gradient(circle_at_30%_30%,#ffd166,transparent_22%),radial-gradient(circle_at_72%_30%,#16d66d,transparent_24%),radial-gradient(circle_at_45%_75%,#0b63ce,transparent_28%),linear-gradient(135deg,#fff7dc,#ffe4ef)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="h-7 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl">
          <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
            Highest Bid
          </p>

          <p className="text-4xl font-black text-[#16d66d] leading-none">
            R500
          </p>
        </div>

        <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl text-right">
          <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
            Leading
          </p>

          <p className="text-2xl font-black leading-tight">Parent 👑</p>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 border border-white/10 p-4">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-lg font-black text-white leading-tight">{value}</p>
    </div>
  );
}

function HowItWorksStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[26px] bg-white/[0.055] border border-white/10 p-5">
      <p className="text-[#16d66d] text-3xl font-black mb-4">{number}</p>

      <h3 className="text-xl font-black mb-3">{title}</h3>

      <p className="text-white/55 text-sm font-bold leading-relaxed">{text}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[30px] bg-white/5 border border-white/10 p-6 shadow-xl">
      <div className="w-16 h-16 rounded-[24px] bg-white text-[#07152b] flex items-center justify-center text-3xl mb-5 shadow-xl">
        {icon}
      </div>

      <h3 className="uppercase tracking-[0.18em] text-sm font-black mb-3">
        {title}
      </h3>

      <p className="text-white/55 leading-relaxed font-bold">{text}</p>
    </div>
  );
}

function ProcessCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[30px] bg-white border border-black/5 p-6 shadow-xl">
      <div className="w-12 h-12 rounded-[18px] bg-[#16d66d] text-[#07152b] flex items-center justify-center font-black text-xl mb-5">
        ✓
      </div>

      <h3 className="text-3xl font-black mb-3">{title}</h3>

      <p className="text-slate-600 font-bold leading-relaxed">{text}</p>
    </div>
  );
}
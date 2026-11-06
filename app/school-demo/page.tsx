"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Phase = "entry" | "auction" | "sold" | "sent";
type BidStage = "open" | "once" | "twice";

const INCREMENT = 50;
const STARTING_PRICE = 100;

function DemoArtwork() {
  return (
    <svg viewBox="0 0 500 540" role="img" aria-label="A colourful sample painting of a giraffe under a rainbow" className="h-full max-h-full w-full object-contain">
      <defs>
        <linearGradient id="demoSky" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#83d8f5" />
          <stop offset="1" stopColor="#fff1b8" />
        </linearGradient>
        <linearGradient id="demoField" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#67d8a1" />
          <stop offset="1" stopColor="#15946b" />
        </linearGradient>
      </defs>
      <rect width="500" height="540" rx="12" fill="url(#demoSky)" />
      <path d="M30 255 C80 40 330 -5 470 215" fill="none" stroke="#ed659f" strokeWidth="30" opacity=".9" />
      <path d="M65 264 C120 82 310 58 435 221" fill="none" stroke="#ffc557" strokeWidth="27" opacity=".9" />
      <path d="M97 273 C140 130 305 112 400 226" fill="none" stroke="#826bdf" strokeWidth="26" opacity=".9" />
      <circle cx="400" cy="88" r="39" fill="#ffe166" />
      <path d="M0 382 Q100 332 210 378 T500 357 V540 H0Z" fill="url(#demoField)" />
      <path d="M0 435 Q185 383 302 445 T500 430 V540 H0Z" fill="#55ba72" />
      <g transform="translate(148 152) rotate(-4 120 160)">
        <path d="M91 214 Q73 325 82 372 M200 218 Q211 323 211 378" fill="none" stroke="#eea64b" strokeWidth="27" strokeLinecap="round" />
        <path d="M126 128 Q115 68 118 2 M163 127 Q161 63 160 3" fill="none" stroke="#eea64b" strokeWidth="24" strokeLinecap="round" />
        <path d="M62 137 Q128 102 212 135 L218 235 Q158 259 91 238Z" fill="#f2b358" stroke="#ad643c" strokeWidth="8" />
        <path d="M107 61 Q139 38 181 57 L186 116 Q160 147 115 122Z" fill="#f2b358" stroke="#ad643c" strokeWidth="7" />
        <path d="M121 56 L112 16 M163 54 L173 12" stroke="#ad643c" strokeWidth="8" strokeLinecap="round" />
        <circle cx="110" cy="14" r="9" fill="#ad643c" /><circle cx="175" cy="12" r="9" fill="#ad643c" />
        <circle cx="158" cy="80" r="6" fill="#283145" /><path d="M153 100 Q169 113 177 96" fill="none" stroke="#82473a" strokeWidth="4" />
        <path d="M93 158 L117 151 L116 170 L94 176 M156 176 L182 165 L190 187 L168 199 M105 217 L128 209 L139 227 L114 234" fill="#c47b40" />
        <path d="M218 151 Q264 124 255 191" fill="none" stroke="#ad643c" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g fill="#f97595"><circle cx="43" cy="449" r="13" /><circle cx="91" cy="479" r="10" /><circle cx="458" cy="474" r="12" /></g>
      <g fill="#ffe57b"><circle cx="67" cy="483" r="12" /><circle cx="412" cy="456" r="12" /></g>
      <text x="26" y="517" fill="#0c584d" fontSize="17" fontWeight="800" fontFamily="sans-serif">SAMPLE ARTWORK</text>
    </svg>
  );
}

export default function SchoolDemoPage() {
  const [phase, setPhase] = useState<Phase>("entry");
  const [stage, setStage] = useState<BidStage>("open");
  const [seconds, setSeconds] = useState(8);
  const [schoolName, setSchoolName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bid, setBid] = useState(0);
  const [leader, setLeader] = useState("");
  const [bidCount, setBidCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const challengerUsed = useRef(false);
  const challengerTimer = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "auction" || bid === 0) return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1);
      } else if (stage === "open") {
        setStage("once");
        setSeconds(5);
      } else if (stage === "once") {
        setStage("twice");
        setSeconds(5);
      } else {
        setPhase("sold");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [bid, phase, seconds, stage]);

  useEffect(() => () => {
    if (challengerTimer.current) window.clearTimeout(challengerTimer.current);
  }, []);

  function enterAuction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBid(0);
    setBidCount(0);
    setLeader("");
    setStage("open");
    setSeconds(8);
    challengerUsed.current = false;
    setPhase("auction");
  }

  function placeDemoBid() {
    if (phase !== "auction") return;
    setBid(current => current > 0 ? current + INCREMENT : STARTING_PRICE);
    setLeader(contactPerson.trim());
    setBidCount(current => current + 1);
    setStage("open");
    setSeconds(8);
    if (!challengerUsed.current) {
      challengerUsed.current = true;
      challengerTimer.current = window.setTimeout(() => {
        setBid(current => current + INCREMENT);
        setLeader("Demo parent");
        setBidCount(current => current + 1);
        setStage("open");
        setSeconds(8);
      }, 2300);
    }
  }

  async function requestCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.slice(0, 80) || "Direct link";
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: contactPerson.trim(),
          contactNumber: phone.trim(),
          email: email.trim(),
          schoolName: schoolName.trim(),
          message: `Request a call after the self-guided school auction demo. Demo total: R${bid}. Demo bids: ${bidCount}. Link reference: ${ref}. No real bids or payments were made.`,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "We could not send your request. Please try again.");
      setPhase("sent");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const nextBid = bid > 0 ? bid + INCREMENT : STARTING_PRICE;
  const school = schoolName.trim() || "your school";

  return (
    <main className={`relative bg-[#020b18] text-white ${phase === "auction" ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh] overflow-x-hidden"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(22,214,109,0.17),transparent_32%),radial-gradient(circle_at_83%_12%,rgba(255,200,87,0.12),transparent_32%),linear-gradient(180deg,#061124,#020b18)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/bragwall-paint-splatter.jpg')] bg-cover bg-center opacity-[0.12]" />
      <div className={`relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-6 ${phase === "auction" ? "h-[100dvh]" : "min-h-[100dvh]"}`}>
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black tracking-tight">Brag<span className="text-[#16d66d]">Wall</span><span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#ffc857]">Young Art. Big Pride.</span></Link>
          <span className="rounded-full border border-[#ffc857]/45 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#ffc857]">School demo</span>
        </header>

        {phase === "entry" ? (
          <div className="mx-auto my-auto grid w-full max-w-4xl items-center gap-8 py-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#16d66d]">A two-minute auction you can try yourself</p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">See what a school art auction feels like.</h1>
              <p className="mt-4 text-base text-white/75">Place a few sample bids, experience the countdown and SOLD moment, and see a sample fundraising total for your school.</p>
              <div className="mt-6 max-h-52 overflow-hidden rounded-2xl border border-[#ffc857]/35 bg-[#0a1730] md:max-h-80"><DemoArtwork /></div>
            </div>
            <form onSubmit={enterAuction} className="space-y-4 rounded-3xl border border-white/15 bg-[#07152b]/95 p-5 shadow-2xl sm:p-7">
              <h2 className="text-2xl font-black">Enter your school auction</h2>
              <label className="block text-sm font-bold">Your name<input required autoComplete="name" maxLength={120} value={contactPerson} onChange={event => setContactPerson(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
              <label className="block text-sm font-bold">School name<input required autoComplete="organization" maxLength={180} value={schoolName} onChange={event => setSchoolName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
              <label className="block text-sm font-bold">Email<input required type="email" autoComplete="email" maxLength={160} value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
              <button type="submit" className="w-full rounded-2xl bg-[#16d66d] px-6 py-4 text-lg font-black text-[#07152b]">Enter the demo auction →</button>
              <p className="text-xs leading-relaxed text-white/60">Your details stay in this browser unless you request a call at the end. This is a simulation: no real bids, purchases or school fundraising.</p>
            </form>
          </div>
        ) : null}

        {phase === "auction" ? (
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 pt-3 sm:py-6">
            <div className="shrink-0 text-center"><p className="text-xs font-black uppercase tracking-widest text-[#ffc857]">{school} · sample auction</p><h1 className="mt-1 text-xl font-black">The Rainbow Giraffe</h1></div>
            <div className="relative flex min-h-[190px] flex-1 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#e5ad62] bg-[#0a1730] p-2 shadow-[0_0_36px_rgba(241,143,65,0.15)]">
              <DemoArtwork />
              <span className="absolute left-3 top-3 rounded-full bg-[#ea8056] px-3 py-1 text-xs font-black uppercase">{bid === 0 ? "Bidding open" : stage === "open" ? "Live bidding" : stage === "once" ? "Going once" : "Going twice"}</span>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/15 bg-[#07152b] px-4 py-3">
              <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-white/60">Highest bid</p><p className="text-3xl font-black text-[#16d66d]">R{bid}</p></div><div className="text-right"><p className="text-xs font-bold uppercase tracking-wider text-white/60">Leading</p><p className="max-w-40 truncate text-base font-black">{leader || "No bids yet"}</p></div></div>
              <p aria-live="polite" className="mt-2 text-center text-sm font-bold text-[#ffc857]">{bid === 0 ? "Be the first to bid" : stage === "open" ? `Next bid R${nextBid} · ${seconds}s to Going Once` : stage === "once" ? `Going once · ${seconds}s` : `Going twice · ${seconds}s`}</p>
            </div>
            <button onClick={placeDemoBid} className="min-h-14 shrink-0 rounded-full bg-[#16d66d] px-5 py-3 text-xl font-black text-[#07152b]">Bid R{nextBid}</button>
            <p className="shrink-0 text-center text-[11px] text-white/55">Demo only · other parents and bids are simulated · no payment required</p>
          </div>
        ) : null}

        {phase === "sold" || phase === "sent" ? (
          <div className="mx-auto my-auto w-full max-w-xl py-7 text-center">
            <div aria-live="polite" className="mb-4 text-6xl font-black text-[#ffc857] sm:text-7xl">SOLD!</div>
            <h1 className="text-3xl font-black">Imagine this at {school}.</h1>
            <div className="mt-5 rounded-3xl border border-[#ffc857]/40 bg-[#07152b] p-6"><p className="text-xs font-black uppercase tracking-widest text-white/65">Sample total raised for your school</p><p className="mt-2 text-5xl font-black text-[#16d66d]">R{bid.toLocaleString()}</p><p className="mt-3 text-sm text-white/65">One sample artwork · {bidCount} demo bids · illustrative amount only</p></div>
            {phase === "sold" ? (
              <form onSubmit={requestCall} className="mt-5 space-y-3 rounded-3xl border border-white/15 bg-[#07152b] p-5 text-left">
                <h2 className="text-xl font-black">Want to run this for real? Request a call.</h2>
                <p className="text-sm text-white/70">We have your name, school and email. Add a phone number so we can call you.</p>
                <label className="block text-sm font-bold">Contact number<input required type="tel" autoComplete="tel" maxLength={80} value={phone} onChange={event => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
                <label className="flex items-start gap-2 text-xs text-white/70"><input required type="checkbox" className="mt-1 accent-[#16d66d]" />I agree that BragWall may contact me about a school auction.</label>
                <button disabled={submitting} type="submit" className="w-full rounded-2xl bg-[#16d66d] px-6 py-4 text-lg font-black text-[#07152b] disabled:opacity-55">{submitting ? "Sending…" : "Request a call"}</button>
                {error ? <p role="alert" className="text-sm font-bold text-red-300">{error}</p> : null}
              </form>
            ) : <div className="mt-5 rounded-3xl border border-[#16d66d]/45 bg-[#07152b] p-6 text-lg font-bold">Thanks! Your request has been sent. We’ll be in touch.</div>}
            <button onClick={() => { setBid(0); setBidCount(0); setLeader(""); setStage("open"); setSeconds(8); challengerUsed.current = false; setPhase("auction"); }} className="mt-5 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold">Try the auction again</button>
            <p className="mt-4 text-xs text-white/50">This was a simulation. No real money was raised and no artwork was sold.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

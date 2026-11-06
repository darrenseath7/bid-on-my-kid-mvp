"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Phase = "entry" | "intro" | "auction" | "sold" | "sent";
type BidStage = "open" | "once" | "twice";

const INCREMENT = 50;
const STARTING_PRICE = 100;

function DemoArtwork() {
  return (
    <img src="/school-demo/rainbow-giraffe.webp" alt="A hand-painted rainbow giraffe, sample artwork" className="h-full max-h-full w-full object-contain" />
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
  const [mcEnabled, setMcEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [bidFlash, setBidFlash] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef<Phase>("entry");
  const challengerUsed = useRef(false);
  const challengerTimer = useRef<number | null>(null);

  function playMc(clip: string, finished?: () => void) {
    audio.current?.pause();
    if (audio.current) audio.current.onended = null;
    audio.current = null;
    if (!mcEnabled) return;
    const player = new Audio(`/school-demo/mc-${clip}.mp3`);
    audio.current = player;
    player.onended = () => { audio.current = null; finished?.(); };
    void player.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  }

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== "intro") return;
    const timer = window.setTimeout(() => setPhase(current => current === "intro" ? "auction" : current), 14000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "auction" || !bid) return;
    if (stage === "once") playMc("going-once");
    if (stage === "twice") playMc("going-twice");
  }, [stage, phase]);

  useEffect(() => { if (phase === "sold") playMc("sold"); }, [phase]);

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
        phaseRef.current = "sold";
        setPhase("sold");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [bid, phase, seconds, stage]);

  useEffect(() => () => {
    if (challengerTimer.current !== null) window.clearTimeout(challengerTimer.current);
    audio.current?.pause();
  }, []);

  function enterAuction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBid(0);
    setBidCount(0);
    setLeader("");
    setStage("open");
    setSeconds(8);
    challengerUsed.current = false;
    phaseRef.current = "intro";
    setPhase("intro");
    // The form submit is a user gesture, so Safari permits sound here.
    playMc("intro", () => setPhase(current => current === "intro" ? "auction" : current));
  }

  function placeDemoBid() {
    if (phase !== "auction") return;
    setBid(current => current > 0 ? current + INCREMENT : STARTING_PRICE);
    setLeader(contactPerson.trim());
    setBidCount(current => current + 1);
    setStage("open");
    setSeconds(8);
    setBidFlash(current => current + 1);
    playMc(bid === 0 ? "first-bid" : "other-bid");
    if (!challengerUsed.current) {
      challengerUsed.current = true;
      challengerTimer.current = window.setTimeout(() => {
        if (phaseRef.current !== "auction") return;
        setBid(current => current + INCREMENT);
        setLeader("Demo parent");
        setBidCount(current => current + 1);
        setStage("open");
        setSeconds(8);
        setBidFlash(current => current + 1);
        playMc("other-bid");
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
  const onStage = phase === "auction" || phase === "intro";
  const mcLine = phase === "intro" ? "Up next, the Rainbow Giraffe! Big colours, bold stripes, and a smile that could light up the whole school. Our young artist has made something wonderful. Let's begin!" : !bid ? "The artwork is on stage. Who wants to start us off?" : stage === "once" ? "Going once! Does anyone want to give this giraffe a new home?" : stage === "twice" ? "Going twice! Last chance before the gavel falls!" : leader === "Another parent" ? "Ooh, another bid! This giraffe is getting some serious attention." : "A brilliant bid! Can anyone go one step higher?";

  return (
    <main className={`relative bg-[#020b18] text-white ${onStage ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh] overflow-x-hidden"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(22,214,109,0.17),transparent_32%),radial-gradient(circle_at_83%_12%,rgba(255,200,87,0.12),transparent_32%),linear-gradient(180deg,#061124,#020b18)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/bragwall-paint-splatter.jpg')] bg-cover bg-center opacity-[0.12]" />
      <div className={`relative mx-auto flex w-full max-w-7xl flex-col px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-6 ${onStage ? "h-[100dvh]" : "min-h-[100dvh]"}`}>
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-xl border border-white/15 bg-[#07152b]/90 px-4 py-2 text-3xl font-black tracking-tight shadow-lg sm:text-4xl">Brag<span className="text-[#16d66d]">Wall</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffc857] sm:text-xs">Young Art. Big Pride.</span></Link>
          <span className="rounded-full border border-[#ffc857]/45 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#ffc857]">School demo</span>
          {onStage ? <button type="button" onClick={() => { audio.current?.pause(); if (mcEnabled) { setMcEnabled(false); } else { setMcEnabled(true); const clip = phase === "intro" ? "intro" : stage === "once" ? "going-once" : stage === "twice" ? "going-twice" : "other-bid"; const player = new Audio(`/school-demo/mc-${clip}.mp3`); audio.current = player; void player.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true)); } }} className="rounded-full border border-white/30 px-2 py-1 text-xs font-bold">{mcEnabled ? "🔊 MC on" : "🔇 MC off"}</button> : null}
        </header>

        {phase === "entry" ? (
          <div className="mx-auto my-auto grid w-full max-w-6xl items-center gap-8 py-8 md:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#16d66d]">A two-minute auction you can try yourself</p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Hear the MC. Make a bid. Feel the moment.</h1>
              <p className="mt-4 text-base text-white/75">Experience a sample school art auction, from the MC introduction through Going Once, Going Twice and SOLD.</p>
              <div className="mt-6 h-72 overflow-hidden rounded-2xl border border-[#ffc857]/35 bg-[#0a1730] p-2 sm:h-[380px] lg:h-[440px]"><DemoArtwork /></div>
            </div>
            <form onSubmit={enterAuction} className="space-y-4 rounded-3xl border border-white/15 bg-[#07152b]/95 p-5 shadow-2xl sm:p-7">
              <h2 className="text-2xl font-black">Enter your school auction</h2>
              <label className="block text-sm font-bold">Your name<input required autoComplete="name" maxLength={120} value={contactPerson} onChange={event => setContactPerson(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
              <button type="submit" className="w-full rounded-2xl bg-[#16d66d] px-6 py-4 text-lg font-black text-[#07152b]">Enter the demo auction →</button>
              <p className="text-xs leading-relaxed text-white/60">Just your name to try it. Tap to hear the MC. If you request a call after SOLD, we will ask for your school and contact details then. This is a simulation with no real bids or purchases.</p>
            </form>
          </div>
        ) : null}

        {onStage ? (
          <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 sm:gap-3" aria-label="Sample live auction">
            <div className="shrink-0 text-center"><p className="truncate text-[10px] font-black uppercase tracking-[.18em] text-[#ffc857]">{school} · Sample auction</p><h1 className="text-lg font-black sm:text-2xl">The Rainbow Giraffe</h1></div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-5">
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#d6a44a] bg-[#08111e] shadow-[0_0_45px_rgba(235,124,49,.26)]">
                <DemoArtwork />
                <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-[#ea8056] px-3 py-1 text-[10px] font-black uppercase shadow-lg sm:text-xs">{phase === "intro" ? "AI MC INTRO" : bid === 0 ? "BIDDING OPEN" : "LIVE BIDDING"}</span>
                {phase === "auction" && bidFlash > 0 && stage === "open" ? <div key={bidFlash} aria-live="polite" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#061124]/20 [animation:demoBid_1.6s_ease-out_forwards]"><div className="rounded-3xl border-2 border-[#ffc857] bg-[#07152b]/95 px-8 py-4 text-center text-5xl font-black text-[#ffc857] shadow-2xl sm:text-7xl">R{bid}</div></div> : null}
                {phase === "auction" && bid > 0 && stage !== "open" ? <div key={stage} aria-live="assertive" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#050c1c]/65 px-4 [animation:demoReveal_.35s_ease-out]"><div className={`w-full max-w-xl rounded-3xl border-[3px] px-4 py-7 text-center shadow-[0_20px_70px_rgba(0,0,0,.6)] sm:py-10 ${stage === "once" ? "border-[#16d66d] bg-[#07152b]/95 text-[#16d66d]" : "border-[#ff8278] bg-[#911b17]/95 text-white"}`}><p className="text-[11px] font-black uppercase tracking-[.3em]">{stage === "once" ? "First call" : "Final call"}</p><p className="mt-2 text-4xl font-black uppercase leading-none sm:text-7xl">Going {stage === "once" ? "Once" : "Twice"}</p><p className="mt-3 text-2xl font-black sm:text-4xl">{seconds}s</p><p className="mt-2 text-sm font-bold">Next bid R{nextBid}</p></div></div> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 lg:w-[300px] lg:justify-end">
                <div className="rounded-2xl border border-[#ffc857]/50 bg-[#07152b]/95 px-3 py-2 shadow-xl sm:p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ffc857]">🎙 AI auction MC · prerecorded</p><p className="mt-1 text-xs font-bold leading-snug sm:text-sm">“{mcLine}”</p>{audioBlocked ? <p className="mt-1 text-xs text-[#ffc857]">Tap MC off, then MC on to enable sound.</p> : null}</div>
                <div className="rounded-2xl border border-white/20 bg-[#07152b] px-4 py-2 sm:py-3"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Highest bid</p><p className="text-3xl font-black text-[#16d66d] sm:text-4xl">R{bid}</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Leading</p><p className="max-w-32 truncate text-sm font-black sm:text-base">{leader || "No bids yet"}</p></div></div><p aria-live="polite" className="text-center text-xs font-bold text-[#ffc857]">{phase === "intro" ? "Bidding opens after the MC intro" : bid === 0 ? "Be the first to bid" : stage === "open" ? `Next R${nextBid} · ${seconds}s to Going Once` : `Next bid R${nextBid}`}</p></div>
                {phase === "intro" ? <button onClick={() => { audio.current?.pause(); setPhase("auction"); }} className="min-h-12 rounded-full border border-[#ffc857] px-4 py-2 text-sm font-black text-[#ffc857]">Skip introduction</button> : <button onClick={placeDemoBid} className="min-h-14 rounded-full bg-[#16d66d] px-5 py-3 text-xl font-black text-[#07152b]">Bid R{nextBid}</button>}
              </div>
            </div>
            <p className="shrink-0 text-center text-[10px] text-white/55">Demo only · another parent is simulated · no payment required</p>
          </section>
        ) : null}

        {phase === "sold" || phase === "sent" ? (
          <div className="mx-auto my-auto w-full max-w-xl py-7 text-center">
            <div aria-live="assertive" className="mb-3 text-6xl font-black text-[#ffc857] [animation:demoReveal_.35s_ease-out] sm:text-8xl">SOLD!</div>
            <p className="text-sm font-black text-white/75">🎙 AI MC: “Sold! What a brilliant moment for our young artist!”</p>
            <h1 className="text-3xl font-black">Imagine this at {school}.</h1>
            <div className="mt-5 rounded-3xl border border-[#ffc857]/40 bg-[#07152b] p-6"><p className="text-xs font-black uppercase tracking-widest text-white/65">Sample total raised for your school</p><p className="mt-2 text-5xl font-black text-[#16d66d]">R{bid.toLocaleString()}</p><p className="mt-3 text-sm text-white/65">One sample artwork · {bidCount} demo bids · illustrative amount only</p></div>
            {phase === "sold" ? (
              <form onSubmit={requestCall} className="mt-5 space-y-3 rounded-3xl border border-white/15 bg-[#07152b] p-5 text-left">
                <h2 className="text-xl font-black">Want to run this for real? Request a call.</h2>
                <p className="text-sm text-white/70">Enter your school and contact details if you would like us to call you. Your demo bids were only a simulation.</p>
                <label className="block text-sm font-bold">School name<input required autoComplete="organization" maxLength={180} value={schoolName} onChange={event => setSchoolName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
                <label className="block text-sm font-bold">Email<input required type="email" autoComplete="email" maxLength={160} value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
                <label className="block text-sm font-bold">Contact number<input required type="tel" autoComplete="tel" maxLength={80} value={phone} onChange={event => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none focus:border-[#16d66d]" /></label>
                <label className="flex items-start gap-2 text-xs text-white/70"><input required type="checkbox" className="mt-1 accent-[#16d66d]" />I agree that BragWall may contact me about a school auction.</label>
                <button disabled={submitting} type="submit" className="w-full rounded-2xl bg-[#16d66d] px-6 py-4 text-lg font-black text-[#07152b] disabled:opacity-55">{submitting ? "Sending…" : "Request a call"}</button>
                {error ? <p role="alert" className="text-sm font-bold text-red-300">{error}</p> : null}
              </form>
            ) : <div className="mt-5 rounded-3xl border border-[#16d66d]/45 bg-[#07152b] p-6 text-lg font-bold">Thanks! Your request has been sent. We’ll be in touch.</div>}
            <button onClick={() => { audio.current?.pause(); setBid(0); setBidCount(0); setLeader(""); setStage("open"); setSeconds(8); challengerUsed.current = false; setPhase("entry"); }} className="mt-5 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold">Try the auction again</button>
            <p className="mt-4 text-xs text-white/50">This was a simulation. No real money was raised and no artwork was sold.</p>
          </div>
        ) : null}
      </div>
      <style jsx global>{`@keyframes demoReveal_ { from { opacity:0; transform:scale(.78) } to { opacity:1; transform:scale(1) } } @keyframes demoBid { 0% {opacity:0; transform:scale(.8)} 18% {opacity:1; transform:scale(1)} 75% {opacity:1} 100% {opacity:0; transform:scale(1.12)} }`}</style>
    </main>
  );
}

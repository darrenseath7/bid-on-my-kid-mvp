"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type AuctionState = {
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  current_bid: number;
  leading_bidder: string;
  status: string;
  total_raised: number;
  status_deadline?: string | null;
  mc_commentary?: string | null;
  bid_pause_until?: string | null;
  next_bid_amount?: number | null;
  last_bid_at?: string | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
};

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
  created_at?: string | null;
};

const fallbackCommentary = [
  "The room is warming up beautifully. Someone is about to make a bold emotional decision.",
  "Bragging rights are officially on the table.",
  "Parents, grandparents, and competitive uncles — this is your moment.",
  "This masterpiece is looking dangerously collectible.",
];

const BID_STEP = 100;
const BID_PAUSE_SECONDS = 5;
const SILENCE_BEFORE_GOING_ONCE_SECONDS = 8;
const GOING_ONCE_SECONDS = 3;
const GOING_TWICE_SECONDS = 3;

const WELCOME_VOICE_TEXT =
  "Welcome to BragWall. Tonight we are turning school artwork into a live fundraising event with proud parents, dangerous grandparents, competitive uncles, and masterpieces that deserve prime fridge-door real estate.";

export default function DemoAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidderName, setBidderName] = useState("");
  const [joined, setJoined] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [pauseRemaining, setPauseRemaining] = useState(0);
  const [commentIndex, setCommentIndex] = useState(0);
  const [biddingNow, setBiddingNow] = useState(false);
  const [winnerEmail, setWinnerEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailSubmittedLocally, setEmailSubmittedLocally] = useState(false);
  const [welcomeVoiceLoading, setWelcomeVoiceLoading] = useState(false);
  const [welcomeVoicePlaying, setWelcomeVoicePlaying] = useState(false);

  const previousStatusRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);
  const autoActionKeyRef = useRef("");
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  const nextBidAmount = useMemo(() => {
    return Math.max((auction?.current_bid || 0) + BID_STEP, BID_STEP);
  }, [auction?.current_bid]);

  const isSold = auction?.status === "sold";
  const isWaiting = auction?.status === "waiting";
  const isUrgency =
    auction?.status === "going once" || auction?.status === "going twice";
  const isBidPaused = pauseRemaining > 0 && auction?.status === "open";

  const isWinningBidder =
    Boolean(auction?.leading_bidder) &&
    bidderName.trim().toLowerCase() ===
      auction?.leading_bidder.trim().toLowerCase();

  const winnerEmailAlreadySubmitted =
    Boolean(auction?.winner_email) || emailSubmittedLocally;

  const shouldShowSoldOverlay =
    isSold && !(isWinningBidder && winnerEmailAlreadySubmitted);

  const canBid = Boolean(
    auction &&
      joined &&
      !isSold &&
      !isWaiting &&
      !isBidPaused &&
      !biddingNow
  );

  function playSound(src: string) {
    if (!audioUnlockedRef.current) return;

    const audio = new Audio(src);
    audio.volume = 0.65;
    audio.play().catch(() => {});
  }

  function formatRelativeTime(value?: string | null) {
    if (!value) return "Just now";

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(value).getTime()) / 1000)
    );

    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  async function playWelcomeVoice() {
    if (welcomeVoiceLoading) return;

    audioUnlockedRef.current = true;
    setWelcomeVoiceLoading(true);

    try {
      if (welcomeAudioRef.current) {
        welcomeAudioRef.current.pause();
        welcomeAudioRef.current.currentTime = 0;
        welcomeAudioRef.current = null;
      }

      const response = await fetch("/api/welcome-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: WELCOME_VOICE_TEXT,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.error || "Could not generate welcome voice.");
        setWelcomeVoiceLoading(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      welcomeAudioRef.current = audio;
      audio.volume = 0.9;

      audio.onplay = () => {
        setWelcomeVoicePlaying(true);
      };

      audio.onended = () => {
        setWelcomeVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setWelcomeVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      setWelcomeVoiceLoading(false);
      await audio.play();
    } catch (error) {
      setWelcomeVoiceLoading(false);
      setWelcomeVoicePlaying(false);
      alert(
        error instanceof Error
          ? error.message
          : "Could not play welcome voice."
      );
    }
  }

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const auctionChannel = supabase
      .channel("bw-parent-polished-state")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: "auction_code=eq.demo",
        },
        (payload) => {
          const updated = payload.new as AuctionState;

          if (
            previousStatusRef.current &&
            previousStatusRef.current !== "sold" &&
            updated.status === "sold"
          ) {
            playSound("/sounds/gavel.mp3");
          }

          previousStatusRef.current = updated.status;
          setAuction(updated);
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bw-parent-polished-bids")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_bids",
          filter: "auction_code=eq.demo",
        },
        () => {
          playSound("/sounds/bid-ding.mp3");
          fetchBids();
        }
      )
      .subscribe();

    const bidsDeleteChannel = supabase
      .channel("bw-parent-polished-bids-delete")
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_bids",
          filter: "auction_code=eq.demo",
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(bidsDeleteChannel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!auction) return;

      const now = Date.now();

      if (auction.status_deadline) {
        const remaining = Math.max(
          0,
          Math.floor(
            (new Date(auction.status_deadline).getTime() - now) / 1000
          )
        );

        setSecondsRemaining(remaining);
      } else {
        setSecondsRemaining(0);
      }

      if (auction.bid_pause_until && auction.status === "open") {
        const remaining = Math.max(
          0,
          Math.ceil(
            (new Date(auction.bid_pause_until).getTime() - now) / 1000
          )
        );

        setPauseRemaining(remaining);
      } else {
        setPauseRemaining(0);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCommentIndex((current) => (current + 1) % fallbackCommentary.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      runAutoAuctionRhythm();
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  async function runAutoAuctionRhythm() {
    if (!auction) return;
    if (auction.current_bid <= 0) return;
    if (auction.status === "sold" || auction.status === "waiting") return;

    const now = Date.now();

    if (auction.status === "open") {
      const pauseUntil = auction.bid_pause_until
        ? new Date(auction.bid_pause_until).getTime()
        : 0;

      if (pauseUntil > now) return;

      const lastBidTime = auction.last_bid_at
        ? new Date(auction.last_bid_at).getTime()
        : 0;

      if (!lastBidTime) return;

      const silenceStartsAt = Math.max(lastBidTime, pauseUntil);
      const silenceSeconds = Math.floor((now - silenceStartsAt) / 1000);

      if (silenceSeconds >= SILENCE_BEFORE_GOING_ONCE_SECONDS) {
        const actionKey = `going-once-${auction.current_bid}-${auction.last_bid_at}`;

        if (autoActionKeyRef.current === actionKey) return;
        autoActionKeyRef.current = actionKey;

        const deadline = new Date(
          Date.now() + GOING_ONCE_SECONDS * 1000
        ).toISOString();

        await supabase
          .from("live_auction_state")
          .update({
            status: "going once",
            status_deadline: deadline,
            bid_pause_until: null,
            mc_commentary: `Going once at R${auction.current_bid.toLocaleString()} for ${auction.leading_bidder}. Last chance to beat this bid.`,
          })
          .eq("auction_code", "demo");

        await addActivity(
          `Going once at R${auction.current_bid.toLocaleString()}`
        );
      }

      return;
    }

    if (auction.status === "going once" && auction.status_deadline) {
      const deadline = new Date(auction.status_deadline).getTime();

      if (now >= deadline) {
        const actionKey = `going-twice-${auction.current_bid}-${auction.status_deadline}`;

        if (autoActionKeyRef.current === actionKey) return;
        autoActionKeyRef.current = actionKey;

        const newDeadline = new Date(
          Date.now() + GOING_TWICE_SECONDS * 1000
        ).toISOString();

        await supabase
          .from("live_auction_state")
          .update({
            status: "going twice",
            status_deadline: newDeadline,
            bid_pause_until: null,
            mc_commentary: `Going twice at R${auction.current_bid.toLocaleString()}. ${auction.leading_bidder} is seconds away from serious bragging rights.`,
          })
          .eq("auction_code", "demo");

        await addActivity(
          `Going twice at R${auction.current_bid.toLocaleString()}`
        );
      }

      return;
    }

    if (auction.status === "going twice" && auction.status_deadline) {
      const deadline = new Date(auction.status_deadline).getTime();

      if (now >= deadline) {
        const actionKey = `sold-${auction.current_bid}-${auction.status_deadline}`;

        if (autoActionKeyRef.current === actionKey) return;
        autoActionKeyRef.current = actionKey;

        await supabase
          .from("demo_artworks")
          .update({
            status: "sold",
            sold_amount: auction.current_bid,
            winning_bidder: auction.leading_bidder,
          })
          .eq("auction_code", "demo")
          .eq("status", "live");

        await supabase
          .from("live_auction_state")
          .update({
            status: "sold",
            status_deadline: null,
            bid_pause_until: null,
            mc_commentary: `Sold to ${auction.leading_bidder} for R${auction.current_bid.toLocaleString()}. A masterpiece has found its forever wall.`,
          })
          .eq("auction_code", "demo");

        await addActivity(
          `SOLD to ${auction.leading_bidder} for R${auction.current_bid.toLocaleString()}`
        );
      }
    }
  }

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    if (data) {
      setAuction(data);
      previousStatusRef.current = data.status;
    }
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", "demo")
      .order("amount", { ascending: false })
      .limit(6);

    setBids(data || []);
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: "demo",
      message,
    });
  }

  async function placeBid(amount: number) {
    if (!auction) return;

    if (auction.status === "sold") {
      alert("This artwork has already been sold.");
      return;
    }

    if (auction.status === "waiting") {
      alert("Auction has not started yet.");
      return;
    }

    if (isBidPaused) {
      return;
    }

    if (amount <= auction.current_bid) {
      alert("This bid is no longer high enough.");
      return;
    }

    setBiddingNow(true);

    const now = new Date();
    const pauseUntil = new Date(
      now.getTime() + BID_PAUSE_SECONDS * 1000
    ).toISOString();

    const nextAsk = amount + BID_STEP;

    const { error: bidError } = await supabase.from("live_bids").insert({
      auction_code: "demo",
      bidder_name: bidderName,
      amount,
    });

    if (bidError) {
      setBiddingNow(false);
      alert(bidError.message);
      return;
    }

    const message = `R${amount.toLocaleString()} received from ${bidderName}. Do I hear R${nextAsk.toLocaleString()}?`;

    const { error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder: bidderName,
        next_bid_amount: nextAsk,
        bid_pause_until: pauseUntil,
        last_bid_at: now.toISOString(),
        status: "open",
        status_deadline: null,
        mc_commentary: message,
        winner_email: null,
        winner_email_submitted_at: null,
      })
      .eq("auction_code", "demo");

    if (updateError) {
      setBiddingNow(false);
      alert(updateError.message);
      return;
    }

    await addActivity(`R${amount.toLocaleString()} received from ${bidderName}`);

    setBiddingNow(false);
  }

  async function submitWinnerEmail() {
    if (!auction) return;

    const cleanEmail = winnerEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!isWinningBidder) {
      alert("Only the winning bidder can submit the invoice email.");
      return;
    }

    setSubmittingEmail(true);

    const submittedAt = new Date().toISOString();

    const { error: stateError } = await supabase
      .from("live_auction_state")
      .update({
        winner_email: cleanEmail,
        winner_email_submitted_at: submittedAt,
      })
      .eq("auction_code", "demo");

    if (stateError) {
      setSubmittingEmail(false);
      alert(stateError.message);
      return;
    }

    const { error: artworkError } = await supabase
      .from("demo_artworks")
      .update({
        winner_email: cleanEmail,
        invoice_email_requested_at: submittedAt,
        certificate_email_requested_at: submittedAt,
      })
      .eq("auction_code", "demo")
      .eq("status", "sold")
      .eq("winning_bidder", auction.leading_bidder);

    if (artworkError) {
      setSubmittingEmail(false);
      alert(artworkError.message);
      return;
    }

    await addActivity(
      `${auction.leading_bidder} submitted email for invoice and certificate`
    );

    setEmailSubmittedLocally(true);
    setSubmittingEmail(false);
  }

  const dynamicArtworkStory =
    auction?.mc_commentary ||
    fallbackCommentary[commentIndex] ||
    "Parents, prepare yourselves. Tonight’s masterpieces may cause sudden generosity, family rivalry, and fridge-door upgrades.";

  if (!joined) {
    return (
      <main className="min-h-screen bg-[#fbf8f1] text-[#07152b] px-5 py-6">
        <div className="max-w-md mx-auto">
          <div className="mb-5 flex justify-center">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-24 w-auto object-contain"
            />
          </div>

          <div className="bg-white rounded-[34px] p-6 shadow-2xl border border-black/5">
            <p className="uppercase tracking-[0.35em] text-xs text-[#0b63ce] font-black mb-4">
              Welcome Parents
            </p>

            <h1 className="text-4xl font-black leading-none mb-4">
              Welcome to BragWall.
            </h1>

            <p className="text-slate-600 text-base leading-relaxed mb-5">
              Tonight we are turning school artwork into a live fundraising
              event — with proud parents, dangerous grandparents, competitive
              uncles, and masterpieces that deserve prime fridge-door real
              estate.
            </p>

            <button
              onClick={playWelcomeVoice}
              disabled={welcomeVoiceLoading}
              className="w-full bg-[#16d66d] text-[#07152b] rounded-[22px] py-4 font-black text-lg shadow-xl mb-5 disabled:opacity-50"
            >
              {welcomeVoiceLoading
                ? "Creating Welcome Voice..."
                : welcomeVoicePlaying
                ? "Playing Welcome..."
                : "▶ Play Welcome Voice"}
            </button>

            <div className="bg-[#f7f5f0] rounded-[24px] p-5 mb-5">
              <p className="uppercase tracking-[0.3em] text-[10px] text-slate-400 font-black mb-3">
                How Tonight Works
              </p>

              <div className="space-y-2 text-slate-600 font-bold leading-relaxed">
                <p>1. Enter your bidder name.</p>
                <p>2. Watch each artwork go live.</p>
                <p>3. Bid when the auction calls the next amount.</p>
                <p>
                  4. If you win, enter your email for your invoice and
                  certificate.
                </p>
              </div>
            </div>

            <div className="bg-[#07152b] text-white rounded-[24px] p-5 mb-5">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                Auction Sound
              </p>

              <p className="text-lg font-black leading-relaxed">
                You’ll hear a welcome voice, a bid ding when bids come in, and
                a gavel when an artwork is sold.
              </p>
            </div>

            <input
              value={bidderName}
              onChange={(event) => setBidderName(event.target.value)}
              placeholder="Your bidder name"
              className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg mb-4 outline-none"
            />

            <button
              onClick={() => {
                if (bidderName.trim()) {
                  audioUnlockedRef.current = true;
                  setJoined(true);
                }
              }}
              className="w-full bg-[#07152b] text-white rounded-2xl py-5 font-black text-xl shadow-xl"
            >
              JOIN AUCTION
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading auction...
      </main>
    );
  }

  if (isWaiting) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white px-5 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-[28px] p-5 mb-6 flex justify-center">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="bg-white/10 border border-white/10 rounded-[32px] p-7 shadow-2xl">
            <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
              Parent Waiting Room
            </p>

            <h1 className="text-5xl font-black leading-none mb-5">
              You’re in.
            </h1>

            <p className="text-white/70 text-lg leading-relaxed mb-6">
              Keep this page open. The first artwork will appear automatically
              when the auction starts.
            </p>

            <div className="bg-[#16d66d] text-[#07152b] rounded-[24px] p-5">
              <p className="uppercase tracking-[0.3em] text-xs font-black mb-3">
                Auction Ready
              </p>

              <p className="text-xl leading-relaxed font-black">
                Watch the screen. The live artwork will appear when the admin
                starts the auction.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b18] text-white pb-36">
      <div className="sticky top-0 z-40 bg-[#061124]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-2xl">
              ☰
            </div>

            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-14 w-auto object-contain bg-white rounded-xl px-2"
            />

            <div className="text-right shrink-0">
              <p className="text-[10px] text-white/50">Bidding as</p>

              <p className="font-black text-sm leading-tight">
                {bidderName}
                <span className="inline-block w-2 h-2 bg-[#16d66d] rounded-full ml-1" />
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {shouldShowSoldOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#020b18] z-50 overflow-auto px-5 py-7"
          >
            <div className="max-w-md mx-auto min-h-screen flex flex-col">
              <div className="text-center pt-4">
                <motion.div
                  initial={{ rotate: -40, y: -40, scale: 0.8 }}
                  animate={{ rotate: 0, y: 0, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="text-[82px] mb-1"
                >
                  🔨
                </motion.div>

                <motion.h1
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-[82px] font-black leading-none text-[#ffc857] drop-shadow-[0_0_28px_rgba(255,200,87,0.45)] mb-3"
                >
                  SOLD!
                </motion.h1>

                <p className="text-2xl font-black text-white mb-1">
                  Congratulations
                </p>

                <p className="text-5xl font-black text-[#ffc857] italic mb-6">
                  {auction.leading_bidder}!
                </p>

                <div className="border border-[#ffc857]/70 rounded-[30px] p-5 mb-6 shadow-[0_0_35px_rgba(255,200,87,0.2)]">
                  <p className="uppercase tracking-[0.3em] text-xs text-white/60 font-black mb-3">
                    Winning Bid
                  </p>

                  <div className="text-6xl font-black text-[#16d66d]">
                    R{auction.current_bid.toLocaleString()}
                  </div>

                  <p className="text-white/60 font-bold mt-2">
                    for {auction.child_name}’s masterpiece
                  </p>
                </div>
              </div>

              {isWinningBidder ? (
                <div className="bg-white text-[#07152b] rounded-[30px] p-6 shadow-2xl mb-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#fff5d6] flex items-center justify-center text-4xl shrink-0">
                      ✉️
                    </div>

                    <div>
                      <h2 className="text-3xl font-black leading-tight mb-2">
                        You’re the winner!
                      </h2>

                      <p className="text-slate-600 font-bold leading-relaxed">
                        Enter your email to receive your invoice, certificate,
                        and payment details.
                      </p>
                    </div>
                  </div>

                  <input
                    type="email"
                    value={winnerEmail}
                    onChange={(event) => setWinnerEmail(event.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-lg font-bold mb-4 outline-none"
                  />

                  <button
                    onClick={submitWinnerEmail}
                    disabled={submittingEmail}
                    className="w-full bg-[#16b85d] text-white rounded-2xl py-5 font-black text-lg disabled:opacity-50 shadow-lg"
                  >
                    {submittingEmail
                      ? "Saving Email..."
                      : "Send Invoice & Certificate"}
                  </button>

                  <p className="text-center text-slate-500 text-sm font-bold mt-4">
                    100% secure. We never share your details.
                  </p>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/10 rounded-[28px] p-6 mb-5">
                  <h3 className="text-2xl font-black mb-3">
                    Thanks for supporting the auction.
                  </h3>

                  <p className="text-white/70 text-lg font-bold leading-relaxed">
                    The winning parent will enter their email for invoice and
                    certificate details.
                  </p>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 mb-5">
                <p className="uppercase tracking-[0.3em] text-xs text-[#ffc857] font-black mb-4">
                  What happens next?
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <NextStep icon="✉️" title="Invoice" />
                  <NextStep icon="🏆" title="Certificate" />
                  <NextStep icon="🖼️" title="Collect" />
                </div>
              </div>

              <div className="bg-white text-[#07152b] rounded-[24px] p-5 text-center mt-auto">
                <p className="font-black text-lg">
                  Stay here for the next artwork 🎉
                </p>

                <p className="text-slate-500 font-bold">
                  The auction continues shortly...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-4 py-4">
        {isSold && isWinningBidder && winnerEmailAlreadySubmitted && (
          <div className="bg-[#16d66d] text-[#07152b] rounded-[26px] p-5 mb-4 shadow-xl">
            <p className="uppercase tracking-[0.3em] text-xs font-black mb-2">
              Email Submitted
            </p>

            <h2 className="text-2xl font-black mb-2">
              Thanks, {bidderName}.
            </h2>

            <p className="font-bold leading-relaxed">
              Your invoice and certificate will be emailed to you. Please stay
              here for the next artwork.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="uppercase tracking-[0.25em] text-[11px] text-[#16d66d] font-black mb-2">
              Live Auction
            </p>

            <h1 className="text-4xl font-black leading-tight">
              {auction.child_name} {auction.child_surname}
            </h1>

            <p className="text-white/60 text-base font-bold mt-1">
              {auction.grade}
            </p>
          </div>

          <div className="border border-[#16d66d]/60 text-[#16d66d] rounded-2xl px-4 py-3 text-center shrink-0">
            <p className="text-xs text-white/50">Artwork</p>
            <p className="font-black">Live</p>
          </div>
        </div>

        <div className="relative mb-4">
          <div className="rounded-[36px] overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.45)] bg-[#16110b]">
            <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-5 pt-8">
              <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[20px] shadow-[0_0_35px_rgba(255,200,87,0.18)]">
                <div className="bg-[#f8f5ef] rounded-[14px] p-3">
                  <div className="rounded-[10px] overflow-hidden bg-white">
                    {auction.artwork_url ? (
                      <img
                        src={auction.artwork_url}
                        alt="Artwork"
                        className="w-full max-h-[310px] object-contain"
                      />
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-slate-400 font-black">
                        Artwork loading...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-9 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
          </div>
        </div>

        <motion.div
          key={`${auction.current_bid}-${auction.leading_bidder}`}
          animate={{
            scale: [1, 1.015, 1],
          }}
          transition={{
            duration: 0.35,
          }}
          className="bg-white text-[#07152b] rounded-[26px] p-5 shadow-xl border border-black/5 mb-4"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="uppercase tracking-[0.22em] text-[10px] text-slate-400 font-black mb-2">
                Highest Bid
              </p>

              <h2 className="text-5xl font-black text-[#16d66d] leading-none">
                R{auction.current_bid.toLocaleString()}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">
                Leading
              </p>

              <p className="font-black text-xl max-w-[150px] truncate">
                {auction.leading_bidder}
                {auction.leading_bidder !== "No bids yet" ? " 👑" : ""}
              </p>
            </div>
          </div>
        </motion.div>

        {(isBidPaused || isUrgency) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[28px] p-5 mb-4 shadow-xl border ${
              isUrgency && auction.status === "going twice"
                ? "bg-[#ef2b20] text-white border-[#ff8d86]/40"
                : isUrgency
                ? "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
                : "bg-[#07152b] text-white border-[#16d66d]/50"
            }`}
          >
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="text-center border-r border-current/20 pr-4">
                <p className="uppercase tracking-[0.22em] text-[10px] font-black mb-2 opacity-70">
                  {isUrgency ? "Bidding closes in" : "Next bid opens in"}
                </p>

                <div className="text-5xl font-black leading-none">
                  {isUrgency ? `${secondsRemaining}s` : `${pauseRemaining}s`}
                </div>

                <p className="uppercase text-sm font-black mt-2">
                  {isUrgency
                    ? auction.status === "going once"
                      ? "Going Once"
                      : "Going Twice"
                    : "Hold tight"}
                </p>
              </div>

              <div className="text-center">
                <p className="uppercase tracking-[0.22em] text-[10px] font-black mb-2 opacity-70">
                  Next Bid
                </p>

                <div className="text-5xl font-black leading-none">
                  R{nextBidAmount.toLocaleString()}
                </div>

                <p className="text-sm font-bold mt-2">
                  Do I hear R{nextBidAmount.toLocaleString()}?
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          key={dynamicArtworkStory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#07152b] border border-white/10 text-white rounded-[26px] p-5 shadow-xl mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase tracking-[0.3em] text-[10px] text-[#16d66d] font-black">
              AI Auction MC
            </p>

            <div className="h-[18px] w-28 rounded-full bg-gradient-to-r from-[#16d66d] via-[#16d66d]/40 to-transparent opacity-80" />
          </div>

          <p className="text-lg leading-relaxed font-black">
            “{dynamicArtworkStory}”
          </p>
        </motion.div>

        <div className="bg-white/5 border border-white/10 rounded-[26px] overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <p className="uppercase tracking-[0.22em] text-xs text-white/60 font-black">
              Recent Bids
            </p>

            <p className="text-white/40 text-sm font-bold">
              {bids.length} shown
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {bids.length === 0 && (
              <div className="p-4 text-white/40 font-bold">
                No bids yet. Be brave. Start the bragging.
              </div>
            )}

            {bids.map((bid, index) => (
              <div
                key={bid.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black ${
                      index === 0
                        ? "bg-[#16d66d] text-[#07152b]"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {bid.bidder_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="font-black truncate">
                      {index === 0 ? "👑 " : ""}
                      {bid.bidder_name}
                    </p>

                    <p className="text-xs text-white/40 font-bold">
                      {formatRelativeTime(bid.created_at)}
                    </p>
                  </div>
                </div>

                <p className="text-[#16d66d] text-xl font-black">
                  R{bid.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isSold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#020b18]/95 backdrop-blur border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
          <div className="max-w-md mx-auto p-4">
            <motion.button
              whileTap={{ scale: canBid ? 0.97 : 1 }}
              onClick={() => placeBid(nextBidAmount)}
              disabled={!canBid}
              className="w-full rounded-[26px] py-5 font-black text-4xl shadow-[0_15px_35px_rgba(22,214,109,0.25)] transition text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canBid
                  ? "linear-gradient(135deg, #16d66d, #16b85d)"
                  : "#94a3b8",
              }}
            >
              {isBidPaused
                ? `Paused • ${pauseRemaining}s`
                : biddingNow
                ? "Placing Bid..."
                : `Bid R${nextBidAmount.toLocaleString()}`}
            </motion.button>

            <p
              className={`text-center font-bold mt-2 ${
                isUrgency ? "text-[#ff8d86]" : "text-white/40"
              }`}
            >
              {isUrgency
                ? "Last chance — tap to keep the artwork alive."
                : `Secure bidding • next ask R${nextBidAmount.toLocaleString()}`}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function NextStep({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div>
      <div className="w-16 h-16 rounded-full border border-[#ffc857] flex items-center justify-center text-3xl mx-auto mb-3">
        {icon}
      </div>

      <p className="font-black text-sm">{title}</p>
    </div>
  );
}
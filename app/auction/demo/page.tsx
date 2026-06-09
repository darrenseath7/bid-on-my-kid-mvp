"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BrandHeader from "@/components/BrandHeader";
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
  const autoActionKeyRef = useRef<string>("");
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  const nextBidAmount = useMemo(() => {
    return Math.max((auction?.current_bid || 0) + BID_STEP, BID_STEP);
  }, [auction?.current_bid]);

  const lastBid = bids[0];

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
      .channel("bw-parent-mobile-state")
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
      .channel("bw-parent-mobile-bids")
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
      .channel("bw-parent-mobile-bids-delete")
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
      .limit(1);

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
          <div className="mb-5">
            <BrandHeader center />
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
                <p>3. Bid when the MC calls the next amount.</p>
                <p>
                  4. If you win, enter your email for your invoice and
                  certificate.
                </p>
              </div>
            </div>

            <div className="bg-[#07152b] text-white rounded-[24px] p-5 mb-5">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                MC Message
              </p>

              <p className="text-lg font-black leading-relaxed">
                “{dynamicArtworkStory}”
              </p>
            </div>

            <input
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
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
          <div className="bg-white rounded-[28px] p-5 mb-6">
            <BrandHeader />
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
                MC Message
              </p>

              <p className="text-xl leading-relaxed font-black">
                “{dynamicArtworkStory}”
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b] pb-32">
      <div className="sticky top-0 z-40 bg-[#f7f5f0]/95 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <BrandHeader />

            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                Bidding As
              </p>

              <p className="font-black text-sm">{bidderName}</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {shouldShowSoldOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#07152b]/95 z-50 flex items-center justify-center px-5"
          >
            <div className="text-center text-white max-w-md w-full">
              <motion.div
                initial={{ rotate: -90, y: -120 }}
                animate={{ rotate: 0, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-[90px] mb-2"
              >
                🔨
              </motion.div>

              <h1 className="text-[70px] font-black leading-none text-[#ef2b20] mb-4">
                SOLD
              </h1>

              <h2 className="text-4xl font-black mb-4">
                {auction.leading_bidder}
              </h2>

              <div className="inline-block bg-[#16d66d] text-[#07152b] rounded-[24px] px-7 py-4 mb-6 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-xs mb-1">
                  Winning Bid
                </p>

                <div className="text-4xl font-black">
                  R{auction.current_bid.toLocaleString()}
                </div>
              </div>

              {isWinningBidder ? (
                <div className="bg-white text-[#07152b] rounded-[28px] p-5 text-left shadow-2xl">
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-3">
                    Winner Details
                  </p>

                  <h3 className="text-3xl font-black mb-3">
                    Congratulations, {bidderName}.
                  </h3>

                  <p className="text-slate-500 font-bold leading-relaxed mb-4">
                    Enter your email address to receive your invoice,
                    certificate, and payment details.
                  </p>

                  <input
                    type="email"
                    value={winnerEmail}
                    onChange={(e) => setWinnerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-lg font-bold mb-4 outline-none"
                  />

                  <button
                    onClick={submitWinnerEmail}
                    disabled={submittingEmail}
                    className="w-full bg-[#07152b] text-white rounded-2xl py-5 font-black text-lg disabled:opacity-50"
                  >
                    {submittingEmail
                      ? "Saving Email..."
                      : "Send Invoice & Certificate"}
                  </button>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/10 rounded-[24px] p-5">
                  <p className="text-white/75 text-lg font-bold leading-relaxed">
                    Thank you for supporting the auction. The winner will enter
                    their email for invoice and certificate details.
                  </p>
                </div>
              )}
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

        <div className="mb-3">
          <p className="uppercase tracking-[0.3em] text-[10px] text-[#0b63ce] font-black mb-2">
            Live Auction
          </p>

          <h1 className="text-3xl font-black leading-tight">
            {auction.child_name} {auction.child_surname}
          </h1>

          <p className="text-slate-500 text-sm font-bold mt-1">
            {auction.grade}
          </p>
        </div>

        {(isBidPaused || isUrgency) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[24px] p-4 mb-4 shadow-xl text-center ${
              isUrgency && auction.status === "going twice"
                ? "bg-[#ef2b20] text-white"
                : isUrgency
                ? "bg-[#16d66d] text-[#07152b]"
                : "bg-[#ffc107] text-[#07152b]"
            }`}
          >
            <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-2 opacity-70">
              {isUrgency ? "Bidding Closes Soon" : "MC Calling Next Bid"}
            </p>

            <div className="text-4xl font-black leading-none mb-2">
              {isUrgency ? `${secondsRemaining}s` : `${pauseRemaining}s`}
            </div>

            <div className="text-xl font-black">
              {isUrgency
                ? auction.status === "going once"
                  ? "GOING ONCE"
                  : "GOING TWICE"
                : `Do I hear R${nextBidAmount.toLocaleString()}?`}
            </div>
          </motion.div>
        )}

        <div className="relative mb-4">
          <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-3 rounded-[30px] shadow-[0_25px_70px_rgba(0,0,0,0.16)]">
            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-2 rounded-[24px]">
              <div className="bg-[#f8f5ef] rounded-[18px] p-3">
                <div className="rounded-[14px] overflow-hidden bg-white shadow-2xl">
                  <img
                    src={auction.artwork_url}
                    alt="Artwork"
                    className="w-full max-h-[320px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          key={auction.current_bid}
          animate={{
            scale: [1, 1.015, 1],
          }}
          transition={{
            duration: 0.35,
          }}
          className="bg-white rounded-[26px] p-5 shadow-xl border border-black/5 mb-4"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="uppercase tracking-[0.25em] text-[10px] text-slate-400 font-black mb-2">
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

              <p className="font-black text-lg max-w-[130px] truncate">
                {auction.leading_bidder}
              </p>
            </div>
          </div>

          {lastBid && (
            <p className="text-slate-400 text-sm font-bold mt-4">
              Last bid: R{lastBid.amount.toLocaleString()} from{" "}
              {lastBid.bidder_name}
            </p>
          )}
        </motion.div>

        <motion.div
          key={dynamicArtworkStory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#07152b] text-white rounded-[26px] p-5 shadow-xl"
        >
          <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-3">
            AI Auction MC
          </p>

          <p className="text-lg leading-relaxed font-black">
            “{dynamicArtworkStory}”
          </p>
        </motion.div>
      </div>

      {!isSold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto p-4">
            <motion.button
              whileTap={{ scale: canBid ? 0.97 : 1 }}
              onClick={() => placeBid(nextBidAmount)}
              disabled={!canBid}
              className="w-full rounded-[24px] py-5 font-black text-3xl shadow-lg transition text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canBid ? "#16b85d" : "#94a3b8",
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
                isUrgency ? "text-[#ef2b20]" : "text-slate-400"
              }`}
            >
              {isUrgency
                ? "Last chance — tap to keep the artwork alive."
                : `The MC is asking for R${nextBidAmount.toLocaleString()}.`}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
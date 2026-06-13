"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type AuctionState = {
  artwork_id?: string | null;
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
  mc_audio_url?: string | null;
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

type SchoolProfile = {
  auction_code: string;
  bid_increment?: number | null;
};

type Artwork = {
  id: string;
  auction_code: string;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  enhanced_artwork_url?: string | null;
  status?: string | null;
  sort_order?: number | null;
  sold_amount?: number | null;
  winning_bidder?: string | null;
  ai_intro?: string | null;
  ai_story?: string | null;
  description?: string | null;
  mc_audio_url?: string | null;
};

const AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const BID_PAUSE_SECONDS = 5;
const MC_INTRO_SECONDS = 120;
const SILENCE_BEFORE_GOING_ONCE_SECONDS = 8;
const GOING_ONCE_SECONDS = 3;
const GOING_TWICE_SECONDS = 3;

export default function DemoAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bidderName, setBidderName] = useState("");
  const [joined, setJoined] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [pauseRemaining, setPauseRemaining] = useState(0);
  const [biddingNow, setBiddingNow] = useState(false);
  const [winnerEmail, setWinnerEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailSubmittedArtworkKey, setEmailSubmittedArtworkKey] = useState<string | null>(null);
  const [welcomeVoiceLoading, setWelcomeVoiceLoading] = useState(false);
  const [welcomeVoicePlaying, setWelcomeVoicePlaying] = useState(false);
  const [bidIncrement, setBidIncrement] = useState(DEFAULT_BID_STEP);
  const [introAudioStatus, setIntroAudioStatus] = useState<
    "idle" | "loading" | "playing" | "finished" | "blocked" | "error" | "missing"
  >("idle");

  const previousStatusRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockElementRef = useRef<HTMLAudioElement | null>(null);
  const autoActionKeyRef = useRef("");
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playedIntroAudioKeyRef = useRef("");
  const previousArtworkKeyRef = useRef("");

  const uniqueBidderCount = useMemo(() => {
    const uniqueNames = new Set(
      bids
        .map((bid) => bid.bidder_name.trim().toLowerCase())
        .filter(Boolean)
    );

    return uniqueNames.size;
  }, [bids]);

  const bidderCounterLabel =
    uniqueBidderCount === 1
      ? "1 active bidder"
      : `${uniqueBidderCount} active bidders`;

  const nextBidAmount = useMemo(() => {
    return Math.max(
      Number(auction?.next_bid_amount || 0),
      Number(auction?.current_bid || 0) + bidIncrement,
      bidIncrement
    );
  }, [auction?.current_bid, auction?.next_bid_amount, bidIncrement]);

  const isSold = auction?.status === "sold";
  const isWaiting = auction?.status === "waiting";
  const isIntro = auction?.status === "intro";
  const isPreparingIntro =
    auction?.status === "preparing_intro" ||
    auction?.status === "preparing intro" ||
    auction?.status === "generating_intro" ||
    auction?.status === "generating intro";
  const isUrgency =
    auction?.status === "going once" || auction?.status === "going twice";
  const isAuctionOpenForBids = auction?.status === "open" || isUrgency;
  const isBidPaused = pauseRemaining > 0 && auction?.status === "open";

  const activeArtwork = useMemo(() => {
    if (!auction) return null;

    return (
      artworks.find(
        (artwork) =>
          (auction.artwork_id && artwork.id === auction.artwork_id) ||
          artwork.artwork_url === auction.artwork_url ||
          artwork.enhanced_artwork_url === auction.artwork_url
      ) ||
      artworks.find(
        (artwork) =>
          artwork.child_name === auction.child_name &&
          artwork.child_surname === auction.child_surname &&
          artwork.grade === auction.grade
      ) ||
      null
    );
  }, [auction, artworks]);

  const activeArtworkKey = useMemo(() => {
    if (!auction) return "";

    return (
      auction.artwork_id ||
      activeArtwork?.id ||
      auction.artwork_url ||
      [auction.child_name, auction.child_surname, auction.grade]
        .filter(Boolean)
        .join("-")
    );
  }, [
    auction?.artwork_id,
    auction?.artwork_url,
    auction?.child_name,
    auction?.child_surname,
    auction?.grade,
    activeArtwork?.id,
  ]);

  const mcIntroText = useMemo(() => {
    return getMcIntroText(auction, activeArtwork);
  }, [auction, activeArtwork]);

  const mcAudioUrl = useMemo(() => {
    return auction?.mc_audio_url || activeArtwork?.mc_audio_url || "";
  }, [auction?.mc_audio_url, activeArtwork?.mc_audio_url]);

  const introSecondsRemaining = isIntro
    ? secondsRemaining > 0
      ? secondsRemaining
      : MC_INTRO_SECONDS
    : 0;

  const isWinningBidder =
    Boolean(auction?.leading_bidder) &&
    bidderName.trim().toLowerCase() ===
      auction?.leading_bidder.trim().toLowerCase();

  const winnerEmailAlreadySubmitted =
    Boolean(auction?.winner_email) ||
    (Boolean(activeArtworkKey) && emailSubmittedArtworkKey === activeArtworkKey);

  const shouldShowSoldOverlay =
    isSold && !(isWinningBidder && winnerEmailAlreadySubmitted);

  const canBid = Boolean(
    auction &&
      joined &&
      isAuctionOpenForBids &&
      !isSold &&
      !isWaiting &&
      !isIntro &&
      !isPreparingIntro &&
      !isBidPaused &&
      !biddingNow
  );

  async function unlockBrowserAudio() {
    audioUnlockedRef.current = true;

    if (typeof window === "undefined") return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (AudioContextClass) {
        const audioContext =
          audioContextRef.current || new AudioContextClass();

        audioContextRef.current = audioContext;

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        gain.gain.value = 0.00001;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
      }
    } catch {
      // Some browsers still block audio until the next user gesture.
      // The large "Tap to play MC intro" button remains available as a fallback.
    }

    try {
      if (!audioUnlockElementRef.current) {
        const silentAudio = new Audio(
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA=="
        );

        silentAudio.preload = "auto";
        silentAudio.volume = 0.01;
        (silentAudio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        audioUnlockElementRef.current = silentAudio;
      }

      const silentAudio = audioUnlockElementRef.current;
      silentAudio.currentTime = 0;
      await silentAudio.play();
      silentAudio.pause();
      silentAudio.currentTime = 0;
    } catch {
      // iOS may still require the user to tap the actual MC intro button.
    }

    setSoundEnabled(true);
  }

  function stopIntroAudio() {
    if (introAudioRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
      introAudioRef.current = null;
    }
  }

  function playSound(src: string) {
    if (!audioUnlockedRef.current) return;

    const audio = new Audio(src);
    audio.volume = 0.65;
    audio.play().catch(() => {});
  }

  async function playWelcomeVoice() {
    if (welcomeVoiceLoading) return;

    await unlockBrowserAudio();
    setWelcomeVoiceLoading(true);

    try {
      if (welcomeAudioRef.current) {
        welcomeAudioRef.current.pause();
        welcomeAudioRef.current.currentTime = 0;
        welcomeAudioRef.current = null;
      }

      const audio = new Audio("/sounds/welcome-mc.wav");

      welcomeAudioRef.current = audio;
      audio.volume = 0.95;

      audio.onplay = () => {
        setWelcomeVoicePlaying(true);
        setWelcomeVoiceLoading(false);
      };

      audio.onended = () => {
        setWelcomeVoicePlaying(false);
      };

      audio.onerror = () => {
        setWelcomeVoiceLoading(false);
        setWelcomeVoicePlaying(false);
        alert("Could not play welcome voice.");
      };

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



  function handleJoinAuction() {
    const cleanBidderName = bidderName.trim();

    if (!cleanBidderName) {
      alert("Please enter your bidder name first.");
      return;
    }

    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }

    audioUnlockedRef.current = true;
    setSoundEnabled(true);
    setBidderName(cleanBidderName);
    setJoined(true);

    // Do not await this on iPhone. Some iOS browsers delay or reject the
    // audio unlock promise, and awaiting it can stop the parent from joining.
    void unlockBrowserAudio();
  }

  async function openBiddingAfterIntro(reason: "audio-finished" | "backup-timer") {
    if (!auction || auction.status !== "intro") return;

    const actionKey = `open-after-intro-${reason}-${
      auction.artwork_id || auction.artwork_url || "artwork"
    }-${auction.status_deadline || "deadline"}`;

    if (autoActionKeyRef.current === actionKey) return;
    autoActionKeyRef.current = actionKey;

    if (reason === "backup-timer") {
      stopIntroAudio();
    }

    await supabase
      .from("live_auction_state")
      .update({
        status: "open",
        status_deadline: null,
        bid_pause_until: null,
        mc_commentary: `Bidding is now open for ${auction.child_name}’s masterpiece. Opening bid is R${nextBidAmount.toLocaleString()}.`,
      })
      .eq("auction_code", AUCTION_CODE)
      .eq("status", "intro");

    await addActivity(
      `Bidding opened for ${auction.child_name} ${auction.child_surname}`
    );
  }

  async function playIntroAudio({ force = false }: { force?: boolean } = {}) {
    if (!auction || !isIntro) return;

    if (force) {
      await unlockBrowserAudio();
    }

    audioUnlockedRef.current = true;

    if (!mcAudioUrl) {
      setIntroAudioStatus("missing");
      return;
    }

    const introKey = [
      auction.artwork_id || auction.artwork_url || "artwork",
      auction.status_deadline || "deadline",
      mcAudioUrl,
    ].join("|");

    if (!force && playedIntroAudioKeyRef.current === introKey) return;

    playedIntroAudioKeyRef.current = introKey;
    stopIntroAudio();
    setIntroAudioStatus("loading");

    try {
      const audio = new Audio(mcAudioUrl);

      introAudioRef.current = audio;
      audio.preload = "auto";
      (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      audio.volume = 1;

      audio.onplay = () => {
        setIntroAudioStatus("playing");
      };

      audio.onended = () => {
        setIntroAudioStatus("finished");
        openBiddingAfterIntro("audio-finished");
      };

      audio.onerror = () => {
        setIntroAudioStatus("error");
      };

      await audio.play();
    } catch {
      playedIntroAudioKeyRef.current = "";
      setIntroAudioStatus("blocked");
    }
  }

  useEffect(() => {
    fetchAuction();
    fetchSchoolProfile();
    fetchBids();
    fetchArtworks();

    const auctionChannel = supabase
      .channel("bw-parent-premium-state-gallery-bidders-ai-mc")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: `auction_code=eq.${AUCTION_CODE}`,
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

    const schoolProfileChannel = supabase
      .channel("bw-parent-school-profile-bid-increment-gallery-bidders-ai-mc")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_school_profile",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchSchoolProfile();
        }
      )
      .subscribe();

    const artworksChannel = supabase
      .channel("bw-parent-gallery-artworks-bidders-ai-mc")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchArtworks();
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bw-parent-premium-bids-gallery-bidders-ai-mc")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          playSound("/sounds/bid-ding.mp3");
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      stopIntroAudio();
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(schoolProfileChannel);
      supabase.removeChannel(artworksChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, []);

  useEffect(() => {
    if (!joined) return;

    if (!isIntro) {
      stopIntroAudio();
      setIntroAudioStatus("idle");
      return;
    }

    playIntroAudio();
  }, [
    joined,
    isIntro,
    auction?.artwork_id,
    auction?.artwork_url,
    auction?.status_deadline,
    mcAudioUrl,
  ]);

  useEffect(() => {
    if (!activeArtworkKey) return;

    if (!previousArtworkKeyRef.current) {
      previousArtworkKeyRef.current = activeArtworkKey;
      return;
    }

    if (previousArtworkKeyRef.current !== activeArtworkKey) {
      previousArtworkKeyRef.current = activeArtworkKey;
      setEmailSubmittedArtworkKey(null);
      setWinnerEmail("");
      setSubmittingEmail(false);
    }
  }, [activeArtworkKey]);


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
      runAutoAuctionRhythm();
    }, 1000);

    return () => clearInterval(interval);
  }, [auction, introAudioStatus, mcAudioUrl, nextBidAmount]);

  async function runAutoAuctionRhythm() {
    if (!auction) return;

    const now = Date.now();

    if (auction.status === "intro" && auction.status_deadline) {
      const deadline = new Date(auction.status_deadline).getTime();

      if (now >= deadline) {
        const audioCanStillFinish =
          Boolean(mcAudioUrl) &&
          (introAudioStatus === "playing" || introAudioStatus === "loading");

        if (!audioCanStillFinish) {
          await openBiddingAfterIntro("backup-timer");
        }
      }

      return;
    }

    if (auction.current_bid <= 0) return;
    if (auction.status === "sold" || auction.status === "waiting") return;

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
          .eq("auction_code", AUCTION_CODE);

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
          .eq("auction_code", AUCTION_CODE);

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
          .eq("auction_code", AUCTION_CODE)
          .eq("status", "live");

        await supabase
          .from("live_auction_state")
          .update({
            status: "sold",
            status_deadline: null,
            bid_pause_until: null,
            mc_commentary: `Sold to ${auction.leading_bidder} for R${auction.current_bid.toLocaleString()}. A masterpiece has found its forever wall.`,
          })
          .eq("auction_code", AUCTION_CODE);

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
      .eq("auction_code", AUCTION_CODE)
      .single();

    if (data) {
      setAuction(data);
      previousStatusRef.current = data.status;
    }
  }

  async function fetchSchoolProfile() {
    const { data } = await supabase
      .from("demo_school_profile")
      .select("auction_code,bid_increment")
      .eq("auction_code", AUCTION_CODE)
      .maybeSingle();

    const profile = data as SchoolProfile | null;

    setBidIncrement(getSafeBidIncrement(profile?.bid_increment));
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .order("amount", { ascending: false })
      .limit(500);

    setBids(data || []);
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .order("sort_order", { ascending: true });

    setArtworks(data || []);
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: AUCTION_CODE,
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

    if (auction.status === "intro") {
      alert("The MC is introducing this artwork. Bidding will open in a moment.");
      return;
    }

    if (isPreparingIntro) {
      alert("The MC intro is being prepared. Bidding will open after the intro.");
      return;
    }

    if (!isAuctionOpenForBids) {
      alert("Bidding is not open yet.");
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

    const nextAsk = amount + bidIncrement;

    const { error: bidError } = await supabase.from("live_bids").insert({
      auction_code: AUCTION_CODE,
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
      .eq("auction_code", AUCTION_CODE);

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
      .eq("auction_code", AUCTION_CODE);

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
      .eq("auction_code", AUCTION_CODE)
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

    setEmailSubmittedArtworkKey(activeArtworkKey);
    setSubmittingEmail(false);
  }

  if (!joined) {
    return (
      <main className="min-h-[100svh] bg-[#020b18] text-white overflow-y-auto">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_62%,#010712)]" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
        />

        <div className="relative max-w-sm mx-auto min-h-[100svh] px-4 py-2.5 flex flex-col">
          <div className="bg-white rounded-[22px] px-4 py-2.5 mb-2.5 flex justify-center shadow-2xl shrink-0">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="bg-white text-[#07152b] rounded-[28px] p-3.5 shadow-2xl border border-black/5">
            <p className="uppercase tracking-[0.35em] text-[8px] text-[#0b63ce] font-black mb-1.5">
              Welcome Parents
            </p>

            <h1 className="text-3xl font-black leading-[0.9] mb-2.5">
              Welcome to BragWall.
            </h1>

            <p className="text-slate-600 text-[12px] leading-relaxed mb-2.5 font-bold">
              Tonight we are turning school artwork into a live fundraising
              event — with proud parents, dangerous grandparents, competitive
              uncles, and masterpieces that deserve prime fridge-door real
              estate.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <button
                onClick={playWelcomeVoice}
                disabled={welcomeVoiceLoading}
                className="bg-[#16d66d] text-[#07152b] rounded-[18px] py-3 px-3 font-black text-xs shadow-xl disabled:opacity-50"
              >
                {welcomeVoiceLoading
                  ? "Loading..."
                  : welcomeVoicePlaying
                  ? "Playing..."
                  : "▶ Welcome"}
              </button>

              <button
                onClick={() => setGalleryOpen(true)}
                className="bg-[#ffc857] text-[#07152b] rounded-[18px] py-3 px-3 font-black text-xs shadow-xl"
              >
                🖼️ Gallery
              </button>
            </div>

            <div className="bg-[#f7f5f0] rounded-[20px] p-3 mb-2.5">
              <p className="uppercase tracking-[0.3em] text-[7px] text-slate-400 font-black mb-1.5">
                How Tonight Works
              </p>

              <div className="space-y-1 text-slate-600 text-[11px] font-bold leading-relaxed">
                <p>1. Enter your bidder name.</p>
                <p>2. Browse the gallery before bidding.</p>
                <p>3. Watch each artwork go live.</p>
                <p>4. Winners enter email for invoice and certificate.</p>
              </div>
            </div>

            <input
              value={bidderName}
              onChange={(event) => setBidderName(event.target.value)}
              placeholder="Your bidder name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm mb-2.5 outline-none"
            />

            <button
              type="button"
              onTouchStart={() => {
                audioUnlockedRef.current = true;
              }}
              onMouseDown={() => {
                audioUnlockedRef.current = true;
              }}
              onClick={handleJoinAuction}
              className="relative z-10 w-full touch-manipulation select-none bg-[#07152b] text-white rounded-2xl py-4 font-black text-base shadow-xl active:scale-[0.98]"
            >
              JOIN AUCTION & ENABLE SOUND
            </button>

            <p className="text-center text-[10px] text-slate-500 font-black mt-2 leading-relaxed">
              On iPhone, make sure Silent Mode is off and volume is up. If iOS
              blocks audio, tap the MC voice button when it appears.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center">
        Loading auction...
      </main>
    );
  }

  if (isWaiting) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_62%,#010712)]" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
        />

        <div className="relative max-w-md mx-auto min-h-screen px-5 py-6 flex flex-col">
          <div className="bg-white rounded-[28px] p-5 mb-6 flex justify-center shadow-2xl">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="flex-1 bg-white/10 border border-white/10 rounded-[36px] p-7 shadow-2xl flex flex-col justify-center">
            <div className="w-20 h-20 rounded-[28px] bg-[#16d66d] text-[#07152b] flex items-center justify-center text-5xl mb-6 shadow-2xl">
              🎨
            </div>

            <p className="uppercase tracking-[0.35em] text-xs text-[#16d66d] font-black mb-4">
              Parent Waiting Room
            </p>

            <h1 className="text-6xl font-black leading-none mb-5">
              You’re in.
            </h1>

            <p className="text-white/70 text-lg leading-relaxed mb-4 font-bold">
              Keep this page open. The first artwork will appear automatically
              when the auction starts.
            </p>

            <div className="bg-[#16d66d] text-[#07152b] rounded-[22px] p-4 mb-6 shadow-xl">
              <p className="uppercase tracking-[0.25em] text-[9px] font-black mb-1 opacity-70">
                Sound
              </p>
              <p className="font-black">
                {soundEnabled ? "Sound enabled ✅" : "Tap Join Auction to enable sound"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGalleryOpen(true)}
                className="bg-[#ffc857] text-[#07152b] rounded-[24px] p-5 text-left shadow-xl"
              >
                <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-2 opacity-70">
                  Preview
                </p>

                <p className="text-xl font-black">Gallery</p>
              </button>

              <div className="bg-[#16d66d] text-[#07152b] rounded-[24px] p-5 shadow-xl">
                <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-2 opacity-70">
                  Auction
                </p>

                <p className="text-xl font-black">Ready</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] bg-[#020b18] text-white overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(22,214,109,0.14),transparent_28%),radial-gradient(circle_at_80%_5%,rgba(255,200,87,0.13),transparent_30%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />

      <GalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        artworks={artworks}
      />

      <div className="relative shrink-0 bg-[#061124]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setGalleryOpen(true)}
              className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-xl shrink-0 bg-white/5"
              aria-label="Open gallery"
            >
              🖼️
            </button>

            <div className="bg-white rounded-xl px-2 py-1">
              <img
                src="/bragwall-logo.png"
                alt="BragWall"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div className="text-right shrink-0 max-w-[105px]">
              <p className="text-[9px] text-white/50">Bidding as</p>

              <p className="font-black text-xs leading-tight truncate">
                {bidderName}
                <span className="inline-block w-2 h-2 bg-[#16d66d] rounded-full ml-1 shadow-[0_0_12px_rgba(22,214,109,0.9)]" />
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.18),transparent_42%),linear-gradient(180deg,#061124,#020b18)]" />

            <div className="relative max-w-md mx-auto min-h-screen flex flex-col">
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

      <div className="relative flex-1 min-h-0 max-w-md mx-auto w-full px-4 py-3 flex flex-col gap-2.5 overflow-hidden">
        {isSold && isWinningBidder && winnerEmailAlreadySubmitted && (
          <div className="shrink-0 bg-[#16d66d] text-[#07152b] rounded-[20px] p-3 shadow-xl">
            <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-1">
              Email Submitted
            </p>

            <p className="font-black text-sm leading-snug">
              Thanks, {bidderName}. Your invoice and certificate will be
              emailed to you.
            </p>
          </div>
        )}

        {isPreparingIntro && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 bg-[#07152b] text-white rounded-[24px] p-4 shadow-xl border border-[#ffc857]/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#ffc857] text-[#07152b] flex items-center justify-center text-3xl shrink-0 shadow-xl">
                ⏳
              </div>

              <div className="min-w-0 flex-1">
                <p className="uppercase tracking-[0.22em] text-[9px] font-black text-[#ffc857] mb-1.5">
                  Waiting for MC Intro
                </p>

                <p className="font-black text-sm leading-snug">
                  The artwork is on screen, but bidding has not opened yet.
                </p>

                <p className="text-xs font-bold text-white/65 mt-2 leading-relaxed">
                  The AI MC voice is being prepared. Once the intro starts and finishes,
                  the bid button will unlock automatically.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isIntro && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 bg-[#ffc857] text-[#07152b] rounded-[24px] p-4 shadow-xl border border-[#ffe9a6]"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#07152b] text-white flex items-center justify-center text-3xl shrink-0 shadow-xl">
                🎙️
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="uppercase tracking-[0.22em] text-[9px] font-black opacity-70">
                    AI MC Artwork Intro
                  </p>

                  <p className="bg-[#07152b] text-white rounded-full px-3 py-1 text-xs font-black shrink-0">
                    {introSecondsRemaining}s
                  </p>
                </div>

                <p className="font-black text-sm leading-snug">
                  {mcIntroText}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black opacity-70">
                    {getIntroAudioStatusLabel(introAudioStatus)}
                  </p>

                  {introAudioStatus === "finished" && mcAudioUrl && (
                    <button
                      onClick={() => playIntroAudio({ force: true })}
                      className="bg-[#07152b] text-white rounded-full px-3 py-1.5 text-[11px] font-black shrink-0"
                    >
                      Replay Voice
                    </button>
                  )}
                </div>

                {mcAudioUrl && introAudioStatus !== "playing" && (
                  <button
                    onClick={() => playIntroAudio({ force: true })}
                    className="mt-4 w-full bg-[#07152b] text-white rounded-[18px] px-4 py-4 text-base font-black shadow-xl border border-[#16d66d]/40 active:scale-[0.98] transition"
                  >
                    🔊 Tap to hear MC intro
                  </button>
                )}

                {mcAudioUrl && introAudioStatus === "playing" && (
                  <div className="mt-4 w-full bg-[#16d66d] text-[#07152b] rounded-[18px] px-4 py-4 text-base font-black shadow-xl text-center">
                    🔊 MC voice playing now
                  </div>
                )}

                <p className="text-[10px] font-black mt-2 opacity-60">
                  AI-generated voice. Bidding opens after the full voice intro finishes.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="uppercase tracking-[0.25em] text-[10px] text-[#16d66d] font-black mb-1">
              Live Auction
            </p>

            <h1 className="text-3xl font-black leading-none truncate">
              {auction.child_name} {auction.child_surname}
            </h1>

            <p className="text-white/55 text-sm font-bold mt-1 truncate">
              {auction.grade}
            </p>

            <p className="text-[#ffc857] text-xs font-black mt-1">
              {bidderCounterLabel}
            </p>
          </div>

          <button
            onClick={() => setGalleryOpen(true)}
            className="border border-[#16d66d]/60 text-[#16d66d] rounded-2xl px-3 py-2 text-center shrink-0 bg-white/5"
          >
            <p className="text-[10px] text-white/50">View</p>
            <p className="font-black text-sm">Gallery</p>
          </button>
        </div>

        <div className="shrink-0 rounded-[30px] overflow-hidden border border-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.45)] bg-[#16110b]">
          <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-3">
            <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[20px] shadow-[0_0_35px_rgba(255,200,87,0.18)]">
              <div className="bg-[#f8f5ef] rounded-[14px] p-2.5">
                <div className="rounded-[10px] overflow-hidden bg-white h-[27dvh] min-h-[180px] max-h-[255px] flex items-center justify-center">
                  {auction.artwork_url ? (
                    <img
                      src={auction.artwork_url}
                      alt="Artwork"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-black">
                      Artwork loading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-6 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
        </div>

        <motion.div
          key={`${auction.current_bid}-${auction.leading_bidder}`}
          animate={{
            scale: [1, 1.012, 1],
          }}
          transition={{
            duration: 0.35,
          }}
          className="shrink-0 bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl border border-black/5"
        >
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <p className="uppercase tracking-[0.22em] text-[9px] text-slate-400 font-black mb-1">
                Highest Bid
              </p>

              <h2 className="text-4xl font-black text-[#16d66d] leading-none">
                R{auction.current_bid.toLocaleString()}
              </h2>
            </div>

            <div className="text-right min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">
                Leading
              </p>

              <p className="font-black text-lg truncate">
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
            className={`shrink-0 rounded-[22px] p-3 shadow-xl border ${
              isUrgency && auction.status === "going twice"
                ? "bg-[#ef2b20] text-white border-[#ff8d86]/40"
                : isUrgency
                ? "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
                : "bg-[#07152b] text-white border-[#16d66d]/50"
            }`}
          >
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="text-center border-r border-current/20 pr-3">
                <p className="uppercase tracking-[0.18em] text-[9px] font-black mb-1 opacity-70">
                  {isUrgency ? "Closes in" : "Next bid opens"}
                </p>

                <div className="text-3xl font-black leading-none">
                  {isUrgency ? `${secondsRemaining}s` : `${pauseRemaining}s`}
                </div>

                <p className="uppercase text-xs font-black mt-1">
                  {isUrgency
                    ? auction.status === "going once"
                      ? "Going Once"
                      : "Going Twice"
                    : "Hold tight"}
                </p>
              </div>

              <div className="text-center">
                <p className="uppercase tracking-[0.18em] text-[9px] font-black mb-1 opacity-70">
                  Next Bid
                </p>

                <div className="text-3xl font-black leading-none">
                  R{nextBidAmount.toLocaleString()}
                </div>

                <p className="text-xs font-bold mt-1">
                  Do I hear R{nextBidAmount.toLocaleString()}?
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex-1 min-h-0" />
      </div>

      {!isSold && (
        <div className="relative shrink-0 bg-[#020b18]/95 backdrop-blur border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
          <div className="max-w-md mx-auto p-3">
            <motion.button
              whileTap={{ scale: canBid ? 0.97 : 1 }}
              onClick={() => placeBid(nextBidAmount)}
              disabled={!canBid}
              className="w-full rounded-[24px] py-4 font-black text-3xl shadow-[0_15px_35px_rgba(22,214,109,0.25)] transition text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canBid
                  ? "linear-gradient(135deg, #16d66d, #16b85d)"
                  : "#94a3b8",
              }}
            >
              {isPreparingIntro
                ? "Waiting for MC"
                : isIntro
                ? `MC Intro • ${introSecondsRemaining}s`
                : isBidPaused
                ? `Paused • ${pauseRemaining}s`
                : biddingNow
                ? "Placing Bid..."
                : canBid
                ? `Bid R${nextBidAmount.toLocaleString()}`
                : "Bidding Not Open"}
            </motion.button>

            <p
              className={`text-center font-bold mt-1 text-xs ${
                isUrgency ? "text-[#ff8d86]" : "text-white/40"
              }`}
            >
              {isPreparingIntro
                ? "The artwork is ready. Please wait for the MC intro before bidding opens."
                : isIntro
                ? introAudioStatus === "playing"
                  ? "The AI MC is presenting the artwork. Bidding opens when the full intro finishes."
                  : "If sound does not start automatically on iPhone, tap the MC voice button above."
                : isUrgency
                ? "Last chance — tap to keep the artwork alive."
                : canBid
                ? `Secure bidding • ${bidderCounterLabel} • bid step R${bidIncrement.toLocaleString()}`
                : "Bidding will open after the MC introduces the artwork."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function getSafeBidIncrement(value?: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BID_STEP;
  }

  return Math.round(parsed);
}

function getArtworkDisplayUrl(artwork: Artwork) {
  return artwork.enhanced_artwork_url || artwork.artwork_url || "";
}

function getMcIntroText(auction: AuctionState | null, artwork: Artwork | null) {
  const story =
    auction?.mc_commentary?.trim() ||
    artwork?.ai_story?.trim() ||
    artwork?.ai_intro?.trim() ||
    artwork?.description?.trim();

  if (story) return story;

  if (!auction) {
    return "The MC is getting the next masterpiece ready for the room.";
  }

  const childName = [auction.child_name, auction.child_surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return `Ladies and gentlemen, our next BragWall masterpiece is by ${
    childName || "one of our young artists"
  } from ${auction.grade || "the school"}. Take a good look — bidding opens in a moment.`;
}

function getIntroAudioStatusLabel(
  status:
    | "idle"
    | "loading"
    | "playing"
    | "finished"
    | "blocked"
    | "error"
    | "missing"
) {
  if (status === "loading") return "Loading AI MC voice...";
  if (status === "playing") return "AI MC voice playing now.";
  if (status === "finished") return "AI MC intro complete.";
  if (status === "blocked")
    return "iPhone blocked autoplay. Tap the button below to play.";
  if (status === "error") return "Voice could not play. Tap the button below.";
  if (status === "missing") return "No AI voice clip found for this artwork.";

  return "AI MC voice ready.";
}

function GalleryModal({
  open,
  onClose,
  artworks,
}: {
  open: boolean;
  onClose: () => void;
  artworks: Artwork[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-[#020b18] text-white overflow-y-auto"
        >
          <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(22,214,109,0.16),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(255,200,87,0.14),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />

          <div className="relative max-w-md mx-auto min-h-screen px-4 py-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="uppercase tracking-[0.35em] text-[10px] text-[#16d66d] font-black mb-2">
                  BragWall Gallery
                </p>

                <h2 className="text-4xl font-black leading-none">
                  Artwork Preview
                </h2>
              </div>

              <button
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-white text-[#07152b] font-black text-xl shadow-xl"
                aria-label="Close gallery"
              >
                ×
              </button>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-[28px] p-4 mb-4">
              <p className="text-white/70 font-bold leading-relaxed">
                Browse the artworks before and during the auction. The live
                artwork will still update automatically in the bidding screen.
              </p>
            </div>

            <div className="space-y-4 pb-8">
              {artworks.length === 0 && (
                <div className="bg-white text-[#07152b] rounded-[28px] p-6 shadow-2xl">
                  <p className="text-4xl mb-4">🖼️</p>
                  <h3 className="text-3xl font-black mb-3">
                    No artwork loaded yet.
                  </h3>
                  <p className="text-slate-600 font-bold leading-relaxed">
                    The gallery will fill up as the school uploads artwork.
                  </p>
                </div>
              )}

              {artworks.map((artwork) => {
                const imageUrl = getArtworkDisplayUrl(artwork);
                const isSoldArtwork = artwork.status === "sold";
                const isLiveArtwork = artwork.status === "live";

                return (
                  <div
                    key={artwork.id}
                    className="rounded-[30px] bg-white text-[#07152b] p-4 shadow-2xl"
                  >
                    <div className="rounded-[24px] overflow-hidden bg-[#f8f5ef] border border-black/5 mb-4">
                      <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2">
                        <div className="bg-white rounded-[18px] h-[260px] flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${artwork.child_name} ${artwork.child_surname}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-slate-400 font-black">
                              Artwork loading...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
                          {artwork.grade || "Grade"}
                        </p>

                        <h3 className="text-2xl font-black leading-tight truncate">
                          {artwork.child_name} {artwork.child_surname}
                        </h3>
                      </div>

                      <div
                        className={`rounded-2xl px-3 py-2 text-center shrink-0 ${
                          isSoldArtwork
                            ? "bg-[#ffc857] text-[#07152b]"
                            : isLiveArtwork
                            ? "bg-[#16d66d] text-[#07152b]"
                            : "bg-[#07152b] text-white"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.18em] font-black opacity-70">
                          Status
                        </p>

                        <p className="font-black text-sm">
                          {isSoldArtwork
                            ? "Sold"
                            : isLiveArtwork
                            ? "Live"
                            : "Upcoming"}
                        </p>
                      </div>
                    </div>

                    {isSoldArtwork && (
                      <div className="mt-4 rounded-[22px] bg-[#07152b] text-white p-4">
                        <p className="uppercase tracking-[0.25em] text-[9px] text-white/45 font-black mb-2">
                          Winning Bid
                        </p>

                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black truncate">
                            {artwork.winning_bidder || "Winner"}
                          </p>

                          <p className="text-[#16d66d] text-2xl font-black">
                            R{Number(artwork.sold_amount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NextStep({ icon, title }: { icon: string; title: string }) {
  return (
    <div>
      <div className="w-16 h-16 rounded-full border border-[#ffc857] flex items-center justify-center text-3xl mx-auto mb-3">
        {icon}
      </div>

      <p className="font-black text-sm">{title}</p>
    </div>
  );
}
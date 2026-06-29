"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  winner_email_submitted?: boolean | null;
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

type AuctionFlash = {
  id: number;
  kind: "bid" | "once" | "twice" | "sold";
  title: string;
  subtitle: string;
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

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const MC_INTRO_SECONDS = 60;
const BIDDING_START_BUFFER_SECONDS = 15;

function normalizeAuctionCode(value?: string) {
  const normalized = String(value || DEFAULT_AUCTION_CODE)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_AUCTION_CODE;
}

type DemoAuctionPageProps = {
  initialAuctionCode?: string;
};

export default function DemoAuctionPage({
  initialAuctionCode = DEFAULT_AUCTION_CODE,
}: DemoAuctionPageProps = {}) {
  const auctionCode = useMemo(
    () => normalizeAuctionCode(initialAuctionCode),
    [initialAuctionCode]
  );
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
  const [auctionFlash, setAuctionFlash] = useState<AuctionFlash | null>(null);
  const [bidPulseKey, setBidPulseKey] = useState(0);

  const previousStatusRef = useRef<string | null>(null);
  const previousBidRef = useRef<number | null>(null);
  const previousBidderRef = useRef<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockElementRef = useRef<HTMLAudioElement | null>(null);
  const autoActionKeyRef = useRef("");
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const playedIntroAudioKeyRef = useRef("");
  const previousArtworkKeyRef = useRef("");
  const lastManualIntroTapRef = useRef(0);
  const lastManualWelcomeTapRef = useRef(0);
  const activeAuctionCodeRef = useRef(auctionCode);

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

  const soldArtworksForTotal = useMemo(() => {
    return artworks.filter((artwork) => {
      const soldAmount = Number(artwork.sold_amount || 0);
      const status = String(artwork.status || "").toLowerCase();

      return status === "sold" || soldAmount > 0;
    });
  }, [artworks]);

  const soldArtworksTotal = useMemo(() => {
    return soldArtworksForTotal.reduce(
      (total, artwork) => total + Number(artwork.sold_amount || 0),
      0
    );
  }, [soldArtworksForTotal]);

  const parentRaisedTotal = Math.max(
    Number(auction?.total_raised || 0),
    soldArtworksTotal
  );

  const parentSoldCount = soldArtworksForTotal.length;

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
  const isStartingSoon = auction?.status === "starting_soon";
  const isNextArtworkCountdown = auction?.status === "next_artwork_countdown";
  const isAuctionComplete = auction?.status === "complete";
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
    Boolean(auction?.winner_email_submitted) ||
    Boolean(auction?.winner_email) ||
    (Boolean(activeArtworkKey) && emailSubmittedArtworkKey === activeArtworkKey);

  const shouldShowSoldOverlay =
    isSold && !(isWinningBidder && winnerEmailAlreadySubmitted);

  const shouldShowArtworkSoldBanner = isSold;

  const canBid = Boolean(
    auction &&
      joined &&
      isAuctionOpenForBids &&
      !isSold &&
      !isWaiting &&
      !isIntro &&
      !isPreparingIntro &&
      !isNextArtworkCountdown &&
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

    audioUnlockedRef.current = true;
    setSoundEnabled(true);
    setWelcomeVoiceLoading(true);

    try {
      if (welcomeAudioRef.current) {
        welcomeAudioRef.current.pause();
        welcomeAudioRef.current.currentTime = 0;
        welcomeAudioRef.current = null;
      }

      const audio = new Audio(`/api/welcome-voice?auctionCode=${encodeURIComponent(auctionCode)}`);

      welcomeAudioRef.current = audio;
      audio.preload = "auto";
      (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
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
        alert("Could not play welcome voice. Please check the ElevenLabs voice setup, then try again.");
      };

      // Important for iPhone and mobile browsers: call audio.play() directly
      // from the user's tap. Do not await audio unlocking before this.
      const playPromise = audio.play();
      void unlockBrowserAudio();

      await playPromise;
    } catch {
      setWelcomeVoiceLoading(false);
      setWelcomeVoicePlaying(false);
      alert("Phone browser blocked the welcome message. Tap Play Welcome Message again.");
    }
  }

  function handleWelcomeVoiceTap(event?: { preventDefault: () => void }) {
    event?.preventDefault();

    const now = Date.now();

    if (now - lastManualWelcomeTapRef.current < 700) return;

    lastManualWelcomeTapRef.current = now;
    void playWelcomeVoice();
  }

  async function triggerParentAutoStart() {
    try {
      const response = await fetch("/api/auction-rhythm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionCode,
          autoStartFromParent: true,
        }),
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.auction) {
        setAuction(result.auction);
      }
    } catch (error) {
      console.error("Could not auto-start AI MC intro from parent join:", error);
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

    // Parent join should start the automated rhythm. If an artwork is staged
    // but the MC intro has not started yet, the public rhythm endpoint moves
    // it into AI MC intro mode. Admin Start Intro remains as the fallback.
    void triggerParentAutoStart();
  }

  async function openBiddingAfterIntro(reason: "audio-finished" | "backup-timer") {
    if (!auction || auction.status !== "intro") return;

    const actionKey = `open-after-intro-${reason}-${
      auction.artwork_id || auction.artwork_url || "artwork"
    }-${auction.status_deadline || "deadline"}`;

    if (autoActionKeyRef.current === actionKey) return;
    autoActionKeyRef.current = actionKey;

    // Do not stop the MC audio here. A backup timer can fire on a slower
    // browser or another joined device while the voice is still playing. The
    // bid button stays locked during the countdown, so it is safer to let the
    // audio finish naturally.

    try {
      const response = await fetch("/api/open-bidding-after-intro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionCode: auctionCode,
          reason,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not open bidding.");
      }

      if (result?.auction) {
        setAuction(result.auction);
      }
    } catch (error) {
      autoActionKeyRef.current = "";
      console.error("Could not open bidding after MC intro:", error);
    }
  }

  async function playIntroAudio({ force = false }: { force?: boolean } = {}) {
    if (!auction || !isIntro) return;

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

      // Important for iPhone Safari: audio.play() must be called immediately
      // from the tap event. Do not await any unlock/resume promise before this.
      const playPromise = audio.play();

      if (force) {
        void unlockBrowserAudio();
      }

      await playPromise;
    } catch {
      playedIntroAudioKeyRef.current = "";
      setIntroAudioStatus("blocked");
    }
  }

  function handleManualIntroAudioTap(event?: { preventDefault: () => void }) {
    event?.preventDefault();

    const now = Date.now();

    if (now - lastManualIntroTapRef.current < 700) return;

    lastManualIntroTapRef.current = now;
    void playIntroAudio({ force: true });
  }

  function showAuctionFlash(nextFlash: Omit<AuctionFlash, "id">) {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }

    setAuctionFlash({
      ...nextFlash,
      id: Date.now(),
    });

    flashTimeoutRef.current = setTimeout(() => {
      setAuctionFlash(null);
      flashTimeoutRef.current = null;
    }, nextFlash.kind === "sold" ? 2300 : 1700);
  }

  useEffect(() => {
    if (!auction || !joined) return;

    const currentBid = Number(auction.current_bid || 0);
    const currentBidder = auction.leading_bidder || "";
    const currentStatus = auction.status || "";
    const previousBid = previousBidRef.current;
    const previousStatus = previousStatusRef.current;

    if (previousBid === null) {
      previousBidRef.current = currentBid;
      previousBidderRef.current = currentBidder;
      previousStatusRef.current = currentStatus;
      return;
    }

    if (currentBid > previousBid && currentBidder && currentBidder !== "No bids yet") {
      setBidPulseKey((value) => value + 1);
      showAuctionFlash({
        kind: "bid",
        title: `R${currentBid.toLocaleString()} received`,
        subtitle: `from ${currentBidder}`,
      });
    } else if (currentStatus !== previousStatus) {
      if (currentStatus === "going once") {
        showAuctionFlash({
          kind: "once",
          title: "Going once",
          subtitle: currentBidder && currentBidder !== "No bids yet"
            ? `R${currentBid.toLocaleString()} to ${currentBidder}`
            : "Last chance to bid",
        });
      }

      if (currentStatus === "going twice") {
        showAuctionFlash({
          kind: "twice",
          title: "Going twice",
          subtitle: "Last chance!",
        });
      }

      if (currentStatus === "sold") {
        playSound("/sounds/gavel.mp3");

        showAuctionFlash({
          kind: "sold",
          title: "Sold!",
          subtitle: currentBidder && currentBidder !== "No bids yet"
            ? `${currentBidder} wins for R${currentBid.toLocaleString()}`
            : `Winning bid R${currentBid.toLocaleString()}`,
        });
      }
    }

    previousBidRef.current = currentBid;
    previousBidderRef.current = currentBidder;
    previousStatusRef.current = currentStatus;
  }, [
    auction?.current_bid,
    auction?.leading_bidder,
    auction?.status,
    auction?.artwork_id,
    auction?.artwork_url,
    joined,
  ]);

  useEffect(() => {
    previousStatusRef.current = null;
    previousBidRef.current = null;
    previousBidderRef.current = null;
    previousArtworkKeyRef.current = "";
    playedIntroAudioKeyRef.current = "";
    autoActionKeyRef.current = "";
    activeAuctionCodeRef.current = auctionCode;
    setAuctionFlash(null);
    setBidPulseKey(0);
    setAuction(null);
    setBids([]);
    setArtworks([]);
    setBidIncrement(DEFAULT_BID_STEP);
    setSecondsRemaining(0);
    setPauseRemaining(0);

    fetchPublicAuctionState(auctionCode);

    // Public parent page now reads only from our safe Next.js API.
    // The browser no longer selects raw Supabase auction tables directly.
    const refreshInterval = window.setInterval(() => {
      fetchPublicAuctionState(auctionCode);
    }, 1500);

    return () => {
      stopIntroAudio();
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      window.clearInterval(refreshInterval);
    };
  }, [auctionCode]);

  useEffect(() => {
    if (!joined) return;

    if (!isIntro) {
      // Do not abruptly cut off the MC voice if this browser or another device
      // has moved the auction into the 15-second countdown. Let the audio
      // finish naturally while the bid button remains locked.
      if (isStartingSoon && introAudioRef.current) {
        return;
      }

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
  }, [auction, introAudioStatus, mcAudioUrl, nextBidAmount, auctionCode]);

  async function runSecureAuctionRhythmOnce() {
    if (!auction) return;

    try {
      const response = await fetch("/api/auction-rhythm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionCode: auctionCode,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not run auction rhythm.");
      }

      if (result?.auction) {
        setAuction(result.auction);
      }

      if (result?.action && result.action !== "none") {
        autoActionKeyRef.current = `${auction.status}|${result.action}|${Date.now()}`;
      }
    } catch (error) {
      console.error("Could not run secure auction rhythm:", error);
    }
  }

  async function runAutoAuctionRhythm() {
    if (!auction) return;

    const now = Date.now();

    if ((auction.status === "intro" || auction.status === "starting_soon" || auction.status === "next_artwork_countdown") && auction.status_deadline) {
      const deadline = new Date(auction.status_deadline).getTime();

      if (now >= deadline) {
        if (auction.status === "intro") {
          const audioStillNeedsTime =
            Boolean(mcAudioUrl) &&
            (introAudioStatus === "idle" ||
              introAudioStatus === "loading" ||
              introAudioStatus === "playing");

          // Only use the backup timer when there is no audio or the phone has
          // definitely blocked/failed it. This prevents the MC voice being cut
          // off just before the end on slower mobile browsers.
          if (!audioStillNeedsTime) {
            await openBiddingAfterIntro("backup-timer");
          }
        } else {
          await runSecureAuctionRhythmOnce();
        }
      }

      return;
    }

    if (auction.status === "sold") {
      if (auction.winner_email_submitted && auction.status_deadline) {
        await runSecureAuctionRhythmOnce();
      }
      return;
    }

    if (auction.current_bid <= 0) return;
    if (auction.status === "waiting" || auction.status === "complete") return;
    if (!isAuctionOpenForBids) return;

    const rhythmKey = [
      auction.status,
      auction.current_bid,
      auction.last_bid_at || "no-last-bid",
      auction.status_deadline || "no-deadline",
      auction.bid_pause_until || "no-pause",
    ].join("|");

    await runSecureAuctionRhythmOnce();
  }

  async function fetchPublicAuctionState(targetAuctionCode = auctionCode) {
    try {
      const response = await fetch(
        `/api/public-auction-state?auctionCode=${encodeURIComponent(targetAuctionCode)}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not load auction.");
      }

      if (activeAuctionCodeRef.current !== targetAuctionCode) return;

      const resultAuctionCode = normalizeAuctionCode(result?.auctionCode);

      if (resultAuctionCode !== targetAuctionCode) return;

      const nextAuction = (result?.auction || null) as AuctionState | null;
      const nextProfile = (result?.profile || null) as SchoolProfile | null;
      const nextArtworks = Array.isArray(result?.artworks)
        ? result.artworks.filter((artwork: Artwork) => artwork.auction_code === targetAuctionCode)
        : [];

      setAuction(nextAuction);
      setBids(Array.isArray(result?.bids) ? result.bids : []);
      setArtworks(nextArtworks);
      setBidIncrement(getSafeBidIncrement(nextProfile?.bid_increment));

    } catch (error) {
      console.error("Could not load public auction state:", error);
    }
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
      alert("The MC is introducing this artwork. Bidding opens after the intro and countdown.");
      return;
    }

    if (auction.status === "starting_soon") {
      alert("Bidding starts when the countdown reaches zero.");
      return;
    }

    if (auction.status === "next_artwork_countdown") {
      alert("The next artwork is loading. The AI MC starts after the countdown.");
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

    const cleanBidderName = bidderName.trim();

    if (!cleanBidderName) {
      alert("Please enter your bidder name first.");
      return;
    }

    if (amount <= auction.current_bid) {
      alert("This bid is no longer high enough.");
      return;
    }

    setBiddingNow(true);

    try {
      const response = await fetch("/api/place-bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionCode: auctionCode,
          bidderName: cleanBidderName,
          amount,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not place bid.");
      }

      if (result?.auction) {
        setAuction(result.auction);
      }

      await fetchPublicAuctionState();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not place bid.");
    } finally {
      setBiddingNow(false);
    }
  }

  async function submitWinnerEmail() {
    if (!auction) return;

    const cleanEmail = winnerEmail.trim().toLowerCase();
    const cleanBidderName = bidderName.trim();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!isWinningBidder) {
      alert("Only the winning bidder can submit the invoice email.");
      return;
    }

    setSubmittingEmail(true);

    try {
      const response = await fetch("/api/submit-winner-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionCode: auctionCode,
          bidderName: cleanBidderName,
          email: cleanEmail,
          artworkId: auction.artwork_id || activeArtwork?.id || null,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not save email.");
      }

      if (result?.auction) {
        setAuction({
          ...result.auction,
          winner_email_submitted: true,
          winner_email: result.auction.winner_email || cleanEmail,
        });
      }

      setEmailSubmittedArtworkKey(activeArtworkKey);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save email.");
    } finally {
      setSubmittingEmail(false);
    }
  }

  if (!joined) {
    return (
      <main className="min-h-[100svh] overflow-y-auto bg-[#07152b] text-[#07152b]">
        <div className="fixed inset-0 bg-[url('/paintbrush.jpg')] bg-cover bg-center" />
        <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(7,21,43,0.14),rgba(85,214,255,0.34)_38%,rgba(255,245,214,0.92))]" />
        <div className="fixed inset-0 opacity-45 bg-[radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] bg-[size:24px_24px]" />
        <div className="fixed -left-14 top-16 h-36 w-36 rounded-full bg-[#16d66d]/55 blur-3xl" />
        <div className="fixed -right-14 top-56 h-36 w-36 rounded-full bg-[#ff6b8a]/50 blur-3xl" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
        />

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2">
          <div className="mb-2 flex justify-center">
            <div className="rounded-[24px] border-4 border-white bg-white/95 px-7 py-2.5 shadow-[0_18px_45px_rgba(7,21,43,0.18)]">
              <img
                src="/bragwall-logo.png"
                alt="BragWall"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          <section className="overflow-hidden rounded-[38px] border-4 border-white bg-white shadow-[0_28px_70px_rgba(7,21,43,0.25)]">
            <div className="relative h-40 overflow-hidden bg-[#fff5d6]">
              <img
                src="/paintbrush.jpg"
                alt="Colourful paint and brush"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,43,0.02),rgba(7,21,43,0.62))]" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rotate-[-5deg] rounded-full bg-[#ffc857] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#07152b] shadow-lg">Bid</span>
                <span className="rotate-[4deg] rounded-full bg-[#16d66d] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#07152b] shadow-lg">Win</span>
                <span className="rotate-[-3deg] rounded-full bg-[#ff4f7b] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg">Brag!</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#ffc857] drop-shadow">Welcome Parents</p>
                <h1 className="text-[40px] font-black leading-[0.86] text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)]">
                  Bid. Win.<br />Brag!
                </h1>
              </div>
            </div>

            <div className="space-y-2.5 p-3.5">
              <p className="rounded-[22px] bg-[#eaf8ff] p-3 text-[12px] font-extrabold leading-snug text-slate-700">
                Tonight we turn school artwork into a live fundraising event — with proud parents, competitive grandparents, and masterpieces that deserve prime fridge-door real estate.
              </p>

              <ParentRaisedTotalCard
                totalRaised={parentRaisedTotal}
                soldCount={parentSoldCount}
                light
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleWelcomeVoiceTap}
                  onTouchEnd={handleWelcomeVoiceTap}
                  disabled={welcomeVoiceLoading}
                  className="touch-manipulation rounded-[24px] bg-[#16d66d] px-3 py-4 text-sm font-black text-[#07152b] shadow-[0_12px_25px_rgba(22,214,109,0.28)] transition active:scale-[0.98] disabled:opacity-50"
                >
                  {welcomeVoiceLoading
                    ? "Loading..."
                    : welcomeVoicePlaying
                    ? "🔊 Playing"
                    : "🔊 Play Welcome"}
                </button>

                <button
                  onClick={() => setGalleryOpen(true)}
                  className="rounded-[24px] bg-[#ffc857] px-3 py-4 text-sm font-black text-[#07152b] shadow-[0_12px_25px_rgba(255,200,87,0.32)] active:scale-[0.98]"
                >
                  🖼️ Gallery
                </button>
              </div>

              <div className="rounded-[26px] border-2 border-[#07152b]/8 bg-[#fff8e6] p-3 shadow-inner">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-[#0b63ce]">
                  How tonight works
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ParentStep number="1" color="bg-[#16d66d]" title="Enter name" text="Join the room" />
                  <ParentStep number="2" color="bg-[#ffc857]" title="View gallery" text="Pick favourites" />
                  <ParentStep number="3" color="bg-[#ff6b8a]" title="Go live" text="MC introduces art" dark />
                  <ParentStep number="4" color="bg-[#55d6ff]" title="Win & email" text="Invoice follow-up" />
                </div>
              </div>

              <input
                value={bidderName}
                onChange={(event) => setBidderName(event.target.value)}
                placeholder="Your bidder name"
                className="w-full rounded-[22px] border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-bold outline-none focus:border-[#16d66d]"
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
                className="relative z-10 w-full touch-manipulation select-none rounded-[26px] bg-[#07152b] py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(7,21,43,0.28)] active:scale-[0.98]"
              >
                JOIN AUCTION & ENABLE SOUND
              </button>

              <p className="px-2 pb-1 text-center text-[9px] font-black leading-snug text-slate-500">
                On iPhone, make sure Silent Mode is off and volume is up. If iOS blocks audio, tap the MC voice button when it appears.
              </p>
            </div>
          </section>
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

  if (isAuctionComplete) {
    return (
      <main className="min-h-[100svh] bg-[#020b18] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center rounded-[34px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-5xl font-black text-[#ffc857] mb-4">Auction complete</h1>
          <p className="text-xl font-bold text-white/80 leading-relaxed">Thank you for supporting the young artists and the school fundraiser.</p>
          <div className="mt-6">
            <ParentRaisedTotalCard
              totalRaised={parentRaisedTotal}
              soldCount={parentSoldCount}
              compact
            />
          </div>
          <button onClick={() => setGalleryOpen(true)} className="mt-6 rounded-[24px] bg-[#16d66d] px-6 py-4 font-black text-[#07152b]">View Gallery</button>
          <GalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} artworks={artworks} />
        </div>
      </main>
    );
  }

  if (isWaiting) {
    return (
      <main className="min-h-[100svh] overflow-y-auto bg-[#07152b] text-[#07152b]">
        <div className="fixed inset-0 bg-[url('/paintbrush.jpg')] bg-cover bg-center" />
        <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(85,214,255,0.62),rgba(255,255,255,0.72)_48%,rgba(255,245,214,0.96))]" />
        <div className="fixed inset-0 opacity-35 bg-[radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] bg-[size:24px_24px]" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
        />

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4">
          <div className="mb-4 rounded-[28px] border-4 border-white bg-white/95 px-5 py-3 text-center shadow-[0_18px_45px_rgba(7,21,43,0.18)]">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="mx-auto h-14 w-auto object-contain"
            />
          </div>

          <div className="mb-4">
            <ParentRaisedTotalCard
              totalRaised={parentRaisedTotal}
              soldCount={parentSoldCount}
              light
            />
          </div>

          <section className="flex flex-1 flex-col overflow-hidden rounded-[38px] border-4 border-white bg-white shadow-[0_28px_70px_rgba(7,21,43,0.24)]">
            <div className="relative h-56 overflow-hidden">
              <img src="/paintbrush.jpg" alt="Paint and brush" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,21,43,0.08),rgba(7,21,43,0.64))]" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[30px] bg-[#16d66d] text-5xl shadow-2xl">
                  🎨
                </div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-[#ffc857]">Parent Waiting Room</p>
                <h1 className="text-[58px] font-black leading-none text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)]">
                  You’re in.
                </h1>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">
              <p className="text-lg font-extrabold leading-relaxed text-slate-700">
                Keep this page open. The first artwork will appear automatically when the auction starts.
              </p>

              <div className="rounded-[26px] bg-[#16d66d] p-4 text-[#07152b] shadow-[0_14px_30px_rgba(22,214,109,0.26)]">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Sound</p>
                <p className="text-lg font-black">
                  {soundEnabled ? "Sound enabled ✅" : "Tap Join Auction to enable sound"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="rounded-[28px] bg-[#ffc857] p-5 text-left text-[#07152b] shadow-xl active:scale-[0.98]"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Preview</p>
                  <p className="text-2xl font-black">Gallery</p>
                </button>

                <div className="rounded-[28px] bg-[#55d6ff] p-5 text-[#07152b] shadow-xl">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Auction</p>
                  <p className="text-2xl font-black">Ready</p>
                </div>
              </div>

              <div className="mt-auto rounded-[26px] bg-[#07152b] p-5 text-white">
                <p className="text-center text-sm font-black leading-relaxed">
                  The next masterpiece is almost ready. Stay close — bidding moves fast.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden text-[#07152b] flex flex-col">
      <div className="absolute inset-0 bg-[url('/paintbrush.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.62),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,245,214,0.40))]" />
      <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle,#ffffff_1.4px,transparent_1.4px)] bg-[size:28px_28px]" />

      <GalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        artworks={artworks}
      />

      <AuctionFlashToast flash={auctionFlash} />

      <div className="relative shrink-0 bg-white/90 backdrop-blur border-b-4 border-[#07152b]/10 shadow-[0_10px_30px_rgba(7,21,43,0.12)]">
        <div className="max-w-md mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setGalleryOpen(true)}
              className="w-11 h-11 rounded-[20px] border-2 border-[#07152b]/10 flex items-center justify-center text-xl shrink-0 bg-[#ffc857] shadow-lg"
              aria-label="Open gallery"
            >
              🖼️
            </button>

            <div className="bg-white rounded-[22px] px-4 py-2 border-2 border-[#07152b]/5 shadow-lg">
              <img
                src="/bragwall-logo.png"
                alt="BragWall"
                className="h-11 w-auto object-contain"
              />
            </div>

            <div className="text-right shrink-0 max-w-[105px]">
              <p className="text-[9px] text-slate-500 font-black">Bidding as</p>

              <p className="font-black text-xs leading-tight truncate text-[#07152b]">
                {bidderName}
                <span className="inline-block w-2 h-2 bg-[#16d66d] rounded-full ml-1 shadow-[0_0_12px_rgba(22,214,109,0.9)]" />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md px-4 py-2">
        <ParentRaisedTotalCard
          totalRaised={parentRaisedTotal}
          soldCount={parentSoldCount}
          compact
        />
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
                        Enter your email so admin can follow up with your invoice and artwork certificate.
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
                      : "Receive invoice and artwork certificate"}
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
                    The winning parent will enter their email for the invoice.
                    Certificates are released after payment confirmation.
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

                {auction.winner_email_submitted ? (
                  <p className="text-slate-500 font-bold">
                    Next artwork starts in {secondsRemaining}s.
                  </p>
                ) : (
                  <p className="text-slate-500 font-bold">
                    The next artwork starts after the winner enters their email.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 min-h-0 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-3 overflow-y-auto overscroll-contain pb-6">
        {isSold && isWinningBidder && winnerEmailAlreadySubmitted && (
          <div className="shrink-0 bg-[#16d66d] text-[#07152b] rounded-[20px] p-3 shadow-xl">
            <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-1">
              Email Submitted
            </p>

            <p className="font-black text-sm leading-snug">
              Thanks, {bidderName}. Admin will follow up with your invoice and artwork certificate.
            </p>

            <p className="mt-2 text-sm font-black">
              Next artwork starts in {secondsRemaining}s.
            </p>
          </div>
        )}

        {isSold && winnerEmailAlreadySubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-[28px] border-4 border-[#ffc857] bg-[#07152b] p-5 text-center text-white shadow-2xl"
          >
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc857]">Sold artwork</p>
            <h2 className="text-4xl font-black leading-none text-[#ffc857]">SOLD</h2>
            <p className="mt-3 text-sm font-bold text-white/75">The winning email is saved. Next artwork starts in {secondsRemaining}s.</p>
          </motion.div>
        )}

        {isNextArtworkCountdown && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 bg-[#07152b] text-white rounded-[24px] p-4 shadow-xl border border-[#16d66d]/55"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#16d66d] text-[#07152b] flex items-center justify-center text-3xl shrink-0 shadow-xl">
                🎨
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="uppercase tracking-[0.22em] text-[9px] font-black text-[#16d66d]">
                    Next Artwork
                  </p>

                  <p className="bg-[#16d66d] text-[#07152b] rounded-full px-3 py-1 text-xs font-black shrink-0">
                    {secondsRemaining}s
                  </p>
                </div>

                <p className="font-black text-sm leading-snug">
                  This is the next artwork. The AI MC starts after the countdown.
                </p>

                <p className="text-xs font-bold text-white/65 mt-2 leading-relaxed">
                  Bidding stays locked while we prepare the full intro.
                </p>
              </div>
            </div>
          </motion.div>
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

                {mcAudioUrl && introAudioStatus !== "playing" && (
                  <button
                    type="button"
                    onClick={handleManualIntroAudioTap}
                    onTouchEnd={handleManualIntroAudioTap}
                    className="mt-4 mb-4 w-full bg-[#07152b] text-white rounded-[24px] px-4 py-6 text-xl font-black shadow-xl border-2 border-white/25 active:scale-[0.98] transition touch-manipulation"
                  >
                    🔊 Play MC Voice
                  </button>
                )}

                {mcAudioUrl && introAudioStatus === "playing" && (
                  <div className="mt-4 mb-4 w-full bg-[#16d66d] text-[#07152b] rounded-[24px] px-4 py-6 text-xl font-black shadow-xl text-center">
                    🔊 MC voice playing now
                  </div>
                )}

                {!mcAudioUrl && (
                  <div className="mt-4 mb-4 rounded-[22px] bg-[#07152b]/10 border border-[#07152b]/15 p-4 text-center font-black">
                    MC voice is still loading.
                  </div>
                )}

                <p className="text-sm font-black leading-snug opacity-75">
                  After the MC voice intro, bidding starts in 15 seconds.
                </p>

                {(introAudioStatus === "blocked" || introAudioStatus === "error") && (
                  <p className="text-xs font-black mt-3 opacity-70">
                    iPhone blocked the sound. Tap Play MC Voice again.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {isStartingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-[28px] border-4 border-white bg-[#07152b] p-5 text-center text-white shadow-2xl"
          >
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc857]">MC intro complete</p>
            <h2 className="text-3xl font-black leading-tight">Bidding starts in</h2>
            <div className="my-3 text-[76px] font-black leading-none text-[#16d66d]">{secondsRemaining}s</div>
            <p className="text-sm font-bold text-white/70">Get ready. The bid button unlocks when the countdown reaches zero.</p>
          </motion.div>
        )}

        <div className="shrink-0 flex items-start justify-between gap-3 rounded-[28px] border-2 border-white/70 bg-white/82 p-4 shadow-[0_18px_45px_rgba(7,21,43,0.18)] backdrop-blur-md">
          <div className="min-w-0">
            <p className="uppercase tracking-[0.25em] text-[10px] text-[#16d66d] font-black mb-1">
              Live Auction
            </p>

            <h1 className="text-3xl font-black leading-none truncate text-[#07152b]">
              {auction.child_name} {auction.child_surname}
            </h1>

            <p className="text-slate-600 text-sm font-black mt-1 truncate">
              {auction.grade}
            </p>

            <p className="text-[#0b63ce] text-xs font-black mt-1">
              {bidderCounterLabel}
            </p>
          </div>

          <button
            onClick={() => setGalleryOpen(true)}
            className="border-2 border-white text-[#07152b] rounded-[22px] px-3 py-2 text-center shrink-0 bg-[#ffc857] shadow-lg"
          >
            <p className="text-[10px] text-[#07152b]/55 font-black">View</p>
            <p className="font-black text-sm">Gallery</p>
          </button>
        </div>

        <div className="shrink-0 rounded-[34px] overflow-hidden border-4 border-white shadow-[0_18px_55px_rgba(7,21,43,0.25)] bg-white">
          <div className="bg-[#fff5d6] p-3">
            <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[20px] shadow-[0_0_35px_rgba(255,200,87,0.18)]">
              <div className="bg-[#f8f5ef] rounded-[14px] p-2.5">
                <div className="relative rounded-[14px] overflow-hidden bg-white h-[32dvh] min-h-[220px] max-h-[330px] flex items-center justify-center">
                  {auction.artwork_url ? (
                    <img
                      src={auction.artwork_url}
                      alt="Artwork"
                      className={`w-full h-full object-contain ${shouldShowArtworkSoldBanner ? "opacity-55 grayscale-[0.2]" : ""}`}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-black">
                      Artwork loading...
                    </div>
                  )}

                  {shouldShowArtworkSoldBanner && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#020b18]/36 p-5">
                      <div className="rotate-[-8deg] rounded-[22px] border-4 border-[#ffc857] bg-[#07152b]/92 px-8 py-5 text-center shadow-[0_0_45px_rgba(255,200,87,0.35)]">
                        <p className="text-[64px] font-black leading-none tracking-[-0.06em] text-[#ffc857] drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]">
                          SOLD
                        </p>
                        <p className="mt-2 text-sm font-black uppercase tracking-[0.24em] text-white/80">
                          Next artwork soon
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-5 bg-gradient-to-b from-[#ffc857] to-[#f59e0b]" />
        </div>

        <motion.div
          key={`${auction.current_bid}-${auction.leading_bidder}-${bidPulseKey}`}
          animate={{
            scale: bidPulseKey > 0 ? [1, 1.04, 1] : [1, 1.012, 1],
            boxShadow: bidPulseKey > 0
              ? [
                  "0 18px 40px rgba(7,21,43,0.18)",
                  "0 0 42px rgba(22,214,109,0.46)",
                  "0 18px 40px rgba(7,21,43,0.18)",
                ]
              : "0 18px 40px rgba(7,21,43,0.18)",
          }}
          transition={{
            duration: bidPulseKey > 0 ? 0.55 : 0.35,
          }}
          className="shrink-0 bg-white text-[#07152b] rounded-[28px] p-5 shadow-[0_18px_40px_rgba(7,21,43,0.18)] border-4 border-white"
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

      {!isSold && !isPreparingIntro && !isIntro && (
        <div className="relative shrink-0 bg-white/92 backdrop-blur border-t-4 border-[#07152b]/10 shadow-[0_-10px_40px_rgba(7,21,43,0.16)]">
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
                : isNextArtworkCountdown
                ? `Next art in ${secondsRemaining}s`
                : isStartingSoon
                ? `Starts in ${secondsRemaining}s`
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
                isUrgency ? "text-[#ef2b20]" : "text-slate-500"
              }`}
            >
              {isPreparingIntro
                ? "The artwork is ready. Please wait for the MC intro before bidding opens."
                : isIntro
                ? introAudioStatus === "playing"
                  ? "The AI MC is presenting the artwork. Bidding opens when the full intro finishes."
                  : "If sound does not start automatically on iPhone, tap the MC voice button above."
                : isNextArtworkCountdown
                ? "The next artwork is on screen. The AI MC starts after this countdown."
                : isStartingSoon
                ? "Bidding opens automatically after the countdown."
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

function ParentRaisedTotalCard({
  totalRaised,
  soldCount,
  compact = false,
  light = false,
}: {
  totalRaised: number;
  soldCount: number;
  compact?: boolean;
  light?: boolean;
}) {
  const soldLabel =
    soldCount === 1 ? "1 artwork sold so far" : `${soldCount} artworks sold so far`;

  if (light) {
    return (
      <div className="rounded-[24px] border-2 border-[#16d66d]/18 bg-[#07152b] p-3 text-white shadow-[0_14px_34px_rgba(7,21,43,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#16d66d]">
              Raised tonight
            </p>
            <p className="mt-1 text-3xl font-black leading-none text-[#ffc857]">
              R{totalRaised.toLocaleString()}
            </p>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              Sold
            </p>
            <p className="text-lg font-black text-white">{soldCount}</p>
          </div>
        </div>

        <p className="mt-2 text-[11px] font-extrabold text-white/70">
          {soldLabel} for this school auction.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-[22px] border border-[#16d66d]/24 bg-[#07152b]/92 px-4 py-3 text-white shadow-[0_14px_34px_rgba(7,21,43,0.18)]"
          : "rounded-[28px] border border-[#16d66d]/24 bg-[#07152b]/92 p-4 text-white shadow-[0_18px_44px_rgba(7,21,43,0.22)]"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#16d66d]">
            Raised tonight
          </p>
          <p className="mt-1 text-3xl font-black leading-none text-[#ffc857]">
            R{totalRaised.toLocaleString()}
          </p>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
            Sold
          </p>
          <p className="text-lg font-black text-white">{soldCount}</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] font-extrabold text-white/68">
        {soldLabel} for this school auction.
      </p>
    </div>
  );
}

function AuctionFlashToast({ flash }: { flash: AuctionFlash | null }) {
  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none fixed inset-x-0 bottom-[118px] z-[70] px-4"
        >
          <div className="mx-auto max-w-md">
            <div
              className={`mx-auto max-w-[340px] rounded-[26px] border-4 px-5 py-4 text-center shadow-[0_22px_55px_rgba(7,21,43,0.32)] backdrop-blur-md ${
                flash.kind === "sold"
                  ? "rotate-[-4deg] border-[#ffc857] bg-[#ef2b20] text-white"
                  : flash.kind === "twice"
                  ? "rotate-[3deg] border-white bg-[#ef2b20] text-white"
                  : flash.kind === "once"
                  ? "rotate-[-3deg] border-white bg-[#ffc857] text-[#07152b]"
                  : "border-white bg-[#16d66d] text-[#07152b]"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-75">
                {flash.kind === "bid" ? "Bid received" : "Auction update"}
              </p>

              <p className="mt-1 text-3xl font-black leading-none tracking-[-0.04em]">
                {flash.title}
              </p>

              <p className="mt-2 text-sm font-black leading-tight opacity-85">
                {flash.subtitle}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
          <div className="fixed inset-0 pointer-events-none bg-[url('/paintbrush.jpg')] bg-cover bg-center" />
          <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(2,11,24,0.90),rgba(7,21,43,0.94)_45%,rgba(2,11,24,0.98))]" />
          <div className="fixed inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] bg-[size:24px_24px]" />

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
                    <div className="relative rounded-[24px] overflow-hidden bg-[#f8f5ef] border border-black/5 mb-4">
                      <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2">
                        <div className="bg-white rounded-[18px] h-[260px] flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${artwork.child_name} ${artwork.child_surname}`}
                              className={`w-full h-full object-contain ${isSoldArtwork ? "opacity-55 grayscale-[0.2]" : ""}`}
                            />
                          ) : (
                            <div className="text-slate-400 font-black">
                              Artwork loading...
                            </div>
                          )}
                        </div>
                      </div>

                      {isSoldArtwork && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#07152b]/28 backdrop-blur-[1px]">
                          <div className="rotate-[-10deg] rounded-[26px] border-4 border-[#ffc857] bg-[#ef2b20] px-8 py-4 text-center shadow-[0_20px_45px_rgba(239,43,32,0.35)]">
                            <p className="text-5xl font-black tracking-[-0.06em] text-white drop-shadow-lg">SOLD</p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-white/82">
                              R{Number(artwork.sold_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
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

function ParentStep({
  number,
  color,
  title,
  text,
  dark = false,
}: {
  number: string;
  color: string;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[#07152b]/8 bg-white px-2.5 py-2 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className={`${color} flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${dark ? "text-white" : "text-[#07152b]"}`}>
          {number}
        </span>
        <p className="text-[12px] font-black leading-none text-[#07152b]">{title}</p>
      </div>
      <p className="pl-9 text-[10px] font-extrabold leading-tight text-slate-500">{text}</p>
    </div>
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






"use client";





import { useEffect, useMemo, useRef, useState } from "react";


import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../lib/supabase";





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


  updated_at?: string | null;


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


  invoice_email_requested?: boolean | null;


};





const DEFAULT_AUCTION_CODE = "demo";


const DEFAULT_BID_STEP = 100;


const MC_INTRO_SECONDS = 60;


const BIDDING_START_BUFFER_SECONDS = 15;


const SOLD_EMAIL_CAPTURE_SECONDS = 15;





function normalizeAuctionCode(value?: string) {


  const normalized = String(value || DEFAULT_AUCTION_CODE)


    .trim()


    .toLowerCase()


    .replace(/[^a-z0-9_-]/g, "-")


    .replace(/-+/g, "-")


    .replace(/^-|-$/g, "");





  return normalized || DEFAULT_AUCTION_CODE;


}





function getIntroElapsedSeconds(auction: AuctionState | null) {


  if (!auction || auction.status !== "intro" || !auction.updated_at) return 0;





  const startedAt = new Date(auction.updated_at).getTime();


  if (!Number.isFinite(startedAt) || startedAt <= 0) return 0;





  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));


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


  const [bidderEmail, setBidderEmail] = useState("");


  const [bidderContactId, setBidderContactId] = useState<string | null>(null);


  const [bidderToken, setBidderToken] = useState<string | null>(null);


  const [joiningAuction, setJoiningAuction] = useState(false);





  // Restore parent details for this specific auction.


  // Parents must still tap Join Auction to enable browser audio.


  useEffect(() => {


    try {


      const storageKey = `bragwall-bidder-${auctionCode}`;


      const savedRaw = window.localStorage.getItem(storageKey);





      if (!savedRaw) return;





      const saved = JSON.parse(savedRaw);





      if (


        typeof saved.bidderName === "string" &&


        typeof saved.bidderEmail === "string"


      ) {


        setBidderName(saved.bidderName);


        setBidderEmail(saved.bidderEmail);


      }


    } catch (error) {


      console.error("Could not restore saved bidder details:", error);


    }


  }, [auctionCode]);


  const [joined, setJoined] = useState(false);


  const [soundEnabled, setSoundEnabled] = useState(false);
  const [waitingMusicPlaying, setWaitingMusicPlaying] = useState(false);


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
  const [activeReaction, setActiveReaction] = useState<{ id: number; kind: string } | null>(null);
  const reactionArtworkRef = useRef<string | null>(null);
  const lastReactionIdRef = useRef<number | null>(null);
  const lastLocalReactionAtRef = useRef(0);

  useEffect(() => {
    if (!activeReaction) return;
    const timeout = window.setTimeout(() => setActiveReaction(null), 1700);
    return () => window.clearTimeout(timeout);
  }, [activeReaction]);


  const [bidNotice, setBidNotice] = useState<{


    id: number;


    title: string;


    message: string;


  } | null>(null);


  const [mcReaction, setMcReaction] = useState<{


    id: number;


    text: string;


  } | null>(null);


  const [bidPulseKey, setBidPulseKey] = useState(0);





  const previousStatusRef = useRef<string | null>(null);


  const previousBidRef = useRef<number | null>(null);


  const previousBidderRef = useRef<string | null>(null);


  const spokenMcReactionKeyRef = useRef("");


  const elevenLabsReactionKeyRef = useRef("");


  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const bidNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const audioUnlockedRef = useRef(false);


  const audioContextRef = useRef<AudioContext | null>(null);


  const audioUnlockElementRef = useRef<HTMLAudioElement | null>(null);


  // Shared across React renders for this browser.
  const rhythmInFlightRef = useRef(false);

  // Tracks the most recent auction-rhythm request for this browser.
  const rhythmCooldownRef = useRef({
    key: "",
    at: 0,
  });
  const autoActionKeyRef = useRef("");


  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);


  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const mcCueAudioRef = useRef<HTMLAudioElement | null>(null);
  const mcCueRotationRef = useRef(0);
  const waitingMusicRef = useRef<HTMLAudioElement | null>(null);
  const soldFanfareRef = useRef<HTMLAudioElement | null>(null);


  const playedIntroAudioKeyRef = useRef("");


  const previousArtworkKeyRef = useRef("");
  // BRAGWALL_NEXT_ARTWORK_REVEAL_V1: visual state only; auction timing is unchanged.
  const [artworkRevealKey, setArtworkRevealKey] = useState("");
  const artworkRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const lastManualIntroTapRef = useRef(0);


  const lastManualWelcomeTapRef = useRef(0);


  const activeAuctionCodeRef = useRef(auctionCode);


  // BRAGWALL_POLLING_FIX_2B


  const pollingStatusRef = useRef<string>("");





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





  const topBidderRows = useMemo(() => {


    const bestByBidder = new Map<string, { name: string; amount: number }>();





    bids.forEach((bid) => {


      const name = bid.bidder_name.trim();


      if (!name) return;





      const key = name.toLowerCase();


      const amount = Number(bid.amount || 0);


      const existing = bestByBidder.get(key);





      if (!existing || amount > existing.amount) {


        bestByBidder.set(key, { name, amount });


      }


    });





    return Array.from(bestByBidder.values())


      .sort((left, right) => right.amount - left.amount)


      .slice(0, 3);


  }, [bids]);





  const hasLiveBid =


    Boolean(auction?.leading_bidder) &&


    auction?.leading_bidder !== "No bids yet" &&


    Number(auction?.current_bid || 0) > 0;





  const liveBidEnergyText = hasLiveBid


    ? `${auction?.leading_bidder} leads at ${Number(auction?.current_bid || 0).toLocaleString()} Rand`


    : "Waiting for the first brave bid";





  const soldArtworksForTotal = useMemo(() => {


    return artworks.filter((artwork) => {


      const soldAmount = Number(artwork.sold_amount || 0);


      const status = String(artwork.status || "").toLowerCase();





      return status === "sold";


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





  const soldEmailCaptureRemaining = useMemo(() => {


    if (!auction || auction.status !== "sold") return 0;





    if (


      auction.winner_email ||


      auction.winner_email_submitted ||


      auction.winner_email_submitted_at


    ) {


      return secondsRemaining;


    }





    const soldAt = auction.updated_at ? new Date(auction.updated_at).getTime() : 0;


    if (!soldAt) return SOLD_EMAIL_CAPTURE_SECONDS;





    const elapsed = Math.floor((Date.now() - soldAt) / 1000);


    return Math.max(0, SOLD_EMAIL_CAPTURE_SECONDS - elapsed);


  }, [


    auction?.status,


    auction?.updated_at,


    auction?.winner_email,


    auction?.winner_email_submitted,


    auction?.winner_email_submitted_at,


    secondsRemaining,


  ]);





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
  const isArtworkRevealing = Boolean(activeArtworkKey && artworkRevealKey === activeArtworkKey);





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


    audio.volume = 0.45;


    soldFanfareRef.current?.pause();
    soldFanfareRef.current = audio;
    audio.onended = () => {
      if (soldFanfareRef.current === audio) soldFanfareRef.current = null;
    };
    audio.play().catch(() => {
      if (soldFanfareRef.current === audio) soldFanfareRef.current = null;
    });


  }





  function toggleWaitingMusic() {
    const existing = waitingMusicRef.current;
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
      waitingMusicRef.current = null;
      setWaitingMusicPlaying(false);
      return;
    }

    if (!joined || !isWaiting) return;

    const audio = new Audio("/sounds/waiting-room.mp3");
    audio.loop = true;
    audio.volume = 0.22;
    waitingMusicRef.current = audio;
    audio.play().then(() => {
      if (waitingMusicRef.current === audio) setWaitingMusicPlaying(true);
    }).catch(() => {
      if (waitingMusicRef.current === audio) waitingMusicRef.current = null;
      setWaitingMusicPlaying(false);
    });
  }

  useEffect(() => {
    if (joined && isWaiting && soundEnabled) return;
    const audio = waitingMusicRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      waitingMusicRef.current = null;
    }
    setWaitingMusicPlaying(false);
  }, [joined, isWaiting, soundEnabled]);

  useEffect(() => {
    if (auction?.status === "sold") return;
    soldFanfareRef.current?.pause();
    soldFanfareRef.current = null;
  }, [auction?.status]);

  useEffect(() => () => {
    waitingMusicRef.current?.pause();
    soldFanfareRef.current?.pause();
  }, []);
  function playSavedMcCue(
    cue: "going-once" | "going-twice" | "sold" | "bid-1" | "bid-2" | "bid-3"
  ) {
    if (!joined || !soundEnabled || !audioUnlockedRef.current) return;
    if (introAudioRef.current) return;

    mcCueAudioRef.current?.pause();

    const audio = new Audio(`/sounds/mc-cues/${cue}.mp3`);
    mcCueAudioRef.current = audio;
    audio.volume = 0.85;

    audio.onended = () => {
      if (mcCueAudioRef.current !== audio) return;
      mcCueAudioRef.current = null;
      if (cue === "sold") playSound("/sounds/sold-fanfare.mp3");
    };

    audio.play().catch(() => {
      if (mcCueAudioRef.current !== audio) return;
      mcCueAudioRef.current = null;
      if (cue === "sold") playSound("/sounds/sold-fanfare.mp3");
    });
  }

  useEffect(() => {
    if (
      joined &&
      ["open", "going once", "going twice", "sold"].includes(auction?.status || "")
    ) return;

    mcCueAudioRef.current?.pause();
    mcCueAudioRef.current = null;
  }, [joined, auction?.status]);

  useEffect(() => {
    mcCueRotationRef.current = 0;
    mcCueAudioRef.current?.pause();
    mcCueAudioRef.current = null;
  }, [auction?.artwork_id]);

  useEffect(() => () => {
    mcCueAudioRef.current?.pause();
  }, []);
  function playBidEnergySound(kind: "bid" | "reaction" = "bid") {


    if (!soundEnabled || !audioUnlockedRef.current) return;


    if (typeof window === "undefined") return;





    try {


      const AudioContextConstructor =


        window.AudioContext ||


        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;





      if (!AudioContextConstructor) return;





      const audioContext =


        audioContextRef.current || new AudioContextConstructor();





      audioContextRef.current = audioContext;





      if (audioContext.state === "suspended") {


        void audioContext.resume();


      }





      const now = audioContext.currentTime;


      const notes = kind === "reaction"


        ? [


            { start: 0, frequency: 740 },


            { start: 0.115, frequency: 940 },


          ]


        : [


            { start: 0, frequency: 780 },


          ];





      notes.forEach((note) => {


        const oscillator = audioContext.createOscillator();


        const gain = audioContext.createGain();





        oscillator.type = "triangle";


        oscillator.frequency.setValueAtTime(note.frequency, now + note.start);





        gain.gain.setValueAtTime(0.0001, now + note.start);


        gain.gain.exponentialRampToValueAtTime(0.16, now + note.start + 0.015);


        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + 0.12);





        oscillator.connect(gain);


        gain.connect(audioContext.destination);





        oscillator.start(now + note.start);


        oscillator.stop(now + note.start + 0.14);


      });


    } catch {


      // Sound is a bonus. Visual bid energy still works if the phone blocks audio.


    }


  }





  function getMcReactionText(value?: string | null) {


    const text = String(value || "").trim();





    if (!text.toUpperCase().startsWith("MC_REACTION:")) return "";





    return text.replace(/^MC_REACTION:\s*/i, "").trim();


  }





  function getShortElevenLabsMcLine(reactionText: string, bidderName: string) {


    const safeName = bidderName.trim() || "Someone";





    const options = [


      `${safeName} came to play!`,


      "Yoh, now it is getting serious!",


      "Parents, the gloves are off!",


      `${safeName} wants bragging rights!`,


      "That bid has attitude!",


      "Now we have an auction!",


      "Eish, things are heating up!",


      `${safeName} is not browsing!`,


      "The wall-space battle begins!",


      "Someone wants fridge fame!",


    ];





    let seed = 0;


    const source = `${reactionText}|${safeName}`;





    for (const char of source) {


      seed += char.charCodeAt(0);


    }





    return options[Math.abs(seed) % options.length];


  }





  async function playElevenLabsMcReaction({


    text,


    key,


  }: {


    text: string;


    key: string;


  }) {


    if (!soundEnabled || !audioUnlockedRef.current) return;


    if (elevenLabsReactionKeyRef.current === key) return;





    elevenLabsReactionKeyRef.current = key;





    try {


      // BRAGWALL_REACTION_AUDIO_RETRY_V1
      // The first parent may generate the recording while others wait.
      // Retry briefly so those parents can reuse the completed recording.
      // Never play a reaction after a newer bid reaction has replaced it.
      let reactionAudioUrl = "";

      for (let attempt = 0; attempt < 5; attempt++) {
        if (elevenLabsReactionKeyRef.current !== key) return;

        const response = await fetch("/api/mc-voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            auctionCode,
            text,
            childName: "AI MC",
            grade: "BragWall",
            forceRegenerate: true,
          }),
        });

        const result = await response.json().catch(() => null);

        if (response.ok && result?.audioUrl) {
          reactionAudioUrl = result.audioUrl;
          break;
        }

        if (response.status !== 202 || result?.status !== "processing") {
          return;
        }

        if (attempt < 4) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 650);
          });
        }
      }

      if (!reactionAudioUrl) return;
      if (elevenLabsReactionKeyRef.current !== key) return;

      const audio = new Audio(reactionAudioUrl);
      audio.preload = "auto";


      audio.volume = 1;


      (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;





      await audio.play().catch(() => {});


    } catch {


      // The visual MC reaction and bid-pop sound still work if mobile blocks this.


    }


  }





  function speakMcReaction(text: string, key: string) {


    if (!soundEnabled || !audioUnlockedRef.current) return;


    if (spokenMcReactionKeyRef.current === key) return;


    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;





    spokenMcReactionKeyRef.current = key;





    try {


      window.speechSynthesis.cancel();





      const utterance = new SpeechSynthesisUtterance(text);


      const voices = window.speechSynthesis.getVoices();





      const preferredVoice =


        voices.find((voice) => /google uk english female/i.test(voice.name)) ||


        voices.find((voice) => /samantha|karen|serena|moira|tessa|female/i.test(voice.name)) ||


        voices.find((voice) => /english/i.test(voice.lang || voice.name)) ||


        null;





      if (preferredVoice) {


        utterance.voice = preferredVoice;


      }





      utterance.rate = 1.12;


      utterance.pitch = 1.0;


      utterance.volume = 0.82;





      window.speechSynthesis.speak(utterance);


    } catch {


      // Browser speech is optional. The reaction still appears visually.


    }


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





  async function handleJoinAuction() {


    const cleanBidderName = bidderName.trim();


    const cleanBidderEmail = bidderEmail.trim().toLowerCase();





    if (!cleanBidderName) {


      alert("Please enter your bidder name first.");


      return;


    }





    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanBidderEmail)) {


      alert("Please enter a valid email address.");


      return;


    }





    if (joiningAuction) return;





    setJoiningAuction(true);





    try {


      const storageKey = `bragwall-bidder-${auctionCode}`;





      const savedRaw = localStorage.getItem(storageKey);


      const saved = savedRaw ? JSON.parse(savedRaw) : null;





      let contactId: string | null = null;


      let contactToken: string | null = null;





      if (


        saved &&


        saved.bidderName === cleanBidderName &&


        saved.bidderEmail === cleanBidderEmail &&


        typeof saved.bidderContactId === "string" &&


        typeof saved.bidderToken === "string" &&


        saved.bidderToken.length >= 32


      ) {


        contactId = saved.bidderContactId;


        contactToken = saved.bidderToken;


      } else {


        const response = await fetch("/api/register-auction-bidder", {


          method: "POST",


          headers: {


            "Content-Type": "application/json",


          },


          body: JSON.stringify({


            auctionCode,


            bidderName: cleanBidderName,


            bidderEmail: cleanBidderEmail,


          }),


        });





        const result = await response.json().catch(() => null);





        if (!response.ok || !result?.bidderContactId || !result?.bidderToken) {


          throw new Error(result?.error || "Could not register bidder.");


        }





        contactId = result.bidderContactId;


        contactToken = result.bidderToken;


      }





      localStorage.setItem(


        storageKey,


        JSON.stringify({


          bidderName: cleanBidderName,


          bidderEmail: cleanBidderEmail,


          bidderContactId: contactId,


          bidderToken: contactToken,


        })


      );





      setBidderContactId(contactId);


      setBidderToken(contactToken);


      setBidderEmail(cleanBidderEmail);





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





    // Parent join must not start the auction.


    // Parents join the waiting room, enable sound, and can view the gallery.


    // The admin controls the real auction start from the Live Room.


    } catch (error) {


      alert(error instanceof Error ? error.message : "Could not join auction.");


    } finally {


      setJoiningAuction(false);


    }


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


      auction.updated_at || auction.status_deadline || "intro-start",


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





      const elapsedSeconds = getIntroElapsedSeconds(auction);


      if (elapsedSeconds > 1) {


        audio.currentTime = elapsedSeconds;


      }





      audio.onloadedmetadata = () => {


        const syncedElapsedSeconds = getIntroElapsedSeconds(auction);


        const duration = Number(audio.duration || 0);





        if (duration > 0 && syncedElapsedSeconds >= duration - 1) {


          setIntroAudioStatus("finished");


          void openBiddingAfterIntro("audio-finished");


          return;


        }





        if (syncedElapsedSeconds > 1 && (!audio.currentTime || audio.currentTime < syncedElapsedSeconds - 1)) {


          audio.currentTime = Math.min(syncedElapsedSeconds, Math.max(0, duration - 1));


        }


      };





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





      const reactionText = getMcReactionText(auction.mc_commentary);





      if (reactionText) {

        setMcReaction({


          id: Date.now(),


          text: reactionText,


        });





        const cueNumber = (mcCueRotationRef.current % 3) + 1;
        mcCueRotationRef.current += 1;
        if (currentStatus === "open") {
          playSavedMcCue(`bid-${cueNumber}` as "bid-1" | "bid-2" | "bid-3");
        }

      } else {


        playBidEnergySound("bid");


      }





      showAuctionFlash({


        kind: "bid",


        title: `R${currentBid.toLocaleString()} received`,


        subtitle: `from ${currentBidder}`,


      });


    } else if (currentStatus !== previousStatus) {


      if (currentStatus === "going once") {
        playSavedMcCue("going-once");


        showAuctionFlash({


          kind: "once",


          title: "Going once",


          subtitle: currentBidder && currentBidder !== "No bids yet"


            ? `R${currentBid.toLocaleString()} to ${currentBidder}`


            : "Last chance to bid",


        });


      }





      if (currentStatus === "going twice") {
        playSavedMcCue("going-twice");


        showAuctionFlash({


          kind: "twice",


          title: "Going twice",


          subtitle: "Last chance!",


        });


      }





      if (currentStatus === "sold") {


        playSavedMcCue("sold");





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


    if (artworkRevealTimerRef.current) clearTimeout(artworkRevealTimerRef.current);
    artworkRevealTimerRef.current = null;
    setArtworkRevealKey("");
    previousArtworkKeyRef.current = "";


    playedIntroAudioKeyRef.current = "";


    autoActionKeyRef.current = "";


    activeAuctionCodeRef.current = auctionCode;


    setAuctionFlash(null);


    setMcReaction(null);


    spokenMcReactionKeyRef.current = "";


    elevenLabsReactionKeyRef.current = "";


    setBidPulseKey(0);


    setAuction(null);


    setBids([]);


    setArtworks([]);


    setBidIncrement(DEFAULT_BID_STEP);


    setSecondsRemaining(0);


    setPauseRemaining(0);





    pollingStatusRef.current = "";


    fetchPublicAuctionState(auctionCode);





    // BRAGWALL_POLLING_FIX_2B


    // Stop polling after completion and while the browser tab is hidden.


    const refreshInterval = window.setInterval(() => {


      if (document.visibilityState === "hidden") return;


      if (pollingStatusRef.current === "complete") return;





      void fetchPublicAuctionState(auctionCode);


    }, 3000);





    const refreshWhenVisible = () => {


      if (document.visibilityState === "visible") {


        void fetchPublicAuctionState(auctionCode);


      }


    };





    document.addEventListener("visibilitychange", refreshWhenVisible);





    return () => {


      stopIntroAudio();


      if (flashTimeoutRef.current) {


        clearTimeout(flashTimeoutRef.current);


        flashTimeoutRef.current = null;


      }


      if (bidNoticeTimeoutRef.current) {


        clearTimeout(bidNoticeTimeoutRef.current);


        bidNoticeTimeoutRef.current = null;


      }


      window.clearInterval(refreshInterval);


      document.removeEventListener("visibilitychange", refreshWhenVisible);


    };


  }, [auctionCode]);

  // BRAGWALL_PARENT_BROADCAST_V1
  // School-specific WebSocket notifications.
  // Sensitive auction data is never read from the broadcast payload.
  // The existing public API remains the source of auction information.
  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`bragwall:auction:${auctionCode}`)
      .on(
        "broadcast",
        { event: "auction_changed" },
        () => {
          if (cancelled) return;
          if (document.visibilityState === "hidden") return;
          if (pollingStatusRef.current === "complete") return;
          if (refreshTimer) return;

          // Combine rapid notifications into one safe refresh.
          refreshTimer = setTimeout(() => {
            refreshTimer = null;

            if (cancelled) return;
            if (activeAuctionCodeRef.current !== auctionCode) return;

            void fetchPublicAuctionState(auctionCode);
          }, 350);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info(
            "[BragWall Realtime] Connected:",
            auctionCode
          );
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "[BragWall Realtime] Connection issue:",
            auctionCode,
            status
          );
        }
      });

    return () => {
      cancelled = true;

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      void supabase.removeChannel(channel);
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
      // A new artwork triggers the effect; joining or refreshing does not.
      if (joined && auction && !["open", "going once", "going twice", "sold"].includes(auction.status) &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (artworkRevealTimerRef.current) clearTimeout(artworkRevealTimerRef.current);
        setArtworkRevealKey(activeArtworkKey);
        artworkRevealTimerRef.current = setTimeout(() => {
          setArtworkRevealKey("");
          artworkRevealTimerRef.current = null;
        }, 3000);
      }


      setEmailSubmittedArtworkKey(null);


      setWinnerEmail(bidderEmail);


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


    // BRAGWALL_RHYTHM_INFLIGHT_V1
    // Prevent overlapping rhythm requests from this browser.
    if (!auction) return;
    if (rhythmInFlightRef.current) return;

    rhythmInFlightRef.current = true;

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
    } finally {
      // Always release the lock, including after network errors.
      rhythmInFlightRef.current = false;
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


      const hasWinnerEmail = Boolean(


        auction.winner_email ||


          auction.winner_email_submitted ||


          auction.winner_email_submitted_at


      );





      const soldAt = auction.updated_at ? new Date(auction.updated_at).getTime() : 0;


      const soldSeconds = soldAt ? Math.floor((now - soldAt) / 1000) : SOLD_EMAIL_CAPTURE_SECONDS;





      if (


        (hasWinnerEmail && auction.status_deadline) ||


        (!hasWinnerEmail && soldSeconds >= SOLD_EMAIL_CAPTURE_SECONDS)


      ) {


        await runSecureAuctionRhythmOnce();


      }





      return;


    }





    if (auction.current_bid <= 0 && auction.status !== "open") return;


    if (auction.status === "waiting" || auction.status === "complete") return;


    if (!isAuctionOpenForBids) return;





    // BRAGWALL_RHYTHM_OPEN_GATE_V1
    // Avoid requesting a transition before the existing server timing
    // permits one. The server remains responsible for all transitions.
    if (auction.status === "open") {
      if (Number(auction.current_bid || 0) <= 0) {
        const openedAt = auction.updated_at
          ? new Date(auction.updated_at).getTime()
          : 0;

        if (
          openedAt &&
          Number.isFinite(openedAt) &&
          now - openedAt < 15000
        ) {
          return;
        }
      } else {
        const lastBidAt = auction.last_bid_at
          ? new Date(auction.last_bid_at).getTime()
          : 0;

        const pauseUntil = auction.bid_pause_until
          ? new Date(auction.bid_pause_until).getTime()
          : 0;

        const silenceStartsAt = Math.max(lastBidAt, pauseUntil);

        if (
          silenceStartsAt &&
          Number.isFinite(silenceStartsAt) &&
          now - silenceStartsAt < 5000
        ) {
          return;
        }
      }
    }
    const rhythmKey = [


      auction.status,


      auction.current_bid,


      auction.last_bid_at || "no-last-bid",


      auction.status_deadline || "no-deadline",


      auction.bid_pause_until || "no-pause",


        ].join("|");

    // BRAGWALL_RHYTHM_COOLDOWN_V1
    // Avoid repeatedly requesting the same auction transition.
    // A changed auction state is eligible immediately.
    const previousRhythm = rhythmCooldownRef.current;

    if (
      previousRhythm.key === rhythmKey &&
      now - previousRhythm.at < 3000
    ) {
      return;
    }

    // Do not start a cooldown if another request is still running.
    if (rhythmInFlightRef.current) return;

    rhythmCooldownRef.current = {
      key: rhythmKey,
      at: now,
    };

    await runSecureAuctionRhythmOnce();


  }





  function showNewReactions(events: Array<{ id: number; artwork_id: string; kind: string }>, artworkId: string | null) {
    if (!artworkId || reactionArtworkRef.current !== artworkId) {
      reactionArtworkRef.current = artworkId;
      lastReactionIdRef.current = null;
    }
    const valid = events.filter((event) => event.artwork_id === artworkId &&
      ["heart", "cheer", "dance"].includes(event.kind));
    const latest = valid.reduce<(typeof valid)[number] | null>(
      (highest, item) => !highest || item.id > highest.id ? item : highest, null);
    if (!latest) {
      if (lastReactionIdRef.current === null) lastReactionIdRef.current = 0;
      return;
    }
    if (lastReactionIdRef.current !== null && latest.id > lastReactionIdRef.current) {
      setActiveReaction({ id: latest.id, kind: latest.kind });
    }
    lastReactionIdRef.current = Math.max(latest.id, lastReactionIdRef.current || 0);
  }

  async function sendReaction(kind: "heart" | "cheer" | "dance") {
    const artworkId = auction?.artwork_id;
    if (!artworkId || !bidderContactId || !bidderToken ||
        !["intro", "open", "going once", "going twice", "paused"].includes(auction.status)) return;
    const now = Date.now();
    if (now - lastLocalReactionAtRef.current < 10_000) return;
    lastLocalReactionAtRef.current = now;
    setActiveReaction({ id: now, kind });
    try {
      const response = await fetch("/api/auction-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionCode, artworkId, bidderContactId, bidderToken, kind }),
      });
      if (!response.ok) console.warn("Reaction could not be shared.");
    } catch {
      console.warn("Reaction could not be shared.");
    }
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


      pollingStatusRef.current = nextAuction?.status || "";


      const nextProfile = (result?.profile || null) as SchoolProfile | null;


      const nextArtworks = Array.isArray(result?.artworks)


        ? result.artworks.filter((artwork: Artwork) => artwork.auction_code === targetAuctionCode)


        : [];





      showNewReactions(Array.isArray(result?.reactions) ? result.reactions : [],
        nextAuction?.artwork_id || null);
      setAuction(nextAuction);


      setBids(Array.isArray(result?.bids) ? result.bids : []);


      setArtworks(nextArtworks);


      setBidIncrement(getSafeBidIncrement(nextProfile?.bid_increment));





    } catch (error) {


      console.error("Could not load public auction state:", error);


    }


  }








  function showBidNotice(nextNotice: { title: string; message: string }) {


    if (bidNoticeTimeoutRef.current) {


      clearTimeout(bidNoticeTimeoutRef.current);


    }





    setBidNotice({


      id: Date.now(),


      title: nextNotice.title,


      message: nextNotice.message,


    });





    bidNoticeTimeoutRef.current = setTimeout(() => {


      setBidNotice(null);


      bidNoticeTimeoutRef.current = null;


    }, 4200);


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


      showBidNotice({


        title: "Bid moved on 🎨",


        message: "The auction has already moved to a higher amount. Tap the latest bid button to try again.",


      });


      void fetchPublicAuctionState();


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


          bidderContactId,


          bidderToken,


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


      const message = error instanceof Error ? error.message : "Could not place bid.";


      const lowerMessage = message.toLowerCase();





      const isOutbidMessage =


        lowerMessage.includes("another bid") ||


        lowerMessage.includes("outbid") ||


        lowerMessage.includes("refresh") ||


        lowerMessage.includes("no longer high enough");





      if (isOutbidMessage) {


        showBidNotice({


          title: "Someone beat you to it 🎨",


          message: "Another parent placed a bid first. The latest bid is updating now — tap the new bid amount to try again.",


        });


        await fetchPublicAuctionState();


      } else {


        showBidNotice({


          title: "Bid not placed",


          message,


        });


      }


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


          bidderName: cleanBidderName || cleanEmail,


          bidderContactId,


          bidderToken,


          email: cleanEmail,


          artworkId: auction.artwork_id || activeArtwork?.id || null,


        }),


      });





      const result = await response.json().catch(() => null);





      if (!response.ok) {


        throw new Error(result?.error || "Could not save email.");


      }





      // Confirmation saves the email only.


      // Auction progression remains controlled by the existing rhythm.


      if (result?.emailConfirmed) {


        setEmailSubmittedArtworkKey(activeArtworkKey);


        setBidderEmail(cleanEmail);


      }





      setEmailSubmittedArtworkKey(activeArtworkKey);


    } catch (error) {


      alert(error instanceof Error ? error.message : "Could not save email.");


    } finally {


      setSubmittingEmail(false);


    }


  }





  // BRAGWALL_JOIN_STAGE_V1: visual-only entry screen; join and audio handlers stay the same.
  if (!joined) {
    return (
      <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#070d1c] text-white">
        <style>{`@media (max-height: 670px) {
          .bw-join-steps { display: none; }
          .bw-join-stage { padding: 8px; }
          .bw-join-headline { font-size: 24px; }
          .bw-join-help { display: none; }
        }
        @media (max-height: 520px) {
          .bw-join-shell { overflow-y: auto; }
          .bw-join-stage { flex: none; height: 188px; }
        }`}</style>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_12%,rgba(224,119,54,0.28),transparent_54%),linear-gradient(90deg,#170b12_0%,#070d1c_12%,#070d1c_88%,#170b12_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#862e20]/60 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#862e20]/60 to-transparent" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
          auctionCode={auctionCode}
          bidderName={bidderName}
          openingBidAmount={bidIncrement}
          onRequestSaved={() => fetchPublicAuctionState(auctionCode)}
        />

        <div className="bw-join-shell relative mx-auto flex h-full min-h-0 w-full max-w-md flex-col gap-2 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          <header className="flex shrink-0 items-center justify-between gap-3 px-1 py-1">
            <div>
              <p className="text-xl font-black leading-none tracking-tight">BragWall</p>
              <p className="mt-0.5 text-[9px] font-bold tracking-[0.12em] text-[#f5b16d]">Young Art. Big Pride.</p>
            </div>
            <button type="button" onClick={() => setGalleryOpen(true)}
              className="min-h-10 rounded-lg px-2 text-sm font-black text-[#ffc07f]">
              Gallery
            </button>
          </header>

          <section className="bw-join-stage flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-[#f3b16e]/70 bg-[#0a1221] p-2 shadow-[0_0_26px_rgba(241,143,65,0.24)]">
            <div className="relative min-h-[66px] flex-1 overflow-hidden rounded-sm bg-[#080f1f]">
              <img src="/paintbrush.jpg" alt="Colourful paint and brush"
                className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070d1c]/90 via-[#070d1c]/50 to-[#070d1c]/20" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_15%,rgba(255,205,120,0.35),transparent_55%)]" />
              <div className="absolute inset-0 flex flex-col justify-end p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5b16d]">Welcome, parents</p>
                <h1 className="bw-join-headline mt-1 text-3xl font-black leading-none text-white">Bid. Win. Brag!</h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between rounded-lg border border-[#f3b16e]/35 bg-[#080f1f] px-3 py-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#16e777]">Raised tonight</p>
                <p className="text-2xl font-black leading-tight text-[#ffd47e]">R{parentRaisedTotal.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Artworks sold</p>
                <p className="text-xl font-black leading-tight text-white">{parentSoldCount}</p>
              </div>
            </div>

            <div className="bw-join-steps flex shrink-0 items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/75">
              <span><span className="text-[#16e777]">1</span> Join</span>
              <span><span className="text-[#ffd47e]">2</span> Enjoy the art</span>
              <span><span className="text-[#16e777]">3</span> Bid &amp; celebrate</span>
            </div>
          </section>

          <div className="shrink-0 space-y-2">
            <button type="button" onClick={handleWelcomeVoiceTap} onTouchEnd={handleWelcomeVoiceTap}
              disabled={welcomeVoiceLoading}
              className="w-full touch-manipulation rounded-lg border border-[#f3b16e]/40 bg-[#080f1f] px-3 py-2 text-sm font-black text-[#ffd47e] disabled:opacity-50">
              {welcomeVoiceLoading ? "Loading..." : welcomeVoicePlaying ? "🔊 Playing" : "🔊 Play Welcome"}
            </button>

            <input value={bidderName} onChange={(event) => setBidderName(event.target.value)}
              placeholder="Your bidder name" aria-label="Your bidder name" autoComplete="name"
              className="min-h-11 w-full rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-base font-semibold text-white outline-none placeholder:text-white/65 focus:border-[#ffd47e]" />

            <input type="email" value={bidderEmail} onChange={(event) => setBidderEmail(event.target.value)}
              placeholder="Your email address" aria-label="Your email address" autoComplete="email"
              className="min-h-11 w-full rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-base font-semibold text-white outline-none placeholder:text-white/65 focus:border-[#ffd47e]" />

            <button type="button"
              onTouchStart={() => { audioUnlockedRef.current = true; }}
              onMouseDown={() => { audioUnlockedRef.current = true; }}
              onClick={handleJoinAuction} disabled={joiningAuction}
              className="min-h-[54px] w-full touch-manipulation select-none rounded-full bg-[#13ed77] px-3 py-2 text-base font-black text-[#041424] shadow-[0_6px_24px_rgba(0,230,109,0.25)] active:scale-[0.98] disabled:opacity-50">
              {joiningAuction ? "JOINING AUCTION..." : "JOIN AUCTION & ENABLE SOUND"}
            </button>
          </div>

          <p className="bw-join-help shrink-0 px-2 text-center text-[10px] leading-tight text-white/65">
            On iPhone, turn Silent Mode off and volume up to hear the MC.
          </p>
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


          <h1 className="text-6xl font-black text-[#ffc857] mb-4 leading-none">Auction Complete</h1>


          <p className="text-xl font-bold text-white/80 leading-relaxed">The auction has ended. Thank you for supporting the young artists and the school fundraiser.</p>


          <div className="mt-6">


            <ParentRaisedTotalCard


              totalRaised={parentRaisedTotal}


              soldCount={parentSoldCount}


              compact


            />


          </div>


          <button onClick={() => setGalleryOpen(true)} className="mt-6 rounded-[24px] bg-[#16d66d] px-6 py-4 font-black text-[#07152b]">View Gallery</button>


          <GalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} artworks={artworks} auctionCode={auctionCode} bidderName={bidderName} openingBidAmount={bidIncrement} onRequestSaved={() => fetchPublicAuctionState(auctionCode)} />


        </div>


      </main>


    );


  }





  if (isWaiting) {
    return (
      <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#070d1c] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_16%,rgba(224,119,54,0.25),transparent_54%),linear-gradient(90deg,#170b12_0%,#070d1c_14%,#070d1c_86%,#170b12_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#862e20]/60 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#862e20]/60 to-transparent" />

        <GalleryModal
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          artworks={artworks}
          auctionCode={auctionCode}
          bidderName={bidderName}
          openingBidAmount={bidIncrement}
          onRequestSaved={() => fetchPublicAuctionState(auctionCode)}
        />

        <div className="relative mx-auto flex h-full min-h-0 w-full max-w-md flex-col gap-2 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-black leading-none tracking-tight">BragWall</p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-[#f5b16d]">
                Young Art. Big Pride.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="rounded-xl border border-[#ffc857]/55 px-4 py-2 text-sm font-black text-[#ffc857]"
            >
              Gallery
            </button>
          </header>

          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#c98c50]/80 bg-[#091226] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <img
              src="/paintbrush.jpg"
              alt="Colourful artwork while the auction gets ready"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#07152b]/30 via-[#07152b]/20 to-[#07152b]/95" />
            <div className="relative flex h-full min-h-0 flex-col justify-between p-4">
              <div className="self-start rounded-full border border-[#ffc857]/65 bg-[#07152b]/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffc857]">
                You are in
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc857]">
                  The show starts soon
                </p>
                <h1 className="mt-1 text-[clamp(2rem,10vw,3.5rem)] font-black leading-[0.95] tracking-tight text-white">
                  Waiting<br />room
                </h1>
                <p className="mt-2 max-w-xs text-sm font-semibold leading-snug text-white/85">
                  Enjoy the artwork. We will bring you into the auction when the host starts.
                </p>
              </div>
            </div>
          </section>

          <div className="shrink-0">
            <ParentRaisedTotalCard
              totalRaised={parentRaisedTotal}
              soldCount={parentSoldCount}
              compact
            />
          </div>

          <button
            type="button"
            onClick={toggleWaitingMusic}
            aria-pressed={waitingMusicPlaying}
            className="shrink-0 rounded-xl border border-[#ffc857]/65 bg-[#10192c] px-4 py-3 text-center text-sm font-black text-[#ffc857] active:scale-[0.98]"
          >
            {waitingMusicPlaying ? "Pause waiting-room music" : "Play waiting-room music"}
          </button>

          <p className="shrink-0 text-center text-[11px] font-semibold leading-tight text-white/70">
            {soundEnabled ? "Sound is on" : "Enable sound to hear the MC"} · Your screen updates automatically
          </p>
        </div>
      </main>
    );
  }





  return (


    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#070d1c] text-white">


      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_16%,rgba(224,119,54,0.28),transparent_54%),linear-gradient(90deg,#170b12_0%,#070d1c_12%,#070d1c_88%,#170b12_100%)]" />

      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#862e20]/60 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#862e20]/60 to-transparent" />





      <GalleryModal


        open={galleryOpen}


        onClose={() => setGalleryOpen(false)}


        artworks={artworks}


        auctionCode={auctionCode}


        bidderName={bidderName}


        openingBidAmount={bidIncrement}


        onRequestSaved={() => fetchPublicAuctionState(auctionCode)}


      />





      <AuctionFlashToast flash={auctionFlash?.kind === "bid" ? null : auctionFlash} />
      <SoldConfetti burstId={auctionFlash?.kind === "sold" ? auctionFlash.id : null} />


      <BidNoticeToast notice={bidNotice} />





      <header className="relative z-20 shrink-0 px-4 pb-2 pt-2.5">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black leading-none tracking-tight text-white">BragWall</p>
            <p className="mt-0.5 text-[9px] font-bold tracking-[0.12em] text-[#f5b16d]">Young Art. Big Pride.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setGalleryOpen(true)}
              className="min-h-10 rounded-lg px-2 text-sm font-black text-[#ffc07f]" aria-label="Open gallery">
              Gallery
            </button>
            <details className="relative">
              <summary aria-label="Auction details" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/25 text-lg font-black text-white">⋯</summary>
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[#e99061]/50 bg-[#07152b] p-3 text-xs font-bold text-white shadow-2xl">
                <p>Bidding as {bidderName}</p>
                <p className="mt-2">Raised tonight: R{parentRaisedTotal.toLocaleString()}</p>
                <p className="mt-1">Artworks sold: {parentSoldCount}</p>
                {topBidderRows.length > 0 && (
                  <p className="mt-2 text-white/70">Top bids: {topBidderRows.map((bidder) => `${bidder.name} R${bidder.amount}`).join(" · ")}</p>
                )}
              </div>
            </details>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-md truncate text-center text-base font-black leading-tight text-white">
          {auction.child_name} {auction.child_surname}
          {auction.grade ? <span className="font-semibold text-white/75"> · {auction.grade}</span> : null}
        </p>
      </header>

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


                        Your email has been saved automatically. You can correct it before the auction moves on.


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


                      : "Confirm Email"}


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


                    Next artwork starts in {soldEmailCaptureRemaining}s. If the winner does not enter an email, admin can follow up later.


                  </p>


                )}


              </div>


            </div>


          </motion.div>


        )}


      </AnimatePresence>





      <div className={`relative flex min-h-0 w-full max-w-md flex-1 flex-col gap-1.5 px-3 pb-1 pt-1 mx-auto ${isSold ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>


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
          <div className="shrink-0 rounded-xl bg-[#07152b] px-3 py-2 text-center text-sm font-black text-white">
            Next artwork starts in {secondsRemaining}s
          </div>
        )}

        {isPreparingIntro && (
          <div className="shrink-0 rounded-xl bg-[#07152b] px-3 py-2 text-center text-sm font-black text-white">
            🎙️ Preparing the MC intro. Bidding opens afterwards.
          </div>
        )}

        {isIntro && (
          <div className="shrink-0 rounded-xl bg-[#ffc857] p-2 text-center text-sm font-black text-[#07152b]">
            {mcAudioUrl && introAudioStatus !== "playing" ? (
              <button type="button" onClick={handleManualIntroAudioTap}
                onTouchEnd={handleManualIntroAudioTap}
                className="w-full rounded-xl bg-[#07152b] px-3 py-3 text-base font-black text-white touch-manipulation">
                🔊 Play MC voice · {introSecondsRemaining}s
              </button>
            ) : (
              <p className="py-2">{introAudioStatus === "playing" ? "🔊 MC voice playing now" : "🎙️ MC voice loading"} · {introSecondsRemaining}s</p>
            )}
          </div>
        )}

        {isStartingSoon && (
          <div className="shrink-0 rounded-xl bg-[#07152b] px-3 py-2 text-center text-sm font-black text-white">
            Bidding opens in <span className="text-[#16d66d]">{secondsRemaining}s</span>
          </div>
        )}

        <div className="flex min-h-[100px] flex-1 flex-col overflow-hidden rounded-[8px] border border-[#f3b16e]/70 bg-[#0a1221] p-1 shadow-[0_0_26px_rgba(241,143,65,0.24)]">


          <div className="flex min-h-0 flex-1 flex-col bg-[#0a1221]">


            <div className="flex min-h-0 flex-1 flex-col bg-[#0a1221]">


              <div className="flex min-h-0 flex-1 flex-col bg-[#0a1221]">


                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0a1221]">


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





                  <AnimatePresence>
                    {isArtworkRevealing && (
                      <motion.div
                        key={artworkRevealKey}
                        aria-label="Revealing the next artwork"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#070d1c]/95"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_90%,rgba(235,177,87,0.15),transparent_55%)]" />
                        <motion.div
                          aria-hidden="true"
                          initial={{ x: "-140%", opacity: 0 }}
                          animate={{ x: "130%", opacity: [0, 1, 0] }}
                          transition={{ duration: 2.6, ease: "easeInOut" }}
                          className="absolute -top-1/3 h-[160%] w-[65%] rotate-[24deg] bg-[linear-gradient(90deg,transparent,rgba(255,197,100,0.12),rgba(255,205,120,0.36),rgba(255,197,100,0.12),transparent)] blur-xl"
                        />
                        <div className="relative px-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f5b16d]">BragWall presents</p>
                          <p className="mt-4 font-serif text-4xl font-black tracking-[0.06em] text-[#ffd47e] drop-shadow-[0_0_20px_rgba(255,205,120,0.7)] sm:text-5xl">UP NEXT</p>
                          <div className="mx-auto mt-4 h-px w-36 bg-gradient-to-r from-transparent via-[#ffc877] to-transparent" />
                          <p className="mt-4 text-sm font-medium text-white/90">A new masterpiece is coming</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full border border-white/60 bg-[#f07549] px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white shadow-lg">
                    {auction.status === "open" || auction.status === "going once" || auction.status === "going twice" ? "● LIVE" :
                      auction.status === "paused" ? "PAUSED" :
                      auction.status === "intro" ? "MC INTRO" : "UP NEXT"}
                  </div>

                  <AnimatePresence mode="wait">
                    {auctionFlash?.kind === "bid" && (
                      <motion.div key={auctionFlash.id}
                        initial={{ opacity: 0, scale: 0.65 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.18 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#07152b]/25">
                        <div className="rounded-2xl border border-[#7bffb5] bg-[#07152b] px-5 py-3 text-center text-white shadow-[0_0_35px_rgba(22,214,109,0.55)]">
                          <p className="text-[10px] font-black uppercase">New bid!</p>
                          <p className="text-5xl font-black leading-none text-[#17eb78]">R{auction.current_bid.toLocaleString()}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute right-1 top-[38%] z-30 flex -translate-y-1/2 flex-col gap-2" aria-label="React to this artwork">
                    {([ ["heart", "❤️"], ["cheer", "🎉"], ["dance", "💃"] ] as const).map(([kind, emoji]) => (
                      <button key={kind} type="button" onClick={() => void sendReaction(kind)}
                        aria-label={kind === "heart" ? "Love this artwork" : kind === "cheer" ? "Cheer for this artwork" : "Dance for this artwork"}
                        disabled={!bidderContactId || !bidderToken || isSold}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-[#07152b]/85 text-xl shadow-[0_5px_14px_rgba(0,0,0,0.3)] backdrop-blur-sm disabled:opacity-40">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {activeReaction && (
                      <motion.div key={activeReaction.id} aria-hidden="true"
                        initial={{ opacity: 0, scale: 0.5, y: 30 }}
                        animate={{ opacity: 1, scale: 1.5, y: -25 }}
                        exit={{ opacity: 0, y: -80 }}
                        className="pointer-events-none absolute bottom-5 right-14 z-20 text-4xl">
                        {{ heart: "❤️", cheer: "🎉", dance: "💃" }[activeReaction.kind]}
                      </motion.div>
                    )}
                  </AnimatePresence>

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





          <div className="h-[2px] bg-[#f3b16e]/70" />


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


          className="shrink-0 border-t border-[#f3b16e]/35 bg-[#080f1f]/90 px-2 py-2.5 text-white"
        >
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">Highest bid</p>
              <p className="truncate text-3xl font-black leading-none text-[#16e777]">R{auction.current_bid.toLocaleString()}</p>
            </div>
            <div className="min-w-0 flex-[1.2] text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">Leading</p>
              <p className="truncate text-sm font-black text-white">{auction.leading_bidder}{auction.leading_bidder !== "No bids yet" ? " 👑" : ""}</p>
              <p className="mt-1 text-xs font-black text-[#17e777]">Next R{nextBidAmount.toLocaleString()}</p>
            </div>
          </div>
          <motion.p key={`${liveBidEnergyText}-${bidPulseKey}`}
            initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
            className="mt-1 truncate text-center text-[11px] font-semibold text-[#f7b883]">
            {liveBidEnergyText}
          </motion.p>
        </motion.div>





        {mcReaction && !isSold && (


          <motion.div


            key={mcReaction.id}


            initial={{ opacity: 0, y: 6 }}


            animate={{ opacity: 1, y: 0 }}


            className="shrink-0 rounded-[18px] border-2 border-[#ffc857] bg-[#07152b]/94 px-3 py-1.5 text-white shadow-lg"


          >


            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffc857]">


              AI MC


            </p>


            <p className="mt-0.5 text-xs font-black leading-snug">


              {mcReaction.text}


            </p>


          </motion.div>


        )}





        {(isBidPaused || isUrgency) && (


          <motion.div


            initial={{ opacity: 0, y: 8 }}


            animate={{ opacity: 1, y: 0 }}


            className={`shrink-0 rounded-xl px-3 py-1.5 shadow-lg border ${


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





                <div className="text-xl font-black leading-none">


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





                <div className="text-xl font-black leading-none">


                  R{nextBidAmount.toLocaleString()}


                </div>





                <p className="text-xs font-bold mt-1">


                  Do I hear R{nextBidAmount.toLocaleString()}?


                </p>


              </div>


            </div>


          </motion.div>


        )}







      </div>





      {!isSold && !isPreparingIntro && !isIntro && (
        <div className="relative z-10 shrink-0 border-t border-[#f3b16e]/25 bg-[#070d1c] px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
          <div className="mx-auto max-w-md">
            <p className="mb-1.5 truncate text-center text-xs font-semibold text-[#f6b681]">
              {isNextArtworkCountdown ? `Next artwork in ${secondsRemaining}s` :
                isStartingSoon ? `Bidding opens in ${secondsRemaining}s` :
                isUrgency ? `Last chance · ${secondsRemaining}s left` :
                isBidPaused ? `Next bid opens in ${pauseRemaining}s` :
                canBid ? `${bidderCounterLabel} · Tap to bid` :
                auction.status === "paused" ? "Auction paused · waiting for the host" :
                "Bidding opens after the MC intro"}
            </p>
            <motion.button whileTap={{ scale: canBid ? 0.97 : 1 }}
              onClick={() => placeBid(nextBidAmount)} disabled={!canBid}
              className="min-h-[54px] w-full rounded-full bg-[#13ed77] px-3 py-2 text-xl font-black text-[#041424] shadow-[0_6px_24px_rgba(0,230,109,0.25)] transition disabled:cursor-not-allowed disabled:bg-[#505b6e] disabled:text-white/80 disabled:shadow-none">
              {isNextArtworkCountdown ? `Next art in ${secondsRemaining}s` :
                isStartingSoon ? `Starts in ${secondsRemaining}s` :
                isBidPaused ? `Paused · ${pauseRemaining}s` :
                biddingNow ? "Placing Bid..." :
                auction.status === "paused" ? "Auction Paused" :
                canBid ? `Bid R${nextBidAmount.toLocaleString()}` : "Bidding Not Open"}
            </motion.button>
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





function BidNoticeToast({


  notice,


}: {


  notice: { id: number; title: string; message: string } | null;


}) {


  return (


    <AnimatePresence>


      {notice && (


        <motion.div


          key={notice.id}


          initial={{ opacity: 0, y: 14, scale: 0.96 }}


          animate={{ opacity: 1, y: 0, scale: 1 }}


          exit={{ opacity: 0, y: 14, scale: 0.96 }}


          transition={{ duration: 0.22 }}


          className="pointer-events-none fixed inset-x-0 bottom-[118px] z-[75] px-4"


        >


          <div className="mx-auto max-w-md">


            <div className="mx-auto max-w-[350px] rounded-[28px] border-4 border-[#ffc857] bg-[#07152b]/96 px-5 py-4 text-center text-white shadow-[0_24px_60px_rgba(7,21,43,0.36)] backdrop-blur-md">


              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc857]">


                Auction update


              </p>


              <p className="mt-1 text-2xl font-black leading-tight">


                {notice.title}


              </p>


              <p className="mt-2 text-sm font-extrabold leading-snug text-white/78">


                {notice.message}


              </p>


            </div>


          </div>


        </motion.div>


      )}


    </AnimatePresence>


  );


}





// BRAGWALL_SOLD_CONFETTI_V1: visual only; uses the existing SOLD flash.
function SoldConfetti({ burstId }: { burstId: number | null }) {
  const colors = ["#ffd47e", "#13ed77", "#ffffff", "#f3b16e"];

  return (
    <AnimatePresence>
      {burstId !== null && (
        <div
          key={burstId}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
        >
          <style>{`@media (prefers-reduced-motion: reduce) {
            .bragwall-sold-confetti { display: none; }
          }`}</style>

          {Array.from({ length: 28 }, (_, index) => (
            <motion.span
              key={index}
              className="bragwall-sold-confetti absolute top-0 block rounded-[2px]"
              style={{
                left: `${(index * 37 + 11) % 100}%`,
                width: index % 3 === 0 ? 9 : 6,
                height: index % 3 === 0 ? 15 : 10,
                backgroundColor: colors[index % colors.length],
              }}
              initial={{ opacity: 0, y: -25, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: "55vh",
                rotate: index % 2 ? 420 : -420,
              }}
              transition={{
                duration: 1.9,
                delay: (index % 6) * 0.07,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
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


          className="pointer-events-none fixed inset-x-0 top-[76px] z-[70] px-4"


        >


          <div className="mx-auto max-w-md">


            <div


              className={`mx-auto max-w-[300px] rounded-[22px] border-2 px-4 py-2.5 text-center shadow-[0_14px_32px_rgba(7,21,43,0.24)] backdrop-blur-md ${


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





              <p className="mt-0.5 text-xl font-black leading-none tracking-[-0.04em]">


                {flash.title}


              </p>





              <p className="mt-1 text-xs font-black leading-tight opacity-85">


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


  auctionCode,


  bidderName,


  openingBidAmount,


  onRequestSaved,


}: {


  open: boolean;


  onClose: () => void;


  artworks: Artwork[];


  auctionCode: string;


  bidderName: string;


  openingBidAmount: number;


  onRequestSaved: () => Promise<void> | void;


}) {


  const [requestEmails, setRequestEmails] = useState<Record<string, string>>({});


  const [submittingRequestIds, setSubmittingRequestIds] = useState<Record<string, boolean>>({});


  const [requestedIds, setRequestedIds] = useState<Record<string, boolean>>({});


  const [claimEmails, setClaimEmails] = useState<Record<string, string>>({});


  const [claimSubmitting, setClaimSubmitting] = useState<Record<string, boolean>>({});


  const [claimCompleted, setClaimCompleted] = useState<Record<string, boolean>>({});





  async function submitSoldArtworkEmail(artwork: Artwork) {


    const email = String(claimEmails[artwork.id] || "")


      .trim()


      .toLowerCase();





    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {


      alert("Please enter a valid email address.");


      return;


    }





    if (auctionCode !== "rynfieldgrade1") {


      alert("Email recovery is not available for this auction.");


      return;


    }





    if (!window.confirm("Submit this email address for the selected sold artwork?")) {


      return;


    }





    setClaimSubmitting((current) => ({


      ...current,


      [artwork.id]: true,


    }));





    try {


      const response = await fetch("/api/claim-sold-artwork", {


        method: "POST",


        headers: {


          "Content-Type": "application/json",


        },


        body: JSON.stringify({


          auctionCode,


          artworkId: artwork.id,


          email,


        }),


      });





      const result = await response.json().catch(() => null);





      if (!response.ok) {


        throw new Error(result?.error || "Could not save email.");


      }





      setClaimCompleted((current) => ({


        ...current,


        [artwork.id]: true,


      }));





      await onRequestSaved();





      alert("Thank you! Your email has been received.");





    } catch (error) {


      alert(


        error instanceof Error


          ? error.message


          : "Could not save email."


      );


    } finally {


      setClaimSubmitting((current) => ({


        ...current,


        [artwork.id]: false,


      }));


    }


  }


  async function submitUnsoldInvoiceRequest(artwork: Artwork) {


    const cleanEmail = String(requestEmails[artwork.id] || "").trim().toLowerCase();


    const cleanBidderName = bidderName.trim();





    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {


      alert("Please enter a valid email address.");


      return;


    }





    setSubmittingRequestIds((current) => ({ ...current, [artwork.id]: true }));





    try {


      const response = await fetch("/api/request-unsold-invoice", {


        method: "POST",


        headers: {


          "Content-Type": "application/json",


        },


        body: JSON.stringify({


          auctionCode,


          artworkId: artwork.id,


          bidderName: cleanBidderName,


          email: cleanEmail,


          openingBidAmount,


        }),


      });





      const result = await response.json().catch(() => null);





      if (!response.ok) {


        throw new Error(result?.error || "Could not request invoice.");


      }





      setRequestedIds((current) => ({ ...current, [artwork.id]: true }));


      await onRequestSaved();


    } catch (error) {


      alert(error instanceof Error ? error.message : "Could not request invoice.");


    } finally {


      setSubmittingRequestIds((current) => ({ ...current, [artwork.id]: false }));


    }


  }





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


                const isArchivedArtwork = artwork.status === "archived";


                const isAfterAuctionRequest = artwork.status === "after_auction_request" || Boolean(artwork.invoice_email_requested) || Boolean(requestedIds[artwork.id]);


                const isLiveArtwork = artwork.status === "live";


                const requestEmailValue = requestEmails[artwork.id] || "";


                const isSubmittingRequest = Boolean(submittingRequestIds[artwork.id]);


                const safeOpeningBidAmount = Math.max(Number(openingBidAmount || 0), DEFAULT_BID_STEP);





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
                              loading="lazy"
                              decoding="async"


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


                            : isArchivedArtwork || isAfterAuctionRequest


                            ? "bg-[#ff6b8a] text-white"


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


                            : isAfterAuctionRequest


                            ? "Requested"


                            : isArchivedArtwork


                            ? "Available"


                            : isLiveArtwork


                            ? "Live"


                            : "Upcoming"}


                        </p>


                      </div>


                    </div>





                    {isArchivedArtwork && !isAfterAuctionRequest && (


                      <div className="mt-4 rounded-[22px] bg-[#ff6b8a]/12 border border-[#ff6b8a]/25 text-[#07152b] p-4">


                        <p className="uppercase tracking-[0.25em] text-[9px] text-[#ef2b20] font-black mb-2">


                          Available after auction


                        </p>





                        <p className="text-sm font-black leading-relaxed">


                          No bids were received during the live round. This artwork is still available at the opening bid amount of R{safeOpeningBidAmount.toLocaleString()}. Enter your email and we’ll prepare an invoice request for the school to follow up.


                        </p>





                        <div className="mt-4 space-y-3">


                          <input


                            value={requestEmailValue}


                            onChange={(event) =>


                              setRequestEmails((current) => ({


                                ...current,


                                [artwork.id]: event.target.value,


                              }))


                            }


                            placeholder="Email for invoice"


                            type="email"


                            className="w-full rounded-[18px] border-2 border-[#07152b]/10 bg-white px-4 py-3 text-sm font-black text-[#07152b] outline-none focus:border-[#16d66d]"


                          />





                          <button


                            type="button"


                            onClick={() => submitUnsoldInvoiceRequest(artwork)}


                            disabled={isSubmittingRequest}


                            className="w-full rounded-[20px] bg-[#07152b] px-4 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"


                          >


                            {isSubmittingRequest


                              ? "Requesting invoice..."


                              : `Request invoice - R${safeOpeningBidAmount.toLocaleString()}`}


                          </button>


                        </div>


                      </div>


                    )}





                    {isAfterAuctionRequest && !isSoldArtwork && (


                      <div className="mt-4 rounded-[22px] bg-[#16d66d]/12 border border-[#16d66d]/30 text-[#07152b] p-4">


                        <p className="uppercase tracking-[0.25em] text-[9px] text-[#16a064] font-black mb-2">


                          Invoice requested


                        </p>





                        <p className="text-sm font-black leading-relaxed">


                          Thank you — your after-auction invoice request has been received. The school can now see this artwork in Sales Records and follow up with an invoice.


                        </p>


                      </div>


                    )}





                    {isSoldArtwork &&


                      auctionCode === "rynfieldgrade1" &&


                      !artwork.invoice_email_requested &&


                      !claimCompleted[artwork.id] && (


                        <div className="mt-4 rounded-[22px] border-2 border-[#16d66d] bg-[#16d66d]/10 p-4 text-[#07152b]">


                          <p className="mb-2 text-lg font-black">


                            Did you win this artwork?


                          </p>





                          <p className="mb-3 text-sm font-bold">


                            If you missed the email submission after winning,


                            enter your email address below so the school can


                            contact you about your artwork.


                          </p>





                          <input


                            type="email"


                            value={claimEmails[artwork.id] || ""}


                            onChange={(event) =>


                              setClaimEmails((current) => ({


                                ...current,


                                [artwork.id]: event.target.value,


                              }))


                            }


                            placeholder="Your email address"


                            className="mb-3 w-full rounded-[18px] border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold text-[#07152b] outline-none focus:border-[#16d66d]"


                          />





                          <button


                            type="button"


                            onClick={() => submitSoldArtworkEmail(artwork)}


                            disabled={Boolean(claimSubmitting[artwork.id])}


                            className="w-full rounded-[18px] bg-[#07152b] px-4 py-3 font-black text-white disabled:opacity-50"


                          >


                            {claimSubmitting[artwork.id]


                              ? "Submitting..."


                              : "Add My Email"}


                          </button>


                        </div>


                      )}





                    {isSoldArtwork &&


                      auctionCode === "rynfieldgrade1" &&


                      claimCompleted[artwork.id] && (


                        <div className="mt-4 rounded-[22px] bg-[#16d66d]/15 p-4 text-[#07152b]">


                          <p className="font-black">


                            Email received successfully!


                          </p>


                          <p className="mt-1 text-sm font-bold">


                            Thank you. The school can now follow up with you.


                          </p>


                        </div>


                      )}


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

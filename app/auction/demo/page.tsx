"use client";

import { useEffect, useRef, useState } from "react";
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
};

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
};

type Activity = {
  id: string;
  message: string;
  created_at: string;
};

const fallbackCommentary = [
  "The room is warming up beautifully. Someone is about to make a bold emotional decision.",
  "Bragging rights are officially on the table.",
  "Parents, grandparents, and competitive uncles — this is your moment.",
  "This masterpiece is looking dangerously collectible.",
];

export default function DemoAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bidderName, setBidderName] = useState("");
  const [joined, setJoined] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [commentIndex, setCommentIndex] = useState(0);

  const previousStatusRef = useRef<string | null>(null);
  const previousLeaderRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);

  function playSound(src: string) {
    if (!audioUnlockedRef.current) return;

    const audio = new Audio(src);
    audio.volume = 0.65;
    audio.play().catch(() => {});
  }

  useEffect(() => {
    fetchAuction();
    fetchBids();
    fetchActivities();

    const auctionChannel = supabase
      .channel("bw-parent-clean-activity-auction")
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

          if (
            previousLeaderRef.current &&
            previousLeaderRef.current !== updated.leading_bidder &&
            updated.leading_bidder !== "No bids yet"
          ) {
            playSound("/sounds/bid-ding.mp3");
          }

          previousStatusRef.current = updated.status;
          previousLeaderRef.current = updated.leading_bidder;

          setAuction(updated);
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bw-parent-clean-activity-bids")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
          filter: "auction_code=eq.demo",
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel("bw-parent-clean-activity-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_activity_feed",
          filter: "auction_code=eq.demo",
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (auction?.status_deadline) {
        const remaining = Math.max(
          0,
          Math.floor(
            (new Date(auction.status_deadline).getTime() - Date.now()) / 1000
          )
        );

        setSecondsRemaining(remaining);
      } else {
        setSecondsRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCommentIndex((current) => (current + 1) % fallbackCommentary.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    if (data) {
      setAuction(data);
      previousStatusRef.current = data.status;
      previousLeaderRef.current = data.leading_bidder;
    }
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", "demo")
      .order("amount", { ascending: false });

    setBids(data || []);
  }

  async function fetchActivities() {
    const { data } = await supabase
      .from("live_activity_feed")
      .select("*")
      .eq("auction_code", "demo")
      .order("created_at", { ascending: false })
      .limit(6);

    setActivities(data || []);
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: "demo",
      message,
    });
  }

  async function placeBid(increment: number) {
    if (!auction) return;

    if (auction.status === "sold") {
      alert("This artwork has already been sold.");
      return;
    }

    if (auction.status === "waiting") {
      alert("Auction has not started yet.");
      return;
    }

    const amount = auction.current_bid + increment;

    const { error: bidError } = await supabase.from("live_bids").insert({
      auction_code: "demo",
      bidder_name: bidderName,
      amount,
    });

    if (bidError) {
      alert(bidError.message);
      return;
    }

    const commentary =
      amount >= 2000
        ? `${bidderName} has pushed this masterpiece to R${amount.toLocaleString()}. At this point, the fridge door may need security.`
        : `${bidderName} jumps in at R${amount.toLocaleString()}. The room is warming up and the artwork is enjoying the attention.`;

    const { error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder: bidderName,
        mc_commentary: commentary,
      })
      .eq("auction_code", "demo");

    if (updateError) {
      alert(updateError.message);
      return;
    }

    await addActivity(`${bidderName} bid R${amount.toLocaleString()}`);
  }

  const dynamicArtworkStory =
    auction?.mc_commentary ||
    fallbackCommentary[commentIndex] ||
    "Parents, prepare yourselves. Tonight’s masterpieces may cause sudden generosity, family rivalry, and fridge-door upgrades.";

  if (!joined) {
    return (
      <main className="min-h-screen bg-[#fbf8f1] text-[#07152b] px-5 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <BrandHeader center />
          </div>

          <div className="bg-white rounded-[40px] p-7 shadow-2xl border border-black/5 mb-6">
            <p className="uppercase tracking-[0.35em] text-xs text-[#0b63ce] font-black mb-4">
              Welcome Parents
            </p>

            <h1 className="text-5xl font-black leading-[0.95] mb-5">
              Welcome to tonight’s BragWall auction.
            </h1>

            <p className="text-slate-600 text-lg leading-relaxed mb-7">
              Tonight we celebrate young creativity, raise funds for the school,
              and give a few proud families serious bragging rights.
            </p>

            <div className="grid gap-3 mb-7">
              <WelcomeStep
                number="1"
                title="Join with your bidder name"
                text="Use your name or family name so the school knows who won."
              />

              <WelcomeStep
                number="2"
                title="Bid live from your phone"
                text="Tap +R100, +R200, or +R300 while the artwork is live."
              />

              <WelcomeStep
                number="3"
                title="Win, pay, and collect"
                text="If you win, your certificate and payment details appear after SOLD."
              />
            </div>

            <div className="bg-[#07152b] text-white rounded-[28px] p-6 mb-6">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                Tonight’s Featured Artwork
              </p>

              <p className="text-xl font-black leading-relaxed">
                “{dynamicArtworkStory}”
              </p>
            </div>

            <input
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
              placeholder="Example: Darren S"
              className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg mb-4 outline-none"
            />

            <button
              onClick={() => {
                if (bidderName.trim()) {
                  audioUnlockedRef.current = true;
                  setJoined(true);

                  if (auction?.status !== "waiting") {
                    addActivity(`${bidderName} joined the auction`);
                  }
                }
              }}
              className="w-full bg-[#07152b] text-white rounded-2xl py-5 font-black text-xl shadow-xl"
            >
              ENTER AUCTION
            </button>
          </div>

          <p className="text-center text-slate-400 font-bold">
            Young Art • Big Pride
          </p>
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

  const sold = auction.status === "sold";
  const waiting = auction.status === "waiting";
  const urgency =
    auction.status === "going once" || auction.status === "going twice";

  const commentary = auction.mc_commentary || fallbackCommentary[commentIndex];

  if (waiting) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white px-5 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-[32px] p-6 mb-8">
            <BrandHeader />
          </div>

          <div className="bg-white/10 border border-white/10 rounded-[36px] p-8 shadow-2xl">
            <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
              Parent Waiting Room
            </p>

            <h1 className="text-6xl font-black leading-none mb-6">
              You’re in. Auction starts soon.
            </h1>

            <p className="text-white/70 text-xl leading-relaxed mb-8">
              Keep this page open. When the school starts the auction, the first
              artwork will appear automatically.
            </p>

            <div className="bg-white/10 rounded-[28px] p-6 mb-6">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                How bidding works
              </p>

              <div className="space-y-3 text-white/80 font-bold">
                <p>• Watch the featured artwork go live.</p>
                <p>• Tap a bid button to raise the price.</p>
                <p>• If you win, download your winner certificate.</p>
              </div>
            </div>

            <div className="bg-[#16d66d] text-[#07152b] rounded-[28px] p-6">
              <p className="uppercase tracking-[0.3em] text-xs font-black mb-3">
                Tonight’s Featured Artwork
              </p>

              <p className="text-2xl leading-relaxed font-black">
                “{commentary}”
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b] pb-40">
      <div className="sticky top-0 z-40 bg-[#f7f5f0]/90 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <BrandHeader />

            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-black mb-1">
                Bidding As
              </p>

              <p className="font-black">{bidderName}</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {sold && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#07152b]/95 z-50 flex items-center justify-center px-6"
          >
            <div className="text-center text-white max-w-md">
              <motion.div
                initial={{ rotate: -90, y: -120 }}
                animate={{ rotate: 0, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-[130px] mb-3"
              >
                🔨
              </motion.div>

              <h1 className="text-[90px] font-black leading-none text-[#ef2b20] mb-5">
                SOLD
              </h1>

              <p className="uppercase tracking-[0.35em] text-xs text-white/50 mb-4">
                Winning Bidder
              </p>

              <h2 className="text-5xl font-black mb-6">
                {auction.leading_bidder}
              </h2>

              <div className="inline-block bg-[#16d66d] text-[#07152b] rounded-[28px] px-8 py-5 mb-8 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-xs mb-2">
                  Winning Bid
                </p>

                <div className="text-5xl font-black">
                  R{auction.current_bid.toLocaleString()}
                </div>
              </div>

              <a
                href="/auction/winner"
                className="bg-white text-[#07152b] rounded-[28px] px-8 py-5 inline-block font-black text-xl"
              >
                View / Download Certificate
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-5 py-6">
        <div className="mb-6">
          <p className="uppercase tracking-[0.35em] text-xs text-[#0b63ce] font-black mb-3">
            Live Auction
          </p>

          <h1 className="text-5xl font-black leading-tight">
            {auction.child_name} {auction.child_surname}
          </h1>

          <p className="text-slate-500 text-lg mt-2">{auction.grade}</p>
        </div>

        {urgency && (
          <motion.div
            animate={{
              scale: auction.status === "going twice" ? [1, 1.03, 1] : 1,
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
            }}
            className={`rounded-[32px] p-6 mb-6 shadow-2xl text-center ${
              auction.status === "going once"
                ? "bg-[#16d66d] text-[#07152b]"
                : "bg-[#ef2b20] text-white"
            }`}
          >
            <p className="uppercase tracking-[0.3em] text-xs font-black mb-3 opacity-70">
              Bidding Closes Soon
            </p>

            <div className="text-7xl font-black leading-none mb-4">
              {secondsRemaining}s
            </div>

            <div className="text-2xl font-black">
              {auction.status === "going once" ? "GOING ONCE" : "GOING TWICE"}
            </div>
          </motion.div>
        )}

        <div className="relative mb-6">
          <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">
            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">
              <div className="bg-[#f8f5ef] rounded-[24px] p-5">
                <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">
                  <img
                    src={auction.artwork_url}
                    alt="Artwork"
                    className="w-full max-h-[520px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          key={commentary}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#07152b] text-white rounded-[32px] p-6 mb-6 shadow-xl"
        >
          <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
            AI Auction MC Story
          </p>

          <p className="text-2xl leading-relaxed font-black">
            “{commentary}”
          </p>
        </motion.div>

        {activities.length > 0 && (
          <div className="bg-[#07152b] text-white rounded-[28px] p-5 mb-6 shadow-xl">
            <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
              Live Activity
            </p>

            <div className="space-y-3">
              {activities.slice(0, 4).map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-lg font-bold text-white/85"
                >
                  • {activity.message}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <motion.div
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 0.5,
          }}
          className="bg-white rounded-[32px] p-6 shadow-xl border border-black/5 mb-5"
        >
          <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
            Current Highest Bid
          </p>

          <h2 className="text-7xl font-black text-[#16d66d] leading-none">
            R{auction.current_bid.toLocaleString()}
          </h2>

          <p className="text-slate-500 text-lg mt-4">
            Leading bidder:{" "}
            <span className="font-black text-[#07152b]">
              {auction.leading_bidder}
            </span>
          </p>
        </motion.div>

        <div className="bg-white rounded-[32px] shadow-xl border border-black/5 overflow-hidden mb-5">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-2xl font-black">Live Bid Tower</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {bids.length === 0 && (
              <div className="p-5 text-slate-400 font-bold">
                No bids yet.
              </div>
            )}

            {bids.map((bid, index) => (
              <motion.div
                key={bid.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className={`p-5 flex items-center justify-between ${
                  index === 0 ? "bg-[#16d66d]/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {index === 0 && <div className="text-2xl">👑</div>}

                  <span className="font-black text-lg">{bid.bidder_name}</span>
                </div>

                <span className="text-[#16d66d] font-black text-2xl">
                  R{bid.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {!sold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {[100, 200, 300].map((increment) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={increment}
                  onClick={() => placeBid(increment)}
                  className="rounded-[24px] py-5 font-black text-2xl shadow-lg transition text-white disabled:opacity-40"
                  disabled={
                    auction.status === "sold" || auction.status === "waiting"
                  }
                  style={{
                    background:
                      increment === 100
                        ? "#16b85d"
                        : increment === 200
                        ? "#ffc107"
                        : "#ef2b20",
                    color: increment === 200 ? "#07152b" : "white",
                  }}
                >
                  +R{increment}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function WelcomeStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 bg-[#f7f5f0] rounded-[24px] p-4">
      <div className="w-11 h-11 rounded-full bg-[#07152b] text-white flex items-center justify-center font-black shrink-0">
        {number}
      </div>

      <div>
        <h3 className="font-black text-lg">{title}</h3>
        <p className="text-slate-500 font-bold">{text}</p>
      </div>
    </div>
  );
}
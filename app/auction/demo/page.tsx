"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  "The room is warming up beautifully.",
  "Someone is preparing a financially questionable decision.",
  "Grandparents are entering dangerous territory.",
  "This masterpiece is becoming highly collectible.",
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
      .channel("bw-mobile-auction-sound")
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
      .channel("bw-mobile-bids-sound")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_bids",
        },
        (payload) => {
          playSound("/sounds/bid-ding.mp3");

          setBids((current) =>
            [payload.new as Bid, ...current].sort((a, b) => b.amount - a.amount)
          );
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel("bw-mobile-feed-sound")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_activity_feed",
        },
        (payload) => {
          setActivities((current) => [payload.new as Activity, ...current]);
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

    setAuction(data);
    previousStatusRef.current = data?.status || null;
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
      .limit(8);

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

    const commentary = `${bidderName} just pushed the bidding to R${amount.toLocaleString()}.`;

    await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder: bidderName,
        mc_commentary: commentary,
      })
      .eq("auction_code", "demo");

    await addActivity(`${bidderName} bid R${amount.toLocaleString()}`);
  }

  if (!joined) {
    return (
      <main className="min-h-screen bg-[#f7f5f0] flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-white rounded-[36px] p-8 shadow-2xl border border-black/5">
          <div className="mb-8">
            <BrandHeader />
          </div>

          <h1 className="text-5xl font-black text-[#07152b] leading-tight mb-5">
            Join tonight’s auction.
          </h1>

          <p className="text-slate-500 text-lg mb-8">
            Enter your bidder name and prepare for emotional financial decisions.
          </p>

          <input
            value={bidderName}
            onChange={(e) => setBidderName(e.target.value)}
            placeholder="Example: Darren S"
            className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg mb-5 outline-none"
          />

          <button
            onClick={() => {
              if (bidderName.trim()) {
                audioUnlockedRef.current = true;
                setJoined(true);
                addActivity(`${bidderName} joined the auction`);
              }
            }}
            className="w-full bg-[#07152b] text-white rounded-2xl py-5 font-black text-xl shadow-xl"
          >
            ENTER AUCTION
          </button>
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
  const urgency = auction.status === "going once" || auction.status === "going twice";
  const commentary = auction.mc_commentary || fallbackCommentary[commentIndex];

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
            <div className="text-center text-white max-w-3xl">
              <motion.div
                initial={{ rotate: -90, y: -120 }}
                animate={{ rotate: 0, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-[140px] mb-5"
              >
                🔨
              </motion.div>

              <h1 className="text-[110px] font-black leading-none text-[#ef2b20] mb-6">
                SOLD
              </h1>

              <p className="uppercase tracking-[0.35em] text-sm text-white/50 mb-4">
                Winning Bidder
              </p>

              <h2 className="text-6xl font-black mb-8">
                {auction.leading_bidder}
              </h2>

              <div className="inline-block bg-[#16d66d] text-[#07152b] rounded-[32px] px-10 py-6 mb-8 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-sm mb-2">
                  Winning Bid
                </p>

                <div className="text-6xl font-black">
                  R{auction.current_bid.toLocaleString()}
                </div>
              </div>

              <a
                href="/auction/winner"
                className="bg-white text-[#07152b] rounded-[28px] px-8 py-5 inline-block font-black text-xl"
              >
                View Certificate
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-5 py-6">
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

        {urgency && (
          <motion.div
            animate={{
              scale: auction.status === "going twice" ? [1, 1.03, 1] : 1,
            }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className={`
              rounded-[32px] p-6 mb-6 shadow-2xl text-center
              ${
                auction.status === "going once"
                  ? "bg-[#16d66d] text-[#07152b]"
                  : "bg-[#ef2b20] text-white"
              }
            `}
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

        <motion.div
          key={commentary}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#07152b] text-white rounded-[32px] p-6 mb-6 shadow-xl"
        >
          <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
            AI Auction MC
          </p>

          <p className="text-2xl leading-relaxed font-black">“{commentary}”</p>
        </motion.div>

        <div className="relative mb-8">
          <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">
            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">
              <div className="bg-[#f8f5ef] rounded-[24px] p-5">
                <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">
                  <img
                    src={auction.artwork_url}
                    alt="Artwork"
                    className="w-full max-h-[620px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-xl border border-black/5 mb-5">
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
        </div>

        <div className="bg-white rounded-[32px] shadow-xl border border-black/5 overflow-hidden mb-5">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-2xl font-black">Live Bid Tower</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {bids.map((bid, index) => (
              <div
                key={bid.id}
                className="p-5 flex items-center justify-between"
              >
                <span className="font-black text-lg">
                  {index === 0 ? "🏆 " : ""}
                  {bid.bidder_name}
                </span>

                <span className="text-[#16d66d] font-black text-2xl">
                  R{bid.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!sold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {[100, 200, 300].map((increment) => (
                <button
                  key={increment}
                  onClick={() => placeBid(increment)}
                  className="rounded-[24px] py-5 font-black text-2xl shadow-lg active:scale-95 transition text-white"
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
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
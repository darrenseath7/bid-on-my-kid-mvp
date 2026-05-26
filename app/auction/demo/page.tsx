"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";

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
};

const fallbackCommentary = [
  "The room is warming up beautifully.",
  "Grandparents are entering dangerous territory.",
  "Someone is preparing a financially questionable decision.",
  "This masterpiece is becoming highly collectible.",
];

export default function DemoAuctionPage() {
  const [auction, setAuction] =
    useState<AuctionState | null>(null);

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [bidderName, setBidderName] =
    useState("");

  const [joined, setJoined] =
    useState(false);

  const [secondsRemaining, setSecondsRemaining] =
    useState(0);

  const [commentIndex, setCommentIndex] =
    useState(0);

  const previousLeaderRef =
    useRef<string | null>(null);

  const audioUnlockedRef =
    useRef(false);

  function playSound(src: string) {
    if (!audioUnlockedRef.current)
      return;

    const audio = new Audio(src);

    audio.volume = 0.65;

    audio.play().catch(() => {});
  }

  useEffect(() => {
    fetchAuction();
    fetchBids();
    fetchActivities();

    const auctionChannel = supabase
      .channel(
        "bw-leaderboard-auction"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "live_auction_state",
          filter:
            "auction_code=eq.demo",
        },
        (payload) => {
          const updated =
            payload.new as AuctionState;

          if (
            previousLeaderRef.current &&
            previousLeaderRef.current !==
              updated.leading_bidder
          ) {
            playSound(
              "/sounds/bid-ding.mp3"
            );
          }

          previousLeaderRef.current =
            updated.leading_bidder;

          setAuction(updated);
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(
        "bw-leaderboard-bids"
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_bids",
        },
        (payload) => {
          setBids((current) =>
            [
              payload.new as Bid,
              ...current,
            ].sort(
              (a, b) =>
                b.amount - a.amount
            )
          );
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel(
        "bw-leaderboard-activity"
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "live_activity_feed",
        },
        (payload) => {
          setActivities(
            (current) => [
              payload.new as Activity,
              ...current,
            ]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        auctionChannel
      );
      supabase.removeChannel(
        bidsChannel
      );
      supabase.removeChannel(
        activityChannel
      );
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        auction?.status_deadline
      ) {
        const remaining =
          Math.max(
            0,
            Math.floor(
              (
                new Date(
                  auction.status_deadline
                ).getTime() -
                Date.now()
              ) / 1000
            )
          );

        setSecondsRemaining(
          remaining
        );
      }
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCommentIndex(
        (current) =>
          (current + 1) %
          fallbackCommentary.length
      );
    }, 6000);

    return () =>
      clearInterval(interval);
  }, []);

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    setAuction(data);

    previousLeaderRef.current =
      data?.leading_bidder || null;
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", "demo")
      .order("amount", {
        ascending: false,
      });

    setBids(data || []);
  }

  async function fetchActivities() {
    const { data } = await supabase
      .from("live_activity_feed")
      .select("*")
      .eq("auction_code", "demo")
      .order("created_at", {
        ascending: false,
      })
      .limit(8);

    setActivities(data || []);
  }

  async function addActivity(
    message: string
  ) {
    await supabase
      .from("live_activity_feed")
      .insert({
        auction_code: "demo",
        message,
      });
  }

  async function placeBid(
    increment: number
  ) {
    if (!auction) return;

    const amount =
      auction.current_bid +
      increment;

    await supabase
      .from("live_bids")
      .insert({
        auction_code: "demo",
        bidder_name: bidderName,
        amount,
      });

    await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder:
          bidderName,
        mc_commentary:
          `${bidderName} just pushed the bidding to R${amount.toLocaleString()}.`,
      })
      .eq("auction_code", "demo");

    await addActivity(
      `${bidderName} bid R${amount.toLocaleString()}`
    );
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
            onChange={(e) =>
              setBidderName(
                e.target.value
              )
            }
            placeholder="Example: Darren S"
            className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg mb-5 outline-none"
          />

          <button
            onClick={() => {
              if (
                bidderName.trim()
              ) {
                audioUnlockedRef.current =
                  true;

                setJoined(true);

                addActivity(
                  `${bidderName} joined the auction`
                );
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
        Loading...
      </main>
    );
  }

  const sold =
    auction.status === "sold";

  const urgency =
    auction.status ===
      "going once" ||
    auction.status ===
      "going twice";

  const commentary =
    auction.mc_commentary ||
    fallbackCommentary[
      commentIndex
    ];

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b] pb-40">

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-[#f7f5f0]/90 backdrop-blur border-b border-black/5">

        <div className="max-w-md mx-auto px-5 py-4">

          <div className="flex items-center justify-between">

            <BrandHeader />

            <div className="text-right">

              <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-black mb-1">
                Bidding As
              </p>

              <p className="font-black">
                {bidderName}
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* MAIN */}
      <div className="max-w-md mx-auto px-5 py-6">

        {/* ACTIVITY */}
        <div className="bg-[#07152b] text-white rounded-[28px] p-5 mb-6 shadow-xl">

          <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
            Live Activity
          </p>

          <div className="space-y-3">

            {activities
              .slice(0, 4)
              .map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{
                    opacity: 0,
                    x: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  className="text-lg font-bold text-white/85"
                >
                  • {activity.message}
                </motion.div>
              ))}

          </div>

        </div>

        {/* COUNTDOWN */}
        {urgency && (
          <motion.div
            animate={{
              scale:
                auction.status ===
                "going twice"
                  ? [1, 1.03, 1]
                  : 1,
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
            }}
            className={`
              rounded-[32px]
              p-6
              mb-6
              shadow-2xl
              text-center
              ${
                auction.status ===
                "going once"
                  ? "bg-[#16d66d] text-[#07152b]"
                  : "bg-[#ef2b20] text-white"
              }
            `}
          >

            <div className="text-7xl font-black leading-none mb-4">
              {
                secondsRemaining
              }
              s
            </div>

          </motion.div>
        )}

        {/* AI MC */}
        <motion.div
          key={commentary}
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-[#07152b] text-white rounded-[32px] p-6 mb-6 shadow-xl"
        >

          <p className="text-2xl leading-relaxed font-black">
            “{commentary}”
          </p>

        </motion.div>

        {/* ARTWORK */}
        <div className="relative mb-8">

          <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">

            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">

              <div className="bg-[#f8f5ef] rounded-[24px] p-5">

                <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">

                  <img
                    src={
                      auction.artwork_url
                    }
                    alt="Artwork"
                    className="w-full max-h-[620px] object-contain"
                  />

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* CURRENT BID */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 0.5,
          }}
          className="bg-white rounded-[32px] p-6 shadow-xl border border-black/5 mb-5"
        >

          <h2 className="text-7xl font-black text-[#16d66d] leading-none">
            R
            {auction.current_bid.toLocaleString()}
          </h2>

          <p className="text-slate-500 text-lg mt-4">
            Leading bidder:
            {" "}
            <span className="font-black text-[#07152b]">
              {
                auction.leading_bidder
              }
            </span>
          </p>

        </motion.div>

        {/* LEADERBOARD */}
        <div className="bg-white rounded-[32px] shadow-xl border border-black/5 overflow-hidden mb-5">

          <div className="p-5 border-b border-slate-100">

            <h3 className="text-2xl font-black">
              Live Bid Tower
            </h3>

          </div>

          <AnimatePresence>

            <div className="divide-y divide-slate-100">

              {bids.map(
                (bid, index) => (
                  <motion.div
                    key={bid.id}
                    layout
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                    className={`
                      p-5
                      flex
                      items-center
                      justify-between
                      ${
                        index === 0
                          ? "bg-[#16d66d]/10"
                          : ""
                      }
                    `}
                  >

                    <div className="flex items-center gap-3">

                      {index === 0 && (
                        <motion.div
                          layoutId="leader-crown"
                          className="text-2xl"
                        >
                          👑
                        </motion.div>
                      )}

                      <span className="font-black text-lg">
                        {
                          bid.bidder_name
                        }
                      </span>

                    </div>

                    <motion.span
                      animate={{
                        scale:
                          index === 0
                            ? [
                                1,
                                1.08,
                                1,
                              ]
                            : 1,
                      }}
                      transition={{
                        repeat:
                          index === 0
                            ? Infinity
                            : 0,
                        duration: 1.2,
                      }}
                      className="text-[#16d66d] font-black text-2xl"
                    >
                      R
                      {bid.amount.toLocaleString()}
                    </motion.span>

                  </motion.div>
                )
              )}

            </div>

          </AnimatePresence>

        </div>

      </div>

      {/* BID BAR */}
      {!sold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">

          <div className="max-w-md mx-auto p-4">

            <div className="grid grid-cols-3 gap-3">

              {[100, 200, 300].map(
                (increment) => (
                  <motion.button
                    whileTap={{
                      scale: 0.95,
                    }}
                    key={increment}
                    onClick={() =>
                      placeBid(
                        increment
                      )
                    }
                    className="
                      rounded-[24px]
                      py-5
                      font-black
                      text-2xl
                      shadow-lg
                      transition
                      text-white
                    "
                    style={{
                      background:
                        increment ===
                        100
                          ? "#16b85d"
                          : increment ===
                            200
                          ? "#ffc107"
                          : "#ef2b20",
                      color:
                        increment ===
                        200
                          ? "#07152b"
                          : "white",
                    }}
                  >
                    +R{increment}
                  </motion.button>
                )
              )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
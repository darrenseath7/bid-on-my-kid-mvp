"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
};

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
};

export default function DemoAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);

  const [bids, setBids] = useState<Bid[]>([]);

  const [bidderName, setBidderName] = useState("");

  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const auctionChannel = supabase
      .channel("stable-auction")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: "auction_code=eq.demo",
        },
        (payload) => {
          setAuction(payload.new as AuctionState);
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("stable-bids")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_bids",
        },
        (payload) => {
          setBids((current) =>
            [payload.new as Bid, ...current].sort(
              (a, b) => b.amount - a.amount
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, []);

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    setAuction(data);
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", "demo")
      .order("amount", { ascending: false });

    setBids(data || []);
  }

  async function placeBid(increment: number) {
    if (!auction) return;

    const amount = auction.current_bid + increment;

    const { error: bidError } = await supabase
      .from("live_bids")
      .insert({
        auction_code: "demo",
        bidder_name: bidderName,
        amount,
      });

    if (bidError) {
      alert(bidError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder: bidderName,
      })
      .eq("auction_code", "demo");

    if (updateError) {
      alert(updateError.message);
    }
  }

  if (!joined) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-[32px] p-8">
          <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-3">
            Bid On My Kid
          </p>

          <h1 className="text-5xl font-black mb-5">
            Join the auction
          </h1>

          <p className="text-neutral-400 mb-6 text-lg">
            Enter your bidder name.
          </p>

          <input
            value={bidderName}
            onChange={(e) =>
              setBidderName(e.target.value)
            }
            placeholder="Darren S"
            className="w-full rounded-2xl bg-black border border-neutral-700 px-5 py-5 text-white mb-5 text-lg"
          />

          <button
            onClick={() => {
              if (bidderName.trim()) {
                setJoined(true);
              }
            }}
            className="w-full bg-green-400 text-black rounded-2xl py-5 font-black text-xl"
          >
            ENTER AUCTION
          </button>
        </div>
      </main>
    );
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading auction...
      </main>
    );
  }

  if (auction.status === "waiting") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <p className="uppercase tracking-[0.4em] text-xs text-neutral-500 mb-5">
            Bid On My Kid
          </p>

          <h1 className="text-7xl font-black mb-8">
            Auction starting soon.
          </h1>

          <p className="text-2xl text-neutral-300 mb-10">
            Waiting for the school to begin tonight’s live auction.
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-[36px] p-8">
            <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-4">
              AI Auction MC
            </p>

            <p className="text-3xl leading-relaxed">
              “Ladies and gentlemen, prepare yourselves for a masterpiece showdown.”
            </p>
          </div>
        </div>
      </main>
    );
  }

  const sold = auction.status === "sold";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">

      {/* SOLD OVERLAY */}
      <AnimatePresence>
        {sold && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          >
            <div className="text-center px-6 max-w-4xl">

              <motion.div
                initial={{ rotate: -90, y: -120 }}
                animate={{ rotate: 0, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-[140px] mb-4"
              >
                🔨
              </motion.div>

              <motion.h1
                animate={{
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                }}
                className="text-[120px] font-black text-red-500 leading-none mb-6"
              >
                SOLD
              </motion.h1>

              <p className="uppercase tracking-[0.4em] text-sm text-neutral-400 mb-4">
                Winning Bidder
              </p>

              <h2 className="text-6xl font-black mb-8">
                {auction.leading_bidder}
              </h2>

              <div className="inline-block bg-green-400 text-black rounded-[32px] px-10 py-6 mb-8">
                <p className="uppercase tracking-[0.3em] text-sm mb-2">
                  Winning Bid
                </p>

                <div className="text-6xl font-black">
                  R{auction.current_bid.toLocaleString()}
                </div>
              </div>

              <p className="text-3xl text-neutral-300 mb-10">
                SOLD TO{" "}
                {auction.leading_bidder.toUpperCase()}
              </p>

              <a
                href="/auction/winner"
                className="bg-white text-black rounded-[32px] px-12 py-7 inline-block font-black text-2xl"
              >
                View Certificate & Invoice
              </a>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col p-5">

        <div className="mb-6">
          <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-2">
            Bid On My Kid
          </p>

          <h1 className="text-4xl font-black">
            Grade 3 Art Auction
          </h1>

          <p className="text-neutral-400 text-lg mt-2">
            Live now • {auction.child_name}{" "}
            {auction.child_surname}
          </p>
        </div>

        {/* FRAMED ART */}
        <div className="relative mb-8">
          <div className="bg-gradient-to-br from-[#3f2b14] via-[#6d4c1f] to-[#2a1909] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.9)]">

            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">

              <div className="bg-[#f8f5ef] rounded-[24px] p-6">

                <div className="rounded-[18px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] bg-white">

                  <img
                    src={auction.artwork_url}
                    alt="Artwork"
                    className="w-full max-h-[700px] object-contain"
                  />

                </div>

              </div>

            </div>
          </div>
        </div>

        {/* CURRENT BID */}
        <div className="bg-neutral-900 rounded-[32px] p-6 border border-neutral-800 mb-5">
          <p className="text-sm text-neutral-500 mb-2 uppercase tracking-widest">
            Current Highest Bid
          </p>

          <h2 className="text-7xl font-black text-green-400">
            R{auction.current_bid.toLocaleString()}
          </h2>

          <p className="text-neutral-400 mt-3 text-lg">
            Leading bidder:
            {" "}
            <span className="font-bold text-white">
              {auction.leading_bidder}
            </span>
          </p>
        </div>

        {/* STATUS */}
        {auction.status === "going once" && (
          <div className="bg-yellow-400 text-black rounded-3xl p-5 text-center font-black text-3xl mb-5">
            GOING ONCE
          </div>
        )}

        {auction.status === "going twice" && (
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
            }}
            className="bg-orange-500 text-black rounded-3xl p-5 text-center font-black text-3xl mb-5"
          >
            GOING TWICE
          </motion.div>
        )}

        {/* BID BUTTONS */}
        {!sold && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[100, 200, 300].map((increment) => (
              <button
                key={increment}
                onClick={() => placeBid(increment)}
                className="bg-white text-black rounded-3xl py-5 font-black text-2xl active:scale-95 transition"
              >
                +R{increment}
              </button>
            ))}
          </div>
        )}

        {/* BID TOWER */}
        <div className="bg-neutral-900 rounded-[32px] border border-neutral-800 overflow-hidden mb-5">
          <div className="p-5 border-b border-neutral-800">
            <h3 className="font-black text-2xl">
              Live Bid Tower
            </h3>
          </div>

          <div className="divide-y divide-neutral-800">
            {bids.map((bid, index) => (
              <div
                key={bid.id}
                className="p-5 flex justify-between items-center"
              >
                <span className="font-bold text-lg">
                  {index === 0 ? "🏆 " : ""}
                  {bid.bidder_name}
                </span>

                <span className="font-black text-green-400 text-xl">
                  R{bid.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto text-center text-neutral-500 text-sm pb-6">
          Bidding as {bidderName}
        </div>

      </div>
    </main>
  );
}
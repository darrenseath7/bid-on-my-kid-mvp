"use client";

import { useEffect, useState } from "react";
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

export default function DemoAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);

  useEffect(() => {
    fetchAuction();

    const channel = supabase
      .channel("live-auction-demo")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
        },
        (payload) => {
          console.log("REALTIME UPDATE:", payload);

          if (payload.new) {
            setAuction(payload.new as AuctionState);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAuction() {
    const { data, error } = await supabase
      .from("live_auction_state")
      .select("*");

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (data && data.length > 0) {
      setAuction(data[0]);
    }
  }

  async function placeBid(amount: number) {
    if (!auction) return;

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: amount,
        leading_bidder: "You",
      })
      .eq("auction_code", "demo");

    console.log("BID ERROR:", error);
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading auction...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-5">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        <div className="mb-5">
          <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-2">
            Bid On My Kid
          </p>

          <h1 className="text-3xl font-black">
            Grade 3 Art Auction
          </h1>

          <p className="text-neutral-400">
            Live now • {auction.child_name}{" "}
            {auction.child_surname} • {auction.grade}
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden border border-neutral-800 mb-5">
          <img
            src={auction.artwork_url}
            alt="Artwork"
            className="w-full h-72 object-cover"
          />
        </div>

        <div className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 mb-5">
          <p className="text-sm text-neutral-500 mb-2">
            Current Highest Bid
          </p>

          <h2 className="text-6xl font-black text-green-400">
            R{auction.current_bid.toLocaleString()}
          </h2>

          <p className="text-neutral-400 mt-2">
            Leading bidder: {auction.leading_bidder}
          </p>
        </div>

        <div className="bg-green-500/20 border border-green-500 text-green-300 rounded-2xl p-4 text-center font-bold mb-5">
          {auction.status.toUpperCase()}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <button
            onClick={() =>
              placeBid(auction.current_bid + 100)
            }
            className="bg-white text-black rounded-2xl py-5 font-black text-xl"
          >
            R{auction.current_bid + 100}
          </button>

          <button
            onClick={() =>
              placeBid(auction.current_bid + 200)
            }
            className="bg-white text-black rounded-2xl py-5 font-black text-xl"
          >
            R{auction.current_bid + 200}
          </button>

          <button
            onClick={() =>
              placeBid(auction.current_bid + 300)
            }
            className="bg-white text-black rounded-2xl py-5 font-black text-xl"
          >
            R{auction.current_bid + 300}
          </button>
        </div>

        <button className="bg-green-400 text-black rounded-3xl py-6 font-black text-2xl mb-5">
          BID NOW
        </button>

        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden mb-5">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="font-black text-xl">
              Live Bid Tower
            </h3>
          </div>

          <div className="p-4 flex justify-between">
            <span className="font-bold">
              {auction.leading_bidder}
            </span>

            <span className="font-black text-green-400">
              R{auction.current_bid.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-auto text-center text-neutral-500 text-sm pb-6">
          Fully online school art auction experience
        </div>
      </div>
    </main>
  );
}
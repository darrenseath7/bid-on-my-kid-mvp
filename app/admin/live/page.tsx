"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

type Artwork = {
  id: string;
  sort_order: number;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  ai_intro: string;
  status: string;
  sold_amount: number;
  winning_bidder: string;
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

export default function LiveAuctionPage() {
  const [auction, setAuction] =
    useState<AuctionState | null>(null);

  const [artworks, setArtworks] =
    useState<Artwork[]>([]);

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [secondsRemaining, setSecondsRemaining] =
    useState(0);

  const [mcText, setMcText] =
    useState(
      "Welcome to tonight’s masterpiece showdown."
    );

  useEffect(() => {
    fetchAll();

    const auctionChannel = supabase
      .channel("bw-final-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
        },
        (payload) => {
          setAuction(
            payload.new as AuctionState
          );
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bw-final-bids")
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

    const activityChannel = supabase
      .channel("bw-final-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_activity_feed",
        },
        (payload) => {
          setActivities((current) => [
            payload.new as Activity,
            ...current,
          ]);
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

        if (
          remaining === 0 &&
          auction.status ===
            "going twice"
        ) {
          updateStatus("sold");
        }
      }
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [auction]);

  async function fetchAll() {
    fetchAuction();
    fetchArtworks();
    fetchBids();
    fetchActivities();
  }

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    setAuction(data);
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", {
        ascending: true,
      });

    setArtworks(data || []);
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
      .limit(12);

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

  async function updateStatus(
    status: string
  ) {
    let deadline = null;

    if (
      status === "going once"
    ) {
      deadline = new Date(
        Date.now() + 15000
      ).toISOString();

      setMcText(
        "Going once. Tension levels are climbing beautifully."
      );

      addActivity(
        "Going Once has started"
      );
    }

    if (
      status === "going twice"
    ) {
      deadline = new Date(
        Date.now() + 10000
      ).toISOString();

      setMcText(
        "Going twice. This masterpiece is moments away from glory."
      );

      addActivity(
        "Going Twice has started"
      );
    }

    if (
      status === "sold" &&
      auction
    ) {
      setMcText(
        `SOLD TO ${auction.leading_bidder.toUpperCase()} FOR R${auction.current_bid.toLocaleString()}!`
      );

      addActivity(
        `SOLD to ${auction.leading_bidder} for R${auction.current_bid.toLocaleString()}`
      );
    }

    await supabase
      .from("live_auction_state")
      .update({
        status,
        status_deadline:
          deadline,
      })
      .eq("auction_code", "demo");
  }

  async function nextArtwork() {
    const current =
      artworks.find(
        (item) =>
          item.status === "live"
      );

    if (!current) return;

    const next = artworks.find(
      (item) =>
        item.sort_order ===
        current.sort_order + 1
    );

    if (!next) {
      alert(
        "No more artworks in queue."
      );
      return;
    }

    await supabase
      .from("demo_artworks")
      .update({
        status: "sold",
        sold_amount:
          auction?.current_bid || 0,
        winning_bidder:
          auction?.leading_bidder ||
          "",
      })
      .eq("id", current.id);

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", next.id);

    await supabase
      .from("live_bids")
      .delete()
      .eq("auction_code", "demo");

    await supabase
      .from("live_auction_state")
      .update({
        child_name:
          next.child_name,
        child_surname:
          next.child_surname,
        grade: next.grade,
        artwork_url:
          next.artwork_url,
        current_bid: 0,
        leading_bidder:
          "No bids yet",
        status: "open",
        status_deadline: null,
      })
      .eq("auction_code", "demo");

    addActivity(
      `Now auctioning ${next.child_name} ${next.child_surname}`
    );

    fetchAll();

    setMcText(
      next.ai_intro ||
        "Next masterpiece ready."
    );
  }

  async function resetAuction() {
    await supabase
      .from("live_bids")
      .delete()
      .eq("auction_code", "demo");

    await supabase
      .from("live_activity_feed")
      .delete()
      .eq("auction_code", "demo");

    await supabase
      .from("demo_artworks")
      .update({
        status: "pending",
        sold_amount: 0,
        winning_bidder: "",
      })
      .eq("auction_code", "demo");

    const firstArtwork =
      artworks[0];

    if (!firstArtwork) return;

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", firstArtwork.id);

    await supabase
      .from("live_auction_state")
      .update({
        child_name:
          firstArtwork.child_name,
        child_surname:
          firstArtwork.child_surname,
        grade:
          firstArtwork.grade,
        artwork_url:
          firstArtwork.artwork_url,
        current_bid: 0,
        leading_bidder:
          "No bids yet",
        status: "waiting",
        status_deadline: null,
        mc_commentary:
          "Welcome back to BragWall.",
      })
      .eq("auction_code", "demo");

    fetchAll();

    alert(
      "Auction reset successfully."
    );
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading BragWall...
      </main>
    );
  }

  const timerActive =
    auction.status ===
      "going once" ||
    auction.status ===
      "going twice";

  return (
    <main className="min-h-screen bg-[#07152b] text-white">

      <div className="grid xl:grid-cols-[260px_1fr] min-h-screen">

        <aside className="hidden xl:flex bg-[#061124] border-r border-white/10 p-6 flex-col">

          <div className="bg-white rounded-2xl p-4 mb-8">
            <BrandHeader center />
          </div>

        </aside>

        <section className="p-5 lg:p-8">

          <div className="flex items-center justify-between mb-8">

            <div>

              <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-3">
                Event Command Centre
              </p>

              <h1 className="text-6xl font-black leading-none">
                {auction.child_name}{" "}
                {auction.child_surname}
              </h1>

            </div>

            {timerActive && (
              <motion.div
                animate={{
                  scale: [
                    1,
                    1.05,
                    1,
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                }}
                className="bg-[#ef2b20] rounded-[28px] px-8 py-5 shadow-2xl"
              >

                <div className="text-5xl font-black">
                  {
                    secondsRemaining
                  }
                  s
                </div>

              </motion.div>
            )}

          </div>

          <div className="grid xl:grid-cols-[1fr_0.9fr] gap-6">

            <div className="space-y-6">

              <div className="bg-white/5 border border-white/10 rounded-[36px] p-5">

                <img
                  src={
                    auction.artwork_url
                  }
                  alt="Artwork"
                  className="w-full rounded-[28px]"
                />

              </div>

              <div className="bg-white/5 rounded-[32px] p-6">

                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  AI Auction MC
                </p>

                <p className="text-3xl font-bold leading-relaxed">
                  “{mcText}”
                </p>

              </div>

            </div>

            <div className="space-y-6">

              {/* ACTIVITY */}
              <div className="bg-white/5 rounded-[32px] overflow-hidden">

                <div className="p-5 border-b border-white/10">

                  <h3 className="text-2xl font-black">
                    Live Activity
                  </h3>

                </div>

                <div className="divide-y divide-white/10 max-h-[260px] overflow-auto">

                  {activities.map(
                    (activity) => (
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
                        className="p-5 font-bold text-lg"
                      >
                        • {activity.message}
                      </motion.div>
                    )
                  )}

                </div>

              </div>

              {/* CONTROLS */}
              <div className="grid grid-cols-2 gap-4">

                <button
                  onClick={() =>
                    updateStatus(
                      "going once"
                    )
                  }
                  className="bg-[#16b85d] rounded-2xl py-6 font-black text-xl"
                >
                  Going Once
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      "going twice"
                    )
                  }
                  className="bg-[#ffc107] text-[#07152b] rounded-2xl py-6 font-black text-xl"
                >
                  Going Twice
                </button>

                <button
                  onClick={() =>
                    updateStatus("sold")
                  }
                  className="bg-[#ef2b20] rounded-2xl py-6 font-black text-xl"
                >
                  SOLD
                </button>

                <button
                  onClick={nextArtwork}
                  className="bg-white text-[#07152b] rounded-2xl py-6 font-black text-xl"
                >
                  Next Artwork
                </button>

              </div>

              {/* RESET */}
              <div className="grid grid-cols-2 gap-4">

                <button
                  onClick={
                    resetAuction
                  }
                  className="bg-white/10 rounded-2xl py-5 font-black"
                >
                  Reset Auction
                </button>

                <button
                  onClick={() =>
                    fetchAll()
                  }
                  className="bg-white/10 rounded-2xl py-5 font-black"
                >
                  Refresh
                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
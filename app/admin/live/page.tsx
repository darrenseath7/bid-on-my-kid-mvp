"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type Artwork = {
  id: string;
  sort_order: number;
  child_name: string;
  child_surname: string;
  status: string;
  sold_amount: number;
  artwork_url: string;
  ai_intro: string;
};

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
};

export default function LiveAuctionPage() {
  const [auction, setAuction] =
    useState<AuctionState | null>(null);

  const [artworks, setArtworks] =
    useState<Artwork[]>([]);

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [mcText, setMcText] =
    useState(
      "Welcome to tonight’s masterpiece showdown."
    );

  const [secondsRemaining, setSecondsRemaining] =
    useState(0);

  useEffect(() => {
    fetchAuction();
    fetchArtworks();
    fetchBids();

    const auctionChannel = supabase
      .channel("bragwall-live-room-timer")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: "auction_code=eq.demo",
        },
        (payload) => {
          const updated =
            payload.new as AuctionState;

          setAuction(updated);

          if (
            updated.current_bid > 0 &&
            updated.status !== "sold"
          ) {
            setMcText(
              `${updated.leading_bidder} is pushing hard at R${updated.current_bid.toLocaleString()}.`
            );
          }
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bragwall-live-bids-timer")
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
    }

    if (
      status === "sold" &&
      auction
    ) {
      deadline = null;

      setMcText(
        `SOLD TO ${auction.leading_bidder.toUpperCase()} FOR R${auction.current_bid.toLocaleString()}!`
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

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading BragWall control room...
      </main>
    );
  }

  const currentArtworkIndex =
    artworks.findIndex(
      (item) =>
        item.status === "live"
    ) + 1;

  const timerActive =
    auction.status ===
      "going once" ||
    auction.status ===
      "going twice";

  return (
    <main className="min-h-screen bg-[#07152b] text-white">

      <div className="grid xl:grid-cols-[260px_1fr] min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden xl:flex bg-[#061124] border-r border-white/10 p-6 flex-col">

          <div className="bg-white rounded-2xl p-4 mb-8">
            <BrandHeader center />
          </div>

          <nav className="space-y-2 text-sm font-bold">

            <a
              href="/admin"
              className="block rounded-2xl px-4 py-3 hover:bg-white/10"
            >
              Dashboard
            </a>

            <a
              href="/admin/live"
              className="block rounded-2xl bg-white/10 px-4 py-3"
            >
              Live Auction
            </a>

            <a
              href="/admin/artworks"
              className="block rounded-2xl px-4 py-3 hover:bg-white/10"
            >
              Artworks
            </a>

            <a
              href="/admin/school"
              className="block rounded-2xl px-4 py-3 hover:bg-white/10"
            >
              School Profile
            </a>

          </nav>

          <div className="mt-auto text-xs text-white/40">
            Young Art • Big Pride
          </div>

        </aside>

        {/* MAIN */}
        <section className="p-5 lg:p-8">

          {/* HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-3">
                Live Auction Control Room
              </p>

              <h1 className="text-5xl lg:text-7xl font-black leading-none">
                {auction.child_name}{" "}
                {auction.child_surname}
              </h1>

              <p className="text-white/50 text-xl mt-3">
                {auction.grade}
              </p>
            </div>

            <div className="flex items-center gap-4">

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
                  <p className="uppercase tracking-[0.25em] text-xs text-white/50 font-black mb-1">
                    Countdown
                  </p>

                  <div className="text-5xl font-black">
                    {secondsRemaining}s
                  </div>
                </motion.div>
              )}

              <StatusPill
                status={auction.status}
              />

            </div>

          </div>

          {/* LIVE STATUS STRIP */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">

            <LiveStat
              label="Current Bid"
              value={`R${auction.current_bid.toLocaleString()}`}
              color="#16d66d"
            />

            <LiveStat
              label="Leading Bidder"
              value={
                auction.leading_bidder
              }
              color="#ffffff"
            />

            <LiveStat
              label="Parents Online"
              value="47"
              color="#ffc107"
            />

            <LiveStat
              label="Artwork"
              value={`${currentArtworkIndex}/${artworks.length}`}
              color="#2878cf"
            />

          </div>

          {/* MAIN GRID */}
          <div className="grid xl:grid-cols-[1fr_0.9fr] gap-6">

            {/* LEFT */}
            <div className="space-y-6">

              {/* ARTWORK */}
              <div className="bg-white/5 border border-white/10 rounded-[36px] p-5 shadow-2xl">

                <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[32px]">

                  <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[24px]">

                    <div className="bg-[#f8f5ef] rounded-[18px] p-5">

                      <div className="rounded-[14px] overflow-hidden bg-white shadow-2xl">

                        <img
                          src={
                            auction.artwork_url
                          }
                          alt="Artwork"
                          className="w-full max-h-[640px] object-contain"
                        />

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* AI MC */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">

                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  AI Auction MC
                </p>

                <p className="text-3xl leading-relaxed font-bold">
                  “{mcText}”
                </p>

              </div>

            </div>

            {/* RIGHT */}
            <div className="space-y-6">

              {/* BID FEED */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">

                <div className="p-5 border-b border-white/10 flex items-center justify-between">

                  <h3 className="text-2xl font-black">
                    Live Bid Feed
                  </h3>

                  <p className="text-sm text-white/40">
                    {bids.length} bids
                  </p>

                </div>

                <div className="divide-y divide-white/10 max-h-[420px] overflow-auto">

                  {bids.map((bid, index) => (
                    <motion.div
                      key={bid.id}
                      initial={{
                        opacity: 0,
                        x: 20,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      className="p-5 flex items-center justify-between"
                    >

                      <div>
                        <p className="font-black text-lg">
                          {index === 0
                            ? "🏆 "
                            : ""}
                          {
                            bid.bidder_name
                          }
                        </p>

                        <p className="text-xs text-white/40">
                          Live Bid
                        </p>
                      </div>

                      <p className="text-3xl font-black text-[#16d66d]">
                        R
                        {bid.amount.toLocaleString()}
                      </p>

                    </motion.div>
                  ))}

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
                  className="bg-[#16b85d] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Going Once
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      "going twice"
                    )
                  }
                  className="bg-[#ffc107] text-[#07152b] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Going Twice
                </button>

                <button
                  onClick={() =>
                    updateStatus("sold")
                  }
                  className="bg-[#ef2b20] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  SOLD
                </button>

                <button
                  className="bg-white text-[#07152b] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Next Artwork
                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

function LiveStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-[28px] p-6 text-[#07152b] shadow-xl">

      <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
        {label}
      </p>

      <h2
        className="text-4xl font-black leading-tight"
        style={{
          color,
        }}
      >
        {value}
      </h2>

    </div>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "open"
      ? "bg-[#16d66d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "going once"
      ? "bg-[#16b85d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "going twice"
      ? "bg-[#ffc107]/20 text-[#ffc107] border-[#ffc107]/40"
      : status === "sold"
      ? "bg-[#ef2b20]/20 text-[#ff6b61] border-[#ef2b20]/40"
      : "bg-white/10 text-white border-white/20";

  return (
    <div
      className={`
        rounded-2xl
        border
        px-6
        py-4
        font-black
        text-lg
        ${styles}
      `}
    >
      {status.toUpperCase()}
    </div>
  );
}
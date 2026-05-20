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

type Artwork = {
  id: string;
  auction_code: string;
  sort_order: number;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  ai_intro: string;
  sold_amount: number;
  winning_bidder: string;
  status: string;
};

export default function LiveAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);

  const [artworks, setArtworks] = useState<Artwork[]>([]);

  const [currentArtwork, setCurrentArtwork] =
    useState<Artwork | null>(null);

  const [mcText, setMcText] = useState(
    "Welcome to tonight’s masterpiece showdown."
  );

  useEffect(() => {
    fetchAuction();
    fetchArtworks();

    const auctionChannel = supabase
      .channel("admin-live-auction")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
        },
        async (payload) => {
          if (payload.new) {
            const updated =
              payload.new as AuctionState;

            setAuction(updated);
          }
        }
      )
      .subscribe();

    const artworksChannel = supabase
      .channel("admin-demo-artworks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
        },
        () => {
          fetchArtworks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(artworksChannel);
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

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", {
        ascending: true,
      });

    const list = data || [];

    setArtworks(list);

    const liveArtwork =
      list.find(
        (item) => item.status === "live"
      ) ||
      list[0] ||
      null;

    setCurrentArtwork(liveArtwork);

    if (liveArtwork) {
      setMcText(liveArtwork.ai_intro);
    }
  }

  async function startAuction() {
    await supabase
      .from("live_auction_state")
      .update({
        status: "open",
      })
      .eq("auction_code", "demo");
  }

  async function updateStatus(
    status: string
  ) {
    if (!auction) return;

    await supabase
      .from("live_auction_state")
      .update({
        status,
      })
      .eq("auction_code", "demo");

    if (
      status === "sold" &&
      currentArtwork
    ) {
      await supabase
        .from("demo_artworks")
        .update({
          status: "sold",
          sold_amount:
            auction.current_bid,
          winning_bidder:
            auction.leading_bidder,
        })
        .eq("id", currentArtwork.id);

      setMcText(
        `SOLD! Congratulations ${auction.leading_bidder}. That masterpiece just secured a winning bid of R${auction.current_bid.toLocaleString()}.`
      );
    }
  }

  async function nextArtwork() {
    if (!currentArtwork) return;

    const next = artworks.find(
      (item) =>
        item.sort_order ===
        currentArtwork.sort_order + 1
    );

    if (!next) {
      await supabase
        .from("live_auction_state")
        .update({
          status: "completed",
        })
        .eq("auction_code", "demo");

      return;
    }

    await supabase
      .from("demo_artworks")
      .update({
        status: "sold",
      })
      .eq("id", currentArtwork.id);

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", next.id);

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
      })
      .eq("auction_code", "demo");

    await supabase
      .from("live_bids")
      .delete()
      .eq("auction_code", "demo");

    setMcText(next.ai_intro);
  }

  if (!auction || !currentArtwork) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading admin auction...
      </main>
    );
  }

  const waitingRoom =
    auction.status === "waiting";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid lg:grid-cols-2 min-h-screen">

        {/* LEFT */}
        <div className="p-10 flex flex-col justify-between border-r border-neutral-800">

          <div>
            <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-4">
              Live Auction • Artwork{" "}
              {
                artworks.findIndex(
                  (item) =>
                    item.id ===
                    currentArtwork.id
                ) + 1
              }{" "}
              of {artworks.length}
            </p>

            <h1 className="text-5xl font-black mb-6">
              {auction.child_name}{" "}
              {auction.child_surname}
            </h1>

            <p className="text-neutral-400 text-xl mb-8">
              {auction.grade}
            </p>

            <div className="rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl">
              <img
                src={
                  auction.artwork_url
                }
                alt="Artwork"
                className="w-full h-[500px] object-cover"
              />
            </div>
          </div>

          {/* AI MC */}
          <div className="mt-10">
            <div className="bg-neutral-900 rounded-3xl p-6 border border-neutral-800">
              <p className="text-sm uppercase tracking-widest text-neutral-500 mb-3">
                AI Auction MC
              </p>

              <p className="text-2xl leading-relaxed font-medium">
                “{mcText}”
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="p-10 flex flex-col">

          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm text-neutral-500 mb-2">
                Current Highest Bid
              </p>

              <h2 className="text-7xl font-black text-green-400">
                R
                {auction.current_bid.toLocaleString()}
              </h2>

              <p className="text-xl text-neutral-400 mt-3">
                Leading bidder:{" "}
                {
                  auction.leading_bidder
                }
              </p>
            </div>

            <div className="bg-green-500/20 border border-green-500 text-green-300 px-6 py-4 rounded-2xl">
              {auction.status.toUpperCase()}
            </div>
          </div>

          {/* WAITING ROOM */}
          {waitingRoom && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 mb-8 text-center shadow-2xl">
              <h3 className="text-5xl font-black mb-4">
                Waiting Room Active
              </h3>

              <p className="text-neutral-400 text-xl mb-8">
                Parents are currently waiting in the event lobby.
              </p>

              <button
                onClick={startAuction}
                className="bg-green-400 text-black rounded-3xl px-10 py-6 font-black text-2xl shadow-2xl"
              >
                START AUCTION
              </button>
            </div>
          )}

          {/* QUEUE */}
          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden mb-8">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-2xl font-black">
                Auction Queue
              </h3>
            </div>

            <div className="divide-y divide-neutral-800">
              {artworks.map(
                (artwork) => (
                  <div
                    key={
                      artwork.id
                    }
                    className="p-5 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-xl">
                        {
                          artwork.sort_order
                        }
                        .{" "}
                        {
                          artwork.child_name
                        }{" "}
                        {
                          artwork.child_surname
                        }
                      </p>

                      <p className="text-neutral-500">
                        {
                          artwork.status
                        }
                      </p>
                    </div>

                    <p className="font-black text-green-400">
                      {artwork.sold_amount
                        ? `R${artwork.sold_amount.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* CONTROLS */}
          {!waitingRoom && (
            <div className="grid grid-cols-2 gap-4 mt-auto">

              <button
                onClick={() =>
                  updateStatus(
                    "going once"
                  )
                }
                className="bg-yellow-500 text-black rounded-2xl py-5 text-xl font-black"
              >
                GOING ONCE
              </button>

              <button
                onClick={() =>
                  updateStatus(
                    "going twice"
                  )
                }
                className="bg-orange-500 text-black rounded-2xl py-5 text-xl font-black"
              >
                GOING TWICE
              </button>

              <button
                onClick={() =>
                  updateStatus("sold")
                }
                className="bg-red-600 rounded-2xl py-5 text-xl font-black"
              >
                SOLD
              </button>

              <button
                onClick={nextArtwork}
                className="bg-white text-black rounded-2xl py-5 text-xl font-black"
              >
                NEXT ARTWORK
              </button>

            </div>
          )}

        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
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

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
  created_at: string;
};

export default function LiveAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [currentArtwork, setCurrentArtwork] = useState<Artwork | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [mcText, setMcText] = useState("Welcome to tonight’s masterpiece showdown.");

  useEffect(() => {
    fetchAuction();
    fetchArtworks();
    fetchBids();

    const auctionChannel = supabase
      .channel("bragwall-admin-live")
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
          setAuction(updated);

          if (
            updated.status !== "waiting" &&
            updated.status !== "sold" &&
            updated.current_bid > 0 &&
            updated.leading_bidder !== "No bids yet"
          ) {
            setMcText(
              `${updated.leading_bidder} takes the lead at R${updated.current_bid.toLocaleString()}! The parent rivalry is officially alive.`
            );
          }
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bragwall-admin-bids")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_bids",
        },
        (payload) => {
          setBids((current) =>
            [payload.new as Bid, ...current].sort((a, b) => b.amount - a.amount)
          );
        }
      )
      .subscribe();

    const artworksChannel = supabase
      .channel("bragwall-admin-artworks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: "auction_code=eq.demo",
        },
        () => {
          fetchArtworks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
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

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", "demo")
      .order("amount", { ascending: false })
      .limit(8);

    setBids(data || []);
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", { ascending: true });

    const list = data || [];
    setArtworks(list);

    const liveArtwork = list.find((item) => item.status === "live") || list[0] || null;
    setCurrentArtwork(liveArtwork);

    if (liveArtwork) {
      setMcText(liveArtwork.ai_intro || "Tonight’s masterpiece is ready for the spotlight.");
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

  async function updateStatus(status: string) {
    if (!auction) return;

    await supabase
      .from("live_auction_state")
      .update({
        status,
      })
      .eq("auction_code", "demo");

    if (status === "going once") {
      setMcText("Going once! The room is tense, the artwork is glowing, and someone is about to earn serious bragging rights.");
    }

    if (status === "going twice") {
      setMcText("Going twice! This is the moment where grandparents usually become dangerous.");
    }

    if (status === "sold" && currentArtwork) {
      await supabase
        .from("demo_artworks")
        .update({
          status: "sold",
          sold_amount: auction.current_bid,
          winning_bidder: auction.leading_bidder,
        })
        .eq("id", currentArtwork.id);

      setMcText(
        `SOLD! Congratulations ${auction.leading_bidder}. That masterpiece just secured R${auction.current_bid.toLocaleString()} for the school.`
      );
    }
  }

  async function nextArtwork() {
    if (!currentArtwork) return;

    const next = artworks.find(
      (item) => item.sort_order === currentArtwork.sort_order + 1
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
        child_name: next.child_name,
        child_surname: next.child_surname,
        grade: next.grade,
        artwork_url: next.artwork_url,
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "open",
      })
      .eq("auction_code", "demo");

    await supabase
      .from("live_bids")
      .delete()
      .eq("auction_code", "demo");

    setBids([]);
    setMcText(next.ai_intro || "Next masterpiece is ready. Bidders, compose yourselves.");
  }

  if (!auction || !currentArtwork) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading BragWall live room...
      </main>
    );
  }

  const currentIndex =
    artworks.findIndex((item) => item.id === currentArtwork.id) + 1;

  const waitingRoom = auction.status === "waiting";

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <div className="grid xl:grid-cols-[260px_1fr] min-h-screen">
        <aside className="hidden xl:flex bg-[#061124] border-r border-white/10 p-6 flex-col">
          <div className="bg-white rounded-2xl p-4 mb-8">
            <BrandHeader center />
          </div>

          <nav className="space-y-2 text-sm font-bold">
            <a href="/admin" className="block rounded-2xl px-4 py-3 hover:bg-white/10">
              Dashboard
            </a>
            <a href="/admin/live" className="block rounded-2xl bg-white/10 px-4 py-3">
              Live Auction
            </a>
            <a href="/admin/artworks" className="block rounded-2xl px-4 py-3 hover:bg-white/10">
              Artworks
            </a>
            <a href="/admin/school" className="block rounded-2xl px-4 py-3 hover:bg-white/10">
              School Profile
            </a>
            <a href="/auction/demo" className="block rounded-2xl px-4 py-3 hover:bg-white/10">
              Parent View
            </a>
          </nav>

          <div className="mt-auto text-xs text-white/40">
            Young Art • Big Pride
          </div>
        </aside>

        <section className="p-5 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-3">
                Live Control Room
              </p>

              <h1 className="text-4xl lg:text-6xl font-black leading-tight">
                {auction.child_name} {auction.child_surname}
              </h1>

              <p className="text-white/50 text-lg mt-2">
                Artwork {currentIndex} of {artworks.length} • {auction.grade}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StatusPill status={auction.status} />

              <a
                href="/auction/demo"
                className="hidden md:block rounded-2xl bg-white text-[#07152b] px-5 py-4 font-black"
              >
                Parent View
              </a>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-[36px] p-5 lg:p-6 shadow-2xl">
                <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[32px]">
                  <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[24px]">
                    <div className="bg-[#f8f5ef] rounded-[18px] p-5">
                      <div className="rounded-[14px] overflow-hidden bg-white shadow-2xl">
                        <img
                          src={auction.artwork_url}
                          alt="Artwork"
                          className="w-full max-h-[560px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  AI MC
                </p>

                <p className="text-2xl leading-relaxed font-bold">
                  “{mcText}”
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[28px] p-6 text-[#07152b]">
                  <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
                    Current Bid
                  </p>

                  <h2 className="text-6xl font-black text-[#16d66d]">
                    R{auction.current_bid.toLocaleString()}
                  </h2>
                </div>

                <div className="bg-white rounded-[28px] p-6 text-[#07152b]">
                  <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
                    Leading Bidder
                  </p>

                  <h2 className="text-4xl font-black">
                    {auction.leading_bidder}
                  </h2>
                </div>
              </div>

              {waitingRoom && (
                <div className="bg-white rounded-[32px] p-7 text-[#07152b] text-center shadow-xl">
                  <h3 className="text-4xl font-black mb-4">
                    Waiting Room Active
                  </h3>

                  <p className="text-slate-500 text-lg mb-6">
                    Parents are in the lobby. Start when ready.
                  </p>

                  <button
                    onClick={startAuction}
                    className="bg-[#16d66d] text-[#07152b] rounded-2xl px-8 py-5 font-black text-xl"
                  >
                    Start Auction
                  </button>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-2xl font-black">
                    Live Bids
                  </h3>

                  <p className="text-sm text-white/40">
                    {bids.length} bids
                  </p>
                </div>

                <div className="divide-y divide-white/10">
                  {bids.length === 0 && (
                    <div className="p-5 text-white/40">
                      No bids yet.
                    </div>
                  )}

                  {bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className="p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black text-lg">
                          {index === 0 ? "🏆 " : ""}
                          {bid.bidder_name}
                        </p>

                        <p className="text-xs text-white/40">
                          {new Date(bid.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <p className="text-2xl font-black text-[#16d66d]">
                        R{bid.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10">
                  <h3 className="text-2xl font-black">
                    Auction Queue
                  </h3>
                </div>

                <div className="divide-y divide-white/10 max-h-64 overflow-auto">
                  {artworks.map((artwork) => (
                    <div
                      key={artwork.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black">
                          {artwork.sort_order}. {artwork.child_name}{" "}
                          {artwork.child_surname}
                        </p>

                        <p className="text-sm text-white/40">
                          {artwork.status}
                        </p>
                      </div>

                      <p className="font-black text-[#16d66d]">
                        {artwork.sold_amount
                          ? `R${artwork.sold_amount.toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {!waitingRoom && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => updateStatus("going once")}
                    className="bg-[#16b85d] rounded-2xl py-5 font-black text-xl"
                  >
                    Going Once
                  </button>

                  <button
                    onClick={() => updateStatus("going twice")}
                    className="bg-[#ffc107] text-[#07152b] rounded-2xl py-5 font-black text-xl"
                  >
                    Going Twice
                  </button>

                  <button
                    onClick={() => updateStatus("sold")}
                    className="bg-[#ef2b20] rounded-2xl py-5 font-black text-xl"
                  >
                    Sold
                  </button>

                  <button
                    onClick={nextArtwork}
                    className="bg-white text-[#07152b] rounded-2xl py-5 font-black text-xl"
                  >
                    Next Artwork
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.toUpperCase();

  const classes =
    status === "open"
      ? "bg-[#16d66d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "waiting"
      ? "bg-white/10 text-white border-white/20"
      : status === "going once"
      ? "bg-[#16b85d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "going twice"
      ? "bg-[#ffc107]/20 text-[#ffc107] border-[#ffc107]/40"
      : status === "sold"
      ? "bg-[#ef2b20]/20 text-[#ff6b61] border-[#ef2b20]/40"
      : "bg-white/10 text-white border-white/20";

  return (
    <div className={`rounded-2xl border px-5 py-4 font-black ${classes}`}>
      {label}
    </div>
  );
}
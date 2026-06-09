"use client";

import { useEffect, useRef, useState } from "react";
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
  bid_pause_until?: string | null;
  next_bid_amount?: number | null;
  last_bid_at?: string | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
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
  winning_bidder: string | null;
  winner_email?: string | null;
  invoice_email_requested_at?: string | null;
  certificate_email_requested_at?: string | null;
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

export default function LiveAuctionPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [mcText, setMcText] = useState(
    "Welcome to tonight’s masterpiece showdown."
  );

  const autoNextKeyRef = useRef("");

  useEffect(() => {
    fetchAll();

    const auctionChannel = supabase
      .channel("bw-admin-auto-next-auction")
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

          if (updated.mc_commentary) {
            setMcText(updated.mc_commentary);
          }
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("bw-admin-auto-next-bids")
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
      .channel("bw-admin-auto-next-activity")
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

    const artworksChannel = supabase
      .channel("bw-admin-auto-next-artworks")
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
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(artworksChannel);
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

        if (remaining === 0 && auction.status === "going twice") {
          updateStatus("sold");
        }
      } else {
        setSecondsRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  useEffect(() => {
    if (!auction) return;
    if (auction.status !== "sold") return;
    if (!auction.winner_email_submitted_at) return;
    if (artworks.length === 0) return;

    const current = getCurrentArtwork();

    if (!current) return;

    const autoNextKey = `${current.id}-${auction.winner_email_submitted_at}`;

    if (autoNextKeyRef.current === autoNextKey) return;

    autoNextKeyRef.current = autoNextKey;

    const timer = setTimeout(async () => {
      const next = artworks
        .filter(
          (item) =>
            item.sort_order > current.sort_order && item.status !== "sold"
        )
        .sort((a, b) => a.sort_order - b.sort_order)[0];

      if (next) {
        await moveToArtwork(next);
        return;
      }

      await supabase
        .from("live_auction_state")
        .update({
          status: "finished",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary:
            "All artworks have been auctioned. Thank you for supporting BragWall and tonight’s young artists.",
        })
        .eq("auction_code", "demo");

      await fetchAll();
    }, 2500);

    return () => clearTimeout(timer);
  }, [auction, artworks]);

  async function fetchAll() {
    await Promise.all([
      fetchAuction(),
      fetchArtworks(),
      fetchBids(),
      fetchActivities(),
    ]);
  }

  async function fetchAuction() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    if (data) {
      setAuction(data);
      setMcText(
        data.mc_commentary || "Welcome to tonight’s masterpiece showdown."
      );
    }
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", { ascending: true });

    setArtworks(data || []);
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
      .limit(12);

    setActivities(data || []);
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: "demo",
      message,
    });
  }

  function getCurrentArtwork() {
    if (auction) {
      const matchedArtwork = artworks.find(
        (item) =>
          item.child_name === auction.child_name &&
          item.child_surname === auction.child_surname &&
          item.artwork_url === auction.artwork_url
      );

      if (matchedArtwork) return matchedArtwork;
    }

    return (
      artworks.find((item) => item.status === "live") ||
      artworks.find((item) => item.sort_order === 1) ||
      null
    );
  }

  async function clearCurrentArtworkState() {
    await supabase.from("live_bids").delete().eq("auction_code", "demo");

    await supabase
      .from("live_activity_feed")
      .delete()
      .eq("auction_code", "demo");

    setBids([]);
    setActivities([]);
  }

  async function startAuction() {
    const current = getCurrentArtwork();

    await clearCurrentArtworkState();

    await supabase
      .from("live_auction_state")
      .update({
        status: "open",
        current_bid: 0,
        leading_bidder: "No bids yet",
        status_deadline: null,
        bid_pause_until: null,
        next_bid_amount: 100,
        last_bid_at: null,
        winner_email: null,
        winner_email_submitted_at: null,
        mc_commentary:
          current?.ai_intro ||
          "The first masterpiece is live. Parents, prepare yourselves.",
      })
      .eq("auction_code", "demo");

    setMcText(
      current?.ai_intro ||
        "The first masterpiece is live. Parents, prepare yourselves."
    );

    await fetchAll();
  }

  async function updateStatus(status: string) {
    if (!auction) return;

    let deadline = null;
    let commentary = auction.mc_commentary || mcText;

    if (status === "going once") {
      deadline = new Date(Date.now() + 15000).toISOString();
      commentary =
        "Going once. The room is tense, the artwork is glowing, and someone is about to earn serious bragging rights.";
      await addActivity("Going Once has started");
    }

    if (status === "going twice") {
      deadline = new Date(Date.now() + 10000).toISOString();
      commentary =
        "Going twice. This is the moment where grandparents usually become financially dangerous.";
      await addActivity("Going Twice has started");
    }

    if (status === "sold") {
      deadline = null;
      commentary = `SOLD to ${
        auction.leading_bidder
      } for R${auction.current_bid.toLocaleString()}! A masterpiece has found its forever wall.`;

      const current = getCurrentArtwork();

      if (current) {
        await supabase
          .from("demo_artworks")
          .update({
            status: "sold",
            sold_amount: auction.current_bid,
            winning_bidder: auction.leading_bidder,
            winner_email: null,
            invoice_email_requested_at: null,
            certificate_email_requested_at: null,
          })
          .eq("id", current.id);
      }

      await addActivity(
        `SOLD to ${
          auction.leading_bidder
        } for R${auction.current_bid.toLocaleString()}`
      );
    }

    setMcText(commentary);

    await supabase
      .from("live_auction_state")
      .update({
        status,
        status_deadline: deadline,
        bid_pause_until: null,
        mc_commentary: commentary,
        winner_email: status === "sold" ? null : auction.winner_email || null,
        winner_email_submitted_at:
          status === "sold" ? null : auction.winner_email_submitted_at || null,
      })
      .eq("auction_code", "demo");

    await fetchAll();
  }

  async function moveToArtwork(target: Artwork) {
    const current = getCurrentArtwork();

    await clearCurrentArtworkState();

    if (current && current.id !== target.id && current.status !== "sold") {
      await supabase
        .from("demo_artworks")
        .update({
          status: "pending",
        })
        .eq("id", current.id);
    }

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", target.id);

    await supabase
      .from("live_auction_state")
      .update({
        child_name: target.child_name,
        child_surname: target.child_surname,
        grade: target.grade,
        artwork_url: target.artwork_url,
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "open",
        status_deadline: null,
        bid_pause_until: null,
        next_bid_amount: 100,
        last_bid_at: null,
        winner_email: null,
        winner_email_submitted_at: null,
        mc_commentary:
          target.ai_intro ||
          "This masterpiece is ready. Bidders, compose yourselves.",
      })
      .eq("auction_code", "demo");

    setMcText(
      target.ai_intro ||
        "This masterpiece is ready. Bidders, compose yourselves."
    );

    await fetchAll();
  }

  async function nextArtwork() {
    const current = getCurrentArtwork();

    if (!current) {
      alert("No current artwork found.");
      return;
    }

    const next = artworks
      .filter(
        (item) => item.sort_order > current.sort_order && item.status !== "sold"
      )
      .sort((a, b) => a.sort_order - b.sort_order)[0];

    if (!next) {
      alert("No more artworks in the queue.");
      return;
    }

    await moveToArtwork(next);
  }

  async function previousArtwork() {
    const current = getCurrentArtwork();

    if (!current) {
      alert("No current artwork found.");
      return;
    }

    const previous = artworks
      .filter((item) => item.sort_order < current.sort_order)
      .sort((a, b) => b.sort_order - a.sort_order)[0];

    if (!previous) {
      alert("You are already on the first artwork.");
      return;
    }

    await moveToArtwork(previous);
  }

  async function resetAuction() {
    await clearCurrentArtworkState();

    await supabase
      .from("demo_artworks")
      .update({
        status: "pending",
        sold_amount: 0,
        winning_bidder: null,
        winner_email: null,
        invoice_email_requested_at: null,
        certificate_email_requested_at: null,
      })
      .eq("auction_code", "demo");

    const firstArtwork =
      artworks.find((item) => item.sort_order === 1) || artworks[0];

    if (!firstArtwork) {
      alert("No artworks found.");
      return;
    }

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", firstArtwork.id);

    await supabase
      .from("live_auction_state")
      .update({
        child_name: firstArtwork.child_name,
        child_surname: firstArtwork.child_surname,
        grade: firstArtwork.grade,
        artwork_url: firstArtwork.artwork_url,
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "waiting",
        status_deadline: null,
        bid_pause_until: null,
        next_bid_amount: 100,
        last_bid_at: null,
        winner_email: null,
        winner_email_submitted_at: null,
        mc_commentary:
          firstArtwork.ai_intro ||
          "Welcome to BragWall. The auction will begin shortly.",
      })
      .eq("auction_code", "demo");

    setMcText(
      firstArtwork.ai_intro ||
        "Welcome to BragWall. The auction will begin shortly."
    );

    await fetchAll();

    alert("Auction reset successfully.");
  }

  if (!auction) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading BragWall...
      </main>
    );
  }

  const currentArtwork = getCurrentArtwork();

  const currentIndex =
    artworks.findIndex((item) => item.id === currentArtwork?.id) + 1;

  const timerActive =
    auction.status === "going once" || auction.status === "going twice";

  const sold = auction.status === "sold";
  const winnerEmailSubmitted = Boolean(auction.winner_email_submitted_at);

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <div className="grid xl:grid-cols-[260px_1fr] min-h-screen">
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

            <a
              href="/auction/demo"
              className="block rounded-2xl px-4 py-3 hover:bg-white/10"
            >
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
                Event Command Centre
              </p>

              <h1 className="text-5xl lg:text-7xl font-black leading-none">
                {auction.child_name} {auction.child_surname}
              </h1>

              <p className="text-white/50 text-lg mt-3">
                {auction.grade} • Artwork {currentIndex || 1} of{" "}
                {artworks.length || 1}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {timerActive && (
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
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

              <StatusPill status={auction.status} />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <LiveStat
              label="Current Bid"
              value={`R${auction.current_bid.toLocaleString()}`}
              color="#16d66d"
            />

            <LiveStat
              label="Leading Bidder"
              value={auction.leading_bidder}
              color="#ffffff"
            />

            <LiveStat
              label="Activity"
              value={`${activities.length}`}
              color="#ffc107"
            />

            <LiveStat
              label="Queue"
              value={`${currentIndex || 1}/${artworks.length || 1}`}
              color="#2878cf"
            />
          </div>

          <div className="grid xl:grid-cols-[1fr_0.9fr] gap-6">
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-[36px] p-5 shadow-2xl">
                <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[32px]">
                  <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[24px]">
                    <div className="bg-[#f8f5ef] rounded-[18px] p-5">
                      <div className="rounded-[14px] overflow-hidden bg-white shadow-2xl">
                        <img
                          src={auction.artwork_url}
                          alt="Artwork"
                          className="w-full max-h-[580px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  AI Auction MC Story
                </p>

                <p className="text-2xl lg:text-3xl font-bold leading-relaxed">
                  “{mcText}”
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {sold && (
                <div className="bg-[#16d66d] text-[#07152b] rounded-[32px] p-7 shadow-2xl">
                  <p className="uppercase tracking-[0.3em] text-xs font-black mb-4">
                    Sold Artwork
                  </p>

                  <h2 className="text-5xl font-black mb-4">SOLD</h2>

                  <p className="text-xl font-bold mb-2">
                    Winner: {auction.leading_bidder}
                  </p>

                  <p className="text-xl font-bold mb-6">
                    Amount: R{auction.current_bid.toLocaleString()}
                  </p>

                  {winnerEmailSubmitted ? (
                    <div className="bg-[#07152b] text-white rounded-2xl p-5">
                      <p className="font-black text-lg mb-2">
                        Winner email received.
                      </p>

                      <p className="text-white/70 font-bold">
                        Moving to the next artwork automatically...
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#07152b] text-white rounded-2xl p-5">
                      <p className="font-black text-lg mb-2">
                        Waiting for winner email.
                      </p>

                      <p className="text-white/70 font-bold">
                        The winning parent must enter their email before the
                        auction moves to the next artwork.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-2xl font-black">Live Activity</h3>
                  <p className="text-sm text-white/40">clears per artwork</p>
                </div>

                <div className="divide-y divide-white/10 max-h-[240px] overflow-auto">
                  {activities.length === 0 && (
                    <div className="p-5 text-white/40">
                      Activity will appear once parents join or bid.
                    </div>
                  )}

                  {activities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 font-bold text-lg"
                    >
                      • {activity.message}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-2xl font-black">Live Bid Feed</h3>
                  <p className="text-sm text-white/40">{bids.length} bids</p>
                </div>

                <div className="divide-y divide-white/10 max-h-[260px] overflow-auto">
                  {bids.length === 0 && (
                    <div className="p-5 text-white/40">No bids yet.</div>
                  )}

                  {bids.map((bid, index) => (
                    <motion.div
                      key={bid.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 flex items-center justify-between"
                    >
                      <p className="font-black text-lg">
                        {index === 0 ? "👑 " : ""}
                        {bid.bidder_name}
                      </p>

                      <p className="text-2xl font-black text-[#16d66d]">
                        R{bid.amount.toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {auction.status === "waiting" && (
                  <button
                    onClick={startAuction}
                    className="col-span-2 bg-[#16d66d] text-[#07152b] rounded-2xl py-6 font-black text-xl shadow-xl"
                  >
                    Start Auction
                  </button>
                )}

                <button
                  onClick={previousArtwork}
                  className="bg-white/10 border border-white/10 rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Previous Artwork
                </button>

                <button
                  onClick={nextArtwork}
                  className="bg-white text-[#07152b] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Next Artwork
                </button>

                <button
                  onClick={() => updateStatus("going once")}
                  className="bg-[#16b85d] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Going Once
                </button>

                <button
                  onClick={() => updateStatus("going twice")}
                  className="bg-[#ffc107] text-[#07152b] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  Going Twice
                </button>

                <button
                  onClick={() => updateStatus("sold")}
                  className="col-span-2 bg-[#ef2b20] rounded-2xl py-6 font-black text-xl shadow-xl"
                >
                  SOLD
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={resetAuction}
                  className="bg-white/10 rounded-2xl py-5 font-black"
                >
                  Reset Auction
                </button>

                <button
                  onClick={fetchAll}
                  className="bg-white/10 rounded-2xl py-5 font-black"
                >
                  Refresh
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10">
                  <h3 className="text-2xl font-black">Artwork Queue</h3>
                </div>

                <div className="divide-y divide-white/10 max-h-[260px] overflow-auto">
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

      <h2 className="text-4xl font-black leading-tight" style={{ color }}>
        {value}
      </h2>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
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
      : status === "finished"
      ? "bg-[#2878cf]/20 text-[#6fb0ff] border-[#2878cf]/40"
      : "bg-white/10 text-white border-white/20";

  return (
    <div className={`rounded-2xl border px-6 py-4 font-black text-lg ${styles}`}>
      {status.toUpperCase()}
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BrandHeader from "@/components/BrandHeader";
import AdminLogoutButton from "@/components/AdminLogoutButton";
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
      .channel("bw-admin-cockpit-auction")
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
      .channel("bw-admin-cockpit-bids")
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
      .channel("bw-admin-cockpit-activity")
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
      .channel("bw-admin-cockpit-artworks")
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
      artworks.find((item) => item.status === "queued") ||
      artworks.find((item) => item.status === "pending") ||
      artworks.find((item) => item.sort_order === 1) ||
      artworks[0] ||
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

    if (!current) {
      alert("No artwork found. Please upload artwork before starting.");
      return;
    }

    await clearCurrentArtworkState();

    await supabase
      .from("demo_artworks")
      .update({
        status: "pending",
      })
      .eq("auction_code", "demo")
      .neq("status", "sold");

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", current.id);

    await supabase
      .from("live_auction_state")
      .update({
        child_name: current.child_name,
        child_surname: current.child_surname,
        grade: current.grade,
        artwork_url: current.artwork_url,
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
          current.ai_intro ||
          "The first masterpiece is live. Parents, prepare yourselves.",
      })
      .eq("auction_code", "demo");

    setMcText(
      current.ai_intro ||
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
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-[#16d66d] rounded-full animate-spin mx-auto mb-6" />
          <p className="font-black text-xl">Loading BragWall...</p>
        </div>
      </main>
    );
  }

  const currentArtwork = getCurrentArtwork();

  const currentIndex =
    artworks.findIndex((item) => item.id === currentArtwork?.id) + 1;

  const timerActive =
    auction.status === "going once" || auction.status === "going twice";

  const sold = auction.status === "sold";
  const waiting = auction.status === "waiting";
  const finished = auction.status === "finished";
  const winnerEmailSubmitted = Boolean(auction.winner_email_submitted_at);
  const displayArtworkUrl =
    currentArtwork?.artwork_url || auction.artwork_url || "";

  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <div className="grid xl:grid-cols-[280px_1fr] min-h-screen">
        <aside className="hidden xl:flex bg-[#061124] border-r border-white/10 p-6 flex-col">
          <div className="bg-white rounded-[26px] p-4 mb-8 shadow-2xl">
            <BrandHeader center />
          </div>

          <nav className="space-y-2 text-sm font-bold">
            <AdminNavLink href="/admin" label="Dashboard" />
            <AdminNavLink href="/admin/events/new" label="Create Event" />
            <AdminNavLink href="/admin/live" label="Live Auction" active />
            <AdminNavLink href="/admin/artworks" label="Artworks" />
            <AdminNavLink href="/admin/school" label="School Profile" />
            <AdminNavLink href="/admin/sales" label="Sales / Invoices" />
            <AdminNavLink href="/auction/demo" label="Parent View" />
          </nav>

          <div className="mt-auto space-y-4">
            <AdminLogoutButton />

            <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
              <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-2">
                BragWall
              </p>
              <p className="text-white/70 text-sm font-bold">
                Young Art • Big Pride
              </p>
            </div>
          </div>
        </aside>

        <section className="h-screen overflow-hidden flex flex-col">
          <header className="shrink-0 px-5 lg:px-8 py-5 border-b border-white/10 bg-[#061124]/80 backdrop-blur">
            <div className="xl:hidden bg-white rounded-[22px] p-3 mb-4 flex justify-center">
              <BrandHeader center />
            </div>

            <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-5">
              <div>
                <p className="uppercase tracking-[0.35em] text-xs text-[#16d66d] font-black mb-2">
                  Auction Cockpit
                </p>

                <h1 className="text-4xl lg:text-6xl font-black leading-none tracking-tight">
                  {currentArtwork
                    ? `${currentArtwork.child_name} ${currentArtwork.child_surname}`
                    : `${auction.child_name || "No artwork"} ${
                        auction.child_surname || "live"
                      }`}
                </h1>

                <p className="text-white/50 text-base mt-2 font-bold">
                  {currentArtwork?.grade ||
                    auction.grade ||
                    "Start the auction"}{" "}
                  • Artwork {currentIndex || 1} of {artworks.length || 1}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[420px]">
                <CockpitMetric
                  label="Bid"
                  value={`R${auction.current_bid.toLocaleString()}`}
                  accent="#16d66d"
                />
                <CockpitMetric
                  label="Leader"
                  value={auction.leading_bidder}
                  accent="#ffffff"
                />
                <CockpitMetric
                  label="Bids"
                  value={`${bids.length}`}
                  accent="#ffc857"
                />
                <CockpitMetric
                  label="Queue"
                  value={`${currentIndex || 1}/${artworks.length || 1}`}
                  accent="#6fb0ff"
                />
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 grid 2xl:grid-cols-[1fr_380px] gap-5 p-5 lg:p-8">
            <div className="min-h-0 flex flex-col gap-5">
              <div className="relative flex-1 min-h-0 rounded-[42px] border border-white/10 bg-[#050d1d] shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(22,214,109,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,200,87,0.12),transparent_35%)]" />

                <div className="relative h-full grid lg:grid-cols-[1fr_260px]">
                  <div className="min-h-0 p-5 lg:p-7 flex flex-col">
                    <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
                      <div>
                        <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-2">
                          Main Stage
                        </p>
                        <h2 className="text-3xl font-black">
                          {displayArtworkUrl
                            ? "Artwork is live"
                            : "No artwork loaded"}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        {timerActive && (
                          <motion.div
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={`rounded-[26px] px-6 py-4 text-center ${
                              auction.status === "going twice"
                                ? "bg-[#ef2b20]"
                                : "bg-[#16d66d] text-[#07152b]"
                            }`}
                          >
                            <p className="uppercase tracking-[0.2em] text-[10px] opacity-60 font-black">
                              Countdown
                            </p>
                            <div className="text-5xl font-black leading-none">
                              {secondsRemaining}s
                            </div>
                          </motion.div>
                        )}

                        <StatusPill status={auction.status} />
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 flex items-center justify-center">
                      {displayArtworkUrl ? (
                        <div className="w-full max-w-[900px] max-h-full rounded-[38px] overflow-hidden border border-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.55)] bg-[#16110b]">
                          <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-5 lg:p-8">
                            <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-3 rounded-[28px] shadow-[0_0_45px_rgba(255,200,87,0.18)]">
                              <div className="bg-[#f8f5ef] rounded-[20px] p-5">
                                <div className="rounded-[14px] overflow-hidden bg-white shadow-2xl">
                                  <img
                                    src={displayArtworkUrl}
                                    alt="Artwork"
                                    className="w-full max-h-[56vh] object-contain"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="h-10 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
                        </div>
                      ) : (
                        <div className="rounded-[36px] bg-white/5 border border-white/10 p-12 text-center max-w-xl">
                          <div className="text-7xl mb-6">🖼️</div>

                          <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                            No Artwork Loaded
                          </p>

                          <h2 className="text-4xl font-black mb-4">
                            Start or reset the auction.
                          </h2>

                          <p className="text-white/50 text-lg font-bold">
                            Once an artwork is live, it will appear here in the
                            premium presentation frame.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="hidden lg:flex border-l border-white/10 bg-black/15 p-5 flex-col gap-4">
                    <FloatingCard
                      label="Current Bid"
                      value={`R${auction.current_bid.toLocaleString()}`}
                      accent="#16d66d"
                    />

                    <FloatingCard
                      label="Leading Bidder"
                      value={auction.leading_bidder}
                      accent="#ffffff"
                    />

                    {sold && (
                      <div className="rounded-[28px] bg-[#16d66d] text-[#07152b] p-5">
                        <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-3">
                          Sold Status
                        </p>

                        <h3 className="text-4xl font-black mb-3">SOLD</h3>

                        {winnerEmailSubmitted ? (
                          <p className="font-black">
                            Email received. Auto-moving next.
                          </p>
                        ) : (
                          <p className="font-black">
                            Waiting for winner email.
                          </p>
                        )}
                      </div>
                    )}

                    {finished && (
                      <div className="rounded-[28px] bg-[#2878cf] p-5">
                        <p className="uppercase tracking-[0.25em] text-[10px] text-white/60 font-black mb-3">
                          Event Complete
                        </p>

                        <h3 className="text-3xl font-black">
                          Auction Finished
                        </h3>
                      </div>
                    )}

                    <div className="mt-auto rounded-[28px] bg-[#07152b] border border-white/10 p-5">
                      <p className="uppercase tracking-[0.25em] text-[10px] text-[#16d66d] font-black mb-3">
                        AI Auction MC
                      </p>

                      <p className="text-lg font-black leading-relaxed line-clamp-[9]">
                        “{mcText}”
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-[34px] border border-white/10 bg-[#061124] p-4 shadow-2xl">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {waiting && (
                    <button
                      onClick={startAuction}
                      className="md:col-span-2 bg-[#16d66d] text-[#07152b] rounded-[22px] py-5 font-black text-xl shadow-xl"
                    >
                      Start
                    </button>
                  )}

                  <button
                    onClick={previousArtwork}
                    className="bg-white/10 border border-white/10 rounded-[20px] py-5 font-black hover:bg-white/15 transition"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => updateStatus("going once")}
                    className="bg-[#16b85d] rounded-[20px] py-5 font-black shadow-xl"
                  >
                    Once
                  </button>

                  <button
                    onClick={() => updateStatus("going twice")}
                    className="bg-[#ffc857] text-[#07152b] rounded-[20px] py-5 font-black shadow-xl"
                  >
                    Twice
                  </button>

                  <button
                    onClick={() => updateStatus("sold")}
                    className="bg-[#ef2b20] rounded-[20px] py-5 font-black shadow-xl"
                  >
                    SOLD
                  </button>

                  <button
                    onClick={nextArtwork}
                    className="bg-white text-[#07152b] rounded-[20px] py-5 font-black shadow-xl"
                  >
                    Next
                  </button>

                  <button
                    onClick={resetAuction}
                    className="bg-white/10 rounded-[20px] py-5 font-black hover:bg-white/15 transition"
                  >
                    Reset
                  </button>

                  <button
                    onClick={fetchAll}
                    className="bg-white/10 rounded-[20px] py-5 font-black hover:bg-white/15 transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <aside className="min-h-0 grid grid-rows-[auto_1fr_1fr] gap-5">
              <div className="rounded-[34px] border border-white/10 bg-[#061124] p-5 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  Quick Status
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStatus
                    label="Status"
                    value={auction.status.toUpperCase()}
                    tone={auction.status}
                  />
                  <MiniStatus
                    label="Raised"
                    value={`R${auction.total_raised.toLocaleString()}`}
                    tone="raised"
                  />
                </div>
              </div>

              <Panel title="Artwork Queue" subtitle="Live, pending, sold">
                {artworks.length === 0 && (
                  <EmptyPanelText>No artworks uploaded yet.</EmptyPanelText>
                )}

                {artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className={`p-4 flex items-center justify-between gap-4 border-b border-white/10 last:border-b-0 ${
                      currentArtwork?.id === artwork.id
                        ? "bg-[#16d66d]/10"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-black truncate">
                        {artwork.sort_order}. {artwork.child_name}{" "}
                        {artwork.child_surname}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <QueueStatus status={artwork.status} />
                        <p className="text-sm text-white/40 truncate">
                          {artwork.grade}
                        </p>
                      </div>
                    </div>

                    <p className="font-black text-[#16d66d] shrink-0">
                      {artwork.sold_amount
                        ? `R${artwork.sold_amount.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                ))}
              </Panel>

              <div className="grid grid-rows-2 gap-5 min-h-0">
                <Panel title="Live Bids" subtitle={`${bids.length} bids`}>
                  {bids.length === 0 && (
                    <EmptyPanelText>No bids yet.</EmptyPanelText>
                  )}

                  {bids.slice(0, 6).map((bid, index) => (
                    <motion.div
                      key={bid.id}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 flex items-center justify-between gap-4 border-b border-white/10 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 ${
                            index === 0
                              ? "bg-[#16d66d] text-[#07152b]"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {bid.bidder_name.charAt(0).toUpperCase()}
                        </div>

                        <p className="font-black truncate">
                          {index === 0 ? "👑 " : ""}
                          {bid.bidder_name}
                        </p>
                      </div>

                      <p className="text-xl font-black text-[#16d66d] shrink-0">
                        R{bid.amount.toLocaleString()}
                      </p>
                    </motion.div>
                  ))}
                </Panel>

                <Panel
                  title="Activity"
                  subtitle={`${activities.length} recent`}
                >
                  {activities.length === 0 && (
                    <EmptyPanelText>
                      Activity will appear once parents join or bid.
                    </EmptyPanelText>
                  )}

                  {activities.slice(0, 8).map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 font-bold border-b border-white/10 last:border-b-0"
                    >
                      • {activity.message}
                    </motion.div>
                  ))}
                </Panel>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block rounded-2xl px-4 py-3 transition ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"
      }`}
    >
      {label}
    </a>
  );
}

function CockpitMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[24px] bg-white/5 border border-white/10 p-4 min-w-0">
      <p className="uppercase tracking-[0.22em] text-[10px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p
        className="text-2xl font-black leading-tight truncate"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}

function FloatingCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[30px] bg-white/5 border border-white/10 p-5 shadow-2xl">
      <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-3">
        {label}
      </p>

      <p
        className="text-4xl font-black leading-tight break-words"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  const color =
    tone === "open"
      ? "#16d66d"
      : tone === "sold"
      ? "#ef2b20"
      : tone === "going once"
      ? "#16d66d"
      : tone === "going twice"
      ? "#ffc857"
      : tone === "finished"
      ? "#6fb0ff"
      : tone === "raised"
      ? "#ffc857"
      : "#ffffff";

  return (
    <div className="rounded-[24px] bg-white/5 border border-white/10 p-4">
      <p className="uppercase tracking-[0.22em] text-[10px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-xl font-black truncate" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 rounded-[34px] border border-white/10 bg-[#061124] shadow-2xl overflow-hidden flex flex-col">
      <div className="p-5 border-b border-white/10 shrink-0 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black">{title}</h3>
          <p className="text-sm text-white/40 font-bold">{subtitle}</p>
        </div>
      </div>

      <div className="overflow-auto min-h-0">{children}</div>
    </div>
  );
}

function EmptyPanelText({ children }: { children: React.ReactNode }) {
  return <div className="p-5 text-white/40 font-bold">{children}</div>;
}

function StatusPill({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const styles =
    status === "open"
      ? "bg-[#16d66d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "waiting"
      ? "bg-white/10 text-white border-white/20"
      : status === "going once"
      ? "bg-[#16b85d]/20 text-[#16d66d] border-[#16d66d]/40"
      : status === "going twice"
      ? "bg-[#ffc857]/20 text-[#ffc857] border-[#ffc857]/40"
      : status === "sold"
      ? "bg-[#ef2b20]/20 text-[#ff6b61] border-[#ef2b20]/40"
      : status === "finished"
      ? "bg-[#2878cf]/20 text-[#6fb0ff] border-[#2878cf]/40"
      : "bg-white/10 text-white border-white/20";

  return (
    <div
      className={`rounded-2xl border font-black ${
        compact ? "px-4 py-3 text-sm" : "px-6 py-4 text-lg"
      } ${styles}`}
    >
      {status.toUpperCase()}
    </div>
  );
}

function QueueStatus({ status }: { status: string }) {
  const styles =
    status === "live"
      ? "bg-[#16d66d] text-[#07152b]"
      : status === "sold"
      ? "bg-[#ef2b20] text-white"
      : "bg-white/10 text-white/70";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles}`}>
      {status}
    </span>
  );
}
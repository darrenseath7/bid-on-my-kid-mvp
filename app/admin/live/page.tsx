"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  total_raised?: number | null;
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
  auction_code: string;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  enhanced_artwork_url?: string | null;
  enhancement_status?: string | null;
  ai_story?: string | null;
  ai_intro?: string | null;
  status?: string | null;
  sort_order?: number | null;
  sold_amount?: number | null;
  winning_bidder?: string | null;
  winner_email?: string | null;
  created_at?: string | null;
};

type Bid = {
  id: string;
  auction_code: string;
  bidder_name: string;
  amount: number;
  created_at?: string | null;
};

type ActivityItem = {
  id: string;
  auction_code: string;
  message: string;
  created_at?: string | null;
};

const AUCTION_CODE = "demo";
const BID_STEP = 100;

export default function AdminLivePage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");

  const currentArtwork = useMemo(() => {
    return getCurrentArtwork(auction, artworks);
  }, [auction, artworks]);

  const queuedArtworks = artworks.filter((artwork) => {
    return artwork.status !== "sold";
  });

  const soldArtworks = artworks.filter((artwork) => {
    return artwork.status === "sold";
  });

  const totalRaised = soldArtworks.reduce((sum, artwork) => {
    return sum + Number(artwork.sold_amount || 0);
  }, 0);

  const nextBidAmount = Math.max(
    Number(auction?.next_bid_amount || 0),
    Number(auction?.current_bid || 0) + BID_STEP,
    BID_STEP
  );

  const statusLabel = auction?.status || "waiting";
  const isLive = statusLabel !== "waiting" && statusLabel !== "sold";

  useEffect(() => {
    loadEverything();

    const auctionChannel = supabase
      .channel("admin-live-auction-state-final")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchAuction();
        }
      )
      .subscribe();

    const artworksChannel = supabase
      .channel("admin-live-artworks-final")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchArtworks();
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("admin-live-bids-final")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel("admin-live-activity-final")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_activity_feed",
          filter: `auction_code=eq.${AUCTION_CODE}`,
        },
        () => {
          fetchActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(artworksChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  async function loadEverything() {
    setLoading(true);

    await Promise.all([
      fetchAuction(),
      fetchArtworks(),
      fetchBids(),
      fetchActivity(),
    ]);

    setLoading(false);
  }

  async function fetchAuction() {
    const { data, error } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .single();

    if (!error && data) {
      setAuction(data);
    }
  }

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .order("sort_order", { ascending: true });

    setArtworks(data || []);
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .order("amount", { ascending: false })
      .limit(10);

    setBids(data || []);
  }

  async function fetchActivity() {
    const { data } = await supabase
      .from("live_activity_feed")
      .select("*")
      .eq("auction_code", AUCTION_CODE)
      .order("created_at", { ascending: false })
      .limit(12);

    setActivity(data || []);
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: AUCTION_CODE,
      message,
    });
  }

  async function startAuction() {
    if (!currentArtwork) {
      alert("Upload artwork before starting the auction.");
      return;
    }

    await moveToArtwork(currentArtwork);
  }

  async function moveToArtwork(artwork: Artwork) {
    setBusyAction(`move-${artwork.id}`);

    const displayUrl = getArtworkDisplayUrl(artwork);

    await supabase
      .from("demo_artworks")
      .update({
        status: "queued",
      })
      .eq("auction_code", AUCTION_CODE)
      .neq("status", "sold");

    await supabase
      .from("demo_artworks")
      .update({
        status: "live",
      })
      .eq("id", artwork.id);

    const commentary =
      artwork.ai_story ||
      artwork.ai_intro ||
      `${artwork.child_name}'s artwork is live. Parents, prepare yourselves. Bragging rights are now officially on the table.`;

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        child_name: artwork.child_name,
        child_surname: artwork.child_surname,
        grade: artwork.grade,
        artwork_url: displayUrl,
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "open",
        status_deadline: null,
        bid_pause_until: null,
        next_bid_amount: BID_STEP,
        last_bid_at: null,
        winner_email: null,
        winner_email_submitted_at: null,
        mc_commentary: commentary,
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
      setBusyAction("");
      return;
    }

    await supabase.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

    await addActivity(
      `${artwork.child_name} ${artwork.child_surname}'s artwork is now live`
    );

    setBusyAction("");
  }

  async function pauseAuction() {
    if (!auction) return;

    setBusyAction("pause");

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        status: "paused",
        status_deadline: null,
        bid_pause_until: null,
        mc_commentary:
          "The auctioneer has paused the action. Hold your bids for just a moment.",
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity("Auction paused");
    }

    setBusyAction("");
  }

  async function resumeAuction() {
    if (!auction) return;

    setBusyAction("resume");

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        status: "open",
        status_deadline: null,
        bid_pause_until: null,
        mc_commentary:
          "We are back live. The next bid is waiting for a brave parent.",
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity("Auction resumed");
    }

    setBusyAction("");
  }

  async function markGoingOnce() {
    if (!auction || auction.current_bid <= 0) {
      alert("You need at least one bid before going once.");
      return;
    }

    setBusyAction("once");

    const deadline = new Date(Date.now() + 5000).toISOString();

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        status: "going once",
        status_deadline: deadline,
        bid_pause_until: null,
        mc_commentary: `Going once at R${auction.current_bid.toLocaleString()} for ${auction.leading_bidder}. Last chance to beat this bid.`,
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity(`Going once at R${auction.current_bid.toLocaleString()}`);
    }

    setBusyAction("");
  }

  async function markGoingTwice() {
    if (!auction || auction.current_bid <= 0) {
      alert("You need at least one bid before going twice.");
      return;
    }

    setBusyAction("twice");

    const deadline = new Date(Date.now() + 5000).toISOString();

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        status: "going twice",
        status_deadline: deadline,
        bid_pause_until: null,
        mc_commentary: `Going twice at R${auction.current_bid.toLocaleString()}. ${auction.leading_bidder} is seconds away from serious bragging rights.`,
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity(
        `Going twice at R${auction.current_bid.toLocaleString()}`
      );
    }

    setBusyAction("");
  }

  async function markSold() {
    if (!auction || !currentArtwork) return;

    if (auction.current_bid <= 0 || auction.leading_bidder === "No bids yet") {
      alert("You need a winning bid before marking this artwork as sold.");
      return;
    }

    setBusyAction("sold");

    await supabase
      .from("demo_artworks")
      .update({
        status: "sold",
        sold_amount: auction.current_bid,
        winning_bidder: auction.leading_bidder,
      })
      .eq("id", currentArtwork.id);

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        status: "sold",
        status_deadline: null,
        bid_pause_until: null,
        mc_commentary: `Sold to ${auction.leading_bidder} for R${auction.current_bid.toLocaleString()}. A masterpiece has found its forever wall.`,
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity(
        `SOLD to ${
          auction.leading_bidder
        } for R${auction.current_bid.toLocaleString()}`
      );
    }

    setBusyAction("");
  }

  async function resetAuction() {
    const confirmed = window.confirm(
      "Reset the live auction state? This will clear the current bids and return the parent screen to waiting."
    );

    if (!confirmed) return;

    setBusyAction("reset");

    await supabase.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

    await supabase
      .from("demo_artworks")
      .update({
        status: "queued",
      })
      .eq("auction_code", AUCTION_CODE)
      .neq("status", "sold");

    const { error } = await supabase
      .from("live_auction_state")
      .update({
        child_name: "",
        child_surname: "",
        grade: "",
        artwork_url: "",
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "waiting",
        status_deadline: null,
        bid_pause_until: null,
        next_bid_amount: BID_STEP,
        last_bid_at: null,
        winner_email: null,
        winner_email_submitted_at: null,
        mc_commentary: "Welcome to BragWall. The auction is waiting to begin.",
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await addActivity("Auction reset to waiting");
    }

    setBusyAction("");
  }

  async function clearBids() {
    const confirmed = window.confirm("Clear all bids for this auction?");

    if (!confirmed) return;

    setBusyAction("clear-bids");

    const { error } = await supabase
      .from("live_bids")
      .delete()
      .eq("auction_code", AUCTION_CODE);

    if (error) {
      alert(error.message);
    } else {
      await supabase
        .from("live_auction_state")
        .update({
          current_bid: 0,
          leading_bidder: "No bids yet",
          next_bid_amount: BID_STEP,
          last_bid_at: null,
          bid_pause_until: null,
          status_deadline: null,
          status: "open",
          winner_email: null,
          winner_email_submitted_at: null,
          mc_commentary: "Bids have been cleared. The auction is open again.",
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      await addActivity("Bids cleared");
    }

    setBusyAction("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-[26px] p-4 mb-5 shadow-2xl">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-20 w-auto object-contain"
            />
          </div>

          <p className="text-white/70 font-black">Loading auction cockpit...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b18] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.15),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.13),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative grid xl:grid-cols-[245px_1fr] min-h-screen">
        <aside className="border-r border-white/10 bg-[#061124]/85 backdrop-blur-xl p-4 xl:sticky xl:top-0 xl:h-screen">
          <div className="bg-white rounded-[24px] p-3 shadow-2xl mb-5">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-20 w-auto object-contain mx-auto"
            />
          </div>

          <nav className="space-y-2.5 mb-5">
            <AdminNavLink href="/admin" label="Dashboard" icon="🏠" />
            <AdminNavLink href="/admin/live" label="Live Room" icon="🔨" active />
            <AdminNavLink href="/admin/artworks" label="Artwork Upload" icon="🎨" />
            <AdminNavLink href="/admin/sales" label="Sales Records" icon="💳" />
            <AdminNavLink href="/auction/demo" label="Parent View" icon="📱" />
          </nav>

          <div className="rounded-[24px] bg-white/5 border border-white/10 p-4 mb-4">
            <p className="uppercase tracking-[0.3em] text-[9px] text-white/50 font-black mb-2">
              Auction Code
            </p>

            <p className="text-3xl font-black text-[#16d66d]">DEMO</p>

            <p className="text-white/60 text-xs font-bold mt-2">
              Parent screen: /auction/demo
            </p>
          </div>

          <AdminLogoutButton />
        </aside>

        <section className="min-h-screen flex flex-col">
          <header className="border-b border-white/10 bg-[#020b18]/70 backdrop-blur-xl p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-2.5 mb-4">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isLive
                        ? "bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]"
                        : "bg-[#ffc857]"
                    }`}
                  />

                  <span className="uppercase tracking-[0.32em] text-[10px] font-black text-white/65">
                    Auction Cockpit
                  </span>
                </div>

                <h1 className="text-4xl lg:text-6xl font-black leading-[0.9]">
                  Live control room.
                </h1>

                <p className="text-white/70 text-base font-bold mt-3 max-w-2xl">
                  Run the artwork stage, bidding rhythm, SOLD moments, and
                  parent screen from one premium BragWall cockpit.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[500px]">
                <MetricCard label="Status" value={formatStatus(statusLabel)} />
                <MetricCard
                  label="Current Bid"
                  value={`R${Number(
                    auction?.current_bid || 0
                  ).toLocaleString()}`}
                  green
                />
                <MetricCard
                  label="Raised"
                  value={`R${totalRaised.toLocaleString()}`}
                  gold
                />
              </div>
            </div>
          </header>

          <div className="grid 2xl:grid-cols-[1fr_360px] gap-4 p-4 lg:p-6">
            <div className="space-y-4">
              <section className="rounded-[34px] bg-white/5 border border-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
                <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-stretch">
                  <div className="rounded-[30px] bg-[#061124] border border-white/10 p-4 lg:p-5 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <p className="uppercase tracking-[0.35em] text-[9px] text-[#16d66d] font-black mb-2">
                          On Stage
                        </p>

                        <h2 className="text-4xl lg:text-5xl font-black leading-none">
                          {currentArtwork
                            ? `${currentArtwork.child_name} ${currentArtwork.child_surname}`
                            : "No artwork selected"}
                        </h2>

                        <p className="text-white/65 font-bold mt-2">
                          {currentArtwork?.grade || "Upload artwork to begin"}
                        </p>
                      </div>

                      <StatusBadge status={statusLabel} />
                    </div>

                    <ArtworkStage artwork={currentArtwork} />

                    <div className="mt-4 grid md:grid-cols-2 gap-3">
                      <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl">
                        <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
                          Highest Bid
                        </p>

                        <p className="text-4xl font-black text-[#16d66d] leading-none">
                          R{Number(auction?.current_bid || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl text-right">
                        <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
                          Leading Bidder
                        </p>

                        <p className="text-2xl font-black leading-tight truncate">
                          {auction?.leading_bidder || "No bids yet"}
                          {auction?.leading_bidder &&
                          auction.leading_bidder !== "No bids yet"
                            ? " 👑"
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-[#061124] border border-white/10 p-4 shadow-2xl flex flex-col">
                    <div className="text-center rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.22),transparent_45%),#020b18] border border-[#ffc857]/30 p-5 mb-4">
                      <div className="text-5xl mb-2">🔨</div>

                      <p className="text-[#ffc857] text-4xl font-black leading-none">
                        {statusLabel === "sold" ? "SOLD!" : "LIVE"}
                      </p>

                      <p className="text-white/70 font-bold mt-3">
                        Next ask: R{nextBidAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl mb-4">
                      <p className="uppercase tracking-[0.25em] text-[9px] text-slate-400 font-black mb-2">
                        AI Auction MC
                      </p>

                      <p className="text-lg font-black leading-snug">
                        “
                        {auction?.mc_commentary ||
                          currentArtwork?.ai_story ||
                          currentArtwork?.ai_intro ||
                          "Welcome to BragWall. The next masterpiece is waiting for its moment."}
                        ”
                      </p>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <SmallInfo label="Queue" value={`${queuedArtworks.length}`} />
                      <SmallInfo label="Sold" value={`${soldArtworks.length}`} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] bg-[#061124]/90 border border-white/10 p-4 shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[9px] text-[#16d66d] font-black mb-2">
                      Live Controls
                    </p>

                    <h3 className="text-3xl font-black">Auction rhythm</h3>
                  </div>

                  <button
                    onClick={loadEverything}
                    className="rounded-2xl bg-white/10 border border-white/10 px-5 py-3.5 font-black hover:bg-white/15 transition"
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid md:grid-cols-4 xl:grid-cols-7 gap-3">
                  <ControlButton
                    label="Start Live"
                    icon="▶"
                    onClick={startAuction}
                    disabled={Boolean(busyAction)}
                    green
                  />

                  <ControlButton
                    label="Pause"
                    icon="⏸"
                    onClick={pauseAuction}
                    disabled={Boolean(busyAction)}
                  />

                  <ControlButton
                    label="Resume"
                    icon="🔁"
                    onClick={resumeAuction}
                    disabled={Boolean(busyAction)}
                  />

                  <ControlButton
                    label="Going Once"
                    icon="1"
                    onClick={markGoingOnce}
                    disabled={Boolean(busyAction)}
                    gold
                  />

                  <ControlButton
                    label="Going Twice"
                    icon="2"
                    onClick={markGoingTwice}
                    disabled={Boolean(busyAction)}
                    danger
                  />

                  <ControlButton
                    label="SOLD"
                    icon="🔨"
                    onClick={markSold}
                    disabled={Boolean(busyAction)}
                    sold
                  />

                  <ControlButton
                    label="Reset"
                    icon="↺"
                    onClick={resetAuction}
                    disabled={Boolean(busyAction)}
                  />
                </div>

                <button
                  onClick={clearBids}
                  disabled={Boolean(busyAction)}
                  className="mt-3 w-full rounded-[20px] bg-white/5 border border-white/10 px-5 py-3.5 font-black text-white/75 hover:bg-white/10 transition disabled:opacity-40"
                >
                  Clear Current Bids
                </button>
              </section>
            </div>

            <aside className="space-y-4">
              <Panel title="Artwork Queue" subtitle="Tap an artwork to move it live">
                <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                  {artworks.length === 0 && (
                    <p className="text-white/60 font-bold">
                      No artwork uploaded yet.
                    </p>
                  )}

                  {artworks.map((artwork) => {
                    const displayUrl = getArtworkDisplayUrl(artwork);
                    const active = currentArtwork?.id === artwork.id;

                    return (
                      <button
                        key={artwork.id}
                        onClick={() => moveToArtwork(artwork)}
                        disabled={busyAction === `move-${artwork.id}`}
                        className={`w-full text-left rounded-[22px] p-3 border transition ${
                          active
                            ? "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
                            : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shrink-0">
                            {displayUrl ? (
                              <img
                                src={displayUrl}
                                alt="Artwork thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                🎨
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-black truncate">
                              {artwork.child_name} {artwork.child_surname}
                            </p>

                            <p
                              className={`text-xs font-bold truncate ${
                                active ? "text-[#07152b]/75" : "text-white/60"
                              }`}
                            >
                              {artwork.grade} • {artwork.status || "queued"}
                            </p>

                            {artwork.enhanced_artwork_url && (
                              <p
                                className={`text-xs font-black mt-1 ${
                                  active ? "text-[#07152b]" : "text-[#ffc857]"
                                }`}
                              >
                                Enhanced
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Live Bids" subtitle="Highest bids first">
                <div className="space-y-3 max-h-[270px] overflow-auto pr-1">
                  {bids.length === 0 && (
                    <p className="text-white/60 font-bold">No bids yet.</p>
                  )}

                  {bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`rounded-[20px] p-3.5 border ${
                        index === 0
                          ? "bg-white text-[#07152b] border-white"
                          : "bg-white/5 text-white border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black truncate">
                            {index === 0 ? "👑 " : ""}
                            {bid.bidder_name}
                          </p>

                          <p
                            className={`text-xs font-bold ${
                              index === 0 ? "text-slate-500" : "text-white/55"
                            }`}
                          >
                            {formatTime(bid.created_at)}
                          </p>
                        </div>

                        <p className="text-2xl font-black text-[#16d66d]">
                          R{Number(bid.amount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Activity Feed" subtitle="Latest auction events">
                <div className="space-y-3 max-h-[270px] overflow-auto pr-1">
                  {activity.length === 0 && (
                    <p className="text-white/60 font-bold">
                      Activity will appear here.
                    </p>
                  )}

                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] bg-white/5 border border-white/10 p-3.5"
                    >
                      <p className="font-bold text-white/80 leading-snug">
                        {item.message}
                      </p>

                      <p className="text-xs text-white/55 font-bold mt-2">
                        {formatTime(item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function getArtworkDisplayUrl(artwork: Artwork | null) {
  if (!artwork) return "";
  return artwork.enhanced_artwork_url || artwork.artwork_url || "";
}

function getCurrentArtwork(
  auction: AuctionState | null,
  artworks: Artwork[]
): Artwork | null {
  if (auction) {
    const matchedArtwork = artworks.find((item) => {
      const displayUrl = getArtworkDisplayUrl(item);

      return (
        item.child_name === auction.child_name &&
        item.child_surname === auction.child_surname &&
        (item.artwork_url === auction.artwork_url ||
          displayUrl === auction.artwork_url)
      );
    });

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

function formatStatus(status: string) {
  if (!status) return "Waiting";

  return status
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return "Just now";

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AdminNavLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-[20px] px-3.5 py-3.5 font-black transition ${
        active
          ? "bg-[#16d66d] text-[#07152b]"
          : "bg-white/5 text-white/75 border border-white/10 hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </a>
  );
}

function MetricCard({
  label,
  value,
  green = false,
  gold = false,
}: {
  label: string;
  value: string;
  green?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-[22px] bg-white/5 border border-white/10 p-3.5 shadow-xl">
      <p className="uppercase tracking-[0.25em] text-[8px] text-white/50 font-black mb-2">
        {label}
      </p>

      <p
        className={`text-2xl font-black leading-none ${
          green ? "text-[#16d66d]" : gold ? "text-[#ffc857]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSold = status === "sold";
  const isWaiting = status === "waiting";
  const isDanger = status === "going twice";
  const isGold = status === "going once";

  return (
    <div
      className={`rounded-[20px] px-4 py-3 text-center border shrink-0 ${
        isSold
          ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
          : isDanger
          ? "bg-[#ef2b20] text-white border-[#ff8d86]/40"
          : isGold
          ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
          : isWaiting
          ? "bg-white/5 text-white border-white/10"
          : "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
      }`}
    >
      <p className="uppercase tracking-[0.25em] text-[8px] font-black opacity-70">
        Status
      </p>

      <p className="text-lg font-black">{formatStatus(status)}</p>
    </div>
  );
}

function ArtworkStage({ artwork }: { artwork: Artwork | null }) {
  const displayUrl = getArtworkDisplayUrl(artwork);

  return (
    <div className="rounded-[28px] overflow-hidden border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.42)] bg-[#16110b]">
      <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-3 lg:p-4">
        <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[24px] shadow-[0_0_45px_rgba(255,200,87,0.18)]">
          <div className="bg-[#f8f5ef] rounded-[18px] p-3">
            <div className="rounded-[14px] overflow-hidden bg-white min-h-[260px] flex items-center justify-center">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Current artwork"
                  className="w-full max-h-[52vh] object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 p-10">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-2xl font-black">No artwork selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-8 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/5 border border-white/10 p-3.5 text-center">
      <p className="uppercase tracking-[0.25em] text-[8px] text-white/50 font-black mb-2">
        {label}
      </p>

      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function ControlButton({
  label,
  icon,
  onClick,
  disabled,
  green = false,
  gold = false,
  danger = false,
  sold = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  green?: boolean;
  gold?: boolean;
  danger?: boolean;
  sold?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[20px] p-3.5 font-black text-left shadow-xl transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 ${
        green
          ? "bg-[#16d66d] text-[#07152b]"
          : gold
          ? "bg-[#ffc857] text-[#07152b]"
          : danger
          ? "bg-[#ef2b20] text-white"
          : sold
          ? "bg-white text-[#07152b]"
          : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>

      <p className="text-sm">{label}</p>
    </button>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-[#061124]/90 border border-white/10 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="uppercase tracking-[0.3em] text-[9px] text-[#16d66d] font-black mb-2">
          {title}
        </p>

        <p className="text-white/60 text-sm font-bold">{subtitle}</p>
      </div>

      {children}
    </section>
  );
}
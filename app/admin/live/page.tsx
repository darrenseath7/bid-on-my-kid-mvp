"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminAuctionSelector from "@/components/AdminAuctionSelector";
import { supabase } from "@/lib/supabase";
import { useAdminAuctionCode } from "@/lib/useAdminAuctionCode";

type AuctionState = {
  auction_code?: string | null;
  artwork_id?: string | null;
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
  mc_audio_url?: string | null;
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
  description?: string | null;
  status?: string | null;
  sort_order?: number | null;
  sold_amount?: number | null;
  winning_bidder?: string | null;
  winner_email?: string | null;
  mc_audio_url?: string | null;
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

type SchoolProfile = {
  auction_code: string;
  bid_increment?: number | null;
};

type Tone = "green" | "yellow" | "blue" | "purple" | "white" | "red";

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const MIN_MC_INTRO_SECONDS = 28;
const MAX_MC_INTRO_SECONDS = 120;
const MC_WORDS_PER_SECOND = 2.2;
const MC_INTRO_PADDING_SECONDS = 8;

export default function AdminLivePage() {
  const [auctionCode] = useAdminAuctionCode(DEFAULT_AUCTION_CODE);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [bidIncrement, setBidIncrement] = useState(DEFAULT_BID_STEP);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const activeAuctionCodeRef = useRef(DEFAULT_AUCTION_CODE);

  const currentArtwork = useMemo(() => {
    return getCurrentArtwork(auction, artworks);
  }, [auction, artworks]);

  const activeQueueArtworks = artworks.filter(
    (artwork) => artwork.status !== "sold" && artwork.status !== "archived"
  );

  const queuedArtworks = activeQueueArtworks;

  const soldArtworks = artworks.filter((artwork) => artwork.status === "sold");

  const archivedArtworks = artworks.filter(
    (artwork) => artwork.status === "archived"
  );

  const nextArtwork = useMemo(() => {
    return getNextArtwork(currentArtwork, activeQueueArtworks);
  }, [currentArtwork, activeQueueArtworks]);

  const totalRaised = soldArtworks.reduce((sum, artwork) => {
    return sum + Number(artwork.sold_amount || 0);
  }, 0);

  const uniqueBidderCount = useMemo(() => {
    const uniqueNames = new Set(
      bids
        .map((bid) => bid.bidder_name.trim().toLowerCase())
        .filter(Boolean)
    );

    return uniqueNames.size;
  }, [bids]);

  const visibleBids = bids.slice(0, 10);

  const nextBidAmount = Math.max(
    Number(auction?.next_bid_amount || 0),
    Number(auction?.current_bid || 0) + bidIncrement,
    bidIncrement
  );

  const statusLabel = auction?.status || "waiting";
  const isPreparingIntro = statusLabel === "preparing_intro";
  const isLive = statusLabel !== "waiting" && statusLabel !== "sold";

  useEffect(() => {
    const activeAuctionCode = auctionCode;
    let cancelled = false;

    activeAuctionCodeRef.current = activeAuctionCode;
    setAuction(null);
    setArtworks([]);
    setBids([]);
    setActivity([]);
    setBidIncrement(DEFAULT_BID_STEP);
    setBusyAction("");
    loadEverything(activeAuctionCode, () => cancelled);

    const auctionChannel = supabase
      .channel(`admin-live-auction-state-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => {
          fetchAuction(activeAuctionCode, () => cancelled);
        }
      )
      .subscribe();

    const schoolProfileChannel = supabase
      .channel(`admin-live-school-profile-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_school_profile",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => {
          fetchSchoolProfile(activeAuctionCode, () => cancelled);
        }
      )
      .subscribe();

    const artworksChannel = supabase
      .channel(`admin-live-artworks-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => {
          fetchArtworks(activeAuctionCode, () => cancelled);
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`admin-live-bids-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => {
          fetchBids(activeAuctionCode, () => cancelled);
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel(`admin-live-activity-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_activity_feed",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => {
          fetchActivity(activeAuctionCode, () => cancelled);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(schoolProfileChannel);
      supabase.removeChannel(artworksChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [auctionCode]);

  async function loadEverything(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    setLoading(true);

    await Promise.all([
      fetchAuction(targetAuctionCode, isCancelled),
      fetchSchoolProfile(targetAuctionCode, isCancelled),
      fetchArtworks(targetAuctionCode, isCancelled),
      fetchBids(targetAuctionCode, isCancelled),
      fetchActivity(targetAuctionCode, isCancelled),
    ]);

    if (!isCancelled() && activeAuctionCodeRef.current === targetAuctionCode) {
      setLoading(false);
    }
  }

  async function fetchAuction(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const { data, error } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", targetAuctionCode)
      .single();

    if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

    if (!error && data && data.auction_code === targetAuctionCode) {
      setAuction(data);
    }
  }

  async function fetchSchoolProfile(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const { data } = await supabase
      .from("demo_school_profile")
      .select("auction_code,bid_increment")
      .eq("auction_code", targetAuctionCode)
      .maybeSingle();

    if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

    const profile = data as SchoolProfile | null;

    setBidIncrement(getSafeBidIncrement(profile?.bid_increment));
  }

  async function fetchArtworks(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", targetAuctionCode)
      .order("sort_order", { ascending: true });

    if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

    setArtworks((data || []).filter((artwork) => artwork.auction_code === targetAuctionCode));
  }

  async function fetchBids(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const { data } = await supabase
      .from("live_bids")
      .select("*")
      .eq("auction_code", targetAuctionCode)
      .order("amount", { ascending: false })
      .limit(500);

    if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

    setBids((data || []).filter((bid) => bid.auction_code === targetAuctionCode));
  }

  async function fetchActivity(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const { data } = await supabase
      .from("live_activity_feed")
      .select("*")
      .eq("auction_code", targetAuctionCode)
      .order("created_at", { ascending: false })
      .limit(12);

    if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

    setActivity((data || []).filter((item) => item.auction_code === targetAuctionCode));
  }

  async function addActivity(message: string) {
    await supabase.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message,
    });
  }

  async function runLiveAction(
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    try {
      const response = await fetch("/api/admin/live-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auctionCode, action, ...payload }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Admin action failed.");
      }

      await loadEverything();
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Admin action failed.");
      return false;
    }
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
    await runLiveAction("move-to-artwork", { artworkId: artwork.id });
    setBusyAction("");
  }

  async function pauseAuction() {
    if (!auction) return;

    setBusyAction("pause");
    await runLiveAction("pause");
    setBusyAction("");
  }

  async function resumeAuction() {
    if (!auction) return;

    setBusyAction("resume");
    await runLiveAction("resume");
    setBusyAction("");
  }

  async function markGoingOnce() {
    if (!auction || auction.current_bid <= 0) {
      alert("You need at least one bid before going once.");
      return;
    }

    setBusyAction("once");
    await runLiveAction("going-once");
    setBusyAction("");
  }

  async function markGoingTwice() {
    if (!auction || auction.current_bid <= 0) {
      alert("You need at least one bid before going twice.");
      return;
    }

    setBusyAction("twice");
    await runLiveAction("going-twice");
    setBusyAction("");
  }

  async function markSold() {
    if (!auction || !currentArtwork) return;

    if (auction.current_bid <= 0 || auction.leading_bidder === "No bids yet") {
      alert("You need a winning bid before marking this artwork as sold.");
      return;
    }

    setBusyAction("sold");
    await runLiveAction("mark-sold");
    setBusyAction("");
  }

  async function archiveUnsoldArtwork() {
    if (!auction || !currentArtwork) {
      alert("There is no current artwork to archive.");
      return;
    }

    if (currentArtwork.status === "sold") {
      alert("This artwork is already marked as sold.");
      return;
    }

    const hasBids = Number(auction.current_bid || 0) > 0;
    const confirmed = window.confirm(
      hasBids
        ? "This artwork has bids. Archive it as unsold anyway?"
        : "Archive this artwork as unsold and move it out of the live queue?"
    );

    if (!confirmed) return;

    setBusyAction("archive");
    await runLiveAction("archive-unsold");
    setBusyAction("");
  }

  async function moveToNextArtwork() {
    if (!nextArtwork) {
      alert("There are no more queued artworks. Sold and archived artworks are excluded from the live queue.");
      return;
    }

    if (auction?.status !== "sold" && currentArtwork?.status !== "archived") {
      const confirmed = window.confirm(
        "Move to the next artwork now? Make sure the current artwork has been sold or archived first."
      );

      if (!confirmed) return;
    }

    setBusyAction(`move-${nextArtwork.id}`);
    await runLiveAction("next-artwork");
    setBusyAction("");
  }

  async function resetAuction() {
    const confirmed = window.confirm(
      "Reset the live auction state? This will clear the current bids and return the parent screen to waiting."
    );

    if (!confirmed) return;

    setBusyAction("reset");
    await runLiveAction("reset");
    setBusyAction("");
  }

  async function clearBids() {
    const confirmed = window.confirm("Clear all bids for this auction?");

    if (!confirmed) return;

    setBusyAction("clear-bids");
    await runLiveAction("clear-bids");
    setBusyAction("");
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-[#020b18] text-white flex items-center justify-center">
        <div className="text-center">
          <DarkLogoBlock compact />
          <p className="text-white/70 font-black mt-5">
            Loading auction cockpit...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020b18] text-white">
      <img
        src="/bragwall-admin-paint-texture.png"
        alt=""
        className="live-visible-admin-paint-texture pointer-events-none fixed right-[28px] top-[170px] z-[1] hidden h-[560px] w-[440px] object-contain opacity-35 lg:block"
        aria-hidden="true"
      />
      <img
        src="/bragwall-admin-paint-texture.png"
        alt=""
        className="live-visible-admin-paint-texture pointer-events-none fixed left-[210px] bottom-[-40px] z-[1] hidden h-[420px] w-[340px] rotate-[-10deg] object-contain opacity-24 xl:block"
        aria-hidden="true"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .bragwall-live-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(255,255,255,0.18) transparent;
            }
            .bragwall-live-scroll::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            .bragwall-live-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .bragwall-live-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.16);
              border-radius: 999px;
            }
            .bragwall-live-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.28);
            }
          `,
        }}
      />

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(22,214,109,0.2),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(255,200,87,0.14),transparent_30%),linear-gradient(135deg,#061124_0%,#020b18_48%,#111827_100%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.055] bg-[url('/bragwall-admin-paint-texture.png')] bg-contain bg-no-repeat bg-right-top" />
      <div className="fixed inset-0 pointer-events-none bg-[#020b18]/72" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.105] bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <section className="relative z-10 min-h-screen p-3.5">
        <div className="min-h-[calc(100vh-28px)] rounded-[30px] border border-white/10 bg-white/[0.035] shadow-[0_30px_120px_rgba(0,0,0,0.72)] overflow-visible">
          <div className="grid min-h-[calc(100vh-28px)] grid-cols-[205px_1fr]">
            <aside className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] min-h-0 overflow-y-scroll overscroll-contain border-r border-white/10 bg-[#061124]/95 backdrop-blur-2xl p-4 pt-5 pr-3 flex flex-col [scrollbar-gutter:stable]">
              <div className="mt-4">
                <AdminAuctionSelector />
              </div>

              <nav className="space-y-2.5 mt-4">
                <SidebarLink
                  href="/admin"
                  label="Dashboard"
                  icon={<HomeIcon />}
                  tone="yellow"
                />
                <SidebarLink
                  href="/admin/setup"
                  label="Add School & Artwork"
                  icon={<PaletteIcon />}
                  tone="purple"
                />
                <SidebarLink
                  href="/admin/live"
                  label="Live Room"
                  icon={<GavelIcon />}
                  tone="green"
                  active
                />
                <SidebarLink
                  href="/admin/sales"
                  label="Sales Records"
                  icon={<CardIcon />}
                  tone="blue"
                />
                <SidebarLink
                  href={`/auction/${auctionCode}`}
                  label="Parent View"
                  icon={<PhoneIcon />}
                  tone="purple"
                />
              </nav>

              <div className="mt-auto rounded-[22px] border border-white/10 bg-[#020b18]/55 p-4 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.12] bg-[url('/bragwall-admin-paint-texture.png')] bg-contain bg-no-repeat bg-right-top" />
                <div className="absolute inset-0 bg-[#020b18]/78" />
                <div className="relative">
                <p className="uppercase tracking-[0.34em] text-[9px] text-white/55 font-black mb-3">
                  Auction Code
                </p>

                <p className="text-[30px] font-black text-[#16d66d] leading-none">
                  {auctionCode.toUpperCase()}
                </p>

                <p className="text-white/58 text-xs font-bold mt-3 leading-relaxed">
                  Parent access: /auction/{auctionCode}
                </p>
                </div>
              </div>

              <div className="mt-4">
                <AdminLogoutButton />
              </div>
            </aside>

            <section className="h-full overflow-y-auto bragwall-live-scroll">
              <header className="px-6 pt-5 pb-4">
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#061124]/86 p-5.5 shadow-[0_28px_85px_rgba(0,0,0,0.42)]">
                  <div className="absolute inset-0 pointer-events-none opacity-[0.11] bg-[url('/bragwall-hero-paint-hands.jpg')] bg-cover bg-center" />
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#061124] via-[#061124]/92 to-[#061124]/74" />
                  <div className="absolute right-0 top-0 h-full w-[42%] pointer-events-none bg-[radial-gradient(circle_at_72%_24%,rgba(255,200,87,0.16),transparent_34%),radial-gradient(circle_at_55%_70%,rgba(22,214,109,0.16),transparent_36%)]" />

                  <div className="relative flex items-start justify-between gap-8">
                    <div>
                      <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/10 px-5 py-2 shadow-xl mb-4">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isLive
                              ? "bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.9)]"
                              : "bg-[#ffc857] shadow-[0_0_18px_rgba(255,200,87,0.7)]"
                          }`}
                        />
                        <span className="uppercase tracking-[0.35em] text-[9px] font-black text-white/72">
                          BragWall Live Room
                        </span>
                      </div>

                      <h1 className="text-[48px] font-black leading-[0.9] tracking-[-0.065em]">
                        Live <span className="text-[#16d66d]">control</span>{" "}
                        room.
                      </h1>

                      <p className="max-w-4xl text-white/72 text-base leading-relaxed font-medium mt-3">
                        Run artwork intros, bidding rhythm, SOLD moments, and
                        the parent screen from one polished BragWall cockpit.
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-3.5 min-w-[620px] pt-3">
                      <TopMetric
                        label="Status"
                        value={formatStatus(statusLabel)}
                        icon={<ClockIcon />}
                        tone="purple"
                      />
                      <TopMetric
                        label="Current Bid"
                        value={`R${Number(
                          auction?.current_bid || 0
                        ).toLocaleString()}`}
                        icon={<MoneyIcon />}
                        tone="green"
                      />
                      <TopMetric
                        label="Bid Step"
                        value={`R${bidIncrement.toLocaleString()}`}
                        icon={<ArrowUpIcon />}
                        tone="yellow"
                      />
                      <TopMetric
                        label="Bidders"
                        value={`${uniqueBidderCount}`}
                        icon={<PeopleIcon />}
                        tone="blue"
                      />
                    </div>
                  </div>
                </div>
              </header>

              <div className="px-6 pb-5">
                <div className="grid grid-cols-[1fr_360px] gap-4.5">
                  <div className="space-y-4.5">
                    <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-4.5 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
                      <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
                        <div className="rounded-[28px] bg-[#061124]/95 border border-white/12 p-5 shadow-2xl">
                          <div className="flex items-start justify-between gap-5 mb-4">
                            <div>
                              <p className="uppercase tracking-[0.35em] text-[8px] text-[#16d66d] font-black mb-3">
                                On Stage
                              </p>

                              <h2 className="text-[38px] font-black leading-none tracking-[-0.045em]">
                                {currentArtwork
                                  ? `${currentArtwork.child_name} ${currentArtwork.child_surname}`
                                  : "No artwork selected"}
                              </h2>

                              <p className="text-white/65 text-base font-bold mt-2">
                                {currentArtwork?.grade ||
                                  "Upload artwork to begin"}
                              </p>
                            </div>

                            <StatusBadge status={statusLabel} />
                          </div>

                          <ArtworkStage artwork={currentArtwork} />

                          <div className="mt-3.5 grid grid-cols-3 gap-3">
                            <WhiteDataCard
                              label="Highest Bid"
                              value={`R${Number(
                                auction?.current_bid || 0
                              ).toLocaleString()}`}
                              tone="green"
                            />

                            <WhiteDataCard
                              label="Leading Bidder"
                              value={auction?.leading_bidder || "No bids yet"}
                              alignRight
                            />

                            <WhiteDataCard
                              label="Bidders"
                              value={`${uniqueBidderCount}`}
                              tone="blue"
                              alignRight
                            />
                          </div>
                        </div>

                        <div className="rounded-[28px] bg-[#061124]/95 border border-white/12 p-4 shadow-2xl flex flex-col relative overflow-hidden">
                          <div className="absolute right-[-50px] top-[-30px] h-[240px] w-[210px] pointer-events-none opacity-[0.28] bg-[url('/bragwall-admin-paint-texture.png')] bg-contain bg-no-repeat" />
                          <div className="absolute inset-0 pointer-events-none bg-[#061124]/78" />
                          <div className="relative flex flex-col h-full">
                          <div className="rounded-[24px] border border-[#ffc857]/32 bg-[radial-gradient(circle_at_top,rgba(211,108,255,0.24),transparent_36%),#020b18] p-5 text-center shadow-[0_0_45px_rgba(211,108,255,0.08)]">
                            <div className="mx-auto mb-4 h-[86px] w-[86px] rounded-[24px] border border-[#d36cff]/45 bg-[#d36cff]/12 text-[#f2c8ff] flex items-center justify-center shadow-[0_0_36px_rgba(211,108,255,0.18)]">
                              <LargeGavelIcon />
                            </div>

                            <p className="text-[#ffc857] text-[38px] font-black leading-none tracking-[-0.055em]">
                              {statusLabel === "sold" ? "SOLD!" : "LIVE"}
                            </p>

                            <p className="text-white/72 text-sm font-bold mt-3">
                              Next ask: R{nextBidAmount.toLocaleString()}
                            </p>
                          </div>

                          <div className="mt-3.5 rounded-[22px] bg-white text-[#07152b] p-4 shadow-xl max-h-[210px] overflow-y-auto bragwall-live-scroll">
                            <p className="uppercase tracking-[0.28em] text-[8px] text-slate-400 font-black mb-2.5 sticky top-0 bg-white pb-2">
                              AI Auction MC
                            </p>

                            <p className="text-[15px] font-black leading-snug">
                              “
                              {auction?.mc_commentary ||
                                currentArtwork?.ai_story ||
                                currentArtwork?.ai_intro ||
                                "Welcome to BragWall. The auction is waiting to begin."}
                              ”
                            </p>

                            {auction?.status === "preparing_intro" && (
                              <div className="mt-3 rounded-2xl bg-[#ffc857]/15 border border-[#ffc857]/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#ffc857] font-black mb-1">
                                  Preparing AI Voice
                                </p>
                                <p className="text-xs text-white/70 font-bold">
                                  Parent bidding is locked while the MC intro is generated.
                                </p>
                              </div>
                            )}

                            {auction?.mc_audio_url && auction.status === "intro" && (
                              <div className="mt-3 rounded-2xl bg-[#16d66d]/15 border border-[#16d66d]/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[#16d66d] font-black mb-1">
                                  AI Voice Ready
                                </p>
                                <p className="text-xs text-white/70 font-bold">
                                  Parent devices will play the generated MC intro.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
                            <SmallInfo
                              label="Queue"
                              value={`${queuedArtworks.length}`}
                            />
                            <SmallInfo
                              label="Sold"
                              value={`${soldArtworks.length}`}
                            />
                            <SmallInfo
                              label="Archived"
                              value={`${archivedArtworks.length}`}
                            />
                            <SmallInfo
                              label="Bidders"
                              value={`${uniqueBidderCount}`}
                            />
                          </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] bg-[#061124]/95 border border-white/10 p-4 shadow-2xl">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="uppercase tracking-[0.35em] text-[8px] text-[#16d66d] font-black mb-2">
                            Live Controls
                          </p>

                          <h3 className="text-[28px] font-black leading-none tracking-[-0.03em]">
                            Auction rhythm
                          </h3>
                        </div>

                        <button
                          onClick={() => loadEverything()}
                          className="rounded-[18px] bg-white/5 border border-white/10 px-5 py-3 font-black hover:bg-white/10 transition"
                        >
                          <span className="inline-flex align-middle mr-2">
                            <RefreshIcon />
                          </span>
                          Refresh
                        </button>
                      </div>

                      <div className="grid grid-cols-9 gap-3">
                        <ControlButton
                          label={busyAction ? "Preparing..." : "Start Intro"}
                          icon={<PlayIcon />}
                          onClick={startAuction}
                          disabled={Boolean(busyAction)}
                          tone="green"
                        />
                        <ControlButton
                          label="Pause"
                          icon={<PauseIcon />}
                          onClick={pauseAuction}
                          disabled={Boolean(busyAction)}
                          tone="white"
                        />
                        <ControlButton
                          label="Resume"
                          icon={<PlayIcon />}
                          onClick={resumeAuction}
                          disabled={Boolean(busyAction)}
                          tone="white"
                        />
                        <ControlButton
                          label="Going Once"
                          iconText="1"
                          onClick={markGoingOnce}
                          disabled={Boolean(busyAction)}
                          tone="yellow"
                        />
                        <ControlButton
                          label="Going Twice"
                          iconText="2"
                          onClick={markGoingTwice}
                          disabled={Boolean(busyAction)}
                          tone="red"
                        />
                        <ControlButton
                          label="SOLD"
                          icon={<GavelIcon />}
                          onClick={markSold}
                          disabled={Boolean(busyAction)}
                          tone="sold"
                        />
                        <ControlButton
                          label="Archive Unsold"
                          iconText="A"
                          onClick={archiveUnsoldArtwork}
                          disabled={Boolean(busyAction) || !currentArtwork || currentArtwork.status === "sold"}
                          tone="purple"
                        />
                        <ControlButton
                          label="Next Artwork"
                          iconText="NEXT"
                          onClick={moveToNextArtwork}
                          disabled={Boolean(busyAction) || !nextArtwork}
                          tone="blue"
                        />
                        <ControlButton
                          label="Reset"
                          icon={<RefreshIcon />}
                          onClick={resetAuction}
                          disabled={Boolean(busyAction)}
                          tone="white"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] bg-white/[0.04] border border-white/10 px-4 py-3">
                        <button
                          onClick={clearBids}
                          disabled={Boolean(busyAction)}
                          className="text-white/76 font-black hover:text-white disabled:opacity-40"
                        >
                          Clear Current Bids
                        </button>

                        <p className="text-white/45 text-sm font-bold">
                          Manual override controls are available if automation
                          needs help.
                        </p>
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-4.5">
                    <SidePanel
                      title="Artwork Queue"
                      subtitle="Tap an artwork to move it live"
                      icon={<ArtworkIcon />}
                    >
                      <div className="space-y-3 max-h-[275px] overflow-auto pr-1 bragwall-live-scroll">
                        {queuedArtworks.length === 0 && (
                          <p className="text-white/72 font-bold">
                            No queued artwork available. Sold and archived items are kept out of the live queue.
                          </p>
                        )}

                        {queuedArtworks.map((artwork) => {
                          const displayUrl = getArtworkDisplayUrl(artwork);
                          const active = currentArtwork?.id === artwork.id;

                          return (
                            <button
                              key={artwork.id}
                              onClick={() => moveToArtwork(artwork)}
                              disabled={busyAction === `move-${artwork.id}`}
                              className={`w-full text-left rounded-[20px] p-3 border transition ${
                                active
                                  ? "bg-[#16d66d] text-[#07152b] border-[#16d66d] shadow-[0_0_28px_rgba(22,214,109,0.22)]"
                                  : "bg-white/[0.045] text-white border-white/10 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-[16px] overflow-hidden bg-white shrink-0">
                                  {displayUrl ? (
                                    <img
                                      src={displayUrl}
                                      alt="Artwork thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <PaletteIcon />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-black truncate">
                                    {artwork.child_name} {artwork.child_surname}
                                  </p>

                                  <p
                                    className={`text-xs font-bold truncate ${
                                      active
                                        ? "text-[#07152b]/75"
                                        : "text-white/58"
                                    }`}
                                  >
                                    {artwork.grade} •{" "}
                                    {artwork.status || "queued"}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </SidePanel>

                    {soldArtworks.length > 0 && (
                      <SidePanel
                        title="Sold Artworks"
                        subtitle={`${soldArtworks.length} completed with SOLD overlay`}
                        icon={<GavelIcon />}
                      >
                        <div className="space-y-3 max-h-[210px] overflow-auto pr-1 bragwall-live-scroll">
                          {soldArtworks.map((artwork) => {
                            const displayUrl = getArtworkDisplayUrl(artwork);

                            return (
                              <div
                                key={artwork.id}
                                className="rounded-[18px] bg-white/[0.055] border border-[#ffc857]/25 p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-14 h-14 rounded-[16px] overflow-hidden bg-white shrink-0">
                                    {displayUrl ? (
                                      <img
                                        src={displayUrl}
                                        alt="Sold artwork thumbnail"
                                        className="w-full h-full object-cover opacity-70"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <PaletteIcon />
                                      </div>
                                    )}
                                    <div className="absolute inset-x-[-8px] top-1/2 -translate-y-1/2 rotate-[-14deg] bg-[#ef2b20] py-0.5 text-center text-[9px] font-black text-white shadow-lg">
                                      SOLD
                                    </div>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="font-black truncate">
                                      {artwork.child_name} {artwork.child_surname}
                                    </p>
                                    <p className="text-xs text-white/55 font-bold truncate">
                                      {artwork.grade} • {artwork.winning_bidder || "winner recorded"}
                                    </p>
                                  </div>

                                  <p className="text-[#16d66d] font-black shrink-0">
                                    R{Number(artwork.sold_amount || 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </SidePanel>
                    )}

                    {archivedArtworks.length > 0 && (
                      <SidePanel
                        title="Archived / Unsold"
                        subtitle="Kept out of the live queue"
                        icon={<ArchiveIcon />}
                      >
                        <div className="space-y-3 max-h-[170px] overflow-auto pr-1 bragwall-live-scroll">
                          {archivedArtworks.map((artwork) => (
                            <div
                              key={artwork.id}
                              className="rounded-[18px] bg-white/[0.045] border border-white/10 p-3"
                            >
                              <p className="font-black truncate">
                                {artwork.child_name} {artwork.child_surname}
                              </p>
                              <p className="text-xs text-white/55 font-bold">
                                {artwork.grade} - archived unsold
                              </p>
                            </div>
                          ))}
                        </div>
                      </SidePanel>
                    )}

                    <SidePanel
                      title="Live Feed"
                      subtitle="Highest bids first"
                      icon={<CardIcon />}
                    >
                      <div className="space-y-3 max-h-[245px] overflow-auto pr-1 bragwall-live-scroll">
                        {visibleBids.length === 0 && (
                          <p className="text-white/72 font-bold">No bids yet.</p>
                        )}

                        {visibleBids.map((bid, index) => (
                          <div
                            key={bid.id}
                            className={`rounded-[18px] p-3 border ${
                              index === 0
                                ? "bg-white text-[#07152b] border-white shadow-xl"
                                : "bg-white/[0.045] text-white border-white/10"
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
                                    index === 0
                                      ? "text-slate-500"
                                      : "text-white/55"
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
                    </SidePanel>

                    <SidePanel
                      title="Activity Log"
                      subtitle="Latest auction events"
                      icon={<ActivityIcon />}
                    >
                      <div className="space-y-3 max-h-[245px] overflow-auto pr-1 bragwall-live-scroll">
                        {activity.length === 0 && (
                          <p className="text-white/72 font-bold">
                            Activity will appear here.
                          </p>
                        )}

                        {activity.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[18px] bg-white/[0.045] border border-white/10 p-3"
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
                    </SidePanel>
                  </aside>
                </div>

                <div className="mt-4.5 rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-3.5 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-[#16d66d]">
                      <ShieldIcon />
                    </span>
                    <p className="text-white/65 font-bold">
                      Tip: use Add School & Artwork to load school details,
                      bid increments, and artwork before going live.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[#16d66d] font-black">
                    <ShieldIcon />
                    Auction cockpit ready
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function estimateMcIntroSeconds(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimated = Math.ceil(wordCount / MC_WORDS_PER_SECOND) + MC_INTRO_PADDING_SECONDS;

  return Math.min(
    MAX_MC_INTRO_SECONDS,
    Math.max(MIN_MC_INTRO_SECONDS, estimated)
  );
}

function getSafeBidIncrement(value?: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BID_STEP;
  }

  return Math.round(parsed);
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

  const activeArtworks = artworks.filter(
    (item) => item.status !== "sold" && item.status !== "archived"
  );

  return (
    activeArtworks.find((item) => item.status === "live") ||
    activeArtworks.find((item) => item.status === "queued") ||
    activeArtworks.find((item) => item.status === "pending") ||
    activeArtworks.find((item) => item.sort_order === 1) ||
    activeArtworks[0] ||
    null
  );
}

function getNextArtwork(
  currentArtwork: Artwork | null,
  activeQueueArtworks: Artwork[]
): Artwork | null {
  const sorted = [...activeQueueArtworks].sort((a, b) => {
    const aOrder = Number(a.sort_order || 0);
    const bOrder = Number(b.sort_order || 0);

    if (aOrder !== bOrder) return aOrder - bOrder;

    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });

  if (!currentArtwork) {
    return sorted.find((item) => item.status !== "live") || sorted[0] || null;
  }

  const currentIndex = sorted.findIndex((item) => item.id === currentArtwork.id);

  if (currentIndex >= 0) {
    return sorted.slice(currentIndex + 1).find((item) => item.id !== currentArtwork.id) ||
      sorted.find((item) => item.id !== currentArtwork.id) ||
      null;
  }

  return sorted.find((item) => item.id !== currentArtwork.id) || null;
}

function getMcIntroText(artwork: Artwork) {
  const story =
    artwork.ai_story?.trim() ||
    artwork.ai_intro?.trim() ||
    artwork.description?.trim();

  if (story) return story;

  const childName = [artwork.child_name, artwork.child_surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return `Ladies and gentlemen, our next BragWall masterpiece is by ${
    childName || "one of our young artists"
  } from ${
    artwork.grade || "the school"
  }. Take a good look — bidding opens in a moment.`;
}

function formatStatus(status: string) {
  if (!status) return "Waiting";

  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return "Just now";

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DarkLogoBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-[24px] border border-white/10 bg-[#020b18] shadow-2xl relative overflow-hidden ${
        compact ? "px-7 py-5" : "px-4 py-5"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,214,109,0.12),transparent_45%)]" />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative text-center">
        <div className="mx-auto flex items-center justify-center rounded-[18px] bg-white px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
          <img
            src="/bragwall-logo.png"
            alt="BragWall"
            className={`${compact ? "h-12" : "h-14"} w-auto object-contain`}
          />
        </div>

        <p className="mt-4 uppercase tracking-[0.28em] text-[9px] text-white/62 font-black">
          Young Art • Big Pride
        </p>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  tone,
  active = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  tone: Tone;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3.5 rounded-[17px] px-4 py-3.5 text-sm font-black transition border ${
        active
          ? "bg-[#16d66d]/20 text-white border-[#16d66d]/70 shadow-[0_0_30px_rgba(22,214,109,0.18)]"
          : "bg-white/[0.045] text-white/76 border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`h-[22px] w-[22px] flex items-center justify-center ${toneText(
          tone
        )}`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function TopMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: Tone;
}) {
  return (
    <div className="rounded-[22px] bg-white/[0.055] border border-white/12 p-4 shadow-xl flex items-center gap-3.5">
      <div
        className={`h-10 w-10 flex items-center justify-center ${toneText(
          tone
        )}`}
      >
        {icon}
      </div>

      <div>
        <p className="uppercase tracking-[0.28em] text-[8px] text-white/48 font-black mb-1.5">
          {label}
        </p>

        <p className={`text-[22px] font-black leading-none ${toneText(tone)}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSold = status === "sold";
  const isWaiting = status === "waiting";
  const isDanger = status === "going twice";
  const isGold = status === "going once";
  const isIntro = status === "intro";
  const isPreparingIntro = status === "preparing_intro";

  return (
    <div
      className={`rounded-[18px] px-4 py-3 text-center border shrink-0 ${
        isSold
          ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
          : isPreparingIntro
          ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
          : isIntro
          ? "bg-[#d36cff] text-white border-[#d36cff]"
          : isDanger
          ? "bg-[#ef2b20] text-white border-[#ff8d86]/40"
          : isGold
          ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
          : isWaiting
          ? "bg-white/[0.055] text-white border-white/10"
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
    <div className="rounded-[26px] overflow-hidden border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.42)] bg-[#16110b]">
      <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-3.5">
        <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[22px] shadow-[0_0_48px_rgba(255,200,87,0.28)]">
          <div className="bg-[#f8f5ef] rounded-[16px] p-3">
            <div className="rounded-[12px] overflow-hidden bg-white h-[220px] flex items-center justify-center">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Current artwork"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 p-10">
                  <div className="text-[#ffc857] mb-4 flex justify-center">
                    <PaletteIcon large />
                  </div>
                  <p className="text-2xl font-black">No artwork selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-6 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
    </div>
  );
}

function WhiteDataCard({
  label,
  value,
  tone,
  alignRight = false,
}: {
  label: string;
  value: string;
  tone?: Tone;
  alignRight?: boolean;
}) {
  return (
    <div
      className={`bg-white text-[#07152b] rounded-[20px] p-4 shadow-xl ${
        alignRight ? "text-right" : ""
      }`}
    >
      <p className="uppercase tracking-[0.25em] text-[8px] text-slate-400 font-black mb-2">
        {label}
      </p>

      <p
        className={`text-[28px] font-black leading-none truncate ${
          tone ? toneText(tone) : "text-[#07152b]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/[0.075] border border-white/12 px-4 py-3.5 text-left shadow-xl min-h-[82px] flex items-center justify-between gap-3 hover:bg-white/[0.095] transition">
      <div className="min-w-0">
        <p className="uppercase tracking-[0.16em] text-[8px] text-white/52 font-black mb-1.5 truncate">
          {label}
        </p>

        <p className="text-[12px] text-white/42 font-bold leading-none">
          Total
        </p>
      </div>

      <p className="text-[36px] font-black text-[#16d66d] leading-none shrink-0">
        {value}
      </p>
    </div>
  );
}

function ControlButton({
  label,
  icon,
  iconText,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  icon?: ReactNode;
  iconText?: string;
  onClick: () => void;
  disabled?: boolean;
  tone: Tone | "sold";
}) {
  const buttonClass =
    tone === "green"
      ? "bg-[#16d66d] text-[#07152b] border-[#16d66d]"
      : tone === "yellow"
      ? "bg-[#ffc857] text-[#07152b] border-[#ffc857]"
      : tone === "red"
      ? "bg-[#ef2b20] text-white border-[#ef2b20]"
      : tone === "sold"
      ? "bg-white text-[#07152b] border-white"
      : "bg-white/[0.055] text-white border-white/10 hover:bg-white/10";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[18px] p-3.5 font-black text-left shadow-xl transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 border ${buttonClass}`}
    >
      <div className="h-7 flex items-center mb-2">
        {iconText ? (
          <span className="text-2xl font-black">{iconText}</span>
        ) : (
          <span>{icon}</span>
        )}
      </div>

      <p className="text-sm">{label}</p>
    </button>
  );
}

function SidePanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] bg-[#061124]/95 border border-white/10 p-4 shadow-2xl">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full border border-white/12 bg-white/[0.045] flex items-center justify-center text-white/80 shrink-0">
          {icon}
        </div>

        <div>
          <p className="uppercase tracking-[0.28em] text-[9px] text-[#16d66d] font-black mb-1">
            {title}
          </p>

          <p className="text-white/62 text-sm font-bold">{subtitle}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function ShieldIcon() {
  return (
    <IconSvg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconSvg>
  );
}

function HomeIcon() {
  return (
    <IconSvg>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </IconSvg>
  );
}

function GavelIcon() {
  return (
    <IconSvg>
      <path d="m14 13-7 7" />
      <path d="m8 8 8 8" />
      <path d="m9 7 4-4 8 8-4 4z" />
      <path d="m4 21 5-5" />
    </IconSvg>
  );
}

function LargeGavelIcon() {
  return (
    <IconSvg large>
      <path d="m14 13-7 7" />
      <path d="m8 8 8 8" />
      <path d="m9 7 4-4 8 8-4 4z" />
      <path d="m4 21 5-5" />
    </IconSvg>
  );
}

function PaletteIcon({ large = false }: { large?: boolean }) {
  return (
    <IconSvg large={large}>
      <path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.4 4-3.2 4H17a2 2 0 0 0-2 2c0 2.2-1.8 4-3 4Z" />
      <circle cx="7.5" cy="10.5" r=".8" />
      <circle cx="10.5" cy="7.5" r=".8" />
      <circle cx="14.5" cy="7.5" r=".8" />
      <circle cx="16.5" cy="11.5" r=".8" />
    </IconSvg>
  );
}

function CardIcon() {
  return (
    <IconSvg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
      <path d="M15 15h2" />
    </IconSvg>
  );
}

function PhoneIcon() {
  return (
    <IconSvg>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </IconSvg>
  );
}

function PeopleIcon() {
  return (
    <IconSvg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconSvg>
  );
}

function ClockIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconSvg>
  );
}

function MoneyIcon() {
  return (
    <IconSvg>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M7 9v.01" />
      <path d="M17 15v.01" />
    </IconSvg>
  );
}

function ArrowUpIcon() {
  return (
    <IconSvg>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </IconSvg>
  );
}

function PlayIcon() {
  return (
    <IconSvg>
      <path d="m8 5 11 7-11 7z" />
    </IconSvg>
  );
}

function PauseIcon() {
  return (
    <IconSvg>
      <path d="M10 4H6v16h4z" />
      <path d="M18 4h-4v16h4z" />
    </IconSvg>
  );
}

function RefreshIcon() {
  return (
    <IconSvg>
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18 2v4h4" />
      <path d="M6 22v-4H2" />
    </IconSvg>
  );
}

function ActivityIcon() {
  return (
    <IconSvg>
      <path d="M4 12h4l2-5 4 10 2-5h4" />
    </IconSvg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16v13H4V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 4h18v3H3V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArtworkIcon() {
  return (
    <IconSvg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
      <path d="m12 17 3-3 6 6" />
    </IconSvg>
  );
}

function IconSvg({
  children,
  large = false,
}: {
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={large ? "h-12 w-12" : "h-[22px] w-[22px]"}
    >
      {children}
    </svg>
  );
}

function toneText(tone: Tone) {
  if (tone === "green") return "text-[#16d66d]";
  if (tone === "yellow") return "text-[#ffc857]";
  if (tone === "blue") return "text-[#4b9cff]";
  if (tone === "purple") return "text-[#d36cff]";
  if (tone === "red") return "text-[#ef2b20]";
  return "text-white";
}








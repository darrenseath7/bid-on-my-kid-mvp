"use client";

import { useEffect, useMemo, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

type Artwork = {
  id: string;
  sort_order: number;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  status: string;
  sold_amount: number | null;
  winning_bidder: string | null;
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

type AuctionState = {
  status: string;
  current_bid: number;
  leading_bidder: string;
};

export default function AdminDashboardPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [auction, setAuction] = useState<AuctionState | null>(null);

  useEffect(() => {
    fetchDashboard();

    const auctionChannel = supabase
      .channel("dashboard-auction")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_auction_state",
          filter: "auction_code=eq.demo",
        },
        () => fetchDashboard()
      )
      .subscribe();

    const artworkChannel = supabase
      .channel("dashboard-artworks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: "auction_code=eq.demo",
        },
        () => fetchDashboard()
      )
      .subscribe();

    const bidsChannel = supabase
      .channel("dashboard-bids")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
        },
        () => fetchDashboard()
      )
      .subscribe();

    const activityChannel = supabase
      .channel("dashboard-activity")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_activity_feed",
          filter: "auction_code=eq.demo",
        },
        () => fetchDashboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(artworkChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  async function fetchDashboard() {
    const [artworksResult, bidsResult, activityResult, auctionResult] =
      await Promise.all([
        supabase
          .from("demo_artworks")
          .select("*")
          .eq("auction_code", "demo")
          .order("sort_order", { ascending: true }),

        supabase
          .from("live_bids")
          .select("*")
          .eq("auction_code", "demo")
          .order("amount", { ascending: false })
          .limit(10),

        supabase
          .from("live_activity_feed")
          .select("*")
          .eq("auction_code", "demo")
          .order("created_at", { ascending: false })
          .limit(8),

        supabase
          .from("live_auction_state")
          .select("status,current_bid,leading_bidder")
          .eq("auction_code", "demo")
          .single(),
      ]);

    setArtworks(artworksResult.data || []);
    setBids(bidsResult.data || []);
    setActivities(activityResult.data || []);
    setAuction(auctionResult.data || null);
  }

  const totalRaised = useMemo(() => {
    return artworks.reduce((total, artwork) => {
      return total + (artwork.sold_amount || 0);
    }, 0);
  }, [artworks]);

  const soldCount = artworks.filter((item) => item.status === "sold").length;
  const liveArtwork = artworks.find((item) => item.status === "live");
  const pendingCount = artworks.filter((item) => item.status === "pending").length;
  const topBid = bids[0];

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <section className="max-w-7xl mx-auto px-5 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">
          <div className="bg-white rounded-2xl p-4 w-fit">
            <BrandHeader />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/live"
              className="rounded-2xl bg-[#16d66d] text-[#07152b] px-6 py-4 font-black shadow-xl"
            >
              Open Live Room
            </a>

            <a
              href="/admin/artworks"
              className="rounded-2xl bg-white text-[#07152b] px-6 py-4 font-black shadow-xl"
            >
              Upload Artwork
            </a>

            <a
              href="/admin/school"
              className="rounded-2xl bg-white/10 text-white px-6 py-4 font-black border border-white/10"
            >
              School Profile
            </a>
          </div>
        </div>

        <div className="mb-10">
          <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
            School Admin Dashboard
          </p>

          <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] mb-5">
            BragWall event overview.
          </h1>

          <p className="text-white/55 text-2xl max-w-4xl leading-relaxed">
            Track live fundraising, sold artworks, bidding activity, and auction
            progress in one premium command dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Raised"
            value={`R${totalRaised.toLocaleString()}`}
            subtext="From sold artworks"
            color="#16d66d"
          />

          <StatCard
            label="Current Bid"
            value={`R${(auction?.current_bid || 0).toLocaleString()}`}
            subtext={`Leading: ${auction?.leading_bidder || "No bids yet"}`}
            color="#ffc107"
          />

          <StatCard
            label="Sold Artworks"
            value={`${soldCount}`}
            subtext={`${pendingCount} still pending`}
            color="#ffffff"
          />

          <StatCard
            label="Auction Status"
            value={(auction?.status || "waiting").toUpperCase()}
            subtext={liveArtwork ? `${liveArtwork.child_name} is live` : "No live artwork"}
            color="#2878cf"
          />
        </div>

        <div className="grid xl:grid-cols-[1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[36px] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                    Current Artwork
                  </p>

                  <h2 className="text-4xl font-black">
                    {liveArtwork
                      ? `${liveArtwork.child_name} ${liveArtwork.child_surname}`
                      : "No artwork live"}
                  </h2>

                  <p className="text-white/50 text-lg mt-2">
                    {liveArtwork?.grade || "Start the auction to begin"}
                  </p>
                </div>

                <StatusPill status={auction?.status || "waiting"} />
              </div>

              {liveArtwork ? (
                <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[32px]">
                  <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[24px]">
                    <div className="bg-[#f8f5ef] rounded-[18px] p-5">
                      <img
                        src={liveArtwork.artwork_url}
                        alt="Current artwork"
                        className="w-full max-h-[520px] object-contain rounded-[14px] bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] bg-white/5 border border-white/10 p-10 text-white/40">
                  No current artwork.
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-2xl font-black">Artwork Queue</h3>
                <p className="text-white/40">{artworks.length} artworks</p>
              </div>

              <div className="divide-y divide-white/10">
                {artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className="p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={artwork.artwork_url}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover bg-white/10"
                      />

                      <div>
                        <p className="font-black text-lg">
                          {artwork.sort_order}. {artwork.child_name}{" "}
                          {artwork.child_surname}
                        </p>

                        <p className="text-white/40 text-sm">
                          {artwork.grade} • {artwork.status}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-[#16d66d]">
                        {artwork.sold_amount
                          ? `R${artwork.sold_amount.toLocaleString()}`
                          : "-"}
                      </p>

                      {artwork.winning_bidder && (
                        <p className="text-white/40 text-sm">
                          {artwork.winning_bidder}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#16d66d] text-[#07152b] rounded-[32px] p-7 shadow-2xl">
              <p className="uppercase tracking-[0.3em] text-xs font-black mb-4">
                Fundraising Momentum
              </p>

              <h2 className="text-6xl font-black mb-4">
                R{totalRaised.toLocaleString()}
              </h2>

              <div className="w-full h-5 bg-[#07152b]/15 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-[#07152b]"
                  style={{
                    width: `${Math.min((totalRaised / 50000) * 100, 100)}%`,
                  }}
                />
              </div>

              <p className="font-bold">
                Demo target: R50,000. Update target later per school event.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-2xl font-black">Top Bids</h3>
              </div>

              <div className="divide-y divide-white/10">
                {bids.length === 0 && (
                  <div className="p-5 text-white/40">No live bids yet.</div>
                )}

                {bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className="p-5 flex items-center justify-between"
                  >
                    <p className="font-black text-lg">
                      {index === 0 ? "👑 " : ""}
                      {bid.bidder_name}
                    </p>

                    <p className="text-2xl font-black text-[#16d66d]">
                      R{bid.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-2xl font-black">Recent Activity</h3>
              </div>

              <div className="divide-y divide-white/10">
                {activities.length === 0 && (
                  <div className="p-5 text-white/40">
                    Activity will appear once the event starts.
                  </div>
                )}

                {activities.map((activity) => (
                  <div key={activity.id} className="p-5 font-bold">
                    • {activity.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a
                href="/admin/live"
                className="rounded-2xl bg-white text-[#07152b] py-5 text-center font-black"
              >
                Control Room
              </a>

              <a
                href="/auction/demo"
                className="rounded-2xl bg-white/10 text-white py-5 text-center font-black border border-white/10"
              >
                Parent View
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-[28px] p-6 text-[#07152b] shadow-xl">
      <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
        {label}
      </p>

      <h2
        className="text-4xl font-black leading-tight mb-3"
        style={{ color }}
      >
        {value}
      </h2>

      <p className="text-slate-500 font-bold">{subtext}</p>
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
      : "bg-white/10 text-white border-white/20";

  return (
    <div className={`rounded-2xl border px-5 py-3 font-black ${styles}`}>
      {status.toUpperCase()}
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import AdminLogoutButton from "@/components/AdminLogoutButton";
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
  winner_email?: string | null;
  invoice_email_requested_at?: string | null;
  certificate_email_requested_at?: string | null;
};

type Bid = {
  id: string;
  bidder_name: string;
  amount: number;
};

type AuctionState = {
  status: string;
  current_bid: number;
  leading_bidder: string;
};

export default function AdminDashboardPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [auction, setAuction] = useState<AuctionState | null>(null);

  useEffect(() => {
    fetchDashboard();

    const auctionChannel = supabase
      .channel("dashboard-clean-auction")
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
      .channel("dashboard-clean-artworks")
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
      .channel("dashboard-clean-bids")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_bids",
          filter: "auction_code=eq.demo",
        },
        () => fetchDashboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(artworkChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, []);

  async function fetchDashboard() {
    const [artworksResult, bidsResult, auctionResult] = await Promise.all([
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
        .limit(5),

      supabase
        .from("live_auction_state")
        .select("status,current_bid,leading_bidder")
        .eq("auction_code", "demo")
        .single(),
    ]);

    setArtworks(artworksResult.data || []);
    setBids(bidsResult.data || []);
    setAuction(auctionResult.data || null);
  }

  const totalRaised = useMemo(() => {
    return artworks.reduce((total, artwork) => {
      return total + (artwork.sold_amount || 0);
    }, 0);
  }, [artworks]);

  const soldArtworks = artworks.filter((item) => item.status === "sold");
  const soldCount = soldArtworks.length;
  const pendingCount = artworks.filter((item) => item.status === "pending")
    .length;
  const liveArtwork = artworks.find((item) => item.status === "live");
  const topBid = bids[0];

  const invoicesReady = soldArtworks.filter(
    (item) => item.winner_email || item.invoice_email_requested_at
  ).length;

  const missingWinnerEmails = soldArtworks.filter(
    (item) => !item.winner_email
  ).length;

  const recentSales = soldArtworks
    .slice()
    .sort((a, b) => b.sort_order - a.sort_order)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
        <AdminSidebar />

        <div className="lg:hidden bg-[#061124] border-b border-white/10 px-4 py-4 sticky top-0 z-40">
          <div className="bg-white rounded-2xl p-3 mb-4 w-fit">
            <BrandHeader />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <MobileNavItem href="/admin" label="Dashboard" active />
            <MobileNavItem href="/admin/events/new" label="New Event" />
            <MobileNavItem href="/admin/live" label="Live" />
            <MobileNavItem href="/admin/artworks" label="Artworks" />
            <MobileNavItem href="/admin/school" label="School" />
            <MobileNavItem href="/admin/sales" label="Sales" />
          </div>

          <div className="mt-3">
            <AdminLogoutButton />
          </div>
        </div>

        <section className="px-5 py-7 lg:px-8 lg:py-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
                Admin Dashboard
              </p>

              <h1 className="text-5xl lg:text-7xl font-black leading-none mb-4">
                Event overview.
              </h1>

              <p className="text-white/55 text-xl max-w-3xl leading-relaxed">
                A cleaner control hub for fundraising, live auction progress,
                winner emails, invoices, and certificates.
              </p>
            </div>

            <StatusPill status={auction?.status || "waiting"} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
              label="Invoices"
              value={`${invoicesReady}`}
              subtext={
                missingWinnerEmails > 0
                  ? `${missingWinnerEmails} waiting for email`
                  : "Winner emails captured"
              }
              color="#2878cf"
            />
          </div>

          <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-6">
              <section className="bg-white/5 border border-white/10 rounded-[36px] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                      Live Artwork
                    </p>

                    <h2 className="text-4xl font-black leading-tight">
                      {liveArtwork
                        ? `${liveArtwork.child_name} ${liveArtwork.child_surname}`
                        : "No artwork live"}
                    </h2>

                    <p className="text-white/50 text-lg mt-2">
                      {liveArtwork?.grade || "Start the auction to begin"}
                    </p>
                  </div>

                  <a
                    href="/admin/live"
                    className="hidden sm:inline-block rounded-2xl bg-[#16d66d] text-[#07152b] px-5 py-4 font-black shadow-xl"
                  >
                    Open Live Room
                  </a>
                </div>

                {liveArtwork ? (
                  <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-5 items-center">
                    <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-4 rounded-[30px]">
                      <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[24px]">
                        <div className="bg-[#f8f5ef] rounded-[18px] p-4">
                          <img
                            src={liveArtwork.artwork_url}
                            alt="Current artwork"
                            className="w-full max-h-[360px] object-contain rounded-[14px] bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <MiniInfo
                        label="Current Highest Bid"
                        value={`R${(
                          auction?.current_bid || 0
                        ).toLocaleString()}`}
                      />

                      <MiniInfo
                        label="Leading Bidder"
                        value={auction?.leading_bidder || "No bids yet"}
                      />

                      <MiniInfo
                        label="Top Bid"
                        value={
                          topBid
                            ? `R${topBid.amount.toLocaleString()} from ${
                                topBid.bidder_name
                              }`
                            : "No bids yet"
                        }
                      />

                      <a
                        href="/admin/live"
                        className="sm:hidden block rounded-2xl bg-[#16d66d] text-[#07152b] px-5 py-4 font-black text-center shadow-xl"
                      >
                        Open Live Room
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] bg-white/5 border border-white/10 p-10 text-white/40">
                    No current artwork.
                  </div>
                )}
              </section>

              <section className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">Artwork Queue</h3>
                    <p className="text-white/40 text-sm mt-1">
                      {artworks.length} artworks loaded
                    </p>
                  </div>

                  <a
                    href="/admin/artworks"
                    className="rounded-2xl bg-white text-[#07152b] px-5 py-3 font-black"
                  >
                    Manage
                  </a>
                </div>

                <div className="divide-y divide-white/10">
                  {artworks.length === 0 && (
                    <div className="p-5 text-white/40">
                      No artworks uploaded yet.
                    </div>
                  )}

                  {artworks.slice(0, 6).map((artwork) => (
                    <div
                      key={artwork.id}
                      className="p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={artwork.artwork_url}
                          alt=""
                          className="w-16 h-16 rounded-2xl object-cover bg-white/10 shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="font-black text-lg truncate">
                            {artwork.sort_order}. {artwork.child_name}{" "}
                            {artwork.child_surname}
                          </p>

                          <p className="text-white/40 text-sm">
                            {artwork.grade} • {artwork.status}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-black text-[#16d66d]">
                          {artwork.sold_amount
                            ? `R${artwork.sold_amount.toLocaleString()}`
                            : "-"}
                        </p>

                        {artwork.winning_bidder && (
                          <p className="text-white/40 text-sm max-w-[130px] truncate">
                            {artwork.winning_bidder}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-[#16d66d] text-[#07152b] rounded-[32px] p-7 shadow-2xl">
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
                  Demo target: R50,000. Event targets will become dynamic per
                  school event.
                </p>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">Sales / Invoices</h3>
                    <p className="text-white/40 text-sm mt-1">
                      Recent sold artworks and winner emails
                    </p>
                  </div>

                  <a
                    href="/admin/sales"
                    className="rounded-2xl bg-[#ef2b20] text-white px-5 py-3 font-black"
                  >
                    Open
                  </a>
                </div>

                <div className="divide-y divide-white/10">
                  {recentSales.length === 0 && (
                    <div className="p-5 text-white/40">
                      Sold artworks will appear here after the first sale.
                    </div>
                  )}

                  {recentSales.map((artwork) => (
                    <div key={artwork.id} className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-black text-lg">
                            {artwork.child_name} {artwork.child_surname}
                          </p>

                          <p className="text-white/40 text-sm">
                            Winner: {artwork.winning_bidder || "Not captured"}
                          </p>
                        </div>

                        <p className="font-black text-[#16d66d] text-xl">
                          R{(artwork.sold_amount || 0).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-3 font-black text-sm ${
                          artwork.winner_email
                            ? "bg-[#16d66d]/15 text-[#16d66d]"
                            : "bg-[#ffc107]/15 text-[#ffc107]"
                        }`}
                      >
                        {artwork.winner_email
                          ? `Email captured: ${artwork.winner_email}`
                          : "Waiting for winner email"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-[32px] p-6">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                  Admin Shortcuts
                </p>

                <div className="grid gap-3">
                  <Shortcut href="/admin/events/new" label="Create New Event" />
                  <Shortcut href="/admin/artworks" label="Upload Artwork" />
                  <Shortcut href="/admin/school" label="School Profile" />
                  <Shortcut href="/auction/demo" label="Open Parent View" />
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminSidebar() {
  return (
    <aside className="hidden lg:flex bg-[#061124] border-r border-white/10 p-6 flex-col">
      <div className="bg-white rounded-2xl p-4 mb-8">
        <BrandHeader center />
      </div>

      <nav className="space-y-2 text-sm font-bold">
        <SidebarItem href="/admin" label="Dashboard" active />
        <SidebarItem href="/admin/events/new" label="Create Event" />
        <SidebarItem href="/admin/live" label="Live Auction" />
        <SidebarItem href="/admin/artworks" label="Artworks" />
        <SidebarItem href="/admin/school" label="School Profile" />
        <SidebarItem href="/admin/sales" label="Sales / Invoices" />
        <SidebarItem href="/auction/demo" label="Parent View" />
      </nav>

      <div className="mt-auto space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
          <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-3">
            BragWall
          </p>

          <p className="text-white/70 font-bold leading-relaxed">
            Young art, big pride, live fundraising.
          </p>
        </div>

        <AdminLogoutButton />
      </div>
    </aside>
  );
}

function SidebarItem({
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
        active
          ? "bg-white text-[#07152b]"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </a>
  );
}

function MobileNavItem({
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
      className={`rounded-2xl px-4 py-3 text-sm font-black whitespace-nowrap ${
        active
          ? "bg-white text-[#07152b]"
          : "bg-white/10 text-white border border-white/10"
      }`}
    >
      {label}
    </a>
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
      : status === "finished"
      ? "bg-[#2878cf]/20 text-[#6fb0ff] border-[#2878cf]/40"
      : "bg-white/10 text-white border-white/20";

  return (
    <div className={`rounded-2xl border px-6 py-4 font-black text-lg ${styles}`}>
      {status.toUpperCase()}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[24px] p-5">
      <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-2xl font-black leading-tight">{value}</p>
    </div>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-2xl bg-white/10 border border-white/10 px-5 py-4 font-black hover:bg-white hover:text-[#07152b] transition"
    >
      {label}
    </a>
  );
}
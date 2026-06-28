"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import AdminAuctionSelector from "@/components/AdminAuctionSelector";
import AdminPanel from "@/components/admin/AdminPanel";
import AdminShell from "@/components/admin/AdminShell";
import AdminStatCard from "@/components/admin/AdminStatCard";
import {
  DEFAULT_ADMIN_AUCTION_CODE,
  useAdminAuctionCode,
} from "@/lib/useAdminAuctionCode";

type DashboardSummary = {
  auctionCode: string;
  schoolName: string;
  schoolsCount: number;
  artworksCount: number;
  unsoldArtworksCount: number;
  soldArtworksCount: number;
  liveRoomsCount: number;
  totalRaised: number;
  allTotalRaised: number;
  winnerEmailsCaptured: number;
  winnerEmailsMissing: number;
  liveStatus: string;
  currentBid: number;
  topSchools: Array<{ code: string; name: string; total: number; sold: number }>;
  recentActivity: Array<{ id: string; message: string; status: string }>;
};

const emptySummary: DashboardSummary = {
  auctionCode: DEFAULT_ADMIN_AUCTION_CODE,
  schoolName: "Demo Auction",
  schoolsCount: 0,
  artworksCount: 0,
  unsoldArtworksCount: 0,
  soldArtworksCount: 0,
  liveRoomsCount: 0,
  totalRaised: 0,
  allTotalRaised: 0,
  winnerEmailsCaptured: 0,
  winnerEmailsMissing: 0,
  liveStatus: "waiting",
  currentBid: 0,
  topSchools: [],
  recentActivity: [],
};

export default function AdminDashboardPage() {
  const [auctionCode] = useAdminAuctionCode(DEFAULT_ADMIN_AUCTION_CODE);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/admin/dashboard-summary?auctionCode=${encodeURIComponent(auctionCode)}`,
          { cache: "no-store" }
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load dashboard summary.");
        }

        if (!cancelled) {
          setSummary(payload?.summary || emptySummary);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load dashboard summary."
          );
          setSummary({ ...emptySummary, auctionCode });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [auctionCode]);

  const setupProgress = useMemo(() => {
    let done = 0;
    if (summary.schoolsCount > 0) done += 1;
    if (summary.artworksCount > 0) done += 1;
    if (summary.unsoldArtworksCount > 0 || summary.soldArtworksCount > 0) done += 1;
    if (summary.soldArtworksCount > 0) done += 1;
    return done;
  }, [summary]);

  const progressPercent = Math.round((setupProgress / 4) * 100);
  const safeProgress = Math.max(6, progressPercent);

  return (
    <AdminShell
      active="dashboard"
      eyebrow="BragWall Dashboard"
      title="Dashboard"
      description={`Welcome back. Here is what is happening with ${summary.schoolName || "your auction"}.`}
      status={<StatusPill status={summary.liveStatus} />}
      selector={<AdminAuctionSelector />}
    >
      {errorMessage && (
        <div className="mb-4 rounded-[18px] border border-[#ffc857]/25 bg-[#ffc857]/10 px-5 py-3 text-sm font-bold leading-relaxed text-[#ffc857]">
          {errorMessage}
        </div>
      )}

      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Schools"
          value={loading ? "..." : String(summary.schoolsCount)}
          subtext="Active schools"
          icon={<SchoolIcon />}
          tone="green"
        />
        <AdminStatCard
          label="Artworks"
          value={loading ? "..." : String(summary.artworksCount)}
          subtext={`${summary.soldArtworksCount} sold - ${summary.unsoldArtworksCount} remaining`}
          icon={<PaletteIcon />}
          tone="yellow"
        />
        <AdminStatCard
          label="Live Rooms"
          value={loading ? "..." : String(summary.liveRoomsCount)}
          subtext={formatStatus(summary.liveStatus)}
          icon={<VideoIcon />}
          tone="purple"
        />
        <AdminStatCard
          label="Total Raised"
          value={loading ? "..." : formatCurrency(summary.totalRaised)}
          subtext="For selected auction"
          icon={<TrendIcon />}
          tone="green"
          highlight
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <AdminPanel title="Getting started" description="Complete these steps to run a smooth BragWall auction.">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.55)] transition-all"
                style={{ width: `${safeProgress}%` }}
              />
            </div>
            <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              {setupProgress} / 4 complete
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <StepCard complete={summary.schoolsCount > 0} title="Add your schools" text="Set up participating schools and parent auction links." action="Manage Schools" href="/admin/setup" />
            <StepCard complete={summary.artworksCount > 0} title="Add artwork" text="Upload and manage the children's auction artworks." action="Manage Artwork" href="/admin/setup" />
            <StepCard complete={summary.unsoldArtworksCount > 0 || summary.soldArtworksCount > 0} title="Prepare live room" text="Test controls before parents start bidding." action="Go To Live Room" href="/admin/live" />
            <StepCard complete={summary.soldArtworksCount > 0} title="View sales" text="Track sold items, winners, invoices, and payments." action="View Sales" href="/admin/sales" />
          </div>
        </AdminPanel>

        <section className="relative overflow-hidden rounded-[26px] border border-[#16d66d]/24 bg-[#07162b]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:p-6">
          <img
            src="/bragwall-admin-paint-texture.png"
            alt=""
            className="pointer-events-none absolute right-[-82px] top-[-98px] h-[360px] w-[290px] object-contain opacity-36"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(22,214,109,0.16),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(255,200,87,0.09),transparent_38%)]" />
          <div className="relative">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-[#16d66d]">Auction total</p>
            <h2 className="text-[56px] font-black leading-none tracking-[-0.08em] text-[#16d66d] md:text-[76px]">
              {formatCurrency(summary.totalRaised)}
            </h2>
            <p className="mt-3 text-sm font-bold leading-relaxed text-white/62">
              Raised by sold artworks in {summary.schoolName || "the selected auction"}.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Sold" value={summary.soldArtworksCount.toString()} />
              <MiniStat label="Emails" value={summary.winnerEmailsCaptured.toString()} />
              <MiniStat label="Missing" value={summary.winnerEmailsMissing.toString()} />
              <MiniStat label="Current Bid" value={formatCurrency(summary.currentBid)} />
            </div>

            <a href="/admin/sales" className="mt-5 block rounded-2xl bg-[#16d66d] px-5 py-3 text-center text-sm font-black text-[#031124] shadow-[0_18px_45px_rgba(22,214,109,0.24)] transition hover:scale-[1.01]">
              Open Sales Records
            </a>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <AdminPanel
          title="Recent activity"
          description="Latest artwork and sale movements."
          action={<span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Live</span>}
        >
          <div className="space-y-3">
            {summary.recentActivity.length === 0 ? (
              <EmptyState text="Activity will appear here after schools and artwork are added." />
            ) : (
              summary.recentActivity.map((item) => <ActivityRow key={item.id} message={item.message} status={item.status} />)
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Top performing schools"
          description="By total sales raised across BragWall."
          action={<span className="rounded-full border border-[#ffc857]/20 bg-[#ffc857]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffc857]">Ranked</span>}
        >
          <div className="space-y-3">
            {summary.topSchools.length === 0 ? (
              <EmptyState text="Schools will rank here once artworks are sold." />
            ) : (
              summary.topSchools.map((school, index) => (
                <TopSchoolRow key={school.code} index={index + 1} name={school.name} total={school.total} sold={school.sold} />
              ))
            )}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#16d66d]/25 bg-[#16d66d]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#16d66d]">
      <span className="h-2 w-2 rounded-full bg-[#16d66d] shadow-[0_0_12px_rgba(22,214,109,0.8)]" />
      {formatStatus(status)}
    </div>
  );
}

function StepCard({ complete, title, text, action, href }: { complete: boolean; title: string; text: string; action: string; href: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#061124]/84 p-4">
      <div className="mb-4 flex justify-center">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${complete ? "border-[#16d66d]/50 bg-[#16d66d]/18 text-[#16d66d]" : "border-white/15 bg-white/[0.04] text-white/45"}`}>
          {complete ? "✓" : "•"}
        </div>
      </div>
      <h3 className="text-center text-sm font-black">{title}</h3>
      <p className="mt-2 min-h-[42px] text-center text-xs font-semibold leading-relaxed text-white/50">{text}</p>
      <a href={href} className="mt-4 block rounded-xl bg-white/[0.08] px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-white hover:text-[#07152b]">
        {action}
      </a>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/38">{label}</p>
      <p className="mt-1 text-xl font-black tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function ActivityRow({ message, status }: { message: string; status: string }) {
  const sold = status === "sold";
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-3.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${sold ? "bg-[#16d66d]/18 text-[#16d66d]" : "bg-white/[0.08] text-white/55"}`}>
        {sold ? "R" : "+"}
      </div>
      <p className="flex-1 text-sm font-semibold text-white/70">{message}</p>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{formatStatus(status)}</span>
    </div>
  );
}

function TopSchoolRow({ index, name, total, sold }: { index: number; name: string; total: number; sold: number }) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-sm font-black text-[#ffc857]">{index}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{name}</p>
        <p className="mt-0.5 text-xs font-semibold text-white/42">{sold} sold artwork{sold === 1 ? "" : "s"}</p>
      </div>
      <p className="text-sm font-black text-white">{formatCurrency(total)}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm font-semibold leading-relaxed text-white/42">{text}</div>;
}

function formatCurrency(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function formatStatus(value: string) {
  return String(value || "waiting").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {children}
    </svg>
  );
}

function SchoolIcon() {
  return <IconSvg><path d="M3 21h18" /><path d="M4 10 12 4l8 6" /><path d="M6 10v10" /><path d="M18 10v10" /><path d="M9 21v-7h6v7" /></IconSvg>;
}

function PaletteIcon() {
  return <IconSvg><path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.4 4-3.2 4H17a2 2 0 0 0-2 2c0 2.2-1.8 4-3 4Z" /><circle cx="7.5" cy="10.5" r=".8" /><circle cx="10.5" cy="7.5" r=".8" /><circle cx="14.5" cy="7.5" r=".8" /><circle cx="16.5" cy="11.5" r=".8" /></IconSvg>;
}

function VideoIcon() {
  return <IconSvg><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></IconSvg>;
}

function TrendIcon() {
  return <IconSvg><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></IconSvg>;
}

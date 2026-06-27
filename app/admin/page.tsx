"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import {
  ADMIN_AUCTION_STORAGE_KEY,
  DEFAULT_ADMIN_AUCTION_CODE,
  sanitizeAuctionCode,
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

type AuctionOption = {
  auction_code: string;
  school_name: string | null;
  source?: "profile" | "artwork" | "live";
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

  const progressPercent = Math.max(8, Math.round((setupProgress / 4) * 100));

  return (
    <main className="min-h-screen overflow-hidden bg-[#020b18] text-white relative overflow-hidden">
      <img
        src="/bragwall-admin-paint-texture.png"
        alt=""
        className="dashboard-visible-admin-paint-texture pointer-events-none fixed right-[40px] top-[230px] z-[1] hidden h-[520px] w-[420px] object-contain opacity-40 lg:block"
        aria-hidden="true"
      />
      <img
        src="/bragwall-admin-paint-texture.png"
        alt=""
        className="dashboard-visible-admin-paint-texture pointer-events-none fixed right-[110px] bottom-[80px] z-[1] hidden h-[420px] w-[340px] rotate-[-10deg] object-contain opacity-30 xl:block"
        aria-hidden="true"
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_10%,rgba(22,214,109,0.18),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(255,200,87,0.11),transparent_30%),linear-gradient(180deg,#061124,#020b18_54%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.055] bg-[linear-gradient(rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.13)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <section className="relative h-screen p-2 md:p-3">
        <div className="grid h-full overflow-hidden rounded-[26px] border border-white/10 bg-[#061124]/76 shadow-[0_30px_140px_rgba(0,0,0,0.74)] lg:grid-cols-[180px_1fr]">
          <AdminSidebar />

          <section className="min-w-0 overflow-y-auto px-4 py-4 md:px-6 md:py-5 xl:px-7">
            <div className="w-full max-w-none">
              <header className="mb-4 grid gap-4 xl:grid-cols-[1fr_410px] xl:items-start">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.34em] text-[#16d66d]">
                    BragWall Dashboard
                  </p>
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h1 className="text-4xl font-black tracking-[-0.06em] md:text-5xl">
                        Dashboard
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/58">
                        Welcome back. Here is what is happening with {summary.schoolName || "your auction"}.
                      </p>
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#16d66d]/25 bg-[#16d66d]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#16d66d]">
                      <span className="h-2 w-2 rounded-full bg-[#16d66d] shadow-[0_0_12px_rgba(22,214,109,0.8)]" />
                      {formatStatus(summary.liveStatus)}
                    </div>
                  </div>
                </div>

                <CompactAuctionSelector summary={summary} />
              </header>

              {errorMessage && (
                <div className="mb-4 rounded-[18px] border border-[#ffc857]/25 bg-[#ffc857]/10 px-5 py-3 text-sm font-bold leading-relaxed text-[#ffc857]">
                  {errorMessage}
                </div>
              )}

              <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Schools" value={loading ? "..." : String(summary.schoolsCount)} subtext="Active schools" icon={<SchoolIcon />} tone="green" />
                <MetricCard label="Artworks" value={loading ? "..." : String(summary.artworksCount)} subtext={`${summary.soldArtworksCount} sold - ${summary.unsoldArtworksCount} remaining`} icon={<PaletteIcon />} tone="yellow" />
                <MetricCard label="Live Rooms" value={loading ? "..." : String(summary.liveRoomsCount)} subtext={formatStatus(summary.liveStatus)} icon={<VideoIcon />} tone="purple" />
                <MetricCard label="Total Raised" value={loading ? "..." : formatCurrency(summary.totalRaised)} subtext="For selected auction" icon={<TrendIcon />} tone="green" highlight />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <section className="rounded-[26px] border border-white/10 bg-[#07162b]/88 p-5 shadow-2xl md:p-6">
                  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.05em] md:text-3xl">Getting started</h2>
                      <p className="mt-1 text-sm font-semibold text-white/52">Complete these steps to run a smooth BragWall auction.</p>
                    </div>

                    <div className="min-w-[210px]">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                        <span>{setupProgress} / 4 complete</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#16d66d] shadow-[0_0_18px_rgba(22,214,109,0.55)] transition-all" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StepCard complete={summary.schoolsCount > 0} title="Add your schools" text="Set up participating schools and parent auction links." action="Manage Schools" href="/admin/setup" />
                    <StepCard complete={summary.artworksCount > 0} title="Add artwork" text="Upload and manage the children's auction artworks." action="Manage Artwork" href="/admin/setup" />
                    <StepCard complete={summary.unsoldArtworksCount > 0 || summary.soldArtworksCount > 0} title="Prepare live room" text="Test controls before parents start bidding." action="Go To Live Room" href="/admin/live" />
                    <StepCard complete={summary.soldArtworksCount > 0} title="View sales" text="Track sold items, winners, invoices, and payments." action="View Sales" href="/admin/sales" />
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-[26px] border border-[#16d66d]/22 bg-[#07162b]/88 p-5 shadow-2xl md:p-6">
                  <div className="absolute right-[-140px] top-[-150px] h-80 w-80 rounded-full bg-[#16d66d]/14 blur-3xl" />
                  <div className="absolute bottom-[-150px] left-[-130px] h-80 w-80 rounded-full bg-[#ffc857]/8 blur-3xl" />
                  <div className="absolute inset-0 bg-[url('/paintbrush.jpg')] bg-cover bg-center opacity-[0.11]" />
                  <div className="absolute inset-0 bg-[#07162b]/82" />
                  <div className="relative">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-[#16d66d]">Auction total</p>
                    <h2 className="text-[54px] font-black leading-none tracking-[-0.08em] text-[#16d66d] md:text-[74px]">{formatCurrency(summary.totalRaised)}</h2>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-white/62">Raised by sold artworks in {summary.schoolName || "the selected auction"}.</p>

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
                <section className="rounded-[26px] border border-white/10 bg-[#07162b]/88 p-5 shadow-2xl md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.05em]">Recent activity</h2>
                      <p className="mt-1 text-xs font-semibold text-white/42">Latest artwork and sale movements.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Live</span>
                  </div>
                  <div className="space-y-3">
                    {summary.recentActivity.length === 0 ? <EmptyState text="Activity will appear here after schools and artwork are added." /> : summary.recentActivity.map((item) => <ActivityRow key={item.id} message={item.message} status={item.status} />)}
                  </div>
                </section>

                <section className="rounded-[26px] border border-white/10 bg-[#07162b]/88 p-5 shadow-2xl md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.05em]">Top performing schools</h2>
                      <p className="mt-1 text-xs font-semibold text-white/42">By total sales raised across BragWall.</p>
                    </div>
                    <span className="rounded-full border border-[#ffc857]/20 bg-[#ffc857]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffc857]">Ranked</span>
                  </div>
                  <div className="space-y-3">
                    {summary.topSchools.length === 0 ? <EmptyState text="Schools will rank here once artworks are sold." /> : summary.topSchools.map((school, index) => <TopSchoolRow key={school.code} index={index + 1} name={school.name} total={school.total} sold={school.sold} />)}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function CompactAuctionSelector({ summary }: { summary: DashboardSummary }) {
  const [auctionCode] = useAdminAuctionCode(DEFAULT_ADMIN_AUCTION_CODE);
  const [draftCode, setDraftCode] = useState(DEFAULT_ADMIN_AUCTION_CODE);
  const [auctions, setAuctions] = useState<AuctionOption[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [auctionListError, setAuctionListError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setDraftCode(auctionCode);
  }, [auctionCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuctions() {
      try {
        setLoadingAuctions(true);
        setAuctionListError("");

        const response = await fetch("/api/admin/auction-list", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Could not load school list.");
        }

        if (!cancelled) {
          setAuctions(Array.isArray(payload.auctions) ? payload.auctions : []);
        }
      } catch (error) {
        if (!cancelled) {
          setAuctionListError(error instanceof Error ? error.message : "Could not load school list.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAuctions(false);
        }
      }
    }

    loadAuctions();

    return () => {
      cancelled = true;
    };
  }, []);

  const safeDraftCode = sanitizeAuctionCode(draftCode);
  const selectedAuction = auctions.find((option) => option.auction_code === auctionCode);
  const parentPath = `/auction/${safeDraftCode}`;
  const parentUrl = origin ? `${origin}${parentPath}` : parentPath;

  function applyAuctionCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = sanitizeAuctionCode(draftCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);

    const url = new URL(window.location.href);
    url.searchParams.set("auctionCode", nextCode);
    window.location.href = url.toString();
  }

  async function copyParentLink() {
    try {
      await navigator.clipboard.writeText(parentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form onSubmit={applyAuctionCode} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/42">Active school</p>
          <p className="mt-1 truncate text-lg font-black text-white">{selectedAuction?.school_name || summary.schoolName || auctionCode}</p>
        </div>
        <span className="rounded-full border border-[#16d66d]/30 bg-[#16d66d]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#16d66d]">
          {auctionCode}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto] xl:grid-cols-1">
        <select
          value={safeDraftCode}
          onChange={(event) => setDraftCode(sanitizeAuctionCode(event.target.value))}
          disabled={loadingAuctions || auctions.length === 0}
          className="h-11 w-full rounded-2xl border border-white/12 bg-[#020b18]/78 px-3.5 text-sm font-black text-white outline-none focus:border-[#16d66d]/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAuctions && <option value={safeDraftCode}>Loading schools...</option>}
          {!loadingAuctions && auctions.length === 0 && <option value={safeDraftCode}>No schools found yet</option>}
          {!loadingAuctions && auctions.map((option) => (
            <option key={option.auction_code} value={option.auction_code}>
              {option.school_name ? `${option.school_name} (${option.auction_code})` : option.auction_code}
            </option>
          ))}
        </select>

        <button type="submit" className="h-11 rounded-2xl bg-[#16d66d] px-5 text-xs font-black text-[#031124] shadow-lg">
          Use School
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] xl:grid-cols-[1fr_auto_auto]">
        <div className="min-w-0 rounded-2xl border border-[#16d66d]/20 bg-[#16d66d]/10 px-3 py-2">
          <p className="mb-0.5 text-[8px] font-black uppercase tracking-[0.22em] text-[#16d66d]">Parent link</p>
          <p className="truncate text-[11px] font-black text-white">{parentUrl}</p>
        </div>
        <button type="button" onClick={copyParentLink} className="rounded-2xl border border-white/12 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15">
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={`/auction/${auctionCode}`} className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 text-center text-xs font-black text-white hover:bg-white/15">
          Parent View
        </a>
      </div>

      {auctionListError && (
        <p className="mt-2 rounded-2xl border border-[#ffc857]/25 bg-[#ffc857]/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-[#ffc857]">
          {auctionListError}
        </p>
      )}
    </form>
  );
}

function AdminSidebar() {
  return (
    <aside className="hidden min-h-0 border-r border-white/10 bg-[#061124]/95 lg:flex lg:h-screen lg:flex-col">
      <div className="shrink-0 px-4 pb-4 pt-5">
        <img src="/bragwall-logo.png" alt="BragWall" className="h-13 w-auto max-w-[118px] rounded-md bg-white p-1.5" />
        <p className="mt-2 text-[7px] font-black uppercase tracking-[0.32em] text-white/42">Young Art - Big Pride</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        <SidebarLink href="/admin" label="Dashboard" icon={<HomeIcon />} active />
        <SidebarLink href="/admin/setup" label="Schools" icon={<SchoolIcon />} />
        <SidebarLink href="/admin/setup" label="Artwork" icon={<PaletteIcon />} />
        <SidebarLink href="/admin/live" label="Live Room" icon={<VideoIcon />} />
        <SidebarLink href="/admin/sales" label="Sales Records" icon={<CardIcon />} />
        <SidebarLink href="/auction/demo" label="Parent View" icon={<PhoneIcon />} />
      </nav>

      <div className="shrink-0 space-y-3 px-3 pb-4">
        <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.045] p-3">
          <div className="absolute inset-0 bg-[url('/paintbrush.jpg')] bg-cover bg-center opacity-25" />
          <div className="absolute inset-0 bg-[#061124]/76" />
          <div className="relative">
            <p className="text-[10px] font-black text-white/78">Need help?</p>
            <p className="mt-1 text-[11px] font-semibold text-white/45">View guides & tips</p>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.045] p-2.5">
          <AdminLogoutButton />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, icon, active = false }: { href: string; label: string; icon: ReactNode; active?: boolean }) {
  return (
    <a href={href} className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-xs font-black transition ${active ? "border-[#16d66d]/50 bg-[#16d66d]/22 text-white shadow-[0_0_26px_rgba(22,214,109,0.18)]" : "border-transparent text-white/68 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"}`}>
      <span className={active ? "text-[#16d66d]" : "text-white/58"}>{icon}</span>
      {label}
    </a>
  );
}

function MetricCard({ label, value, subtext, icon, tone, highlight = false }: { label: string; value: string; subtext: string; icon: ReactNode; tone: "green" | "yellow" | "purple"; highlight?: boolean }) {
  return (
    <div className={`rounded-[20px] border p-4 shadow-2xl ${highlight ? "border-[#16d66d]/28 bg-[#16d66d]/10" : "border-white/10 bg-white/[0.055]"}`}>
      <div className="flex items-center gap-3.5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border ${toneClasses(tone).box}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/42">{label}</p>
          <p className="mt-1 truncate text-2xl font-black tracking-[-0.05em] md:text-3xl">{value}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/45">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ complete, title, text, action, href }: { complete: boolean; title: string; text: string; action: string; href: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#061124]/84 p-4">
      <div className="mb-4 flex justify-center">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${complete ? "border-[#16d66d]/50 bg-[#16d66d]/18 text-[#16d66d]" : "border-white/15 bg-white/[0.04] text-white/45"}`}>{complete ? "✓" : "•"}</div>
      </div>
      <h3 className="text-center text-sm font-black">{title}</h3>
      <p className="mt-2 min-h-[42px] text-center text-xs font-semibold leading-relaxed text-white/50">{text}</p>
      <a href={href} className="mt-4 block rounded-xl bg-white/[0.08] px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-white hover:text-[#07152b]">{action}</a>
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
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${sold ? "bg-[#16d66d]/18 text-[#16d66d]" : "bg-white/[0.08] text-white/55"}`}>{sold ? "R" : "+"}</div>
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

function toneClasses(tone: "green" | "yellow" | "purple") {
  if (tone === "yellow") return { box: "border-[#ffc857]/45 bg-[#ffc857]/12 text-[#ffc857]" };
  if (tone === "purple") return { box: "border-[#d36cff]/45 bg-[#d36cff]/12 text-[#d36cff]" };
  return { box: "border-[#16d66d]/45 bg-[#16d66d]/12 text-[#16d66d]" };
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {children}
    </svg>
  );
}

function HomeIcon() {
  return <IconSvg><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></IconSvg>;
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

function CardIcon() {
  return <IconSvg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /><path d="M15 15h2" /></IconSvg>;
}

function PhoneIcon() {
  return <IconSvg><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></IconSvg>;
}





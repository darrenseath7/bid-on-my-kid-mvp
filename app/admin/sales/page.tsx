"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import AdminAuctionSelector from "@/components/AdminAuctionSelector";
import { supabase } from "@/lib/supabase";
import { useAdminAuctionCode } from "@/lib/useAdminAuctionCode";

type SoldArtwork = {
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

const DEFAULT_AUCTION_CODE = "demo";

export default function AdminSalesPage() {
  const [auctionCode] = useAdminAuctionCode(DEFAULT_AUCTION_CODE);
  const [sales, setSales] = useState<SoldArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();

    const salesChannel = supabase
      .channel("admin-sales-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${auctionCode}`,
        },
        () => fetchSales()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [auctionCode]);

  async function fetchSales() {
    setLoading(true);
    setSales([]);

    try {
      const response = await fetch(`/api/admin/sales-action?auctionCode=${encodeURIComponent(auctionCode)}`, {
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not load sales records.");
      }

      setSales(result?.sales || []);
    } catch (error) {
      console.error("Could not load secure sales records:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  const totalRaised = useMemo(() => {
    return sales.reduce((total, item) => total + (item.sold_amount || 0), 0);
  }, [sales]);

  const emailsCaptured = sales.filter((item) => item.winner_email).length;
  const emailsMissing = sales.filter((item) => !item.winner_email).length;

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
        <AdminSidebar auctionCode={auctionCode} />


        <div className="lg:hidden bg-[#061124] border-b border-white/10 px-4 py-4 sticky top-0 z-40">
          <div className="bg-white rounded-2xl p-3 mb-4 w-fit">
            <BrandHeader />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <MobileNavItem href="/admin" label="Dashboard" />
            <MobileNavItem href="/admin/live" label="Live" />
            <MobileNavItem href="/admin/setup" label="Artworks / Setup" />
            <MobileNavItem href="/admin/sales" label="Sales" active />
          </div>
        </div>

        <section className="px-5 py-7 lg:px-8 lg:py-10">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
                Sales / Invoices
              </p>

              <h1 className="text-5xl lg:text-7xl font-black leading-none mb-4">
                Winner records.
              </h1>

              <p className="text-white/55 text-xl max-w-3xl leading-relaxed">
                Revisit sold artworks, winner emails, invoice requests,
                payment follow-ups, and certificate release status.
              </p>
            </div>

            <div className="w-full xl:w-[320px] space-y-3">
              <AdminAuctionSelector />

              <button
                onClick={fetchSales}
                className="rounded-2xl bg-white text-[#07152b] px-6 py-4 font-black shadow-xl w-full"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Sales"
              value={`R${totalRaised.toLocaleString()}`}
              subtext="From sold artworks"
              color="#16d66d"
            />

            <StatCard
              label="Winner Emails"
              value={`${emailsCaptured}`}
              subtext="Captured successfully"
              color="#2878cf"
            />

            <StatCard
              label="Missing Emails"
              value={`${emailsMissing}`}
              subtext="Need follow-up"
              color="#ffc107"
            />
          </div>

          <section className="bg-white/5 border border-white/10 rounded-[36px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">Sold Artworks</h2>
                <p className="text-white/40 mt-1">
                  {sales.length} sold artwork records
                </p>
              </div>

              <a
                href="/admin/live"
                className="rounded-2xl bg-[#16d66d] text-[#07152b] px-5 py-3 font-black w-fit"
              >
                Back to Live Room
              </a>
            </div>

            {loading ? (
              <div className="p-8 text-white/40">Loading sales...</div>
            ) : sales.length === 0 ? (
              <div className="p-8">
                <div className="bg-white/5 border border-white/10 rounded-[28px] p-8">
                  <h3 className="text-3xl font-black mb-3">
                    No sales recorded yet.
                  </h3>

                  <p className="text-white/55 text-lg leading-relaxed">
                    Sold artworks will appear here after the first auction item
                    is sold and the winning parent submits their email.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {sales.map((item) => (
                  <SaleCard
                    key={item.id}
                    item={item}
                    auctionCode={auctionCode}
                    onRefresh={fetchSales}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function SaleCard({
  item,
  auctionCode,
  onRefresh,
}: {
  item: SoldArtwork;
  auctionCode: string;
  onRefresh: () => Promise<void>;
}) {
  const invoiceRequested = Boolean(item.invoice_email_requested_at);
  const certificateReleased = Boolean(item.certificate_email_requested_at);
  const emailCaptured = Boolean(item.winner_email);
  const [releasingCertificate, setReleasingCertificate] = useState(false);
  const [preview, setPreview] = useState<"invoice" | "certificate" | null>(null);

  async function releaseCertificate() {
    if (!emailCaptured || certificateReleased || releasingCertificate) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm payment received and release this winner certificate?"
    );

    if (!confirmed) {
      return;
    }

    setReleasingCertificate(true);

    try {
      const response = await fetch("/api/admin/sales-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release-certificate",
          auctionCode,
          artworkId: item.id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not release certificate.");
      }

      await onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not release certificate.");
    } finally {
      setReleasingCertificate(false);
    }
  }

  return (
    <div className="p-5 lg:p-6">
      <div className="grid lg:grid-cols-[140px_1fr] gap-5">
        <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-3 rounded-[26px]">
          <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-2 rounded-[20px]">
            <div className="bg-[#f8f5ef] rounded-[14px] p-2">
              <img
                src={item.artwork_url}
                alt=""
                className="w-full h-32 object-contain rounded-xl bg-white"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
            <div>
              <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
                Artwork #{item.sort_order}
              </p>

              <h3 className="text-3xl font-black leading-tight">
                {item.child_name} {item.child_surname}
              </h3>

              <p className="text-white/45 font-bold mt-1">{item.grade}</p>
            </div>

            <div className="xl:text-right">
              <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
                Sold Amount
              </p>

              <p className="text-4xl font-black text-[#16d66d]">
                R{(item.sold_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            <InfoBox
              label="Winning Bidder"
              value={item.winning_bidder || "Not captured"}
            />

            <InfoBox
              label="Winner Email"
              value={item.winner_email || "Waiting for email"}
              highlight={emailCaptured ? "green" : "yellow"}
            />

            <InfoBox
              label="Invoice"
              value={invoiceRequested ? "Requested" : "Not requested"}
              highlight={invoiceRequested ? "green" : "yellow"}
            />

            <InfoBox
              label="Certificate"
              value={certificateReleased ? "Released" : "Locked until paid"}
              highlight={certificateReleased ? "green" : "yellow"}
            />
          </div>

          <div className="mt-5 bg-white/5 border border-white/10 rounded-[22px] p-4">
            <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
              Next Actions
            </p>

            <div className="flex flex-wrap gap-3">
              <ActionBadge
                label={
                  emailCaptured
                    ? "Ready to email invoice"
                    : "Waiting for winner email"
                }
                good={emailCaptured}
              />

              <ActionBadge
                label={
                  invoiceRequested
                    ? "Invoice email requested"
                    : "Invoice not requested"
                }
                good={invoiceRequested}
              />

              <ActionBadge
                label={
                  certificateReleased
                    ? "Certificate released after payment"
                    : "Certificate preview visible to admin"
                }
                good={certificateReleased}
              />

              <button
                type="button"
                onClick={() => setPreview("invoice")}
                className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#07152b] transition hover:scale-[1.02]"
              >
                View Invoice
              </button>

              <button
                type="button"
                onClick={() => setPreview("certificate")}
                className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#07152b] transition hover:scale-[1.02]"
              >
                View Certificate
              </button>

              <button
                type="button"
                onClick={releaseCertificate}
                disabled={!emailCaptured || certificateReleased || releasingCertificate}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  certificateReleased
                    ? "bg-[#16d66d]/20 text-[#16d66d] border border-[#16d66d]/30"
                    : emailCaptured
                    ? "bg-[#ffc857] text-[#07152b] hover:scale-[1.02]"
                    : "bg-white/10 text-white/35 cursor-not-allowed"
                }`}
              >
                {certificateReleased
                  ? "Certificate Released"
                  : releasingCertificate
                  ? "Releasing..."
                  : "Confirm Payment & Release Certificate"}
              </button>
            </div>
          </div>

          {preview && (
            <DocumentPreviewModal
              type={preview}
              item={item}
              certificateReleased={certificateReleased}
              onClose={() => setPreview(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}


function DocumentPreviewModal({
  type,
  item,
  certificateReleased,
  onClose,
}: {
  type: "invoice" | "certificate";
  item: SoldArtwork;
  certificateReleased: boolean;
  onClose: () => void;
}) {
  const isInvoice = type === "invoice";
  const amount = item.sold_amount || 0;
  const winnerName = item.winning_bidder || "Winning bidder";
  const winnerEmail = item.winner_email || "Winner email not captured";
  const artworkName = `${item.child_name} ${item.child_surname}`.trim() || `Artwork #${item.sort_order}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b18]/82 px-4 py-6 backdrop-blur-xl">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/15 bg-white p-5 text-[#07152b] shadow-2xl lg:p-8">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Admin Preview
            </p>
            <h3 className="mt-1 text-3xl font-black">
              {isInvoice ? "Invoice" : "Artwork Certificate"}
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl bg-[#07152b] px-4 py-3 text-sm font-black text-white"
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#07152b]"
            >
              Close
            </button>
          </div>
        </div>

        {isInvoice ? (
          <InvoicePreview
            item={item}
            amount={amount}
            winnerName={winnerName}
            winnerEmail={winnerEmail}
            artworkName={artworkName}
          />
        ) : (
          <CertificatePreview
            item={item}
            amount={amount}
            winnerName={winnerName}
            artworkName={artworkName}
            certificateReleased={certificateReleased}
          />
        )}
      </div>
    </div>
  );
}

function InvoicePreview({
  item,
  amount,
  winnerName,
  winnerEmail,
  artworkName,
}: {
  item: SoldArtwork;
  amount: number;
  winnerName: string;
  winnerEmail: string;
  artworkName: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#16d66d]">
            BragWall Fundraiser
          </p>
          <h4 className="mt-2 text-4xl font-black">Invoice Request</h4>
          <p className="mt-2 max-w-xl text-base font-bold text-slate-500">
            Admin follow-up document for the winning parent. No email is sent automatically yet.
          </p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <img src="/bragwall-logo.png" alt="BragWall" className="h-16 w-auto object-contain" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="rounded-[24px] border border-[#d6a94a] bg-[#fff8e2] p-4">
          <img src={item.artwork_url} alt="" className="h-52 w-full rounded-2xl bg-white object-contain" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DocumentInfo label="Winner" value={winnerName} />
          <DocumentInfo label="Winner Email" value={winnerEmail} />
          <DocumentInfo label="Artwork" value={artworkName} />
          <DocumentInfo label="Grade" value={item.grade || "Not captured"} />
          <DocumentInfo label="Amount Due" value={`R${amount.toLocaleString()}`} strong />
          <DocumentInfo label="Status" value="Invoice requested for admin follow-up" />
        </div>
      </div>

      <div className="mt-6 rounded-[24px] bg-[#07152b] p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">Payment Reference</p>
        <p className="mt-2 text-2xl font-black">BRAG-{winnerName.replace(/\s+/g, "")}</p>
      </div>
    </div>
  );
}

function CertificatePreview({
  item,
  amount,
  winnerName,
  artworkName,
  certificateReleased,
}: {
  item: SoldArtwork;
  amount: number;
  winnerName: string;
  artworkName: string;
  certificateReleased: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#d6a94a] bg-[#fff8e2] p-5 lg:p-8">
      {!certificateReleased && (
        <div className="absolute right-5 top-5 rounded-full bg-[#ffc857] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#07152b]">
          Admin preview - locked
        </div>
      )}

      <div className="mx-auto max-w-3xl text-center">
        <img src="/bragwall-logo.png" alt="BragWall" className="mx-auto mb-5 h-20 w-auto object-contain" />
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#16a064]">Certificate of Bragging Rights</p>
        <h4 className="mt-4 text-4xl font-black lg:text-6xl">{artworkName}</h4>
        <p className="mt-3 text-xl font-black text-slate-600">{item.grade || "Young Artist"}</p>

        <div className="mx-auto my-8 max-w-sm rounded-[28px] border-[10px] border-[#d6a94a] bg-white p-4 shadow-xl">
          <img src={item.artwork_url} alt="" className="h-64 w-full rounded-2xl object-contain" />
        </div>

        <p className="text-lg font-bold leading-relaxed text-slate-600">
          This certifies that <span className="font-black text-[#07152b]">{winnerName}</span> proudly won this original young artist masterpiece for <span className="font-black text-[#07152b]">R{amount.toLocaleString()}</span> in support of the school fundraiser.
        </p>

        <div className="mt-8 rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Certificate Status</p>
          <p className={`mt-2 text-2xl font-black ${certificateReleased ? "text-[#16d66d]" : "text-[#b38300]"}`}>
            {certificateReleased ? "Released after payment" : "Locked until payment is confirmed"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentInfo({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className={`mt-2 break-words ${strong ? "text-3xl" : "text-lg"} font-black text-[#07152b]`}>{value}</p>
    </div>
  );
}

function AdminSidebar({ auctionCode }: { auctionCode: string }) {
  return (
    <aside className="hidden lg:flex bg-[#061124] border-r border-white/10 p-6 flex-col h-screen overflow-y-auto">
      <div className="bg-white rounded-2xl p-4 mb-8">
        <BrandHeader center />
      </div>

      <nav className="space-y-2 text-sm font-bold">
        <SidebarItem href="/admin" label="Dashboard" />
        <SidebarItem href="/admin/live" label="Live Auction" />
        <SidebarItem href="/admin/setup" label="Artworks / Setup" />
        <SidebarItem href="/admin/sales" label="Sales / Invoices" active />
        <SidebarItem href={`/auction/${auctionCode}`} label="Parent View" />
      </nav>

      <div className="mt-auto bg-white/5 border border-white/10 rounded-3xl p-5">
        <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-3">
          Records
        </p>

        <p className="text-white/70 font-bold leading-relaxed">
          Track winner details, invoice requests, and certificates.
        </p>
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

function InfoBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "yellow";
}) {
  const colorClass =
    highlight === "green"
      ? "text-[#16d66d]"
      : highlight === "yellow"
      ? "text-[#ffc107]"
      : "text-white";

  return (
    <div className="bg-white/5 border border-white/10 rounded-[20px] p-4">
      <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className={`font-black break-words ${colorClass}`}>{value}</p>
    </div>
  );
}

function ActionBadge({ label, good }: { label: string; good: boolean }) {
  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-black ${
        good
          ? "bg-[#16d66d]/15 text-[#16d66d]"
          : "bg-[#ffc107]/15 text-[#ffc107]"
      }`}
    >
      {label}
    </span>
  );
}





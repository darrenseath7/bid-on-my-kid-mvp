"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import AdminAuctionSelector from "@/components/AdminAuctionSelector";
import AdminShell from "@/components/admin/AdminShell";
import AdminPanel from "@/components/admin/AdminPanel";
import AdminStatCard from "@/components/admin/AdminStatCard";
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
  auction_code?: string | null;
  winner_email?: string | null;
  invoice_email_requested_at?: string | null;
  certificate_email_requested_at?: string | null;
};

const DEFAULT_AUCTION_CODE = "demo";

export default function AdminSalesPage() {
  const [auctionCode] = useAdminAuctionCode(DEFAULT_AUCTION_CODE);
  const [sales, setSales] = useState<SoldArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const activeAuctionCodeRef = useRef(DEFAULT_AUCTION_CODE);

  useEffect(() => {
    let cancelled = false;

    activeAuctionCodeRef.current = auctionCode;
    setSales([]);
    setLoading(true);
    fetchSales(auctionCode, () => cancelled);

    const salesChannel = supabase
      .channel(`admin-sales-page-${auctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${auctionCode}`,
        },
        () => fetchSales(auctionCode, () => cancelled)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(salesChannel);
    };
  }, [auctionCode]);

  async function fetchSales(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    setLoading(true);
    setSales([]);

    try {
      const response = await fetch(`/api/admin/sales-action?auctionCode=${encodeURIComponent(targetAuctionCode)}`, {
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not load sales records.");
      }

      if (isCancelled() || activeAuctionCodeRef.current !== targetAuctionCode) return;

      const isolatedSales = Array.isArray(result?.sales)
        ? result.sales.filter((item: SoldArtwork) => item.auction_code === targetAuctionCode)
        : [];

      setSales(isolatedSales);
    } catch (error) {
      if (!isCancelled() && activeAuctionCodeRef.current === targetAuctionCode) {
        console.error("Could not load secure sales records:", error);
        setSales([]);
      }
    } finally {
      if (!isCancelled() && activeAuctionCodeRef.current === targetAuctionCode) {
        setLoading(false);
      }
    }
  }

  const totalRaised = useMemo(() => {
    return sales.reduce((total, item) => total + (item.sold_amount || 0), 0);
  }, [sales]);

  const emailsCaptured = sales.filter((item) => item.winner_email).length;
  const emailsMissing = sales.filter((item) => !item.winner_email).length;

  return (
    <AdminShell
      active="sales"
      eyebrow="Sales / Invoices"
      title="Winner records."
      description="Track every sold artwork, winner email, invoice preview, certificate release, and payment follow-up from one clean control screen."
      selector={
        <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/42">
            Active auction
          </p>
          <div className="space-y-3">
            <AdminAuctionSelector />
            <button
              type="button"
              onClick={() => fetchSales()}
              className="w-full rounded-[18px] bg-[#16d66d] px-5 py-3 text-sm font-black text-[#07152b] shadow-[0_18px_44px_rgba(22,214,109,0.18)] transition hover:scale-[1.01]"
            >
              Refresh records
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            label="Total raised"
            value={`R${totalRaised.toLocaleString()}`}
            subtext="Sold plus invoice requests"
            tone="green"
            highlight
          />
          <AdminStatCard
            label="Winner emails"
            value={`${emailsCaptured}`}
            subtext="Captured successfully"
            tone="blue"
          />
          <AdminStatCard
            label="Missing emails"
            value={`${emailsMissing}`}
            subtext="Need follow-up"
            tone="yellow"
          />
        </div>

        <AdminPanel
          eyebrow="Follow-up workflow"
          title="Sales and invoice requests"
          description={`${sales.length} sale or invoice request record${sales.length === 1 ? "" : "s"} for this auction.`}
          action={
            <a
              href="/admin/live"
              className="inline-flex rounded-[18px] bg-[#16d66d] px-5 py-3 text-sm font-black text-[#07152b] shadow-[0_18px_44px_rgba(22,214,109,0.16)] transition hover:scale-[1.01]"
            >
              Back to Live Room
            </a>
          }
          className="relative overflow-hidden"
        >
          <img
            src="/bragwall-admin-paint-texture.png"
            alt=""
            className="pointer-events-none absolute right-[-110px] top-[-120px] z-0 h-[390px] w-[320px] object-contain opacity-24"
            aria-hidden="true"
          />

          <div className="relative z-10">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-8 text-sm font-black text-white/48">
                Loading sales records...
              </div>
            ) : sales.length === 0 ? (
              <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-8">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#ffc857]">
                  Waiting for first sale
                </p>
                <h3 className="text-3xl font-black tracking-[-0.05em]">
                  No sales recorded yet.
                </h3>
                <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-white/55">
                  Sold artworks and after-auction invoice requests will appear here after a parent submits their email.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
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
  const isAfterAuctionRequest = item.status === "after_auction_request";
  const [releasingCertificate, setReleasingCertificate] = useState(false);
  const [preview, setPreview] = useState<"invoice" | "certificate" | null>(null);

  async function releaseCertificate() {
    if (!emailCaptured || certificateReleased || releasingCertificate) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm payment received and release this certificate?"
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
    <div className="rounded-[26px] border border-white/10 bg-white/[0.052] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] lg:p-5">
      <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)]">
        <div className="rounded-[26px] bg-gradient-to-br from-[#70420f] to-[#2a1707] p-3 shadow-[0_20px_55px_rgba(0,0,0,0.28)]">
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
                {isAfterAuctionRequest ? "After-auction request" : `Artwork #${item.sort_order}`}
              </p>

              <h3 className="text-2xl font-black leading-tight md:text-3xl">
                {item.child_name} {item.child_surname}
              </h3>

              <p className="text-white/45 font-bold mt-1">{item.grade}</p>
            </div>

            <div className="xl:text-right">
              <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
                {isAfterAuctionRequest ? "Invoice Amount" : "Sold Amount"}
              </p>

              <p className="text-3xl font-black text-[#16d66d] md:text-4xl">
                R{(item.sold_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoBox
              label={isAfterAuctionRequest ? "Requested By" : "Winning Bidder"}
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

          <div className="mt-5 rounded-[22px] border border-white/10 bg-[#061124]/72 p-4">
            <p className="uppercase tracking-[0.25em] text-[10px] text-white/40 font-black mb-2">
              Next Actions
            </p>

            <div className="flex flex-wrap gap-3">
              {isAfterAuctionRequest && (
                <ActionBadge
                  label="After-auction invoice request"
                  good
                />
              )}

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
  const paymentReference = artworkName || `${item.child_name} ${item.child_surname}`.trim() || winnerName;
  const isAfterAuctionRequest = item.status === "after_auction_request";

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#d6a94a]/55 bg-[#fffaf0] p-5 shadow-[0_28px_80px_rgba(7,21,43,0.16)] lg:p-8">
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="pointer-events-none absolute right-[-130px] top-[-130px] h-[380px] w-[380px] rounded-full object-cover opacity-28 saturate-150 contrast-125"
        aria-hidden="true"
      />
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="pointer-events-none absolute bottom-[-170px] left-[-150px] h-[360px] w-[360px] rounded-full object-cover opacity-18 saturate-150 contrast-125"
        aria-hidden="true"
      />

      <div className="relative z-[2]">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#16a064]">
              BragWall Invoice
            </p>
            <h4 className="mt-2 text-4xl font-black text-[#07152b] lg:text-5xl">
              {isAfterAuctionRequest ? "Congratulations on your artwork request" : "Congratulations on your winning bid"}
            </h4>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-relaxed text-slate-600">
              {isAfterAuctionRequest
                ? "What a proud moment — you are helping celebrate a young artist while supporting their school."
                : "What a proud moment — you have just helped celebrate a young artist while supporting their school."}
            </p>
          </div>
          <div className="rounded-3xl bg-white/92 p-4 shadow-sm ring-1 ring-slate-200">
            <img src="/bragwall-logo.png" alt="BragWall" className="h-16 w-auto object-contain" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="rounded-[28px] border border-[#d6a94a] bg-white/80 p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{isAfterAuctionRequest ? "Requested Artwork" : "Winning Artwork"}</p>
            <img src={item.artwork_url} alt="" className="h-56 w-full rounded-2xl bg-white object-contain" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DocumentInfo label={isAfterAuctionRequest ? "Requested By" : "Winner"} value={winnerName} />
            <DocumentInfo label="Winner Email" value={winnerEmail} />
            <DocumentInfo label="Child / Artwork Reference" value={artworkName} />
            <DocumentInfo label="Grade" value={item.grade || "Not captured"} />
            <DocumentInfo label="Amount Due" value={`R${amount.toLocaleString()}`} strong />
            <DocumentInfo label="Status" value="Invoice requested for admin follow-up" />
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[28px] bg-[#07152b] p-6 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">Payment Details</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <PaymentLine label="Bank" value="Discovery Bank" />
              <PaymentLine label="Branch Code" value="697000" />
              <PaymentLine label="Account Type" value="Cheque account" />
              <PaymentLine label="Account Number" value="1234567890" />
              <PaymentLine label="Reference" value={paymentReference} highlight />
              <PaymentLine label="Amount" value={`R${amount.toLocaleString()}`} highlight />
            </div>
          </div>

          <div className="rounded-[28px] border border-[#16d66d]/30 bg-white/88 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#16a064]">Important</p>
            <p className="mt-3 text-lg font-black leading-relaxed text-[#07152b]">
              Please use the child’s name and surname as your payment reference so we can match your payment quickly.
            </p>
            <p className="mt-4 text-sm font-bold leading-relaxed text-slate-500">
              {isAfterAuctionRequest
                ? "The amount uses the opening bid for this after-auction request. The school can confirm collection once payment is received."
                : "Your winning bid amount has pulled through from the sold auction record. The school can confirm collection once payment is received."}
            </p>
          </div>
        </div>
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
    <div className="relative overflow-hidden rounded-[34px] border border-[#d6a94a] bg-[#fff8e2] p-5 shadow-[0_30px_90px_rgba(112,66,15,0.18)] lg:p-8">
      <img
        src="/bragwall-paint-splatter.jpg"
        alt=""
        className="pointer-events-none absolute left-1/2 top-[-190px] h-[520px] w-[520px] -translate-x-1/2 rounded-full object-cover opacity-24 saturate-150 contrast-125"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-4 rounded-[28px] border-4 border-[#d6a94a]/45" aria-hidden="true" />

      {!certificateReleased && (
        <div className="absolute right-5 top-5 z-[3] rounded-full bg-[#ffc857] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#07152b]">
          Admin preview - locked
        </div>
      )}

      <div className="relative z-[2] mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-6 inline-flex rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-[#d6a94a]/35">
          <img src="/bragwall-logo.png" alt="BragWall" className="h-20 w-auto object-contain" />
        </div>

        <p className="text-sm font-black uppercase tracking-[0.32em] text-[#16a064]">Certificate of BragWall Pride</p>
        <h4 className="mt-4 text-4xl font-black leading-tight text-[#07152b] lg:text-6xl">{artworkName}</h4>
        <p className="mt-3 text-xl font-black text-slate-600">{item.grade || "Young Artist"}</p>

        <div className="mx-auto my-8 max-w-sm rounded-[30px] border-[10px] border-[#d6a94a] bg-white p-4 shadow-2xl">
          <img src={item.artwork_url} alt="" className="h-64 w-full rounded-2xl object-contain" />
        </div>

        <div className="rounded-[28px] bg-white/88 p-6 shadow-sm ring-1 ring-[#d6a94a]/25">
          <p className="text-xl font-black leading-relaxed text-[#07152b]">
            Awarded to {artworkName}
          </p>
          <p className="mt-4 text-lg font-bold leading-relaxed text-slate-600">
            For creating an artwork that inspired excitement, pride, and generous support during the BragWall auction.
          </p>
          <p className="mt-4 text-lg font-bold leading-relaxed text-slate-600">
            Your creativity helped make this school fundraising night truly special.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] bg-[#07152b] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">Winning Parent</p>
            <p className="mt-2 text-2xl font-black">{winnerName}</p>
          </div>
          <div className="rounded-[24px] bg-[#16d66d] p-5 text-[#07152b]">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#07152b]/55">Winning Bid</p>
            <p className="mt-2 text-3xl font-black">R{amount.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-white/88 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Certificate Status</p>
          <p className={`mt-2 text-2xl font-black ${certificateReleased ? "text-[#16d66d]" : "text-[#b38300]"}`}>
            {certificateReleased ? "Released after payment" : "Locked until payment is confirmed"}
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-2xl bg-[#16d66d] p-4 text-[#07152b]" : "rounded-2xl bg-white/8 p-4"}>
      <p className={highlight ? "text-[10px] font-black uppercase tracking-[0.22em] text-[#07152b]/55" : "text-[10px] font-black uppercase tracking-[0.22em] text-white/40"}>{label}</p>
      <p className="mt-2 break-words text-xl font-black">{value || "-"}</p>
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
    <aside className="hidden h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden border-r border-white/10 bg-[#061124]/95 p-5 lg:flex">
      <div className="mb-6 rounded-2xl bg-white p-4">
        <BrandHeader center />
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm font-bold">
        <SidebarItem href="/admin" label="Dashboard" />
        <SidebarItem href="/admin/live" label="Live Auction" />
        <SidebarItem href="/admin/setup" label="Artworks / Setup" />
        <SidebarItem href="/admin/sales" label="Sales / Invoices" active />
        <SidebarItem href={`/auction/${auctionCode}`} label="Parent View" />
      </nav>

      <div className="mt-5 shrink-0 rounded-3xl border border-white/10 bg-white/[0.055] p-5">
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
    <div className="rounded-[28px] border border-white/10 bg-white p-5 text-[#07152b] shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-3">
        {label}
      </p>

      <h2
        className="mb-2 text-4xl font-black leading-tight"
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





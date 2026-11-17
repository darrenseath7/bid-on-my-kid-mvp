"use client";

import { useState } from "react";

type Invoice = {
  amount: number;
  payment: {
    payment_reference: string;
    account_holder: string;
    bank_name: string;
    account_number: string;
    branch_code: string;
    account_type: string;
  };
};

export default function WinnerInvoiceTab({ artworkId, token }: { artworkId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "waiting" | "verify" | "ready">("loading");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const api = `/api/winner-invoice/${artworkId}`;

  async function load() {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(`${api}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load invoice.");
      setStatus(result.status);
      setInvoice(result.status === "ready" ? result as Invoice : null);
    } catch (error) {
      setStatus("waiting");
      setMessage(error instanceof Error ? error.message : "Could not load invoice.");
    }
  }

  async function submit(action: "send" | "verify") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(api, { method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token, ...(action === "verify" ? { code } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify invoice.");
      if (action === "send") { setSent(true); setMessage(result.message); }
      else await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify invoice.");
    } finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-2xl border border-[#ffc857]/40 bg-[#ffc857]/[.07] p-4 sm:p-5">
    <button type="button" aria-expanded={open} aria-controls="winner-invoice-panel"
      onClick={() => { setOpen(!open); if (!open) void load(); }}
      className="flex min-h-12 w-full items-center justify-between gap-3 text-left font-black text-[#ffc857] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc857]">
      <span>View invoice &amp; payment</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div id="winner-invoice-panel" className="mt-3 border-t border-white/10 pt-4">
      {status === "loading" && <p role="status" className="text-sm text-white/70">Loading your invoice…</p>}
      {status === "waiting" && <p className="text-sm text-white/80">Your invoice is being prepared. Please check back later or contact BragWall.</p>}
      {status === "verify" && <div className="space-y-3 text-sm text-white/80">
        <p>For your privacy, confirm the code sent to the winning bidder's email before viewing the invoice.</p>
        <button type="button" onClick={() => void submit("send")} disabled={busy}
          className="rounded-xl border border-[#ffc857] px-4 py-3 font-bold text-[#ffc857] disabled:opacity-50">
          {sent ? "Send a new code" : "Email me a code"}
        </button>
        {sent && <div className="flex flex-wrap gap-2">
          <input aria-label="Six digit email verification code" autoComplete="one-time-code" inputMode="numeric"
            pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g,""))}
            placeholder="6-digit code" className="min-h-12 rounded-xl border border-white/20 bg-[#061426] px-3 text-white" />
          <button type="button" onClick={() => void submit("verify")} disabled={busy || code.length !== 6}
            className="min-h-12 rounded-xl bg-[#13ed77] px-4 font-black text-[#061426] disabled:opacity-50">Verify</button>
        </div>}
      </div>}
      {status === "ready" && invoice && <div className="space-y-3 text-sm text-white/85">
        <p className="text-xs font-black uppercase tracking-wider text-[#13ed77]">Your payment details</p>
        <p className="text-3xl font-black text-white">R{Number(invoice.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
        <dl className="grid gap-2 rounded-xl bg-[#061426] p-4 sm:grid-cols-2">
          {([['Reference',invoice.payment.payment_reference],['Account holder',invoice.payment.account_holder],
            ['Bank',invoice.payment.bank_name],['Account number',invoice.payment.account_number],
            ['Branch code',invoice.payment.branch_code],['Account type',invoice.payment.account_type]] as const).map(([key,value]) =>
              <div key={key}><dt className="text-xs text-white/55">{key}</dt><dd className="break-all font-bold text-white">{value}</dd></div>)}
        </dl>
        <p className="text-xs text-[#ffc857]">Use the exact reference when making your payment.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void navigator.clipboard.writeText(invoice.payment.payment_reference).then(() => setMessage("Reference copied.")).catch(() => setMessage("Copy the reference shown above."))}
            className="rounded-xl border border-white/25 px-4 py-3 font-bold">Copy reference</button>
          <a href={`/winner/${artworkId}/invoice?token=${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer"
            className="rounded-xl bg-[#13ed77] px-4 py-3 font-black text-[#061426]">Print / save PDF invoice</a>
        </div>
      </div>}
      {message && <p role="status" className="mt-3 text-sm text-[#ffc857]">{message}</p>}
    </div>}
  </section>;
}

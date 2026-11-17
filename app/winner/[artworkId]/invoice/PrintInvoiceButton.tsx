"use client";

export default function PrintInvoiceButton() {
  return <button type="button" onClick={() => window.print()}
    className="mb-6 rounded-xl bg-[#061426] px-5 py-3 font-bold text-white print:hidden">
    Print / save as PDF
  </button>;
}

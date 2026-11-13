"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_AUCTION_STORAGE_KEY,
  DEFAULT_ADMIN_AUCTION_CODE,
} from "@/lib/useAdminAuctionCode";

type School = {
  code: string;
  name: string;
  sold: number;
  counts: Record<string, number>;
};

export default function SchoolCleanupPage() {
  const [code, setCode] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(
      params.get("auctionCode") ||
      localStorage.getItem(ADMIN_AUCTION_STORAGE_KEY) ||
      ""
    );
  }, []);

  async function preview() {
    setBusy(true);
    setError("");
    setDone("");
    setSchool(null);
    setConfirmation("");

    try {
      const response = await fetch(
        `/api/admin/school-cleanup?auctionCode=${encodeURIComponent(code.trim())}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not review school records.");
      }
      setSchool(result.school);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!school || confirmation !== school.code || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/school-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionCode: school.code,
          confirmation,
          counts: school.counts,
          sold: school.sold,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "School removal failed.");
      }

      localStorage.setItem(
        ADMIN_AUCTION_STORAGE_KEY,
        DEFAULT_ADMIN_AUCTION_CODE
      );
      setDone(
        `${school.name} removed. Private backup: ${result.backupBatch}`
      );
      setSchool(null);
      setCode("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Removal failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07152b] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-[#0c2037] p-6 shadow-2xl sm:p-9">
        <a href="/admin/setup" className="text-sm font-bold text-[#16d66d]">
          ← Back to school setup
        </a>
        <h1 className="mt-6 text-3xl font-black">Remove a test school</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Review all linked records before removal. Sold artwork and shared
          winner links will stop working. A private database backup is kept.
          Stored image and audio files require separate cleanup.
        </p>

        <label htmlFor="school-code" className="mt-7 block text-sm font-bold">
          School URL code
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="school-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setSchool(null);
              setConfirmation("");
            }}
            placeholder="School code"
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-[#061124] p-3 text-white"
          />
          <button
            onClick={preview}
            disabled={busy || !code.trim()}
            className="rounded-xl bg-[#16d66d] px-5 py-3 font-bold text-[#031124] disabled:opacity-50"
          >
            {busy ? "Checking..." : "Review records"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-900/40 p-4 text-red-100">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="mt-5 rounded-xl bg-green-900/40 p-4 text-green-100">
            {done}
          </p>
        )}

        {school && (
          <section className="mt-7 rounded-2xl border border-[#ffc857]/40 bg-[#ffc857]/10 p-5">
            <h2 className="text-2xl font-black">
              {school.name}{" "}
              <span className="text-base text-white/60">({school.code})</span>
            </h2>
            <p className="mt-2 font-bold text-[#ffc857]">
              {school.sold} sold artwork{school.sold === 1 ? "" : "s"}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(school.counts)
                .filter(([, amount]) => amount > 0)
                .map(([table, amount]) => (
                  <div key={table} className="rounded-xl bg-[#07152b] p-3">
                    <dt className="break-all text-xs text-white/60">
                      {table.replaceAll("_", " ")}
                    </dt>
                    <dd className="mt-1 text-xl font-black">{amount}</dd>
                  </div>
                ))}
            </dl>

            <p className="mt-6 text-sm">
              To confirm, type <strong>{school.code}</strong> exactly:
            </p>
            <input
              aria-label="Confirm school code"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-white/20 bg-[#061124] p-3 text-white"
            />

            <button
              onClick={remove}
              disabled={busy || confirmation !== school.code}
              className="mt-4 w-full rounded-xl bg-red-600 px-5 py-4 font-black text-white disabled:opacity-40"
            >
              {busy
                ? "Removing school..."
                : `Permanently remove ${school.name} and its records`}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
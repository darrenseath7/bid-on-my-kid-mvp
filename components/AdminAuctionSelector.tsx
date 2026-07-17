"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ADMIN_AUCTION_STORAGE_KEY,
  DEFAULT_ADMIN_AUCTION_CODE,
  sanitizeAuctionCode,
} from "@/lib/useAdminAuctionCode";

type AuctionOption = {
  auction_code: string;
  school_name: string | null;
  source?: "profile" | "artwork" | "live";
};

function getAuctionLabel(option: AuctionOption) {
  if (option.school_name) {
    return `${option.school_name} (${option.auction_code})`;
  }

  return option.auction_code;
}

function sanitizeDraftAuctionCode(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminAuctionSelector() {
  const [auctionCode, setAuctionCode] = useState(DEFAULT_ADMIN_AUCTION_CODE);
  const [draftCode, setDraftCode] = useState(DEFAULT_ADMIN_AUCTION_CODE);
  const [auctions, setAuctions] = useState<AuctionOption[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [auctionListError, setAuctionListError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("auctionCode");
    const fromStorage = window.localStorage.getItem(ADMIN_AUCTION_STORAGE_KEY);
    const nextCode = sanitizeAuctionCode(fromUrl || fromStorage || DEFAULT_ADMIN_AUCTION_CODE);

    setOrigin(window.location.origin);
    setAuctionCode(nextCode);
    setDraftCode(nextCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuctions() {
      try {
        setLoadingAuctions(true);
        setAuctionListError("");

        const response = await fetch("/api/admin/auction-list", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Could not load school list.");
        }

        if (!cancelled) {
          setAuctions(Array.isArray(payload.auctions) ? payload.auctions : []);
        }
      } catch (error) {
        if (!cancelled) {
          setAuctionListError(
            error instanceof Error ? error.message : "Could not load school list."
          );
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

  const safeDraftCode = sanitizeDraftAuctionCode(draftCode);
  const parentDraftCode = safeDraftCode || "new-school";

  const selectedAuction = useMemo(
    () => auctions.find((option) => option.auction_code === auctionCode),
    [auctionCode, auctions]
  );

  const draftExistsInList = useMemo(
    () => auctions.some((option) => option.auction_code === safeDraftCode),
    [auctions, safeDraftCode]
  );

  const parentPath = `/auction/${parentDraftCode}`;
  const parentUrl = origin ? `${origin}${parentPath}` : parentPath;

  function applyAuctionCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = sanitizeDraftAuctionCode(draftCode);

    if (!nextCode) {
      alert("Please type a school URL slug first, for example: great-foundation");
      return;
    }

    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
    setAuctionCode(nextCode);
    setDraftCode(nextCode);

    const url = new URL(window.location.href);
    url.searchParams.set("auctionCode", nextCode);
    window.location.href = url.toString();
  }

  function chooseExistingAuction(value: string) {
    if (value === "__custom" || value === "__empty") {
      setDraftCode("");
      setCopied(false);
      return;
    }

    const nextCode = sanitizeAuctionCode(value);
    setDraftCode(nextCode);
    setCopied(false);
  }

  function updateDraftCode(value: string) {
    setDraftCode(sanitizeDraftAuctionCode(value));
    setCopied(false);
  }

  async function copyParentLink() {
    try {
      await navigator.clipboard.writeText(parentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-white/12 bg-white/[0.045] p-3.5 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="uppercase tracking-[0.28em] text-[8px] text-white/45 font-black mb-1">
            Active School
          </p>
          <p className="text-sm font-black text-white leading-snug">
            {selectedAuction?.school_name || auctionCode}
          </p>
        </div>

        <span className="rounded-full border border-[#16d66d]/30 bg-[#16d66d]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#16d66d]">
          {auctionCode}
        </span>
      </div>

      <form onSubmit={applyAuctionCode} className="space-y-2.5">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            Choose school
          </span>
          <select
            value={draftExistsInList ? safeDraftCode : "__custom"}
            onChange={(event) => chooseExistingAuction(event.target.value)}
            disabled={loadingAuctions || auctions.length === 0}
            className="w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-3.5 py-2.5 text-sm font-black text-white outline-none focus:border-[#16d66d]/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAuctions && <option value="__loading">Loading schools...</option>}
            {!loadingAuctions && auctions.length === 0 && (
              <option value="__empty">No schools found yet</option>
            )}
            {!loadingAuctions && !draftExistsInList && (
              <option value="__custom">New school link</option>
            )}
            {auctions.map((option) => (
              <option key={option.auction_code} value={option.auction_code}>
                {getAuctionLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            Parent auction URL slug
          </span>
          <input
            value={safeDraftCode}
            onChange={(event) => updateDraftCode(event.target.value)}
            placeholder="flemmings"
            className="w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-3.5 py-2.5 text-sm font-black text-white outline-none focus:border-[#16d66d]/70"
          />
        </label>

        <div className="rounded-2xl border border-[#16d66d]/20 bg-[#16d66d]/10 p-3">
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#16d66d]">
            Link to WhatsApp
          </p>
          <p className="break-all text-[11px] font-black leading-relaxed text-white">
            {parentUrl}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="rounded-2xl bg-[#16d66d] px-3 py-2.5 text-xs font-black text-[#031124] shadow-lg"
          >
            Use School
          </button>

          <button
            type="button"
            onClick={copyParentLink}
            className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 text-center text-xs font-black text-white hover:bg-white/15"
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>

        <a
          href={`/auction/${parentDraftCode}`}
          className="block rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 text-center text-xs font-black text-white hover:bg-white/15"
        >
          Parent View
        </a>
      </form>

      {auctionListError && (
        <p className="mt-2.5 rounded-2xl border border-[#ffc857]/25 bg-[#ffc857]/10 px-3 py-2 text-[11px] leading-relaxed text-[#ffc857] font-bold">
          {auctionListError}
        </p>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-white/50 font-semibold">
        Choose an existing school, or type a new URL slug. Save the school setup to keep it in the dropdown.
      </p>
    </div>
  );
}

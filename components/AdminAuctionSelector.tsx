"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ADMIN_AUCTION_STORAGE_KEY,
  DEFAULT_ADMIN_AUCTION_CODE,
  sanitizeAuctionCode,
} from "@/lib/useAdminAuctionCode";

export default function AdminAuctionSelector() {
  const [auctionCode, setAuctionCode] = useState(DEFAULT_ADMIN_AUCTION_CODE);
  const [draftCode, setDraftCode] = useState(DEFAULT_ADMIN_AUCTION_CODE);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("auctionCode");
    const fromStorage = window.localStorage.getItem(ADMIN_AUCTION_STORAGE_KEY);
    const nextCode = sanitizeAuctionCode(fromUrl || fromStorage || DEFAULT_ADMIN_AUCTION_CODE);

    setAuctionCode(nextCode);
    setDraftCode(nextCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
  }, []);

  function applyAuctionCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = sanitizeAuctionCode(draftCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
    setAuctionCode(nextCode);
    setDraftCode(nextCode);

    const url = new URL(window.location.href);
    url.searchParams.set("auctionCode", nextCode);
    window.location.href = url.toString();
  }

  return (
    <div className="rounded-[22px] border border-white/12 bg-white/[0.045] p-3.5 shadow-xl">
      <p className="uppercase tracking-[0.28em] text-[8px] text-white/45 font-black mb-2">
        Active Auction
      </p>

      <form onSubmit={applyAuctionCode} className="space-y-2.5">
        <input
          value={draftCode}
          onChange={(event) => setDraftCode(event.target.value)}
          placeholder="demo"
          className="w-full rounded-2xl border border-white/12 bg-[#020b18]/70 px-3.5 py-2.5 text-sm font-black text-white outline-none focus:border-[#16d66d]/70"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="rounded-2xl bg-[#16d66d] px-3 py-2.5 text-xs font-black text-[#031124] shadow-lg"
          >
            Use Auction
          </button>

          <a
            href={`/auction/${auctionCode}`}
            className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 text-center text-xs font-black text-white hover:bg-white/15"
          >
            Parent View
          </a>
        </div>
      </form>

      <p className="mt-2.5 text-[11px] leading-relaxed text-white/50 font-semibold">
        Current: <span className="text-[#16d66d] font-black">{auctionCode}</span>
      </p>
    </div>
  );
}

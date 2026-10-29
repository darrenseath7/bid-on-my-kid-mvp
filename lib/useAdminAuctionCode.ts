"use client";

import { useCallback, useEffect, useState } from "react";

export const ADMIN_AUCTION_STORAGE_KEY = "bragwall-admin-auction-code";
export const DEFAULT_ADMIN_AUCTION_CODE = "demo";

export function sanitizeAuctionCode(value: unknown) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || DEFAULT_ADMIN_AUCTION_CODE;
}

export function useAdminAuctionCode(defaultCode = DEFAULT_ADMIN_AUCTION_CODE) {
  const [auctionCode, setAuctionCodeState] = useState(() => sanitizeAuctionCode(defaultCode));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("auctionCode");
    const fromStorage = window.localStorage.getItem(ADMIN_AUCTION_STORAGE_KEY);
    const nextCode = sanitizeAuctionCode(fromUrl || fromStorage || defaultCode);

    setAuctionCodeState(nextCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
  }, [defaultCode]);

  const setAuctionCode = useCallback((value: unknown) => {
    const nextCode = sanitizeAuctionCode(value);
    setAuctionCodeState(nextCode);
    window.localStorage.setItem(ADMIN_AUCTION_STORAGE_KEY, nextCode);
    return nextCode;
  }, []);

  return [auctionCode, setAuctionCode] as const;
}

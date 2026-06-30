import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_OPENING_BID = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAuctionCode(value: unknown) {
  const normalized = String(value || DEFAULT_AUCTION_CODE)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || DEFAULT_AUCTION_CODE;
}

function isValidAuctionCode(value: string) {
  return /^[a-z0-9][a-z0-9_-]{1,79}$/.test(value);
}

function normalizeName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

function normalizeId(value: unknown) {
  return String(value || "").trim();
}

function getOpeningBid(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OPENING_BID;
  }

  return Math.round(parsed);
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "request-unsold-invoice",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message: "Too many invoice requests. Please wait a few minutes and try again.",
    });

    if (limited) {
      return limited;
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("Invalid request.", 400);
    }

    const auctionCode = normalizeAuctionCode((body as { auctionCode?: unknown }).auctionCode);
    const artworkId = normalizeId((body as { artworkId?: unknown }).artworkId);
    const rawBidderName = normalizeName((body as { bidderName?: unknown }).bidderName);
    const email = normalizeEmail((body as { email?: unknown }).email);
    const bidderName = rawBidderName || email || "After-auction buyer";
    const requestedOpeningBid = getOpeningBid((body as { openingBidAmount?: unknown }).openingBidAmount);

    if (!isValidAuctionCode(auctionCode)) {
      return jsonError("Invalid auction.", 400);
    }

    if (!artworkId) {
      return jsonError("Missing artwork id.", 400);
    }

    if (!EMAIL_PATTERN.test(email)) {
      return jsonError("Please enter a valid email address.", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from("demo_school_profile")
      .select("bid_increment")
      .eq("auction_code", auctionCode)
      .maybeSingle<{ bid_increment?: number | null }>();

    const openingBidAmount = getOpeningBid(profile?.bid_increment || requestedOpeningBid);
    const requestedAt = new Date().toISOString();

    const { data: artwork, error } = await supabaseAdmin
      .from("demo_artworks")
      .update({
        status: "after_auction_request",
        sold_amount: openingBidAmount,
        winning_bidder: bidderName,
        winner_email: email,
        invoice_email_requested_at: requestedAt,
        certificate_email_requested_at: null,
      })
      .eq("auction_code", auctionCode)
      .eq("id", artworkId)
      .in("status", ["archived", "after_auction_request"])
      .select(
        [
          "id",
          "sort_order",
          "auction_code",
          "child_name",
          "child_surname",
          "grade",
          "artwork_url",
          "status",
          "sold_amount",
          "winning_bidder",
          "winner_email",
          "invoice_email_requested_at",
          "certificate_email_requested_at",
        ].join(",")
      )
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!artwork) {
      return jsonError("This artwork is no longer available for an after-auction invoice request.", 409);
    }

    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: `${bidderName} requested an after-auction invoice for ${(artwork as any).child_name} ${(artwork as any).child_surname}`,
    });

    return NextResponse.json({
      ok: true,
      artwork,
      message: "Invoice request received.",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not request invoice.",
      500
    );
  }
}

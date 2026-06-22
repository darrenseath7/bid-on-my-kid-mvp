import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AuctionState = {
  auction_code?: string;
  child_name?: string | null;
  child_surname?: string | null;
  current_bid?: number | null;
  leading_bidder?: string | null;
  status: string;
  status_deadline?: string | null;
  next_bid_amount?: number | null;
};

type SchoolProfile = {
  auction_code: string;
  bid_increment?: number | null;
};

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const BIDDING_START_BUFFER_SECONDS = 15;

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

function getSafeBidIncrement(value?: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BID_STEP;
  }

  return Math.round(parsed);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const auctionCode = normalizeAuctionCode(body?.auctionCode);
    const reason = String(body?.reason || "").trim();

    if (!isValidAuctionCode(auctionCode)) {
      return jsonError("Invalid auction code.", 400);
    }

    if (reason !== "audio-finished" && reason !== "backup-timer") {
      return jsonError("Invalid open-bidding reason.", 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: auction, error: auctionError } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .single<AuctionState>();

    if (auctionError || !auction) {
      return jsonError("Auction is not available.", 404);
    }

    if (auction.status !== "intro") {
      return NextResponse.json({ ok: true, alreadyOpen: auction.status === "open", auction });
    }

    if (reason === "backup-timer") {
      const deadlineMs = auction.status_deadline
        ? new Date(auction.status_deadline).getTime()
        : 0;

      if (!deadlineMs || deadlineMs > Date.now()) {
        return jsonError("The MC intro timer has not finished yet.", 409);
      }
    }

    const { data: profile } = await supabase
      .from("demo_school_profile")
      .select("auction_code,bid_increment")
      .eq("auction_code", auctionCode)
      .maybeSingle<SchoolProfile>();

    const bidIncrement = getSafeBidIncrement(profile?.bid_increment);
    const currentBid = Number(auction.current_bid || 0);
    const openingBid = Math.max(
      Number(auction.next_bid_amount || 0),
      currentBid + bidIncrement,
      bidIncrement
    );

    const childName = String(auction.child_name || "this artwork").trim() || "this artwork";
    const childSurname = String(auction.child_surname || "").trim();
    const displayName = [childName, childSurname].filter(Boolean).join(" ");
    const countdownDeadline = new Date(Date.now() + BIDDING_START_BUFFER_SECONDS * 1000).toISOString();
    const commentary = `MC intro complete. Bidding starts in ${BIDDING_START_BUFFER_SECONDS} seconds for ${childName}’s artwork.`;

    const { data: updatedAuction, error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        status: "starting_soon",
        status_deadline: countdownDeadline,
        bid_pause_until: null,
        next_bid_amount: openingBid,
        mc_commentary: commentary,
        updated_at: new Date().toISOString(),
      })
      .eq("auction_code", auctionCode)
      .eq("status", "intro")
      .select("*")
      .maybeSingle<AuctionState>();

    if (updateError || !updatedAuction) {
      return jsonError(updateError?.message || "Could not open bidding.", 409);
    }

    await supabase.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: `MC intro complete for ${displayName}. Bidding starts in ${BIDDING_START_BUFFER_SECONDS} seconds.`,
    });

    return NextResponse.json({
      ok: true,
      auction: updatedAuction,
      nextBidAmount: openingBid,
      biddingStartsAt: countdownDeadline,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open bidding.";
    return jsonError(message, 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

type AuctionState = {
  auction_code?: string;
  child_name?: string | null;
  child_surname?: string | null;
  grade?: string | null;
  artwork_url?: string | null;
  current_bid: number;
  leading_bidder: string;
  status: string;
  status_deadline?: string | null;
  mc_commentary?: string | null;
  bid_pause_until?: string | null;
  next_bid_amount?: number | null;
  last_bid_at?: string | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
  mc_audio_url?: string | null;
};

type SchoolProfile = {
  auction_code: string;
  bid_increment?: number | null;
};

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const BID_PAUSE_SECONDS = 5;

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

function normalizeBidderName(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "place-bid",
      limit: 30,
      windowMs: 60 * 1000,
      message: "Too many bid attempts. Please wait a moment and try again.",
    });

    if (limited) {
      return limited;
    }

    const body = await request.json().catch(() => null);

    const auctionCode = normalizeAuctionCode(body?.auctionCode);
    const bidderName = normalizeBidderName(body?.bidderName);
    const amount = Number(body?.amount);

    if (!isValidAuctionCode(auctionCode)) {
      return jsonError("Invalid auction code.", 400);
    }

    if (!bidderName) {
      return jsonError("Please enter your bidder name first.", 400);
    }

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return jsonError("Invalid bid amount.", 400);
    }

    const roundedAmount = Math.round(amount);

    if (roundedAmount !== amount) {
      return jsonError("Bid amount must be a whole number.", 400);
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

    const status = String(auction.status || "").toLowerCase();
    const biddingAllowed = status === "open" || status === "going once" || status === "going twice";

    if (!biddingAllowed) {
      if (status === "waiting") return jsonError("Auction has not started yet.", 409);
      if (status === "intro") return jsonError("The MC is introducing this artwork. Bidding opens after the intro and countdown.", 409);
      if (status === "starting_soon") return jsonError("Bidding starts when the countdown reaches zero.", 409);
      if (status === "preparing_intro" || status === "preparing intro") return jsonError("The MC intro is being prepared. Bidding will open after the intro.", 409);
      if (status === "sold") return jsonError("This artwork has already been sold.", 409);

      return jsonError("Bidding is not open yet.", 409);
    }

    if (status === "open" && auction.bid_pause_until) {
      const pauseUntil = new Date(auction.bid_pause_until).getTime();

      if (Number.isFinite(pauseUntil) && pauseUntil > Date.now()) {
        return jsonError("Bidding is paused for a moment. Please try again when the next bid opens.", 409);
      }
    }

    const { data: profile } = await supabase
      .from("demo_school_profile")
      .select("auction_code,bid_increment")
      .eq("auction_code", auctionCode)
      .maybeSingle<SchoolProfile>();

    const bidIncrement = getSafeBidIncrement(profile?.bid_increment);
    const currentBid = Number(auction.current_bid || 0);
    const minimumBid = Math.max(
      Number(auction.next_bid_amount || 0),
      currentBid + bidIncrement,
      bidIncrement
    );

    if (roundedAmount < minimumBid) {
      return jsonError(`This bid is no longer high enough. The next bid is R${minimumBid.toLocaleString()}.`, 409);
    }

    const now = new Date();
    const pauseUntil = new Date(now.getTime() + BID_PAUSE_SECONDS * 1000).toISOString();
    const nextAsk = roundedAmount + bidIncrement;
    const message = `R${roundedAmount.toLocaleString()} received from ${bidderName}. Do I hear R${nextAsk.toLocaleString()}?`;

    const { data: insertedBid, error: bidError } = await supabase
      .from("live_bids")
      .insert({
        auction_code: auctionCode,
        bidder_name: bidderName,
        amount: roundedAmount,
      })
      .select("id")
      .single();

    if (bidError || !insertedBid) {
      return jsonError(bidError?.message || "Could not place bid.", 400);
    }

    const { data: updatedAuction, error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: roundedAmount,
        leading_bidder: bidderName,
        next_bid_amount: nextAsk,
        bid_pause_until: pauseUntil,
        last_bid_at: now.toISOString(),
        status: "open",
        status_deadline: null,
        mc_commentary: message,
        winner_email: null,
        winner_email_submitted_at: null,
      })
      .eq("auction_code", auctionCode)
      .eq("current_bid", currentBid)
      .in("status", ["open", "going once", "going twice"])
      .select("*")
      .maybeSingle<AuctionState>();

    if (updateError || !updatedAuction) {
      await supabase.from("live_bids").delete().eq("id", insertedBid.id);
      return jsonError("Another bid arrived first. Please refresh and bid again.", 409);
    }

    await supabase.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: `R${roundedAmount.toLocaleString()} received from ${bidderName}`,
    });

    return NextResponse.json({
      ok: true,
      auction: updatedAuction,
      nextBidAmount: nextAsk,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place bid.";
    return jsonError(message, 500);
  }
}

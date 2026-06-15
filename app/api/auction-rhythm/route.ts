import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_AUCTION_CODE = "demo";
const SILENCE_BEFORE_GOING_ONCE_SECONDS = 8;
const GOING_ONCE_SECONDS = 3;
const GOING_TWICE_SECONDS = 3;

type AuctionState = {
  auction_code: string;
  artwork_id?: string | null;
  child_name?: string | null;
  child_surname?: string | null;
  current_bid?: number | null;
  leading_bidder?: string | null;
  status?: string | null;
  status_deadline?: string | null;
  bid_pause_until?: string | null;
  last_bid_at?: string | null;
};

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
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function addActivity(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string,
  message: string
) {
  await supabaseAdmin.from("live_activity_feed").insert({
    auction_code: auctionCode,
    message,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const auctionCode = normalizeAuctionCode(body?.auctionCode);

    if (!isValidAuctionCode(auctionCode)) {
      return jsonError("Invalid auction code.", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: auctionData, error: auctionError } = await supabaseAdmin
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .maybeSingle();

    if (auctionError) {
      return jsonError(auctionError.message, 500);
    }

    const auction = auctionData as AuctionState | null;

    if (!auction) {
      return jsonError("Auction state not found.", 404);
    }

    const status = String(auction.status || "").trim();
    const currentBid = toNumber(auction.current_bid);
    const leadingBidder = String(auction.leading_bidder || "").trim();

    if (currentBid <= 0) {
      return NextResponse.json({ action: "none", auction });
    }

    if (status === "sold" || status === "waiting" || status === "intro") {
      return NextResponse.json({ action: "none", auction });
    }

    const now = Date.now();

    if (status === "open") {
      const pauseUntil = auction.bid_pause_until
        ? new Date(auction.bid_pause_until).getTime()
        : 0;

      if (pauseUntil > now) {
        return NextResponse.json({ action: "none", auction });
      }

      const lastBidTime = auction.last_bid_at
        ? new Date(auction.last_bid_at).getTime()
        : 0;

      if (!lastBidTime) {
        return NextResponse.json({ action: "none", auction });
      }

      const silenceStartsAt = Math.max(lastBidTime, pauseUntil);
      const silenceSeconds = Math.floor((now - silenceStartsAt) / 1000);

      if (silenceSeconds < SILENCE_BEFORE_GOING_ONCE_SECONDS) {
        return NextResponse.json({ action: "none", auction });
      }

      const deadline = new Date(
        Date.now() + GOING_ONCE_SECONDS * 1000
      ).toISOString();

      const commentary = `Going once at R${currentBid.toLocaleString()} for ${leadingBidder}. Last chance to beat this bid.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "going once",
          status_deadline: deadline,
          bid_pause_until: null,
          mc_commentary: commentary,
        })
        .eq("auction_code", auctionCode)
        .eq("status", "open")
        .eq("current_bid", currentBid)
        .eq("last_bid_at", auction.last_bid_at || "")
        .select("*")
        .maybeSingle();

      if (updateError) {
        return jsonError(updateError.message, 500);
      }

      if (!updatedAuction) {
        return NextResponse.json({ action: "none", auction });
      }

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `Going once at R${currentBid.toLocaleString()}`
      );

      return NextResponse.json({ action: "going_once", auction: updatedAuction });
    }

    if (status === "going once") {
      if (!auction.status_deadline) {
        return NextResponse.json({ action: "none", auction });
      }

      const deadline = new Date(auction.status_deadline).getTime();

      if (now < deadline) {
        return NextResponse.json({ action: "none", auction });
      }

      const newDeadline = new Date(
        Date.now() + GOING_TWICE_SECONDS * 1000
      ).toISOString();

      const commentary = `Going twice at R${currentBid.toLocaleString()}. ${leadingBidder} is seconds away from serious bragging rights.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "going twice",
          status_deadline: newDeadline,
          bid_pause_until: null,
          mc_commentary: commentary,
        })
        .eq("auction_code", auctionCode)
        .eq("status", "going once")
        .eq("current_bid", currentBid)
        .eq("status_deadline", auction.status_deadline)
        .select("*")
        .maybeSingle();

      if (updateError) {
        return jsonError(updateError.message, 500);
      }

      if (!updatedAuction) {
        return NextResponse.json({ action: "none", auction });
      }

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `Going twice at R${currentBid.toLocaleString()}`
      );

      return NextResponse.json({ action: "going_twice", auction: updatedAuction });
    }

    if (status === "going twice") {
      if (!auction.status_deadline) {
        return NextResponse.json({ action: "none", auction });
      }

      const deadline = new Date(auction.status_deadline).getTime();

      if (now < deadline) {
        return NextResponse.json({ action: "none", auction });
      }

      const commentary = `Sold to ${leadingBidder} for R${currentBid.toLocaleString()}. A masterpiece has found its forever wall.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "sold",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary: commentary,
        })
        .eq("auction_code", auctionCode)
        .eq("status", "going twice")
        .eq("current_bid", currentBid)
        .eq("status_deadline", auction.status_deadline)
        .select("*")
        .maybeSingle();

      if (updateError) {
        return jsonError(updateError.message, 500);
      }

      if (!updatedAuction) {
        return NextResponse.json({ action: "none", auction });
      }

      await supabaseAdmin
        .from("demo_artworks")
        .update({
          status: "sold",
          sold_amount: currentBid,
          winning_bidder: leadingBidder,
        })
        .eq("auction_code", auctionCode)
        .eq("status", "live");

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `SOLD to ${leadingBidder} for R${currentBid.toLocaleString()}`
      );

      return NextResponse.json({ action: "sold", auction: updatedAuction });
    }

    return NextResponse.json({ action: "none", auction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not run auction rhythm.";

    return jsonError(message, 500);
  }
}

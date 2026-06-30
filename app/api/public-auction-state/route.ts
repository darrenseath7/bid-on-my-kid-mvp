import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;

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

function getSafeBidIncrement(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BID_STEP;
  }

  return Math.round(parsed);
}

type RawAuctionState = {
  auction_code?: string | null;
  artwork_id?: string | null;
  child_name?: string | null;
  child_surname?: string | null;
  grade?: string | null;
  artwork_url?: string | null;
  current_bid?: number | null;
  leading_bidder?: string | null;
  status?: string | null;
  total_raised?: number | null;
  status_deadline?: string | null;
  mc_commentary?: string | null;
  mc_audio_url?: string | null;
  bid_pause_until?: string | null;
  next_bid_amount?: number | null;
  last_bid_at?: string | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
  updated_at?: string | null;
};

type RawBid = {
  id: string;
  bidder_name?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

type RawArtwork = {
  id: string;
  auction_code?: string | null;
  child_name?: string | null;
  child_surname?: string | null;
  grade?: string | null;
  artwork_url?: string | null;
  enhanced_artwork_url?: string | null;
  status?: string | null;
  sort_order?: number | null;
  sold_amount?: number | null;
  winning_bidder?: string | null;
  ai_intro?: string | null;
  mc_audio_url?: string | null;
  winner_email?: string | null;
  invoice_email_requested_at?: string | null;
};

function sanitizeAuction(auction: RawAuctionState | null) {
  if (!auction) return null;

  return {
    auction_code: auction.auction_code || "",
    artwork_id: auction.artwork_id || null,
    child_name: auction.child_name || "",
    child_surname: auction.child_surname || "",
    grade: auction.grade || "",
    artwork_url: auction.artwork_url || "",
    current_bid: Number(auction.current_bid || 0),
    leading_bidder: auction.leading_bidder || "",
    status: auction.status || "waiting",
    total_raised: Number(auction.total_raised || 0),
    status_deadline: auction.status_deadline || null,
    mc_commentary: auction.mc_commentary || null,
    mc_audio_url: auction.mc_audio_url || null,
    bid_pause_until: auction.bid_pause_until || null,
    next_bid_amount: auction.next_bid_amount || null,
    last_bid_at: auction.last_bid_at || null,
    winner_email: null,
    winner_email_submitted_at: null,
    winner_email_submitted: Boolean(
      auction.winner_email || auction.winner_email_submitted_at
    ),
    updated_at: auction.updated_at || null,
  };
}

function sanitizeBid(bid: RawBid) {
  return {
    id: bid.id,
    bidder_name: bid.bidder_name || "",
    amount: Number(bid.amount || 0),
    created_at: bid.created_at || null,
  };
}

function sanitizeArtwork(artwork: RawArtwork) {
  return {
    id: artwork.id,
    auction_code: artwork.auction_code || "",
    child_name: artwork.child_name || "",
    child_surname: artwork.child_surname || "",
    grade: artwork.grade || "",
    artwork_url: artwork.artwork_url || "",
    enhanced_artwork_url: artwork.enhanced_artwork_url || null,
    status: artwork.status || null,
    sort_order: artwork.sort_order || null,
    sold_amount: artwork.sold_amount || null,
    winning_bidder: artwork.winning_bidder || null,
    ai_intro: artwork.ai_intro || null,
    mc_audio_url: artwork.mc_audio_url || null,
    invoice_email_requested: Boolean(artwork.winner_email || artwork.invoice_email_requested_at),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auctionCode = normalizeAuctionCode(searchParams.get("auctionCode"));

    if (!isValidAuctionCode(auctionCode)) {
      return jsonError("Invalid auction code.", 400);
    }

    const supabase = getSupabaseAdmin();

    const [auctionResult, profileResult, bidsResult, artworksResult] = await Promise.all([
      supabase
        .from("live_auction_state")
        .select(
          "auction_code,artwork_id,child_name,child_surname,grade,artwork_url,current_bid,leading_bidder,status,total_raised,status_deadline,mc_commentary,mc_audio_url,bid_pause_until,next_bid_amount,last_bid_at,winner_email,winner_email_submitted_at,updated_at"
        )
        .eq("auction_code", auctionCode)
        .maybeSingle<RawAuctionState>(),
      supabase
        .from("demo_school_profile")
        .select("auction_code,bid_increment")
        .eq("auction_code", auctionCode)
        .maybeSingle<{ auction_code: string; bid_increment?: number | null }>(),
      supabase
        .from("live_bids")
        .select("id,bidder_name,amount,created_at")
        .eq("auction_code", auctionCode)
        .order("amount", { ascending: false })
        .limit(500),
      supabase
        .from("demo_artworks")
        .select(
          "id,auction_code,child_name,child_surname,grade,artwork_url,enhanced_artwork_url,status,sort_order,sold_amount,winning_bidder,winner_email,invoice_email_requested_at,ai_intro,mc_audio_url"
        )
        .eq("auction_code", auctionCode)
        .order("sort_order", { ascending: true }),
    ]);

    if (auctionResult.error) {
      return jsonError(auctionResult.error.message, 500);
    }

    if (profileResult.error) {
      return jsonError(profileResult.error.message, 500);
    }

    if (bidsResult.error) {
      return jsonError(bidsResult.error.message, 500);
    }

    if (artworksResult.error) {
      return jsonError(artworksResult.error.message, 500);
    }

    const profile = profileResult.data
      ? {
          auction_code: auctionCode,
          bid_increment: getSafeBidIncrement(profileResult.data.bid_increment),
        }
      : {
          auction_code: auctionCode,
          bid_increment: DEFAULT_BID_STEP,
        };

    return NextResponse.json(
      {
        ok: true,
        auctionCode,
        auction: sanitizeAuction(auctionResult.data || null),
        profile,
        bids: (bidsResult.data || []).map(sanitizeBid),
        artworks: (artworksResult.data || []).map(sanitizeArtwork),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load auction.";
    return jsonError(message, 500);
  }
}





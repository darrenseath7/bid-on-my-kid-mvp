import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_AUCTION_CODE = "demo";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEXT_ARTWORK_COUNTDOWN_SECONDS = 15;

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

function normalizeName(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const auctionCode = normalizeAuctionCode((body as { auctionCode?: unknown }).auctionCode);
    const bidderName = normalizeName((body as { bidderName?: unknown }).bidderName);
    const email = normalizeEmail((body as { email?: unknown }).email);
    const artworkId = String((body as { artworkId?: unknown }).artworkId || "").trim();

    if (!isValidAuctionCode(auctionCode)) {
      return NextResponse.json({ error: "Invalid auction." }, { status: 400 });
    }

    if (!bidderName || bidderName.length > 80) {
      return NextResponse.json({ error: "Invalid bidder name." }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: auction, error: auctionError } = await supabaseAdmin
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: "Auction could not be loaded." }, { status: 404 });
    }

    if (auction.status !== "sold") {
      return NextResponse.json({ error: "Winner email can only be submitted after the artwork is sold." }, { status: 409 });
    }

    const leadingBidder = normalizeName(auction.leading_bidder);

    if (!leadingBidder || leadingBidder.toLowerCase() !== bidderName.toLowerCase()) {
      return NextResponse.json({ error: "Only the winning bidder can submit the invoice email." }, { status: 403 });
    }

    if (!Number.isFinite(Number(auction.current_bid)) || Number(auction.current_bid) <= 0) {
      return NextResponse.json({ error: "This artwork does not have a valid winning bid." }, { status: 409 });
    }

    const submittedAt = new Date().toISOString();
    const nextArtworkDeadline = new Date(Date.now() + NEXT_ARTWORK_COUNTDOWN_SECONDS * 1000).toISOString();

    const { data: updatedAuction, error: stateError } = await supabaseAdmin
      .from("live_auction_state")
      .update({
        winner_email: email,
        winner_email_submitted_at: submittedAt,
        status_deadline: nextArtworkDeadline,
        mc_commentary: `Winner email received. Next artwork starts in ${NEXT_ARTWORK_COUNTDOWN_SECONDS} seconds.`,
      })
      .eq("auction_code", auctionCode)
      .eq("status", "sold")
      .eq("leading_bidder", auction.leading_bidder)
      .select("*")
      .single();

    if (stateError || !updatedAuction) {
      return NextResponse.json({ error: "Could not save winner email." }, { status: 500 });
    }

    let artworkQuery = supabaseAdmin
      .from("demo_artworks")
      .update({
        winner_email: email,
        invoice_email_requested_at: submittedAt,
        certificate_email_requested_at: null,
      })
      .eq("auction_code", auctionCode)
      .eq("status", "sold")
      .eq("winning_bidder", auction.leading_bidder);

    if (artworkId) {
      artworkQuery = artworkQuery.eq("id", artworkId);
    } else if (auction.artwork_id) {
      artworkQuery = artworkQuery.eq("id", auction.artwork_id);
    }

    const { error: artworkError } = await artworkQuery;

    if (artworkError) {
      return NextResponse.json({ error: "Could not update artwork winner email." }, { status: 500 });
    }

    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: `${auction.leading_bidder} submitted email. Next artwork starts in ${NEXT_ARTWORK_COUNTDOWN_SECONDS} seconds.`,
    });

    return NextResponse.json({
      ok: true,
      auction: updatedAuction,
    });
  } catch (error) {
    console.error("submit-winner-email error:", error);

    return NextResponse.json(
      { error: "Could not submit winner email." },
      { status: 500 }
    );
  }
}

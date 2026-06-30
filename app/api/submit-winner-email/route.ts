import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const DEFAULT_AUCTION_CODE = "demo";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEXT_ARTWORK_COUNTDOWN_SECONDS = 15;

type Artwork = {
  id: string;
  auction_code: string;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  enhanced_artwork_url?: string | null;
  status?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
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

function getArtworkDisplayUrl(artwork: Artwork | null) {
  if (!artwork) return "";
  return artwork.enhanced_artwork_url || artwork.artwork_url || "";
}

async function fetchArtworks(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string
) {
  const { data, error } = await supabaseAdmin
    .from("demo_artworks")
    .select("*")
    .eq("auction_code", auctionCode)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Artwork[];
}

function getCurrentArtwork(auction: Record<string, unknown>, artworks: Artwork[]) {
  const auctionArtworkId = String(auction.artwork_id || "");
  const auctionArtworkUrl = String(auction.artwork_url || "");
  const auctionChildName = String(auction.child_name || "");
  const auctionChildSurname = String(auction.child_surname || "");

  return (
    artworks.find((item) => auctionArtworkId && item.id === auctionArtworkId) ||
    artworks.find((item) => {
      const displayUrl = getArtworkDisplayUrl(item);
      return (
        item.child_name === auctionChildName &&
        item.child_surname === auctionChildSurname &&
        (item.artwork_url === auctionArtworkUrl || displayUrl === auctionArtworkUrl)
      );
    }) ||
    null
  );
}

function getNextArtwork(currentArtwork: Artwork | null, artworks: Artwork[]) {
  const activeQueue = artworks.filter((item) => item.status !== "sold" && item.status !== "archived");
  const sorted = [...activeQueue].sort((a, b) => {
    const aOrder = Number(a.sort_order || 0);
    const bOrder = Number(b.sort_order || 0);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });

  if (!currentArtwork) return sorted[0] || null;

  const currentIndex = sorted.findIndex((item) => item.id === currentArtwork.id);
  if (currentIndex >= 0) {
    return sorted.slice(currentIndex + 1).find((item) => item.id !== currentArtwork.id) || null;
  }

  return sorted.find((item) => item.id !== currentArtwork.id) || null;
}

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "submit-winner-email",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message: "Too many email submissions. Please wait a few minutes and try again.",
    });

    if (limited) {
      return limited;
    }

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

    const artworks = await fetchArtworks(supabaseAdmin, auctionCode);
    const currentArtwork = getCurrentArtwork(auction, artworks);
    const nextArtwork = getNextArtwork(currentArtwork, artworks);

    const nextStatePatch = nextArtwork
      ? {
          artwork_id: nextArtwork.id,
          child_name: nextArtwork.child_name,
          child_surname: nextArtwork.child_surname,
          grade: nextArtwork.grade,
          artwork_url: getArtworkDisplayUrl(nextArtwork),
          current_bid: 0,
          leading_bidder: "No bids yet",
          status: "next_artwork_countdown",
          status_deadline: nextArtworkDeadline,
          bid_pause_until: null,
          next_bid_amount: null,
          last_bid_at: null,
          winner_email: email,
          winner_email_submitted_at: submittedAt,
          mc_commentary: `Winner email received. Next artwork appears now and the AI MC starts in ${NEXT_ARTWORK_COUNTDOWN_SECONDS} seconds.`,
          mc_audio_url: null,
          updated_at: submittedAt,
        }
      : {
          winner_email: email,
          winner_email_submitted_at: submittedAt,
          status_deadline: nextArtworkDeadline,
          mc_commentary: `Winner email received. Auction will finish in ${NEXT_ARTWORK_COUNTDOWN_SECONDS} seconds.`,
          updated_at: submittedAt,
        };

    const { data: updatedAuction, error: stateError } = await supabaseAdmin
      .from("live_auction_state")
      .update(nextStatePatch)
      .eq("auction_code", auctionCode)
      .eq("status", "sold")
      .eq("leading_bidder", auction.leading_bidder)
      .select("*")
      .single();

    if (stateError || !updatedAuction) {
      return NextResponse.json({ error: "Could not save winner email." }, { status: 500 });
    }

    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: nextArtwork
        ? `${auction.leading_bidder} submitted email. Next artwork by ${nextArtwork.child_name} ${nextArtwork.child_surname} starts in ${NEXT_ARTWORK_COUNTDOWN_SECONDS} seconds.`
        : `${auction.leading_bidder} submitted email. Auction complete countdown started.`,
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

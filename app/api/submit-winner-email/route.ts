import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";
import { createHash } from "crypto";

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

    if (
      !leadingBidder ||
      leadingBidder.toLowerCase() !== bidderName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Only the winning bidder can confirm this email." },
        { status: 403 }
      );
    }

    const submittedContactId = String(
      (body as { bidderContactId?: unknown }).bidderContactId || ""
    ).trim();

    const submittedToken = String(
      (body as { bidderToken?: unknown }).bidderToken || ""
    ).trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submittedContactId) ||
      !/^[0-9a-f]{64}$/i.test(submittedToken)
    ) {
      return NextResponse.json(
        { error: "Your bidder session is invalid." },
        { status: 403 }
      );
    }

    const leadingContactId = String(
      auction.leading_bidder_contact_id || ""
    ).trim();

    if (
      !leadingContactId ||
      leadingContactId !== submittedContactId
    ) {
      return NextResponse.json(
        { error: "This email can only be confirmed by the winning bidder." },
        { status: 403 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(submittedToken)
      .digest("hex");

    const { data: contact, error: contactError } = await supabaseAdmin
      .from("auction_bidder_contacts")
      .select("id,bidder_name")
      .eq("id", submittedContactId)
      .eq("auction_code", auctionCode)
      .eq("bidder_token_hash", tokenHash)
      .maybeSingle();

    if (
      contactError ||
      !contact ||
      normalizeName(contact.bidder_name).toLowerCase() !==
        leadingBidder.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Could not verify the winning bidder." },
        { status: 403 }
      );
    }

    if (
      !Number.isFinite(Number(auction.current_bid)) ||
      Number(auction.current_bid) <= 0
    ) {
      return NextResponse.json(
        { error: "This artwork does not have a valid winning bid." },
        { status: 409 }
      );
    }

    const currentArtworkId = String(auction.artwork_id || "").trim();

    if (!currentArtworkId) {
      return NextResponse.json(
        { error: "Current artwork could not be identified." },
        { status: 409 }
      );
    }

    if (artworkId && artworkId !== currentArtworkId) {
      return NextResponse.json(
        { error: "This artwork is no longer active." },
        { status: 409 }
      );
    }

    const submittedAt = new Date().toISOString();

    const { data: updatedArtwork, error: artworkError } = await supabaseAdmin
      .from("demo_artworks")
      .update({
        winner_email: email,
        invoice_email_requested_at: submittedAt,
      })
      .eq("id", currentArtworkId)
      .eq("auction_code", auctionCode)
      .eq("status", "sold")
      .eq("winning_bidder", auction.leading_bidder)
      .select("id")
      .maybeSingle();

    if (artworkError || !updatedArtwork) {
      return NextResponse.json(
        { error: "Could not confirm the winner email." },
        { status: 409 }
      );
    }

    // Email confirmation must not advance the auction.
    // The existing auction rhythm controls the 15-second winner stage.
    return NextResponse.json({
      ok: true,
      message: "Email confirmed successfully.",
      emailConfirmed: true,
    });
  } catch (error) {
    console.error("submit-winner-email error:", error);

    return NextResponse.json(
      { error: "Could not submit winner email." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

type AuctionState = {
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  current_bid: number;
  leading_bidder: string;
  status: string;
  total_raised?: number | null;
  status_deadline?: string | null;
  mc_commentary?: string | null;
  bid_pause_until?: string | null;
  next_bid_amount?: number | null;
  last_bid_at?: string | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
  mc_audio_url?: string | null;
};

type Artwork = {
  id: string;
  auction_code: string;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  enhanced_artwork_url?: string | null;
  ai_story?: string | null;
  ai_intro?: string | null;
  description?: string | null;
  status?: string | null;
  sort_order?: number | null;
  sold_amount?: number | null;
  winning_bidder?: string | null;
  winner_email?: string | null;
  mc_audio_url?: string | null;
  created_at?: string | null;
};

type SchoolProfile = {
  auction_code: string;
  bid_increment?: number | null;
};

const AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const MIN_MC_INTRO_SECONDS = 28;
const MAX_MC_INTRO_SECONDS = 120;
const MC_WORDS_PER_SECOND = 2.2;
const MC_INTRO_PADDING_SECONDS = 8;

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

function getArtworkDisplayUrl(artwork: Artwork | null) {
  if (!artwork) return "";
  return artwork.enhanced_artwork_url || artwork.artwork_url || "";
}

function getMcIntroText(artwork: Artwork) {
  const story =
    artwork.ai_story?.trim() ||
    artwork.ai_intro?.trim() ||
    artwork.description?.trim();

  if (story) return story;

  const childName = [artwork.child_name, artwork.child_surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return `Ladies and gentlemen, our next BragWall masterpiece is by ${
    childName || "one of our young artists"
  } from ${
    artwork.grade || "the school"
  }. Take a good look — bidding opens in a moment.`;
}

function estimateMcIntroSeconds(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimated = Math.ceil(wordCount / MC_WORDS_PER_SECOND) + MC_INTRO_PADDING_SECONDS;

  return Math.min(
    MAX_MC_INTRO_SECONDS,
    Math.max(MIN_MC_INTRO_SECONDS, estimated)
  );
}

function getCurrentArtwork(
  auction: AuctionState | null,
  artworks: Artwork[]
): Artwork | null {
  if (auction) {
    const matchedArtwork = artworks.find((item) => {
      const displayUrl = getArtworkDisplayUrl(item);

      return (
        item.child_name === auction.child_name &&
        item.child_surname === auction.child_surname &&
        (item.artwork_url === auction.artwork_url ||
          displayUrl === auction.artwork_url)
      );
    });

    if (matchedArtwork) return matchedArtwork;
  }

  const activeArtworks = artworks.filter(
    (item) => item.status !== "sold" && item.status !== "archived"
  );

  return (
    activeArtworks.find((item) => item.status === "live") ||
    activeArtworks.find((item) => item.status === "queued") ||
    activeArtworks.find((item) => item.status === "pending") ||
    activeArtworks.find((item) => item.sort_order === 1) ||
    activeArtworks[0] ||
    null
  );
}

function getNextArtwork(
  currentArtwork: Artwork | null,
  activeQueueArtworks: Artwork[]
): Artwork | null {
  const sorted = [...activeQueueArtworks].sort((a, b) => {
    const aOrder = Number(a.sort_order || 0);
    const bOrder = Number(b.sort_order || 0);

    if (aOrder !== bOrder) return aOrder - bOrder;

    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });

  if (!currentArtwork) {
    return sorted.find((item) => item.status !== "live") || sorted[0] || null;
  }

  const currentIndex = sorted.findIndex((item) => item.id === currentArtwork.id);

  if (currentIndex >= 0) {
    return sorted.slice(currentIndex + 1).find((item) => item.id !== currentArtwork.id) ||
      sorted.find((item) => item.id !== currentArtwork.id) ||
      null;
  }

  return sorted.find((item) => item.id !== currentArtwork.id) || null;
}

async function assertAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);

  if (!session) return null;

  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (
    allowedEmails.length > 0 &&
    !allowedEmails.includes(session.email.toLowerCase())
  ) {
    return null;
  }

  return session;
}

async function addActivity(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  message: string
) {
  const { error } = await supabaseAdmin.from("live_activity_feed").insert({
    auction_code: AUCTION_CODE,
    message,
  });

  if (error) throw new Error(error.message);
}

async function fetchAuction(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabaseAdmin
    .from("live_auction_state")
    .select("*")
    .eq("auction_code", AUCTION_CODE)
    .single();

  if (error) throw new Error(error.message);

  return data as AuctionState;
}

async function fetchBidIncrement(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await supabaseAdmin
    .from("demo_school_profile")
    .select("auction_code,bid_increment")
    .eq("auction_code", AUCTION_CODE)
    .maybeSingle();

  const profile = data as SchoolProfile | null;

  return getSafeBidIncrement(profile?.bid_increment);
}

async function fetchArtworks(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabaseAdmin
    .from("demo_artworks")
    .select("*")
    .eq("auction_code", AUCTION_CODE)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []) as Artwork[];
}

async function fetchArtworkById(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  artworkId: string
) {
  const { data, error } = await supabaseAdmin
    .from("demo_artworks")
    .select("*")
    .eq("auction_code", AUCTION_CODE)
    .eq("id", artworkId)
    .single();

  if (error) throw new Error(error.message);

  return data as Artwork;
}

async function generateMcVoiceAudio(
  request: NextRequest,
  artwork: Artwork,
  commentary: string
) {
  try {
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const response = await fetch(`${origin}/api/mc-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        auctionCode: AUCTION_CODE,
        artworkId: artwork.id,
        text: commentary,
        childName: [artwork.child_name, artwork.child_surname]
          .filter(Boolean)
          .join(" ")
          .trim(),
        grade: artwork.grade,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result?.error || "Could not generate MC voice.");
    }

    return String(result.audioUrl || "");
  } catch (error) {
    console.error("Could not generate AI MC voice:", error);
    return null;
  }
}

async function moveToArtwork(
  request: NextRequest,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  artworkId: string
) {
  const artwork = await fetchArtworkById(supabaseAdmin, artworkId);
  const bidIncrement = await fetchBidIncrement(supabaseAdmin);
  const displayUrl = getArtworkDisplayUrl(artwork);
  const commentary = getMcIntroText(artwork);

  await supabaseAdmin.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

  const { error: queueError } = await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "queued" })
    .eq("auction_code", AUCTION_CODE)
    .in("status", [
      "live",
      "preparing_intro",
      "intro",
      "open",
      "paused",
      "going once",
      "going twice",
    ]);

  if (queueError) throw new Error(queueError.message);

  const { error: liveArtworkError } = await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "live", mc_audio_url: null })
    .eq("id", artwork.id);

  if (liveArtworkError) throw new Error(liveArtworkError.message);

  const { error: preparingError } = await supabaseAdmin
    .from("live_auction_state")
    .update({
      child_name: artwork.child_name,
      child_surname: artwork.child_surname,
      grade: artwork.grade,
      artwork_url: displayUrl,
      current_bid: 0,
      leading_bidder: "No bids yet",
      status: "preparing_intro",
      status_deadline: null,
      bid_pause_until: null,
      next_bid_amount: bidIncrement,
      last_bid_at: null,
      winner_email: null,
      winner_email_submitted_at: null,
      mc_commentary:
        "The AI MC is preparing this artwork intro. Bidding will open after the story.",
      mc_audio_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("auction_code", AUCTION_CODE);

  if (preparingError) throw new Error(preparingError.message);

  await addActivity(
    supabaseAdmin,
    `Preparing AI MC intro for ${artwork.child_name} ${artwork.child_surname}`
  );

  const mcAudioUrl = await generateMcVoiceAudio(request, artwork, commentary);

  const { error: finalArtworkError } = await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "live", mc_audio_url: mcAudioUrl })
    .eq("id", artwork.id);

  if (finalArtworkError) throw new Error(finalArtworkError.message);

  const introSeconds = estimateMcIntroSeconds(commentary);
  const introDeadline = new Date(Date.now() + introSeconds * 1000).toISOString();

  const { error: stateError } = await supabaseAdmin
    .from("live_auction_state")
    .update({
      child_name: artwork.child_name,
      child_surname: artwork.child_surname,
      grade: artwork.grade,
      artwork_url: displayUrl,
      current_bid: 0,
      leading_bidder: "No bids yet",
      status: "intro",
      status_deadline: introDeadline,
      bid_pause_until: null,
      next_bid_amount: bidIncrement,
      last_bid_at: null,
      winner_email: null,
      winner_email_submitted_at: null,
      mc_commentary: commentary,
      mc_audio_url: mcAudioUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("auction_code", AUCTION_CODE);

  if (stateError) throw new Error(stateError.message);

  await addActivity(
    supabaseAdmin,
    mcAudioUrl
      ? `AI MC voice generated for ${artwork.child_name} ${artwork.child_surname}`
      : `MC intro started for ${artwork.child_name} ${artwork.child_surname}`
  );
}

export async function POST(request: NextRequest) {
  const session = await assertAdmin(request);

  if (!session) {
    return jsonError("Admin login required.", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const action = String(body.action || "");

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const bidIncrement = await fetchBidIncrement(supabaseAdmin);

    if (action === "move-to-artwork") {
      const artworkId = String(body.artworkId || "");

      if (!artworkId) return jsonError("Missing artworkId.");

      await moveToArtwork(request, supabaseAdmin, artworkId);
      return NextResponse.json({ ok: true });
    }

    if (action === "next-artwork") {
      const auction = await fetchAuction(supabaseAdmin);
      const artworks = await fetchArtworks(supabaseAdmin);
      const currentArtwork = getCurrentArtwork(auction, artworks);
      const activeQueueArtworks = artworks.filter(
        (artwork) => artwork.status !== "sold" && artwork.status !== "archived"
      );
      const nextArtwork = getNextArtwork(currentArtwork, activeQueueArtworks);

      if (!nextArtwork) {
        return jsonError("There are no more queued artworks.");
      }

      await moveToArtwork(request, supabaseAdmin, nextArtwork.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "pause") {
      const { error } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "paused",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary:
            "The auctioneer has paused the action. Hold your bids for just a moment.",
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (error) throw new Error(error.message);
      await addActivity(supabaseAdmin, "Auction paused");
      return NextResponse.json({ ok: true });
    }

    if (action === "resume") {
      const { error } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "open",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary:
            "We are back live. The next bid is waiting for a brave parent.",
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (error) throw new Error(error.message);
      await addActivity(supabaseAdmin, "Auction resumed");
      return NextResponse.json({ ok: true });
    }

    if (action === "going-once") {
      const auction = await fetchAuction(supabaseAdmin);

      if (Number(auction.current_bid || 0) <= 0) {
        return jsonError("You need at least one bid before going once.");
      }

      const deadline = new Date(Date.now() + 5000).toISOString();
      const { error } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "going once",
          status_deadline: deadline,
          bid_pause_until: null,
          mc_commentary: `Going once at R${Number(auction.current_bid).toLocaleString()} for ${auction.leading_bidder}. Last chance to beat this bid.`,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (error) throw new Error(error.message);
      await addActivity(supabaseAdmin, `Going once at R${Number(auction.current_bid).toLocaleString()}`);
      return NextResponse.json({ ok: true });
    }

    if (action === "going-twice") {
      const auction = await fetchAuction(supabaseAdmin);

      if (Number(auction.current_bid || 0) <= 0) {
        return jsonError("You need at least one bid before going twice.");
      }

      const deadline = new Date(Date.now() + 5000).toISOString();
      const { error } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "going twice",
          status_deadline: deadline,
          bid_pause_until: null,
          mc_commentary: `Going twice at R${Number(auction.current_bid).toLocaleString()}. ${auction.leading_bidder} is seconds away from serious bragging rights.`,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (error) throw new Error(error.message);
      await addActivity(supabaseAdmin, `Going twice at R${Number(auction.current_bid).toLocaleString()}`);
      return NextResponse.json({ ok: true });
    }

    if (action === "mark-sold") {
      const auction = await fetchAuction(supabaseAdmin);
      const artworks = await fetchArtworks(supabaseAdmin);
      const currentArtwork = getCurrentArtwork(auction, artworks);

      if (!currentArtwork) return jsonError("There is no current artwork.");

      if (Number(auction.current_bid || 0) <= 0 || auction.leading_bidder === "No bids yet") {
        return jsonError("You need a winning bid before marking this artwork as sold.");
      }

      const { error: artworkError } = await supabaseAdmin
        .from("demo_artworks")
        .update({
          status: "sold",
          sold_amount: auction.current_bid,
          winning_bidder: auction.leading_bidder,
        })
        .eq("id", currentArtwork.id);

      if (artworkError) throw new Error(artworkError.message);

      const { error: stateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "sold",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary: `Sold to ${auction.leading_bidder} for R${Number(auction.current_bid).toLocaleString()}. A masterpiece has found its forever wall.`,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (stateError) throw new Error(stateError.message);
      await addActivity(supabaseAdmin, `SOLD to ${auction.leading_bidder} for R${Number(auction.current_bid).toLocaleString()}`);
      return NextResponse.json({ ok: true });
    }

    if (action === "archive-unsold") {
      const auction = await fetchAuction(supabaseAdmin);
      const artworks = await fetchArtworks(supabaseAdmin);
      const currentArtwork = getCurrentArtwork(auction, artworks);

      if (!currentArtwork) return jsonError("There is no current artwork to archive.");
      if (currentArtwork.status === "sold") return jsonError("This artwork is already marked as sold.");

      await supabaseAdmin.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

      const { error: artworkError } = await supabaseAdmin
        .from("demo_artworks")
        .update({
          status: "archived",
          sold_amount: null,
          winning_bidder: null,
          winner_email: null,
          mc_audio_url: null,
        })
        .eq("id", currentArtwork.id);

      if (artworkError) throw new Error(artworkError.message);

      const { error: stateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          child_name: "",
          child_surname: "",
          grade: "",
          artwork_url: "",
          current_bid: 0,
          leading_bidder: "No bids yet",
          status: "waiting",
          status_deadline: null,
          bid_pause_until: null,
          next_bid_amount: bidIncrement,
          last_bid_at: null,
          winner_email: null,
          winner_email_submitted_at: null,
          mc_commentary: `${currentArtwork.child_name} ${currentArtwork.child_surname} has been archived as unsold. The next artwork will begin shortly.`,
          mc_audio_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (stateError) throw new Error(stateError.message);
      await addActivity(supabaseAdmin, `Archived unsold artwork: ${currentArtwork.child_name} ${currentArtwork.child_surname}`);
      return NextResponse.json({ ok: true });
    }

    if (action === "reset") {
      await supabaseAdmin.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

      const { error: artworkError } = await supabaseAdmin
        .from("demo_artworks")
        .update({ status: "queued" })
        .eq("auction_code", AUCTION_CODE)
        .neq("status", "sold")
        .neq("status", "archived");

      if (artworkError) throw new Error(artworkError.message);

      const { error: stateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          child_name: "",
          child_surname: "",
          grade: "",
          artwork_url: "",
          current_bid: 0,
          leading_bidder: "No bids yet",
          status: "waiting",
          status_deadline: null,
          bid_pause_until: null,
          next_bid_amount: bidIncrement,
          last_bid_at: null,
          winner_email: null,
          winner_email_submitted_at: null,
          mc_commentary: "Welcome to BragWall. The auction is waiting to begin.",
          mc_audio_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (stateError) throw new Error(stateError.message);
      await addActivity(supabaseAdmin, "Auction reset to waiting");
      return NextResponse.json({ ok: true });
    }

    if (action === "clear-bids") {
      await supabaseAdmin.from("live_bids").delete().eq("auction_code", AUCTION_CODE);

      const { error } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          current_bid: 0,
          leading_bidder: "No bids yet",
          next_bid_amount: bidIncrement,
          last_bid_at: null,
          bid_pause_until: null,
          status_deadline: null,
          status: "open",
          winner_email: null,
          winner_email_submitted_at: null,
          mc_commentary: "Bids have been cleared. The auction is open again.",
          mc_audio_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", AUCTION_CODE);

      if (error) throw new Error(error.message);
      await addActivity(supabaseAdmin, "Bids cleared");
      return NextResponse.json({ ok: true });
    }

    return jsonError("Unknown admin action.");
  } catch (error) {
    console.error("Admin live action failed:", error);
    return jsonError(
      error instanceof Error ? error.message : "Admin live action failed.",
      500
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const SILENCE_BEFORE_GOING_ONCE_SECONDS = 5;
const GOING_ONCE_SECONDS = 3;
const GOING_TWICE_SECONDS = 3;
const NEXT_ARTWORK_COUNTDOWN_SECONDS = 20;
const BIDDING_START_BUFFER_SECONDS = 15;
const MIN_MC_INTRO_SECONDS = 28;
const MAX_MC_INTRO_SECONDS = 45;
const MC_WORDS_PER_SECOND = 2.25;
const MC_INTRO_PADDING_SECONDS = 4;

type AuctionState = {
  auction_code: string;
  artwork_id?: string | null;
  child_name?: string | null;
  child_surname?: string | null;
  grade?: string | null;
  artwork_url?: string | null;
  current_bid?: number | null;
  leading_bidder?: string | null;
  status?: string | null;
  status_deadline?: string | null;
  bid_pause_until?: string | null;
  last_bid_at?: string | null;
  next_bid_amount?: number | null;
  winner_email?: string | null;
  winner_email_submitted_at?: string | null;
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

function getSafeBidIncrement(value?: number | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BID_STEP;
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

  return "full of colour, imagination, and proper young-artist confidence.";
}

function estimateMcIntroSeconds(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimated = Math.ceil(wordCount / MC_WORDS_PER_SECOND) + MC_INTRO_PADDING_SECONDS;

  // Fallback only. The parent should advance when the real audio ends, not
  // before. Keep the generated script close to a 30-second MC intro, while
  // still allowing a small safety buffer for slower voice playback.
  return Math.min(MAX_MC_INTRO_SECONDS, Math.max(30, estimated, MIN_MC_INTRO_SECONDS));
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

async function fetchBidIncrement(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string
) {
  const { data } = await supabaseAdmin
    .from("demo_school_profile")
    .select("auction_code,bid_increment")
    .eq("auction_code", auctionCode)
    .maybeSingle<SchoolProfile>();

  return getSafeBidIncrement(data?.bid_increment);
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

function getCurrentArtwork(auction: AuctionState | null, artworks: Artwork[]) {
  if (!auction) return null;

  return (
    artworks.find((item) => auction.artwork_id && item.id === auction.artwork_id) ||
    artworks.find((item) => {
      const displayUrl = getArtworkDisplayUrl(item);
      return (
        item.child_name === auction.child_name &&
        item.child_surname === auction.child_surname &&
        (item.artwork_url === auction.artwork_url || displayUrl === auction.artwork_url)
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

  if (!currentArtwork) return sorted.find((item) => item.status !== "live") || sorted[0] || null;

  const currentIndex = sorted.findIndex((item) => item.id === currentArtwork.id);
  if (currentIndex >= 0) {
    return sorted.slice(currentIndex + 1).find((item) => item.id !== currentArtwork.id) || null;
  }

  return sorted.find((item) => item.id !== currentArtwork.id) || null;
}

async function generateMcVoiceAudio(
  request: Request,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string,
  artwork: Artwork,
  commentary: string
) {
  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/mc-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auctionCode,
        artworkId: artwork.id,
        text: commentary,
        childName: [artwork.child_name, artwork.child_surname].filter(Boolean).join(" ").trim(),
        grade: artwork.grade,
        forceRegenerate: true,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || "Could not generate MC voice.");
    return String(result.audioUrl || "");
  } catch (error) {
    console.error("Could not generate AI MC voice:", error);
    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: "AI MC voice failed to generate. Admin can still continue with fallback controls.",
    });
    return null;
  }
}

async function moveToArtwork(
  request: Request,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string,
  artwork: Artwork
) {
  const bidIncrement = await fetchBidIncrement(supabaseAdmin, auctionCode);
  const displayUrl = getArtworkDisplayUrl(artwork);
  const commentary = getMcIntroText(artwork);

  await supabaseAdmin.from("live_bids").delete().eq("auction_code", auctionCode);

  const { error: queueError } = await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "queued" })
    .eq("auction_code", auctionCode)
    .in("status", ["live", "preparing_intro", "intro", "starting_soon", "open", "paused", "going once", "going twice"]);

  if (queueError) throw new Error(queueError.message);

  await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "live", mc_audio_url: null })
    .eq("id", artwork.id);

  await supabaseAdmin
    .from("live_auction_state")
    .update({
      artwork_id: artwork.id,
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
      mc_commentary: "The AI MC is preparing this artwork intro. Bidding will open after the story.",
      mc_audio_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("auction_code", auctionCode);

  await addActivity(supabaseAdmin, auctionCode, `Preparing AI MC intro for ${artwork.child_name} ${artwork.child_surname}`);

  const mcAudioUrl = await generateMcVoiceAudio(request, supabaseAdmin, auctionCode, artwork, commentary);

  await supabaseAdmin
    .from("demo_artworks")
    .update({ status: "live", mc_audio_url: mcAudioUrl })
    .eq("id", artwork.id);

  const introSeconds = estimateMcIntroSeconds(commentary);
  const introDeadline = new Date(Date.now() + introSeconds * 1000).toISOString();

  const { data: updatedAuction, error: stateError } = await supabaseAdmin
    .from("live_auction_state")
    .update({
      artwork_id: artwork.id,
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
    .eq("auction_code", auctionCode)
    .select("*")
    .maybeSingle();

  if (stateError) throw new Error(stateError.message);

  await addActivity(
    supabaseAdmin,
    auctionCode,
    mcAudioUrl
      ? `AI MC voice generated for ${artwork.child_name} ${artwork.child_surname}`
      : `MC intro started for ${artwork.child_name} ${artwork.child_surname}`
  );

  return updatedAuction;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const auctionCode = normalizeAuctionCode(body?.auctionCode);
    const autoStartFromParent = Boolean(body?.autoStartFromParent);

    if (!isValidAuctionCode(auctionCode)) return jsonError("Invalid auction code.", 400);

    const supabaseAdmin = getSupabaseAdmin();
    const { data: auctionData, error: auctionError } = await supabaseAdmin
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .maybeSingle();

    if (auctionError) return jsonError(auctionError.message, 500);
    const auction = auctionData as AuctionState | null;
    if (!auction) return jsonError("Auction state not found.", 404);

    const status = String(auction.status || "").trim();
    const currentBid = toNumber(auction.current_bid);
    const leadingBidder = String(auction.leading_bidder || "").trim();
    const now = Date.now();

    if (autoStartFromParent) {
      // Parent entry should never land straight in open bidding when no bids have happened yet.
      // If the MC intro/countdown is already running, keep the current state.
      if (status === "preparing_intro" || status === "intro" || status === "starting_soon") {
        return NextResponse.json({ action: "parent_joined_existing_intro_flow", auction });
      }

      const noBidsYet =
        currentBid <= 0 &&
        (!leadingBidder || leadingBidder.toLowerCase() === "no bids yet");

      const canAutoStartIntro =
        status === "waiting" ||
        (status === "open" && noBidsYet);

      if (canAutoStartIntro) {
        const artworks = await fetchArtworks(supabaseAdmin, auctionCode);
        const currentArtwork = getCurrentArtwork(auction, artworks);
        const nextArtwork = currentArtwork || getNextArtwork(null, artworks);

        if (nextArtwork) {
          const updatedAuction = await moveToArtwork(request, supabaseAdmin, auctionCode, nextArtwork);
          return NextResponse.json({
            action: "parent_auto_intro_started",
            auction: updatedAuction || auction,
          });
        }
      }
    }

    if (status === "starting_soon") {
      const deadline = auction.status_deadline ? new Date(auction.status_deadline).getTime() : 0;
      if (!deadline || now < deadline) return NextResponse.json({ action: "none", auction });

      const bidIncrement = await fetchBidIncrement(supabaseAdmin, auctionCode);
      const openingBid = Math.max(Number(auction.next_bid_amount || 0), currentBid + bidIncrement, bidIncrement);
      const commentary = `Bidding is now open. Opening bid is R${openingBid.toLocaleString()}.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "open",
          status_deadline: null,
          bid_pause_until: null,
          next_bid_amount: openingBid,
          mc_commentary: commentary,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", auctionCode)
        .eq("status", "starting_soon")
        .select("*")
        .maybeSingle();

      if (updateError) return jsonError(updateError.message, 500);
      if (!updatedAuction) return NextResponse.json({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, "Bidding opened after the 15 second countdown");
      return NextResponse.json({ action: "open", auction: updatedAuction });
    }

    if (status === "sold") {
      if (!auction.winner_email && !auction.winner_email_submitted_at) {
        return NextResponse.json({ action: "waiting_for_winner_email", auction });
      }

      const deadline = auction.status_deadline ? new Date(auction.status_deadline).getTime() : 0;
      if (!deadline || now < deadline) return NextResponse.json({ action: "next_countdown", auction });

      const artworks = await fetchArtworks(supabaseAdmin, auctionCode);
      const currentArtwork = getCurrentArtwork(auction, artworks);
      const nextArtwork = getNextArtwork(currentArtwork, artworks);

      if (!nextArtwork) {
        const { data: updatedAuction, error } = await supabaseAdmin
          .from("live_auction_state")
          .update({
            status: "complete",
            status_deadline: null,
            bid_pause_until: null,
            mc_audio_url: null,
            mc_commentary: "Auction complete. Thank you for supporting the young artists and the school fundraiser.",
            updated_at: new Date().toISOString(),
          })
          .eq("auction_code", auctionCode)
          .select("*")
          .maybeSingle();

        if (error) return jsonError(error.message, 500);
        await addActivity(supabaseAdmin, auctionCode, "Auction complete");
        return NextResponse.json({ action: "complete", auction: updatedAuction || auction });
      }

      const updatedAuction = await moveToArtwork(request, supabaseAdmin, auctionCode, nextArtwork);
      return NextResponse.json({ action: "next_artwork", auction: updatedAuction || auction });
    }

    if (currentBid <= 0) return NextResponse.json({ action: "none", auction });
    if (status === "waiting" || status === "intro" || status === "preparing_intro" || status === "complete") {
      return NextResponse.json({ action: "none", auction });
    }

    if (status === "open") {
      const pauseUntil = auction.bid_pause_until ? new Date(auction.bid_pause_until).getTime() : 0;
      if (pauseUntil > now) return NextResponse.json({ action: "none", auction });

      const lastBidTime = auction.last_bid_at ? new Date(auction.last_bid_at).getTime() : 0;
      if (!lastBidTime) return NextResponse.json({ action: "none", auction });

      const silenceStartsAt = Math.max(lastBidTime, pauseUntil);
      const silenceSeconds = Math.floor((now - silenceStartsAt) / 1000);
      if (silenceSeconds < SILENCE_BEFORE_GOING_ONCE_SECONDS) return NextResponse.json({ action: "none", auction });

      const deadline = new Date(Date.now() + GOING_ONCE_SECONDS * 1000).toISOString();
      const commentary = `Going once at R${currentBid.toLocaleString()} for ${leadingBidder}. Last chance to beat this bid.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({ status: "going once", status_deadline: deadline, bid_pause_until: null, mc_commentary: commentary })
        .eq("auction_code", auctionCode)
        .eq("status", "open")
        .eq("current_bid", currentBid)
        .eq("last_bid_at", auction.last_bid_at || "")
        .select("*")
        .maybeSingle();

      if (updateError) return jsonError(updateError.message, 500);
      if (!updatedAuction) return NextResponse.json({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, `Going once at R${currentBid.toLocaleString()}`);
      return NextResponse.json({ action: "going_once", auction: updatedAuction });
    }

    if (status === "going once") {
      if (!auction.status_deadline) return NextResponse.json({ action: "none", auction });
      if (now < new Date(auction.status_deadline).getTime()) return NextResponse.json({ action: "none", auction });

      const newDeadline = new Date(Date.now() + GOING_TWICE_SECONDS * 1000).toISOString();
      const commentary = `Going twice at R${currentBid.toLocaleString()}. ${leadingBidder} is seconds away from serious bragging rights.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({ status: "going twice", status_deadline: newDeadline, bid_pause_until: null, mc_commentary: commentary })
        .eq("auction_code", auctionCode)
        .eq("status", "going once")
        .eq("current_bid", currentBid)
        .eq("status_deadline", auction.status_deadline)
        .select("*")
        .maybeSingle();

      if (updateError) return jsonError(updateError.message, 500);
      if (!updatedAuction) return NextResponse.json({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, `Going twice at R${currentBid.toLocaleString()}`);
      return NextResponse.json({ action: "going_twice", auction: updatedAuction });
    }

    if (status === "going twice") {
      if (!auction.status_deadline) return NextResponse.json({ action: "none", auction });
      if (now < new Date(auction.status_deadline).getTime()) return NextResponse.json({ action: "none", auction });

      const commentary = `Sold to ${leadingBidder} for R${currentBid.toLocaleString()}. A masterpiece has found its forever wall.`;

      const { data: updatedAuction, error: updateError } = await supabaseAdmin
        .from("live_auction_state")
        .update({
          status: "sold",
          status_deadline: null,
          bid_pause_until: null,
          mc_commentary: commentary,
          updated_at: new Date().toISOString(),
        })
        .eq("auction_code", auctionCode)
        .eq("status", "going twice")
        .eq("current_bid", currentBid)
        .eq("status_deadline", auction.status_deadline)
        .select("*")
        .maybeSingle();

      if (updateError) return jsonError(updateError.message, 500);
      if (!updatedAuction) return NextResponse.json({ action: "none", auction });

      await supabaseAdmin
        .from("demo_artworks")
        .update({ status: "sold", sold_amount: currentBid, winning_bidder: leadingBidder })
        .eq("auction_code", auctionCode)
        .eq("status", "live");

      await addActivity(supabaseAdmin, auctionCode, `SOLD to ${leadingBidder} for R${currentBid.toLocaleString()}`);
      return NextResponse.json({ action: "sold", auction: updatedAuction });
    }

    return NextResponse.json({ action: "none", auction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run auction rhythm.";
    return jsonError(message, 500);
  }
}




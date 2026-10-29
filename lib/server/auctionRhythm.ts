import { resolveMcIntroAudio } from "@/lib/resolveMcIntroAudio";
import { getVerifiedMcIntroDuration } from "@/lib/server/verifiedMcIntroDuration";
import { createMcAudioEventKey } from "@/lib/mcAudioJobs";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// BRAGWALL_OPTIONAL_SERVER_INTRO_TIMING_V1

const SERVER_MC_TIMING_ENABLED =
  process.env.BRAGWALL_SERVER_MC_TIMING_ENABLED === "true";

const INTRO_COMPLETION_RPC = SERVER_MC_TIMING_ENABLED
  ? "complete_auction_artwork_intro_with_timing"
  : "complete_auction_artwork_intro";

async function getOptionalIntroTimingArguments({
  supabase,
  auctionCode,
  artworkId,
  audioUrl,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  auctionCode: string;
  artworkId: string;
  audioUrl: string;
}): Promise<{ p_duration_seconds: number } | Record<string, never>> {
  if (!SERVER_MC_TIMING_ENABLED) {
    return {};
  }

  const stagingUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  if (
    !stagingUrl.includes("nxgtyzsqqpivstpcyskm") ||
    process.env.BRAGWALL_MOCK_ELEVENLABS !== "true"
  ) {
    throw new Error(
      "Server MC timing is restricted to Staging mock mode."
    );
  }

  const durationSeconds = await getVerifiedMcIntroDuration({
    supabase,
    auctionCode,
    artworkId,
    audioUrl,
  });

  return { p_duration_seconds: durationSeconds };
}

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;
const SILENCE_BEFORE_GOING_ONCE_SECONDS = 5;
const GOING_ONCE_SECONDS = 3;
const GOING_TWICE_SECONDS = 3;
const NEXT_ARTWORK_COUNTDOWN_SECONDS = 15;
const BIDDING_START_BUFFER_SECONDS = 15;
const MIN_MC_INTRO_SECONDS = 28;
const MAX_MC_INTRO_SECONDS = 45;
const MC_WORDS_PER_SECOND = 2.25;
const MC_INTRO_PADDING_SECONDS = 4;
const NO_BID_UNSOLD_SECONDS = 15;
const SOLD_EMAIL_CAPTURE_SECONDS = 15;

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
  updated_at?: string | null;
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
  invoice_email_requested_at?: string | null;
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

function normalizeMcIntroOpening(text: string, sortOrder?: number | null) {
  const order = Number(sortOrder || 0);
  const isLaterArtwork = Number.isFinite(order) && order > 1;
  let firstUpSeen = false;

  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bfirst\s+up(?:\s+tonight)?\b/gi, (match) => {
      if (!isLaterArtwork && !firstUpSeen) {
        firstUpSeen = true;
        return match;
      }

      return "Next on the easel";
    })
    .replace(/\bfirst\s+artwork\b/gi, isLaterArtwork ? "next artwork" : "artwork")
    .replace(/\bfirst\s+piece\b/gi, isLaterArtwork ? "next piece" : "piece")
    .replace(/\b(next on the easel)([,.!:\-]?\s+)(?:next on the easel\b[,.!:\-]?\s*)+/gi, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateAiMcIntroText(
  request: Request,
  artwork: Artwork,
  artworkDisplayUrl: string
) {
  const fallbackPreview = getMcIntroText(artwork);

  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/auction-mc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bragwall-mc-token":
          process.env.BRAGWALL_MC_INTERNAL_TOKEN || "",
      },
      body: JSON.stringify({
        mode: "intro",
        childName: artwork.child_name,
        childSurname: artwork.child_surname,
        grade: artwork.grade,
        sortOrder: artwork.sort_order,
        fallbackPreview,
        artworkUrl: artworkDisplayUrl,
      }),
    });

    const result = await response.json().catch(() => null);
    const text = String(result?.text || "").replace(/\s+/g, " ").trim();

    if (response.ok && text) {
      return normalizeMcIntroOpening(text, artwork.sort_order);
    }
  } catch (error) {
    console.warn("AI MC intro generation failed; using artwork story fallback.", error);
  }

  return normalizeMcIntroOpening(fallbackPreview, artwork.sort_order);
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

function isCompletedSalesArtwork(artwork: Artwork | null | undefined) {
  if (!artwork) return false;

  const status = String(artwork.status || "").trim();

  return (
    status === "sold" ||
    status === "after_auction_request" ||
    Boolean(artwork.invoice_email_requested_at) ||
    Boolean(artwork.sold_amount) ||
    Boolean(artwork.winner_email)
  );
}

function findArtworkForAuctionState(auction: AuctionState, artworks: Artwork[]) {
  const artworkId = String((auction as unknown as { artwork_id?: string | null }).artwork_id || "").trim();

  if (artworkId) {
    const byId = artworks.find((item) => item.id === artworkId);
    if (byId) return byId;
  }

  return (
    artworks.find((item) => {
      return (
        item.child_name === auction.child_name &&
        item.child_surname === auction.child_surname &&
        item.grade === auction.grade
      );
    }) || null
  );
}

function getNextArtwork(currentArtwork: Artwork | null, artworks: Artwork[]) {
  const activeQueue = artworks.filter((item) => !item.invoice_email_requested_at && item.status !== "sold" && item.status !== "archived" && item.status !== "after_auction_request");
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
    return await resolveMcIntroAudio({
      origin: new URL(request.url).origin,
      auctionCode,
      artworkId: artwork.id,
      text: commentary,
      childName: [artwork.child_name, artwork.child_surname]
        .filter(Boolean)
        .join(" ")
        .trim(),
      grade: artwork.grade,
    });
  } catch (error) {
    console.error("Could not resolve automatic AI MC audio:", error);

    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message:
        "AI MC recording unavailable. Automatic introduction recovery requires attention.",
    });

    return null;
  }
}
async function moveToArtwork(
  request: Request,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  auctionCode: string,
  artwork: Artwork,
  expectedStatus: string,
  expectedArtworkId: string | null,
  controllerToken: string
) {
  // BRAGWALL_PROTECTED_ARTWORK_INTRO_V1
  // Atomic preparation followed by protected AI MC completion.

  const bidIncrement = await fetchBidIncrement(
    supabaseAdmin,
    auctionCode
  );

  const displayUrl = getArtworkDisplayUrl(artwork);

  // Prepare artwork atomically.
  const {
    data: transitionToken,
    error: preparationError,
  } = await supabaseAdmin.rpc(
    "prepare_auction_artwork_atomic",
    {
      p_auction_code: auctionCode,
      p_claim_token: controllerToken,
      p_expected_status: expectedStatus,
      p_expected_artwork_id: expectedArtworkId,
      p_next_artwork_id: artwork.id,
      p_bid_increment: bidIncrement,
      p_artwork_url: displayUrl,
    }
  );

  if (preparationError) {
    console.error(
      "Atomic artwork preparation failed:",
      preparationError
    );

    throw new Error(
      "Unable to prepare the next artwork safely."
    );
  }

  if (!transitionToken) {
    // Database rejected a duplicate or outdated transition.
    return null;
  }

  await addActivity(
    supabaseAdmin,
    auctionCode,
    `Preparing AI MC intro for ${artwork.child_name} ${artwork.child_surname}`
  );

  try {
    // Generate the AI MC introduction.
    const commentary = await generateAiMcIntroText(
      request,
      artwork,
      displayUrl
    );

    // BRAGWALL_SAVED_MC_COMMENTARY_V1
    // Save the exact introduction before requesting ElevenLabs.
    // This preserves the script identity for recovery.

    const {
      data: commentarySaved,
      error: commentarySaveError,
    } = await supabaseAdmin.rpc(
      "save_auction_intro_commentary",
      {
        p_auction_code: auctionCode,
        p_controller_token: controllerToken,
        p_artwork_id: artwork.id,
        p_transition_token: transitionToken,
        p_commentary: commentary,
      }
    );

    if (commentarySaveError) {
      throw new Error(
        `Could not save AI MC commentary: ${commentarySaveError.message}`
      );
    }

    if (commentarySaved !== true) {
      throw new Error(
        "AI MC commentary was rejected by transition ownership protection."
      );
    }

    // Generate the ElevenLabs recording.
    const mcAudioUrl = await generateMcVoiceAudio(
      request,
      supabaseAdmin,
      auctionCode,
      artwork,
      commentary
    );

    if (!mcAudioUrl) {
      throw new Error(
        "AI MC introduction audio is unavailable."
      );
    }

    // Only the correct controller may complete the intro.
    const {
      data: introCompleted,
      error: completionError,
    } = await supabaseAdmin.rpc(
      INTRO_COMPLETION_RPC,
      {
        p_auction_code: auctionCode,
        p_claim_token: controllerToken,
        p_transition_token: transitionToken,
        p_artwork_id: artwork.id,
        p_mc_commentary: commentary,
        p_mc_audio_url: mcAudioUrl,
        ...(await getOptionalIntroTimingArguments({
          supabase: supabaseAdmin,
          auctionCode,
          artworkId: artwork.id,
          audioUrl: mcAudioUrl,
        })),
      }
    );

    if (completionError) {
      console.error(
        "Protected AI MC completion failed:",
        completionError
      );

      throw new Error(
        "Unable to complete the AI MC introduction safely."
      );
    }

    if (introCompleted !== true) {
      console.warn(
        "AI MC introduction completion rejected:",
        {
          auctionCode,
          artworkId: artwork.id,
        }
      );

      return null;
    }

    // Save audio against the correct artwork.
    const { error: artworkAudioError } = await supabaseAdmin
      .from("demo_artworks")
      .update({
        mc_audio_url: mcAudioUrl,
      })
      .eq("auction_code", auctionCode)
      .eq("id", artwork.id)
      .eq("status", "live");

    if (artworkAudioError) {
      console.error(
        "Could not update artwork audio:",
        artworkAudioError
      );
    }

    // Keep the existing natural audio playback behaviour.
    // The 15-second countdown begins after the audio ends.
    const {
      data: updatedAuction,
      error: stateError,
    } = await supabaseAdmin
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .eq("artwork_id", artwork.id)
      .eq("transition_token", transitionToken)
      .eq("status", "intro")
      .maybeSingle();

    if (stateError) {
      throw new Error(stateError.message);
    }

    if (!updatedAuction) {
      return null;
    }

    await addActivity(
      supabaseAdmin,
      auctionCode,
      `AI MC voice generated for ${artwork.child_name} ${artwork.child_surname}`
    );

    return updatedAuction;

  } catch (error) {
    // Never force bidding open following an audio failure.
    // Controlled recovery still needs to be implemented.
    console.error(
      "Protected artwork introduction failed:",
      {
        auctionCode,
        artworkId: artwork.id,
        error,
      }
    );

    throw error;
  }
}

// BRAGWALL_RHYTHM_PUBLIC_RESPONSE_V1
    // Return only public auction information from the rhythm endpoint.
    // Do not expose winner emails, contact IDs or other database fields.
    function publicRhythmResponse(payload: {
      action: string;
      auction?: AuctionState | null;
      secondsRemaining?: number;
    }) {
      const auction = payload.auction;

      const publicAuction = auction
        ? {
            auction_code: auction.auction_code,
            artwork_id: auction.artwork_id ?? null,
            child_name: auction.child_name ?? "",
            child_surname: auction.child_surname ?? "",
            grade: auction.grade ?? "",
            artwork_url: auction.artwork_url ?? "",
            current_bid: auction.current_bid ?? 0,
            leading_bidder: auction.leading_bidder ?? "",
            status: auction.status ?? "waiting",
            status_deadline: auction.status_deadline ?? null,
            bid_pause_until: auction.bid_pause_until ?? null,
            last_bid_at: auction.last_bid_at ?? null,
            next_bid_amount: auction.next_bid_amount ?? null,
            mc_commentary:
              (auction as AuctionState & { mc_commentary?: string | null })
                .mc_commentary ?? null,
            mc_audio_url:
              (auction as AuctionState & { mc_audio_url?: string | null })
                .mc_audio_url ?? null,
            winner_email: null,
            winner_email_submitted_at: null,
            winner_email_submitted: Boolean(
              auction.winner_email ||
                auction.winner_email_submitted_at ||
                (
                  auction as AuctionState & {
                    winner_email_submitted?: boolean | null;
                  }
                ).winner_email_submitted
            ),
            updated_at: auction.updated_at ?? null,
          }
        : undefined;

      return NextResponse.json({
        action: payload.action,
        ...(publicAuction !== undefined ? { auction: publicAuction } : {}),
        ...(payload.secondsRemaining !== undefined
          ? { secondsRemaining: payload.secondsRemaining }
          : {}),
      });
    }
/**
 * BRAGWALL_COMPLETED_INTRO_RECOVERY_V1
 *
 * Reproduce the MC voice endpoint's script normalization.
 * This is used only to identify an EXISTING completed recording.
 * It never requests new audio.
 */
function buildRecoveryMcScript(sourceText: string): string {
  const normalized = String(sourceText || "")
    .replace(/\s+/g, " ")
    .trim();

  const sentence = /[.!?]$/.test(normalized)
    ? normalized
    : `${normalized}.`;

  const parts = sentence.split(/(\s+)/);

  const deduplicated = parts
    .filter((part, index, allParts) => {
      if (/\s+/.test(part)) return true;

      const previousWord = [...allParts]
        .slice(0, index)
        .reverse()
        .find((item) => !/\s+/.test(item));

      if (!previousWord) return true;

      return (
        previousWord.toLowerCase().replace(/[^a-z0-9]/g, "") !==
        part.toLowerCase().replace(/[^a-z0-9]/g, "")
      );
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  const words = deduplicated.split(" ").filter(Boolean);

  if (words.length <= 110) {
    return deduplicated;
  }

  const shortened = words.slice(0, 110).join(" ");

  return /[.!?]$/.test(shortened)
    ? shortened
    : `${shortened}.`;
}
export async function runAuctionRhythm(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const auctionCode = normalizeAuctionCode(body?.auctionCode);
    const autoStartFromParent = Boolean(body?.autoStartFromParent);

    if (!isValidAuctionCode(auctionCode)) return jsonError("Invalid auction code.", 400);

    // BRAGWALL_TIMING_TEST_SCHOOL_GUARD_V1
    //
    // When server-controlled timing is enabled, only the
    // explicitly configured Staging test school may be processed.
    //
    // With timing disabled, existing behaviour is unchanged.

    if (SERVER_MC_TIMING_ENABLED) {
      const stagingUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "";

      // BRAGWALL_THREE_SCHOOL_ALLOWLIST_V1
      // A configured multi-school list takes precedence.
      // Otherwise retain the existing single-school restriction.
      const configuredAuctionCodes = String(
        process.env.BRAGWALL_SCHEDULER_ALLOWED_AUCTION_CODES ||
        process.env.BRAGWALL_SCHEDULER_ALLOWED_AUCTION_CODE ||
        ""
      );

      const allowedAuctionCodes = [
        ...new Set(
          configuredAuctionCodes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        ),
      ];

      if (allowedAuctionCodes.length > 3) {
        return jsonError(
          "Maximum three Staging test schools allowed.",
          403
        );
      }

      if (
        !stagingUrl.includes("nxgtyzsqqpivstpcyskm") ||
        process.env.BRAGWALL_MOCK_ELEVENLABS !== "true" ||
        allowedAuctionCodes.length === 0 ||
        !allowedAuctionCodes.includes(auctionCode)
      ) {
        return jsonError(
          "Server-controlled timing is restricted to the isolated Staging test auction.",
          403
        );
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // BRAGWALL_CONTROLLER_LOCK_V1
    // Only one request may control an auction at a time.
    // Lock claims and releases are performed using the service role.
    const { data: controllerToken, error: controllerClaimError } =
      await supabaseAdmin.rpc("claim_auction_controller", {
        p_auction_code: auctionCode,
      });

    if (controllerClaimError) {
      console.error("Auction controller claim failed:", controllerClaimError);
      return jsonError("Auction controller temporarily unavailable.", 503);
    }

    if (!controllerToken) {
      return publicRhythmResponse({
        action: "controller_busy",
      });
    }

    // BRAGWALL_CONTROLLER_HEARTBEAT_V1
    // Keep the lease alive during longer auction operations.
    // This is not a replacement for database-level fencing.
    let controllerLeaseLost = false;
    let controllerRenewalRunning = false;
    let controllerFinished = false;

    const controllerHeartbeat = setInterval(() => {
      if (controllerFinished || controllerRenewalRunning) return;

      controllerRenewalRunning = true;

      void (async () => {
        try {
          const { data: renewed, error: renewalError } =
            await supabaseAdmin.rpc("renew_auction_controller", {
              p_auction_code: auctionCode,
              p_claim_token: controllerToken,
            });

          if (renewalError || renewed !== true) {
            controllerLeaseLost = true;
            console.error("Auction controller lease renewal failed:", {
              auctionCode,
              error: renewalError,
              renewed,
            });
          }
        } catch (renewalError) {
          controllerLeaseLost = true;
          console.error("Auction controller heartbeat error:", renewalError);
        } finally {
          controllerRenewalRunning = false;
        }
      })();
    }, 30000);

    // BRAGWALL_CONTROLLER_OWNERSHIP_V1
    // Confirm ownership before starting critical transitions.
    // Full atomic database fencing is still required.
    async function assertControllerOwnership() {
      if (controllerLeaseLost || controllerFinished) {
        throw new Error("Auction controller no longer owns its lease.");
      }

      const { data: renewed, error: renewalError } =
        await supabaseAdmin.rpc("renew_auction_controller", {
          p_auction_code: auctionCode,
          p_claim_token: controllerToken,
        });

      if (renewalError || renewed !== true) {
        controllerLeaseLost = true;

        console.error("Auction controller ownership check failed:", {
          auctionCode,
          error: renewalError,
          renewed,
        });

        throw new Error("Auction controller ownership verification failed.");
      }
    }

    try {
    const { data: auctionData, error: auctionError } = await supabaseAdmin
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", auctionCode)
      .maybeSingle();

    if (auctionError) return jsonError(auctionError.message, 500);
    const auction = auctionData as AuctionState | null;
    if (!auction) return jsonError("Auction state not found.", 404);

    const status = String(auction.status || "").trim();

    // BRAGWALL_COMPLETED_INTRO_RECOVERY_V1
    // Reuse an existing recording after an interrupted introduction.
    // Never generate audio in this recovery path.
    if (status === "preparing_intro") {
      const recoveryState = auction as AuctionState & {
        transition_token?: string | null;
        transition_controller_token?: string | null;
        mc_commentary?: string | null;
      };

      const artworkId = recoveryState.artwork_id;
      const transitionToken = recoveryState.transition_token;
      const savedCommentary = String(
        recoveryState.mc_commentary || ""
      ).trim();

      const preparationPlaceholder =
        "The AI MC is preparing this artwork intro. Bidding will open after the story.";

      if (
        artworkId &&
        transitionToken &&
        savedCommentary &&
        savedCommentary !== preparationPlaceholder &&
        recoveryState.transition_controller_token !== controllerToken
      ) {
        const normalizedScript = buildRecoveryMcScript(
          savedCommentary
        );

        const voiceId =
          String(process.env.ELEVENLABS_MC_VOICE_ID || "").trim() ||
          "0S5oIfi8zOZixuSj8K6n";

        const eventKey = createMcAudioEventKey({
          auctionCode,
          artworkId,
          audioType: "intro",
          voiceId,
          script: normalizedScript,
        });

        // Query ONLY the exact previously completed audio job.
        const { data: completedJob, error: jobError } =
          await supabaseAdmin
            .from("mc_audio_jobs")
            .select("id,status,audio_url,event_key")
            .eq("auction_code", auctionCode)
            .eq("artwork_id", artworkId)
            .eq("audio_type", "intro")
            .eq("event_key", eventKey)
            .eq("status", "completed")
            .maybeSingle();

        if (jobError) {
          console.error(
            "Completed MC recording lookup failed:",
            jobError
          );
        }

        if (completedJob?.audio_url) {
          // The database function enforces the 120-second
          // interruption window and rejects processing audio jobs.
          await assertControllerOwnership();

          const { data: transferred, error: transferError } =
            await supabaseAdmin.rpc(
              "transfer_auction_intro_controller",
              {
                p_auction_code: auctionCode,
                p_new_controller_token: controllerToken,
                p_artwork_id: artworkId,
                p_transition_token: transitionToken,
              }
            );

          if (transferError) {
            console.error(
              "Completed intro ownership transfer failed:",
              transferError
            );
          }

          if (transferred === true) {
            // Publish the already-completed recording.
            // No ElevenLabs generation request occurs here.
            const { data: completed, error: completionError } =
              await supabaseAdmin.rpc(
                INTRO_COMPLETION_RPC,
                {
                  p_auction_code: auctionCode,
                  p_claim_token: controllerToken,
                  p_transition_token: transitionToken,
                  p_artwork_id: artworkId,
                  p_mc_commentary: savedCommentary,
                  p_mc_audio_url: completedJob.audio_url,
                  ...(await getOptionalIntroTimingArguments({
                    supabase: supabaseAdmin,
                    auctionCode,
                    artworkId: artworkId,
                    audioUrl: completedJob.audio_url,
                  })),
                }
              );

            if (completionError) {
              console.error(
                "Recovered intro completion failed:",
                completionError
              );
            }

            if (completed === true) {
              const { error: artworkAudioError } =
                await supabaseAdmin
                  .from("demo_artworks")
                  .update({
                    mc_audio_url: completedJob.audio_url,
                  })
                  .eq("auction_code", auctionCode)
                  .eq("id", artworkId)
                  .eq("status", "live");

              if (artworkAudioError) {
                console.error(
                  "Recovered artwork audio update failed:",
                  artworkAudioError
                );
              }

              const { data: recoveredAuction, error: stateError } =
                await supabaseAdmin
                  .from("live_auction_state")
                  .select("*")
                  .eq("auction_code", auctionCode)
                  .eq("artwork_id", artworkId)
                  .eq("transition_token", transitionToken)
                  .eq("status", "intro")
                  .maybeSingle();

              if (stateError) {
                console.error(
                  "Recovered intro state lookup failed:",
                  stateError
                );
              }

              if (recoveredAuction) {
                await addActivity(
                  supabaseAdmin,
                  auctionCode,
                  "AI MC introduction recovered using existing recording."
                );

                return publicRhythmResponse({
                  action: "recovered_existing_mc_intro",
                  auction: recoveredAuction,
                });
              }
            }
          }
        }
      }

      // BRAGWALL_FAILED_INTRO_CONTROLLER_RECOVERY_V1
      // Only confirmed FAILED audio jobs are eligible.
      // Never reclaim an uncertain processing job.
      // The database enforces the ownership window,
      // retry cooldown and maximum generation attempts.
      if (
        artworkId &&
        transitionToken &&
        savedCommentary &&
        savedCommentary !== preparationPlaceholder &&
        recoveryState.transition_controller_token !== controllerToken
      ) {
        const recoveryScript = buildRecoveryMcScript(savedCommentary);

        const recoveryVoiceId =
          String(process.env.ELEVENLABS_MC_VOICE_ID || "").trim() ||
          "0S5oIfi8zOZixuSj8K6n";

        const recoveryEventKey = createMcAudioEventKey({
          auctionCode,
          artworkId,
          audioType: "intro",
          voiceId: recoveryVoiceId,
          script: recoveryScript,
        });

        const { data: failedJob, error: failedJobError } =
          await supabaseAdmin
            .from("mc_audio_jobs")
            .select("id,status,attempt_count,event_key")
            .eq("auction_code", auctionCode)
            .eq("artwork_id", artworkId)
            .eq("audio_type", "intro")
            .eq("event_key", recoveryEventKey)
            .eq("status", "failed")
            .maybeSingle();

        if (failedJobError) {
          console.error("Failed MC recording lookup failed:", failedJobError);
        }

        if (
          !failedJobError &&
          failedJob &&
          Number(failedJob.attempt_count || 0) < 3
        ) {
          await assertControllerOwnership();

          const { data: failedTransfer, error: failedTransferError } =
            await supabaseAdmin.rpc(
              "transfer_auction_intro_controller",
              {
                p_auction_code: auctionCode,
                p_new_controller_token: controllerToken,
                p_artwork_id: artworkId,
                p_transition_token: transitionToken,
              }
            );

          if (failedTransferError) {
            console.error(
              "Failed intro ownership transfer error:",
              failedTransferError
            );
          }

          if (failedTransfer === true && !failedTransferError) {
            try {
              const { data: recoveryArtwork, error: artworkError } =
                await supabaseAdmin
                  .from("demo_artworks")
                  .select("*")
                  .eq("auction_code", auctionCode)
                  .eq("id", artworkId)
                  .eq("status", "live")
                  .maybeSingle();

              if (artworkError || !recoveryArtwork) {
                throw new Error(
                  `Recovery artwork unavailable: ${
                    artworkError?.message || "Not found"
                  }`
                );
              }

              // Preserve the exact saved commentary and audio identity.
              // The resolver sends the current controller token to the
              // protected MC endpoint and prohibits fallback audio.
              const recoveredAudioUrl = await resolveMcIntroAudio({
                origin: new URL(request.url).origin,
                auctionCode,
                artworkId,
                text: savedCommentary,
                childName: [
                  recoveryArtwork.child_name,
                  recoveryArtwork.child_surname,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim(),
                grade: String(recoveryArtwork.grade || ""),
                recoveryControllerToken: controllerToken,
              });

              // Never publish merely because a URL was returned.
              // The original protected audio job must be completed.
              const { data: verifiedJob, error: verificationError } =
                await supabaseAdmin
                  .from("mc_audio_jobs")
                  .select("id,status,audio_url,event_key")
                  .eq("id", failedJob.id)
                  .eq("auction_code", auctionCode)
                  .eq("artwork_id", artworkId)
                  .eq("event_key", recoveryEventKey)
                  .eq("status", "completed")
                  .maybeSingle();

              if (
                verificationError ||
                !verifiedJob ||
                !verifiedJob.audio_url ||
                verifiedJob.audio_url !== recoveredAudioUrl
              ) {
                throw new Error(
                  "Recovered audio job was not verified as completed."
                );
              }

              await assertControllerOwnership();

              const { data: introCompleted, error: introError } =
                await supabaseAdmin.rpc(
                  INTRO_COMPLETION_RPC,
                  {
                    p_auction_code: auctionCode,
                    p_claim_token: controllerToken,
                    p_transition_token: transitionToken,
                    p_artwork_id: artworkId,
                    p_mc_commentary: savedCommentary,
                    p_mc_audio_url: verifiedJob.audio_url,
                    ...(await getOptionalIntroTimingArguments({
                      supabase: supabaseAdmin,
                      auctionCode,
                      artworkId: artworkId,
                      audioUrl: verifiedJob.audio_url,
                    })),
                  }
                );

              if (introError || introCompleted !== true) {
                throw new Error(
                  `Recovered introduction was not published: ${
                    introError?.message || "Transition rejected"
                  }`
                );
              }

              const { error: artworkUpdateError } =
                await supabaseAdmin
                  .from("demo_artworks")
                  .update({
                    mc_audio_url: verifiedJob.audio_url,
                  })
                  .eq("auction_code", auctionCode)
                  .eq("id", artworkId)
                  .eq("status", "live");

              if (artworkUpdateError) {
                console.error(
                  "Recovered artwork audio update failed:",
                  artworkUpdateError
                );
              }

              const { data: recoveredState, error: recoveredStateError } =
                await supabaseAdmin
                  .from("live_auction_state")
                  .select("*")
                  .eq("auction_code", auctionCode)
                  .eq("artwork_id", artworkId)
                  .eq("transition_token", transitionToken)
                  .eq("status", "intro")
                  .maybeSingle();

              if (recoveredStateError || !recoveredState) {
                throw new Error(
                  "Recovered introduction state could not be verified."
                );
              }

              await addActivity(
                supabaseAdmin,
                auctionCode,
                "AI MC introduction recovered after an authorised audio retry."
              );

              return publicRhythmResponse({
                action: "recovered_failed_mc_intro",
                auction: recoveredState,
              });
            } catch (recoveryError) {
              console.error(
                "Protected failed introduction recovery unsuccessful:",
                recoveryError
              );

              // Keep bidding closed. A later controller may recover
              // a completed recording, but processing jobs are never
              // automatically reclaimed.
            }
          }
        }
      }

      // Do not force bidding open while recovery is unavailable.
      return publicRhythmResponse({
        action: "none",
        auction,
      });
    }

    if (status === "complete") {
      return publicRhythmResponse({ action: "complete", auction });
    }

    if (status !== "sold") {
      const stateArtworks = await fetchArtworks(supabaseAdmin, auctionCode);
      const currentStateArtwork = findArtworkForAuctionState(auction, stateArtworks);

      if (isCompletedSalesArtwork(currentStateArtwork)) {
        const bidIncrement = await fetchBidIncrement(supabaseAdmin, auctionCode);
        const nextArtwork = getNextArtwork(currentStateArtwork, stateArtworks);

        if (!nextArtwork) {
          const { data: completedAuction, error: completeError } = await supabaseAdmin
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

          if (completeError) return jsonError(completeError.message, 500);

          await addActivity(supabaseAdmin, auctionCode, "Auction complete");

          return publicRhythmResponse({
            action: "completed_after_final_artwork",
            auction: completedAuction || auction,
          });
        }

        const { data: clearedAuction, error: clearError } = await supabaseAdmin
          .from("live_auction_state")
          .update({
            child_name: "",
            child_surname: "",
            grade: "",
            artwork_url: "",
            artwork_id: null,
            current_bid: 0,
            leading_bidder: "No bids yet",
            leading_bidder_contact_id: null,
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
          .eq("auction_code", auctionCode)
          .select("*")
          .maybeSingle();

        if (clearError) return jsonError(clearError.message, 500);

        return publicRhythmResponse({
          action: "cleared_completed_current_artwork",
          auction: clearedAuction || auction,
        });
      }
    }
    const currentBid = toNumber(auction.current_bid);
    const leadingBidder = String(auction.leading_bidder || "").trim();
    const now = Date.now();

    if (autoStartFromParent) {
      // Parent entry should never land straight in open bidding when no bids have happened yet.
      // If the MC intro/countdown is already running, keep the current state.
      if (status === "preparing_intro" || status === "intro" || status === "starting_soon") {
        return publicRhythmResponse({ action: "parent_joined_existing_intro_flow", auction });
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
          await assertControllerOwnership();
          const updatedAuction = await moveToArtwork(request, supabaseAdmin, auctionCode, nextArtwork, status, auction.artwork_id ?? null, controllerToken);
          if (!updatedAuction) {
            return publicRhythmResponse({ action: "none", auction });
          }
          return publicRhythmResponse({
            action: "parent_auto_intro_started",
            auction: updatedAuction || auction,
          });
        }
      }
    }

    if (status === "next_artwork_countdown") {
      const deadline = auction.status_deadline ? new Date(auction.status_deadline).getTime() : 0;
      if (!deadline || now < deadline) return publicRhythmResponse({ action: "next_artwork_countdown", auction });

      const artworks = await fetchArtworks(supabaseAdmin, auctionCode);
      const countdownArtwork = getCurrentArtwork(auction, artworks);

      if (!countdownArtwork) {
        return jsonError("Next artwork could not be loaded.", 404);
      }

      await assertControllerOwnership();
          const updatedAuction = await moveToArtwork(request, supabaseAdmin, auctionCode, countdownArtwork, status, auction.artwork_id ?? null, controllerToken);
          if (!updatedAuction) {
            return publicRhythmResponse({ action: "none", auction });
          }
      return publicRhythmResponse({ action: "next_artwork_intro", auction: updatedAuction || auction });
    }

    // BRAGWALL_CENTRAL_INTRO_TRANSITION_V1
    //
    // Only the central controller advances timed introductions.
    // Parent browsers cannot shorten or restart the MC timeline.
    //
    // This pathway remains disabled until explicitly activated
    // for isolated Staging testing.

    if (status === "intro" && SERVER_MC_TIMING_ENABLED) {
      const stagingUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "";

      if (
        !stagingUrl.includes("nxgtyzsqqpivstpcyskm") ||
        process.env.BRAGWALL_MOCK_ELEVENLABS !== "true"
      ) {
        return jsonError(
          "Server-controlled MC timing is restricted to Staging.",
          503
        );
      }

      const introDeadline = auction.status_deadline;
      const introDeadlineMs = introDeadline
        ? new Date(introDeadline).getTime()
        : NaN;

      // Never estimate a missing or invalid introduction deadline.
      if (
        !introDeadline ||
        !Number.isFinite(introDeadlineMs)
      ) {
        return jsonError(
          "The AI MC introduction has no verified deadline.",
          409
        );
      }

      if (now < introDeadlineMs) {
        return publicRhythmResponse({
          action: "mc_intro_in_progress",
          auction,
        });
      }

      // Preserve the central controller ownership protections.
      await assertControllerOwnership();

      const bidIncrement = await fetchBidIncrement(
        supabaseAdmin,
        auctionCode
      );

      const openingBid = Math.max(
        Number(auction.next_bid_amount || 0),
        currentBid + bidIncrement,
        bidIncrement
      );

      const childName =
        String(auction.child_name || "this artwork").trim() ||
        "this artwork";

      const countdownDeadline = new Date(
        Date.now() + BIDDING_START_BUFFER_SECONDS * 1000
      ).toISOString();

      const commentary =
        `MC introduction complete. Bidding starts in ` +
        `${BIDDING_START_BUFFER_SECONDS} seconds for ` +
        `${childName}'s artwork.`;

      // Optimistic concurrency:
      // The expected status and original introduction deadline
      // must still match before updating.
      //
      // Only one controller can advance this introduction.
      const { data: updatedAuction, error: updateError } =
        await supabaseAdmin
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
          .eq("status_deadline", introDeadline)
          .select("*")
          .maybeSingle();

      if (updateError) {
        return jsonError(
          "Unable to advance the protected MC countdown.",
          500
        );
      }

      if (!updatedAuction) {
        // Another controller may already have completed
        // the same transition.
        return publicRhythmResponse({
          action: "mc_intro_transition_already_handled",
          auction,
        });
      }

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `AI MC introduction complete. Bidding begins in ` +
        `${BIDDING_START_BUFFER_SECONDS} seconds.`
      );

      return publicRhythmResponse({
        action: "server_mc_intro_countdown_started",
        auction: updatedAuction,
      });
    }

    if (status === "starting_soon") {
      const deadline = auction.status_deadline ? new Date(auction.status_deadline).getTime() : 0;
      if (!deadline || now < deadline) return publicRhythmResponse({ action: "none", auction });

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
      if (!updatedAuction) return publicRhythmResponse({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, "Bidding opened after the 15 second countdown");
      return publicRhythmResponse({ action: "open", auction: updatedAuction });
    }

    if (status === "sold") {
      const hasWinnerEmail = Boolean(auction.winner_email || auction.winner_email_submitted_at);
      const soldAt = auction.updated_at ? new Date(auction.updated_at).getTime() : 0;
      const soldSeconds = soldAt ? Math.floor((now - soldAt) / 1000) : SOLD_EMAIL_CAPTURE_SECONDS;
      const emailCaptureRemaining = Math.max(0, SOLD_EMAIL_CAPTURE_SECONDS - soldSeconds);

      if (!hasWinnerEmail && emailCaptureRemaining > 0) {
        return publicRhythmResponse({
          action: "waiting_for_winner_email",
          auction,
          secondsRemaining: emailCaptureRemaining,
        });
      }

      if (hasWinnerEmail) {
        const deadline = auction.status_deadline ? new Date(auction.status_deadline).getTime() : 0;
        if (!deadline || now < deadline) return publicRhythmResponse({ action: "next_countdown", auction });
      }

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
        return publicRhythmResponse({ action: "complete", auction: updatedAuction || auction });
      }

      await assertControllerOwnership();
          const updatedAuction = await moveToArtwork(request, supabaseAdmin, auctionCode, nextArtwork, status, auction.artwork_id ?? null, controllerToken);
          if (!updatedAuction) {
            return publicRhythmResponse({ action: "none", auction });
          }
      return publicRhythmResponse({ action: "next_artwork", auction: updatedAuction || auction });
    }

    if (status === "open" && currentBid <= 0) {
      // BRAGWALL_ATOMIC_UNSOLD_V1
      // The database verifies the 15-second no-bid period,
      // controller ownership and absence of bid records.
      // No bids are deleted during this transition.

      const artworks = await fetchArtworks(supabaseAdmin, auctionCode);
      const currentArtwork = getCurrentArtwork(auction, artworks);

      if (!currentArtwork) {
        return publicRhythmResponse({ action: "none", auction });
      }

      const nextArtwork = getNextArtwork(currentArtwork, artworks);

      await assertControllerOwnership();

      const { data: unsoldCompleted, error: unsoldError } =
        await supabaseAdmin.rpc("complete_unsold_artwork_transition", {
          p_auction_code: auctionCode,
          p_claim_token: controllerToken,
          p_current_artwork_id: currentArtwork.id,
          p_next_artwork_id: nextArtwork?.id ?? null,
        });

      if (unsoldError) {
        console.error("Atomic UNSOLD transaction failed:", unsoldError);

        return jsonError(
          "Unable to complete the UNSOLD transaction.",
          500
        );
      }

      if (unsoldCompleted !== true) {
        // The auction may have changed, a bid may exist,
        // or the 15-second no-bid period may not have elapsed.
        return publicRhythmResponse({
          action: "none",
          auction,
        });
      }

      const { data: updatedAuction, error: stateError } =
        await supabaseAdmin
          .from("live_auction_state")
          .select("*")
          .eq("auction_code", auctionCode)
          .maybeSingle();

      if (stateError || !updatedAuction) {
        console.error("Could not read confirmed UNSOLD state:", stateError);

        return jsonError(
          "UNSOLD transition completed, but auction state could not be loaded.",
          500
        );
      }

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `No bids received. Archived unsold artwork: ${currentArtwork.child_name} ${currentArtwork.child_surname}`
      );

      return publicRhythmResponse({
        action: nextArtwork
          ? "unsold_next_artwork_countdown"
          : "unsold_complete",
        auction: updatedAuction,
      });
    }
    if (currentBid <= 0) return publicRhythmResponse({ action: "none", auction });
    if (status === "waiting" || status === "intro" || status === "preparing_intro" || status === "next_artwork_countdown" || status === "complete") {
      return publicRhythmResponse({ action: "none", auction });
    }

    if (status === "open") {
      const pauseUntil = auction.bid_pause_until ? new Date(auction.bid_pause_until).getTime() : 0;
      if (pauseUntil > now) return publicRhythmResponse({ action: "none", auction });

      const lastBidTime = auction.last_bid_at ? new Date(auction.last_bid_at).getTime() : 0;
      if (!lastBidTime) return publicRhythmResponse({ action: "none", auction });

      const silenceStartsAt = Math.max(lastBidTime, pauseUntil);
      const silenceSeconds = Math.floor((now - silenceStartsAt) / 1000);
      if (silenceSeconds < SILENCE_BEFORE_GOING_ONCE_SECONDS) return publicRhythmResponse({ action: "none", auction });

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
      if (!updatedAuction) return publicRhythmResponse({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, `Going once at R${currentBid.toLocaleString()}`);
      return publicRhythmResponse({ action: "going_once", auction: updatedAuction });
    }

    if (status === "going once") {
      if (!auction.status_deadline) return publicRhythmResponse({ action: "none", auction });
      if (now < new Date(auction.status_deadline).getTime()) return publicRhythmResponse({ action: "none", auction });

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
      if (!updatedAuction) return publicRhythmResponse({ action: "none", auction });
      await addActivity(supabaseAdmin, auctionCode, `Going twice at R${currentBid.toLocaleString()}`);
      return publicRhythmResponse({ action: "going_twice", auction: updatedAuction });
    }

    if (status === "going twice") {
      if (!auction.status_deadline) {
        return publicRhythmResponse({ action: "none", auction });
      }

      if (now < new Date(auction.status_deadline).getTime()) {
        return publicRhythmResponse({ action: "none", auction });
      }

      if (!auction.artwork_id) {
        return jsonError("SOLD artwork ID is missing.", 500);
      }

      await assertControllerOwnership();

      // BRAGWALL_ATOMIC_SOLD_V1
      // Save the sale and update auction status in one PostgreSQL transaction.
      // The database verifies controller ownership, deadline, bid and artwork.
      const { data: soldCompleted, error: soldError } =
        await supabaseAdmin.rpc("complete_sold_artwork_transition", {
          p_auction_code: auctionCode,
          p_claim_token: controllerToken,
          p_artwork_id: auction.artwork_id,
          p_expected_bid: currentBid,
          p_expected_deadline: auction.status_deadline,
        });

      if (soldError) {
        console.error("Atomic SOLD transaction failed:", soldError);

        return jsonError(
          "Unable to complete the SOLD transaction. Please check auction records.",
          500
        );
      }

      if (soldCompleted !== true) {
        // Another request may have changed the bid or auction status.
        // Do not announce SOLD unless the database confirmed the sale.
        return publicRhythmResponse({
          action: "none",
          auction,
        });
      }

      // Retrieve the confirmed database state after the atomic transaction.
      const { data: updatedAuction, error: stateError } =
        await supabaseAdmin
          .from("live_auction_state")
          .select("*")
          .eq("auction_code", auctionCode)
          .maybeSingle();

      if (stateError || !updatedAuction) {
        console.error("Could not read confirmed SOLD state:", stateError);

        return jsonError(
          "Sale saved, but the updated auction state could not be loaded.",
          500
        );
      }

      await addActivity(
        supabaseAdmin,
        auctionCode,
        `SOLD to ${leadingBidder} for R${currentBid.toLocaleString()}`
      );

      return publicRhythmResponse({
        action: "sold",
        auction: updatedAuction,
      });
    }
    return publicRhythmResponse({ action: "none", auction });
    } finally {
      // Stop renewing before releasing the controller lock.
      controllerFinished = true;
      clearInterval(controllerHeartbeat);

      if (controllerLeaseLost) {
        console.error(
          "Auction controller may have lost its lease during processing:",
          auctionCode
        );
      }

      // Release only our own claim. Never release another controller's lock.
      const { data: released, error: releaseError } =
        await supabaseAdmin.rpc("release_auction_controller", {
          p_auction_code: auctionCode,
          p_claim_token: controllerToken,
        });

      if (releaseError || released !== true) {
        console.error("Auction controller release failed:", {
          auctionCode,
          error: releaseError,
          released,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run auction rhythm.";
    return jsonError(message, 500);
  }
}

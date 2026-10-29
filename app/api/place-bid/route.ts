import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";
import { createHash } from "crypto";

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
const MC_REACTION_EVERY_NTH_BID = 3;

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

function createBidReaction({
  bidderName,
  amount,
  nextAsk,
  bidCount,
}: {
  bidderName: string;
  amount: number;
  nextAsk: number;
  bidCount: number;
}) {
  const spokenAmount = `${amount.toLocaleString()} Rand`;
  const spokenNextAsk = `${nextAsk.toLocaleString()} Rand`;

  const options = [
    `${bidderName} leads at ${spokenAmount} — bold move!`,
    `${spokenAmount} from ${bidderName}. Game on!`,
    `${bidderName} takes the lead. Parents, stay calm!`,
    `${spokenAmount}! ${bidderName} means business.`,
    `${bidderName} is in front. Who wants ${spokenNextAsk}?`,
  ];

  const selected = options[Math.abs(bidCount - 1) % options.length];

  return `MC_REACTION:${selected}`;
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
    const bidderContactId = String(body?.bidderContactId || "").trim();
    const bidderToken = String(body?.bidderToken || "").trim();

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

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bidderContactId)) {
      return jsonError("Please rejoin the auction to register your email.", 403);
    }

    if (!/^[0-9a-f]{64}$/i.test(bidderToken)) {
      return jsonError("Your bidder session is invalid. Please rejoin the auction.", 403);
    }

    const bidderTokenHash = createHash("sha256")
      .update(bidderToken)
      .digest("hex");

    const { data: bidderContact, error: contactError } = await supabase
      .from("auction_bidder_contacts")
      .select("id,auction_code,bidder_name")
      .eq("id", bidderContactId)
      .eq("auction_code", auctionCode)
      .eq("bidder_token_hash", bidderTokenHash)
      .maybeSingle();

    if (
      contactError ||
      !bidderContact ||
      bidderContact.bidder_name.trim().toLowerCase() !== bidderName.toLowerCase()
    ) {
      return jsonError("Bidder details could not be verified. Please rejoin the auction.", 403);
    }

    // BRAGWALL_ATOMIC_BIDDING_API_V1
    //
    // Staging-only atomic bid processing.
    // Disabled unless explicitly enabled.
    //
    // The existing bidding pathway below remains unchanged.
    //
    // PostgreSQL locks the auction row and atomically inserts
    // the accepted bid and updates the auction state.

    if (process.env.BRAGWALL_ATOMIC_BIDDING_ENABLED === "true") {
      const stagingUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "";

      const permittedAuctions = [
        "mc-timing-e2e-20261029-01",
        "mc-timing-e2e-20261029-02",
        "mc-timing-e2e-20261029-03",
      ];

      if (
        !stagingUrl.includes("nxgtyzsqqpivstpcyskm") ||
        process.env.BRAGWALL_MOCK_ELEVENLABS !== "true"
      ) {
        return jsonError(
          "Atomic bidding test is restricted to Staging mock mode.",
          503
        );
      }

      if (!permittedAuctions.includes(auctionCode)) {
        return jsonError(
          "This auction is outside the atomic bidding test.",
          403
        );
      }

      const { data: atomicResult, error: atomicError } =
        await supabase.rpc("place_test_bid_atomic", {
          p_auction_code: auctionCode,
          p_bidder_name: bidderName,
          p_bidder_contact_id: bidderContactId,
          p_bidder_token_hash: bidderTokenHash,
          p_amount: roundedAmount,
        });

      if (atomicError) {
        console.error("Atomic bidding RPC failed:", atomicError);

        return jsonError(
          "Unable to process your bid. Please try again.",
          500
        );
      }

      if (!atomicResult || atomicResult.ok !== true) {
        const reason = String(atomicResult?.reason || "");

        if (
          reason === "invalid_bidder" ||
          reason === "bidder_name_mismatch"
        ) {
          return jsonError(
            "Bidder details could not be verified. Please rejoin the auction.",
            403
          );
        }

        if (reason === "bidding_paused") {
          return jsonError(
            "Bidding is paused for a moment. Please try again when the next bid opens.",
            409
          );
        }

        if (reason === "bid_too_low") {
          const minimum = Number(atomicResult.minimumBid || 0);

          return jsonError(
            `This bid is no longer high enough. The next bid is R${minimum.toLocaleString()}.`,
            409
          );
        }

        if (reason === "bidding_closed") {
          return jsonError(
            "Bidding is not open yet.",
            409
          );
        }

        if (reason === "auction_not_found") {
          return jsonError("Auction is not available.", 404);
        }

        if (reason === "auction_not_allowed") {
          return jsonError("Auction is not permitted.", 403);
        }

        if (reason === "invalid_request") {
          return jsonError("Invalid bid request.", 400);
        }

        return jsonError(
          "Your bid could not be accepted. Please try again.",
          409
        );
      }

      // The atomic database function has committed the bid.
      // Never retry an accepted bid merely because a later
      // activity or commentary update fails.

      const acceptedAmount = Number(
        atomicResult.acceptedAmount
      );

      const nextAsk = Number(
        atomicResult.nextBidAmount
      );

      const { data: freshAuction, error: freshError } =
        await supabase
          .from("live_auction_state")
          .select("*")
          .eq("auction_code", auctionCode)
          .single<AuctionState>();

      if (freshError || !freshAuction) {
        console.error(
          "Accepted atomic bid; auction refresh failed:",
          freshError
        );

        return NextResponse.json({
          ok: true,
          accepted: true,
          bidId: atomicResult.bidId,
          nextBidAmount: nextAsk,
          refreshRequired: true,
        });
      }

      // Preserve the existing activity feed and MC reactions.
      // These are secondary effects, not part of bid acceptance.

      try {
        const { count: acceptedBidCount } = await supabase
          .from("live_bids")
          .select("id", { count: "exact", head: true })
          .eq("auction_code", auctionCode);

        const safeBidCount = Number(acceptedBidCount || 0);

        const standardMessage =
          `R${acceptedAmount.toLocaleString()} received from ` +
          `${bidderName}. Do I hear R${nextAsk.toLocaleString()}?`;

        const shouldUseMcReaction =
          safeBidCount > 0 &&
          safeBidCount % MC_REACTION_EVERY_NTH_BID === 0;

        const message = shouldUseMcReaction
          ? createBidReaction({
              bidderName,
              amount: acceptedAmount,
              nextAsk,
              bidCount: safeBidCount,
            })
          : standardMessage;

        // Never overwrite commentary belonging to a later bid.
        await supabase
          .from("live_auction_state")
          .update({
            mc_commentary: message,
          })
          .eq("auction_code", auctionCode)
          .eq("current_bid", acceptedAmount)
          .eq("leading_bidder_contact_id", bidderContactId);

        await supabase
          .from("live_activity_feed")
          .insert({
            auction_code: auctionCode,
            message:
              `R${acceptedAmount.toLocaleString()} received from ${bidderName}`,
          });
      } catch (secondaryError) {
        console.error(
          "Atomic bid accepted; secondary updates failed:",
          secondaryError
        );
      }

      return NextResponse.json({
        ok: true,
        accepted: true,
        bidId: atomicResult.bidId,
        auction: freshAuction,
        nextBidAmount: nextAsk,
      });
    }

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
    const standardMessage = `R${roundedAmount.toLocaleString()} received from ${bidderName}. Do I hear R${nextAsk.toLocaleString()}?`;

    const { data: insertedBid, error: bidError } = await supabase
      .from("live_bids")
      .insert({
        auction_code: auctionCode,
        bidder_name: bidderName,
        bidder_contact_id: bidderContactId,
        amount: roundedAmount,
      })
      .select("id")
      .single();

    if (bidError || !insertedBid) {
      return jsonError(bidError?.message || "Could not place bid.", 400);
    }

    const { count: acceptedBidCount } = await supabase
      .from("live_bids")
      .select("id", { count: "exact", head: true })
      .eq("auction_code", auctionCode);

    const safeBidCount = Number(acceptedBidCount || 0);
    const shouldUseMcReaction =
      safeBidCount > 0 && safeBidCount % MC_REACTION_EVERY_NTH_BID === 0;

    const message = shouldUseMcReaction
      ? createBidReaction({
          bidderName,
          amount: roundedAmount,
          nextAsk,
          bidCount: safeBidCount,
        })
      : standardMessage;

    const { data: updatedAuction, error: updateError } = await supabase
      .from("live_auction_state")
      .update({
        current_bid: roundedAmount,
        leading_bidder: bidderName,
        leading_bidder_contact_id: bidderContactId,
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

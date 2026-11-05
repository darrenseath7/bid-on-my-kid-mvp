import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const validCode = /^[a-z0-9][a-z0-9_-]{1,79}$/;
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validToken = /^[0-9a-f]{64}$/i;
const kinds = new Set(["heart", "cheer", "dance"]);

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "auction-reaction",
      limit: 30,
      windowMs: 60_000,
      message: "Please wait before sending more reactions.",
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const auctionCode = String(body?.auctionCode || "").trim().toLowerCase();
    const artworkId = String(body?.artworkId || "").trim();
    const bidderContactId = String(body?.bidderContactId || "").trim();
    const bidderToken = String(body?.bidderToken || "").trim();
    const kind = String(body?.kind || "");
    if (!validCode.test(auctionCode) || !validUuid.test(artworkId) ||
        !validUuid.test(bidderContactId) || !validToken.test(bidderToken) ||
        !kinds.has(kind)) {
      return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase configuration.");
    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const bidderTokenHash = createHash("sha256").update(bidderToken).digest("hex");
    const [{ data: contact, error: contactError }, { data: auction, error: auctionError }] = await Promise.all([
      db.from("auction_bidder_contacts").select("id")
        .eq("id", bidderContactId).eq("auction_code", auctionCode)
        .eq("bidder_token_hash", bidderTokenHash).maybeSingle(),
      db.from("live_auction_state").select("artwork_id,status")
        .eq("auction_code", auctionCode).maybeSingle(),
    ]);
    if (contactError || !contact || auctionError || !auction ||
        auction.artwork_id !== artworkId ||
        !["intro", "open", "going once", "going twice", "paused"].includes(auction.status)) {
      return NextResponse.json({ error: "Reaction unavailable for this artwork." }, { status: 409 });
    }

    // One reaction per bidder per ten-second slot, enforced across server instances.
    const { error } = await db.from("auction_reactions").insert({
      auction_code: auctionCode,
      artwork_id: artworkId,
      bidder_contact_id: bidderContactId,
      kind,
      time_slot: Math.floor(Date.now() / 10_000),
    });
    if (error?.code === "23505") {
      return NextResponse.json({ ok: true, limited: true });
    }
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("auction-reaction error:", error);
    return NextResponse.json({ error: "Reaction unavailable." }, { status: 500 });
  }
}

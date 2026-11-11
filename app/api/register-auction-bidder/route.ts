import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";
import { rateLimit } from "@/lib/rateLimit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAuctionCode(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMobile(value: unknown) {
  const compact = String(value || "").trim().replace(/[\s().-]/g, "");
  const e164 = /^0\d{9}$/.test(compact)
    ? `+27${compact.slice(1)}`
    : /^27\d{9}$/.test(compact)
      ? `+${compact}`
      : compact;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "register-auction-bidder",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      message: "Too many registration attempts. Please try again later.",
    });

    if (limited) return limited;

    const body = await request.json().catch(() => null);

    const auctionCode = normalizeAuctionCode(body?.auctionCode);
    const bidderName = normalizeName(body?.bidderName);
    const bidderEmail = normalizeEmail(body?.bidderEmail);
    const wantsWhatsapp = body?.whatsappOptIn === true;
    const phone = wantsWhatsapp ? normalizeMobile(body?.bidderPhone) : null;

    if (wantsWhatsapp && !phone && !(body?.bidderContactId && body?.bidderToken)) {
      return NextResponse.json(
        { error: "Enter a valid mobile number to receive a winner WhatsApp." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(auctionCode)) {
      return NextResponse.json(
        { error: "Invalid auction code." },
        { status: 400 }
      );
    }

    if (!bidderName || bidderName.length > 80) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(bidderEmail) || bidderEmail.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: auction, error: auctionError } = await supabase
      .from("live_auction_state")
      .select("auction_code,status")
      .eq("auction_code", auctionCode)
      .maybeSingle();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: "Auction not found." },
        { status: 404 }
      );
    }

    if (auction.status === "complete") {
      return NextResponse.json(
        { error: "This auction has already completed." },
        { status: 409 }
      );
    }

    // Rejoining updates the same protected bidder record, including revoked consent.
    if (body?.bidderContactId || body?.bidderToken) {
      const existingId = String(body?.bidderContactId || "");
      const existingToken = String(body?.bidderToken || "");
      if (!/^[0-9a-f-]{36}$/i.test(existingId) || !/^[0-9a-f]{64}$/i.test(existingToken)) {
        return NextResponse.json({ error: "Please rejoin the auction." }, { status: 403 });
      }
      const existingHash = createHash("sha256").update(existingToken).digest("hex");
      const { data: existing, error: lookupError } = await supabase
        .from("auction_bidder_contacts")
        .select("id,bidder_name,bidder_email,bidder_phone_e164,whatsapp_opt_in_at")
        .eq("id", existingId)
        .eq("auction_code", auctionCode)
        .eq("bidder_token_hash", existingHash)
        .maybeSingle();
      if (lookupError || !existing ||
          existing.bidder_name !== bidderName || existing.bidder_email !== bidderEmail) {
        return NextResponse.json({ error: "Please rejoin the auction." }, { status: 403 });
      }
      const confirmedPhone = wantsWhatsapp ? phone || existing.bidder_phone_e164 : null;
      if (wantsWhatsapp && !confirmedPhone) {
        return NextResponse.json(
          { error: "Enter a valid mobile number to receive a winner WhatsApp." },
          { status: 400 }
        );
      }
      const { error: updateError } = await supabase
        .from("auction_bidder_contacts")
        .update({
          bidder_phone_e164: confirmedPhone,
          whatsapp_opt_in_at: wantsWhatsapp
            ? existing.whatsapp_opt_in_at || new Date().toISOString() : null,
        })
        .eq("id", existingId)
        .eq("auction_code", auctionCode)
        .eq("bidder_token_hash", existingHash);
      if (updateError) throw updateError;
      return NextResponse.json({
        ok: true, bidderContactId: existingId, bidderToken: existingToken,
        bidderName, bidderEmail,
      });
    }

    // Generate a cryptographically secure bidder token.
    const bidderToken = randomBytes(32).toString("hex");

    // Store only the SHA-256 hash, never the raw token.
    const bidderTokenHash = createHash("sha256")
      .update(bidderToken)
      .digest("hex");

    const { data: contact, error: insertError } = await supabase
      .from("auction_bidder_contacts")
      .insert({
        auction_code: auctionCode,
        bidder_name: bidderName,
        bidder_email: bidderEmail,
        bidder_token_hash: bidderTokenHash,
        bidder_phone_e164: phone,
        whatsapp_opt_in_at: wantsWhatsapp ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (insertError || !contact) {
      throw insertError || new Error("Could not register bidder.");
    }

    return NextResponse.json({
      ok: true,
      bidderContactId: contact.id,
      bidderToken,
      bidderName,
      bidderEmail,
    });
  } catch (error) {
    console.error("register-auction-bidder error:", error);

    return NextResponse.json(
      { error: "Could not register bidder. Please try again." },
      { status: 500 }
    );
  }
}

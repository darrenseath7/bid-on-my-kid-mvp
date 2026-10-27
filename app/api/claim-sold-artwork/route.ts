import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const RECOVERY_AUCTION_CODE = "rynfieldgrade1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "claim-sold-artwork",
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message: "Too many attempts. Please try again later.",
    });

    if (limited) return limited;

    const body = await request.json().catch(() => null);

    const auctionCode = String(body?.auctionCode || "")
      .trim()
      .toLowerCase();

    const artworkId = String(body?.artworkId || "").trim();

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (auctionCode !== RECOVERY_AUCTION_CODE) {
      return NextResponse.json(
        { error: "Email recovery is not available for this auction." },
        { status: 403 }
      );
    }

    if (!artworkId || artworkId.length > 100) {
      return NextResponse.json(
        { error: "Invalid artwork." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
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

    // Recovery is only permitted after the auction has completed.
    const { data: auction, error: auctionError } = await supabase
      .from("live_auction_state")
      .select("status")
      .eq("auction_code", RECOVERY_AUCTION_CODE)
      .maybeSingle();

    if (auctionError || !auction || auction.status !== "complete") {
      return NextResponse.json(
        { error: "This auction is not available for email recovery." },
        { status: 409 }
      );
    }

    // Only retrieve the artwork required for this request.
    const { data: artwork, error: artworkError } = await supabase
      .from("demo_artworks")
      .select("id,status,winner_email,invoice_email_requested_at")
      .eq("auction_code", RECOVERY_AUCTION_CODE)
      .eq("id", artworkId)
      .maybeSingle();

    if (artworkError || !artwork) {
      return NextResponse.json(
        { error: "Artwork not found." },
        { status: 404 }
      );
    }

    if (artwork.status !== "sold") {
      return NextResponse.json(
        { error: "Only sold artworks can use this feature." },
        { status: 409 }
      );
    }

    if (artwork.winner_email || artwork.invoice_email_requested_at) {
      return NextResponse.json(
        { error: "An email has already been recorded for this artwork." },
        { status: 409 }
      );
    }

    const submittedAt = new Date().toISOString();

    // Conditional update prevents overwriting an email submitted
    // by another parent while this request was processing.
    const { data: updated, error: updateError } = await supabase
      .from("demo_artworks")
      .update({
        winner_email: email,
        invoice_email_requested_at: submittedAt,
      })
      .eq("auction_code", RECOVERY_AUCTION_CODE)
      .eq("id", artworkId)
      .eq("status", "sold")
      .is("winner_email", null)
      .is("invoice_email_requested_at", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "This artwork already has an email or is no longer available for recovery.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Your email has been received. Thank you!",
    });
  } catch (error) {
    console.error("claim-sold-artwork error:", error);

    return NextResponse.json(
      { error: "Could not save email. Please try again." },
      { status: 500 }
    );
  }
}

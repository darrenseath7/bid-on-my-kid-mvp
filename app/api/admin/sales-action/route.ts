import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

const DEFAULT_AUCTION_CODE = "demo";

function getSafeAuctionCode(value: unknown) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || DEFAULT_AUCTION_CODE;
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


function normalizeId(value: unknown) {
  return String(value || "").trim();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || null;
  const session = await verifyAdminSessionToken(token);

  if (!session) {
    return null;
  }

  const allowedEmails = getAllowedAdminEmails();

  if (
    allowedEmails.length > 0 &&
    !allowedEmails.includes(session.email.toLowerCase())
  ) {
    return null;
  }

  return session;
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdmin(request);

  if (!adminSession) {
    return jsonError("Admin login required.", 401);
  }

  try {
    const auctionCode = getSafeAuctionCode(request.nextUrl.searchParams.get("auctionCode"));
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("demo_artworks")
      .select(
        [
          "id",
          "sort_order",
          "auction_code",
          "child_name",
          "child_surname",
          "grade",
          "artwork_url",
          "status",
          "sold_amount",
          "winning_bidder",
          "winner_email",
          "invoice_email_requested_at",
          "certificate_email_requested_at",
        ].join(",")
      )
      .eq("auction_code", auctionCode)
      .in("status", ["sold", "after_auction_request"])
      .not("winner_email", "is", null)
      .order("sort_order", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ sales: data || [] });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load sales records.",
      500
    );
  }
}


export async function POST(request: NextRequest) {
  const adminSession = await requireAdmin(request);

  if (!adminSession) {
    return jsonError("Admin login required.", 401);
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("Invalid request.", 400);
    }

    const auctionCode = getSafeAuctionCode((body as { auctionCode?: unknown }).auctionCode);
    const artworkId = normalizeId((body as { artworkId?: unknown }).artworkId);
    const action = String((body as { action?: unknown }).action || "").trim();

    if (!artworkId) {
      return jsonError("Missing artwork id.", 400);
    }

    if (action !== "release-certificate") {
      return jsonError("Unsupported sales action.", 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const releasedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("demo_artworks")
      .update({ certificate_email_requested_at: releasedAt })
      .eq("auction_code", auctionCode)
      .eq("id", artworkId)
      .in("status", ["sold", "after_auction_request"])
      .not("winner_email", "is", null)
      .select(
        [
          "id",
          "sort_order",
          "auction_code",
          "child_name",
          "child_surname",
          "grade",
          "artwork_url",
          "status",
          "sold_amount",
          "winning_bidder",
          "winner_email",
          "invoice_email_requested_at",
          "certificate_email_requested_at",
        ].join(",")
      )
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Could not release certificate. Make sure the artwork is sold and a winner email has been captured.", 409);
    }

    await supabaseAdmin.from("live_activity_feed").insert({
      auction_code: auctionCode,
      message: "Certificate released for winning bidder",
    });

    return NextResponse.json({ ok: true, sale: data });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update sales record.",
      500
    );
  }
}


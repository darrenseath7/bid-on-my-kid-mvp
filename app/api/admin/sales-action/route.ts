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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || null;
  const session = await verifyAdminSessionToken(token);

  if (!session) {
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
      .eq("status", "sold")
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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

type AuctionOption = {
  auction_code: string;
  school_name: string | null;
  source: "profile" | "artwork" | "live";
};

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

function cleanCode(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function addOption(
  options: Map<string, AuctionOption>,
  codeValue: unknown,
  nameValue: unknown,
  source: AuctionOption["source"]
) {
  const auctionCode = cleanCode(codeValue);

  if (!auctionCode) return;

  const schoolName = cleanName(nameValue);
  const existing = options.get(auctionCode);

  if (!existing) {
    options.set(auctionCode, {
      auction_code: auctionCode,
      school_name: schoolName,
      source,
    });
    return;
  }

  if (!existing.school_name && schoolName) {
    options.set(auctionCode, {
      ...existing,
      school_name: schoolName,
      source: existing.source === "profile" ? existing.source : source,
    });
  }
}

export async function GET(request: NextRequest) {
  const session = await assertAdmin(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const options = new Map<string, AuctionOption>();

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("demo_school_profile")
      .select("auction_code,school_name")
      .order("school_name", { ascending: true });

    if (profileError) throw profileError;

    (profiles || []).forEach((profile) => {
      addOption(options, profile.auction_code, profile.school_name, "profile");
    });

    const { data: artworks } = await supabaseAdmin
      .from("demo_artworks")
      .select("auction_code")
      .not("auction_code", "is", null)
      .limit(500);

    (artworks || []).forEach((artwork) => {
      addOption(options, artwork.auction_code, null, "artwork");
    });

    const { data: liveStates } = await supabaseAdmin
      .from("live_auction_state")
      .select("auction_code")
      .not("auction_code", "is", null)
      .limit(500);

    (liveStates || []).forEach((liveState) => {
      addOption(options, liveState.auction_code, null, "live");
    });

    const auctions = Array.from(options.values()).sort((left, right) => {
      const leftLabel = left.school_name || left.auction_code;
      const rightLabel = right.school_name || right.auction_code;
      return leftLabel.localeCompare(rightLabel);
    });

    return NextResponse.json({ ok: true, auctions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load auctions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

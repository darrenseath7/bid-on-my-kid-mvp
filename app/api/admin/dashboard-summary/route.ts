import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

const DEFAULT_AUCTION_CODE = "demo";

type ProfileRow = {
  auction_code: string | null;
  school_name: string | null;
};

type ArtworkRow = {
  id: string;
  auction_code: string | null;
  child_name: string | null;
  child_surname: string | null;
  grade: string | null;
  artwork_url: string | null;
  status: string | null;
  sold_amount: number | null;
  winner_email: string | null;
  created_at: string | null;
};

type LiveStateRow = {
  auction_code: string | null;
  status: string | null;
  current_bid: number | null;
  current_artwork_id: string | null;
};

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

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || null;
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

function normaliseMoney(value: number | null | undefined) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdmin(request);

  if (!adminSession) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  try {
    const auctionCode = getSafeAuctionCode(request.nextUrl.searchParams.get("auctionCode"));
    const supabaseAdmin = getSupabaseAdmin();

    const [profilesResult, artworksResult, liveStatesResult] = await Promise.all([
      supabaseAdmin
        .from("demo_school_profile")
        .select("auction_code,school_name")
        .limit(1000),
      supabaseAdmin
        .from("demo_artworks")
        .select(
          [
            "id",
            "auction_code",
            "child_name",
            "child_surname",
            "grade",
            "artwork_url",
            "status",
            "sold_amount",
            "winner_email",
            "created_at",
          ].join(",")
        )
        .limit(1000),
      supabaseAdmin
        .from("live_auction_state")
        .select("auction_code,status,current_bid,current_artwork_id")
        .limit(1000),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (artworksResult.error) throw artworksResult.error;
    if (liveStatesResult.error) throw liveStatesResult.error;

    const profiles = ((profilesResult.data || []) as unknown) as ProfileRow[];
    const artworks = ((artworksResult.data || []) as unknown) as ArtworkRow[];
    const liveStates = ((liveStatesResult.data || []) as unknown) as LiveStateRow[];

    const schoolNameByCode = new Map<string, string>();

    profiles.forEach((profile) => {
      const code = getSafeAuctionCode(profile.auction_code);
      const name = String(profile.school_name || "").trim();

      if (code && name) {
        schoolNameByCode.set(code, name);
      }
    });

    artworks.forEach((artwork) => {
      const code = getSafeAuctionCode(artwork.auction_code);
      if (!schoolNameByCode.has(code)) {
        schoolNameByCode.set(code, code);
      }
    });

    liveStates.forEach((state) => {
      const code = getSafeAuctionCode(state.auction_code);
      if (!schoolNameByCode.has(code)) {
        schoolNameByCode.set(code, code);
      }
    });

    const currentArtworks = artworks.filter(
      (artwork) => getSafeAuctionCode(artwork.auction_code) === auctionCode
    );
    const soldCurrentArtworks = currentArtworks.filter(
      (artwork) => artwork.status === "sold"
    );
    const unsoldCurrentArtworks = currentArtworks.filter(
      (artwork) => artwork.status !== "sold" && artwork.status !== "archived"
    );
    const currentLiveState =
      liveStates.find((state) => getSafeAuctionCode(state.auction_code) === auctionCode) || null;

    const totalRaised = soldCurrentArtworks.reduce(
      (total, artwork) => total + normaliseMoney(artwork.sold_amount),
      0
    );

    const allTotalRaised = artworks
      .filter((artwork) => artwork.status === "sold")
      .reduce((total, artwork) => total + normaliseMoney(artwork.sold_amount), 0);

    const raisedBySchool = new Map<string, { code: string; name: string; total: number; sold: number }>();

    artworks.forEach((artwork) => {
      const code = getSafeAuctionCode(artwork.auction_code);
      const existing = raisedBySchool.get(code) || {
        code,
        name: schoolNameByCode.get(code) || code,
        total: 0,
        sold: 0,
      };

      if (artwork.status === "sold") {
        existing.total += normaliseMoney(artwork.sold_amount);
        existing.sold += 1;
      }

      raisedBySchool.set(code, existing);
    });

    const topSchools = Array.from(raisedBySchool.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);

    const recentActivity = currentArtworks
      .slice()
      .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")))
      .slice(0, 5)
      .map((artwork) => ({
        id: artwork.id,
        message:
          artwork.status === "sold"
            ? `${artwork.child_name || "Artwork"} ${artwork.child_surname || ""}`.trim() +
              ` sold for R${normaliseMoney(artwork.sold_amount).toLocaleString()}`
            : `${artwork.child_name || "Artwork"} ${artwork.child_surname || ""}`.trim() +
              " added to the auction",
        status: artwork.status || "pending",
      }));

    return NextResponse.json({
      ok: true,
      summary: {
        auctionCode,
        schoolName: schoolNameByCode.get(auctionCode) || auctionCode,
        schoolsCount: schoolNameByCode.size,
        artworksCount: currentArtworks.length,
        unsoldArtworksCount: unsoldCurrentArtworks.length,
        soldArtworksCount: soldCurrentArtworks.length,
        liveRoomsCount: liveStates.length,
        totalRaised,
        allTotalRaised,
        winnerEmailsCaptured: soldCurrentArtworks.filter((artwork) => artwork.winner_email).length,
        winnerEmailsMissing: soldCurrentArtworks.filter((artwork) => !artwork.winner_email).length,
        liveStatus: currentLiveState?.status || "waiting",
        currentBid: normaliseMoney(currentLiveState?.current_bid),
        topSchools,
        recentActivity,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load dashboard summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


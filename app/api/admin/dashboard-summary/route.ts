import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

export const dynamic = "force-dynamic";

const DEFAULT_AUCTION_CODE = "demo";

type DataRow = Record<string, unknown>;

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
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || DEFAULT_AUCTION_CODE;
}

function cleanName(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function getNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getString(value: unknown) {
  return String(value || "").trim();
}

function formatActivityName(row: DataRow) {
  const childName = getString(row.child_name);
  const childSurname = getString(row.child_surname);
  const combined = `${childName} ${childSurname}`.trim();

  return combined || "Artwork";
}

function getCreatedAt(row: DataRow) {
  return getString(row.created_at);
}

function isSalesRecordArtwork(row: DataRow) {
  const status = getString(row.status).toLowerCase();

  return (
    status === "sold" ||
    status === "after_auction_request" ||
    Boolean(cleanName(row.winner_email)) ||
    Boolean(cleanName(row.invoice_email_requested_at))
  );
}

export async function GET(request: NextRequest) {
  const session = await assertAdmin(request);

  if (!session) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  try {
    const auctionCode = cleanCode(request.nextUrl.searchParams.get("auctionCode"));
    const supabaseAdmin = getSupabaseAdmin();

    const [profilesResult, artworksResult, liveStatesResult] = await Promise.all([
      supabaseAdmin.from("demo_school_profile").select("*").limit(1000),
      supabaseAdmin.from("demo_artworks").select("*").limit(2000),
      supabaseAdmin.from("live_auction_state").select("*").limit(1000),
    ]);

    if (profilesResult.error) {
      throw new Error(`School profile error: ${profilesResult.error.message}`);
    }

    if (artworksResult.error) {
      throw new Error(`Artwork summary error: ${artworksResult.error.message}`);
    }

    if (liveStatesResult.error) {
      throw new Error(`Live room summary error: ${liveStatesResult.error.message}`);
    }

    const profiles = (profilesResult.data || []) as DataRow[];
    const artworks = (artworksResult.data || []) as DataRow[];
    const liveStates = (liveStatesResult.data || []) as DataRow[];

    const schoolNameByCode = new Map<string, string>();

    profiles.forEach((profile) => {
      const code = cleanCode(profile.auction_code);
      const schoolName = cleanName(profile.school_name);

      if (code && schoolName) {
        schoolNameByCode.set(code, schoolName);
      }
    });

    artworks.forEach((artwork) => {
      const code = cleanCode(artwork.auction_code);

      if (!schoolNameByCode.has(code)) {
        schoolNameByCode.set(code, code);
      }
    });

    liveStates.forEach((state) => {
      const code = cleanCode(state.auction_code);

      if (!schoolNameByCode.has(code)) {
        schoolNameByCode.set(code, code);
      }
    });

    const currentArtworks = artworks.filter(
      (artwork) => cleanCode(artwork.auction_code) === auctionCode
    );

    const soldCurrentArtworks = currentArtworks.filter((artwork) =>
      isSalesRecordArtwork(artwork)
    );

    const unsoldCurrentArtworks = currentArtworks.filter((artwork) => {
      const status = getString(artwork.status).toLowerCase();

      return (
        !isSalesRecordArtwork(artwork) &&
        status !== "archived"
      );
    });

    const currentLiveState =
      liveStates.find((state) => cleanCode(state.auction_code) === auctionCode) ||
      null;

    const totalRaised = soldCurrentArtworks.reduce(
      (total, artwork) => total + getNumber(artwork.sold_amount),
      0
    );

    const allTotalRaised = artworks
      .filter((artwork) => isSalesRecordArtwork(artwork))
      .reduce((total, artwork) => total + getNumber(artwork.sold_amount), 0);

    const raisedBySchool = new Map<
      string,
      { code: string; name: string; total: number; sold: number }
    >();

    artworks.forEach((artwork) => {
      const code = cleanCode(artwork.auction_code);

      if (!raisedBySchool.has(code)) {
        raisedBySchool.set(code, {
          code,
          name: schoolNameByCode.get(code) || code,
          total: 0,
          sold: 0,
        });
      }

      const existing = raisedBySchool.get(code);

      if (!existing) return;

      if (isSalesRecordArtwork(artwork)) {
        existing.total += getNumber(artwork.sold_amount);
        existing.sold += 1;
      }
    });

    const topSchools = Array.from(raisedBySchool.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);

    const recentActivity = currentArtworks
      .slice()
      .sort((left, right) => getCreatedAt(right).localeCompare(getCreatedAt(left)))
      .slice(0, 5)
      .map((artwork) => {
        const status = getString(artwork.status).toLowerCase();
        const name = formatActivityName(artwork);

        return {
          id: getString(artwork.id) || `${name}-${Math.random()}`,
          message:
            isSalesRecordArtwork(artwork)
              ? `${name} sold for R${getNumber(artwork.sold_amount).toLocaleString()}`
              : `${name} added to the auction`,
          status: status || "pending",
        };
      });

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
        winnerEmailsCaptured: soldCurrentArtworks.filter((artwork) =>
          Boolean(cleanName(artwork.winner_email))
        ).length,
        winnerEmailsMissing: soldCurrentArtworks.filter(
          (artwork) => !cleanName(artwork.winner_email)
        ).length,
        liveStatus: getString(currentLiveState?.status) || "waiting",
        currentBid: getNumber(currentLiveState?.current_bid),
        topSchools,
        recentActivity,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load dashboard summary.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAuctionRhythm } from "@/lib/server/auctionRhythm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BRAGWALL_AUTHENTICATED_CONTROLLER_V1
// Authentication test only. Does not modify auction data.

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.BRAGWALL_CONTROLLER_SECRET;

  if (!configuredSecret) {
    console.error("BragWall controller secret is not configured.");
    return false;
  }

  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return false;
  }

  const suppliedSecret = authorization.slice(7).trim();

  const expected = Buffer.from(configuredSecret, "utf8");
  const supplied = Buffer.from(suppliedSecret, "utf8");

  if (expected.length !== supplied.length) {
    return false;
  }

  return timingSafeEqual(expected, supplied);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // BRAGWALL_CONTROLLER_SHARED_EXECUTION_V1
  // Only authenticated requests can invoke this controller endpoint.
  // The existing per-auction database lock remains inside runAuctionRhythm.
  return runAuctionRhythm(request);
}
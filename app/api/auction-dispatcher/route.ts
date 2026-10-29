import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BRAGWALL_CENTRAL_DISPATCHER_PREVIEW_V1
//
// Central auction discovery.
// PREVIEW ONLY.
//
// This endpoint does not execute auction transitions.
// It does not invoke ElevenLabs.
// It does not modify auction data.

const ACTIVE_STATUSES = [
  "preparing_intro",
  "intro",
  "starting_soon",
  "open",
  "going_once",
  "going_twice",
  "sold",
  "next_artwork_countdown",
];

function authorized(request: NextRequest): boolean {
  const secret = process.env.BRAGWALL_CONTROLLER_SECRET;

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    return false;
  }

  const received = header.slice(7).trim();

  const expectedBuffer = Buffer.from(secret, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function response(
  payload: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return response(
      { error: "Unauthorized" },
      401
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return response(
      { error: "Supabase credentials unavailable." },
      503
    );
  }

  try {
    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Fail closed if more auctions exist than this
    // preview is configured to inspect.

    const { data, error } = await supabase
      .from("live_auction_state")
      .select(
        "auction_code,status,status_deadline,artwork_id,updated_at"
      )
      .limit(501);

    if (error) {
      console.error("Auction dispatcher lookup failed:", error);

      return response(
        { error: "Auction discovery unavailable." },
        503
      );
    }

    if ((data || []).length > 500) {
      return response(
        { error: "Auction discovery limit exceeded." },
        503
      );
    }

    // BRAGWALL_SCHEDULER_ELIGIBILITY_V1
    // Scheduler execution requires BOTH:
    // 1. An active auction status.
    // 2. Explicit permission in auction_scheduler_config.
    //
    // Missing configuration means DISABLED.
    // A database lookup failure must never enable an auction.

    const activeCandidates = (data || [])
      .filter((auction) =>
        ACTIVE_STATUSES.includes(
          String(auction.status || "").trim()
        )
      )
      .filter((auction) =>
        Boolean(String(auction.auction_code || "").trim())
      );

    const activeAuctionCodes = [
      ...new Set(
        activeCandidates.map((auction) =>
          String(auction.auction_code).trim()
        )
      ),
    ];

    let enabledCodes = new Set<string>();

    if (activeAuctionCodes.length > 0) {
      const { data: schedulerConfigs, error: configError } =
        await supabase
          .from("auction_scheduler_config")
          .select("auction_code,enabled")
          .in("auction_code", activeAuctionCodes)
          .eq("enabled", true);

      if (configError) {
        console.error(
          "Auction scheduler permissions lookup failed:",
          configError
        );

        return response(
          { error: "Scheduler permissions unavailable." },
          503
        );
      }

      enabledCodes = new Set(
        (schedulerConfigs || [])
          .filter((config) => config.enabled === true)
          .map((config) =>
            String(config.auction_code || "").trim()
          )
      );
    }

    const eligible = activeCandidates
      .filter((auction) =>
        enabledCodes.has(
          String(auction.auction_code).trim()
        )
      )
      .map((auction) => ({
        auctionCode: auction.auction_code,
        status: auction.status,
        artworkId: auction.artwork_id,
        deadline: auction.status_deadline,
        updatedAt: auction.updated_at,
      }));

    const disabledActiveCount =
      activeCandidates.length - eligible.length;

    const inactiveCount =
      (data || []).length - activeCandidates.length;

    const excludedCount =
      (data || []).length - eligible.length;

    // BRAGWALL_CONTROLLED_DISPATCH_EXECUTION_V1
    // Execution is disabled by default.
    // Only an explicitly selected, scheduler-enabled auction
    // may be processed during the initial controlled tests.

    const body = await request.json().catch(() => ({}));

    if (body?.mode === "execute") {
      if (
        process.env.BRAGWALL_DISPATCH_EXECUTION_ENABLED !== "true"
      ) {
        return response(
          {
            ok: false,
            executed: false,
            error: "Dispatcher execution is disabled.",
          },
          403
        );
      }

      // Initial execution is restricted to mock Staging.
      // This restriction must be reviewed before any
      // future production scheduling rollout.
      if (
        !url.includes("nxgtyzsqqpivstpcyskm") ||
        process.env.BRAGWALL_MOCK_ELEVENLABS !== "true"
      ) {
        return response(
          {
            ok: false,
            executed: false,
            error: "Controlled dispatch requires mock Staging.",
          },
          403
        );
      }

      const requestedCode =
        typeof body.auctionCode === "string"
          ? body.auctionCode.trim()
          : "";

      // BRAGWALL_SCHEDULER_SINGLE_AUCTION_GUARD_V1
      //
      // Optional additional restriction for isolated testing.
      // If configured, execution is permitted only for the
      // explicitly selected auction code.
      //
      // The existing scheduler eligibility check still applies.

      // BRAGWALL_THREE_SCHOOL_ALLOWLIST_V1
      // Preserve single-school compatibility until the
      // isolated three-school test is explicitly configured.
      const configuredAuctionCodes = String(
        process.env.BRAGWALL_SCHEDULER_ALLOWED_AUCTION_CODES ||
        process.env.BRAGWALL_SCHEDULER_ALLOWED_AUCTION_CODE ||
        ""
      );

      const allowedAuctionCodes = [
        ...new Set(
          configuredAuctionCodes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        ),
      ];

      if (
        allowedAuctionCodes.length === 0 ||
        allowedAuctionCodes.length > 3 ||
        !allowedAuctionCodes.includes(requestedCode)
      ) {
        return response(
          {
            ok: false,
            executed: false,
            error: "Auction is outside the scheduler test allowlist.",
          },
          403
        );
      }

      const selected = eligible.find(
        (auction) => auction.auctionCode === requestedCode
      );

      if (!requestedCode || !selected) {
        return response(
          {
            ok: false,
            executed: false,
            error: "Auction is not eligible for scheduling.",
          },
          409
        );
      }

      const controllerSecret =
        process.env.BRAGWALL_CONTROLLER_SECRET;

      if (!controllerSecret) {
        return response(
          {
            ok: false,
            executed: false,
            error: "Controller authentication unavailable.",
          },
          503
        );
      }

      const controllerUrl = new URL(
        "/api/auction-controller",
        request.url
      );

      try {
        const controllerResponse = await fetch(
          controllerUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${controllerSecret}`,
            },
            body: JSON.stringify({
              auctionCode: requestedCode,
              autoStartFromParent: false,
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(90000),
          }
        );

        const controllerResult =
          await controllerResponse.json().catch(() => ({}));

        return response(
          {
            ok: controllerResponse.ok,
            mode: "execute",
            executed: controllerResponse.ok,
            auctionCode: requestedCode,
            controllerStatus: controllerResponse.status,
            action: controllerResult?.action || "none",
            error: controllerResponse.ok
              ? null
              : controllerResult?.error || "Controller request failed.",
          },
          controllerResponse.ok ? 200 : 502
        );
      } catch (error) {
        console.error(
          "Controlled auction dispatch failed:",
          error
        );

        return response(
          {
            ok: false,
            executed: false,
            auctionCode: requestedCode,
            error: "Controller execution unavailable.",
          },
          503
        );
      }
    }

    // Preview remains the default.
    // No controller requests are made in preview mode.

    return response({
      ok: true,
      mode: "preview",
      executed: false,
      totalAuctions: (data || []).length,
      activeAuctions: activeCandidates.length,
      eligibleAuctions: eligible.length,
      disabledActiveAuctions: disabledActiveCount,
      inactiveAuctions: inactiveCount,
      excludedAuctions: excludedCount,
      auctions: eligible,
    });
  } catch (error) {
    console.error("Auction dispatcher failed:", error);

    return response(
      { error: "Auction dispatcher unavailable." },
      500
    );
  }
}
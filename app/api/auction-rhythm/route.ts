import { runAuctionRhythm } from "@/lib/server/auctionRhythm";

// BRAGWALL_SHARED_CONTROLLER_WRAPPER_V1
// Temporary public entry point while the central controller is tested.
// Parent auction functionality remains unchanged.

export async function POST(request: Request) {
  // BRAGWALL_PUBLIC_RHYTHM_TIMING_GUARD_V1
  //
  // While server-controlled MC timing is enabled,
  // only the authenticated controller may execute transitions.

  if (process.env.BRAGWALL_SERVER_MC_TIMING_ENABLED === "true") {
    return Response.json(
      {
        error: "Auction progression is managed by the central controller.",
        serverControlled: true,
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return runAuctionRhythm(request);
}
import { runLegacyAuctionRhythm } from "./legacy";

// BRAGWALL_PRODUCTION_COMPATIBLE_RHYTHM_V1
// Existing production auctions continue using their original implementation.
// The server-controlled auction system remains on the authenticated
// /api/auction-controller endpoint when explicitly enabled.

export async function POST(request: Request) {
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

  return runLegacyAuctionRhythm(request);
}
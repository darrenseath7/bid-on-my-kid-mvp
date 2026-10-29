import "server-only";

// BRAGWALL_VERIFIED_MC_INTRO_DURATION_V1
//
// Retrieve the measured recording duration from the completed
// audio job for the exact auction, artwork and recording URL.
//
// No duration estimates.
// No ElevenLabs generation.
// No database writes.

type AudioJobReader = {
  from: (table: string) => any;
};

export async function getVerifiedMcIntroDuration({
  supabase,
  auctionCode,
  artworkId,
  audioUrl,
}: {
  supabase: AudioJobReader;
  auctionCode: string;
  artworkId: string;
  audioUrl: string;
}): Promise<number> {
  if (!auctionCode || !artworkId || !audioUrl) {
    throw new Error(
      "Missing information for verified MC duration lookup."
    );
  }

  const { data, error } = await supabase
    .from("mc_audio_jobs")
    .select("id,status,duration_seconds")
    .eq("auction_code", auctionCode)
    .eq("artwork_id", artworkId)
    .eq("audio_type", "intro")
    .eq("audio_url", audioUrl)
    .eq("status", "completed")
    .limit(2);

  if (error) {
    throw new Error(
      `MC recording duration lookup failed: ${error.message}`
    );
  }

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(
      "Expected exactly one completed MC recording for this artwork."
    );
  }

  const duration = Number(data[0].duration_seconds);

  if (
    data[0].duration_seconds === null ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 600
  ) {
    throw new Error(
      "Completed MC recording has no valid measured duration."
    );
  }

  return duration;
}
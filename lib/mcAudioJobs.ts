import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type McAudioType = "intro" | "reaction";

export type McAudioJob = {
  job_id: string;
  job_status: string;
  job_audio_url: string | null;
  job_claim_token: string | null;
  claimed: boolean;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createMcAudioEventKey({
  auctionCode,
  artworkId,
  audioType,
  voiceId,
  script,
}: {
  auctionCode: string;
  artworkId?: string | null;
  audioType: McAudioType;
  voiceId: string;
  script: string;
}) {
  const normalizedScript = script.replace(/\s+/g, " ").trim();

  if (!auctionCode || !voiceId || !normalizedScript) {
    throw new Error("Missing audio event information.");
  }

  if (audioType === "intro" && !artworkId) {
    throw new Error("Artwork ID is required for introductions.");
  }

  const payload = JSON.stringify({
    version: 1,
    auctionCode,
    artworkId: artworkId || null,
    audioType,
    voiceId,
    script: normalizedScript,
  });

  const hash = createHash("sha256")
    .update(payload)
    .digest("hex");

  return `mc-${audioType}-${hash}`;
}

export async function claimMcAudioJob({
  auctionCode,
  eventKey,
  audioType,
  artworkId,
}: {
  auctionCode: string;
  eventKey: string;
  audioType: McAudioType;
  artworkId?: string | null;
}): Promise<McAudioJob> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc(
    "claim_mc_audio_job",
    {
      p_auction_code: auctionCode,
      p_event_key: eventKey,
      p_audio_type: audioType,
      p_artwork_id: artworkId || null,
    }
  );

  if (error) {
    throw new Error(`Audio job claim failed: ${error.message}`);
  }

  const job = Array.isArray(data) ? data[0] : data;

  if (!job) {
    throw new Error("Audio job claim returned no result.");
  }

  return job as McAudioJob;
}

export async function completeMcAudioJob({
  jobId,
  claimToken,
  audioUrl,
}: {
  jobId: string;
  claimToken: string;
  audioUrl: string;
}) {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc(
    "complete_mc_audio_job",
    {
      p_job_id: jobId,
      p_claim_token: claimToken,
      p_audio_url: audioUrl,
    }
  );

  if (error) {
    throw new Error(`Audio completion failed: ${error.message}`);
  }

  if (data !== true) {
    throw new Error("Audio completion rejected: invalid or stale claim.");
  }

  return true;
}

// BRAGWALL_AUDIO_DURATION_JOB_COMPLETION_V1
// Complete an MC audio job and save its measured duration atomically.
// Preserve the existing claim-token and processing-status protections.

export async function completeMcAudioJobWithDuration({
  jobId,
  claimToken,
  audioUrl,
  durationSeconds,
}: {
  jobId: string;
  claimToken: string;
  audioUrl: string;
  durationSeconds: number;
}) {
  if (
    !jobId ||
    !claimToken ||
    !audioUrl?.trim() ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > 600
  ) {
    throw new Error(
      "Invalid MC audio completion parameters or recording duration."
    );
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc(
    "complete_mc_audio_job_with_duration",
    {
      p_job_id: jobId,
      p_claim_token: claimToken,
      p_audio_url: audioUrl,
      p_duration_seconds: durationSeconds,
    }
  );

  if (error) {
    throw new Error(
      `Audio-duration completion failed: ${error.message}`
    );
  }

  if (data !== true) {
    throw new Error(
      "Audio-duration completion rejected: invalid or stale claim."
    );
  }

  return true;
}
export async function failMcAudioJob({
  jobId,
  claimToken,
  errorMessage,
}: {
  jobId: string;
  claimToken: string;
  errorMessage: string;
}) {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc(
    "fail_mc_audio_job",
    {
      p_job_id: jobId,
      p_claim_token: claimToken,
      p_error: errorMessage,
    }
  );

  if (error) {
    throw new Error(`Audio failure update failed: ${error.message}`);
  }

  return data === true;
}
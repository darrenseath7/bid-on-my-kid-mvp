import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import {
  createMcAudioEventKey,
  claimMcAudioJob,
  completeMcAudioJobWithDuration,
  failMcAudioJob,
} from "@/lib/mcAudioJobs";

import { measureMcAudioDuration } from "@/lib/server/mcAudioDuration";

// BRAGWALL_PROTECTED_MC_DURATION_INTEGRATION_V1
const AUDIO_BUCKET = "mc-audio";

type IntroResult =
  | {
      status: "completed";
      audioUrl: string;
      reused: boolean;
      mocked: boolean;
      eventKey: string;
    }
  | {
      status: "processing" | "failed";
      audioUrl: null;
      reused: false;
      mocked: boolean;
      eventKey: string;
    };

type GenerateIntroOptions = {
  auctionCode: string;
  artworkId: string;
  voiceId: string;
  script: string;
  generateAudio: () => Promise<Buffer>;
  recoveryControllerToken?: string | null;
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

export async function generateProtectedMcIntro({
  auctionCode,
  artworkId,
  voiceId,
  script,
  generateAudio,
  recoveryControllerToken,
}: GenerateIntroOptions): Promise<IntroResult> {
  const mockEnabled =
    process.env.BRAGWALL_MOCK_ELEVENLABS === "true";

  const eventKey = createMcAudioEventKey({
    auctionCode,
    artworkId,
    audioType: "intro",
    voiceId,
    script,
  });

  let job = await claimMcAudioJob({
    auctionCode,
    artworkId,
    audioType: "intro",
    eventKey,
  });

  // BRAGWALL_FAILED_AUDIO_RECOVERY_V1
  // Failed introduction jobs may only be retried after a
  // separate controller has obtained recovery authorisation.
  // The database enforces ownership, cooldown and attempt limits.
  if (
    !job.claimed &&
    job.job_status === "failed" &&
    recoveryControllerToken
  ) {
    const supabase = getAdminClient();

    const { data: recoveryData, error: recoveryError } =
      await supabase.rpc("claim_failed_mc_audio_job", {
        p_job_id: job.job_id,
        p_auction_code: auctionCode,
        p_controller_token: recoveryControllerToken,
      });

    if (recoveryError) {
      throw new Error(
        `Protected audio recovery claim failed: ${recoveryError.message}`
      );
    }

    const recovered = Array.isArray(recoveryData)
      ? recoveryData[0]
      : recoveryData;

    if (recovered?.claimed === true) {
      if (
        !recovered.job_claim_token ||
        recovered.job_id !== job.job_id ||
        recovered.job_status !== "processing"
      ) {
        throw new Error(
          "Audio recovery returned an invalid claim."
        );
      }

      job = recovered as typeof job;
    }
  }

  if (!job.claimed) {
    if (job.job_status === "completed" && job.job_audio_url) {
      return {
        status: "completed",
        audioUrl: job.job_audio_url,
        reused: true,
        mocked: mockEnabled,
        eventKey,
      };
    }

    return {
      status:
        job.job_status === "failed"
          ? "failed"
          : "processing",
      audioUrl: null,
      reused: false,
      mocked: mockEnabled,
      eventKey,
    };
  }

  const claimToken = job.job_claim_token;

  if (!claimToken) {
    throw new Error("Claimed audio job has no claim token.");
  }

  try {
    const supabase = getAdminClient();

    // BRAGWALL_STORAGE_RECOVERY_V1
    // The audio job has already been claimed by the database.
    // Before generating audio, check whether a previous attempt
    // successfully uploaded the exact same recording.

    const safeAuctionCode = auctionCode
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 100);

    const expectedExtension = mockEnabled ? "wav" : "mp3";

    const expectedFileName =
      `${eventKey}.${expectedExtension}`;

    const expectedFilePath =
      `${safeAuctionCode}/${expectedFileName}`;

    // BRAGWALL_AUDIO_FILE_VALIDATION_V1
    // Verify recovered audio before marking its job completed.
    // This is a basic integrity check, not a full audio decoder.

    const verifyStoredAudio = async (
      storedFilePath: string
    ): Promise<number> => {
      const { data: storedAudio, error: downloadError } =
        await supabase.storage
          .from(AUDIO_BUCKET)
          .download(storedFilePath);

      if (downloadError || !storedAudio) {
        throw new Error(
          `Existing MC recording cannot be downloaded: ${
            downloadError?.message || "No file returned"
          }`
        );
      }

      const bytes = Buffer.from(
        await storedAudio.arrayBuffer()
      );

      if (bytes.length < 128) {
        throw new Error(
          "Existing MC recording is empty or unexpectedly small."
        );
      }

      if (mockEnabled) {
        const hasWavHeader =
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WAVE";

        if (!hasWavHeader) {
          throw new Error(
            "Existing mock MC recording is not a valid WAV container."
          );
        }
      } else {
        const hasId3Header =
          bytes.toString("ascii", 0, 3) === "ID3";

        const hasMp3Frame =
          bytes[0] === 0xff &&
          (bytes[1] & 0xe0) === 0xe0;

        if (!hasId3Header && !hasMp3Frame) {
          throw new Error(
            "Existing MC recording has an unexpected MP3 header."
          );
        }
      }

      return measureMcAudioDuration(
        bytes,
        mockEnabled ? "wav" : "mp3"
      );
    };

    // Check the exact auction folder and exact event filename.
    // Never reuse a recording belonging to another event key.

    const {
      data: existingFiles,
      error: existingFilesError,
    } = await supabase.storage
      .from(AUDIO_BUCKET)
      .list(safeAuctionCode, {
        search: eventKey,
        limit: 100,
      });

    if (existingFilesError) {
      throw new Error(
        `Could not verify existing MC recording: ${existingFilesError.message}`
      );
    }

    const existingRecording = (existingFiles || []).find(
      (file) => file.name === expectedFileName
    );

    if (existingRecording) {
      const existingDurationSeconds =
        await verifyStoredAudio(expectedFilePath);

      // An earlier generation/upload succeeded.
      // Complete the existing audio job using the stored file.
      // Do not call ElevenLabs again.

      const { data: existingPublicUrl } =
        supabase.storage
          .from(AUDIO_BUCKET)
          .getPublicUrl(expectedFilePath);

      const existingAudioUrl = existingPublicUrl.publicUrl;

      if (!existingAudioUrl) {
        throw new Error(
          "Existing MC recording has no accessible audio URL."
        );
      }

      await completeMcAudioJobWithDuration({
        jobId: job.job_id,
        claimToken,
        audioUrl: existingAudioUrl,
        durationSeconds: existingDurationSeconds,
      });

      console.info(
        "BragWall recovered existing stored MC recording:",
        {
          auctionCode,
          artworkId,
          eventKey,
        }
      );

      return {
        status: "completed",
        audioUrl: existingAudioUrl,
        reused: true,
        mocked: mockEnabled,
        eventKey,
      };
    }

    // No matching stored recording exists.
    // Continue only under the database-authorised audio claim.

    let audioBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (mockEnabled) {
      const mockPath = path.join(
        process.cwd(),
        "public",
        "sounds",
        "bragwall-mock-mc.wav"
      );

      audioBuffer = await readFile(mockPath);
      contentType = "audio/wav";
      extension = "wav";
    } else {
      audioBuffer = await generateAudio();
      contentType = "audio/mpeg";
      extension = "mp3";
    }

    if (audioBuffer.length === 0) {
      throw new Error("Generated audio is empty.");
    }

    const generatedDurationSeconds =
      await measureMcAudioDuration(
        audioBuffer,
        extension === "wav" ? "wav" : "mp3"
      );

    // Reuse the exact path checked before generation.
    const filePath = expectedFilePath;

    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(filePath, audioBuffer, {
        contentType,
        upsert: false,
      });

    // BRAGWALL_UPLOAD_CONFLICT_RECOVERY_V1
    // If another upload completed first, verify the exact
    // stored object before attempting to complete this job.
    // Do not treat arbitrary Storage errors as conflicts.

    let recoveredUploadConflict = false;
    let recoveredConflictDurationSeconds: number | null = null;

    if (uploadError) {
      const uploadStatus = String(
        (uploadError as { status?: number | string }).status || ""
      );

      const uploadMessage = String(
        uploadError.message || ""
      );

      const isDuplicateObject =
        uploadStatus === "409" ||
        /resource already exists|already exists|duplicate/i.test(
          uploadMessage
        );

      if (!isDuplicateObject) {
        throw new Error(
          `Audio storage upload failed: ${uploadMessage}`
        );
      }

      const {
        data: conflictFiles,
        error: conflictLookupError,
      } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list(safeAuctionCode, {
          search: eventKey,
          limit: 100,
        });

      if (conflictLookupError) {
        throw new Error(
          `Audio upload conflict could not be verified: ${conflictLookupError.message}`
        );
      }

      const confirmedExistingObject = (
        conflictFiles || []
      ).some((file) => file.name === expectedFileName);

      if (!confirmedExistingObject) {
        throw new Error(
          "Audio upload conflict detected, but the expected recording was not found."
        );
      }

      recoveredConflictDurationSeconds =
        await verifyStoredAudio(expectedFilePath);

      recoveredUploadConflict = true;
    }

    const { data } = supabase.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(filePath);

    const audioUrl = data.publicUrl;

    if (recoveredUploadConflict) {
      console.info(
        "BragWall recovered an MC recording after upload conflict:",
        { auctionCode, artworkId, eventKey }
      );
    }

    if (!audioUrl) {
      throw new Error("Storage returned no audio URL.");
    }

    await completeMcAudioJobWithDuration({
      jobId: job.job_id,
      claimToken,
      audioUrl,
      durationSeconds: recoveredUploadConflict
        ? recoveredConflictDurationSeconds!
        : generatedDurationSeconds,
    });

    return {
      status: "completed",
      audioUrl,
      reused: recoveredUploadConflict,
      mocked: mockEnabled,
      eventKey,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown audio generation failure.";

    try {
      await failMcAudioJob({
        jobId: job.job_id,
        claimToken,
        errorMessage: message,
      });
    } catch (failureError) {
      console.error(
        "Could not record MC audio job failure:",
        failureError
      );
    }

    throw error;
  }
}
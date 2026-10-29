import "server-only";
import { parseBuffer } from "music-metadata";

// BRAGWALL_MC_AUDIO_DURATION_V1
// Determines actual audio duration from completed MP3 or WAV data.
// Does not generate audio, alter auction state or call ElevenLabs.

export async function measureMcAudioDuration(
  audioBuffer: Buffer,
  format: "mp3" | "wav"
): Promise<number> {
  if (!audioBuffer || audioBuffer.length < 128) {
    throw new Error("MC audio is missing or unexpectedly small.");
  }

  const mimeType =
    format === "wav" ? "audio/wav" : "audio/mpeg";

  const metadata = await parseBuffer(
    audioBuffer,
    {
      mimeType,
      size: audioBuffer.length,
    },
    {
      duration: true,
      skipCovers: true,
    }
  );

  const duration = metadata.format.duration;

  if (
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 600
  ) {
    throw new Error("MC recording duration is invalid.");
  }

  return Math.ceil(duration * 1000) / 1000;
}
import "server-only";

type IntroRequest = {
  origin: string;
  auctionCode: string;
  artworkId: string;
  text: string;
  childName: string;
  grade: string;
  recoveryControllerToken?: string | null;
};

type VoiceResponse = {
  ok?: boolean;
  status?: string;
  audioUrl?: string | null;
  error?: string;
};

const MAX_ATTEMPTS = 20;
const WAIT_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFallbackAudio(): string {
  if (process.env.BRAGWALL_MOCK_ELEVENLABS === "true") {
    return "/sounds/bragwall-mock-mc.wav";
  }

  return process.env.BRAGWALL_MC_FALLBACK_AUDIO_URL || "";
}

export async function resolveMcIntroAudio({
  origin,
  auctionCode,
  artworkId,
  text,
  childName,
  grade,
  recoveryControllerToken,
}: IntroRequest): Promise<string> {
  const internalToken = process.env.BRAGWALL_MC_INTERNAL_TOKEN;

  if (!internalToken) {
    throw new Error("Internal MC authentication is not configured.");
  }

  const body = JSON.stringify({
    auctionCode,
    artworkId,
    text,
    childName,
    grade,
    forceRegenerate: true,
    ...(recoveryControllerToken
      ? { recoveryControllerToken }
      : {}),
  });

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        `${origin}/api/mc-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-bragwall-mc-token": internalToken,
          },
          body,
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );

      const result = (await response.json().catch(() => ({}))) as VoiceResponse;

      if (response.ok && result.audioUrl) {
        return result.audioUrl;
      }

      if (
        response.status === 202 &&
        result.status === "processing"
      ) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(WAIT_MS);
          continue;
        }

        lastError = "Audio job did not complete within the waiting period.";
        break;
      }

      lastError =
        result.error ||
        `MC voice returned HTTP ${response.status}.`;

      break;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Unknown MC audio request failure.";

      if (attempt < MAX_ATTEMPTS) {
        await sleep(WAIT_MS);
        continue;
      }
    }
  }

  console.error(
    `[BragWall MC] Audio unavailable for auction ${auctionCode}, artwork ${artworkId}: ${lastError}`
  );

  // BRAGWALL_RESOLVER_RECOVERY_V1
  // A recovery must complete the original database audio job.
  // Never substitute fallback audio and report a false success.
  if (recoveryControllerToken) {
    throw new Error(
      `Protected MC introduction recovery failed: ${lastError}`
    );
  }

  const fallback = getFallbackAudio();

  if (!fallback) {
    throw new Error(
      "MC audio unavailable and no approved fallback recording is configured."
    );
  }

  console.warn(
    `[BragWall MC] Using fallback recording for artwork ${artworkId}.`
  );

  return fallback;
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";
import { generateProtectedMcIntro } from "@/lib/protectedMcIntro";
import {
  createMcAudioEventKey,
  claimMcAudioJob,
  completeMcAudioJob,
  failMcAudioJob,
} from "@/lib/mcAudioJobs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const AUCTION_CODE = "demo";
const MC_AUDIO_BUCKET = "mc-audio";
const DEFAULT_ELEVENLABS_VOICE_ID = "0S5oIfi8zOZixuSj8K6n";

type GenerateMcVoiceRequest = {
  artworkId?: string | null;
  auctionCode?: string | null;
  text?: string | null;
  childName?: string | null;
  grade?: string | null;
  forceRegenerate?: boolean | null;
  recoveryControllerToken?: string | null;
};

type DemoArtworkAudioLookup = {
  mc_audio_url?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      keyPrefix: "mc-voice",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      message: "Too many MC voice requests. Please wait a few minutes and try again.",
    });

    if (limited) {
      return limited;
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ELEVENLABS_API_KEY is missing. Add it to .env.local and Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase server credentials are missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateMcVoiceRequest;

    const auctionCode = cleanText(body.auctionCode) || AUCTION_CODE;
    const artworkId = cleanText(body.artworkId);
    const childName = cleanText(body.childName) || "our young artist";
    const grade = cleanText(body.grade) || "the school";
    const sourceText = cleanText(body.text);
    const forceRegenerate = Boolean(body.forceRegenerate);
    const recoveryControllerToken =
      cleanText(body.recoveryControllerToken);

    const internalToken = process.env.BRAGWALL_MC_INTERNAL_TOKEN;

    if (artworkId) {
      const suppliedToken =
        request.headers.get("x-bragwall-mc-token");

      if (
        !internalToken ||
        !suppliedToken ||
        suppliedToken !== internalToken
      ) {
        return NextResponse.json(
          { error: "Artwork introduction generation is restricted." },
          { status: 403 }
        );
      }
    }

    // BRAGWALL_REACTION_VALIDATION_V1
    // Public browsers may only request the current genuine bid reaction.
    // Artwork introduction generation retains its existing internal-token protection.
    if (!artworkId) {
      const { data: liveAuction, error: liveError } = await supabaseAdmin
        .from("live_auction_state")
        .select("current_bid,leading_bidder,mc_commentary,status")
        .eq("auction_code", auctionCode)
        .maybeSingle();

      if (liveError || !liveAuction) {
        return NextResponse.json(
          { error: "Could not verify the live auction." },
          { status: 503 }
        );
      }

      const commentary = String(liveAuction.mc_commentary || "").trim();
      const bidder = String(liveAuction.leading_bidder || "").trim();
      const currentBid = Number(liveAuction.current_bid || 0);

      if (
        !["open", "going once", "going twice"].includes(
          String(liveAuction.status || "")
        ) ||
        currentBid <= 0 ||
        !bidder ||
        bidder === "No bids yet" ||
        !commentary.toUpperCase().startsWith("MC_REACTION:")
      ) {
        return NextResponse.json(
          { error: "No valid live bidding reaction is available." },
          { status: 409 }
        );
      }

      const reactionText = commentary.replace(/^MC_REACTION:\s*/i, "").trim();

      const options = [
        `${bidder} came to play!`,
        "Yoh, now it is getting serious!",
        "Parents, the gloves are off!",
        `${bidder} wants bragging rights!`,
        "That bid has attitude!",
        "Now we have an auction!",
        "Eish, things are heating up!",
        `${bidder} is not browsing!`,
        "The wall-space battle begins!",
        "Someone wants fridge fame!",
      ];

      let seed = 0;

      for (const character of `${reactionText}|${bidder}`) {
        seed += character.charCodeAt(0);
      }

      const expectedReaction = options[Math.abs(seed) % options.length];

      if (!reactionText || sourceText !== expectedReaction) {
        return NextResponse.json(
          { error: "Reaction does not match the current auction event." },
          { status: 403 }
        );
      }
    }
    if (!sourceText) {
      return NextResponse.json(
        {
          error: "No MC intro text was provided.",
        },
        { status: 400 }
      );
    }

    const voiceId =
      cleanText(process.env.ELEVENLABS_MC_VOICE_ID) ||
      DEFAULT_ELEVENLABS_VOICE_ID;

    if (artworkId && !forceRegenerate) {
      const existingAudio = await getExistingArtworkAudioUrl({
        auctionCode,
        artworkId,
      });

      if (existingAudio) {
        return NextResponse.json({
          ok: true,
          reused: true,
          provider: "elevenlabs",
          voiceId,
          audioUrl: existingAudio,
          filePath: null,
          script: null,
        });
      }
    }

    const mcScript = buildMcScript({
      sourceText,
      childName,
      grade,
    });

    // BRAGWALL_MC_RECOVERY_AUTH_V1
    // Recovery requires internal authentication (verified above)
    // PLUS a valid controller token and exact saved introduction.
    // Ordinary introductions continue through the existing path.
    if (recoveryControllerToken) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (
        !artworkId ||
        !uuidPattern.test(recoveryControllerToken)
      ) {
        return NextResponse.json(
          { error: "Invalid introduction recovery request." },
          { status: 403 }
        );
      }

      const { data: recoveryState, error: recoveryStateError } =
        await supabaseAdmin
          .from("live_auction_state")
          .select(
            "status,artwork_id,mc_commentary,transition_controller_token,transition_token"
          )
          .eq("auction_code", auctionCode)
          .maybeSingle();

      if (recoveryStateError || !recoveryState) {
        return NextResponse.json(
          { error: "Introduction recovery state unavailable." },
          { status: 503 }
        );
      }

      const savedCommentary = String(
        recoveryState.mc_commentary || ""
      ).trim();

      if (
        recoveryState.status !== "preparing_intro" ||
        recoveryState.artwork_id !== artworkId ||
        recoveryState.transition_controller_token !==
          recoveryControllerToken ||
        !recoveryState.transition_token ||
        !savedCommentary ||
        savedCommentary !== sourceText
      ) {
        return NextResponse.json(
          {
            error:
              "Introduction recovery rejected: artwork, ownership or commentary mismatch.",
          },
          { status: 409 }
        );
      }
    }

    // Artwork introductions use one database-backed generation job.
    // Browser bidding reactions are handled separately.
    if (artworkId) {
      const result = await generateProtectedMcIntro({
        auctionCode,
        artworkId,
        voiceId,
        script: mcScript,
        recoveryControllerToken:
          recoveryControllerToken || null,
        generateAudio: () =>
          generateElevenLabsAudio({
            apiKey: process.env.ELEVENLABS_API_KEY || "",
            voiceId,
            text: mcScript,
          }),
      });

      if (result.status === "completed") {
        return NextResponse.json({
          ok: true,
          status: "completed",
          reused: result.reused,
          mocked: result.mocked,
          provider: result.mocked ? "mock" : "elevenlabs",
          voiceId,
          audioUrl: result.audioUrl,
          eventKey: result.eventKey,
          script: mcScript,
        });
      }

      if (result.status === "processing") {
        return NextResponse.json(
          {
            ok: false,
            status: "processing",
            audioUrl: null,
            eventKey: result.eventKey,
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          status: "failed",
          audioUrl: null,
          eventKey: result.eventKey,
          error: "Artwork introduction audio generation failed.",
        },
        { status: 503 }
      );
    }
    // BRAGWALL_SHARED_REACTION_AUDIO_V1
    // One database-backed recording for each unique, verified MC reaction.
    // Completed recordings are reused across parents and server instances.
    const reactionEventKey = createMcAudioEventKey({
      auctionCode,
      artworkId: null,
      audioType: "reaction",
      voiceId,
      script: mcScript,
    });

    const reactionJob = await claimMcAudioJob({
      auctionCode,
      eventKey: reactionEventKey,
      audioType: "reaction",
      artworkId: null,
    });

    if (!reactionJob.claimed) {
      if (
        reactionJob.job_status === "completed" &&
        reactionJob.job_audio_url
      ) {
        return NextResponse.json({
          ok: true,
          status: "completed",
          reused: true,
          provider: process.env.BRAGWALL_MOCK_ELEVENLABS === "true"
            ? "mock"
            : "elevenlabs",
          audioUrl: reactionJob.job_audio_url,
          eventKey: reactionEventKey,
        });
      }

      if (reactionJob.job_status === "processing") {
        return NextResponse.json(
          {
            ok: false,
            status: "processing",
            audioUrl: null,
            eventKey: reactionEventKey,
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          status: "failed",
          audioUrl: null,
          error: "MC reaction audio is unavailable.",
        },
        { status: 503 }
      );
    }

    const reactionClaimToken = reactionJob.job_claim_token;

    if (!reactionClaimToken) {
      throw new Error("Claimed reaction job has no claim token.");
    }

    try {
      const mockEnabled =
        process.env.BRAGWALL_MOCK_ELEVENLABS === "true";

      const audioBuffer = mockEnabled
        ? await readFile(
            path.join(
              process.cwd(),
              "public",
              "sounds",
              "bragwall-mock-mc.wav"
            )
          )
        : await generateElevenLabsAudio({
            apiKey: process.env.ELEVENLABS_API_KEY || "",
            voiceId,
            text: mcScript,
          });

      if (!audioBuffer.length) {
        throw new Error("Generated reaction audio is empty.");
      }

      const extension = mockEnabled ? "wav" : "mp3";

      const safeAuctionCode = auctionCode
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 100);

      const filePath =
        `${safeAuctionCode}/${reactionEventKey}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(MC_AUDIO_BUCKET)
        .upload(filePath, audioBuffer, {
          contentType: mockEnabled ? "audio/wav" : "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Reaction audio upload failed: ${uploadError.message}`
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(MC_AUDIO_BUCKET)
        .getPublicUrl(filePath);

      const audioUrl = publicUrlData.publicUrl;

      if (!audioUrl) {
        throw new Error("Storage returned no reaction audio URL.");
      }

      await completeMcAudioJob({
        jobId: reactionJob.job_id,
        claimToken: reactionClaimToken,
        audioUrl,
      });

      return NextResponse.json({
        ok: true,
        status: "completed",
        reused: false,
        mocked: mockEnabled,
        provider: mockEnabled ? "mock" : "elevenlabs",
        voiceId,
        audioUrl,
        eventKey: reactionEventKey,
        script: mcScript,
      });
    } catch (reactionError) {
      try {
        await failMcAudioJob({
          jobId: reactionJob.job_id,
          claimToken: reactionClaimToken,
          errorMessage:
            reactionError instanceof Error
              ? reactionError.message
              : "Reaction generation failed.",
        });
      } catch (failureError) {
        console.error(
          "Could not record MC reaction failure:",
          failureError
        );
      }

      throw reactionError;
    }
  } catch (error) {
    console.error("MC voice generation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "MC voice generation failed.",
      },
      { status: 500 }
    );
  }
}

async function generateElevenLabsAudio({
  apiKey,
  voiceId,
  text,
}: {
  apiKey: string;
  voiceId: string;
  text: string;
}) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.18,
          similarity_boost: 0.78,
          style: 0.92,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(
      `ElevenLabs voice generation failed: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`
    );
  }

  const audioArrayBuffer = await response.arrayBuffer();

  return Buffer.from(audioArrayBuffer);
}

async function getExistingArtworkAudioUrl({
  auctionCode,
  artworkId,
}: {
  auctionCode: string;
  artworkId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("demo_artworks")
    .select("mc_audio_url")
    .eq("id", artworkId)
    .eq("auction_code", auctionCode)
    .maybeSingle();

  if (error) {
    console.warn("Could not check existing MC audio URL:", error.message);
    return "";
  }

  const artwork = data as DemoArtworkAudioLookup | null;

  return artwork?.mc_audio_url?.trim() || "";
}

function cleanText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 8000);
}

function removeConsecutiveDuplicateWords(value: string) {
  return value
    .split(/(\s+)/)
    .filter((part, index, parts) => {
      if (/\s+/.test(part)) return true;

      const previousWord = [...parts]
        .slice(0, index)
        .reverse()
        .find((item) => !/\s+/.test(item));

      if (!previousWord) return true;

      return previousWord.toLowerCase().replace(/[^a-z0-9]/g, "") !==
        part.toLowerCase().replace(/[^a-z0-9]/g, "");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSafeFilePart(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return cleaned || "mc-intro";
}

function buildMcScript({
  sourceText,
}: {
  sourceText: string;
  childName: string;
  grade: string;
}) {
  // IMPORTANT:
  // app/api/auction-mc/route.ts already creates the complete MC script.
  // This voice route must NOT add another child intro or closing line.
  // It should only speak the exact script it receives.
  return limitWords(
    removeConsecutiveDuplicateWords(
      ensureSentenceEnds(String(sourceText || "").replace(/\s+/g, " ").trim())
    ),
    110
  );
}

function makeStoryMoreSpoken(sourceText: string, childName: string, grade: string) {
  const trimmed = sourceText.trim();

  if (!trimmed) {
    return "it feels full of colour, imagination, and proper young-artist confidence.";
  }

  const introPattern = childName
    ? new RegExp(
        `^(welcome to|next up|here we go with|eyes on the screen for)?\\s*${escapeRegExp(childName)}\\s*(from|in)?\\s*${escapeRegExp(grade)}[,.!:-]*\\s*`,
        "i"
      )
    : null;

  const cleaned = trimmed
    .replace(introPattern || /$a/, "")
    .replace(/^welcome(?:\s+welcome)*(?:\s+to\s+bragwall)?[.!,:;-]*\s*/i, "")
    .replace(/welcome to\s+from\s*\.?/gi, "")
    .replace(/from\s+from/gi, "from")
    .replace(/\s+/g, " ")
    .trim();

  return ensureSentenceEnds(cleaned || trimmed);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureSentenceEnds(value: string) {
  if (/[.!?]$/.test(value)) return value;

  return `${value}.`;
}

function pickScriptLine(options: string[], seed: string) {
  let total = 0;

  for (const char of seed) {
    total += char.charCodeAt(0);
  }

  return options[total % options.length];
}


function limitWords(value: string, maxWords: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

  if (words.length <= maxWords) return value.replace(/\s+/g, " ").trim();

  return ensureSentenceEnds(words.slice(0, maxWords).join(" "));
}

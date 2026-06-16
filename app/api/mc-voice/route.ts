import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
};

type DemoArtworkAudioLookup = {
  mc_audio_url?: string | null;
};

export async function POST(request: NextRequest) {
  try {
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

    const audioBuffer = await generateElevenLabsAudio({
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId,
      text: mcScript,
    });

    const safeArtworkPart = makeSafeFilePart(artworkId || childName || "intro");
    const filePath = `${auctionCode}/${safeArtworkPart}-${Date.now()}-elevenlabs.mp3`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(MC_AUDIO_BUCKET)
      .upload(filePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: uploadError.message,
          hint: `Make sure the Supabase Storage bucket "${MC_AUDIO_BUCKET}" exists and is public.`,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(MC_AUDIO_BUCKET)
      .getPublicUrl(filePath);

    const audioUrl = publicUrlData.publicUrl;

    if (artworkId) {
      await supabaseAdmin
        .from("demo_artworks")
        .update({
          mc_audio_url: audioUrl,
        })
        .eq("id", artworkId)
        .eq("auction_code", auctionCode);
    }

    return NextResponse.json({
      ok: true,
      reused: false,
      provider: "elevenlabs",
      voiceId,
      audioUrl,
      filePath,
      script: mcScript,
    });
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
    .slice(0, 4500);
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
  childName,
  grade,
}: {
  sourceText: string;
  childName: string;
  grade: string;
}) {
  const cleanStory = makeStoryMoreSpoken(sourceText);

  const introOptions = [
    `Okay everyone, quick pause. This next one is from ${childName}, in ${grade}.`,
    `Alright, have a look at this. Our next artist is ${childName}, from ${grade}.`,
    `Okay BragWall crew, this one is special. It is by ${childName}, from ${grade}.`,
    `Right, eyes on the screen for a second. This masterpiece is from ${childName}, in ${grade}.`,
    `Here we go. Next up, we have something brilliant from ${childName}, from ${grade}.`,
  ];

  const middleOptions = [
    `I love this one because`,
    `The thing that jumps out for me is`,
    `What makes this one so cool is`,
    `Now, the best part is`,
    `This one has real personality because`,
  ];

  const outroOptions = [
    `So, choose your wall now. Bidding opens in a moment.`,
    `If you want bragging rights, get ready. Bidding opens in a moment.`,
    `Parents, grandparents, this is your warning. Bidding opens in a moment.`,
    `Get those bidding fingers ready. Bidding opens in a moment.`,
    `Okay, deep breath. This could get competitive. Bidding opens in a moment.`,
  ];

  const scriptSeed = `${childName}-${grade}-${cleanStory.slice(0, 80)}`;
  const intro = pickScriptLine(introOptions, `${scriptSeed}-intro`);
  const middle = pickScriptLine(middleOptions, `${scriptSeed}-middle`);
  const outro = pickScriptLine(outroOptions, `${scriptSeed}-outro`);

  return `${intro} ${middle} ${cleanStory} ${outro}`;
}

function makeStoryMoreSpoken(sourceText: string) {
  const trimmed = sourceText.trim();

  if (!trimmed) {
    return "it feels full of colour, imagination, and proper young-artist confidence.";
  }

  const withoutAnnouncerPhrases = trimmed
    .replace(/ladies and gentlemen[,!]?/gi, "")
    .replace(/bidding fingers ready[,!]?/gi, "")
    .replace(/masterpiece is coming to the stage[,!]?/gi, "")
    .replace(/take a good look[,!]?/gi, "")
    .replace(/bidding opens in just a moment\.?/gi, "")
    .replace(/bidding opens in a moment\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const shortened = withoutAnnouncerPhrases.slice(0, 650).trim();

  if (!shortened) {
    return "it feels full of colour, imagination, and proper young-artist confidence.";
  }

  return ensureSentenceEnds(shortened);
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

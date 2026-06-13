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
          stability: 0.32,
          similarity_boost: 0.82,
          style: 0.75,
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
  const introOptions = [
    `Alright everyone, eyes up and bidding fingers ready, because our next BragWall masterpiece is coming to the stage! This one is by ${childName}, from ${grade}.`,
    `Ladies and gentlemen, parents, grandparents, aunties, uncles, and serious fridge-door art collectors, get ready! Up next is a very special masterpiece from ${childName}, from ${grade}.`,
    `Okay BragWall bidders, this is not a drill. Our next artist is ${childName}, from ${grade}, and this masterpiece deserves a proper round of attention.`,
    `Here we go, BragWall family! The next artwork is stepping into the spotlight, created by ${childName}, from ${grade}.`,
    `Auction room, get ready. We have another future famous artist on the wall tonight. This masterpiece is by ${childName}, from ${grade}.`,
  ];

  const outroOptions = [
    "Take a good look, choose your wall space now, and warm up those bidding fingers. Bidding opens in just a moment.",
    "If your heart just said, I need this on my wall, then get ready. Bidding opens in just a moment.",
    "Parents, this is the moment where love, pride, and friendly competition become a fundraising superpower. Bidding opens in just a moment.",
    "Look closely, smile proudly, and prepare for battle. The bidding opens in just a moment.",
    "This is your warning: grandparents can be dangerous in an auction. Get ready, because bidding opens in just a moment.",
  ];

  const scriptSeed = `${childName}-${grade}-${sourceText.slice(0, 80)}`;
  const intro = pickScriptLine(introOptions, `${scriptSeed}-intro`);
  const outro = pickScriptLine(outroOptions, `${scriptSeed}-outro`);

  return `${intro} ${sourceText} ${outro}`;
}

function pickScriptLine(options: string[], seed: string) {
  let total = 0;

  for (const char of seed) {
    total += char.charCodeAt(0);
  }

  return options[total % options.length];
}
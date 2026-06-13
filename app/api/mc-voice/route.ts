import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const AUCTION_CODE = "demo";
const MC_AUDIO_BUCKET = "mc-audio";

const MC_VOICES = ["nova", "shimmer", "fable", "verse", "coral"] as const;

type McVoice = (typeof MC_VOICES)[number];

type GenerateMcVoiceRequest = {
  artworkId?: string | null;
  auctionCode?: string | null;
  text?: string | null;
  childName?: string | null;
  grade?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing. Add it to .env.local before generating MC voice.",
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

    if (!sourceText) {
      return NextResponse.json(
        {
          error: "No MC intro text was provided.",
        },
        { status: 400 }
      );
    }

    const selectedVoice = pickMcVoice({
      artworkId,
      childName,
      grade,
      sourceText,
    });

    const mcScript = buildMcScript({
      sourceText,
      childName,
      grade,
    });

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice,
      response_format: "mp3",
      input: mcScript,
      instructions: buildVoiceInstructions(selectedVoice),
    });

    const audioArrayBuffer = await speech.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    const safeArtworkPart = makeSafeFilePart(artworkId || childName || "intro");
    const filePath = `${auctionCode}/${safeArtworkPart}-${Date.now()}-${selectedVoice}.mp3`;

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
      audioUrl,
      filePath,
      script: mcScript,
      voice: selectedVoice,
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

function cleanText(value?: string | null) {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 2200);
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

function pickMcVoice({
  artworkId,
  childName,
  grade,
  sourceText,
}: {
  artworkId: string;
  childName: string;
  grade: string;
  sourceText: string;
}): McVoice {
  const seed = artworkId || `${childName}-${grade}-${sourceText.slice(0, 80)}`;

  let total = 0;

  for (const char of seed) {
    total += char.charCodeAt(0);
  }

  return MC_VOICES[total % MC_VOICES.length];
}

function buildVoiceInstructions(voice: McVoice) {
  const sharedEnergy =
    "Perform as a high-energy BragWall school auction MC. The voice must sound natural, excited, funny, warm, playful, and expressive, like a real live host creating excitement in the room. Use smiling delivery, natural pauses, changes in pace, and little bursts of anticipation. Keep it family-friendly and polished for a school fundraising event. Do not sound robotic, flat, corporate, monotone, bored, or like you are reading a script. Do not imitate any real person or any specific real child. Keep the tone safe, cheerful, and full of auction-night energy.";

  const voiceSpecific: Record<McVoice, string> = {
    nova:
      "Use bright presenter energy. Make it feel like the room is about to cheer. Keep it lively, confident, and upbeat.",
    shimmer:
      "Use sparkling, playful energy. Add a sense of fun and delight, like the artwork is the star of the show.",
    fable:
      "Use a storytelling style with excitement. Make the artwork feel magical, special, and worth fighting for in the bidding.",
    verse:
      "Use expressive stage-host energy. Build rhythm and anticipation before the final bidding line.",
    coral:
      "Use warm, cheeky, friendly energy. Smile through the delivery and make it feel personal and fun.",
  };

  return `${sharedEnergy} ${voiceSpecific[voice]}`;
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
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_ELEVENLABS_VOICE_ID = "0S5oIfi8zOZixuSj8K6n";

const DEFAULT_WELCOME_TEXT =
  "Tonight we are turning school artwork into a live fundraising event with proud parents, dangerous grandparents, competitive uncles, and masterpieces that deserve prime fridge-door real estate.";

export async function GET(request: NextRequest) {
  return generateWelcomeVoice(request);
}

export async function POST(request: NextRequest) {
  return generateWelcomeVoice(request);
}

async function generateWelcomeVoice(request: NextRequest) {
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

    const urlText = request.nextUrl.searchParams.get("text");
    const bodyText =
      request.method === "POST"
        ? await request
            .json()
            .then((body) => (typeof body?.text === "string" ? body.text : ""))
            .catch(() => "")
        : "";

    const inputText = cleanText(urlText) || cleanText(bodyText) || DEFAULT_WELCOME_TEXT;
    const voiceId =
      cleanText(process.env.ELEVENLABS_MC_VOICE_ID) || DEFAULT_ELEVENLABS_VOICE_ID;

    const audioBuffer = await generateElevenLabsAudio({
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId,
      text: buildWelcomeScript(inputText),
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Welcome voice generation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Welcome voice generation failed.",
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
      `ElevenLabs welcome voice failed: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`
    );
  }

  return await response.arrayBuffer();
}

function buildWelcomeScript(sourceText: string) {
  const cleanSource = stripLeadingWelcome(cleanText(sourceText) || DEFAULT_WELCOME_TEXT);

  return removeConsecutiveDuplicateWords(
    [
      "Welcome to BragWall!",
      "Parents, families, and dangerous grandparents, get ready.",
      cleanSource,
      "When bidding opens, back your young artist, enjoy the drama, and remember: this is proudly for the kids.",
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function stripLeadingWelcome(value: string) {
  return value
    .replace(/^welcome\s+to\s+bragwall[.!,:;-]*\s*/i, "")
    .replace(/^welcome[.!,:;-]*\s*/i, "")
    .trim();
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
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

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_WELCOME_TEXT =
  "Welcome to BragWall. Tonight we are turning school artwork into a live fundraising event with proud parents, dangerous grandparents, competitive uncles, and masterpieces that deserve prime fridge-door real estate.";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const inputText =
      typeof body.text === "string" && body.text.trim()
        ? body.text.trim()
        : DEFAULT_WELCOME_TEXT;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "shimmer",
        input: inputText,
        response_format: "mp3",
        instructions:
          "Speak like a playful, warm, slightly theatrical school auction MC at a family fundraising evening. Sound excited, charming, and cheeky, but never childish or cartoonish. Smile while speaking. Add natural pauses after 'Welcome to BragWall' and before the fridge-door joke. Emphasize 'dangerous grandparents', 'competitive uncles', and 'prime fridge-door real estate' with humorous timing. Keep the delivery clear, premium, upbeat, and family appropriate. Do not add extra words.",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Failed to generate welcome voice.",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected voice generation error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
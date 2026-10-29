import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const configuredUrl = process.env.BRAGWALL_WELCOME_AUDIO_URL;
  const mockEnabled = process.env.BRAGWALL_MOCK_ELEVENLABS === "true";

  const audioUrl = mockEnabled
    ? "/sounds/bragwall-mock-mc.wav"
    : configuredUrl;

  if (!audioUrl) {
    return NextResponse.json(
      { error: "Welcome recording is not configured." },
      { status: 503 }
    );
  }

  const redirectUrl = new URL(audioUrl, request.url);

  if (
    !mockEnabled &&
    (!configuredUrl || !configuredUrl.startsWith("https://"))
  ) {
    return NextResponse.json(
      { error: "Invalid welcome recording configuration." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(redirectUrl, {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
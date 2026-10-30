import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";

import { POST as legacyVoice } from "./legacy";
import { POST as modernVoice } from "./modern";

export const runtime = "nodejs";

// BRAGWALL_MC_PRODUCTION_SECURITY_V1
// Legacy audio remains available while new Supabase audio jobs are disabled.
// Verify every request BEFORE invoking the paid voice-generation provider.

type VoiceRequest = {
  artworkId?: string | null;
  auctionCode?: string | null;
  text?: string | null;
};

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim().slice(0, 8000)
    : "";
}

function validAuctionCode(value: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(value);
}

function tokenMatches(expected: string, supplied: string): boolean {
  if (!expected || !supplied) return false;

  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(supplied).digest();

  return timingSafeEqual(a, b);
}

function getExpectedReaction(commentary: string, bidder: string): string {
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

  return options[Math.abs(seed) % options.length];
}

function reject(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  // Modern mode retains its existing validation and audio-job handling.
  if (process.env.BRAGWALL_MC_AUDIO_JOBS_ENABLED === "true") {
    return modernVoice(request);
  }

  let body: VoiceRequest;

  try {
    // Read a clone so the original request body remains available
    // to the legacy voice handler after validation.
    body = (await request.clone().json()) as VoiceRequest;
  } catch {
    return reject("Invalid voice request.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return reject("Invalid voice request.", 400);
  }

  const artworkId = cleanText(body.artworkId);
  const auctionCode = cleanText(body.auctionCode) || "demo";
  const sourceText = cleanText(body.text);

  if (!validAuctionCode(auctionCode)) {
    return reject("Invalid auction code.", 400);
  }

  if (!sourceText || sourceText.length > 3000) {
    return reject("Invalid voice text.", 400);
  }

  if (artworkId) {
    // Artwork introductions are exclusively server-authorised.
    const expected = process.env.BRAGWALL_MC_INTERNAL_TOKEN || "";
    const supplied = request.headers.get("x-bragwall-mc-token") || "";

    if (!tokenMatches(expected, supplied)) {
      return reject("Artwork introduction generation is restricted.", 403);
    }

    return legacyVoice(request);
  }

  // Older open browser tabs must not generate spoken bid reactions.
  return reject("Spoken bid reactions are disabled.", 409);
}
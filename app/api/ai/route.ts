import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || null;
  const session = await verifyAdminSessionToken(token);

  if (!session) {
    return null;
  }

  const allowedEmails = getAllowedAdminEmails();

  if (
    allowedEmails.length > 0 &&
    !allowedEmails.includes(session.email.toLowerCase())
  ) {
    return null;
  }

  return session;
}

export async function POST(request: NextRequest) {
  const adminSession = await requireAdmin(request);

  if (!adminSession) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { childName, grade, artworkNotes } = body as {
    childName?: string;
    grade?: string;
    artworkNotes?: string;
  };

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      intro: "Presenting a proud BragWall artwork from " +
        (childName || "our young artist") +
        " in " +
        (grade || "this grade") +
        ". It is bold, joyful, and ready for a proper school auction moment.",
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a funny, warm South African school auction MC. Write premium but humorous art auction introductions for parents bidding on children's artwork. Keep it under 140 words. Do not be mean. Make every output unique.",
      },
      {
        role: "user",
        content:
          "Child: " +
          (childName || "our young artist") +
          ". Grade: " +
          (grade || "not provided") +
          ". Artwork notes: " +
          (artworkNotes || "No notes provided."),
      },
    ],
  });

  return NextResponse.json({ intro: completion.choices[0]?.message?.content || "" });
}

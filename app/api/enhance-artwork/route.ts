import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

export const runtime = "nodejs";
export const maxDuration = 60;


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

type EnhanceArtworkBody = {
  artworkId?: string;
  imageUrl?: string;
  childName?: string;
  childSurname?: string;
  grade?: string;
};

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function updateArtworkEnhancementStatus({
  artworkId,
  status,
  notes,
  enhancedArtworkUrl,
}: {
  artworkId: string;
  status: string;
  notes: string;
  enhancedArtworkUrl?: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();

  const updatePayload: {
    enhancement_status: string;
    enhancement_notes: string;
    enhanced_artwork_url?: string;
  } = {
    enhancement_status: status,
    enhancement_notes: notes,
  };

  if (enhancedArtworkUrl) {
    updatePayload.enhanced_artwork_url = enhancedArtworkUrl;
  }

  await supabaseAdmin
    .from("demo_artworks")
    .update(updatePayload)
    .eq("id", artworkId);
}

export async function POST(request: NextRequest) {
  let artworkId = "";

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

    const body = (await request.json()) as EnhanceArtworkBody;

    artworkId = body.artworkId || "";
    const imageUrl = body.imageUrl || "";
    const childName = body.childName || "Student";
    const childSurname = body.childSurname || "Artist";
    const grade = body.grade || "School artwork";

    if (!artworkId || !imageUrl) {
      return NextResponse.json(
        {
          error: "Missing artworkId or imageUrl.",
        },
        { status: 400 }
      );
    }

    await updateArtworkEnhancementStatus({
      artworkId,
      status: "processing",
      notes: "Creating enhanced auction-ready artwork image.",
    });

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      await updateArtworkEnhancementStatus({
        artworkId,
        status: "not_enhanced",
        notes: "Using original artwork image.",
      });

      return NextResponse.json(
        {
          error: "Could not download original artwork image.",
        },
        { status: 400 }
      );
    }

    const originalBlob = await imageResponse.blob();

    const prompt = `
Create a premium auction-ready presentation image from this uploaded school artwork photo.

Important rules:
- Preserve the child's actual artwork as faithfully as possible.
- Do not redraw, reinterpret, replace, or add new creative elements inside the child's artwork.
- Improve the photo presentation only: brightness, contrast, clarity, shadows, cropping, and background cleanliness.
- Place the artwork inside a beautiful premium gallery-style frame suitable for a live fundraising auction.
- Use a clean warm gallery background, subtle spotlighting, and a polished BragWall auction feel.
- Keep the final result family friendly, elegant, and authentic.
- Do not add text, names, logos, watermarks, signatures, labels, or prices.
- The image should feel like a framed masterpiece ready for a school auction display.

Artwork details for context only:
Child: ${childName} ${childSurname}
Grade: ${grade}
`.trim();

    const formData = new FormData();
    formData.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    formData.append("image", originalBlob, "source-artwork.png");
    formData.append("prompt", prompt);
    formData.append("size", "1024x1024");
    formData.append("quality", "medium");

    const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();

      await updateArtworkEnhancementStatus({
        artworkId,
        status: "not_enhanced",
        notes: "Using original artwork image.",
      });

      return NextResponse.json(
        {
          error: "AI enhancement failed.",
          details: errorText,
        },
        { status: openAiResponse.status }
      );
    }

    const result = await openAiResponse.json();
    const imageBase64 = result?.data?.[0]?.b64_json;

    if (!imageBase64) {
      await updateArtworkEnhancementStatus({
        artworkId,
        status: "not_enhanced",
        notes: "Using original artwork image.",
      });

      return NextResponse.json(
        {
          error: "AI enhancement did not return an image.",
        },
        { status: 500 }
      );
    }

    const imageBytes = Buffer.from(imageBase64, "base64");
    const supabaseAdmin = createSupabaseAdminClient();

    const safeName = safeFilePart(`${childName}-${childSurname}`) || "artwork";
    const enhancedPath = `enhanced/demo/${Date.now()}-${safeName}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("artworks")
      .upload(enhancedPath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      await updateArtworkEnhancementStatus({
        artworkId,
        status: "not_enhanced",
        notes: "Using original artwork image.",
      });

      return NextResponse.json(
        {
          error: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("artworks")
      .getPublicUrl(enhancedPath);

    const enhancedArtworkUrl = publicUrlData.publicUrl;

    await updateArtworkEnhancementStatus({
      artworkId,
      status: "complete",
      notes:
        "Enhanced auction-ready framed artwork created. Original artwork remains safely stored.",
      enhancedArtworkUrl,
    });

    return NextResponse.json({
      enhancedArtworkUrl,
    });
  } catch (error) {
    if (artworkId) {
      await updateArtworkEnhancementStatus({
        artworkId,
        status: "not_enhanced",
        notes: "Using original artwork image.",
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        error: "Unexpected artwork enhancement error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

type SchoolProfilePayload = {
  auction_code?: string;
  school_name?: string;
  branch_code?: string;
  payment_reference_prefix?: string;
  collection_instructions?: string;
  bid_increment?: number | string | null;
};

const DEFAULT_AUCTION_CODE = "demo";
const DEFAULT_BID_STEP = 100;

function getSafeAuctionCode(value: unknown) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || DEFAULT_AUCTION_CODE;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function getSafeBidIncrement(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BID_STEP;
  }

  return Math.round(parsed);
}

function createSafeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "artwork";
}

function getExtension(fileName: string, fileType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }

  if (fileType === "image/png") return "png";
  if (fileType === "image/webp") return "webp";
  if (fileType === "image/gif") return "gif";

  return "jpg";
}

async function assertAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);

  if (!session) return null;

  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (
    allowedEmails.length > 0 &&
    !allowedEmails.includes(session.email.toLowerCase())
  ) {
    return null;
  }

  return session;
}

async function generateAuctionIntro(request: NextRequest, payload: Record<string, unknown>) {
  try {
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const response = await fetch(`${origin}/api/auction-mc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result?.error || "Could not generate intro.");
    }

    return String(result?.text || "").trim();
  } catch (error) {
    console.error("Could not generate auction intro:", error);
    return "";
  }
}

async function enhanceArtwork(request: NextRequest, payload: Record<string, unknown>) {
  try {
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const response = await fetch(`${origin}/api/enhance-artwork`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message:
          result?.details ||
          result?.error ||
          "Artwork was uploaded, but AI enhancement failed.",
      };
    }

    return { ok: true, message: "Enhanced framed auction version created successfully." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Artwork uploaded, but enhancement failed: ${error.message}`
          : "Artwork uploaded, but enhancement failed.",
    };
  }
}

export async function POST(request: NextRequest) {
  const session = await assertAdmin(request);

  if (!session) {
    return jsonError("Admin login required.", 401);
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const action = String(formData.get("action") || "");
      const auctionCode = getSafeAuctionCode(formData.get("auctionCode"));

      if (action !== "upload-artwork") {
        return jsonError("Unknown setup upload action.");
      }

      const file = formData.get("file");
      const childName = cleanText(formData.get("childName"), 100);
      const childSurname = cleanText(formData.get("childSurname"), 100);
      const grade = cleanText(formData.get("grade"), 60);
      const fallbackPreview = cleanText(formData.get("storyPreview"), 1200);
      const nextSortOrder = getSafeBidIncrement(formData.get("nextSortOrder"));
      const shouldEnhance = String(formData.get("enhanceArtwork") || "false") === "true";

      if (!childName || !childSurname || !grade) {
        return jsonError("Please complete all artwork fields.");
      }

      if (!(file instanceof File)) {
        return jsonError("Please select an artwork image.");
      }

      if (!file.type.startsWith("image/")) {
        return jsonError("Artwork upload must be an image file.");
      }

      const extension = getExtension(file.name, file.type);
      const safeName = createSafeFilePart(`${childName}-${childSurname}`);
      const fileName = `${Date.now()}-${safeName}.${extension}`;
      const filePath = `${auctionCode}/${fileName}`;
      const fileBytes = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from("artworks")
        .upload(filePath, fileBytes, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("artworks")
        .getPublicUrl(filePath);

      const generatedIntro = await generateAuctionIntro(request, {
        mode: "intro",
        childName,
        childSurname,
        grade,
        sortOrder: nextSortOrder,
        fallbackPreview,
      });

      const aiIntro = generatedIntro || fallbackPreview;

      const { data: insertedArtwork, error: insertError } = await supabaseAdmin
        .from("demo_artworks")
        .insert({
          auction_code: auctionCode,
          sort_order: nextSortOrder,
          child_name: childName,
          child_surname: childSurname,
          grade,
          artwork_url: publicUrlData.publicUrl,
          enhanced_artwork_url: null,
          enhancement_status: shouldEnhance ? "processing" : "not_enhanced",
          enhancement_notes: shouldEnhance
            ? "Waiting for AI enhancement."
            : "Original image only.",
          ai_intro: aiIntro,
          status: "pending",
          sold_amount: 0,
          winning_bidder: null,
        })
        .select("*")
        .single();

      if (insertError || !insertedArtwork) {
        throw new Error(insertError?.message || "Could not save artwork.");
      }

      if (shouldEnhance) {
        const enhancement = await enhanceArtwork(request, {
          artworkId: insertedArtwork.id,
          imageUrl: publicUrlData.publicUrl,
          childName,
          childSurname,
          grade,
        });

        return NextResponse.json({
          ok: true,
          message: enhancement.ok
            ? "Artwork added. Enhanced framed auction version created successfully."
            : enhancement.message,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Artwork added to the BragWall auction queue.",
      });
    }

    const body = await request.json().catch(() => null) as
      | { action?: string; profile?: SchoolProfilePayload; artworkId?: string }
      | null;

    if (!body) return jsonError("Invalid JSON body.");

    const action = String(body.action || "");
    const auctionCode = getSafeAuctionCode((body as { auctionCode?: unknown }).auctionCode || body.profile?.auction_code);

    if (action === "save-profile") {
      const profile = body.profile || {};

      const { error } = await supabaseAdmin.from("demo_school_profile").upsert(
        {
          auction_code: auctionCode,
          school_name: cleanText(profile.school_name, 160),
          branch_code: cleanText(profile.branch_code, 80),
          payment_reference_prefix: cleanText(profile.payment_reference_prefix, 80),
          collection_instructions: cleanText(profile.collection_instructions, 1000),
          bid_increment: getSafeBidIncrement(profile.bid_increment),
        },
        { onConflict: "auction_code" }
      );

      if (error) throw new Error(error.message);

      const { error: stateError } = await supabaseAdmin.from("live_auction_state").upsert(
        {
          auction_code: auctionCode,
          child_name: "",
          child_surname: "",
          grade: "",
          artwork_url: "",
          current_bid: 0,
          leading_bidder: "No bids yet",
          status: "waiting",
          status_deadline: null,
          bid_pause_until: null,
          next_bid_amount: getSafeBidIncrement(profile.bid_increment),
          last_bid_at: null,
          winner_email: null,
          winner_email_submitted_at: null,
          mc_commentary: "Welcome to BragWall. The auction is waiting to begin.",
          mc_audio_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auction_code", ignoreDuplicates: true }
      );

      if (stateError) throw new Error(stateError.message);

      return NextResponse.json({
        ok: true,
        message: "School and auction setup saved successfully.",
      });
    }

    if (action === "archive-artwork") {
      const artworkId = cleanText(body.artworkId, 80);

      if (!artworkId) return jsonError("Missing artworkId.");

      const { error } = await supabaseAdmin
        .from("demo_artworks")
        .update({ status: "archived" })
        .eq("auction_code", auctionCode)
        .eq("id", artworkId);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, message: "Artwork has been archived." });
    }

    if (action === "restore-artwork") {
      const artworkId = cleanText(body.artworkId, 80);

      if (!artworkId) return jsonError("Missing artworkId.");

      const { error } = await supabaseAdmin
        .from("demo_artworks")
        .update({ status: "pending" })
        .eq("auction_code", auctionCode)
        .eq("id", artworkId);

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, message: "Artwork has been restored." });
    }

    if (action === "archive-all-unsold") {
      const { error } = await supabaseAdmin
        .from("demo_artworks")
        .update({ status: "archived" })
        .eq("auction_code", auctionCode)
        .neq("status", "sold");

      if (error) throw new Error(error.message);

      return NextResponse.json({
        ok: true,
        message: "All unsold artworks have been moved to the archive.",
      });
    }

    return jsonError("Unknown admin setup action.");
  } catch (error) {
    console.error("Admin setup action failed:", error);
    return jsonError(
      error instanceof Error ? error.message : "Admin setup action failed.",
      500
    );
  }
}

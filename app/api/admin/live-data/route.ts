import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

export const runtime = "nodejs";

type Section =
  | "all"
  | "auction"
  | "profile"
  | "artworks"
  | "bids"
  | "activity";

const allowedSections: Section[] = [
  "all",
  "auction",
  "profile",
  "artworks",
  "bids",
  "activity",
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function isAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);

  if (!session) return false;

  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return (
    allowedEmails.length > 0 &&
    allowedEmails.includes(session.email.toLowerCase())
  );
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json(
      { error: "Administrator login required." },
      { status: 401 }
    );
  }

  const auctionCode = (
    request.nextUrl.searchParams.get("auctionCode") || ""
  )
    .trim()
    .toLowerCase();

  const section = (
    request.nextUrl.searchParams.get("section") || "all"
  ) as Section;

  if (
    !auctionCode ||
    auctionCode.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(auctionCode)
  ) {
    return NextResponse.json(
      { error: "Invalid auction code." },
      { status: 400 }
    );
  }

  if (!allowedSections.includes(section)) {
    return NextResponse.json(
      { error: "Invalid data section." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const result: Record<string, unknown> = {
      auctionCode,
    };

    const tasks: Promise<void>[] = [];

    if (section === "all" || section === "auction") {
      tasks.push(
        (async () => {
          const { data, error } = await supabase
            .from("live_auction_state")
            .select("*")
            .eq("auction_code", auctionCode)
            .maybeSingle();

          if (error) throw error;

          result.auction = data;
        })()
      );
    }

    if (section === "all" || section === "profile") {
      tasks.push(
        (async () => {
          const { data, error } = await supabase
            .from("demo_school_profile")
            .select("auction_code,bid_increment")
            .eq("auction_code", auctionCode)
            .maybeSingle();

          if (error) throw error;

          result.profile = data;
        })()
      );
    }

    if (section === "all" || section === "artworks") {
      tasks.push(
        (async () => {
          const { data, error } = await supabase
            .from("demo_artworks")
            .select("*")
            .eq("auction_code", auctionCode)
            .order("sort_order", { ascending: true });

          if (error) throw error;

          result.artworks = data || [];
        })()
      );
    }

    if (section === "all" || section === "bids") {
      tasks.push(
        (async () => {
          const { data, error } = await supabase
            .from("live_bids")
            .select("*")
            .eq("auction_code", auctionCode)
            .order("amount", { ascending: false })
            .limit(500);

          if (error) throw error;

          result.bids = data || [];
        })()
      );
    }

    if (section === "all" || section === "activity") {
      tasks.push(
        (async () => {
          const { data, error } = await supabase
            .from("live_activity_feed")
            .select("*")
            .eq("auction_code", auctionCode)
            .order("created_at", { ascending: false })
            .limit(12);

          if (error) throw error;

          result.activity = data || [];
        })()
      );
    }

    await Promise.all(tasks);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Admin Live Room data request failed:", error);

    return NextResponse.json(
      { error: "Could not load Live Room information." },
      { status: 500 }
    );
  }
}
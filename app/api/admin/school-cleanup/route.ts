import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin connection is unavailable.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authorize(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token);
  const emails = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(session && emails.includes(session.email.toLowerCase()));
}

function validCode(input: unknown) {
  const code = String(input || "").trim();
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(code) ? code : null;
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const code = validCode(request.nextUrl.searchParams.get("auctionCode"));
  if (!code) return NextResponse.json({ error: "Select a school first." }, { status: 400 });
  const { data, error } = await adminClient().rpc("preview_bragwall_school_cleanup", { p_code: code });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ school: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const code = validCode(body?.auctionCode);
  if (!code || body?.confirmation !== code || typeof body?.counts !== "object" || !body.counts
      || !Number.isSafeInteger(body?.sold) || body.sold < 0) {
    return NextResponse.json({ error: "Preview the school and type its code to confirm." }, { status: 400 });
  }
  const { data, error } = await adminClient().rpc("remove_bragwall_test_school", {
    p_code: code,
    p_confirmation: body.confirmation,
    p_expected_counts: body.counts,
    p_expected_sold: body.sold,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, backupBatch: data });
}

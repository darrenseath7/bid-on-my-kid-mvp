import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
} from "@/lib/adminSession";

function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const { accessToken } = (await request.json()) as { accessToken?: string };

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user?.email) {
      return NextResponse.json({ error: "Invalid admin session." }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();
    const allowedAdminEmails = getAllowedAdminEmails();

    if (allowedAdminEmails.length > 0 && !allowedAdminEmails.includes(email)) {
      return NextResponse.json(
        { error: "This email is not allowed to access BragWall admin." },
        { status: 403 }
      );
    }

    const token = await createAdminSessionToken(email);
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create admin session.",
      },
      { status: 500 }
    );
  }
}

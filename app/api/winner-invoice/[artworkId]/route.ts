import { randomInt, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import {
  createInvoiceSession, invoiceCodeHash, invoiceCookieName, issueWinnerInvoice,
  paymentReady, validInvoiceSession, winnerInvoiceContext,
} from "@/lib/server/winnerInvoice";

const nodemailer = require("nodemailer");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
type Params = { params: Promise<{ artworkId: string }> };

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers });
}

export async function GET(request: NextRequest, { params }: Params) {
  const { artworkId } = await params;
  const token = request.nextUrl.searchParams.get("token") || "";
  try {
    const ctx = await winnerInvoiceContext(artworkId, token);
    if (!ctx) return fail("This invoice link is unavailable.", 404);
    if (!ctx.artwork.winner_email) return NextResponse.json({ status: "waiting" }, { headers });
    if (!(await paymentReady(ctx))) return NextResponse.json({ status: "waiting" }, { headers });
    if (!validInvoiceSession(ctx, request.cookies.get(invoiceCookieName(artworkId))?.value)) {
      return NextResponse.json({ status: "verify" }, { headers });
    }
    const payment = await issueWinnerInvoice(ctx);
    return NextResponse.json({ status: "ready", amount: ctx.artwork.sold_amount, payment }, { headers });
  } catch (error) {
    console.error("Could not load winner invoice:", error);
    return fail("Invoice is being prepared. Please try again later.", 503);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const limited = rateLimit(request, { keyPrefix: "winner-invoice", limit: 12,
    windowMs: 15 * 60 * 1000, message: "Too many requests. Try again later." });
  if (limited) return limited;
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return fail("Invalid request.", 403);
  }
  const { artworkId } = await params;
  const body = await request.json().catch(() => null) as { token?: unknown; action?: unknown; code?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  try {
    const ctx = await winnerInvoiceContext(artworkId, token);
    if (!ctx) return fail("This invoice link is unavailable.", 404);
    if (!ctx.artwork.winner_email) return fail("Waiting for the winning bidder's email.", 409);
    if (!(await paymentReady(ctx))) return fail("Invoice is being prepared. Please try again later.", 409);
    const { data: challenge, error: lookupError } = await ctx.db.from("bragwall_winner_invoice_challenges")
      .select("code_hash,sent_at,expires_at,attempts").eq("artwork_id", artworkId).maybeSingle();
    if (lookupError) throw lookupError;

    if (body?.action === "send") {
      if (challenge && Date.now() - Date.parse(challenge.sent_at) < 60_000) {
        return fail("Please wait a minute before requesting another code.", 429);
      }
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return fail("Email verification is unavailable. Please contact BragWall.", 503);
      }
      const code = String(randomInt(100000, 1000000));
      const { error: upsertError } = await ctx.db.from("bragwall_winner_invoice_challenges")
        .upsert({ artwork_id: artworkId, code_hash: invoiceCodeHash(artworkId, code),
          sent_at: new Date().toISOString(), expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), attempts: 0 });
      if (upsertError) throw upsertError;
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.zoho.com",
          port: Number(process.env.SMTP_PORT || "465"),
          secure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.BRAGWALL_LEADS_FROM || `BragWall <${process.env.SMTP_USER}>`,
          to: ctx.artwork.winner_email,
          subject: "Your BragWall invoice verification code",
          text: `Your invoice verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        });
      } catch (error) {
        await ctx.db.from("bragwall_winner_invoice_challenges").delete()
          .eq("artwork_id", artworkId).eq("code_hash", invoiceCodeHash(artworkId, code));
        throw error;
      }
      return NextResponse.json({ ok: true, message: "We sent a code to the winning bidder's email." }, { headers });
    }

    if (body?.action === "verify") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code) || !challenge ||
          Date.parse(challenge.expires_at) < Date.now() || challenge.attempts >= 5) {
        return fail("Invalid or expired code. Request a new one.", 401);
      }
      const { data: updated, error: attemptError } = await ctx.db.from("bragwall_winner_invoice_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("artwork_id", artworkId).eq("attempts", challenge.attempts)
        .select("artwork_id").maybeSingle();
      if (attemptError) throw attemptError;
      if (!updated) return fail("Please try your code again.", 409);
      const provided = invoiceCodeHash(artworkId, code);
      if (!/^[0-9a-f]{64}$/.test(challenge.code_hash) ||
          !timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(challenge.code_hash, "hex"))) {
        return fail("Invalid or expired code. Request a new one.", 401);
      }
      const { error: deleteError } = await ctx.db.from("bragwall_winner_invoice_challenges")
        .delete().eq("artwork_id", artworkId).eq("code_hash", challenge.code_hash);
      if (deleteError) throw deleteError;
      const session = createInvoiceSession(ctx);
      const response = NextResponse.json({ ok: true }, { headers });
      response.cookies.set(invoiceCookieName(artworkId), session.value, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
        path: "/", expires: new Date(session.expires),
      });
      return response;
    }
    return fail("Unknown invoice action.");
  } catch (error) {
    console.error("Winner invoice verification failed:", error);
    return fail("Could not verify this invoice. Please try again later.", 503);
  }
}

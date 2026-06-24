import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const nodemailer = require("nodemailer");

export const runtime = "nodejs";

type DemoRequestPayload = {
  contactPerson?: unknown;
  contactNumber?: unknown;
  email?: unknown;
  schoolName?: unknown;
  message?: unknown;
};

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 2000);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}


async function saveDemoRequestLead({
  contactPerson,
  contactNumber,
  email,
  schoolName,
  message,
  sourceUrl,
  emailSent,
  emailError,
}: {
  contactPerson: string;
  contactNumber: string;
  email: string;
  schoolName: string;
  message: string;
  sourceUrl: string;
  emailSent: boolean;
  emailError?: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Demo request Supabase backup skipped: missing Supabase env vars.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.from("demo_requests").insert({
    contact_person: contactPerson,
    contact_number: contactNumber,
    email,
    school_name: schoolName,
    message: message || null,
    source_url: sourceUrl,
    email_sent: emailSent,
    email_error: emailError || null,
  });

  if (error) {
    console.error("Demo request Supabase backup failed", error);
  }
}
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as DemoRequestPayload | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const contactPerson = cleanText(body.contactPerson, 120);
    const contactNumber = cleanText(body.contactNumber, 80);
    const email = cleanText(body.email, 160).toLowerCase();
    const schoolName = cleanText(body.schoolName, 180);
    const message = cleanMessage(body.message);

    if (!contactPerson || !contactNumber || !email || !schoolName) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST || "smtp.zoho.com";
    const smtpPort = Number(process.env.SMTP_PORT || "465");
    const smtpSecure = (process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const leadsTo = process.env.BRAGWALL_LEADS_TO || "darren@bragwall.co.za";
    const leadsFrom = process.env.BRAGWALL_LEADS_FROM || "BragWall Website <info@bragwall.co.za>";

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ error: "Lead email is not configured yet." }, { status: 500 });
    }

    const submittedAt = new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const pageUrl = request.headers.get("referer") || "BragWall website";
    const subject = `New BragWall demo request - ${schoolName}`;
    const text = [
      "New BragWall demo request",
      "",
      `Contact person: ${contactPerson}`,
      `Contact number: ${contactNumber}`,
      `Email address: ${email}`,
      `School name: ${schoolName}`,
      `Submitted: ${submittedAt}`,
      `Source: ${pageUrl}`,
      "",
      "Message:",
      message || "No message supplied.",
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#07152b">
        <h2 style="margin:0 0 16px;color:#07152b">New BragWall demo request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:640px">
          <tr><td style="padding:8px 0;font-weight:700">Contact person</td><td style="padding:8px 0">${escapeHtml(contactPerson)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Contact number</td><td style="padding:8px 0">${escapeHtml(contactNumber)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Email address</td><td style="padding:8px 0">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">School name</td><td style="padding:8px 0">${escapeHtml(schoolName)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Submitted</td><td style="padding:8px 0">${escapeHtml(submittedAt)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Source</td><td style="padding:8px 0">${escapeHtml(pageUrl)}</td></tr>
        </table>
        <h3 style="margin:20px 0 8px;color:#07152b">Message</h3>
        <div style="white-space:pre-wrap;border:1px solid #d9e2ef;border-radius:12px;padding:14px;background:#f7fafc">${escapeHtml(message || "No message supplied.")}</div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: leadsFrom,
        to: leadsTo,
        replyTo: email,
        subject,
        text,
        html,
      });

      await saveDemoRequestLead({
        contactPerson,
        contactNumber,
        email,
        schoolName,
        message,
        sourceUrl: pageUrl,
        emailSent: true,
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      const emailError = error instanceof Error ? error.message : "Unknown email error";

      await saveDemoRequestLead({
        contactPerson,
        contactNumber,
        email,
        schoolName,
        message,
        sourceUrl: pageUrl,
        emailSent: false,
        emailError,
      });

      throw error;
    }
  } catch (error) {
    console.error("Demo request email failed", error);
    return NextResponse.json({ error: "We could not send the request. Please try again." }, { status: 500 });
  }
}


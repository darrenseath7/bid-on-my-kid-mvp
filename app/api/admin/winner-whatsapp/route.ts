import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";
import { winnerDb, winnerToken } from "@/lib/server/winnerWhatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!session || !allowed.includes(session.email.toLowerCase())) {
    return fail("Admin login required.", 401);
  }

  const body = await request.json().catch(() => null);
  const artworkId = String(body?.artworkId || "");
  const auctionCode = String(body?.auctionCode || "").trim().toLowerCase();
  if (!uuid.test(artworkId) || !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(auctionCode)) {
    return fail("Invalid artwork or auction.", 400);
  }

  // Preview links must stay on the Preview deployment even if a shared
  // BRAGWALL_PUBLIC_URL happens to point to the production domain.
  const publicUrl = process.env.VERCEL_ENV === "preview"
    ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
    : (process.env.BRAGWALL_PUBLIC_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""));
  let origin: URL;
  try {
    origin = new URL(publicUrl);
    if (origin.protocol !== "https:" || !origin.hostname || origin.username || origin.password) {
      return fail("Winner page URL is not configured.", 503);
    }
  } catch {
    return fail("Winner page URL is not configured.", 503);
  }

  try {
    const db = winnerDb();
    const [queued, artwork] = await Promise.all([
      db.from("auction_winner_whatsapp")
        .select("bidder_contact_id,auction_code")
        .eq("artwork_id", artworkId).eq("auction_code", auctionCode).maybeSingle(),
      db.from("demo_artworks")
        .select("status,winning_bidder,auction_code,child_name,child_surname")
        .eq("id", artworkId).eq("auction_code", auctionCode).maybeSingle(),
    ]);
    if (queued.error || artwork.error) throw queued.error || artwork.error;
    if (!queued.data || artwork.data?.status !== "sold") {
      return fail("No opted-in winner is recorded for this sold artwork.", 404);
    }

    const { data: contact, error: contactError } = await db
      .from("auction_bidder_contacts")
      .select("bidder_name,bidder_phone_e164,whatsapp_opt_in_at")
      .eq("id", queued.data.bidder_contact_id).eq("auction_code", auctionCode).maybeSingle();
    if (contactError) throw contactError;
    if (!contact?.whatsapp_opt_in_at || !/^\+[1-9]\d{7,14}$/.test(contact.bidder_phone_e164 || "") ||
        String(artwork.data.winning_bidder || "").trim().toLowerCase() !==
        String(contact.bidder_name || "").trim().toLowerCase()) {
      return fail("The recorded winner has no valid WhatsApp consent or number.", 409);
    }

    const token = winnerToken(artworkId, queued.data.bidder_contact_id);
    if (!token) return fail("Winner link is not configured.", 503);
    const soldPage = new URL(`/winner/${artworkId}`, origin);
    soldPage.searchParams.set("token", token);
    const rawFirstName = String(contact.bidder_name || "").trim().split(/\s+/)[0];
    const firstName = rawFirstName
      ? rawFirstName.charAt(0).toLocaleUpperCase() + rawFirstName.slice(1)
      : "Winner";
    const artistName = [artwork.data.child_name, artwork.data.child_surname].filter(Boolean).join(" ").trim();
    const artworkCredit = artistName ? `${artistName}'s artwork` : "a young artist's artwork";
    const message = `${firstName}, you did it! Your bid won ${artworkCredit}.\n\nYour support gives a young artist a moment worth celebrating. Open your SOLD moment to see the artwork, hear the MC and save your keepsake:\n${soldPage.toString()}`;
    const cardUrl = new URL(`/api/winner-keepsake/${artworkId}`, origin);
    cardUrl.searchParams.set("token", token);
    cardUrl.searchParams.set("variant", "share");
    const phone = contact.bidder_phone_e164.slice(1);
    const chatUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return NextResponse.json({ chatUrl, cardUrl: cardUrl.pathname + cardUrl.search }, { headers: noStore });
  } catch (error) {
    console.error("Could not prepare winner WhatsApp:", error);
    return fail("Could not prepare the winner message. Please try again.", 500);
  }
}

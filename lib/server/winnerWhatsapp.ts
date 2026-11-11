import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";


export function winnerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing database configuration");
  return createClient<any, "public">(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Db = ReturnType<typeof winnerDb>;

export function winnerToken(artworkId: string, contactId: string): string | null {
  const secret = process.env.BRAGWALL_WINNER_LINK_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret).update(`winner:v1:${artworkId}:${contactId}`).digest("hex");
}

export function validWinnerToken(artworkId: string, contactId: string, received: string): boolean {
  const expected = winnerToken(artworkId, contactId);
  if (!expected || !/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export async function queueWinnerWhatsapp(
  db: Db,
  auctionCode: string,
  artworkId: string,
  contactId: string | null | undefined
) {
  if (!contactId) return;
  const { data: contact, error: contactError } = await db
    .from("auction_bidder_contacts")
    .select("id,bidder_name,bidder_phone_e164,whatsapp_opt_in_at")
    .eq("id", contactId).eq("auction_code", auctionCode).maybeSingle();
  if (contactError) throw contactError;
  if (!contact?.bidder_phone_e164 || !contact?.whatsapp_opt_in_at) return;

  const { data: art, error: artError } = await db
    .from("demo_artworks")
    .select("id,status,winning_bidder")
    .eq("id", artworkId).eq("auction_code", auctionCode).maybeSingle();
  if (artError) throw artError;
  if (art?.status !== "sold") return;
  if (String(art.winning_bidder || "").trim().toLowerCase() !==
      String(contact.bidder_name || "").trim().toLowerCase()) return;

  const { error } = await db.from("auction_winner_whatsapp").upsert({
    artwork_id: artworkId,
    auction_code: auctionCode,
    bidder_contact_id: contactId,
  }, { onConflict: "artwork_id", ignoreDuplicates: true });
  if (error) throw error;
}

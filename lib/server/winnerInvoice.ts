import { createHmac, timingSafeEqual } from "node:crypto";
import { winnerDb, validWinnerToken } from "@/lib/server/winnerWhatsapp";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const secret = () => process.env.BRAGWALL_WINNER_LINK_SECRET || "";

export type WinnerInvoiceContext = {
  db: ReturnType<typeof winnerDb>;
  contactId: string;
  auctionCode: string;
  artwork: {
    id: string;
    auction_code: string;
    status: string;
    child_name: string;
    child_surname: string;
    grade: string | null;
    sold_amount: number;
    winning_bidder: string;
    winner_email: string | null;
  };
};

export async function winnerInvoiceContext(artworkId: string, token: string): Promise<WinnerInvoiceContext | null> {
  if (!uuid.test(artworkId) || !token) return null;
  const db = winnerDb();
  const { data: link, error: linkError } = await db.from("auction_winner_whatsapp")
    .select("bidder_contact_id,auction_code").eq("artwork_id", artworkId).maybeSingle();
  if (linkError || !link || !validWinnerToken(artworkId, link.bidder_contact_id, token)) return null;
  const { data: art, error: artworkError } = await db.from("demo_artworks")
    .select("id,auction_code,status,child_name,child_surname,grade,sold_amount,winning_bidder,winner_email")
    .eq("id", artworkId).eq("auction_code", link.auction_code).maybeSingle();
  if (artworkError || !art || art.status !== "sold" ||
      !Number.isFinite(Number(art.sold_amount)) || Number(art.sold_amount) <= 0) return null;
  return { db, contactId: link.bidder_contact_id, auctionCode: link.auction_code, artwork: art };
}

export async function paymentReady(ctx: WinnerInvoiceContext): Promise<boolean> {
  const { data: issued, error: issuedError } = await ctx.db.from("bragwall_invoice_payment_snapshot")
    .select("artwork_id").eq("artwork_id", ctx.artwork.id).maybeSingle();
  if (issuedError) throw issuedError;
  if (issued) return true;
  const { data: school, error } = await ctx.db.from("bragwall_school_payment")
    .select("payment_route").eq("auction_code", ctx.auctionCode).maybeSingle();
  if (error) throw error;
  if (!school) return false;
  if (school.payment_route === "school") return true;
  const { data: platform, error: platformError } = await ctx.db.from("bragwall_platform_bank")
    .select("id").eq("id", true).maybeSingle();
  if (platformError) throw platformError;
  return !!platform;
}

export type IssuedInvoice = {
  payment_route: "school" | "bragwall";
  payment_reference: string;
  account_holder: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: string;
  issued_at: string;
};

export async function issueWinnerInvoice(ctx: WinnerInvoiceContext): Promise<IssuedInvoice> {
  const { data, error } = await ctx.db.rpc("bragwall_issue_invoice_payment", {
    p_code: ctx.auctionCode, p_artwork: ctx.artwork.id,
  });
  if (error) throw error;
  const invoice = (Array.isArray(data) ? data[0] : data) as IssuedInvoice | null;
  if (!invoice || !invoice.payment_reference || !invoice.account_holder ||
      !invoice.bank_name || !invoice.account_number || !invoice.branch_code) {
    throw new Error("Invoice details are not ready yet.");
  }
  return invoice;
}

export function invoiceCookieName(artworkId: string) {
  return `bragwall_invoice_${artworkId}`;
}

export function createInvoiceSession(ctx: WinnerInvoiceContext) {
  const expires = Date.now() + 20 * 60 * 1000;
  const value = `${ctx.artwork.id}:${ctx.contactId}:${expires}`;
  const signature = createHmac("sha256", secret())
    .update(`invoice:v1:${value}:${ctx.artwork.winner_email || ""}`).digest("hex");
  return { value: `${value}:${signature}`, expires };
}

export function validInvoiceSession(ctx: WinnerInvoiceContext, received?: string): boolean {
  if (!received || secret().length < 32) return false;
  const [id, contact, expires, signature, ...extra] = received.split(":");
  if (extra.length || id !== ctx.artwork.id || contact !== ctx.contactId ||
      !/^\d{13}$/.test(expires || "") || Number(expires) < Date.now() ||
      !/^[0-9a-f]{64}$/.test(signature || "")) return false;
  const expected = createHmac("sha256", secret())
    .update(`invoice:v1:${id}:${contact}:${expires}:${ctx.artwork.winner_email || ""}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export function invoiceCodeHash(artworkId: string, code: string) {
  return createHmac("sha256", secret()).update(`invoice-code:v1:${artworkId}:${code}`).digest("hex");
}

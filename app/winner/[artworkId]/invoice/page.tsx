import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { invoiceCookieName, issueWinnerInvoice, validInvoiceSession, winnerInvoiceContext } from "@/lib/server/winnerInvoice";
import PrintInvoiceButton from "./PrintInvoiceButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "BragWall invoice", robots: { index: false, follow: false }, referrer: "no-referrer" };
type Props = { params: Promise<{ artworkId: string }>; searchParams: Promise<{ token?: string }> };

export default async function WinnerInvoicePrint({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { token } = await searchParams;
  const ctx = await winnerInvoiceContext(artworkId, token || "");
  if (!ctx || !ctx.artwork.winner_email ||
      !validInvoiceSession(ctx, (await cookies()).get(invoiceCookieName(artworkId))?.value)) notFound();

  let invoice;
  try { invoice = await issueWinnerInvoice(ctx); }
  catch { return <main className="mx-auto max-w-xl p-8">Your invoice is being prepared. Please try again later.</main>; }
  const { data: profile } = await ctx.db.from("demo_school_profile")
    .select("school_name").eq("auction_code", ctx.auctionCode).maybeSingle();
  const amount = `R${Number(ctx.artwork.sold_amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  const issued = new Date(invoice.issued_at).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium" });

  return <main className="min-h-screen bg-[#e9edf2] px-4 py-8 text-[#07152b] print:bg-white print:p-0">
    <div className="mx-auto max-w-3xl">
      <PrintInvoiceButton />
      <article className="rounded-2xl bg-white p-7 shadow-xl sm:p-12 print:rounded-none print:p-2 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-[#16d66d] pb-7">
          <div><h1 className="text-3xl font-black">BragWall</h1><p className="text-sm text-slate-500">Young art. Big pride.</p></div>
          <div className="text-right"><p className="text-2xl font-black">INVOICE</p><p className="mt-1 text-sm text-slate-500">{issued}</p></div>
        </header>
        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div><p className="text-xs font-black uppercase text-slate-500">Auction school</p><p className="mt-1 font-bold">{profile?.school_name || ctx.auctionCode}</p></div>
          <div><p className="text-xs font-black uppercase text-slate-500">Winning bidder</p><p className="mt-1 font-bold">{ctx.artwork.winning_bidder}</p><p className="mt-1 break-all text-sm text-slate-600">{ctx.artwork.winner_email}</p></div>
        </div>
        <div className="mt-8 rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-black uppercase text-slate-500">Artwork by</p>
          <p className="mt-1 text-lg font-black">{ctx.artwork.child_name} {ctx.artwork.child_surname}</p>
          <p className="text-sm text-slate-500">{ctx.artwork.grade || "School artwork"}</p>
          <div className="mt-5 flex justify-between border-t pt-4"><span className="font-bold">Winning bid / amount due</span><span className="text-xl font-black">{amount}</span></div>
        </div>
        <div className="mt-8 rounded-xl bg-[#07152b] p-6 text-white print:border print:border-slate-300 print:bg-white print:text-[#07152b]">
          <h2 className="text-lg font-black">Payment details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {([['Reference',invoice.payment_reference],['Account holder',invoice.account_holder],
              ['Bank',invoice.bank_name],['Account number',invoice.account_number],
              ['Branch code',invoice.branch_code],['Account type',invoice.account_type]] as const).map(([key,value]) =>
              <div key={key}><dt className="text-xs text-slate-400 print:text-slate-500">{key}</dt><dd className="break-all font-bold">{value}</dd></div>)}
          </dl>
        </div>
        <p className="mt-7 text-sm text-slate-600">Please use the exact reference when paying. BragWall will confirm collection once payment has been received.</p>
      </article>
    </div>
  </main>;
}

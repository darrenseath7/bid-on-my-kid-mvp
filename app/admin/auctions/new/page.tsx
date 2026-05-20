import { AppShell } from '@/components/AppShell';

export default function CreateAuctionPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-zesty">New Auction</p>
        <h1 className="text-4xl font-black">Create school auction</h1>
        <form className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-sm">
          <label className="block">
            <span className="font-bold">Auction title</span>
            <input className="mt-2 w-full rounded-xl border p-3" placeholder="Grade 2 Masterpieces Night" />
          </label>
          <label className="block">
            <span className="font-bold">Grade</span>
            <input className="mt-2 w-full rounded-xl border p-3" placeholder="Grade 2" />
          </label>
          <label className="block">
            <span className="font-bold">Scheduled date/time</span>
            <input type="datetime-local" className="mt-2 w-full rounded-xl border p-3" />
          </label>
          <button type="button" className="rounded-2xl bg-ink px-5 py-3 font-bold text-white">Save draft</button>
        </form>
      </div>
    </AppShell>
  );
}

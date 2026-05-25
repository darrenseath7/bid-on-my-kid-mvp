import BrandHeader from "@/components/BrandHeader";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b]">
      <div className="grid lg:grid-cols-[260px_1fr] min-h-screen">
        <aside className="hidden lg:flex bg-[#07152b] text-white p-6 flex-col">
          <div className="bg-white rounded-2xl p-4 mb-8">
            <BrandHeader center />
          </div>

          <nav className="space-y-2 text-sm font-bold">
            <a className="block rounded-2xl bg-white/10 px-4 py-3" href="/admin">
              Dashboard
            </a>
            <a className="block rounded-2xl px-4 py-3 hover:bg-white/10" href="/admin/live">
              Live Auction
            </a>
            <a className="block rounded-2xl px-4 py-3 hover:bg-white/10" href="/admin/artworks">
              Artworks
            </a>
            <a className="block rounded-2xl px-4 py-3 hover:bg-white/10" href="/admin/school">
              School Profile
            </a>
            <a className="block rounded-2xl px-4 py-3 hover:bg-white/10" href="/auction/winner">
              Winner Certificate
            </a>
          </nav>

          <div className="mt-auto text-xs text-white/40">
            Young Art • Big Pride
          </div>
        </aside>

        <section className="p-6 lg:p-10">
          <div className="lg:hidden mb-8">
            <BrandHeader />
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <h1 className="text-5xl font-black mb-2">
                Dashboard
              </h1>

              <p className="text-slate-500 text-lg">
                Welcome back. Here’s what’s happening at BragWall.
              </p>
            </div>

            <a
              href="/admin/live"
              className="bg-[#07152b] text-white rounded-2xl px-7 py-4 font-black shadow-xl text-center"
            >
              Start Live Auction
            </a>
          </div>

          <div className="grid md:grid-cols-4 gap-5 mb-8">
            <StatCard label="Total Raised" value="R125,000" icon="💸" />
            <StatCard label="Auctions Run" value="12" icon="🎯" />
            <StatCard label="Artworks Sold" value="347" icon="🖼️" />
            <StatCard label="Active Auction" value="Grade 3" icon="🟢" />
          </div>

          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-black mb-5">
              Quick Actions
            </h2>

            <div className="grid md:grid-cols-4 gap-4">
              <ActionCard
                title="Upload Artwork"
                description="Add new artworks to the queue"
                href="/admin/artworks"
                icon="🎨"
              />
              <ActionCard
                title="Live Control Room"
                description="Open the live auction room"
                href="/admin/live"
                icon="📡"
              />
              <ActionCard
                title="School Profile"
                description="Edit banking and details"
                href="/admin/school"
                icon="🏫"
              />
              <ActionCard
                title="Winner Certificate"
                description="View certificate and payment"
                href="/auction/winner"
                icon="🏆"
              />
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black">
                Upcoming Auctions
              </h2>
            </div>

            <AuctionRow
              title="Grade 3 Art Auction"
              meta="St Johns Primary • Tonight • 19:00"
              badge="LIVE NOW"
              href="/admin/live"
              action="Open"
            />

            <AuctionRow
              title="Grade 5 Art Auction"
              meta="Kingsmead College • Friday • 18:30"
              badge="Draft"
              href="/admin/artworks"
              action="View"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-[28px] border border-black/5 shadow-sm p-6">
      <div className="w-11 h-11 rounded-2xl bg-[#f7f5f0] flex items-center justify-center mb-5 text-xl">
        {icon}
      </div>

      <p className="text-slate-500 text-sm mb-2">
        {label}
      </p>

      <h3 className="text-3xl font-black">
        {value}
      </h3>

      <p className="text-xs text-slate-400 mt-2">
        All time
      </p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-[24px] border border-slate-100 p-5 hover:shadow-lg transition bg-white"
    >
      <div className="text-2xl mb-4">{icon}</div>

      <h3 className="font-black mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-500">
        {description}
      </p>
    </a>
  );
}

function AuctionRow({
  title,
  meta,
  badge,
  href,
  action,
}: {
  title: string;
  meta: string;
  badge: string;
  href: string;
  action: string;
}) {
  return (
    <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 last:border-b-0">
      <div>
        <h3 className="text-xl font-black">
          {title}
        </h3>

        <p className="text-slate-500">
          {meta}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="rounded-full bg-green-100 text-green-700 px-4 py-2 text-xs font-black">
          {badge}
        </span>

        <a
          href={href}
          className="bg-[#07152b] text-white rounded-2xl px-7 py-3 font-black"
        >
          {action}
        </a>
      </div>
    </div>
  );
}
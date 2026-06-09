import BrandHeader from "@/components/BrandHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbf8f1] text-[#07152b]">
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-6 mb-16">
          <BrandHeader />

          <div className="flex gap-4">
            <a
              href="/admin"
              className="hidden sm:block rounded-2xl bg-white border border-black/10 px-7 py-4 font-black shadow-lg hover:shadow-xl transition"
            >
              Admin / Control Room
            </a>

            <a
              href="/auction/demo"
              className="rounded-2xl bg-[#07152b] text-white px-7 py-4 font-black shadow-xl hover:scale-[1.02] transition"
            >
              Join Auction
            </a>
          </div>
        </div>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-14 items-center mb-14">
          <div>
            <p className="uppercase tracking-[0.35em] text-xs font-black text-[#0b63ce] mb-6">
              Young Art • Big Pride
            </p>

            <h1 className="text-6xl md:text-8xl font-black leading-[0.88] tracking-tight mb-8">
              Turn school art into a{" "}
              <span className="text-[#0b63ce]">
                live fundraising
              </span>{" "}
              event.
            </h1>

            <div className="w-20 h-1 bg-[#c99421] mb-8" />

            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl">
              BragWall helps schools run mobile-first live art auctions with
              real-time bidding, AI auction commentary, premium artwork
              presentation, and downloadable winner certificates.
            </p>
          </div>

          <AuctionPreview />
        </div>

        <div className="grid md:grid-cols-4 gap-6 pb-10">
          <Feature
            icon="⚡"
            title="Real-time bidding"
            text="Instant bids. Live leaderboards. Everyone sees the action."
          />

          <Feature
            icon="💬"
            title="AI Auctioneer"
            text="Engaging commentary keeps the energy high."
          />

          <Feature
            icon="🖼️"
            title="Premium presentation"
            text="Showcase every artwork like a masterpiece."
          />

          <Feature
            icon="🏆"
            title="Winner certificates"
            text="Downloadable keepsakes for proud families."
          />
        </div>
      </section>
    </main>
  );
}

function AuctionPreview() {
  const previewImage =
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop";

  return (
    <div className="bg-[#07152b] rounded-[36px] p-6 shadow-2xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="text-[#16d66d] font-black tracking-[0.25em] uppercase text-sm">
          ● Live Auction
        </div>

        <div className="bg-[#16d66d]/15 text-[#16d66d] rounded-full px-4 py-2 font-black text-sm">
          Auction Live
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_0.65fr] gap-6">
        <div className="bg-[#fbf8f1] rounded-[28px] p-6">
          <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-3">
            Current Artwork
          </p>

          <h2 className="text-3xl font-black mb-5">
            Sunset Safari
          </h2>

          <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-3 rounded-[22px]">
            <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-2 rounded-[18px]">
              <img
                src={previewImage}
                alt="Artwork Preview"
                className="w-full h-56 object-cover rounded-[14px]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white/10 rounded-[24px] p-6">
            <p className="uppercase tracking-[0.25em] text-xs text-white/50 font-black mb-3">
              Current Bid
            </p>

            <p className="text-5xl font-black text-[#16d66d]">
              R1,200
            </p>

            <p className="uppercase tracking-[0.25em] text-xs text-white/50 font-black mt-6 mb-2">
              Leading Bidder
            </p>

            <p className="text-3xl font-black text-white">
              Darren
            </p>
          </div>

          <div className="bg-white/10 rounded-[24px] p-6">
            <p className="uppercase tracking-[0.25em] text-xs text-white/50 font-black mb-3">
              Time Remaining
            </p>

            <p className="text-5xl font-black text-[#ffc107]">
              00:12
            </p>

            <p className="uppercase tracking-[0.25em] text-sm text-[#ffc107] font-black mt-3">
              Going Once!
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 bg-white/10 rounded-2xl overflow-hidden grid md:grid-cols-[190px_1fr_auto]">
        <div className="px-5 py-4 text-[#ffc107] font-black uppercase tracking-[0.2em]">
          ⚡ Live Activity
        </div>

        <div className="px-5 py-4 text-white font-bold">
          Sarah J. just placed a bid of R1,200
        </div>

        <div className="px-5 py-4 text-white/40">
          2m ago
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 bg-white/50 rounded-[24px] p-5 border border-black/5">
      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-3xl shrink-0">
        {icon}
      </div>

      <div>
        <h4 className="uppercase tracking-[0.15em] text-sm font-black mb-2">
          {title}
        </h4>

        <p className="text-slate-600">
          {text}
        </p>
      </div>
    </div>
  );
}
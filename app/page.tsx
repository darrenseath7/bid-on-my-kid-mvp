import BrandHeader from "@/components/BrandHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b]">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-16">
          <BrandHeader />

          <div className="hidden md:flex gap-3">
            <a
              href="/admin"
              className="rounded-2xl border border-[#07152b]/15 bg-white px-5 py-3 font-black shadow-sm"
            >
              Admin
            </a>

            <a
              href="/auction/demo"
              className="rounded-2xl bg-[#07152b] text-white px-5 py-3 font-black shadow-xl"
            >
              Join Demo Auction
            </a>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="uppercase tracking-[0.35em] text-xs font-black text-[#2878cf] mb-5">
              Young Art • Big Pride
            </p>

            <h1 className="text-6xl md:text-8xl font-black leading-[0.92] tracking-tight mb-8">
              Turn school art into a live fundraising event.
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed mb-10 max-w-2xl">
              BragWall helps schools run mobile-first live art auctions with
              real-time bidding, AI auction commentary, premium artwork
              presentation, and downloadable winner certificates.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/admin/live"
                className="rounded-2xl bg-[#07152b] text-white px-8 py-5 font-black text-lg shadow-xl text-center"
              >
                Open Live Control Room
              </a>

              <a
                href="/auction/demo"
                className="rounded-2xl bg-white border border-[#07152b]/15 px-8 py-5 font-black text-lg shadow-sm text-center"
              >
                Try Parent Bidding
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-[40px] p-6 shadow-2xl border border-black/5">
              <div className="rounded-[32px] bg-[#07152b] text-white p-6">
                <div className="flex justify-center mb-6">
                  <img
                    src="/bragwall-logo.png"
                    alt="BragWall"
                    className="h-16 w-auto bg-white rounded-2xl px-4 py-2"
                  />
                </div>

                <div className="bg-white text-[#07152b] rounded-[28px] p-5 mb-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-black mb-2">
                    Current Artwork
                  </p>

                  <h2 className="text-3xl font-black mb-4">
                    Sunset Safari
                  </h2>

                  <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-4 rounded-[26px]">
                    <div className="bg-[#f6e7b8] p-3 rounded-[20px]">
                      <div className="bg-white p-4 rounded-[16px]">
                        <div className="h-60 rounded-xl bg-gradient-to-br from-orange-400 via-red-500 to-slate-900" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white/10 rounded-2xl p-5">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
                      Current Bid
                    </p>
                    <p className="text-4xl font-black text-[#16d66d]">
                      R1,200
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-5">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
                      Leading Bidder
                    </p>
                    <p className="text-3xl font-black">Darren</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#19b85d] text-center py-4 font-black">
                    +R100
                  </div>
                  <div className="rounded-2xl bg-[#ffc107] text-black text-center py-4 font-black">
                    +R200
                  </div>
                  <div className="rounded-2xl bg-[#ef2b20] text-center py-4 font-black">
                    +R300
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-8 -left-8 bg-white rounded-3xl p-6 shadow-xl border hidden md:block">
              <p className="text-sm text-slate-500 mb-2">Raised tonight</p>
              <p className="text-4xl font-black">R125,000</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
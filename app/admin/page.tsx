export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-100 p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2">
              Bid On My Kid
            </p>

            <h1 className="text-5xl font-black">
              School Admin Dashboard
            </h1>
          </div>

          <button className="bg-black text-white px-6 py-4 rounded-2xl font-bold shadow-lg">
            Create Auction
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <p className="text-sm text-neutral-500 mb-2">
              Total Raised
            </p>

            <h2 className="text-4xl font-black">
              R125,000
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <p className="text-sm text-neutral-500 mb-2">
              Auctions Run
            </p>

            <h2 className="text-4xl font-black">
              12
            </h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <p className="text-sm text-neutral-500 mb-2">
              Artworks Sold
            </p>

            <h2 className="text-4xl font-black">
              347
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-black">
              Upcoming Auctions
            </h2>
          </div>

          <div className="divide-y">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl">
                  Grade 3 Art Auction
                </h3>

                <p className="text-neutral-500">
                  St Johns Primary • Tonight • 19:00
                </p>
              </div>

              <a
                href="/admin/live"
                className="bg-black text-white px-5 py-3 rounded-2xl font-bold"
              >
                Open Auction
              </a>
            </div>

            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl">
                  Grade 5 Art Auction
                </h3>

                <p className="text-neutral-500">
                  Kingsmead College • Friday • 18:30
                </p>
              </div>

              <button className="border px-5 py-3 rounded-2xl font-bold">
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
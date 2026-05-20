export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-12">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs font-bold mb-3">
              Bid On My Kid
            </p>

            <h1 className="text-6xl font-black">
              School Admin Dashboard
            </h1>
          </div>

          <a
            href="/admin/artworks"
            className="bg-black text-white rounded-2xl px-8 py-5 font-black shadow-xl"
          >
            Upload Artwork
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border rounded-3xl p-8">
            <p className="text-neutral-500 mb-4">Total Raised</p>
            <h2 className="text-4xl font-black">R125,000</h2>
          </div>

          <div className="bg-white border rounded-3xl p-8">
            <p className="text-neutral-500 mb-4">Auctions Run</p>
            <h2 className="text-4xl font-black">12</h2>
          </div>

          <div className="bg-white border rounded-3xl p-8">
            <p className="text-neutral-500 mb-4">Artworks Sold</p>
            <h2 className="text-4xl font-black">347</h2>
          </div>
        </div>

        <div className="bg-white border rounded-3xl overflow-hidden mb-10">
          <div className="p-8 border-b">
            <h2 className="text-3xl font-black">
              Auction Controls
            </h2>
          </div>

          <div className="divide-y">
            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">
                  Grade 3 Art Auction
                </h3>
                <p className="text-neutral-500">
                  Demo auction • Live test event
                </p>
              </div>

              <a
                href="/admin/live"
                className="bg-black text-white rounded-2xl px-8 py-4 font-black"
              >
                Open Auction
              </a>
            </div>

            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">
                  Upload Artwork
                </h3>
                <p className="text-neutral-500">
                  Add new artworks to the live queue
                </p>
              </div>

              <a
                href="/admin/artworks"
                className="border border-black rounded-2xl px-8 py-4 font-black"
              >
                Upload
              </a>
            </div>

            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">
                  School Profile
                </h3>
                <p className="text-neutral-500">
                  Edit banking and collection details
                </p>
              </div>

              <a
                href="/admin/school"
                className="border border-black rounded-2xl px-8 py-4 font-black"
              >
                Edit
              </a>
            </div>

            <div className="p-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">
                  Winner Certificate
                </h3>
                <p className="text-neutral-500">
                  View certificate and invoice page
                </p>
              </div>

              <a
                href="/auction/winner"
                className="border border-black rounded-2xl px-8 py-4 font-black"
              >
                View
              </a>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <a href="/auction/demo" className="font-bold underline">
            Parent bidding screen
          </a>

          <a href="/admin/live" className="font-bold underline">
            Live admin room
          </a>
        </div>
      </div>
    </main>
  );
}
export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold tracking-[0.4em] uppercase mb-6">
          Bid On My Kid
        </p>

        <h1 className="text-6xl md:text-7xl font-black leading-tight tracking-tight mb-8">
          Live school art
          <br />
          auctions with a
          <br />
          cheeky SA MC.
        </h1>

        <p className="text-xl text-neutral-700 mb-10 max-w-2xl leading-relaxed">
          A mobile-first fundraising entertainment platform where parents bid
          live on children’s artwork, one masterpiece at a time.
        </p>

        <div className="flex gap-4">
          <a
            href="/admin"
            className="rounded-2xl bg-black text-white px-8 py-4 font-bold shadow-lg hover:opacity-90 transition"
          >
            School Admin
          </a>

          <a
            href="/auction/demo"
            className="rounded-2xl border border-black px-8 py-4 font-bold hover:bg-black hover:text-white transition"
          >
            Join Demo Auction
          </a>
        </div>
      </div>
    </main>
  );
}
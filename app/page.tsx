import BrandHeader from "@/components/BrandHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020b18] text-white overflow-hidden">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(22,214,109,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(255,200,87,0.16),transparent_32%),linear-gradient(180deg,#061124,#020b18_62%,#010712)]" />
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-5 md:py-7">
          <header className="flex items-center justify-between gap-4 mb-8 lg:mb-10">
            <div className="bg-white rounded-[26px] px-4 py-3 shadow-2xl">
              <BrandHeader />
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/admin/login"
                className="hidden sm:inline-flex rounded-2xl bg-white/10 border border-white/10 px-5 py-4 font-black text-white hover:bg-white/15 transition"
              >
                Admin Login
              </a>

              <a
                href="/auction/demo"
                className="rounded-2xl bg-[#16d66d] text-[#07152b] px-5 md:px-7 py-4 font-black shadow-[0_14px_35px_rgba(22,214,109,0.28)] hover:scale-[1.02] transition"
              >
                Join Auction
              </a>
            </div>
          </header>

          <div className="grid lg:grid-cols-[0.78fr_1.22fr] gap-8 lg:gap-12 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
                <span className="uppercase tracking-[0.32em] text-[10px] font-black text-white/60">
                  Young Art • Big Pride
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tight mb-6">
                A live art auction that feels like a{" "}
                <span className="text-[#16d66d]">big night out.</span>
              </h1>

              <div className="w-24 h-1.5 bg-[#ffc857] rounded-full mb-6" />

              <p className="text-lg md:text-xl text-white/65 leading-relaxed max-w-xl mb-7">
                BragWall turns student artwork into a premium mobile auction
                experience — framed masterpieces, live bids, dramatic SOLD
                moments, and winner follow-up built in.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-7">
                <a
                  href="/auction/demo"
                  className="rounded-[24px] bg-[#16d66d] text-[#07152b] px-8 py-5 font-black text-xl text-center shadow-[0_18px_45px_rgba(22,214,109,0.32)] hover:scale-[1.02] transition"
                >
                  Join Auction
                </a>

                <a
                  href="/admin/login"
                  className="rounded-[24px] bg-white text-[#07152b] px-8 py-5 font-black text-xl text-center shadow-2xl hover:scale-[1.02] transition"
                >
                  Admin Login
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xl">
                <HeroMetric label="Bidding" value="Live" />
                <HeroMetric label="Artwork" value="Framed" />
                <HeroMetric label="Winners" value="Tracked" />
              </div>
            </div>

            <MockupPhones />
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-5">
          <Feature
            icon="⚡"
            title="Real-time bidding"
            text="Parents bid live from their phones with instant auction updates."
          />

          <Feature
            icon="🎤"
            title="AI auction stories"
            text="Each artwork gets a playful, child-specific auction intro."
          />

          <Feature
            icon="🖼️"
            title="Premium artwork display"
            text="Artwork can be enhanced and shown inside a polished gallery frame."
          />

          <Feature
            icon="🏆"
            title="Winner follow-up"
            text="Winners submit email details for invoices, certificates, and collection."
          />
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-5 md:px-8 pb-16">
        <div className="rounded-[40px] bg-[#fbf8f1] text-[#07152b] p-6 md:p-8 shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-[#0b63ce] font-black mb-4">
                Built for school fundraising nights
              </p>

              <h2 className="text-5xl md:text-7xl font-black leading-[0.9] mb-5">
                From upload to SOLD.
              </h2>

              <p className="text-slate-600 text-xl leading-relaxed mb-6">
                Upload the artwork, start the auction, let parents bid, mark it
                sold, and capture the winner email before the next masterpiece
                begins.
              </p>

              <a
                href="/admin/login"
                className="inline-flex rounded-[22px] bg-[#07152b] text-white px-7 py-5 font-black shadow-xl"
              >
                Open Admin Control Room
              </a>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <ProcessStep
                number="01"
                title="Upload"
                text="Add child name, grade, artwork photo, and optional AI enhancement."
              />

              <ProcessStep
                number="02"
                title="Auction"
                text="Run the live event from the admin cockpit while parents bid on mobile."
              />

              <ProcessStep
                number="03"
                title="Collect"
                text="Winner submits email for invoice, certificate, and artwork collection."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MockupPhones() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-[#16d66d]/10 blur-3xl rounded-full" />
      <div className="absolute left-1/2 top-8 -translate-x-1/2 w-[520px] h-[520px] bg-[#ffc857]/10 blur-3xl rounded-full" />

      <div className="relative flex flex-col md:flex-row items-center justify-center gap-5 lg:gap-6">
        <LiveAuctionPhone />
        <SoldPhone />
      </div>
    </div>
  );
}

function LiveAuctionPhone() {
  const previewImage =
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=900&auto=format&fit=crop";

  return (
    <div className="w-full max-w-[330px] rounded-[44px] bg-black p-2 shadow-[0_35px_100px_rgba(0,0,0,0.55)] border border-white/10">
      <div className="rounded-[38px] bg-[#020b18] overflow-hidden border border-white/10 min-h-[650px] flex flex-col">
        <div className="bg-[#061124] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="w-9 h-9 rounded-2xl border border-white/10 flex items-center justify-center text-xl">
            ☰
          </div>

          <div className="bg-white rounded-xl px-2 py-1">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="text-right">
            <p className="text-[9px] text-white/45">Bidding as</p>
            <p className="text-xs font-black">
              Rob <span className="inline-block w-2 h-2 bg-[#16d66d] rounded-full" />
            </p>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="uppercase tracking-[0.28em] text-[10px] text-[#16d66d] font-black mb-2">
                Live Auction
              </p>
              <h3 className="text-3xl font-black leading-none">
                Ethan Smith
              </h3>
              <p className="text-white/55 text-sm font-bold mt-2">Grade 3</p>
            </div>

            <div className="border border-[#16d66d]/60 text-[#16d66d] rounded-2xl px-3 py-2 text-center shrink-0">
              <p className="text-[10px] text-white/45">Artwork</p>
              <p className="font-black text-sm">3 of 12</p>
            </div>
          </div>

          <div className="rounded-[30px] overflow-hidden border border-white/10 bg-[#16110b] shadow-[0_22px_60px_rgba(0,0,0,0.45)]">
            <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-4">
              <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2 rounded-[20px]">
                <div className="bg-[#f8f5ef] rounded-[14px] p-3">
                  <div className="rounded-[10px] overflow-hidden bg-white">
                    <img
                      src={previewImage}
                      alt="Artwork"
                      className="w-full h-[210px] object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="h-7 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
          </div>

          <div className="bg-white text-[#07152b] rounded-[24px] p-4 shadow-xl grid grid-cols-2 gap-3">
            <div>
              <p className="uppercase tracking-[0.22em] text-[9px] text-slate-400 font-black mb-2">
                Highest Bid
              </p>
              <p className="text-4xl font-black text-[#16d66d] leading-none">
                R500
              </p>
            </div>

            <div className="text-right">
              <p className="uppercase tracking-[0.22em] text-[9px] text-slate-400 font-black mb-2">
                Leading
              </p>
              <p className="text-xl font-black">Rob 👑</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#16d66d]/50 bg-[#07152b] p-4 grid grid-cols-2 gap-3">
            <div className="text-center border-r border-white/10 pr-3">
              <p className="uppercase tracking-[0.18em] text-[9px] text-white/50 font-black mb-1">
                Closes in
              </p>
              <p className="text-4xl font-black text-[#ffc857] leading-none">
                12s
              </p>
              <p className="text-xs font-black text-[#ffc857] mt-1">
                Going Twice
              </p>
            </div>

            <div className="text-center">
              <p className="uppercase tracking-[0.18em] text-[9px] text-white/50 font-black mb-1">
                Next Bid
              </p>
              <p className="text-4xl font-black text-[#16d66d] leading-none">
                R600
              </p>
              <p className="text-xs font-bold text-white/70 mt-1">
                Do I hear R600?
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#07152b] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="uppercase tracking-[0.25em] text-[9px] text-[#16d66d] font-black">
                AI Auction MC
              </p>
              <div className="h-[14px] w-24 rounded-full bg-gradient-to-r from-[#16d66d] via-[#16d66d]/40 to-transparent" />
            </div>
            <p className="text-sm font-black leading-relaxed text-white">
              “The energy is electric. This masterpiece is looking dangerously
              collectible.”
            </p>
          </div>

          <div className="mt-auto rounded-[24px] bg-[#16d66d] text-white py-5 text-center shadow-[0_18px_45px_rgba(22,214,109,0.25)]">
            <p className="text-4xl font-black leading-none">Bid R600</p>
            <p className="text-white/80 font-bold mt-1">Tap to place your bid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SoldPhone() {
  return (
    <div className="w-full max-w-[330px] rounded-[44px] bg-black p-2 shadow-[0_35px_100px_rgba(0,0,0,0.55)] border border-white/10 md:translate-y-8">
      <div className="rounded-[38px] bg-[#020b18] overflow-hidden border border-white/10 min-h-[650px] flex flex-col">
        <div className="bg-[#061124] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="w-9 h-9 rounded-2xl border border-white/10 flex items-center justify-center text-xl">
            ☰
          </div>

          <div className="bg-white rounded-xl px-2 py-1">
            <img
              src="/bragwall-logo.png"
              alt="BragWall"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="text-right">
            <p className="text-[9px] text-white/45">Bidding as</p>
            <p className="text-xs font-black">
              Rob <span className="inline-block w-2 h-2 bg-[#16d66d] rounded-full" />
            </p>
          </div>
        </div>

        <div className="relative flex-1 p-5 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.2),transparent_42%)]" />

          <div className="relative text-center pt-4">
            <div className="text-7xl mb-1">🔨</div>

            <h3 className="text-[70px] font-black leading-none text-[#ffc857] drop-shadow-[0_0_28px_rgba(255,200,87,0.45)]">
              SOLD!
            </h3>

            <p className="text-2xl font-black mt-3">Congratulations</p>

            <p className="text-5xl font-black text-[#ffc857] italic mt-1 mb-6">
              Rob!
            </p>

            <div className="border border-[#ffc857]/70 rounded-[28px] p-5 mb-5 shadow-[0_0_35px_rgba(255,200,87,0.2)]">
              <p className="uppercase tracking-[0.3em] text-[10px] text-white/55 font-black mb-2">
                Winning Bid
              </p>

              <p className="text-6xl font-black text-[#16d66d] leading-none">
                R500
              </p>

              <p className="text-white/60 font-bold mt-2">
                for Ethan’s masterpiece
              </p>
            </div>

            <div className="bg-white text-[#07152b] rounded-[28px] p-5 shadow-2xl text-left">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-3xl bg-[#fff5d6] flex items-center justify-center text-3xl shrink-0">
                  ✉️
                </div>

                <div>
                  <p className="text-2xl font-black leading-tight">
                    You’re the winner!
                  </p>
                  <p className="text-slate-600 font-bold text-sm leading-relaxed mt-1">
                    Enter your email to receive your invoice, certificate, and
                    payment details.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 px-4 py-4 text-slate-400 font-bold mb-4">
                your@email.com
              </div>

              <div className="rounded-2xl bg-[#16b85d] text-white px-4 py-4 text-center font-black">
                Send Invoice & Certificate
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStep icon="✉️" label="Invoice" />
              <MiniStep icon="🏆" label="Cert." />
              <MiniStep icon="🖼️" label="Collect" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 border border-white/10 p-4">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-lg font-black text-white leading-tight">{value}</p>
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
    <div className="rounded-[30px] bg-white/5 border border-white/10 p-6 shadow-xl">
      <div className="w-16 h-16 rounded-[24px] bg-white text-[#07152b] flex items-center justify-center text-3xl mb-5 shadow-xl">
        {icon}
      </div>

      <h3 className="uppercase tracking-[0.18em] text-sm font-black mb-3">
        {title}
      </h3>

      <p className="text-white/55 leading-relaxed font-bold">{text}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[30px] bg-white border border-black/5 p-6 shadow-xl">
      <p className="text-[#16b85d] text-4xl font-black mb-5">{number}</p>

      <h3 className="text-3xl font-black mb-3">{title}</h3>

      <p className="text-slate-600 font-bold leading-relaxed">{text}</p>
    </div>
  );
}

function MiniStep({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-[22px] bg-white/5 border border-white/10 p-3 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-white/70 text-xs font-black">{label}</p>
    </div>
  );
}
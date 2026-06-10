import BrandHeader from "@/components/BrandHeader";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020b18] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.15),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.13),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative grid xl:grid-cols-[280px_1fr] min-h-screen">
        <aside className="border-r border-white/10 bg-[#061124]/85 backdrop-blur-xl p-5 xl:sticky xl:top-0 xl:h-screen">
          <div className="bg-white rounded-[28px] p-4 shadow-2xl mb-6">
            <BrandHeader />
          </div>

          <nav className="space-y-3 mb-6">
            <AdminNavLink href="/admin" label="Dashboard" icon="🏠" active />
            <AdminNavLink href="/admin/live" label="Live Room" icon="🔨" />
            <AdminNavLink href="/admin/artworks" label="Artwork Upload" icon="🎨" />
            <AdminNavLink href="/admin/school" label="School Profile" icon="🏫" />
            <AdminNavLink href="/admin/events/new" label="New Event" icon="📅" />
            <AdminNavLink href="/admin/sales" label="Sales Records" icon="💳" />
            <AdminNavLink href="/auction/demo" label="Parent View" icon="📱" />
          </nav>

          <div className="rounded-[28px] bg-white/5 border border-white/10 p-4 mb-5">
            <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-3">
              Admin Mode
            </p>
            <p className="text-3xl font-black text-[#16d66d]">LIVE</p>
            <p className="text-white/50 text-sm font-bold mt-2">
              BragWall event control centre
            </p>
          </div>

          <AdminLogoutButton />
        </aside>

        <section className="min-h-screen">
          <header className="border-b border-white/10 bg-[#020b18]/70 backdrop-blur-xl p-5 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-3 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
                  <span className="uppercase tracking-[0.32em] text-[10px] font-black text-white/60">
                    BragWall Admin
                  </span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black leading-[0.9]">
                  Your auction command centre.
                </h1>

                <p className="text-white/55 text-lg font-bold mt-3 max-w-3xl">
                  Prepare school artwork, run the live auction, track bids,
                  capture winners, and manage the event from one premium control
                  room.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[520px]">
                <MetricCard label="Auction" value="Demo" />
                <MetricCard label="Status" value="Ready" green />
                <MetricCard label="Mode" value="Live" gold />
              </div>
            </div>
          </header>

          <div className="p-5 lg:p-8 space-y-5">
            <section className="rounded-[42px] bg-white/5 border border-white/10 p-4 lg:p-6 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
              <div className="grid lg:grid-cols-[1fr_360px] gap-5">
                <div className="rounded-[36px] bg-[#061124] border border-white/10 p-6 lg:p-8 shadow-2xl">
                  <p className="uppercase tracking-[0.35em] text-[10px] text-[#16d66d] font-black mb-4">
                    Event Workflow
                  </p>

                  <h2 className="text-5xl lg:text-6xl font-black leading-[0.9] mb-5">
                    From upload to SOLD.
                  </h2>

                  <p className="text-white/60 text-lg font-bold leading-relaxed max-w-3xl mb-8">
                    Start by loading artwork into the studio, then open the live
                    room to control bidding, SOLD moments, and parent follow-up.
                  </p>

                  <div className="grid md:grid-cols-3 gap-4">
                    <WorkflowCard
                      number="01"
                      title="Upload"
                      text="Add each child’s artwork, grade, story, and optional AI enhancement."
                    />
                    <WorkflowCard
                      number="02"
                      title="Go Live"
                      text="Start the auction room and move artworks onto the stage."
                    />
                    <WorkflowCard
                      number="03"
                      title="Collect"
                      text="Capture winner details for invoices, certificates, and collection."
                    />
                  </div>
                </div>

                <div className="rounded-[36px] bg-[#061124] border border-white/10 p-6 shadow-2xl flex flex-col">
                  <div className="text-center rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(255,200,87,0.22),transparent_45%),#020b18] border border-[#ffc857]/30 p-6 mb-5">
                    <div className="text-7xl mb-2">🔨</div>
                    <p className="text-[#ffc857] text-6xl font-black leading-none">
                      READY
                    </p>
                    <p className="text-white/60 font-bold mt-3">
                      Auction cockpit standing by
                    </p>
                  </div>

                  <a
                    href="/admin/live"
                    className="rounded-[26px] bg-[#16d66d] text-[#07152b] px-6 py-5 text-center text-xl font-black shadow-[0_18px_45px_rgba(22,214,109,0.28)] hover:scale-[1.02] transition mb-4"
                  >
                    Open Live Room
                  </a>

                  <a
                    href="/auction/demo"
                    className="rounded-[26px] bg-white text-[#07152b] px-6 py-5 text-center text-xl font-black shadow-xl hover:scale-[1.02] transition"
                  >
                    View Parent Screen
                  </a>
                </div>
              </div>
            </section>

            <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              <DashboardTile
                href="/admin/artworks"
                icon="🎨"
                title="Artwork Studio"
                text="Upload child artwork, preview the gold frame, and prepare AI auction stories."
                action="Upload Artwork"
                green
              />

              <DashboardTile
                href="/admin/live"
                icon="🔨"
                title="Live Auction Room"
                text="Control the auction rhythm, bids, queue, going once, going twice, and SOLD."
                action="Run Auction"
                gold
              />

              <DashboardTile
                href="/admin/sales"
                icon="💳"
                title="Sales Records"
                text="Review sold artworks, winners, invoice emails, and certificate follow-up."
                action="View Sales"
              />

              <DashboardTile
                href="/admin/school"
                icon="🏫"
                title="School Profile"
                text="Manage school information used across the BragWall event setup."
                action="Edit Profile"
              />
            </section>

            <section className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
              <div className="rounded-[34px] bg-white text-[#07152b] p-6 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                  Quick Launch
                </p>

                <h3 className="text-4xl font-black leading-none mb-5">
                  Recommended order
                </h3>

                <div className="space-y-3">
                  <QuickStep number="1" text="Set up your school profile." />
                  <QuickStep number="2" text="Create or confirm the event." />
                  <QuickStep number="3" text="Upload artwork into the studio." />
                  <QuickStep number="4" text="Open the live room and start bidding." />
                  <QuickStep number="5" text="Check sales records after SOLD." />
                </div>
              </div>

              <div className="rounded-[34px] bg-[#061124]/90 border border-white/10 p-6 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-[10px] text-[#16d66d] font-black mb-4">
                  BragWall Event Night
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  <EventNightCard
                    icon="📱"
                    title="Parent mobile view"
                    text="Parents join from their phones and bid from the live auction screen."
                  />

                  <EventNightCard
                    icon="🖼️"
                    title="Premium artwork stage"
                    text="Each piece appears inside the gold BragWall frame."
                  />

                  <EventNightCard
                    icon="🏆"
                    title="Winner capture"
                    text="Winning parents submit email details for invoice and certificate."
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminNavLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-[22px] px-4 py-4 font-black transition ${
        active
          ? "bg-[#16d66d] text-[#07152b]"
          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function MetricCard({
  label,
  value,
  green = false,
  gold = false,
}: {
  label: string;
  value: string;
  green?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-[26px] bg-white/5 border border-white/10 p-4 shadow-xl">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/40 font-black mb-2">
        {label}
      </p>
      <p
        className={`text-2xl lg:text-3xl font-black leading-none ${
          green ? "text-[#16d66d]" : gold ? "text-[#ffc857]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function WorkflowCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] bg-white/5 border border-white/10 p-5">
      <p className="text-[#16d66d] text-4xl font-black mb-4">{number}</p>
      <h3 className="text-3xl font-black mb-3">{title}</h3>
      <p className="text-white/55 font-bold leading-relaxed">{text}</p>
    </div>
  );
}

function DashboardTile({
  href,
  icon,
  title,
  text,
  action,
  green = false,
  gold = false,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
  action: string;
  green?: boolean;
  gold?: boolean;
}) {
  return (
    <a
      href={href}
      className="group rounded-[34px] bg-[#061124]/90 border border-white/10 p-6 shadow-2xl hover:-translate-y-1 hover:bg-[#071b38] transition"
    >
      <div
        className={`w-18 h-18 rounded-[28px] flex items-center justify-center text-5xl mb-6 shadow-xl ${
          green
            ? "bg-[#16d66d] text-[#07152b]"
            : gold
            ? "bg-[#ffc857] text-[#07152b]"
            : "bg-white text-[#07152b]"
        }`}
      >
        {icon}
      </div>

      <h3 className="text-3xl font-black leading-none mb-4">{title}</h3>

      <p className="text-white/55 font-bold leading-relaxed mb-6">{text}</p>

      <div
        className={`rounded-[22px] px-5 py-4 text-center font-black transition ${
          green
            ? "bg-[#16d66d] text-[#07152b]"
            : gold
            ? "bg-[#ffc857] text-[#07152b]"
            : "bg-white/10 text-white border border-white/10 group-hover:bg-white"
        } ${!green && !gold ? "group-hover:text-[#07152b]" : ""}`}
      >
        {action}
      </div>
    </a>
  );
}

function QuickStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[22px] bg-[#fbf8f1] border border-black/5 p-4">
      <div className="w-11 h-11 rounded-2xl bg-[#16d66d] text-[#07152b] flex items-center justify-center font-black shrink-0">
        {number}
      </div>

      <p className="font-black text-slate-700">{text}</p>
    </div>
  );
}

function EventNightCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] bg-white/5 border border-white/10 p-5">
      <div className="text-5xl mb-5">{icon}</div>
      <h3 className="text-2xl font-black mb-3">{title}</h3>
      <p className="text-white/55 font-bold leading-relaxed">{text}</p>
    </div>
  );
}
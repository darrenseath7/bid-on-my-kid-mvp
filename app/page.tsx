"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";


const schoolLogos = [
  { name: "MAPLEWOOD", type: "PRIMARY SCHOOL", icon: "shield" },
  { name: "RIVERSIDE", type: "COLLEGE", icon: "wave" },
  { name: "HILLSIDE", type: "ACADEMY", icon: "book" },
  { name: "SUNFIELD", type: "PRIMARY", icon: "sun" },
  { name: "OAKRIDGE", type: "COLLEGE", icon: "tree" },
];

export default function HomePage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSubmitError, setDemoSubmitError] = useState("");
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isDemoVideoPlaying, setIsDemoVideoPlaying] = useState(false);
  const founderVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isFounderVideoPlaying, setIsFounderVideoPlaying] = useState(false);

  function openDemoForm() {
    setDemoSubmitted(false);
    setIsDemoOpen(true);
  }

  function closeDemoForm() {
    setIsDemoOpen(false);
    setDemoSubmitted(false);
  }

  async function handleDemoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setDemoSubmitting(true);
    setDemoSubmitError("");

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactPerson: String(formData.get("contactPerson") || ""),
          contactNumber: String(formData.get("contactNumber") || ""),
          email: String(formData.get("email") || ""),
          schoolName: String(formData.get("schoolName") || ""),
          message: String(formData.get("message") || ""),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "We could not send the request. Please try again.");
      }

      setDemoSubmitted(true);
      event.currentTarget.reset();
    } catch (error) {
      setDemoSubmitError(error instanceof Error ? error.message : "We could not send the request. Please try again.");
    } finally {
      setDemoSubmitting(false);
    }
  }

  async function playDemoVideo() {
    await demoVideoRef.current?.play();
  }

  async function playFounderVideo() {
    await founderVideoRef.current?.play();
  }

  return (
    <main className="min-h-screen overflow-hidden scroll-smooth bg-[#020b18] text-white">
      <HomepagePaintSplashes />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(22,214,109,0.18),transparent_31%),radial-gradient(circle_at_80%_12%,rgba(255,200,87,0.13),transparent_33%),radial-gradient(circle_at_50%_86%,rgba(11,99,206,0.16),transparent_40%),linear-gradient(180deg,#061124,#020b18_56%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="fixed inset-3 pointer-events-none rounded-[32px] border border-[#c78b25]/18 shadow-[inset_0_0_70px_rgba(199,139,37,0.07)]" />

      <div className="relative">
        <header className="mx-auto flex max-w-[1480px] items-center justify-between gap-5 px-5 py-6 md:px-8 lg:px-10">
          <Link href="/" className="inline-flex flex-col items-start gap-3">
            <BragWallLogo />
            <p className="ml-1 text-[11px] font-black uppercase tracking-[0.48em] text-white/84 md:text-sm">
              Young Art • Big Pride
            </p>
          </Link>

          <nav className="hidden items-center gap-10 text-base font-bold text-white/86 lg:flex">
            <a href="#for-schools" className="transition hover:text-[#16d66d]">
              For Schools
            </a>
            <a href="#for-parents" className="transition hover:text-[#16d66d]">
              For Parents
            </a>
            <a href="#how-it-works" className="transition hover:text-[#16d66d]">
              How It Works
            </a>
            <a href="#live-auction" className="transition hover:text-[#16d66d]">
              Live Auction
            </a>
            <a href="#about-us" className="transition hover:text-[#16d66d]">
              About Us
            </a>
          </nav>

          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#16d66d]/80 bg-[#16d66d]/8 px-5 py-3 text-sm font-black text-[#16d66d] shadow-[0_0_28px_rgba(22,214,109,0.12)] transition hover:bg-[#16d66d] hover:text-[#07152b] md:px-7 md:py-4 md:text-base"
          >
            <ShieldIcon />
            Admin Login
          </Link>
        </header>

        <section className="mx-auto max-w-[1480px] px-5 pb-8 pt-7 md:px-8 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] xl:gap-14">
            <div>
              <div className="mb-8 inline-flex rounded-full border border-[#16d66d]/20 bg-[#16d66d]/14 px-5 py-3 shadow-[0_18px_45px_rgba(22,214,109,0.10)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16d66d] md:text-sm">
                  Auction platform for schools
                </p>
              </div>

              <h1 className="max-w-3xl text-[54px] font-black leading-[0.93] tracking-[-0.075em] text-white sm:text-[68px] md:text-[78px] xl:text-[86px]">
                Every child is an{" "}
                <span className="text-[#16d66d] drop-shadow-[0_0_28px_rgba(22,214,109,0.25)]">
                  artist.
                </span>{" "}
                Every piece has value.
              </h1>

              <p className="mt-7 max-w-2xl text-xl font-medium leading-relaxed text-white/72 md:text-2xl">
                BragWall helps schools run exciting art auctions that bring communities together and raise more funds for our kids.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">                <span className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/72">
                  Live school art auctions made simple
                </span>
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={openDemoForm}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#16d66d] px-8 py-5 text-lg font-black text-[#07152b] shadow-[0_22px_55px_rgba(22,214,109,0.24)] transition hover:scale-[1.02]"
                >
                  Request a demo
                  <span className="text-2xl leading-none">-&gt;</span>
                </button>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/5 px-8 py-5 text-lg font-black text-white transition hover:border-[#16d66d]/70 hover:text-[#16d66d]"
                >
                  How it works
                </Link>
              </div>

              <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
                <HeroPoint icon={<PeopleIcon />} title="Trusted by" text="Schools" />
                <HeroPoint icon={<ChartIcon />} title="R50k" text="raised to date" />
                <HeroPoint icon={<HeartIcon />} title="Stronger" text="Communities" />
              </div>
            </div>

            <HeroImageCard
              videoRef={founderVideoRef}
              isPlaying={isFounderVideoPlaying}
              onPlayClick={playFounderVideo}
              onPlay={() => setIsFounderVideoPlaying(true)}
              onPause={() => setIsFounderVideoPlaying(false)}
            />
          </div>
        </section>

        <section id="workflow-demo" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[40px] border border-[#16d66d]/26 bg-[radial-gradient(circle_at_16%_18%,rgba(22,214,109,0.18),transparent_34%),radial-gradient(circle_at_84%_6%,rgba(255,200,87,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(11,99,206,0.10))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.36)] md:p-7 lg:p-8">
            <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <SectionKicker>Live product demo</SectionKicker>
                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
                  Watch the auction room come alive.
                </h2>
                <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white/72 md:text-xl">
                  A clear walkthrough of the BragWall live flow: the live AI MC brings humour and personality to each artwork, parents bid from their phones, the countdown creates the theatre, and the winning family gets the SOLD moment.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <LiveDemoPoint label="1" title="Live AI MC" text="Funny, personal artwork intros bring each child's story to life." />
                  <LiveDemoPoint label="2" title="Parent bidding" text="Bids update live across the room." />
                  <LiveDemoPoint label="3" title="Countdown energy" text="A 15-second timer keeps everyone engaged." />
                  <LiveDemoPoint label="4" title="SOLD handover" text="Winner details are captured for invoices." />
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <PrimaryButton onClick={openDemoForm}>Book a live demo</PrimaryButton>
                  <SecondaryAnchor href="#live-auction">See auction features</SecondaryAnchor>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-[38px] bg-[radial-gradient(circle_at_50%_38%,rgba(22,214,109,0.22),transparent_58%)] blur-2xl" />
                <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[#020b18] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.55)]">
                  <div className="flex items-center justify-between gap-4 rounded-t-[24px] border border-white/10 border-b-0 bg-white/[0.055] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                      <span className="h-3 w-3 rounded-full bg-[#ffc857]" />
                      <span className="h-3 w-3 rounded-full bg-[#16d66d]" />
                    </div>
                    <div className="hidden rounded-full border border-white/10 bg-[#061124]/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white/58 sm:block">
                      bragwall.co.za/live-demo
                    </div>
                    <div className="rounded-full bg-[#16d66d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#07152b]">
                      Live
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-b-[24px] border border-white/10 bg-black">
                    <video
                      ref={demoVideoRef}
                      src="/bragwall-homepage-demo-final-intro-outro.mp4"
                      className="aspect-[9/16] w-full bg-[#020b18] object-cover"



                      playsInline
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      preload="auto"
                      onPlay={() => setIsDemoVideoPlaying(true)}
                      onPause={() => setIsDemoVideoPlaying(false)}
                      onEnded={() => setIsDemoVideoPlaying(false)}
                      aria-label="Professional BragWall live auction workflow demo video"
                    />
                    {!isDemoVideoPlaying ? (
                      <button
                        type="button"
                        onClick={playDemoVideo}
                        className="absolute left-1/2 top-1/2 z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-white/18 bg-[#16d66d] px-6 py-4 text-sm font-black text-[#07152b] shadow-[0_22px_60px_rgba(0,0,0,0.45)] transition hover:scale-[1.04]"
                        aria-label="Play BragWall parent mobile demo video"
                      >
                        <span className="text-lg leading-none">▶</span>
                        Play Demo
                      </button>
                    ) : null}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020b18]/78 to-transparent" />
                    <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-[#061124]/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white/78 backdrop-blur-md">
                      BragWall live demo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="for-schools" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10">
          <ContentPanel>
            <div className="max-w-3xl">
              <SectionKicker>For schools</SectionKicker>
              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
                Your students create it. Your community celebrates it. Your school benefits from it.
              </h2>
              <p className="mt-6 text-lg font-medium leading-relaxed text-white/68 md:text-xl">
                Student art auctions consistently outperform bake sales, fun runs, and catalogue drives because parents are not buying a product, they are buying their child's work. That emotional connection drives real bids and real money back into your school.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BenefitCard label="No venue needed" text="Run it entirely online." />
              <BenefitCard label="No printing costs" text="Zero overheads." />
              <BenefitCard label="No admin headaches" text="Set up in minutes." />
              <BenefitCard label="Community does the rest" text="Parents bid from anywhere." />
            </div>

            <QuoteBlock>
              With BragWall, we have taken one of the most powerful school community fundraisers and made it simple: zero overheads, three easy steps, and every rand raised goes straight back to your school.
            </QuoteBlock>

            <PanelActions>
              <PrimaryButton onClick={openDemoForm}>Request a demo</PrimaryButton>
              <SecondaryAnchor href="#how-it-works">How it works</SecondaryAnchor>
            </PanelActions>
          </ContentPanel>
        </section>

        <section id="for-parents" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10">
          <ContentPanel>
            <div className="max-w-3xl">
              <SectionKicker>For parents</SectionKicker>
              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
                There is no higher bidder than a proud parent.
              </h2>
              <p className="mt-6 text-lg font-medium leading-relaxed text-white/68 md:text-xl">
                BragWall brings your school's art auction online so parents can browse, bid, and brag about their child's work from anywhere - and know that every rand spent goes straight back to the school.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BenefitCard label="Bid from anywhere" text="Any device, any time." />
              <BenefitCard label="Own the original" text="Your child's actual artwork." />
              <BenefitCard label="No app to download" text="Just click and bid." />
              <BenefitCard label="Give back effortlessly" text="Funds go straight to school." />
            </div>

            <QuoteBlock>
              Your child created it. Your community celebrates it. Your school benefits from it - and you get to take the masterpiece home.
            </QuoteBlock>

            <PanelActions>
              <button type="button" onClick={openDemoForm} className="inline-flex items-center justify-center rounded-2xl bg-[#16d66d] px-6 py-4 text-sm font-extrabold text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.22)] transition hover:scale-[1.02]">Request a demo</button>
              <SecondaryAnchor href="#how-it-works">How it works</SecondaryAnchor>
            </PanelActions>
          </ContentPanel>
        </section>

        <section id="how-it-works" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10">
          <ContentPanel>
            <SectionKicker>How it works</SectionKicker>
            <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
              Fun. Effective. Fundraising.
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-white/68 md:text-xl">
              Raising funds is now as easy as one, two, three. Upload, share, auction.
            </p>

            <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
              <HowStep number="1" title="Upload" text="Upload your students' artwork to your school's private auction page. It takes minutes to set up." />
              <HowStep number="2" title="Share" text="Send a link to parents, family, and the wider school community. Bidders can browse and bid from any device, anywhere." />
              <HowStep number="3" title="Auction" text="Bidding opens, excitement builds, and when the hammer falls, every student is celebrated and every rand raised goes straight back to your school." />
            </div>

            <PanelActions>
              <PrimaryButton onClick={openDemoForm}>Request a demo</PrimaryButton>
            </PanelActions>
          </ContentPanel>
        </section>

        <section id="live-auction" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 py-8 md:px-8 lg:px-10">
          <ContentPanel>
            <div className="max-w-4xl">
              <SectionKicker>Live auction</SectionKicker>
              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
                The moment the hammer falls, everyone remembers it.
              </h2>
              <p className="mt-6 text-lg font-medium leading-relaxed text-white/68 md:text-xl">
                BragWall's live auction room turns each artwork into its own event - with real-time bidding, countdown pressure, and a sold moment that parents and students never forget. You have to see it to believe it.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AuctionFeature icon="AI" title="Live AI MC" text="Humour, personality, and artwork stories bring every piece to life." />
              <AuctionFeature icon="BID" title="Live bids" text="Parents see highest bid and next bid instantly." />
              <AuctionFeature icon="1x" title="Going once" text="Countdown pressure creates real auction energy." />
              <AuctionFeature icon="SOLD" title="Sold moment" text="Winners are captured clearly for the school." />
            </div>

            <PanelActions>
              <button type="button" onClick={openDemoForm} className="inline-flex items-center justify-center rounded-2xl bg-[#16d66d] px-6 py-4 text-sm font-extrabold text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.22)] transition hover:scale-[1.02]">Request a demo</button>
              <SecondaryAnchor href="#for-schools">Learn more</SecondaryAnchor>
            </PanelActions>
          </ContentPanel>
        </section>

        <section id="about-us" className="scroll-mt-28 mx-auto max-w-[1480px] px-5 pb-14 pt-8 md:px-8 lg:px-10">
          <ContentPanel>
            <div className="max-w-5xl">
              <SectionKicker>About us</SectionKicker>
              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
                Every piece of art tells a story. Here is ours.
              </h2>

              <div className="mt-8 grid gap-5 text-lg font-medium leading-relaxed text-white/72 md:text-xl">
                <p>
                  I went to my daughter's school art auction not really knowing what to expect.
                </p>
                <p>
                  I left with a winning bid, a massive smile, and a question I could not get out of my head.
                </p>
                <p>
                  The evening had been unlike any school event I had been to before. Loud. Funny. Emotional in the best possible way. Parents were genuinely competing, kids were genuinely thrilled, and the school raised over R50,000 in a single evening.
                </p>
                <p>
                  It was one of those nights that reminds you what a community can feel like when everyone is pulling in the same direction.
                </p>
                <p>
                  The problem? Most schools will never run an event like that. It is too complicated, too expensive, too hard to organise. So most kids will never get to see their artwork bid on. Most parents will never feel that slightly irrational joy of paying way too much for a painting of a lopsided dog, and loving every second of it!
                </p>
                <p>
                  We thought that was worth fixing.
                </p>
                <p>
                  That is Click play to hear why BragWall exists. To take that one extraordinary evening and make it available to every school, every parent, and every kid with a masterpiece to their name.
                </p>
              </div>
            </div>

            <QuoteBlock>
              BragWall brings the MC, the gavel, the drama, and the dopamine to every school, every art show, and every kid who deserves to see their work celebrated properly.
            </QuoteBlock>

            <div className="mt-10 grid max-w-sm gap-4">
              <HeroPoint icon={<ChartIcon />} title="R50k+" text="raised in one school evening" />
            </div>

            <PanelActions>
              <PrimaryButton onClick={openDemoForm}>Request a demo</PrimaryButton>
            </PanelActions>

            <p className="mt-14 text-center text-xs font-black uppercase tracking-[0.55em] text-[#16d66d]">
              Trusted by schools. Loved by parents.
            </p>

            <div className="mt-8 grid grid-cols-2 items-center gap-8 opacity-35 sm:grid-cols-3 lg:grid-cols-5">
              {schoolLogos.map((school) => (
                <SchoolLogo key={school.name} school={school} />
              ))}
            </div>
          </ContentPanel>
        </section>

        <section className="mx-auto max-w-[1480px] px-5 pb-14 md:px-8 lg:px-10">
          <div className="rounded-[34px] border border-[#16d66d]/20 bg-[#16d66d]/10 p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-[#16d66d]">
              Ready to see it live?
            </p>
            <div className="mt-4 flex justify-center">            </div>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] md:text-5xl">
              Turn your next school fundraiser into a moment everyone remembers.
            </h2>
            <div className="mt-8 flex justify-center">
              <PrimaryButton onClick={openDemoForm}>Request a demo</PrimaryButton>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-[1480px] px-5 pb-8 md:px-8 lg:px-10">
          <div className="border-t border-white/10 pt-6 text-center text-sm font-bold text-white/40 md:flex md:items-center md:justify-between md:text-left">
            <p>© 2026 BragWall. All rights reserved.</p>
            <p className="mt-3 md:mt-0">Parent auction links are shared privately by the school.</p>
          </div>
        </footer>
      </div>

      {isDemoOpen ? (
        <DemoRequestModal submitted={demoSubmitted} submitting={demoSubmitting} error={demoSubmitError} onClose={closeDemoForm} onSubmit={handleDemoSubmit} />
      ) : null}
    </main>
  );
}




function HomepagePaintSplashes() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div
        className="absolute left-[-240px] top-[90px] h-[360px] w-[320px] -rotate-[12deg] opacity-[0.12] blur-[2px] saturate-150"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 72%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 72%)",
        }}
      />

      <div
        className="absolute right-[-260px] top-[230px] hidden h-[420px] w-[380px] rotate-[10deg] opacity-[0.12] blur-[2px] saturate-150 sm:block"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 74%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 42%, transparent 74%)",
        }}
      />

      <div
        className="absolute left-[-220px] top-[760px] hidden h-[520px] w-[470px] rotate-[14deg] bg-[url('/paintbrush.jpg')] bg-cover bg-center opacity-[0.16] blur-[1.5px] saturate-150 md:block"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 40%, transparent 72%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 40%, transparent 72%)",
        }}
      />

      <div
        className="absolute right-[-220px] bottom-[120px] hidden h-[520px] w-[470px] -rotate-[14deg] bg-[url('/paintbrush.jpg')] bg-cover bg-center opacity-[0.17] blur-[1.5px] saturate-150 xl:block"
        style={{
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, black 40%, transparent 72%)",
          maskImage: "radial-gradient(circle at center, black 0%, black 40%, transparent 72%)",
        }}
      />

      <div className="absolute left-[-120px] top-[160px] hidden h-72 w-72 rounded-full bg-[#18e37c]/10 blur-3xl md:block" />
      <div className="absolute right-[-140px] top-[380px] hidden h-80 w-80 rounded-full bg-[#ff4fd8]/10 blur-3xl lg:block" />
      <div className="absolute left-[-120px] bottom-[240px] hidden h-80 w-80 rounded-full bg-[#34b7ff]/8 blur-3xl xl:block" />
    </div>
  );
}

function DemoRequestModal({
  submitted,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  submitted: boolean;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b18]/82 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[30px] border border-[#16d66d]/22 bg-[#07152b] p-6 shadow-[0_34px_110px_rgba(0,0,0,0.62)] md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-[#16d66d]">
              Request a demo
            </p>
            <h2 className="mt-3 text-3xl font-black leading-none tracking-[-0.04em] text-white md:text-4xl">
              See BragWall in action.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-black text-white/70 transition hover:border-[#16d66d]/60 hover:text-[#16d66d]"
            aria-label="Close demo request form"
          >
            x
          </button>
        </div>

        {submitted ? (
          <div className="mt-8 rounded-[24px] border border-[#16d66d]/24 bg-[#16d66d]/10 p-6">
            <h3 className="text-2xl font-black text-[#16d66d]">Thanks - we received your request.</h3>
            <p className="mt-3 text-base font-medium leading-relaxed text-white/72">
              We will be in touch shortly to arrange a BragWall demo for your school.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-2xl bg-[#16d66d] px-6 py-4 text-base font-black text-[#07152b] transition hover:scale-[1.02]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <DemoInput label="Contact person" name="contactPerson" autoComplete="name" required />
            <DemoInput label="Contact number" name="contactNumber" autoComplete="tel" required />
            <DemoInput label="Email address" name="email" type="email" autoComplete="email" required />
            <DemoInput label="School name" name="schoolName" autoComplete="organization" required />

            <label className="block">
              <span className="text-sm font-black text-white/82">Message, optional</span>
              <textarea
                name="message"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#16d66d]/70"
                placeholder="Tell us anything useful about your school or event."
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#16d66d] px-6 py-4 text-base font-black text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.22)] transition hover:scale-[1.01]"
            >
              Submit request
            </button>

            <p className="text-center text-xs font-bold text-white/40">
              For now this shows a success message only. We can connect email or Supabase later.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function DemoInput({
  label,
  name,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-white/82">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-[#16d66d]/70"
      />
    </label>
  );
}

function BragWallLogo() {
  return (
    <div className="flex items-center">
      <img src="/bragwall-logo.png" alt="BragWall" className="h-16 w-auto object-contain md:h-24 lg:h-28" />
    </div>
  );
}


function MiniWorkflowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#16d66d] text-sm font-black text-[#07152b]">
        {number}
      </div>
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-white/58">{text}</p>
    </div>
  );
}

function LiveDemoPoint({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#020b18]/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#16d66d]/44 bg-[#16d66d]/12 text-sm font-black text-[#16d66d]">
        {label}
      </div>
      <p className="text-base font-black text-white">{title}</p>
      <p className="mt-1 text-sm font-bold leading-relaxed text-white/58">{text}</p>
    </div>
  );
}

function DemoOverlayPill({ title, text }: { title: string; text: string }) {
  return (
    <div className="hidden rounded-[18px] border border-white/12 bg-[#061124]/86 p-3 shadow-2xl backdrop-blur-md sm:block">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16d66d]">{title}</p>
      <p className="mt-1 text-xs font-bold leading-snug text-white/72">{text}</p>
    </div>
  );
}

function HeroImageCard({
  videoRef,
  isPlaying,
  onPlayClick,
  onPlay,
  onPause,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onPlayClick: () => void;
  onPlay: () => void;
  onPause: () => void;
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-5 rounded-[38px] bg-[radial-gradient(circle_at_50%_30%,rgba(22,214,109,0.16),transparent_55%)] blur-xl" />
      <div className="relative overflow-hidden rounded-[30px] border border-[#16d66d]/24 bg-[#061124] p-2 shadow-[0_34px_100px_rgba(0,0,0,0.48)] md:rounded-[36px]">
        <div className="relative overflow-hidden rounded-[24px] bg-[#020b18] md:rounded-[30px]">
          <video
            ref={videoRef}
            src="/bragwall-founder-story-v4.mp4"
            poster="/bragwall-hero-paint-hands.jpg"
            className="h-[430px] w-full bg-[#020b18] object-contain md:h-[560px] lg:h-[610px]"



            playsInline
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            preload="auto"
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onPause}
            aria-label="BragWall founder story video"
          />
          {!isPlaying ? (
            <button
              type="button"
              onClick={onPlayClick}
              className="absolute left-1/2 top-1/2 z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-white/18 bg-[#16d66d] px-6 py-4 text-sm font-black text-[#07152b] shadow-[0_22px_60px_rgba(0,0,0,0.45)] transition hover:scale-[1.04] md:text-base"
              aria-label="Play BragWall founder story video"
            >
              <span className="text-lg leading-none">▶</span>
              Play Founder Video
            </button>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020b18]/70 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-[#020b18]/35 to-transparent" />
          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/12 bg-[#061124]/86 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/78 shadow-xl backdrop-blur-md md:left-7 md:top-7">
            Founder Story
          </div>
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 hidden max-w-[520px] rounded-[24px] border border-white/10 bg-[#061124]/90 p-5 shadow-2xl backdrop-blur-md sm:block md:bottom-7 md:left-7 md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#16d66d]/28 bg-[#16d66d]/10 text-[#16d66d]">
                <GavelIcon />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#16d66d] md:text-2xl">Every piece of art tells a story.</h3>
                <p className="mt-1 text-base font-bold text-white md:text-lg">Click play to hear why BragWall exists.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-9 lg:p-10">
      {children}
    </div>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <p className="text-xs font-black uppercase tracking-[0.34em] text-[#16d66d]">{children}</p>    </div>
  );
}

function QuoteBlock({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 border-l-4 border-[#16d66d] bg-[#02160b]/70 px-6 py-5 text-base font-bold italic leading-relaxed text-white/66 md:text-lg">
      {children}
    </div>
  );
}

function PanelActions({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-col gap-4 sm:flex-row">{children}</div>;
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#16d66d] px-7 py-4 text-base font-black text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.22)] transition hover:scale-[1.02]"
    >
      {children} <span>-&gt;</span>
    </button>
  );
}

function LinkButton({ children, href, subtle = false }: { children: ReactNode; href: string; subtle?: boolean }) {
  return (
    <Link
      href={href}
      className={
        subtle
          ? "inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-7 py-4 text-base font-black text-white transition hover:border-[#16d66d]/70 hover:text-[#16d66d]"
          : "inline-flex items-center justify-center gap-3 rounded-2xl bg-[#16d66d] px-7 py-4 text-base font-black text-[#07152b] shadow-[0_18px_45px_rgba(22,214,109,0.22)] transition hover:scale-[1.02]"
      }
    >
      {children}{!subtle ? <span>-&gt;</span> : null}
    </Link>
  );
}

function SecondaryAnchor({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-7 py-4 text-base font-black text-white transition hover:border-[#16d66d]/70 hover:text-[#16d66d]"
    >
      {children}
    </a>
  );
}

function BenefitCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-h-[120px] rounded-[24px] border border-white/10 bg-[#07152b]/42 p-5">
      <p className="text-sm font-black text-[#16d66d]">{label}</p>
      <p className="mt-2 text-base font-black leading-snug text-white">{text}</p>
    </div>
  );
}

function HowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="grid gap-5 py-8 md:grid-cols-[72px_1fr] md:items-start">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#16d66d] text-base font-black text-[#16d66d]">
        {number}
      </div>
      <div>
        <h3 className="text-2xl font-black text-white">{title}</h3>
        <p className="mt-3 max-w-4xl text-lg font-medium leading-relaxed text-white/68">{text}</p>
      </div>
    </div>
  );
}

function ValueLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-4 py-6 md:grid-cols-[24px_1fr]">
      <span className="mt-2 h-3 w-3 rounded-full bg-[#16d66d]" />
      <div>
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="mt-1 text-base font-medium leading-relaxed text-white/62">{text}</p>
      </div>
    </div>
  );
}

function AuctionFeature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-6">
      <div className="mb-5 inline-flex h-16 min-w-16 items-center justify-center rounded-2xl bg-[#16d66d]/12 px-4 text-lg font-black text-[#16d66d]">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="mt-3 text-base font-medium leading-relaxed text-white/68">{text}</p>
    </div>
  );
}

function HeroPoint({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 border-white/10 sm:border-r sm:last:border-r-0">
      <div className="text-[#16d66d]">{icon}</div>
      <div>
        <p className="text-base font-bold text-white/82">{title}</p>
        <p className="text-base font-bold text-white/82">{text}</p>
      </div>
    </div>
  );
}

function SchoolLogo({ school }: { school: { name: string; type: string; icon: string } }) {
  return (
    <div className="flex items-center justify-center gap-3 text-white/55">
      <SchoolMark icon={school.icon} />
      <div>
        <p className="text-xl font-black leading-none tracking-wide">{school.name}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.15em]">{school.type}</p>
      </div>
    </div>
  );
}

function SchoolMark({ icon }: { icon: string }) {
  if (icon === "shield") return <ShieldSchoolIcon />;
  if (icon === "wave") return <WaveIcon />;
  if (icon === "book") return <BookIcon />;
  if (icon === "sun") return <SunIcon />;
  return <TreeIcon />;
}

function ShieldIcon() {
  return (
    <IconSvg small>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconSvg>
  );
}

function PeopleIcon() {
  return (
    <IconSvg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconSvg>
  );
}

function ChartIcon() {
  return (
    <IconSvg>
      <path d="M3 21h18" />
      <path d="M7 17V9" />
      <path d="M12 17V5" />
      <path d="M17 17v-7" />
      <path d="m14 6 3-3 3 3" />
    </IconSvg>
  );
}

function HeartIcon() {
  return (
    <IconSvg>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </IconSvg>
  );
}

function GavelIcon() {
  return (
    <IconSvg>
      <path d="m14 13-7 7" />
      <path d="m8 8 8 8" />
      <path d="m9 7 4-4 8 8-4 4z" />
      <path d="m4 21 5-5" />
    </IconSvg>
  );
}

function ShieldSchoolIcon() {
  return (
    <IconSvg large>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v8" />
      <path d="m8.5 12 3.5 4 3.5-4" />
    </IconSvg>
  );
}

function WaveIcon() {
  return (
    <IconSvg large>
      <path d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
      <path d="M3 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3" />
      <path d="M4 8h16" />
    </IconSvg>
  );
}

function BookIcon() {
  return (
    <IconSvg large>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
    </IconSvg>
  );
}

function SunIcon() {
  return (
    <IconSvg large>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </IconSvg>
  );
}

function TreeIcon() {
  return (
    <IconSvg large>
      <path d="M12 22v-8" />
      <path d="M8 18h8" />
      <path d="m12 2 7 12H5z" />
    </IconSvg>
  );
}

function IconSvg({ children, small = false, large = false }: { children: ReactNode; small?: boolean; large?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={small ? "h-4 w-4" : large ? "h-8 w-8" : "h-7 w-7"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}







































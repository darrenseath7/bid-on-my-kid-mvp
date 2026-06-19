"use client";

import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

type AuctionState = {
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  current_bid: number;
  leading_bidder: string;
  status: string;
};

type SchoolProfile = {
  school_name: string;
  payment_reference_prefix: string;
  collection_instructions: string;
};

export default function WinnerPage() {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [school, setSchool] = useState<SchoolProfile | null>(null);

  useEffect(() => {
    fetchWinner();
    fetchSchoolProfile();
  }, []);

  async function fetchWinner() {
    const { data } = await supabase
      .from("live_auction_state")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    setAuction(data);
  }

  async function fetchSchoolProfile() {
    const { data } = await supabase
      .from("demo_school_profile")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    if (data) {
      setSchool(data);
    } else {
      setSchool({
        school_name: "Demo Primary School",
        payment_reference_prefix: "BRAG",
        collection_instructions:
          "Artwork may be collected from the school office after payment confirmation.",
      });
    }
  }

  if (!auction || !school) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading certificate...
      </main>
    );
  }

  const paymentReference = `${school.payment_reference_prefix || "BRAG"}-${
    auction.leading_bidder || "Winner"
  }`;

  return (
    <main className="min-h-screen bg-[#fbf8f1] text-[#07152b] py-8 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8 print:hidden">
          <BrandHeader />

          <div className="flex flex-wrap gap-3">
            <a
              href="/auction/demo"
              className="rounded-2xl bg-white border border-black/10 px-6 py-4 font-black shadow-sm"
            >
              Back to Auction
            </a>

            <button
              onClick={() => window.print()}
              className="rounded-2xl bg-[#07152b] text-white px-8 py-4 font-black shadow-xl"
            >
              Download / Print Certificate
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[42px] overflow-hidden border border-black/5 shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
          <div className="bg-[#07152b] text-white p-8 lg:p-14">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div>
                <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-5">
                  Official BragWall Winner Certificate
                </p>

                <h1 className="text-7xl lg:text-9xl font-black leading-none mb-6 text-[#16d66d]">
                  SOLD
                </h1>

                <p className="text-2xl text-white/70 max-w-2xl leading-relaxed">
                  Congratulations on winning this original school masterpiece
                  and supporting young creativity.
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-[32px] p-8 min-w-[320px]">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                  Winning Bidder
                </p>

                <h2 className="text-5xl font-black mb-6">
                  {auction.leading_bidder}
                </h2>

                <div className="bg-[#16d66d] text-[#07152b] rounded-[26px] px-7 py-6 inline-block">
                  <p className="uppercase tracking-[0.25em] text-xs font-black mb-2">
                    Winning Bid
                  </p>

                  <div className="text-5xl font-black">
                    R{auction.current_bid.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <div className="grid xl:grid-cols-[1fr_0.9fr] gap-10">
              <div>
                <div className="mb-8">
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                    Awarded Artwork
                  </p>

                  <h3 className="text-5xl lg:text-6xl font-black leading-tight mb-3">
                    {auction.child_name} {auction.child_surname}
                  </h3>

                  <p className="text-2xl text-slate-500">{auction.grade}</p>
                </div>

                <PremiumFrame src={auction.artwork_url} alt="Winning artwork" />
              </div>

              <div className="space-y-6">
                <div className="bg-[#fbf8f1] rounded-[32px] p-8 border border-black/5">
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-6">
                    Invoice Reference
                  </p>

                  <div className="space-y-5">
                    <DetailRow label="School" value={school.school_name} />
                    <DetailRow label="Reference" value={paymentReference} />
                    <DetailRow
                      label="Payment"
                      value="Invoice details are sent separately by the school."
                    />
                  </div>
                </div>

                <div className="bg-[#07152b] text-white rounded-[32px] p-8">
                  <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-5">
                    Collection Instructions
                  </p>

                  <p className="text-xl leading-relaxed text-white/80">
                    {school.collection_instructions}
                  </p>
                </div>

                <div className="bg-[#16d66d] text-[#07152b] rounded-[32px] p-8 shadow-xl">
                  <p className="uppercase tracking-[0.3em] text-xs font-black mb-4">
                    BragWall Message
                  </p>

                  <p className="text-2xl font-black leading-relaxed">
                    Thank you for supporting creativity, confidence, and your
                    school community.
                  </p>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-black/5">
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                    Certificate Number
                  </p>

                  <p className="text-3xl font-black">
                    BW-{new Date().getFullYear()}-{auction.leading_bidder
                      ?.replace(/\s+/g, "")
                      .slice(0, 8)
                      .toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 mt-8 print:hidden">
          Tip: choose “Save as PDF” when printing to download the certificate.
        </p>
      </div>
    </main>
  );
}

function PremiumFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">
      <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">
        <div className="bg-[#f8f5ef] rounded-[24px] p-5">
          <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">
            <img
              src={src}
              alt={alt}
              className="w-full max-h-[720px] object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-2">
        {label}
      </p>

      <p className="text-2xl font-black break-words">{value || "-"}</p>
    </div>
  );
}
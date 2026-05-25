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
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  payment_reference_prefix: string;
  collection_instructions: string;
};

export default function WinnerPage() {
  const [auction, setAuction] =
    useState<AuctionState | null>(null);

  const [school, setSchool] =
    useState<SchoolProfile | null>(null);

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

    setSchool(data);
  }

  if (!auction || !school) {
    return (
      <main className="min-h-screen bg-[#07152b] text-white flex items-center justify-center">
        Loading certificate...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b] py-10 px-5">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <BrandHeader />

          <button
            onClick={() => window.print()}
            className="bg-[#07152b] text-white rounded-2xl px-8 py-5 font-black shadow-xl"
          >
            Download Certificate
          </button>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-[42px] overflow-hidden border border-black/5 shadow-[0_40px_100px_rgba(0,0,0,0.08)]">

          {/* TOP SECTION */}
          <div className="bg-[#07152b] text-white p-10 lg:p-14">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

              <div>
                <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
                  Official BragWall Winner Certificate
                </p>

                <h1 className="text-6xl lg:text-8xl font-black leading-none mb-6">
                  SOLD
                </h1>

                <p className="text-2xl text-white/70 leading-relaxed max-w-2xl">
                  Congratulations on securing tonight’s masterpiece and supporting your school community.
                </p>
              </div>

              <div className="bg-white/10 rounded-[32px] p-8 min-w-[320px]">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                  Winning Bidder
                </p>

                <h2 className="text-5xl font-black mb-6">
                  {auction.leading_bidder}
                </h2>

                <div className="bg-[#16d66d] text-[#07152b] rounded-[24px] px-6 py-5 inline-block">
                  <p className="uppercase tracking-[0.3em] text-xs mb-2">
                    Winning Bid
                  </p>

                  <div className="text-5xl font-black">
                    R{auction.current_bid.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* BODY */}
          <div className="p-8 lg:p-12">

            <div className="grid xl:grid-cols-[1fr_0.9fr] gap-10">

              {/* LEFT */}
              <div>

                <div className="mb-8">
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                    Awarded Artwork
                  </p>

                  <h3 className="text-5xl font-black leading-tight mb-3">
                    {auction.child_name} {auction.child_surname}
                  </h3>

                  <p className="text-2xl text-slate-500">
                    {auction.grade}
                  </p>
                </div>

                {/* FRAMED ARTWORK */}
                <div className="relative">

                  <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">

                    <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">

                      <div className="bg-[#f8f5ef] rounded-[24px] p-5">

                        <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">
                          <img
                            src={auction.artwork_url}
                            alt="Artwork"
                            className="w-full max-h-[700px] object-contain"
                          />
                        </div>

                      </div>

                    </div>
                  </div>

                </div>

              </div>

              {/* RIGHT */}
              <div className="space-y-6">

                {/* PAYMENT */}
                <div className="bg-[#f7f5f0] rounded-[32px] p-8 border border-black/5">

                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-5">
                    Payment Instructions
                  </p>

                  <div className="space-y-5">

                    <DetailRow
                      label="School"
                      value={school.school_name}
                    />

                    <DetailRow
                      label="Bank"
                      value={school.bank_name}
                    />

                    <DetailRow
                      label="Account Name"
                      value={school.account_name}
                    />

                    <DetailRow
                      label="Account Number"
                      value={school.account_number}
                    />

                    <DetailRow
                      label="Branch Code"
                      value={school.branch_code}
                    />

                    <DetailRow
                      label="Reference"
                      value={`${school.payment_reference_prefix}-${auction.leading_bidder}`}
                    />

                  </div>

                </div>

                {/* COLLECTION */}
                <div className="bg-[#07152b] text-white rounded-[32px] p-8">

                  <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-5">
                    Collection Instructions
                  </p>

                  <p className="text-xl leading-relaxed text-white/80">
                    {school.collection_instructions}
                  </p>

                </div>

                {/* MESSAGE */}
                <div className="bg-[#16d66d] text-[#07152b] rounded-[32px] p-8 shadow-xl">

                  <p className="uppercase tracking-[0.3em] text-xs font-black mb-4">
                    BragWall Message
                  </p>

                  <p className="text-2xl font-black leading-relaxed">
                    Thank you for supporting creativity, confidence, and your school community through BragWall.
                  </p>

                </div>

              </div>

            </div>

          </div>
        </div>

      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="uppercase tracking-[0.25em] text-xs text-slate-400 font-black mb-2">
        {label}
      </p>

      <p className="text-2xl font-black">
        {value}
      </p>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading certificate...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 py-10 px-5">
      <div className="max-w-3xl mx-auto">

        {/* CERTIFICATE */}
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border">

          {/* HEADER */}
          <div className="bg-black text-white p-10 text-center">
            <p className="uppercase tracking-[0.4em] text-xs mb-4">
              Bid On My Kid
            </p>

            <h1 className="text-6xl font-black mb-4">
              WINNER
            </h1>

            <p className="text-xl text-neutral-300">
              Official Auction Certificate & Invoice
            </p>
          </div>

          {/* CONTENT */}
          <div className="p-10">

            <div className="grid md:grid-cols-2 gap-10">

              {/* LEFT */}
              <div>
                <div className="rounded-3xl overflow-hidden border shadow-lg">
                  <img
                    src={auction.artwork_url}
                    alt="Artwork"
                    className="w-full h-[420px] object-cover"
                  />
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col justify-between">

                <div>

                  <div className="mb-8">
                    <p className="text-sm uppercase tracking-widest text-neutral-500 mb-2">
                      Winning Bidder
                    </p>

                    <h2 className="text-4xl font-black">
                      {auction.leading_bidder}
                    </h2>
                  </div>

                  <div className="mb-8">
                    <p className="text-sm uppercase tracking-widest text-neutral-500 mb-2">
                      Artwork
                    </p>

                    <h3 className="text-3xl font-black">
                      {auction.child_name}{" "}
                      {auction.child_surname}
                    </h3>

                    <p className="text-xl text-neutral-500 mt-2">
                      {auction.grade}
                    </p>
                  </div>

                  <div className="mb-8">
                    <p className="text-sm uppercase tracking-widest text-neutral-500 mb-2">
                      Winning Amount
                    </p>

                    <div className="text-6xl font-black text-green-500">
                      R{auction.current_bid.toLocaleString()}
                    </div>
                  </div>

                </div>

                {/* PAYMENT */}
                <div className="bg-neutral-100 rounded-3xl p-6 border">
                  <p className="text-sm uppercase tracking-widest text-neutral-500 mb-3">
                    Payment Instructions
                  </p>

                  <div className="space-y-2 text-lg">

                    <p>
                      <span className="font-bold">
                        School:
                      </span>{" "}
                      {school.school_name}
                    </p>

                    <p>
                      <span className="font-bold">
                        Bank:
                      </span>{" "}
                      {school.bank_name}
                    </p>

                    <p>
                      <span className="font-bold">
                        Account Name:
                      </span>{" "}
                      {school.account_name}
                    </p>

                    <p>
                      <span className="font-bold">
                        Account Number:
                      </span>{" "}
                      {school.account_number}
                    </p>

                    <p>
                      <span className="font-bold">
                        Branch Code:
                      </span>{" "}
                      {school.branch_code}
                    </p>

                    <p>
                      <span className="font-bold">
                        Reference:
                      </span>{" "}
                      {school.payment_reference_prefix}-
                      {auction.leading_bidder}
                    </p>

                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm uppercase tracking-widest text-neutral-500 mb-3">
                      Collection Instructions
                    </p>

                    <p className="text-base leading-relaxed">
                      {school.collection_instructions}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-10 border-t pt-8 text-center">
              <p className="text-2xl font-black mb-3">
                Congratulations on securing this masterpiece.
              </p>

              <p className="text-neutral-500 text-lg">
                Thank you for supporting your school community through Bid On My Kid.
              </p>
            </div>

          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 justify-center mt-8">

          <button
            onClick={() => window.print()}
            className="bg-black text-white rounded-2xl px-8 py-5 font-black text-xl"
          >
            Download Certificate
          </button>

          <a
            href="/auction/demo"
            className="bg-white border rounded-2xl px-8 py-5 font-black text-xl"
          >
            Back to Auction
          </a>

        </div>
      </div>
    </main>
  );
}
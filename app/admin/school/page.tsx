"use client";

import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

type SchoolProfile = {
  id?: string;
  auction_code: string;
  school_name: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  payment_reference_prefix: string;
  collection_instructions: string;
};

export default function SchoolProfilePage() {
  const [profile, setProfile] =
    useState<SchoolProfile>({
      auction_code: "demo",
      school_name: "",
      bank_name: "",
      account_name: "",
      account_number: "",
      branch_code: "",
      payment_reference_prefix: "",
      collection_instructions: "",
    });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data } = await supabase
      .from("demo_school_profile")
      .select("*")
      .eq("auction_code", "demo")
      .single();

    if (data) {
      setProfile(data);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("demo_school_profile")
      .upsert(profile, {
        onConflict: "auction_code",
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "School profile updated successfully."
      );
    }

    setSaving(false);
  }

  function updateField(
    field: keyof SchoolProfile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#07152b]">

      <div className="max-w-7xl mx-auto px-5 py-8">

        {/* TOP BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">

          <BrandHeader />

          <div className="flex gap-3">
            <a
              href="/admin"
              className="rounded-2xl bg-white border border-black/5 px-6 py-4 font-black shadow-sm"
            >
              Dashboard
            </a>

            <a
              href="/admin/live"
              className="rounded-2xl bg-[#07152b] text-white px-6 py-4 font-black shadow-xl"
            >
              Live Auction
            </a>
          </div>

        </div>

        {/* HERO */}
        <div className="mb-10">
          <p className="uppercase tracking-[0.35em] text-xs font-black text-[#2878cf] mb-4">
            School Configuration
          </p>

          <h1 className="text-6xl lg:text-8xl font-black leading-[0.92] tracking-tight mb-6">
            Configure your BragWall school profile.
          </h1>

          <p className="text-2xl text-slate-500 leading-relaxed max-w-4xl">
            Manage banking details, payment references, and collection instructions shown on winner certificates and invoices.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-8">

          {/* LEFT */}
          <div className="bg-white rounded-[36px] p-8 shadow-xl border border-black/5">

            <h2 className="text-3xl font-black mb-8">
              School Details
            </h2>

            <div className="space-y-5">

              <Field
                label="School Name"
                value={profile.school_name}
                onChange={(value) =>
                  updateField(
                    "school_name",
                    value
                  )
                }
                placeholder="St Johns Primary"
              />

              <div className="grid md:grid-cols-2 gap-5">

                <Field
                  label="Bank Name"
                  value={profile.bank_name}
                  onChange={(value) =>
                    updateField(
                      "bank_name",
                      value
                    )
                  }
                  placeholder="FNB"
                />

                <Field
                  label="Account Name"
                  value={profile.account_name}
                  onChange={(value) =>
                    updateField(
                      "account_name",
                      value
                    )
                  }
                  placeholder="St Johns Primary"
                />

              </div>

              <div className="grid md:grid-cols-2 gap-5">

                <Field
                  label="Account Number"
                  value={
                    profile.account_number
                  }
                  onChange={(value) =>
                    updateField(
                      "account_number",
                      value
                    )
                  }
                  placeholder="62012345678"
                />

                <Field
                  label="Branch Code"
                  value={profile.branch_code}
                  onChange={(value) =>
                    updateField(
                      "branch_code",
                      value
                    )
                  }
                  placeholder="250655"
                />

              </div>

              <Field
                label="Payment Reference Prefix"
                value={
                  profile.payment_reference_prefix
                }
                onChange={(value) =>
                  updateField(
                    "payment_reference_prefix",
                    value
                  )
                }
                placeholder="BRAG"
              />

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Collection Instructions
                </label>

                <textarea
                  value={
                    profile.collection_instructions
                  }
                  onChange={(event) =>
                    updateField(
                      "collection_instructions",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    px-5
                    py-5
                    text-lg
                    outline-none
                    min-h-[180px]
                  "
                  placeholder="Please collect artwork after payment confirmation..."
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="
                  w-full
                  bg-[#07152b]
                  text-white
                  rounded-2xl
                  py-6
                  font-black
                  text-xl
                  shadow-xl
                  disabled:opacity-50
                "
              >
                {saving
                  ? "Saving..."
                  : "Save School Profile"}
              </button>

              {message && (
                <div className="rounded-2xl bg-[#07152b] text-white p-5 font-bold">
                  {message}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* PREVIEW */}
            <div className="bg-[#07152b] text-white rounded-[36px] p-8 shadow-2xl">

              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Certificate Preview
              </p>

              <h2 className="text-5xl font-black leading-tight mb-6">
                {profile.school_name || "School Name"}
              </h2>

              <div className="bg-white/10 rounded-[28px] p-6 space-y-5">

                <PreviewRow
                  label="Bank"
                  value={profile.bank_name}
                />

                <PreviewRow
                  label="Account Name"
                  value={
                    profile.account_name
                  }
                />

                <PreviewRow
                  label="Account Number"
                  value={
                    profile.account_number
                  }
                />

                <PreviewRow
                  label="Branch Code"
                  value={profile.branch_code}
                />

                <PreviewRow
                  label="Reference Prefix"
                  value={
                    profile.payment_reference_prefix
                  }
                />

              </div>

            </div>

            {/* INSTRUCTIONS */}
            <div className="bg-white rounded-[36px] p-8 shadow-xl border border-black/5">

              <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-4">
                Collection Instructions Preview
              </p>

              <p className="text-2xl leading-relaxed text-slate-600">
                {profile.collection_instructions ||
                  "Collection instructions will appear here."}
              </p>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          w-full
          rounded-2xl
          border
          border-slate-200
          px-5
          py-5
          text-lg
          outline-none
        "
        placeholder={placeholder}
      />
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="uppercase tracking-[0.25em] text-xs text-white/40 font-black mb-2">
        {label}
      </p>

      <p className="text-2xl font-black">
        {value || "-"}
      </p>
    </div>
  );
}
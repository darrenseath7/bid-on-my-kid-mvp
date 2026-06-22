"use client";

import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

type SchoolProfile = {
  id?: string;
  auction_code: string;
  school_name: string;
  branch_code: string;
  payment_reference_prefix: string;
  collection_instructions: string;
};

export default function SchoolProfilePage() {
  const [profile, setProfile] = useState<SchoolProfile>({
    auction_code: "demo",
    school_name: "",
    branch_code: "",
    payment_reference_prefix: "",
    collection_instructions: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

    const { error } = await supabase.from("demo_school_profile").upsert(
      {
        ...profile,
        auction_code: "demo",
      },
      {
        onConflict: "auction_code",
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("School profile saved successfully.");
    }

    setSaving(false);
  }

  function updateField(field: keyof SchoolProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-[#07152b] text-white">
      <section className="max-w-7xl mx-auto px-5 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">
          <div className="bg-white rounded-2xl p-4 w-fit">
            <BrandHeader />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-2xl bg-white/10 border border-white/10 px-6 py-4 font-black"
            >
              Dashboard
            </a>

            <a
              href="/admin/live"
              className="rounded-2xl bg-[#16d66d] text-[#07152b] px-6 py-4 font-black shadow-xl"
            >
              Live Control Room
            </a>

            <a
              href="/auction/winner"
              className="rounded-2xl bg-white text-[#07152b] px-6 py-4 font-black shadow-xl"
            >
              Preview Certificate
            </a>
          </div>
        </div>

        <div className="mb-10">
          <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
            School Event Setup
          </p>

          <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] mb-5">
            Configure your school’s BragWall event.
          </h1>

          <p className="text-white/55 text-2xl max-w-4xl leading-relaxed">
            These details power the winner certificate, invoice reference,
            collection notes, and school identity shown to families after an
            artwork is sold.
          </p>
        </div>

        <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="bg-white rounded-[36px] p-7 text-[#07152b] shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-3">
                  School Profile
                </p>

                <h2 className="text-4xl font-black">
                  Event & collection details
                </h2>
              </div>

              <div className="w-16 h-16 rounded-full bg-[#eaf2ff] flex items-center justify-center text-4xl">
                🏫
              </div>
            </div>

            <div className="space-y-5">
              <Field
                label="School Name"
                value={profile.school_name}
                onChange={(value) => updateField("school_name", value)}
                placeholder="Demo Primary School"
              />

              <div className="grid md:grid-cols-2 gap-5">
                <Field
                  label="Payment Reference Prefix"
                  value={profile.payment_reference_prefix}
                  onChange={(value) =>
                    updateField("payment_reference_prefix", value)
                  }
                  placeholder="Optional - e.g. SCHOOL-ART"
                />

                <Field
                  label="Branch Code"
                  value={profile.branch_code}
                  onChange={(value) => updateField("branch_code", value)}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Collection Instructions
                </label>

                <textarea
                  value={profile.collection_instructions}
                  onChange={(event) =>
                    updateField("collection_instructions", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none min-h-[180px]"
                  placeholder="Artwork may be collected from the school office after payment confirmation."
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-[#07152b] text-white rounded-2xl py-6 font-black text-xl shadow-xl disabled:opacity-50"
              >
                {saving ? "Saving School Profile..." : "Save School Profile"}
              </button>

              {message && (
                <div className="rounded-2xl bg-[#07152b] text-white p-5 font-bold">
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#16d66d] text-[#07152b] rounded-[36px] p-8 shadow-2xl">
              <p className="uppercase tracking-[0.3em] text-xs font-black mb-4">
                Certificate Preview
              </p>

              <h2 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
                {profile.school_name || "School Name"}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <PreviewCard label="Branch Code" value={profile.branch_code} />
              </div>

              <div className="mt-5 bg-[#07152b] text-white rounded-[28px] p-6">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                  Payment Reference
                </p>

                <p className="text-3xl font-black">
                  {(profile.payment_reference_prefix || "BRAG") + "-WinnerName"}
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[36px] p-8">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Collection Instructions Preview
              </p>

              <p className="text-2xl leading-relaxed text-white/75 font-bold">
                {profile.collection_instructions ||
                  "Collection instructions will appear here once added."}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[36px] p-8">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Why this matters
              </p>

              <div className="space-y-4 text-white/70 text-lg leading-relaxed">
                <p>
                  • Parents need clear invoice and collection instructions after
                  winning.
                </p>
                <p>
                  • The certificate becomes a keepsake after payment is confirmed.
                </p>
                <p>
                  • Clean collection notes reduce admin queries after the event.
                </p>
                <p>
                  • School-specific details make BragWall feel official and
                  trustworthy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
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
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#07152b]/10 rounded-[24px] p-5">
      <p className="uppercase tracking-[0.25em] text-xs font-black opacity-60 mb-3">
        {label}
      </p>

      <p className="text-2xl font-black">{value || "-"}</p>
    </div>
  );
}
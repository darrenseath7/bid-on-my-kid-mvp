"use client";

import { useEffect, useState } from "react";
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
  const [profile, setProfile] = useState<SchoolProfile>({
    auction_code: "demo",
    school_name: "",
    bank_name: "",
    account_name: "",
    account_number: "",
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

    const { error } = await supabase
      .from("demo_school_profile")
      .upsert(profile, {
        onConflict: "auction_code",
      });

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
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-2">
            Bid On My Kid
          </p>

          <h1 className="text-5xl font-black">
            School Profile
          </h1>

          <p className="text-neutral-600 mt-4 text-lg">
            Set the school details, EFT banking information, and artwork collection instructions shown on winner certificates.
          </p>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2">
              School Name
            </label>

            <input
              value={profile.school_name}
              onChange={(event) =>
                updateField("school_name", event.target.value)
              }
              className="w-full border rounded-2xl px-5 py-4"
              placeholder="Example: St Johns Primary School"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2">
                Bank Name
              </label>

              <input
                value={profile.bank_name}
                onChange={(event) =>
                  updateField("bank_name", event.target.value)
                }
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="Example: FNB"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Account Name
              </label>

              <input
                value={profile.account_name}
                onChange={(event) =>
                  updateField("account_name", event.target.value)
                }
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="Example: St Johns Primary School"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2">
                Account Number
              </label>

              <input
                value={profile.account_number}
                onChange={(event) =>
                  updateField("account_number", event.target.value)
                }
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="62012345678"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Branch Code
              </label>

              <input
                value={profile.branch_code}
                onChange={(event) =>
                  updateField("branch_code", event.target.value)
                }
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="250655"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              Payment Reference Prefix
            </label>

            <input
              value={profile.payment_reference_prefix}
              onChange={(event) =>
                updateField("payment_reference_prefix", event.target.value)
              }
              className="w-full border rounded-2xl px-5 py-4"
              placeholder="BOMK"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              Collection Instructions
            </label>

            <textarea
              value={profile.collection_instructions}
              onChange={(event) =>
                updateField("collection_instructions", event.target.value)
              }
              className="w-full border rounded-2xl px-5 py-4 min-h-36"
              placeholder="Please collect artwork from reception after payment confirmation."
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-black text-white rounded-2xl py-5 font-black text-xl disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save School Profile"}
          </button>

          {message && (
            <div className="rounded-2xl bg-neutral-100 border p-4 font-bold">
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <a href="/admin" className="font-bold underline">
            Back to dashboard
          </a>

          <a href="/auction/winner" className="font-bold underline">
            View winner certificate
          </a>
        </div>
      </div>
    </main>
  );
}
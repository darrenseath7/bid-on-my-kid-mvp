"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewSchoolEventPage() {
  const router = useRouter();

  const [schoolName, setSchoolName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [fundraisingTarget, setFundraisingTarget] = useState("50000");
  const [auctionCode, setAuctionCode] = useState("");
  const [saving, setSaving] = useState(false);

  const generatedAuctionCode = useMemo(() => {
    const schoolSlug = slugify(schoolName || "school");
    const eventSlug = slugify(eventName || "event");

    return `${schoolSlug}-${eventSlug}`;
  }, [schoolName, eventName]);

  const finalAuctionCode = auctionCode.trim()
    ? slugify(auctionCode)
    : generatedAuctionCode;

  const parentLink = `/auction/${finalAuctionCode}`;
  const adminLiveLink = `/admin/events/${finalAuctionCode}/live`;

  async function createEvent() {
    if (!schoolName.trim()) {
      alert("Please enter the school name.");
      return;
    }

    if (!eventName.trim()) {
      alert("Please enter the event name.");
      return;
    }

    if (!finalAuctionCode.trim()) {
      alert("Please enter or generate an auction code.");
      return;
    }

    setSaving(true);

    const target = Number(fundraisingTarget || 0);

    const { error: eventError } = await supabase.from("school_events").insert({
      auction_code: finalAuctionCode,
      school_name: schoolName.trim(),
      event_name: eventName.trim(),
      event_date: eventDate || null,
      fundraising_target: Number.isFinite(target) ? target : 0,
      status: "draft",
    });

    if (eventError) {
      setSaving(false);
      alert(eventError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from("demo_school_profile")
      .insert({
        auction_code: finalAuctionCode,
        school_name: schoolName.trim(),
        event_name: eventName.trim(),
        event_date: eventDate || null,
        payment_reference_prefix: finalAuctionCode
          .slice(0, 8)
          .toUpperCase()
          .replace(/-/g, ""),
        collection_instructions:
          "Please make payment using the reference shown on the winner certificate. Artwork may be collected from the school after payment confirmation.",
      });

    if (profileError) {
      setSaving(false);
      alert(profileError.message);
      return;
    }

    const { error: stateError } = await supabase
      .from("live_auction_state")
      .insert({
        auction_code: finalAuctionCode,
        child_name: "",
        child_surname: "",
        grade: "",
        artwork_url: "",
        current_bid: 0,
        leading_bidder: "No bids yet",
        status: "waiting",
        total_raised: 0,
        status_deadline: null,
        mc_commentary:
          "Welcome to tonight’s BragWall auction. The artworks are being prepared and bidding will begin soon.",
      });

    if (stateError) {
      setSaving(false);
      alert(stateError.message);
      return;
    }

    setSaving(false);
    router.push("/admin");
  }

  return (
    <main className="min-h-screen bg-[#07152b] text-white px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[32px] p-6 mb-8">
          <BrandHeader />
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="bg-white/10 border border-white/10 rounded-[36px] p-7 shadow-2xl">
            <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
              Create School Event
            </p>

            <h1 className="text-5xl md:text-6xl font-black leading-none mb-5">
              Set up a new BragWall auction.
            </h1>

            <p className="text-white/65 text-lg leading-relaxed mb-8 max-w-2xl">
              Create the school event first. After this, you will add grades and
              upload artwork linked to this auction code.
            </p>

            <div className="grid gap-5">
              <Field label="School Name">
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Example: Demo Primary School"
                  className="field-input"
                />
              </Field>

              <Field label="Event Name">
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Example: Grade 3 Art Night"
                  className="field-input"
                />
              </Field>

              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Event Date">
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="field-input"
                  />
                </Field>

                <Field label="Fundraising Target">
                  <input
                    value={fundraisingTarget}
                    onChange={(e) => setFundraisingTarget(e.target.value)}
                    placeholder="50000"
                    className="field-input"
                  />
                </Field>
              </div>

              <Field label="Auction Code">
                <input
                  value={auctionCode}
                  onChange={(e) => setAuctionCode(e.target.value)}
                  placeholder={generatedAuctionCode}
                  className="field-input"
                />

                <p className="text-white/45 text-sm font-bold mt-2">
                  Leave blank to use:{" "}
                  <span className="text-[#16d66d]">{generatedAuctionCode}</span>
                </p>
              </Field>

              <button
                onClick={createEvent}
                disabled={saving}
                className="bg-[#16d66d] text-[#07152b] rounded-[24px] py-5 px-6 font-black text-xl shadow-2xl disabled:opacity-50"
              >
                {saving ? "Creating Event..." : "Create School Event"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="bg-white text-[#07152b] rounded-[36px] p-7 shadow-2xl">
              <p className="uppercase tracking-[0.35em] text-xs text-slate-400 font-black mb-4">
                Event Preview
              </p>

              <h2 className="text-4xl font-black leading-none mb-4">
                {eventName || "Your Event Name"}
              </h2>

              <p className="text-slate-500 font-bold mb-6">
                {schoolName || "Your School Name"}
              </p>

              <div className="space-y-4">
                <PreviewRow label="Auction Code" value={finalAuctionCode} />
                <PreviewRow label="Parent Link" value={parentLink} />
                <PreviewRow label="Admin Live Room" value={adminLiveLink} />
                <PreviewRow
                  label="Target"
                  value={`R${Number(
                    fundraisingTarget || 0
                  ).toLocaleString()}`}
                />
              </div>
            </div>

            <div className="bg-[#ef2b20] rounded-[36px] p-7 shadow-2xl">
              <p className="uppercase tracking-[0.35em] text-xs text-white/50 font-black mb-4">
                Next Steps
              </p>

              <div className="space-y-4 text-lg font-black leading-relaxed">
                <p>1. Add grades/classes.</p>
                <p>2. Upload artwork for this event.</p>
                <p>3. Copy the parent auction link.</p>
                <p>4. Open the live control room.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          padding: 18px 20px;
          color: white;
          font-size: 18px;
          font-weight: 800;
          outline: none;
        }

        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block uppercase tracking-[0.28em] text-xs text-white/45 font-black mb-3">
        {label}
      </span>

      {children}
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f7f5f0] rounded-[22px] p-4">
      <p className="uppercase tracking-[0.25em] text-[10px] text-slate-400 font-black mb-2">
        {label}
      </p>

      <p className="font-black break-words">{value}</p>
    </div>
  );
}
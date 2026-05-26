"use client";

import { useEffect, useMemo, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

type Artwork = {
  id: string;
  auction_code: string;
  sort_order: number;
  child_name: string;
  child_surname: string;
  grade: string;
  artwork_url: string;
  ai_intro: string;
  sold_amount: number | null;
  winning_bidder: string | null;
  status: string;
};

export default function ArtworkUploadPage() {
  const [childName, setChildName] = useState("");
  const [childSurname, setChildSurname] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [file, setFile] = useState<File | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    fetchArtworks();

    const channel = supabase
      .channel("admin-artwork-onboarding")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: "auction_code=eq.demo",
        },
        () => fetchArtworks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", { ascending: true });

    setArtworks(data || []);
  }

  async function uploadArtwork() {
    if (!file || !childName || !childSurname || !grade) {
      setMessage("Please complete all fields and select an artwork image.");
      return;
    }

    setUploading(true);
    setMessage("");

    const fileExt = file.name.split(".").pop();
    const safeName = `${childName}-${childSurname}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    const fileName = `${Date.now()}-${safeName}.${fileExt}`;
    const filePath = `demo/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artworks")
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("artworks")
      .getPublicUrl(filePath);

    const { data: existingArtworks } = await supabase
      .from("demo_artworks")
      .select("sort_order")
      .eq("auction_code", "demo")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder =
      existingArtworks && existingArtworks.length > 0
        ? existingArtworks[0].sort_order + 1
        : 1;

    let aiIntro =
      `${childName}'s artwork is ready for the spotlight — bold, joyful, and guaranteed to make at least one grandparent bid emotionally.`;

    try {
      const introResponse = await fetch("/api/auction-mc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "intro",
          childName,
          grade,
        }),
      });

      const introData = await introResponse.json();

      if (introData.text) {
        aiIntro = introData.text;
      }
    } catch {
      // Keep fallback intro if AI call fails.
    }

    const { error: insertError } = await supabase.from("demo_artworks").insert({
      auction_code: "demo",
      sort_order: nextSortOrder,
      child_name: childName,
      child_surname: childSurname,
      grade,
      artwork_url: publicUrlData.publicUrl,
      ai_intro: aiIntro,
      status: "pending",
      sold_amount: 0,
      winning_bidder: null,
    });

    if (insertError) {
      setUploading(false);
      setMessage(insertError.message);
      return;
    }

    setChildName("");
    setChildSurname("");
    setGrade("Grade 3");
    setFile(null);
    setUploading(false);
    setMessage("Artwork added to the BragWall auction queue.");
    fetchArtworks();
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
              href="/auction/demo"
              className="rounded-2xl bg-white text-[#07152b] px-6 py-4 font-black shadow-xl"
            >
              Parent View
            </a>
          </div>
        </div>

        <div className="mb-10">
          <p className="uppercase tracking-[0.35em] text-xs text-white/40 font-black mb-4">
            Artwork Onboarding
          </p>

          <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] mb-5">
            Add masterpieces to the live event.
          </h1>

          <p className="text-white/55 text-2xl max-w-4xl leading-relaxed">
            Upload student artwork, generate a playful auction story, and place
            each piece into the BragWall queue with a premium gallery
            presentation.
          </p>
        </div>

        <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-[36px] p-7 text-[#07152b] shadow-2xl">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                  <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-3">
                    New Artwork
                  </p>

                  <h2 className="text-4xl font-black">
                    Upload & frame
                  </h2>
                </div>

                <div className="w-16 h-16 rounded-full bg-[#fff2d2] flex items-center justify-center text-4xl">
                  🎨
                </div>
              </div>

              <div className="space-y-5">
                <Field
                  label="Child Name"
                  value={childName}
                  onChange={setChildName}
                  placeholder="Ethan"
                />

                <Field
                  label="Child Surname"
                  value={childSurname}
                  onChange={setChildSurname}
                  placeholder="Smith"
                />

                <Field
                  label="Grade"
                  value={grade}
                  onChange={setGrade}
                  placeholder="Grade 3"
                />

                <div>
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                    Artwork Image
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] || null)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-5 py-5 bg-white text-[#07152b]"
                  />
                </div>

                <button
                  onClick={uploadArtwork}
                  disabled={uploading}
                  className="w-full bg-[#07152b] text-white rounded-2xl py-6 font-black text-xl shadow-xl disabled:opacity-50"
                >
                  {uploading ? "Creating BragWall story..." : "Add Artwork to Queue"}
                </button>

                {message && (
                  <div className="rounded-2xl bg-[#07152b] text-white p-5 font-bold">
                    {message}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Upload Tips
              </p>

              <div className="space-y-4 text-white/70 text-lg leading-relaxed">
                <p>• Use bright, clear photos of the child’s artwork.</p>
                <p>• Crop out tables, hands, shadows, and background clutter.</p>
                <p>• Keep the child’s name correct — it appears on the auction and certificate.</p>
                <p>• The AI MC story will be shown to parents during bidding.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[36px] p-6 shadow-2xl">
              <div className="mb-6">
                <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                  BragWall Preview
                </p>

                <h2 className="text-5xl font-black leading-tight">
                  {childName || "Child"} {childSurname || ""}
                </h2>

                <p className="text-white/50 text-xl mt-2">{grade}</p>
              </div>

              {previewUrl ? (
                <>
                  <PremiumFrame src={previewUrl} alt="Artwork preview" />

                  <div className="mt-6 bg-white/5 border border-white/10 rounded-[28px] p-6">
                    <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                      AI Story Preview
                    </p>

                    <p className="text-2xl font-bold leading-relaxed">
                      “This artwork is ready for the spotlight — bold, joyful,
                      and guaranteed to make at least one grandparent bid
                      emotionally.”
                    </p>
                  </div>
                </>
              ) : (
                <div className="min-h-[520px] rounded-[32px] border border-dashed border-white/20 flex items-center justify-center text-center px-8">
                  <div>
                    <div className="text-8xl mb-6">🖼️</div>
                    <h3 className="text-4xl font-black mb-4">
                      Preview appears here
                    </h3>
                    <p className="text-white/50 text-xl">
                      Select an artwork image to see the framed BragWall
                      presentation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-2xl font-black">Artwork Queue</h3>
                <p className="text-white/40">{artworks.length} artworks</p>
              </div>

              <div className="divide-y divide-white/10 max-h-[520px] overflow-auto">
                {artworks.length === 0 && (
                  <div className="p-6 text-white/40">
                    No artworks uploaded yet.
                  </div>
                )}

                {artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className="p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={artwork.artwork_url}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover bg-white/10 shrink-0"
                      />

                      <div className="min-w-0">
                        <p className="font-black text-lg truncate">
                          {artwork.sort_order}. {artwork.child_name}{" "}
                          {artwork.child_surname}
                        </p>

                        <p className="text-white/40 text-sm">
                          {artwork.grade} • {artwork.status}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-[#16d66d]">
                        {artwork.sold_amount
                          ? `R${artwork.sold_amount.toLocaleString()}`
                          : "-"}
                      </p>

                      {artwork.winning_bidder && (
                        <p className="text-white/40 text-sm">
                          {artwork.winning_bidder}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function PremiumFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.3)]">
      <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">
        <div className="bg-[#f8f5ef] rounded-[24px] p-5">
          <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">
            <img
              src={src}
              alt={alt}
              className="w-full max-h-[700px] object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
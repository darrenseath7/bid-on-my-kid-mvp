"use client";

import { useMemo, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import { supabase } from "@/lib/supabase";

export default function ArtworkUploadPage() {
  const [childName, setChildName] = useState("");
  const [childSurname, setChildSurname] = useState("");
  const [grade, setGrade] = useState("Grade 3");

  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) return "";

    return URL.createObjectURL(file);
  }, [file]);

  async function uploadArtwork() {
    if (
      !file ||
      !childName ||
      !childSurname ||
      !grade
    ) {
      setMessage(
        "Please complete all fields and select an artwork image."
      );

      return;
    }

    setUploading(true);
    setMessage("");

    const fileExt =
      file.name.split(".").pop();

    const fileName = `${Date.now()}-${childName}-${childSurname}.${fileExt}`;

    const filePath = `demo/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("artworks")
        .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      setMessage(uploadError.message);

      return;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("artworks")
      .getPublicUrl(filePath);

    const {
      data: existingArtworks,
    } = await supabase
      .from("demo_artworks")
      .select("sort_order")
      .eq("auction_code", "demo")
      .order("sort_order", {
        ascending: false,
      })
      .limit(1);

    const nextSortOrder =
      existingArtworks &&
      existingArtworks.length > 0
        ? existingArtworks[0]
            .sort_order + 1
        : 1;

    const introResponse = await fetch(
      "/api/auction-mc",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          mode: "intro",
          childName,
          grade,
        }),
      }
    );

    const introData =
      await introResponse.json();

    const { error: insertError } =
      await supabase
        .from("demo_artworks")
        .insert({
          auction_code: "demo",
          sort_order:
            nextSortOrder,
          child_name: childName,
          child_surname:
            childSurname,
          grade,
          artwork_url:
            publicUrlData.publicUrl,
          ai_intro:
            introData.text ||
            "A magnificent masterpiece ready for auction.",
          status: "pending",
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

    setMessage(
      "Artwork enhanced, framed beautifully, and added to the BragWall auction queue."
    );
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
            Artwork Onboarding
          </p>

          <h1 className="text-6xl lg:text-8xl font-black leading-[0.92] tracking-tight mb-6">
            Turn student art into a premium auction experience.
          </h1>

          <p className="text-2xl text-slate-500 leading-relaxed max-w-4xl">
            Upload student artwork, generate AI auction commentary, and instantly transform each piece into a framed BragWall masterpiece.
          </p>
        </div>

        {/* CONTENT */}
        <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-8">

          {/* LEFT */}
          <div className="bg-white rounded-[36px] p-8 shadow-xl border border-black/5">

            <h2 className="text-3xl font-black mb-8">
              Upload Artwork
            </h2>

            <div className="space-y-5">

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Child Name
                </label>

                <input
                  value={childName}
                  onChange={(event) =>
                    setChildName(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none"
                  placeholder="Ethan"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Child Surname
                </label>

                <input
                  value={childSurname}
                  onChange={(event) =>
                    setChildSurname(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none"
                  placeholder="Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Grade
                </label>

                <input
                  value={grade}
                  onChange={(event) =>
                    setGrade(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-5 py-5 text-lg outline-none"
                  placeholder="Grade 3"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                  Artwork Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setFile(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-5 py-5 bg-white"
                />
              </div>

              <button
                onClick={uploadArtwork}
                disabled={uploading}
                className="w-full bg-[#07152b] text-white rounded-2xl py-6 font-black text-xl shadow-xl disabled:opacity-50"
              >
                {uploading
                  ? "Enhancing Artwork..."
                  : "Enhance & Upload Artwork"}
              </button>

              {message && (
                <div className="rounded-2xl bg-[#07152b] text-white p-5 font-bold">
                  {message}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT */}
          <div>

            {!previewUrl ? (
              <div className="bg-white rounded-[36px] p-12 border border-black/5 shadow-xl h-full flex flex-col items-center justify-center text-center">

                <div className="text-8xl mb-8">
                  🎨
                </div>

                <h2 className="text-5xl font-black mb-5">
                  Gallery Preview
                </h2>

                <p className="text-slate-500 text-2xl leading-relaxed max-w-xl">
                  Upload artwork to see the premium BragWall framed presentation.
                </p>

              </div>
            ) : (
              <div>

                <div className="mb-6 text-center">
                  <p className="uppercase tracking-[0.3em] text-xs font-black text-[#2878cf] mb-4">
                    BragWall Enhanced Preview
                  </p>

                  <h2 className="text-5xl font-black leading-tight">
                    {childName || "Child"}{" "}
                    {childSurname || ""}
                  </h2>

                  <p className="text-slate-500 text-2xl mt-3">
                    {grade}
                  </p>
                </div>

                {/* PREMIUM FRAME */}
                <div className="relative">

                  <div className="bg-gradient-to-br from-[#70420f] to-[#2a1707] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)]">

                    <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">

                      <div className="bg-[#f8f5ef] rounded-[24px] p-6">

                        <div className="rounded-[18px] overflow-hidden bg-white shadow-2xl">

                          <img
                            src={previewUrl}
                            alt="Artwork Preview"
                            className="
                              w-full
                              max-h-[760px]
                              object-contain
                              contrast-110
                              saturate-110
                              brightness-105
                            "
                          />

                        </div>

                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </main>
  );
}
"use client";

import { useMemo, useState } from "react";
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
      "Artwork enhanced, framed beautifully, and added to the auction queue."
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white py-10 px-5">

      {/* BACKGROUND GLOW */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">

        {/* LEFT */}
        <div>

          <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-3">
            Bid On My Kid
          </p>

          <h1 className="text-6xl font-black leading-tight mb-6">
            AI artwork onboarding.
          </h1>

          <p className="text-neutral-400 text-xl leading-relaxed mb-10">
            Upload a child’s artwork and instantly transform it into a premium framed gallery piece ready for live auction.
          </p>

          <div className="bg-neutral-900 border border-neutral-800 rounded-[36px] p-6 space-y-5 shadow-2xl">

            <div>
              <label className="block text-sm font-bold mb-2">
                Child Name
              </label>

              <input
                value={childName}
                onChange={(event) =>
                  setChildName(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl bg-black border border-neutral-700 px-5 py-4 text-white"
                placeholder="Ethan"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Child Surname
              </label>

              <input
                value={childSurname}
                onChange={(event) =>
                  setChildSurname(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl bg-black border border-neutral-700 px-5 py-4 text-white"
                placeholder="Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Grade
              </label>

              <input
                value={grade}
                onChange={(event) =>
                  setGrade(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl bg-black border border-neutral-700 px-5 py-4 text-white"
                placeholder="Grade 3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
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
                className="w-full rounded-2xl bg-black border border-neutral-700 px-5 py-4 text-white"
              />
            </div>

            <button
              onClick={uploadArtwork}
              disabled={uploading}
              className="w-full bg-green-400 text-black rounded-2xl py-5 font-black text-xl disabled:opacity-50 shadow-2xl"
            >
              {uploading
                ? "Enhancing Artwork..."
                : "Enhance & Upload Artwork"}
            </button>

            {message && (
              <div className="bg-black border border-neutral-700 rounded-2xl p-4 font-bold">
                {message}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-center">

          {!previewUrl ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] p-10 text-center w-full shadow-2xl">
              <div className="text-7xl mb-6">
                🎨
              </div>

              <h2 className="text-3xl font-black mb-4">
                Gallery Preview
              </h2>

              <p className="text-neutral-400 text-lg">
                Upload an artwork to see the premium framed presentation.
              </p>
            </div>
          ) : (
            <div className="w-full">

              <div className="mb-5 text-center">
                <p className="uppercase tracking-[0.3em] text-xs text-neutral-500 mb-3">
                  AI Enhanced Gallery Presentation
                </p>

                <h2 className="text-4xl font-black">
                  {childName || "Child"}{" "}
                  {childSurname || ""}
                </h2>

                <p className="text-neutral-400 text-lg mt-2">
                  {grade}
                </p>
              </div>

              {/* PREMIUM FRAME */}
              <div className="relative">

                {/* OUTER FRAME */}
                <div className="bg-gradient-to-br from-[#3f2b14] via-[#6d4c1f] to-[#2a1909] p-5 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.9)]">

                  {/* INNER GOLD FRAME */}
                  <div className="bg-gradient-to-br from-[#f6e7b8] via-[#cfa95f] to-[#8c6528] p-3 rounded-[30px]">

                    {/* MAT BOARD */}
                    <div className="bg-[#f8f5ef] rounded-[24px] p-6">

                      {/* ARTWORK */}
                      <div className="rounded-[18px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-black/10 bg-white">

                        <img
                          src={previewUrl}
                          alt="Artwork Preview"
                          className="
                            w-full
                            max-h-[700px]
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

                {/* SPOTLIGHT */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_35%)] pointer-events-none rounded-[40px]" />

              </div>

            </div>
          )}

        </div>
      </div>
    </main>
  );
}
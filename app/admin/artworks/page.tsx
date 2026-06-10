"use client";

import { useEffect, useState } from "react";
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
  enhanced_artwork_url?: string | null;
  enhancement_status?: string | null;
  enhancement_notes?: string | null;
  ai_intro: string;
  sold_amount: number | null;
  winning_bidder: string | null;
  status: string;
};

function createHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function createStoryPreview({
  childName,
  childSurname,
  grade,
  nextSortOrder,
}: {
  childName: string;
  childSurname: string;
  grade: string;
  nextSortOrder: number;
}) {
  const cleanChildName = childName.trim() || "This young artist";
  const cleanChildSurname = childSurname.trim();
  const cleanGrade = grade.trim() || "this grade";
  const fullName = cleanChildSurname
    ? `${cleanChildName} ${cleanChildSurname}`
    : cleanChildName;

  const energyWords = [
    "colour",
    "confidence",
    "imagination",
    "charm",
    "joy",
    "spark",
    "heart",
    "personality",
    "creativity",
    "style",
    "magic",
    "bravery",
  ];

  const auctionMoments = [
    "serious fridge-door energy",
    "premium bragging rights",
    "grandparent-level bidding danger",
    "a big moment on the BragWall stage",
    "the kind of drama an auction room deserves",
    "a masterpiece moment waiting to happen",
    "the power to make parents bid emotionally",
    "a wall-worthy celebration of young talent",
    "the sort of artwork that deserves applause",
    "a proud family moment in the making",
  ];

  const templates = [
    `${fullName}’s ${cleanGrade} masterpiece steps into the spotlight with ${energyWords[0]}, ${energyWords[1]}, and ${auctionMoments[0]}.`,
    `${fullName} has created something full of ${energyWords[2]} and ${energyWords[3]} — exactly the kind of artwork that turns quiet parents into competitive bidders.`,
    `This ${cleanGrade} artwork by ${fullName} brings ${energyWords[4]}, ${energyWords[5]}, and ${auctionMoments[1]} to tonight’s auction.`,
    `${fullName}’s artwork has entered the room with ${energyWords[6]}, ${energyWords[7]}, and just enough auction sparkle to make the grandparents dangerous.`,
    `Fresh from ${cleanGrade}, ${fullName}’s creation is ready for ${auctionMoments[3]} — bold, proud, and impossible to ignore.`,
    `There is ${energyWords[8]} in every corner of ${fullName}’s artwork, and tonight it is officially ready for ${auctionMoments[5]}.`,
    `${fullName} brings us a ${cleanGrade} artwork packed with ${energyWords[9]}, ${energyWords[10]}, and ${auctionMoments[7]}.`,
    `This piece from ${fullName} is not just artwork — it is ${auctionMoments[9]}, wrapped in ${energyWords[0]} and confidence.`,
    `${fullName}’s ${cleanGrade} masterpiece is bringing ${energyWords[11]}, ${energyWords[4]}, and ${auctionMoments[8]} to BragWall tonight.`,
    `The spotlight is ready for ${fullName}. This ${cleanGrade} creation has ${energyWords[2]}, ${energyWords[6]}, and a very real chance of starting a family bidding war.`,
  ];

  const seed = `${fullName}-${cleanGrade}-${nextSortOrder}`;
  const index = createHash(seed) % templates.length;

  return templates[index];
}

export default function ArtworkUploadPage() {
  const [childName, setChildName] = useState("");
  const [childSurname, setChildSurname] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [enhanceArtwork, setEnhanceArtwork] = useState(true);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const nextSortOrder =
    artworks.length > 0
      ? Math.max(...artworks.map((artwork) => artwork.sort_order || 0)) + 1
      : 1;

  const storyPreview = createStoryPreview({
    childName,
    childSurname,
    grade,
    nextSortOrder,
  });

  useEffect(() => {
    fetchArtworks();

    const channel = supabase
      .channel("admin-artwork-onboarding-enhanced")
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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function fetchArtworks() {
    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", "demo")
      .order("sort_order", { ascending: true });

    setArtworks(data || []);
  }

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl("");
    }
  }

  async function uploadArtwork() {
    if (!file || !childName || !childSurname || !grade) {
      setMessage("Please complete all fields and select an artwork image.");
      return;
    }

    setUploading(true);
    setMessage(
      enhanceArtwork
        ? "Uploading original artwork and preparing AI enhancement..."
        : "Uploading original artwork..."
    );

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

    let aiIntro = storyPreview;

    try {
      const introResponse = await fetch("/api/auction-mc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "intro",
          childName,
          childSurname,
          grade,
          sortOrder: nextSortOrder,
          fallbackPreview: storyPreview,
        }),
      });

      const introData = await introResponse.json();

      if (introData.text && introData.text.trim()) {
        aiIntro = introData.text.trim();
      }
    } catch {
      aiIntro = storyPreview;
    }

    const { data: insertedArtwork, error: insertError } = await supabase
      .from("demo_artworks")
      .insert({
        auction_code: "demo",
        sort_order: nextSortOrder,
        child_name: childName,
        child_surname: childSurname,
        grade,
        artwork_url: publicUrlData.publicUrl,
        enhanced_artwork_url: null,
        enhancement_status: enhanceArtwork ? "processing" : "not_enhanced",
        enhancement_notes: enhanceArtwork
          ? "Waiting for AI enhancement."
          : "Original image only.",
        ai_intro: aiIntro,
        status: "pending",
        sold_amount: 0,
        winning_bidder: null,
      })
      .select("*")
      .single();

    if (insertError || !insertedArtwork) {
      setUploading(false);
      setMessage(insertError?.message || "Could not save artwork.");
      return;
    }

    if (enhanceArtwork) {
      setMessage(
        "Original artwork saved. Creating enhanced framed auction version..."
      );

      try {
        const enhanceResponse = await fetch("/api/enhance-artwork", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artworkId: insertedArtwork.id,
            imageUrl: publicUrlData.publicUrl,
            childName,
            childSurname,
            grade,
          }),
        });

        const enhanceResult = await enhanceResponse.json().catch(() => null);

        if (!enhanceResponse.ok) {
          setUploading(false);
          setMessage(
            enhanceResult?.details ||
              enhanceResult?.error ||
              "Artwork was uploaded, but AI enhancement failed."
          );
          fetchArtworks();
          return;
        }

        setMessage(
          "Artwork added. Enhanced framed auction version created successfully."
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? `Artwork uploaded, but enhancement failed: ${error.message}`
            : "Artwork uploaded, but enhancement failed."
        );
      }
    } else {
      setMessage("Artwork added to the BragWall auction queue.");
    }

    setChildName("");
    setChildSurname("");
    setGrade("Grade 3");
    setFile(null);
    setPreviewUrl("");
    setUploading(false);
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
            Upload student artwork, generate a playful auction story, and create
            an optional AI-enhanced framed version for a premium BragWall
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

                  <h2 className="text-4xl font-black">Upload & enhance</h2>
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
                      handleFileChange(event.target.files?.[0] || null)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-5 py-5 bg-white text-[#07152b]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setEnhanceArtwork(!enhanceArtwork)}
                  className={`w-full rounded-[28px] border-2 p-5 text-left transition ${
                    enhanceArtwork
                      ? "border-[#16b85d] bg-[#eafff2]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                        enhanceArtwork
                          ? "bg-[#16b85d] text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {enhanceArtwork ? "✓" : ""}
                    </div>

                    <div>
                      <p className="text-xl font-black mb-2">
                        Enhance artwork for auction display
                      </p>

                      <p className="text-slate-600 font-bold leading-relaxed">
                        Keeps the original artwork safely stored, then creates a
                        brighter, cleaner, framed auction-ready version for the
                        live event.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={uploadArtwork}
                  disabled={uploading}
                  className="w-full bg-[#07152b] text-white rounded-2xl py-6 font-black text-xl shadow-xl disabled:opacity-50"
                >
                  {uploading
                    ? enhanceArtwork
                      ? "Creating Enhanced Artwork..."
                      : "Creating BragWall Story..."
                    : "Add Artwork to Queue"}
                </button>

                {message && (
                  <div className="rounded-2xl bg-[#07152b] text-white p-5 font-bold leading-relaxed">
                    {message}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Enhancement Rules
              </p>

              <div className="space-y-4 text-white/70 text-lg leading-relaxed">
                <p>• The original artwork image remains stored safely.</p>
                <p>• Enhancement improves presentation, clarity, and framing.</p>
                <p>• The child’s actual artwork should stay authentic.</p>
                <p>
                  • If enhancement fails, the original artwork still remains in
                  the queue.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
              <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-4">
                Upload Tips
              </p>

              <div className="space-y-4 text-white/70 text-lg leading-relaxed">
                <p>• Use bright, clear photos of the child’s artwork.</p>
                <p>• Crop out tables, hands, shadows, and background clutter.</p>
                <p>
                  • Keep the child’s name correct — it appears on the auction
                  and certificate.
                </p>
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

                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-[28px] p-6">
                      <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                        AI Story Preview
                      </p>

                      <p className="text-xl font-bold leading-relaxed">
                        “{storyPreview}”
                      </p>
                    </div>

                    <div className="bg-[#16d66d] text-[#07152b] rounded-[28px] p-6">
                      <p className="uppercase tracking-[0.3em] text-xs font-black mb-3">
                        Enhancement
                      </p>

                      <p className="text-xl font-black leading-relaxed">
                        {enhanceArtwork
                          ? "AI will create a polished framed auction version after upload."
                          : "Only the original image will be stored."}
                      </p>
                    </div>
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

                    <div className="mt-8 bg-white/5 border border-white/10 rounded-[24px] p-5 text-left max-w-xl">
                      <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                        Story will update here
                      </p>

                      <p className="text-white/70 text-lg font-bold leading-relaxed">
                        Add the child’s name, grade, and artwork image to see a
                        unique auction story preview.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-2xl font-black">Artwork Queue</h3>
                <p className="text-white/40">
                  {artworks.length}{" "}
                  {artworks.length === 1 ? "artwork" : "artworks"}
                </p>
              </div>

              <div className="divide-y divide-white/10 max-h-[520px] overflow-auto">
                {artworks.length === 0 && (
                  <div className="p-6 text-white/40">
                    No artworks uploaded yet.
                  </div>
                )}

                {artworks.map((artwork) => {
                  const displayUrl =
                    artwork.enhanced_artwork_url || artwork.artwork_url;

                  return (
                    <div
                      key={artwork.id}
                      className="p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={displayUrl}
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

                          <EnhancementBadge
                            status={artwork.enhancement_status}
                            hasEnhancedImage={Boolean(
                              artwork.enhanced_artwork_url
                            )}
                          />
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
                  );
                })}
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

function EnhancementBadge({
  status,
  hasEnhancedImage,
}: {
  status?: string | null;
  hasEnhancedImage: boolean;
}) {
  const cleanStatus = status || "not_enhanced";

  if (hasEnhancedImage || cleanStatus === "complete") {
    return (
      <span className="inline-block mt-2 rounded-full bg-[#16d66d] text-[#07152b] px-3 py-1 text-xs font-black">
        Enhanced
      </span>
    );
  }

  if (cleanStatus === "processing") {
    return (
      <span className="inline-block mt-2 rounded-full bg-[#ffc857] text-[#07152b] px-3 py-1 text-xs font-black">
        Enhancing...
      </span>
    );
  }

  if (cleanStatus === "failed") {
    return (
      <span className="inline-block mt-2 rounded-full bg-[#ef2b20] text-white px-3 py-1 text-xs font-black">
        Enhancement Failed
      </span>
    );
  }

  return (
    <span className="inline-block mt-2 rounded-full bg-white/10 text-white/60 px-3 py-1 text-xs font-black">
      Original Only
    </span>
  );
}
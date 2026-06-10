"use client";

import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import AdminLogoutButton from "@/components/AdminLogoutButton";
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

  const enhancedCount = artworks.filter((artwork) => {
    return Boolean(artwork.enhanced_artwork_url);
  }).length;

  const processingCount = artworks.filter((artwork) => {
    return artwork.enhancement_status === "processing";
  }).length;

  const pendingCount = artworks.filter((artwork) => {
    return artwork.status !== "sold";
  }).length;

  useEffect(() => {
    fetchArtworks();

    const channel = supabase
      .channel("admin-artwork-studio-premium")
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
    <main className="min-h-screen bg-[#020b18] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_10%,rgba(22,214,109,0.15),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,200,87,0.13),transparent_32%),linear-gradient(180deg,#061124,#020b18_65%,#010712)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative grid xl:grid-cols-[280px_1fr] min-h-screen">
        <aside className="border-r border-white/10 bg-[#061124]/85 backdrop-blur-xl p-5 xl:sticky xl:top-0 xl:h-screen">
          <div className="bg-white rounded-[28px] p-4 shadow-2xl mb-6">
            <BrandHeader />
          </div>

          <nav className="space-y-3 mb-6">
            <AdminNavLink href="/admin" label="Dashboard" icon="🏠" />
            <AdminNavLink href="/admin/live" label="Live Room" icon="🔨" />
            <AdminNavLink
              href="/admin/artworks"
              label="Artwork Upload"
              icon="🎨"
              active
            />
            <AdminNavLink href="/admin/sales" label="Sales Records" icon="💳" />
            <AdminNavLink href="/auction/demo" label="Parent View" icon="📱" />
          </nav>

          <div className="rounded-[28px] bg-white/5 border border-white/10 p-4 mb-5">
            <p className="uppercase tracking-[0.3em] text-[10px] text-white/40 font-black mb-3">
              Artwork Studio
            </p>
            <p className="text-3xl font-black text-[#16d66d]">
              {artworks.length}
            </p>
            <p className="text-white/50 text-sm font-bold mt-2">
              artworks in the BragWall queue
            </p>
          </div>

          <AdminLogoutButton />
        </aside>

        <section className="min-h-screen">
          <header className="border-b border-white/10 bg-[#020b18]/70 backdrop-blur-xl p-5 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/10 px-4 py-3 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
                  <span className="uppercase tracking-[0.32em] text-[10px] font-black text-white/60">
                    Artwork Studio
                  </span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black leading-[0.9]">
                  Prepare the masterpieces.
                </h1>

                <p className="text-white/55 text-lg font-bold mt-3 max-w-3xl">
                  Upload each child’s artwork, preview the framed auction
                  presentation, generate a playful MC story, and optionally
                  create an AI-enhanced display version.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[520px]">
                <MetricCard label="Total" value={`${artworks.length}`} />
                <MetricCard
                  label="Enhanced"
                  value={`${enhancedCount}`}
                  green
                />
                <MetricCard
                  label="Pending"
                  value={`${pendingCount}`}
                  gold
                />
              </div>
            </div>
          </header>

          <div className="grid 2xl:grid-cols-[0.82fr_1.18fr] gap-5 p-5 lg:p-8">
            <div className="space-y-5">
              <section className="rounded-[36px] bg-white text-[#07152b] p-6 lg:p-7 shadow-2xl">
                <div className="flex items-center justify-between gap-4 mb-7">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-xs text-slate-400 font-black mb-3">
                      New Artwork
                    </p>

                    <h2 className="text-4xl font-black">Upload & enhance</h2>
                  </div>

                  <div className="w-16 h-16 rounded-[24px] bg-[#fff2d2] flex items-center justify-center text-4xl">
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

                    <label className="block rounded-[28px] border-2 border-dashed border-slate-200 bg-[#fbf8f1] p-6 cursor-pointer hover:border-[#16b85d] transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleFileChange(event.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[24px] bg-white shadow flex items-center justify-center text-4xl shrink-0">
                          🖼️
                        </div>

                        <div>
                          <p className="text-xl font-black">
                            {file ? file.name : "Choose artwork image"}
                          </p>
                          <p className="text-slate-500 font-bold mt-1">
                            Use a clear, bright photo of the child’s artwork.
                          </p>
                        </div>
                      </div>
                    </label>
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
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 ${
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
                          Keep the original image safely stored, then create a
                          cleaner, brighter, framed auction-ready version for
                          the live event.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={uploadArtwork}
                    disabled={uploading}
                    className="w-full bg-[#07152b] text-white rounded-[24px] py-6 font-black text-xl shadow-xl disabled:opacity-50 hover:scale-[1.01] transition"
                  >
                    {uploading
                      ? enhanceArtwork
                        ? "Creating Enhanced Artwork..."
                        : "Creating BragWall Story..."
                      : "Add Artwork to Queue"}
                  </button>

                  {message && (
                    <div className="rounded-[24px] bg-[#07152b] text-white p-5 font-bold leading-relaxed">
                      {message}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[34px] bg-[#061124]/90 border border-white/10 p-5 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-[10px] text-[#16d66d] font-black mb-4">
                  Studio Guidance
                </p>

                <div className="space-y-3 text-white/70 font-bold leading-relaxed">
                  <p>• Original artwork stays safely stored.</p>
                  <p>• AI enhancement improves presentation and framing.</p>
                  <p>• Use artwork-only images where possible.</p>
                  <p>• If enhancement fails, the original remains in queue.</p>
                </div>
              </section>

              <section className="rounded-[34px] bg-[#061124]/90 border border-white/10 p-5 shadow-2xl">
                <p className="uppercase tracking-[0.3em] text-[10px] text-[#ffc857] font-black mb-4">
                  Upload Tips
                </p>

                <div className="space-y-3 text-white/70 font-bold leading-relaxed">
                  <p>• Use bright, clear photos.</p>
                  <p>• Crop out tables, shadows, and background clutter.</p>
                  <p>• Check the child’s name and grade before upload.</p>
                  <p>• The story preview appears on the parent auction screen.</p>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-[42px] bg-white/5 border border-white/10 p-4 lg:p-6 shadow-[0_35px_100px_rgba(0,0,0,0.38)]">
                <div className="rounded-[36px] bg-[#061124] border border-white/10 p-5 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                    <div>
                      <p className="uppercase tracking-[0.35em] text-[10px] text-[#16d66d] font-black mb-2">
                        BragWall Preview
                      </p>

                      <h2 className="text-4xl lg:text-5xl font-black leading-none">
                        {childName || "Child"} {childSurname || ""}
                      </h2>

                      <p className="text-white/50 font-bold mt-2">{grade}</p>
                    </div>

                    <div className="rounded-[24px] bg-[#ffc857] text-[#07152b] px-5 py-4 text-center shrink-0">
                      <p className="uppercase tracking-[0.25em] text-[9px] font-black opacity-70">
                        Artwork
                      </p>
                      <p className="text-xl font-black">
                        #{nextSortOrder}
                      </p>
                    </div>
                  </div>

                  {previewUrl ? (
                    <>
                      <PremiumFrame src={previewUrl} alt="Artwork preview" />

                      <div className="mt-5 grid md:grid-cols-2 gap-4">
                        <div className="bg-white text-[#07152b] rounded-[28px] p-5 shadow-xl">
                          <p className="uppercase tracking-[0.25em] text-[10px] text-slate-400 font-black mb-3">
                            AI Story Preview
                          </p>

                          <p className="text-lg font-black leading-snug">
                            “{storyPreview}”
                          </p>
                        </div>

                        <div
                          className={`rounded-[28px] p-5 shadow-xl ${
                            enhanceArtwork
                              ? "bg-[#16d66d] text-[#07152b]"
                              : "bg-white/5 border border-white/10 text-white"
                          }`}
                        >
                          <p className="uppercase tracking-[0.25em] text-[10px] font-black mb-3 opacity-70">
                            Enhancement
                          </p>

                          <p className="text-lg font-black leading-snug">
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
                        <p className="text-white/50 text-xl max-w-xl mx-auto">
                          Select an artwork image to see the framed BragWall
                          presentation.
                        </p>

                        <div className="mt-8 bg-white/5 border border-white/10 rounded-[24px] p-5 text-left max-w-xl">
                          <p className="uppercase tracking-[0.3em] text-xs text-white/40 font-black mb-3">
                            Story will update here
                          </p>

                          <p className="text-white/70 text-lg font-bold leading-relaxed">
                            Add the child’s name, grade, and artwork image to
                            see a unique auction story preview.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[34px] bg-[#061124]/90 border border-white/10 p-5 shadow-2xl">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="uppercase tracking-[0.3em] text-[10px] text-[#16d66d] font-black mb-2">
                      Artwork Queue
                    </p>
                    <p className="text-white/50 font-bold">
                      {artworks.length}{" "}
                      {artworks.length === 1 ? "artwork" : "artworks"} ready
                      for the event
                    </p>
                  </div>

                  <button
                    onClick={fetchArtworks}
                    className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4 font-black hover:bg-white/15 transition"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {artworks.length === 0 && (
                    <div className="rounded-[26px] bg-white/5 border border-white/10 p-6 text-white/50 font-bold">
                      No artworks uploaded yet.
                    </div>
                  )}

                  {artworks.map((artwork) => {
                    const displayUrl =
                      artwork.enhanced_artwork_url || artwork.artwork_url;

                    return (
                      <div
                        key={artwork.id}
                        className="rounded-[26px] bg-white/5 border border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-20 h-20 rounded-[22px] overflow-hidden bg-white shrink-0">
                              {displayUrl ? (
                                <img
                                  src={displayUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  🎨
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-black text-lg truncate">
                                {artwork.sort_order}. {artwork.child_name}{" "}
                                {artwork.child_surname}
                              </p>

                              <p className="text-white/40 text-sm font-bold">
                                {artwork.grade} • {artwork.status}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusBadge status={artwork.status} />
                                <EnhancementBadge
                                  status={artwork.enhancement_status}
                                  hasEnhancedImage={Boolean(
                                    artwork.enhanced_artwork_url
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-black text-[#16d66d] text-lg">
                              {artwork.sold_amount
                                ? `R${artwork.sold_amount.toLocaleString()}`
                                : "-"}
                            </p>

                            {artwork.winning_bidder && (
                              <p className="text-white/40 text-sm font-bold">
                                {artwork.winning_bidder}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminNavLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-[22px] px-4 py-4 font-black transition ${
        active
          ? "bg-[#16d66d] text-[#07152b]"
          : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function MetricCard({
  label,
  value,
  green = false,
  gold = false,
}: {
  label: string;
  value: string;
  green?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-[26px] bg-white/5 border border-white/10 p-4 shadow-xl">
      <p className="uppercase tracking-[0.25em] text-[9px] text-white/40 font-black mb-2">
        {label}
      </p>
      <p
        className={`text-2xl lg:text-3xl font-black leading-none ${
          green ? "text-[#16d66d]" : gold ? "text-[#ffc857]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
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
    <div className="rounded-[34px] overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.45)] bg-[#16110b]">
      <div className="bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%),linear-gradient(180deg,#241b13,#090909)] p-4 lg:p-6">
        <div className="bg-gradient-to-br from-[#c78b25] via-[#f7df8f] to-[#6a3b0b] p-2.5 rounded-[28px] shadow-[0_0_45px_rgba(255,200,87,0.18)]">
          <div className="bg-[#f8f5ef] rounded-[22px] p-4">
            <div className="rounded-[16px] overflow-hidden bg-white min-h-[280px] flex items-center justify-center">
              <img
                src={src}
                alt={alt}
                className="w-full max-h-[62vh] object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-10 bg-gradient-to-b from-[#5b3312] to-[#1b1008]" />
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const cleanStatus = status || "pending";

  const styles =
    cleanStatus === "live"
      ? "bg-[#16d66d] text-[#07152b]"
      : cleanStatus === "sold"
      ? "bg-[#ef2b20] text-white"
      : "bg-white/10 text-white/70";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles}`}>
      {cleanStatus.toUpperCase()}
    </span>
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
      <span className="inline-block rounded-full bg-[#16d66d] text-[#07152b] px-3 py-1 text-xs font-black">
        ENHANCED
      </span>
    );
  }

  if (cleanStatus === "processing") {
    return (
      <span className="inline-block rounded-full bg-[#ffc857] text-[#07152b] px-3 py-1 text-xs font-black">
        ENHANCING
      </span>
    );
  }

  if (cleanStatus === "failed") {
    return (
      <span className="inline-block rounded-full bg-[#ef2b20] text-white px-3 py-1 text-xs font-black">
        FAILED
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full bg-white/10 text-white/60 px-3 py-1 text-xs font-black">
      ORIGINAL
    </span>
  );
}
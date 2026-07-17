"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import AdminAuctionSelector from "@/components/AdminAuctionSelector";
import AdminShell from "@/components/admin/AdminShell";
import AdminPanel from "@/components/admin/AdminPanel";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { supabase } from "@/lib/supabase";
import { sanitizeAuctionCode, useAdminAuctionCode } from "@/lib/useAdminAuctionCode";

type SchoolProfile = {
  id?: string;
  auction_code: string;
  school_name: string;
  branch_code: string;
  payment_reference_prefix: string;
  collection_instructions: string;
  bid_increment?: number | null;
};

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

const DEFAULT_AUCTION_CODE = "demo";

const MAX_COMPRESSED_IMAGE_WIDTH = 1600;
const MAX_COMPRESSED_IMAGE_BYTES = 1.8 * 1024 * 1024;
const COMPRESSED_IMAGE_QUALITY = 0.82;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";

  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function createCompressedFileName(fileName: string) {
  const cleanBaseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "artwork";

  return `${cleanBaseName}-bragwall.jpg`;
}

async function loadImageFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read this image file."));
      img.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressArtworkImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file for the artwork.");
  }

  const image = await loadImageFromFile(file).catch((error) => {
    if (file.size > MAX_COMPRESSED_IMAGE_BYTES) {
      throw new Error(
        "This image is too large and could not be compressed in the browser. Please save it as a JPG/PNG first, or upload a screenshot/cropped version."
      );
    }

    throw error;
  });

  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const needsResize = largestSide > MAX_COMPRESSED_IMAGE_WIDTH;
  const needsSizeCompression = file.size > MAX_COMPRESSED_IMAGE_BYTES;

  if (!needsResize && !needsSizeCompression && file.type !== "image/heic") {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  const scale = needsResize ? MAX_COMPRESSED_IMAGE_WIDTH / largestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the artwork image for upload.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", COMPRESSED_IMAGE_QUALITY);
  });

  if (!blob) {
    throw new Error("Could not compress this artwork image.");
  }

  const compressedFile = new File([blob], createCompressedFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    compressed: compressedFile.size < file.size || needsResize || needsSizeCompression,
    originalSize: file.size,
    compressedSize: compressedFile.size,
  };
}

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

export default function AdminSetupPage() {
  const [auctionCode, setAdminAuctionCode] = useAdminAuctionCode(DEFAULT_AUCTION_CODE);
  const [profile, setProfile] = useState<SchoolProfile>({
    auction_code: DEFAULT_AUCTION_CODE,
    school_name: "",
    branch_code: "",
    payment_reference_prefix: "",
    collection_instructions: "",
    bid_increment: 100,
  });

  const [childName, setChildName] = useState("");
  const [childSurname, setChildSurname] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isArtworkDragging, setIsArtworkDragging] = useState(false);
  const [enhanceArtwork, setEnhanceArtwork] = useState(true);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [message, setMessage] = useState("");
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const activeAuctionCodeRef = useRef(sanitizeAuctionCode(DEFAULT_AUCTION_CODE));

  const draftAuctionCode = sanitizeAuctionCode(profile.auction_code || auctionCode || DEFAULT_AUCTION_CODE);

  const liveUpcomingArtworks = artworks.filter((artwork) => {
    return artwork.status !== "sold" && artwork.status !== "archived";
  });

  const soldArtworks = artworks.filter((artwork) => {
    return artwork.status === "sold";
  });

  const archivedArtworks = artworks.filter((artwork) => {
    return artwork.status === "archived";
  });

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

  const enhancedCount = artworks.filter((artwork) =>
    Boolean(artwork.enhanced_artwork_url)
  ).length;

  useEffect(() => {
    const activeAuctionCode = sanitizeAuctionCode(auctionCode || DEFAULT_AUCTION_CODE);
    let cancelled = false;

    activeAuctionCodeRef.current = activeAuctionCode;
    setMessage("");
    setArtworks([]);
    setProfile((current) => ({
      ...current,
      auction_code: activeAuctionCode,
      school_name: "",
      branch_code: "",
      payment_reference_prefix: "",
      collection_instructions: "",
      bid_increment: current.bid_increment || 100,
    }));

    fetchProfile(activeAuctionCode, () => cancelled);
    fetchArtworks(activeAuctionCode, () => cancelled);

    const channel = supabase
      .channel(`admin-setup-school-artwork-${activeAuctionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demo_artworks",
          filter: `auction_code=eq.${activeAuctionCode}`,
        },
        () => fetchArtworks(activeAuctionCode, () => cancelled)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [auctionCode]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function fetchProfile(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const cleanAuctionCode = sanitizeAuctionCode(targetAuctionCode || DEFAULT_AUCTION_CODE);

    const { data } = await supabase
      .from("demo_school_profile")
      .select("*")
      .eq("auction_code", cleanAuctionCode)
      .maybeSingle();

    if (isCancelled() || activeAuctionCodeRef.current !== cleanAuctionCode) return;

    if (data) {
      setProfile({
        auction_code: cleanAuctionCode,
        school_name: data.school_name || "",
        branch_code: data.branch_code || "",
        payment_reference_prefix: data.payment_reference_prefix || "",
        collection_instructions: data.collection_instructions || "",
        bid_increment: data.bid_increment || 100,
      });
    } else {
      setProfile((current) => ({
        ...current,
        auction_code: cleanAuctionCode,
        school_name: "",
        branch_code: "",
        payment_reference_prefix: "",
        collection_instructions: "",
        bid_increment: current.bid_increment || 100,
      }));
    }
  }

  async function fetchArtworks(
    targetAuctionCode = auctionCode,
    isCancelled: () => boolean = () => false
  ) {
    const cleanAuctionCode = sanitizeAuctionCode(targetAuctionCode || DEFAULT_AUCTION_CODE);

    const { data } = await supabase
      .from("demo_artworks")
      .select("*")
      .eq("auction_code", cleanAuctionCode)
      .order("sort_order", { ascending: true });

    if (isCancelled() || activeAuctionCodeRef.current !== cleanAuctionCode) return;

    setArtworks((data || []).filter((artwork) => artwork.auction_code === cleanAuctionCode));
  }

  function updateProfileField(field: keyof SchoolProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: field === "auction_code" ? sanitizeAuctionCode(value) : value,
    }));
  }

  function updateSchoolName(value: string) {
    setProfile((current) => ({
      ...current,
      school_name: value,
    }));
  }

  function updateBidIncrement(value: string) {
    const parsed = Number(value);

    setProfile((current) => ({
      ...current,
      bid_increment: Number.isFinite(parsed) && parsed > 0 ? parsed : 100,
    }));
  }

  async function runSetupAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/setup-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auctionCode, ...payload }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "Admin setup action failed.");
    }

    return result as { ok: boolean; message?: string };
  }
  async function saveProfile() {
    setSavingProfile(true);
    setMessage("");

    try {
      const targetAuctionCode = sanitizeAuctionCode(profile.auction_code || auctionCode);

      const result = await runSetupAction({
        action: "save-profile",
        auctionCode: targetAuctionCode,
        profile: {
          ...profile,
          auction_code: targetAuctionCode,
        },
      });

      setMessage(
        result.message || "School and auction setup saved successfully."
      );
      setAdminAuctionCode(targetAuctionCode);

      if (targetAuctionCode !== auctionCode) {
        const url = new URL(window.location.href);
        url.searchParams.set("auctionCode", targetAuctionCode);
        window.location.href = url.toString();
        return;
      }

      fetchProfile(targetAuctionCode);
      fetchArtworks(targetAuctionCode);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save school setup."
      );
    }

    setSavingProfile(false);
  }
  function handleFileChange(selectedFile: File | null) {
    if (selectedFile && !selectedFile.type.startsWith("image/")) {
      setMessage("Please choose an image file for the artwork.");
      return;
    }

    setFile(selectedFile);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setMessage(
        selectedFile.size > MAX_COMPRESSED_IMAGE_BYTES
          ? `Large image selected (${formatBytes(selectedFile.size)}). BragWall will compress it before upload.`
          : ""
      );
    } else {
      setPreviewUrl("");
      setMessage("");
    }
  }

  function handleArtworkDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsArtworkDragging(false);

    const selectedFile = event.dataTransfer.files?.[0] || null;

    if (!selectedFile) return;

    handleFileChange(selectedFile);
  }

  function handleArtworkDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsArtworkDragging(false);
    }
  }

  function cancelArtworkUpload() {
    uploadAbortControllerRef.current?.abort();
    uploadAbortControllerRef.current = null;
    setUploading(false);
    setUploadStage("");
    setMessage("Upload cancelled. Your selected artwork is still ready if you want to try again.");
  }

  async function uploadArtwork() {
    if (!file || !childName || !childSurname || !grade) {
      setMessage("Please complete all artwork fields and select an image.");
      return;
    }

    const abortController = new AbortController();
    uploadAbortControllerRef.current = abortController;
    setUploading(true);
    setUploadStage("Preparing image...");
    setMessage("Preparing artwork image for upload...");

    try {
      const preparedImage = await compressArtworkImage(file);

      if (abortController.signal.aborted) {
        throw new DOMException("Upload cancelled.", "AbortError");
      }

      if (preparedImage.compressed) {
        setMessage(
          `Large image compressed from ${formatBytes(preparedImage.originalSize)} to ${formatBytes(preparedImage.compressedSize)} for a faster upload.`
        );
      }

      setUploadStage(
        enhanceArtwork
          ? "Uploading and enhancing artwork..."
          : "Uploading artwork..."
      );

      const targetAuctionCode = sanitizeAuctionCode(profile.auction_code || auctionCode || DEFAULT_AUCTION_CODE);



      const formData = new FormData();


      formData.append("action", "upload-artwork");


      formData.append("auctionCode", targetAuctionCode);
      formData.append("childName", childName);
      formData.append("childSurname", childSurname);
      formData.append("grade", grade);
      formData.append("nextSortOrder", String(nextSortOrder));
      formData.append("storyPreview", storyPreview);
      formData.append("enhanceArtwork", String(enhanceArtwork));
      formData.append("file", preparedImage.file);

      const response = await fetch("/api/admin/setup-action", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            "This image is still too large for the server. Please crop it or save it as a smaller JPG, then try again."
          );
        }

        throw new Error(result?.error || "Could not upload artwork.");
      }

      setMessage(result?.message || "Artwork added to the BragWall auction queue.");
      setChildName("");
      setChildSurname("");
      setGrade("Grade 3");
      setFile(null);
      setPreviewUrl("");
      setAdminAuctionCode(targetAuctionCode);
      fetchArtworks(targetAuctionCode);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("Upload cancelled. Your selected artwork is still ready if you want to try again.");
      } else {
        setMessage(
          error instanceof Error ? error.message : "Could not upload artwork."
        );
      }
    } finally {
      if (uploadAbortControllerRef.current === abortController) {
        uploadAbortControllerRef.current = null;
      }

      setUploading(false);
      setUploadStage("");
    }
  }
  async function archiveArtwork(artwork: Artwork) {
    const confirmed = window.confirm(
      `Archive ${artwork.child_name} ${artwork.child_surname}'s artwork?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const result = await runSetupAction({
        action: "archive-artwork",
        artworkId: artwork.id,
      });

      setMessage(
        result.message ||
          `${artwork.child_name} ${artwork.child_surname}'s artwork has been archived.`
      );
      fetchArtworks(draftAuctionCode);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not archive artwork."
      );
    }
  }
  async function restoreArtwork(artwork: Artwork) {
    setMessage("");

    try {
      const result = await runSetupAction({
        action: "restore-artwork",
        artworkId: artwork.id,
      });

      setMessage(
        result.message ||
          `${artwork.child_name} ${artwork.child_surname}'s artwork has been restored to upcoming artworks.`
      );
      fetchArtworks(draftAuctionCode);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not restore artwork."
      );
    }
  }
  async function archiveAllUnsoldArtworks() {
    const confirmed = window.confirm(
      "Archive all unsold artworks? Sold artworks will stay in Sold Artworks."
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const result = await runSetupAction({
        action: "archive-all-unsold",
      });

      setMessage(result.message || "All unsold artworks have been moved to the archive.");
      fetchArtworks(draftAuctionCode);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not archive all unsold artworks."
      );
    }
  }
  return (
    <AdminShell
      active="setup"
      eyebrow="Add School & Artwork"
      title="Setup studio"
      description="Create the school auction profile, set payment references, upload children's artwork, and manage the artwork lifecycle from one polished BragWall workspace."
      status={
        <div className="inline-flex items-center gap-3 rounded-full border border-[#16d66d]/35 bg-[#16d66d]/12 px-4 py-3 text-sm font-black text-[#16d66d] shadow-[0_0_30px_rgba(22,214,109,0.12)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#16d66d] shadow-[0_0_16px_rgba(22,214,109,0.9)]" />
          {artworks.length} loaded
        </div>
      }
      selector={
        <AdminPanel className="p-4 md:p-4">
          <div className="space-y-3">
            <AdminAuctionSelector />
            <div className="rounded-[18px] border border-[#16d66d]/20 bg-[#16d66d]/10 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#16d66d]">
                Parent link
              </p>
              <p className="mt-1 break-all text-xs font-black text-white/82">
                /auction/{draftAuctionCode}
              </p>
            </div>
          </div>
        </AdminPanel>
      }
    >
      {message && (
        <div className="mb-5 rounded-[22px] border border-[#16d66d]/25 bg-[#16d66d]/10 px-5 py-4 text-sm font-black leading-relaxed text-white shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          {message}
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="Upcoming"
          value={`${liveUpcomingArtworks.length}`}
          subtext="Ready for auction"
          tone="green"
          icon={<span>🎨</span>}
        />
        <AdminStatCard
          label="Sold"
          value={`${soldArtworks.length}`}
          subtext="Completed artworks"
          tone="yellow"
          icon={<span>🔨</span>}
        />
        <AdminStatCard
          label="Archived"
          value={`${archivedArtworks.length}`}
          subtext="Removed from queue"
          tone="purple"
          icon={<span>🗂️</span>}
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-5">
          <AdminPanel
            eyebrow="School setup"
            title="Payment, reference & increment"
            description="Set the school name, auction link, payment reference, bidding step and collection instructions."
            action={<div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-3xl shadow-xl">🏫</div>}
          >
            <div className="grid gap-4">
              <Field
                label="School Name"
                value={profile.school_name}
                onChange={updateSchoolName}
                placeholder="St John's Preparatory"
              />

              <Field
                label="School URL slug"
                value={profile.auction_code}
                onChange={(value) => updateProfileField("auction_code", value)}
                placeholder="prime-primary"
              />

              <div className="rounded-[20px] border border-[#16d66d]/20 bg-[#16d66d]/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#16d66d]">
                  Parent auction link
                </p>
                <p className="mt-1 break-all text-sm font-black text-white">
                  /auction/{draftAuctionCode}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Reference Code"
                  value={profile.payment_reference_prefix}
                  onChange={(value) => updateProfileField("payment_reference_prefix", value)}
                  placeholder="Optional - e.g. SCHOOL-ART"
                />

                <div>
                  <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                    Bid Increment
                  </label>
                  <select
                    value={String(profile.bid_increment || 100)}
                    onChange={(event) => updateBidIncrement(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#061124]/80 px-5 py-4 text-base font-black text-white outline-none focus:border-[#16d66d]"
                  >
                    <option value="25">R25</option>
                    <option value="50">R50</option>
                    <option value="100">R100</option>
                    <option value="250">R250</option>
                    <option value="500">R500</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Collection Instructions
                </label>
                <textarea
                  value={profile.collection_instructions}
                  onChange={(event) => updateProfileField("collection_instructions", event.target.value)}
                  className="min-h-[118px] w-full rounded-2xl border border-white/10 bg-[#061124]/80 px-5 py-4 text-base font-bold text-white outline-none focus:border-[#16d66d]/70"
                  placeholder="Artwork may be collected from the school office after payment confirmation."
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="rounded-[18px] bg-[#16d66d] px-6 py-4 text-base font-black text-[#031124] shadow-[0_20px_55px_rgba(22,214,109,0.18)] transition hover:scale-[1.01] disabled:opacity-50"
              >
                {savingProfile ? "Saving Setup..." : "Save School Setup"}
              </button>
            </div>
          </AdminPanel>

          <AdminPanel
            eyebrow="New artwork"
            title="Upload & enhance"
            description="Add the child, grade and artwork photo. BragWall will keep the original and optionally create a cleaner auction display image."
            action={<div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#fff2d2] text-3xl shadow-xl">🎨</div>}
          >
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Child Name" value={childName} onChange={setChildName} placeholder="Ethan" />
                <Field label="Child Surname" value={childSurname} onChange={setChildSurname} placeholder="Smith" />
              </div>

              <Field label="Grade" value={grade} onChange={setGrade} placeholder="Grade 3" />

              <div>
                <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Artwork Image
                </label>
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsArtworkDragging(true);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsArtworkDragging(true);
                  }}
                  onDragLeave={handleArtworkDragLeave}
                  onDrop={handleArtworkDrop}
                  className={`group block cursor-pointer rounded-[26px] border border-dashed p-5 transition ${
                    isArtworkDragging
                      ? "border-[#16d66d] bg-[#16d66d]/12 shadow-[0_0_42px_rgba(22,214,109,0.18)]"
                      : "border-white/15 bg-white/[0.04] hover:border-[#16d66d]/70 hover:bg-white/[0.06]"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-white/10 text-4xl shadow transition group-hover:scale-[1.03]">
                      🖼️
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black">
                        {file ? "Artwork ready to upload" : isArtworkDragging ? "Drop artwork image here" : "Drag artwork here or click to browse"}
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-[#16d66d]/90">
                        {file ? file.name : "JPG, PNG, WEBP or HEIC artwork photo"}
                      </p>
                      <p className="mt-2 text-sm font-bold leading-relaxed text-white/48">
                        Use a clear, bright photo. Large phone images are compressed before upload to prevent size errors.
                      </p>
                    </div>
                    {file ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleFileChange(null);
                        }}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-[#ffc857]/60 hover:text-[#ffc857]"
                      >
                        Replace
                      </button>
                    ) : null}
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setEnhanceArtwork(!enhanceArtwork)}
                className={`rounded-[22px] border p-4 text-left transition ${
                  enhanceArtwork
                    ? "border-[#16d66d]/50 bg-[#16d66d]/12 shadow-[0_0_40px_rgba(22,214,109,0.10)]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black ${enhanceArtwork ? "bg-[#16d66d] text-[#031124]" : "bg-white/10 text-white/40"}`}>
                    {enhanceArtwork ? "✓" : ""}
                  </div>
                  <div>
                    <p className="text-lg font-black">Enhance artwork for auction display</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-white/56">
                      Keep the original safely stored, then create a cleaner, brighter auction-ready version. This can take longer than saving the original only.
                    </p>
                  </div>
                </div>
              </button>

              {uploading ? (
                <div className="rounded-[22px] border border-[#ffc857]/30 bg-[#ffc857]/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-black text-white">
                        {uploadStage || "Uploading artwork..."}
                      </p>
                      <p className="mt-1 text-sm font-bold text-white/55">
                        You can cancel and try again with the same selected image.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelArtworkUpload}
                      className="rounded-[16px] border border-[#ffc857]/40 bg-[#ffc857]/16 px-5 py-3 text-sm font-black text-[#ffc857] transition hover:bg-[#ffc857]/24"
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                onClick={uploadArtwork}
                disabled={uploading}
                className="rounded-[18px] bg-[#16d66d] px-6 py-4 text-base font-black text-[#031124] shadow-[0_20px_55px_rgba(22,214,109,0.18)] transition hover:scale-[1.01] disabled:opacity-50"
              >
                {uploading ? "Upload Running..." : "Add Artwork to Queue"}
              </button>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-5">
          <AdminPanel className="relative overflow-hidden border-[#16d66d]/20 bg-[#062d2b]/72">
            <img
              src="/bragwall-admin-paint-texture.png"
              alt=""
              className="pointer-events-none absolute right-[-62px] top-[-76px] h-[270px] w-[230px] object-contain opacity-45"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.32em] text-[#16d66d]">School Preview</p>
              <h2 className="mb-5 text-4xl font-black leading-none tracking-[-0.06em] md:text-6xl">
                {profile.school_name || "School Name"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <PreviewCard label="Bid Increment" value={`R${Number(profile.bid_increment || 100).toLocaleString()}`} />
                <PreviewCard label="Payment Reference" value={profile.payment_reference_prefix || "BRAG"} />
              </div>
              <div className="mt-4 rounded-[22px] border border-white/10 bg-[#07152b] p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Payment Reference</p>
                <p className="text-2xl font-black">{(profile.payment_reference_prefix || "BRAG") + "-WinnerName"}</p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="BragWall Preview" title={`${childName || "Child"} ${childSurname || ""}`.trim()} description={grade}>
            {previewUrl ? (
              <>
                <PremiumFrame src={previewUrl} alt="Artwork preview" />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/42">AI Story Preview</p>
                    <p className="text-base font-black leading-snug">“{storyPreview}”</p>
                  </div>
                  <div className={`rounded-[22px] p-4 ${enhanceArtwork ? "bg-[#16d66d]/14 text-white border border-[#16d66d]/35" : "bg-white/5 border border-white/10 text-white"}`}>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">Enhancement</p>
                    <p className="text-base font-black leading-snug">
                      {enhanceArtwork
                        ? "AI will create a polished framed auction version after upload."
                        : "Only the original image will be stored."}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.035] p-8 text-center">
                <p className="text-4xl">🖼️</p>
                <p className="mt-3 text-xl font-black">Choose an artwork image to preview it here.</p>
                <p className="mt-2 text-sm font-semibold text-white/45">The preview will show the auction frame and generated MC story before upload.</p>
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            eyebrow="Artwork studio"
            title="Live, sold and archived"
            description="Manage the full artwork lifecycle from one place."
            action={
              <div className="flex flex-wrap gap-3">
                <button onClick={() => fetchArtworks(draftAuctionCode)} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black transition hover:bg-white/15">Refresh</button>
                <button onClick={archiveAllUnsoldArtworks} disabled={liveUpcomingArtworks.length === 0} className="rounded-2xl bg-[#ffc857] px-4 py-3 text-sm font-black text-[#07152b] disabled:opacity-40">Archive Unsold</button>
              </div>
            }
          >
            <div className="space-y-4 max-h-[720px] overflow-y-auto overflow-x-hidden pr-1">
              <ArtworkSection
                title="Live / Upcoming Artworks"
                subtitle="Artworks still available for the auction."
                emptyText="No upcoming artworks."
                artworks={liveUpcomingArtworks}
                actionLabel="Archive"
                onAction={archiveArtwork}
              />
              <ArtworkSection
                title="Sold Artworks"
                subtitle="Completed artworks with winning bid details."
                emptyText="No sold artworks yet."
                artworks={soldArtworks}
              />
              <ArtworkSection
                title="Archived / Unsold Artworks"
                subtitle="Unsold artworks removed from the active auction queue."
                emptyText="No archived artworks yet."
                artworks={archivedArtworks}
                actionLabel="Restore"
                onAction={restoreArtwork}
              />
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
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
      <label className="block text-sm font-black uppercase tracking-[0.2em] text-white/42 mb-3">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-2xl border border-white/10 bg-[#061124]/80 px-5 py-4 text-base font-bold text-white outline-none focus:border-[#16d66d]/70"
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({
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
      <label className="block text-sm font-black uppercase tracking-[0.2em] text-white/42 mb-3">
        {label}
      </label>

      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#061124]/80 px-5 py-4 text-base font-bold text-white outline-none focus:border-[#16d66d]/70"
        placeholder={placeholder}
      />
    </div>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
      <p className="uppercase tracking-[0.25em] text-xs font-black opacity-60 mb-3">
        {label}
      </p>

      <p className="text-2xl font-black text-white">{value || "-"}</p>
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

function ArtworkSection({
  title,
  subtitle,
  emptyText,
  artworks,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  artworks: Artwork[];
  actionLabel?: string;
  onAction?: (artwork: Artwork) => void;
}) {
  return (
    <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-2xl font-black">{title}</h3>
          <p className="text-white/45 font-bold text-sm mt-1">{subtitle}</p>
        </div>

        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center shrink-0">
          <p className="text-2xl font-black text-[#16d66d]">
            {artworks.length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {artworks.length === 0 && (
          <div className="rounded-[24px] bg-white/5 border border-white/10 p-5 text-white/45 font-bold">
            {emptyText}
          </div>
        )}

        {artworks.map((artwork) => (
          <ArtworkRow
            key={artwork.id}
            artwork={artwork}
            actionLabel={actionLabel}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

function ArtworkRow({
  artwork,
  actionLabel,
  onAction,
}: {
  artwork: Artwork;
  actionLabel?: string;
  onAction?: (artwork: Artwork) => void;
}) {
  const displayUrl = artwork.enhanced_artwork_url || artwork.artwork_url;

  return (
    <div className="rounded-[26px] bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-20 h-20 rounded-[22px] overflow-hidden bg-white shrink-0">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt=""
                className={`w-full h-full object-cover ${artwork.status === "sold" ? "opacity-60" : ""}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/42">
                🎨
              </div>
            )}

            {artwork.status === "sold" && (
              <div className="absolute inset-x-[-10px] top-1/2 -translate-y-1/2 rotate-[-14deg] bg-[#ef2b20] py-1 text-center text-[10px] font-black text-white shadow-lg">
                SOLD
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
                hasEnhancedImage={Boolean(artwork.enhanced_artwork_url)}
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

          {actionLabel && onAction && (
            <button
              onClick={() => onAction(artwork)}
              className={`mt-3 rounded-2xl px-4 py-2 text-sm font-black ${
                actionLabel === "Restore"
                  ? "bg-[#16d66d] text-white"
                  : "bg-[#ffc857] text-white"
              }`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const cleanStatus = status || "pending";

  const styles =
    cleanStatus === "live"
      ? "bg-[#16d66d] text-white"
      : cleanStatus === "sold"
      ? "bg-[#ef2b20] text-white"
      : cleanStatus === "archived"
      ? "bg-[#ffc857] text-white"
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
      <span className="inline-block rounded-full bg-[#16d66d] text-white px-3 py-1 text-xs font-black">
        ENHANCED
      </span>
    );
  }

  if (cleanStatus === "processing") {
    return (
      <span className="inline-block rounded-full bg-[#ffc857] text-white px-3 py-1 text-xs font-black">
        ENHANCING
      </span>
    );
  }

  if (cleanStatus === "failed") {
    return (
      <span className="inline-block rounded-full bg-white/10 text-white/60 px-3 py-1 text-xs font-black">
        ORIGINAL
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full bg-white/10 text-white/60 px-3 py-1 text-xs font-black">
      ORIGINAL
    </span>
  );
}

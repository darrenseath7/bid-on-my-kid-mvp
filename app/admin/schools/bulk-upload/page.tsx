"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { imageKey, prepareBulkImage, readImages, readManifest, type BulkRow } from "@/lib/bulkArtworkImport";
import { useAdminAuctionCode } from "@/lib/useAdminAuctionCode";

type ReviewRow = BulkRow & { verified: boolean; uploaded: boolean };

function ArtworkThumb({ file, index }: { file: File | undefined; index: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img alt={`Artwork ${index}`} className="h-20 w-20 rounded-xl object-cover" src={url} /> :
    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5 text-white/50">No image</div>;
}

function comparable(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export default function BulkArtworkUpload() {
  const [auctionCode] = useAdminAuctionCode();
  const [schoolName, setSchoolName] = useState("");
  const [startingOrder, setStartingOrder] = useState(1);
  const [images, setImages] = useState<Map<string, File>>(new Map());
  const [manifest, setManifest] = useState<BulkRow[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [imageLabel, setImageLabel] = useState("");
  const [manifestLabel, setManifestLabel] = useState("");
  const [filter, setFilter] = useState<"all" | "review">("all");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [batchId, setBatchId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    setSchoolName(""); setManifest([]); setImages(new Map()); setRows([]); setError("");
    setReady(false); setImageLabel(""); setManifestLabel("");
    async function loadSchool() {
      try {
        const response = await fetch(`/api/admin/setup-action?auctionCode=${encodeURIComponent(auctionCode)}&includeArtworks=true`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.profile?.school_name) throw new Error("Save and select a school before importing artwork.");
        if (!active) return;
        setSchoolName(data.profile.school_name);
        setStartingOrder(Math.max(0, ...((data.artworks || []) as { sort_order?: number }[]).map(item => Number(item.sort_order) || 0)) + 1);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "School could not be loaded."); }
    }
    void loadSchool();
    return () => { active = false; };
  }, [auctionCode]);

  useEffect(() => {
    const duplicateNames = new Map<string, number>();
    for (const row of manifest) {
      const name = [row.firstName, row.surname, row.grade, row.school, row.className].map(comparable).join("|");
      duplicateNames.set(name, (duplicateNames.get(name) || 0) + 1);
    }
    setRows(manifest.map(row => ({
      ...row,
      verified: (duplicateNames.get([row.firstName, row.surname, row.grade, row.school, row.className].map(comparable).join("|")) || 0) < 2,
      uploaded: false,
    })));
  }, [manifest]);

  const filenameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(imageKey(row.filename), (counts.get(imageKey(row.filename)) || 0) + 1);
    return counts;
  }, [rows]);

  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = [row.firstName, row.surname, row.grade, row.school, row.className].map(comparable).join("|");
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return counts;
  }, [rows]);

  function issues(row: ReviewRow) {
    const missing = [row.filename, row.firstName, row.surname, row.grade, row.school].some(value => !value.trim());
    if (missing) return "Complete required fields";
    if (row.filename.includes("/") || row.filename.includes("\\")) return "Use image filename only";
    if (!images.has(imageKey(row.filename))) return "Image missing";
    if ((filenameCounts.get(imageKey(row.filename)) || 0) > 1) return "Image assigned twice";
    if (comparable(row.school) !== comparable(schoolName)) return "School differs from selected school";
    if (row.firstName.length > 100 || row.surname.length > 100 || row.grade.length > 60 || row.className.length > 60) return "Field is too long";
    const name = [row.firstName, row.surname, row.grade, row.school, row.className].map(comparable).join("|");
    if (!row.verified && (nameCounts.get(name) || 0) > 1) return "Verify repeated artist name";
    return "";
  }

  const needsReview = rows.filter(row => !!issues(row));
  const unusedImages = [...images.keys()].filter(key => !filenameCounts.has(key));
  const canApprove = !!schoolName && !!rows.length && !loading && !ready && needsReview.length === 0 && unusedImages.length === 0;

  async function selectImages(files: FileList | null) {
    if (!files?.length) return;
    try {
      setLoading(true); setError(""); setReady(false); setImages(new Map());
      const selected = await readImages(files);
      setImages(selected);
      setImageLabel(`${selected.size} image${selected.size === 1 ? "" : "s"} selected`);
      if (!selected.size) setError("No JPG, PNG or WEBP images were found in that selection.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open images."); }
    finally { setLoading(false); }
  }

  async function selectManifest(file: File | undefined) {
    if (!file) return;
    try {
      setLoading(true); setError(""); setReady(false); setManifest([]); setBatchId(crypto.randomUUID());
      const parsed = await readManifest(file);
      setManifest(parsed);
      setManifestLabel(file.name);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open spreadsheet."); }
    finally { setLoading(false); }
  }

  function edit(index: number, field: keyof BulkRow, value: string) {
    setRows(previous => previous.map((row, i) => i === index && !row.uploaded ? { ...row, [field]: value, verified: false } : row));
  }

  async function approve() {
    if (!canApprove) return;
    setLoading(true); setError("");
    let nextOrder = startingOrder;
    let uploaded = 0;
    try {
      const schoolResponse = await fetch(`/api/admin/setup-action?auctionCode=${encodeURIComponent(auctionCode)}&includeArtworks=true`, { cache: "no-store" });
      const latest = await schoolResponse.json();
      if (!schoolResponse.ok || comparable(latest.profile?.school_name || "") !== comparable(schoolName))
        throw new Error("Selected school changed. Refresh the page and review the batch again.");
      nextOrder = Math.max(0, ...((latest.artworks || []) as { sort_order?: number }[]).map(item => Number(item.sort_order) || 0)) + 1;
      // Sequential uploads preserve sort order and avoid a burst of AI requests.
      for (let index = 0; index < rows.length; index++) {
        if (rows[index].uploaded) continue;
        const row = rows[index];
        const image = images.get(imageKey(row.filename));
        if (!image) throw new Error(`Missing image: ${row.filename}`);
        setProgress(`Adding artwork ${index + 1} of ${rows.length}: ${row.filename}`);
        const data = new FormData();
        data.append("action", "upload-artwork");
        data.append("bulkUpload", "true");
        data.append("bulkSourceKey", `${batchId}:${index}`);
        data.append("auctionCode", auctionCode);
        data.append("childName", row.firstName);
        data.append("childSurname", row.surname);
        data.append("grade", row.grade);
        if (row.className) data.append("className", row.className);
        data.append("nextSortOrder", String(nextOrder++));
        data.append("storyPreview", `${row.firstName} ${row.surname} of ${row.grade} created a beautiful artwork for ${schoolName}.`);
        data.append("enhanceArtwork", "false");
        data.append("file", await prepareBulkImage(image));
        const response = await fetch("/api/admin/setup-action", { method: "POST", body: data });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${row.filename}: ${result.error || "Could not add artwork."}`);
        uploaded++;
        setRows(previous => previous.map((item, i) => i === index ? { ...item, uploaded: true } : item));
      }
      setReady(true);
      setProgress(`${rows.length} artworks added to ${schoolName}.`);
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : "Upload stopped."} ${uploaded} added in this attempt. Leave this page open and press Resume to continue.`);
    } finally { setLoading(false); }
  }

  return <AdminShell active="setup" eyebrow="Add School & Artwork" title="Bulk Artwork Upload" description="Add an entire school, grade or class in one go. Review every artwork before approving." selector={<div className="rounded-xl border border-white/20 bg-[#0c2037] px-4 py-3 text-sm font-bold text-white">{schoolName || "Loading school..."} · {auctionCode}</div>}>
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-white/10 bg-[#0c2037] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc857]">Add one artwork</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">Need to upload or enhance a single artwork? The existing form is still available.</p>
        <a href={`/admin/setup?auctionCode=${encodeURIComponent(auctionCode)}`} className="mt-4 block rounded-xl bg-[#16d66d] px-3 py-3 text-center text-sm font-black text-[#031124]">Open single upload →</a>
      </aside>
    <div className="min-w-0">
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc857]">BragWall admin · batch review</p><h1 className="mt-1 text-3xl font-black">Bulk Artwork Upload</h1><p className="mt-2 text-white/70">Add a whole school, grade or class in one go. Review everything before approving.</p></div>
        <div className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold">{schoolName || "Loading school..."} · {auctionCode}</div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="cursor-pointer rounded-2xl border border-dashed border-[#16d66d]/70 bg-[#0c2037] p-6"><input type="file" accept=".zip,.jpg,.jpeg,.png,.webp" multiple disabled={loading || rows.some(row => row.uploaded)} className="sr-only" onChange={event => void selectImages(event.target.files)} /><span className="text-2xl">🖼️</span><span className="ml-3 text-lg font-black">1. Artwork images or ZIP</span><p className="mt-3 text-sm text-white/65">Choose JPG, PNG or WEBP images, or a ZIP with up to 500 images.</p><p className="mt-4 font-bold text-[#16d66d]">{imageLabel || "Choose images or ZIP"}</p></label>
        <label className="cursor-pointer rounded-2xl border border-dashed border-[#16d66d]/70 bg-[#0c2037] p-6"><input type="file" accept=".csv,.xlsx" disabled={loading || rows.some(row => row.uploaded)} className="sr-only" onChange={event => void selectManifest(event.target.files?.[0])} /><span className="text-2xl">📋</span><span className="ml-3 text-lg font-black">2. Spreadsheet (CSV or Excel)</span><p className="mt-3 text-sm text-white/65">Columns: filename, first_name, surname, grade, school; optional class.</p><p className="mt-4 font-bold text-[#16d66d]">{manifestLabel || "Choose spreadsheet"}</p></label>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-900/50 p-4 text-red-100">{error}</p>}
      {progress && <p role="status" className="mt-5 rounded-xl bg-[#16d66d]/10 p-4 text-[#16d66d]">{progress}</p>}
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#0c2037] p-4 text-center font-bold sm:gap-5"><div>{rows.filter(row => !row.uploaded && !issues(row)).length} ready</div><div className="text-[#ffc857]">{needsReview.length} need review</div><div>{rows.filter(row => row.uploaded).length} added</div></div>
      <div className="mt-4 flex gap-3"><button onClick={() => setFilter("all")} className={`rounded-full px-4 py-2 text-sm ${filter === "all" ? "bg-[#16d66d] text-[#031124]" : "border border-white/20"}`}>All {rows.length}</button><button onClick={() => setFilter("review")} className={`rounded-full px-4 py-2 text-sm ${filter === "review" ? "bg-[#ffc857] text-[#031124]" : "border border-white/20"}`}>Needs review {needsReview.length}</button></div>
      <div className="mt-4 space-y-3">{rows.map((row, index) => {
        const issue = issues(row);
        if (filter === "review" && !issue) return null;
        const image = images.get(imageKey(row.filename));
        return <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-[#0c2037] p-3 sm:grid-cols-[80px_1fr_1fr_1fr_auto] sm:items-center">
          <ArtworkThumb file={image} index={index + 1} />
          <div className="space-y-1"><input aria-label={`First name row ${index + 1}`} className="w-full rounded-lg bg-[#061124] p-2" value={row.firstName} onChange={event => edit(index, "firstName", event.target.value)} /><input aria-label={`Surname row ${index + 1}`} className="w-full rounded-lg bg-[#061124] p-2" value={row.surname} onChange={event => edit(index, "surname", event.target.value)} /></div>
          <div className="space-y-1"><input aria-label={`Grade row ${index + 1}`} className="w-full rounded-lg bg-[#061124] p-2" value={row.grade} onChange={event => edit(index, "grade", event.target.value)} /><input aria-label={`Class row ${index + 1}`} placeholder="Class optional" className="w-full rounded-lg bg-[#061124] p-2" value={row.className} onChange={event => edit(index, "className", event.target.value)} /></div>
          <div><input aria-label={`Filename row ${index + 1}`} className="w-full rounded-lg bg-[#061124] p-2 text-sm" value={row.filename} onChange={event => edit(index, "filename", event.target.value)} /><input aria-label={`School row ${index + 1}`} className="mt-1 w-full rounded-lg bg-[#061124] p-2 text-xs" value={row.school} onChange={event => edit(index, "school", event.target.value)} /></div>
          <div className="text-sm font-bold">{row.uploaded ? <span className="text-[#16d66d]">Added</span> : issue === "Verify repeated artist name" ? <label className="text-[#ffc857]"><input type="checkbox" className="mr-2" checked={row.verified} onChange={event => setRows(previous => previous.map((item, i) => i === index ? { ...item, verified: event.target.checked } : item))} />Repeated name verified</label> : <span className={issue ? "text-[#ffc857]" : "text-[#16d66d]"}>{issue || "Ready"}</span>}</div>
        </div>;
      })}</div>
      {unusedImages.length > 0 && <p className="mt-4 text-sm text-[#ffc857]">{unusedImages.length} images are not listed in the spreadsheet. Every image needs one row.</p>}
      <div className="sticky bottom-3 mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ffc857]/50 bg-[#0c2037] p-4 shadow-2xl"><p className="text-sm">{ready ? "Batch complete. All artworks were added." : needsReview.length || unusedImages.length ? "Resolve all rows before approval." : "Only an internal admin can add this reviewed batch."}</p><button onClick={() => void approve()} disabled={!canApprove} className="rounded-xl bg-[#16d66d] px-6 py-3 font-black text-[#031124] disabled:cursor-not-allowed disabled:opacity-40">{ready ? "Batch complete" : loading ? "Adding artworks..." : rows.some(row => row.uploaded) ? "Resume remaining artworks" : `Approve & add ${rows.length} artworks`}</button></div>
    </div>
    </div>
  </AdminShell>;
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { imageKey, prepareBulkImage, readImages, readManifest, type BulkRow } from '@/lib/bulkArtworkImport';

type Row = BulkRow & { voice?: File; voiceConfirmed?: boolean; uploaded?: boolean; verified?: boolean };

function VoicePreview({ file }: { file: File }) {
  const [url,setUrl] = useState('');
  useEffect(() => { const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); },[file]);
  return url ? <audio controls preload="none" src={url} className="mt-2 h-9 max-w-full" /> : null;
}

function VoiceRecorder({ disabled, onFile }: { disabled: boolean; onFile: (file: File, seconds: number) => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording,setRecording] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); },[]);
  async function start() {
    try {
      setError('');
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Recording is not supported here. Upload an audio file instead.');
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const type = ['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
      const media = new MediaRecorder(stream,type ? {mimeType:type} : undefined);
      const chunks: BlobPart[] = [];
      media.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      media.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (timer.current) clearTimeout(timer.current);
        setRecording(false);
        const mime = media.mimeType.split(';')[0];
        const extension = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
        if (chunks.length) onFile(new File(chunks,`child-voice.${extension}`,{type:mime}), (Date.now() - startedAt.current) / 1000);
      };
      recorder.current = media;
      startedAt.current = Date.now();
      media.start(); setRecording(true);
      timer.current = setTimeout(() => { if (media.state === 'recording') media.stop(); },30000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Microphone unavailable.'); }
  }
  return <div className="mt-2"><button type="button" disabled={disabled} onClick={() => recording ? recorder.current?.stop() : void start()} className="rounded-lg border border-[#ffc857] px-3 py-2 text-xs font-bold disabled:opacity-40">{recording ? '■ Stop recording' : '● Record voice note'}</button>{recording && <p className="text-xs text-[#ffc857]">Recording… stops after 30 seconds</p>}{error && <p className="text-xs text-red-300">{error}</p>}</div>;
}

export default function SchoolUploadPage() {
  const [code, setCode] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState('');
  const [checkingSchool, setCheckingSchool] = useState(true);
  const [images, setImages] = useState<Map<string, File>>(new Map());
  const [rows, setRows] = useState<Row[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [batchId, setBatchId] = useState('');

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }
  async function api(form?: FormData) {
    const response = await fetch(form ? '/api/school-upload' : `/api/school-upload?code=${encodeURIComponent(code)}`, {
      method: form ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${await token()}` },
      body: form, cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('code') || '');
    const update = async () => { const { data } = await supabase.auth.getSession(); setSignedIn(!!data.session); setSignedInEmail(data.session?.user?.email || ''); };
    void update();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void update(); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!signedIn || !code) { setSchool(''); setRows([]); setImages(new Map()); setBatchId(''); setSubmitted(false); return; }
    let active = true;
    setCheckingSchool(true);
    (async () => { try { const result = await api(); if (active) { setSchool(result.school); setError(''); setCheckingSchool(false); } }
      catch (reason) { if (active) { setSchool(''); setError(String(reason instanceof Error ? reason.message : reason)); setCheckingSchool(false); } } })();
    return () => { active = false; };
  }, [signedIn, code]); // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn() {
    setError(''); setMessage('');
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { emailRedirectTo: window.location.href },
    });
    if (authError) setError(authError.message);
    else setMessage('Check your school email for your sign-in link. Open it on this device.');
  }

  const names = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = [row.firstName, row.surname, row.grade, row.school, row.className].map(v => v.trim().toLowerCase()).join('|');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [rows]);
  const filenames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(imageKey(row.filename), (counts.get(imageKey(row.filename)) || 0) + 1);
    return counts;
  }, [rows]);
  function issue(row: Row) {
    if (![row.filename,row.firstName,row.surname,row.grade,row.school].every(v => v.trim())) return 'Complete required fields';
    if (row.filename.includes('/') || row.filename.includes('\\')) return 'Use image filename only';
    if (row.school.trim().toLowerCase() !== school.trim().toLowerCase()) return `School must be ${school}`;
    if (!images.has(imageKey(row.filename))) return 'Image missing';
    if ((filenames.get(imageKey(row.filename)) || 0) !== 1) return 'Filename used more than once';
    const key = [row.firstName,row.surname,row.grade,row.school,row.className].map(v => v.trim().toLowerCase()).join('|');
    if ((names.get(key) || 0) > 1 && !row.verified) return 'Confirm repeated artist name';
    if (row.voice && !row.voiceConfirmed) return 'Confirm permission for voice note';
    return '';
  }
  const unused = [...images.keys()].filter(key => !filenames.has(key));
  const errors = rows.map((row, index) => issue(row) ? `Row ${index + 2}: ${issue(row)}` : '').filter(Boolean);
  const canSubmit = !!school && rows.length > 0 && images.size > 0 && !errors.length && !unused.length && !busy && !submitted;

  async function addVoice(index: number, file?: File, recordedSeconds?: number) {
    if (!file) return;
    if (!['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/x-m4a'].includes(file.type) || file.size > 2_000_000) {
      setError('Use MP3, M4A, OGG or WebM audio under 2 MB.'); return;
    }
    const url = recordedSeconds === undefined ? URL.createObjectURL(file) : '';
    try {
      const seconds = recordedSeconds ?? await new Promise<number>((resolve, reject) => {
        const audio = new Audio(); audio.preload = 'metadata'; audio.src = url;
        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.onerror = () => reject(new Error('Cannot read voice note duration.'));
      });
      if (!Number.isFinite(seconds) || seconds < 15 || seconds > 35) throw new Error('Voice note should be about 20–30 seconds (15–35 seconds accepted).');
      setRows(previous => previous.map((row,i) => i === index ? { ...row, voice: file, voiceConfirmed: false } : row));
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Invalid voice note.'); }
    finally { if (url) URL.revokeObjectURL(url); }
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setError('');
    let activeBatch = batchId;
    try {
      if (!activeBatch) {
        const start = new FormData(); start.set('action','start'); start.set('code',code); start.set('count',String(rows.length));
        activeBatch = (await api(start)).batchId;
        setBatchId(activeBatch);
      }
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (row.uploaded) continue;
        setMessage(`Uploading artwork ${index + 1} of ${rows.length}: ${row.filename}`);
        const form = new FormData();
        form.set('action','row'); form.set('code',code); form.set('batchId',activeBatch);
        form.set('index',String(index)); form.set('filename',row.filename);
        form.set('firstName',row.firstName); form.set('surname',row.surname);
        form.set('grade',row.grade); form.set('className',row.className);
        form.set('image',await prepareBulkImage(images.get(imageKey(row.filename))!));
        if (row.voice) { form.set('voice',row.voice); form.set('voiceConfirmed',String(!!row.voiceConfirmed)); }
        await api(form);
        setRows(previous => previous.map((item,i) => i === index ? { ...item, uploaded: true } : item));
      }
      const finish = new FormData(); finish.set('action','complete'); finish.set('code',code); finish.set('batchId',activeBatch);
      await api(finish);
      setSubmitted(true); setMessage('Submission complete. BragWall will review your artwork before parents see it.');
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : 'Upload stopped.'} Keep this tab open, then press Complete submission to retry.`);
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#061426] text-white">
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
        <div><p className="text-3xl font-black">Brag<span className="text-[#ffc857]">Wall</span></p><p className="text-xs font-bold tracking-widest text-white/50">SCHOOL ARTWORK PORTAL</p></div>
        {signedIn && <div className="flex items-center gap-3"><span className="text-xs text-white/65">Signed in: {signedInEmail}</span><button className="rounded-lg border border-white/30 px-4 py-2 text-sm" onClick={() => void supabase.auth.signOut()}>Sign out</button></div>}
      </header>
      {!signedIn ? <section className="mx-auto max-w-md rounded-3xl border border-[#ffc857]/40 bg-[#0d2538] p-8">
        <h1 className="text-3xl font-black">School sign in</h1>
        <p className="mt-3 text-white/70">Enter the school email BragWall has approved. We’ll send a one-time sign-in link.</p>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="School email" aria-label="School email" className="mt-6 w-full rounded-xl bg-[#061426] p-4" />
        <button onClick={() => void signIn()} className="mt-4 w-full rounded-xl bg-[#16d66d] p-4 font-black text-[#061426]">Send sign-in link</button>
      </section> : <>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5"><div>
          <p className="text-sm font-black uppercase tracking-widest text-[#ffc857]">{school || 'Checking school access…'} · School access</p>
          <h1 className="mt-2 text-4xl font-black">Share your young artists’ work</h1>
          <p className="mt-3 text-white/70">Upload and check each artwork. BragWall reviews it before parents can see it.</p>
        </div><div className="max-w-xs rounded-2xl border border-[#ffc857]/40 bg-[#10273b] p-4 text-sm">🔒 Only your school’s submissions are visible here. Nothing goes live until BragWall approves.</div></div>
        {!school && !checkingSchool && <p role="alert" className="my-6 rounded-xl border border-[#ffc857]/50 bg-[#ffc857]/10 p-4 text-sm">School access is not enabled for {signedInEmail || 'this account'} and the code <strong>{code}</strong>. Ask BragWall admin to enable this exact email for this school, then sign out and open the school link in a separate private window.</p>}
        {!!school && !submitted && <div className="grid gap-4 md:grid-cols-2">
          <label className="block cursor-pointer rounded-2xl border border-dashed border-[#16d66d] bg-[#0d2538] p-6"><strong>1. Artwork images or ZIP</strong><p className="mt-2 text-sm text-white/60">JPG, PNG, WEBP or a ZIP, up to 500 images.</p>
            <input type="file" accept=".zip,.jpg,.jpeg,.png,.webp" multiple disabled={busy || !!batchId} className="mt-4 block w-full text-sm" onChange={e => { void (async () => { try { setImages(await readImages(e.target.files!)); setError(''); } catch (reason) { setError(String(reason)); } })(); }} />
            <p className="mt-3 text-[#16d66d]">{images.size} images selected</p></label>
          <label className="block cursor-pointer rounded-2xl border border-dashed border-[#16d66d] bg-[#0d2538] p-6"><strong>2. Spreadsheet (CSV or Excel)</strong><p className="mt-2 text-sm text-white/60">filename, first_name, surname, grade, school; class optional.</p>
            <input type="file" accept=".csv,.xlsx" disabled={busy || !!batchId} className="mt-4 block w-full text-sm" onChange={e => { void (async () => { try { const parsed = await readManifest(e.target.files![0]); setRows(parsed.map(row => ({...row}))); setSheetName(e.target.files![0].name); setError(''); } catch (reason) { setError(String(reason)); } })(); }} />
            <p className="mt-3 text-[#16d66d]">{sheetName || 'Choose spreadsheet'}</p></label>
        </div>}
        {rows.length > 0 && <section className="mt-8"><h2 className="text-2xl font-black">Check each artwork</h2><p className="mt-2 text-sm text-white/60">{rows.length - errors.length} of {rows.length} ready. Voice notes are optional.</p>
          <div className="mt-4 space-y-3">{rows.map((row,index) => <div key={index} className="grid gap-3 rounded-xl border border-white/15 bg-[#0d2538] p-4 md:grid-cols-[1fr_1fr_1fr]">
            <div><p className="font-bold">{row.firstName} {row.surname}</p><p className="text-sm text-white/60">{row.grade} · {row.className || 'No class'}</p><p className="text-sm">{row.filename}</p></div>
            <div>{!submitted && !batchId && <><p className="text-sm">Child’s voice note (optional)</p><VoiceRecorder disabled={busy} onFile={(file, seconds) => void addVoice(index,file,seconds)} /><label className="mt-2 block text-xs">Or upload a recording<input type="file" accept="audio/*" className="mt-2 block max-w-full text-xs" onChange={e => void addVoice(index,e.target.files?.[0])} /></label></>}
              {row.voice && <><VoicePreview file={row.voice} /><label className="mt-2 block text-xs"><input type="checkbox" checked={!!row.voiceConfirmed} disabled={!!batchId} onChange={e => setRows(previous => previous.map((r,i) => i === index ? {...r, voiceConfirmed:e.target.checked}:r))} /> I confirm the school has permission to share this child’s recording with parents.</label></>}</div>
            <div className="text-sm font-bold">{row.uploaded ? <span className="text-[#16d66d]">Uploaded</span> : issue(row) === 'Confirm repeated artist name' && !batchId ? <label className="text-[#ffc857]"><input type="checkbox" checked={!!row.verified} onChange={e => setRows(previous => previous.map((r,i) => i === index ? {...r,verified:e.target.checked}:r))} /> {issue(row)}</label> : <span className={issue(row) ? 'text-[#ffc857]' : 'text-[#16d66d]'}>{issue(row) || 'Ready'}</span>}</div>
          </div>)}</div></section>}
        {!!unused.length && <p className="mt-4 text-[#ffc857]">{unused.length} image(s) are not listed in your spreadsheet.</p>}
        {!!school && !batchId && rows.some(row => row.school.trim().toLowerCase() !== school.trim().toLowerCase()) && <button type="button" className="mt-4 rounded-xl border border-[#ffc857] px-4 py-2 text-sm font-bold text-[#ffc857]" onClick={() => setRows(previous => previous.map(row => ({...row,school})))}>Use {school} for the school column in all rows</button>}
        {!!errors.length && <div className="mt-4 rounded-xl bg-[#ffc857]/10 p-4 text-[#ffc857]">{errors.slice(0,10).map(x => <p key={x}>{x}</p>)}</div>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-900/50 p-4">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-[#16d66d]/10 p-4 text-[#16d66d]">{message}</p>}
        {!submitted && <div className="sticky bottom-3 mt-7 flex items-center justify-between gap-3 rounded-xl border border-[#ffc857]/50 bg-[#0d2538] p-4 shadow-xl"><span className="text-sm">{errors.length || unused.length ? 'Fix the highlighted items to continue.' : `${rows.length} artwork(s) ready for BragWall review`}</span><button disabled={!canSubmit} onClick={() => void submit()} className="rounded-xl bg-[#16d66d] px-5 py-3 font-black text-[#061426] disabled:opacity-40">{busy ? 'Uploading…' : 'Complete submission'}</button></div>}
      </>}
    </div>
  </main>;
}

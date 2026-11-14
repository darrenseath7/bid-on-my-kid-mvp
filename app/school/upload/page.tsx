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

function ArtworkThumbnail({ file, name }: { file?: File; name: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e9e2d4] sm:h-40 sm:w-40 lg:h-44 lg:w-44">
    {url ? <img src={url} alt={`Artwork by ${name}`} loading="lazy" className="h-full w-full object-contain" /> : <span className="px-3 text-center text-sm font-semibold text-[#48546a]">Image unavailable</span>}
  </div>;
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
  return <div className="mt-2"><button type="button" disabled={disabled} onClick={() => recording ? recorder.current?.stop() : void start()} className="rounded-lg border border-[#e5a900] px-4 py-2 text-sm font-bold text-[#061426] transition hover:bg-[#fff4ce] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5a900] disabled:opacity-40">{recording ? 'Stop recording' : 'Record voice note'}</button>{recording && <p role="status" className="mt-1 text-sm text-[#744c00]">Recording… stops after 30 seconds</p>}{error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}</div>;
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
    if (!signedIn || !code) { setSchool(''); return; }
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

  async function signOut() {
    setSchool(''); setRows([]); setImages(new Map()); setBatchId('');
    setSubmitted(false); setSheetName(''); setMessage(''); setError('');
    await supabase.auth.signOut();
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

  const readyCount = rows.filter(row => !issue(row)).length;

  return <main className="min-h-screen bg-[#07152b] text-white">
    <header className="border-b border-white/10 bg-[#081a30]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <p className="text-3xl font-black tracking-tight">Brag<span className="text-[#ffc857]">Wall</span></p>
          <span className="hidden h-8 w-px bg-[#ffc857] sm:block" aria-hidden="true" />
          <p className="text-sm font-semibold text-white/75 sm:text-base">School artwork portal{school ? <> · <span className="text-[#ffc857]">{school}</span></> : null}</p>
        </div>
        {signedIn && <div className="flex min-w-0 items-center gap-3 text-sm"><span className="hidden max-w-56 truncate text-white/65 md:block">{signedInEmail}</span><button type="button" disabled={busy} className="rounded-xl border border-white/30 px-4 py-2 font-semibold hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc857] disabled:opacity-40" onClick={() => void signOut()}>Sign out</button></div>}
      </div>
    </header>

    {!signedIn ? <section className="mx-auto mt-12 max-w-md rounded-3xl border border-[#ffc857]/40 bg-[#0d2538] p-6 sm:p-8">
      <h1 className="text-3xl font-black">School sign in</h1>
      <p className="mt-3 text-white/75">Enter the school email BragWall approved. We’ll send you a one-time sign-in link.</p>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="School email" aria-label="School email" className="mt-6 w-full rounded-xl bg-[#061426] p-4" />
      <button type="button" onClick={() => void signIn()} className="mt-4 w-full rounded-xl bg-[#16d66d] p-4 font-black text-[#061426]">Send sign-in link</button>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-900/60 p-4">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-[#16d66d]/15 p-4 text-[#16d66d]">{message}</p>}
    </section> : <>
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[110px_minmax(320px,390px)_minmax(0,1fr)]">
        <nav aria-label="Submission progress" className="border-b border-white/10 px-5 py-5 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-3 lg:pt-14">
          <ol className="flex justify-between gap-3 lg:flex-col lg:gap-10">
            {['Upload','Review','Send'].map((label,index) => <li key={label} className="flex min-w-0 items-center gap-2 lg:items-start">
              <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${submitted || (index === 0 && images.size && sheetName) || (index === 1 && readyCount === rows.length && rows.length) ? 'border-[#ffc857] bg-[#ffc857] text-[#07152b]' : 'border-white/50 text-white/80'}`}>{index + 1}</span>
              <span className="pt-1 text-xs font-bold text-white/80 sm:text-sm">{label}</span>
            </li>)}
          </ol>
        </nav>

        <section aria-label="Upload files" className="relative overflow-hidden border-b border-white/10 px-5 py-9 sm:px-8 lg:min-h-[740px] lg:border-b-0 lg:py-14">
          <img src="/bragwall-admin-paint-texture.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 w-80 opacity-[.09]" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#ffc857]">{school || (checkingSchool ? 'Checking school access…' : 'School access')}</p>
            <h1 className="mt-3 max-w-sm text-4xl font-black leading-tight tracking-tight">Ready to share their masterpieces?</h1>
            <p className="mt-4 max-w-sm text-base text-white/75">Add artwork and a spreadsheet, then check each piece.</p>
            {!school && !checkingSchool && <p role="alert" className="mt-6 rounded-xl border border-[#ffc857]/50 bg-[#ffc857]/10 p-4 text-sm">School access is not enabled for {signedInEmail || 'this account'} and the code <strong>{code}</strong>. Ask BragWall admin to enable this exact email for this school, then sign out and open the school link in a separate private window.</p>}
            {!!school && !submitted && <div className="mt-9 space-y-4">
              <div className="rounded-2xl border border-dashed border-[#16d66d]/75 bg-[#0d2538] p-5">
                <h2 className="text-lg font-black">Artwork images or ZIP</h2>
                <p className="mt-1 text-sm text-white/70">JPG, PNG, WEBP or ZIP, up to 500 images.</p>
                <label className="mt-4 block text-sm font-semibold"><span className="sr-only">Choose artwork images or ZIP</span>
                  <input type="file" accept=".zip,.jpg,.jpeg,.png,.webp" multiple disabled={busy || !!batchId} className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-[#ffc857] file:bg-transparent file:px-3 file:py-2 file:font-bold file:text-white disabled:opacity-40" onChange={e => { void (async () => { try { setImages(await readImages(e.target.files!)); setError(''); } catch (reason) { setError(String(reason)); } })(); }} />
                </label>
                <p className="mt-3 text-sm font-bold text-[#16d66d]">{images.size} image{images.size === 1 ? '' : 's'} selected</p>
              </div>
              <div className="rounded-2xl border border-dashed border-[#16d66d]/75 bg-[#0d2538] p-5">
                <h2 className="text-lg font-black">Spreadsheet (CSV or Excel)</h2>
                <p className="mt-1 text-sm text-white/70">Filename, first name, surname, grade, school; class optional.</p>
                <label className="mt-4 block text-sm font-semibold"><span className="sr-only">Choose spreadsheet</span>
                  <input type="file" accept=".csv,.xlsx" disabled={busy || !!batchId} className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-[#ffc857] file:bg-transparent file:px-3 file:py-2 file:font-bold file:text-white disabled:opacity-40" onChange={e => { void (async () => { try { const file = e.target.files?.[0]; if (!file) return; const parsed = await readManifest(file); setRows(parsed.map(row => ({...row}))); setSheetName(file.name); setError(''); } catch (reason) { setError(String(reason)); } })(); }} />
                </label>
                <p className="mt-3 break-all text-sm font-bold text-[#16d66d]">{sheetName || 'Choose spreadsheet'}</p>
              </div>
            </div>}
          </div>
        </section>

        <section aria-label="Review artwork" className="min-w-0 bg-[#fcf7ec] px-5 py-9 text-[#07152b] sm:px-8 lg:min-h-[740px] lg:py-14">
          <h2 className="text-3xl font-black tracking-tight">Check each artwork</h2>
          <p className="mt-2 text-sm text-[#344159]">{readyCount} of {rows.length} ready. Voice notes are optional.</p>
          {rows.length ? <div className="mt-7 space-y-4">{rows.map((row,index) => {
            const rowIssue = issue(row);
            const artist = `${row.firstName} ${row.surname}`.trim() || 'Young artist';
            return <article key={`${index}-${row.filename}`} className="grid min-w-0 gap-4 rounded-2xl border border-[#e0d5c6] bg-white p-4 shadow-sm sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[176px_minmax(0,1fr)]">
              <ArtworkThumbnail file={images.get(imageKey(row.filename))} name={artist} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="break-words text-lg font-black">{artist}</h3><p className="text-sm text-[#344159]">{row.grade} · {row.className || 'No class'}</p><p className="mt-1 break-all text-xs text-[#536174]">{row.filename}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${rowIssue ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{row.uploaded ? 'Uploaded' : rowIssue || 'Ready'}</span></div>
                <div className="mt-4 border-t border-[#e6dfd4] pt-3">
                  {!submitted && !batchId && <><p className="text-sm font-bold">Child’s voice note <span className="font-normal text-[#536174]">(optional)</span></p><VoiceRecorder disabled={busy} onFile={(file,seconds) => void addVoice(index,file,seconds)} /><label className="mt-2 block text-sm text-[#344159]">Or upload a recording<input type="file" accept="audio/*" className="mt-1 block max-w-full text-xs file:mr-2 file:rounded-lg file:border file:border-[#e0d5c6] file:bg-white file:px-2 file:py-1 file:font-semibold" onChange={e => void addVoice(index,e.target.files?.[0])} /></label></>}
                  {row.voice && <><VoicePreview file={row.voice} /><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#344159]"><input type="checkbox" checked={!!row.voiceConfirmed} disabled={!!batchId} onChange={e => setRows(previous => previous.map((r,i) => i === index ? {...r,voiceConfirmed:e.target.checked}:r))} className="mt-1 shrink-0" />I confirm the school has permission to share this child’s recording with parents.</label></>}
                  {rowIssue === 'Confirm repeated artist name' && !batchId && <label className="mt-3 flex items-start gap-2 text-sm font-bold text-amber-900"><input type="checkbox" checked={!!row.verified} onChange={e => setRows(previous => previous.map((r,i) => i === index ? {...r,verified:e.target.checked}:r))} className="mt-1" />Confirm repeated artist name</label>}
                </div>
              </div>
            </article>;
          })}</div> : <div className="mt-8 rounded-2xl border border-dashed border-[#d3c8b5] p-6 text-center text-[#536174]">Choose artwork images and a spreadsheet to see each piece here.</div>}
          {!!unused.length && <p className="mt-5 text-sm font-bold text-amber-900">{unused.length} image(s) are not listed in your spreadsheet.</p>}
          {!!school && !batchId && rows.some(row => row.school.trim().toLowerCase() !== school.trim().toLowerCase()) && <button type="button" className="mt-4 rounded-xl border border-[#946b08] px-4 py-2 text-sm font-bold text-[#654600]" onClick={() => setRows(previous => previous.map(row => ({...row,school})))}>Use {school} for the school column in all rows</button>}
          {!!errors.length && <div className="mt-5 rounded-xl bg-amber-100 p-4 text-sm text-amber-950">{errors.slice(0,10).map(x => <p key={x}>{x}</p>)}</div>}
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-100 p-4 text-sm text-red-900">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-xl bg-emerald-100 p-4 text-sm text-emerald-950">{message}</p>}
        </section>
      </div>
      <div className="sticky bottom-0 z-10 border-t border-[#ffc857]/40 bg-[#081a30]/95 px-5 py-4 shadow-2xl backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2"><span className="text-lg font-black text-[#16d66d]">{readyCount} of {rows.length} ready</span><span className="text-sm text-white/75">Only your school can see submissions until BragWall approves.</span></div>
          {!submitted && <button type="button" disabled={!canSubmit} onClick={() => void submit()} className="min-h-12 w-full rounded-xl bg-[#16d66d] px-6 py-3 text-base font-black text-[#061426] transition hover:bg-[#5bf39c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc857] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{busy ? 'Uploading…' : 'Complete submission'}</button>}
        </div>
      </div>
    </>}
  </main>;
}

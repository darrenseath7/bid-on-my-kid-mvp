'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';

type Batch = { id: string; auction_code: string; submitter_email: string; status: string; expected_count: number; created_at: string };
type Row = { row_number: number; filename: string; first_name: string; surname: string; grade: string; class_name: string | null; image_url: string; voice_url: string; added_at: string | null };

export default function SchoolSubmissions() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function api(path: string, data?: Record<string, unknown>) {
    const response = await fetch(`/api/admin/school-submissions${path}`, {
      method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined, cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }
  async function refresh(id?: string) {
    try {
      const list = await api(''); setBatches(list.batches || []);
      if (id) { const detail = await api(`?batchId=${encodeURIComponent(id)}`); setBatch(detail.batch); setRows(detail.rows || []); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load submissions.'); }
  }
  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function grant() {
    setBusy(true); setError(''); setMessage('');
    try { await api('',{action:'access',code,email,active}); setMessage(active ? `Access enabled. Send the school its link: ${window.location.origin}/school/upload?code=${code}` : 'School access revoked.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update access.'); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!batch || busy || batch.status !== 'submitted') return;
    setBusy(true); setError(''); setMessage('');
    try {
      for (const row of rows) {
        if (row.added_at) continue;
        setMessage(`Adding ${row.filename}…`);
        await api('',{action:'approveRow',batchId:batch.id,index:row.row_number});
        setRows(previous => previous.map(item => item.row_number === row.row_number ? {...item,added_at:new Date().toISOString()} : item));
      }
      await api('',{action:'complete',batchId:batch.id});
      await refresh(batch.id);
      setMessage('All artworks added. The school submission is complete.');
    } catch (reason) { setError(`${reason instanceof Error ? reason.message : 'Approval stopped.'} Completed rows are saved. Review the problem and retry.`); }
    finally { setBusy(false); }
  }

  return <AdminShell active="setup" eyebrow="Add School & Artwork" title="School submissions" description="Manage school upload access and review each submitted batch before adding artwork.">
    <section className="max-w-5xl space-y-8 text-white">
      <div className="rounded-2xl border border-white/15 bg-[#0c2037] p-6">
        <h2 className="text-xl font-black">School upload access</h2>
        <p className="mt-2 text-sm text-white/60">Create the school first. Add its exact URL code and the teacher’s email. The teacher signs in through an email link and can access only this school’s portal.</p>
        <div className="mt-4 flex flex-wrap gap-3"><input aria-label="School URL code" placeholder="school-code" value={code} onChange={e => setCode(e.target.value)} className="rounded-xl bg-[#061426] p-3" /><input type="email" aria-label="Teacher email" placeholder="teacher@school.co.za" value={email} onChange={e => setEmail(e.target.value)} className="min-w-64 flex-1 rounded-xl bg-[#061426] p-3" />
          <select aria-label="Access" value={active ? 'enable' : 'revoke'} onChange={e => setActive(e.target.value === 'enable')} className="rounded-xl bg-[#061426] p-3"><option value="enable">Enable access</option><option value="revoke">Revoke access</option></select><button disabled={busy} onClick={() => void grant()} className="rounded-xl bg-[#16d66d] px-5 font-bold text-[#061426] disabled:opacity-40">Save access</button></div>
      </div>
      <div className="rounded-2xl border border-white/15 bg-[#0c2037] p-6"><h2 className="text-xl font-black">Submitted batches</h2>
        {batches.length ? <div className="mt-4 space-y-2">{batches.map(item => <button key={item.id} onClick={() => void refresh(item.id)} className="flex w-full flex-wrap justify-between gap-2 rounded-xl border border-white/15 p-4 text-left hover:border-[#16d66d]"><span>{item.auction_code} · {item.submitter_email} · {item.expected_count} artworks</span><span className="text-[#ffc857]">{item.status} · {new Date(item.created_at).toLocaleDateString()}</span></button>)}</div> : <p className="mt-4 text-white/60">No school submissions yet.</p>}
      </div>
      {batch && <div className="rounded-2xl border border-[#ffc857]/40 bg-[#0c2037] p-6"><h2 className="text-xl font-black">Review {batch.auction_code}</h2><p className="mt-2 text-sm text-white/60">Listen to optional voice notes and inspect the artwork before adding anything. Adding a batch is sequential and can be resumed after an error.</p>
        <div className="mt-5 space-y-3">{rows.map(row => <div key={row.row_number} className="grid gap-4 rounded-xl bg-[#061426] p-4 sm:grid-cols-[100px_1fr_220px]"><img src={row.image_url} alt={`Artwork by ${row.first_name} ${row.surname}`} className="h-24 w-24 rounded-lg object-contain" /><div><p className="font-bold">{row.first_name} {row.surname}</p><p className="text-sm">{row.grade} · {row.class_name || 'No class'}</p><p className="text-sm text-white/60">{row.filename}</p></div><div>{row.voice_url ? <><p className="mb-2 text-sm text-[#ffc857]">Child’s voice note</p><audio src={row.voice_url} controls preload="none" className="max-w-full" /></> : <p className="text-sm text-white/50">No voice note</p>}<p className="mt-2 text-sm text-[#16d66d]">{row.added_at ? 'Added' : 'Awaiting review'}</p></div></div>)}</div>
        <button disabled={busy || batch.status !== 'submitted'} onClick={() => void approve()} className="mt-5 rounded-xl bg-[#16d66d] px-6 py-3 font-black text-[#061426] disabled:opacity-40">{busy ? 'Adding artworks…' : batch.status === 'approved' ? 'Batch approved' : 'Approve & add artworks'}</button>
      </div>}
      {error && <p role="alert" className="rounded-xl bg-red-900/50 p-4">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-[#16d66d]/10 p-4 text-[#16d66d]">{message}</p>}
    </section>
  </AdminShell>;
}

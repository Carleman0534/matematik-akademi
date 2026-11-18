'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAssignees } from '@/app/ogretmen/denemeler/actions';

// Denemeyi kimler çözecek: sınıfın / bütün öğrencilerin hepsi ya da seçilenler (toplu atama)
export function AssigneePicker({ examId, students, picked, scopeLabel }: { examId: string; students: { id: string; full_name: string }[]; picked: string[]; scopeLabel: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'all' | 'some'>(picked.length ? 'some' : 'all');
  const [sel, setSel] = useState<Set<string>>(new Set(picked));
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();
  const shown = useMemo(() => students.filter(s => s.full_name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))), [students, q]);
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = () => {
    if (mode === 'some' && sel.size === 0) { setMsg({ error: 'En az bir öğrenci seçin ya da "Hepsi"ni seçin.' }); return; }
    start(async () => { const r = await setAssignees(examId, mode === 'all' ? [] : [...sel]); setMsg(r); if (!r.error) router.refresh(); });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <label className={'cursor-pointer rounded-lg border px-3 py-1.5 ' + (mode === 'all' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700')}>
          <input type="radio" className="mr-1.5" checked={mode === 'all'} onChange={() => setMode('all')} />Hepsi ({scopeLabel}, {students.length})</label>
        <label className={'cursor-pointer rounded-lg border px-3 py-1.5 ' + (mode === 'some' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700')}>
          <input type="radio" className="mr-1.5" checked={mode === 'some'} onChange={() => setMode('some')} />Yalnızca seçtiklerim ({sel.size})</label>
      </div>
      {mode === 'some' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} className="input max-w-xs" placeholder="Öğrenci ara…" aria-label="Öğrenci ara" />
            <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setSel(new Set(shown.map(s => s.id)))}>Görünenleri seç</button>
            <button type="button" className="text-xs font-semibold text-slate-500 hover:underline" onClick={() => setSel(new Set())}>Temizle</button>
          </div>
          {students.length === 0 ? <p className="text-sm text-slate-500">Bu kapsamda aktif öğrenci yok.</p> : (
            <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800">
              {shown.map(s => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />{s.full_name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" disabled={pending} onClick={save}>{pending ? 'Kaydediliyor…' : 'Atamayı kaydet'}</button>
        {msg.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</span>}
        {msg.ok && !msg.error && <span role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</span>}
      </div>
    </div>
  );
}

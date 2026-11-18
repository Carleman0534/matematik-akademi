'use client';
import { GRADES, gradeLabel } from '@/lib/labels';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTopic, deleteTopic, renameTopic, setTopicActive, moveTopic, saveOutcome, setOutcomeActive, deleteOutcome, type TopicState } from './actions';

export function AddTopicForm({ options, defaultGrade }: { options: { id: string; label: string; depth: number; grade: number | null }[]; defaultGrade?: number | null }) {
  const [state, action, pending] = useActionState<TopicState, FormData>(addTopic, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2"><label className="label" htmlFor="ust">Üst konu</label>
        <select id="ust" name="ust" className="input"><option value="">— Yeni ünite (en üst düzey) —</option>
          {options.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.label}</option>)}</select></div>
      <div><label className="label" htmlFor="sinif">Sınıf (ünite için)</label>
        <select id="sinif" name="sinif" className="input" defaultValue={defaultGrade ?? ''}><option value="">—</option>{GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></div>
      <div><label className="label" htmlFor="ad">Ad</label><input id="ad" name="ad" className="input" required maxLength={120} /></div>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button className="btn-primary" disabled={pending}>Ekle</button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.ok && <p className="text-sm text-emerald-600">✓ {state.ok}</p>}
      </div>
    </form>
  );
}

export interface OutcomeItem { id: string; code: string | null; text: string; is_active: boolean }

// Bir konu satırı: sırala, yeniden adlandır, pasifleştir, sil; ünitelerde kazanımlar
export function TopicRow({ id, name, depth, active, hasChildren, first, last, outcomes, questionCount }: {
  id: string; name: string; depth: number; active: boolean; hasChildren: boolean; first: boolean; last: boolean; outcomes?: OutcomeItem[]; questionCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [open, setOpen] = useState(false);
  const run = (f: () => Promise<TopicState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => { const r = await f(); if (r.error) window.alert(r.error); router.refresh(); });
  };
  const btn = 'rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800';
  return (
    <div className={'group flex flex-wrap items-center gap-1.5 py-0.5 text-sm ' + (active ? '' : 'opacity-50')}>
      {editing ? (
        <form className="flex items-center gap-1" onSubmit={e => { e.preventDefault(); run(() => renameTopic(id, val)); setEditing(false); }}>
          <input value={val} onChange={e => setVal(e.target.value)} className="input py-0.5" autoFocus maxLength={120} aria-label="Konu adı" />
          <button className="btn-primary px-2 py-0.5 text-xs">Kaydet</button>
          <button type="button" className={btn} onClick={() => { setEditing(false); setVal(name); }}>Vazgeç</button>
        </form>
      ) : (
        <span className={depth === 0 ? 'font-bold' : ''}>{name}</span>
      )}
      {!active && <span className="rounded bg-slate-200 px-1 text-[10px] font-semibold dark:bg-slate-800">pasif</span>}
      {questionCount > 0 && <span className="text-[11px] text-slate-400" title="Ana konusu bu olan soru sayısı">{questionCount} soru</span>}
      {outcomes && <button type="button" onClick={() => setOpen(o => !o)} className="rounded bg-indigo-50 px-1.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{outcomes.length} kazanım {open ? '▲' : '▼'}</button>}
      <span className="ml-auto flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
        <button type="button" className={btn} disabled={pending || first} onClick={() => run(() => moveTopic(id, -1))} aria-label={name + ' yukarı taşı'}>↑</button>
        <button type="button" className={btn} disabled={pending || last} onClick={() => run(() => moveTopic(id, 1))} aria-label={name + ' aşağı taşı'}>↓</button>
        <button type="button" className={btn} disabled={pending} onClick={() => setEditing(true)}>Adı</button>
        <button type="button" className={btn} disabled={pending} onClick={() => run(() => setTopicActive(id, !active))}>{active ? 'Pasifleştir' : 'Etkinleştir'}</button>
        <button type="button" className={btn + ' hover:text-red-600'} disabled={pending}
          onClick={() => run(() => deleteTopic(id), `"${name}" silinsin mi?${hasChildren ? ' Alt konuları da silinir.' : ''} Kazanımları silinir; bu konudaki sorular silinmez, konusuz kalır. Silmek yerine pasifleştirmek daha güvenlidir.`)}>Sil</button>
      </span>
      {outcomes && open && <OutcomeList topicId={id} outcomes={outcomes} />}
    </div>
  );
}

function OutcomeList({ topicId, outcomes }: { topicId: string; outcomes: OutcomeItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<{ id: string | null; code: string; text: string } | null>(null);
  const [err, setErr] = useState('');
  const run = (f: () => Promise<TopicState>, after?: () => void) => start(async () => { const r = await f(); setErr(r.error || ''); if (!r.error) { after?.(); router.refresh(); } });
  return (
    <div className="mb-2 mt-1 w-full space-y-1 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/40">
      {outcomes.length === 0 && <p className="text-xs text-slate-500">Bu ünitede kazanım yok.</p>}
      {outcomes.map(o => (
        <div key={o.id} className={'flex items-start gap-2 text-xs ' + (o.is_active ? '' : 'opacity-50')}>
          <span className="w-20 shrink-0 font-mono font-semibold text-indigo-700 dark:text-indigo-300">{o.code || '—'}</span>
          <span className="flex-1">{o.text}</span>
          <button type="button" className="shrink-0 text-slate-500 hover:underline" onClick={() => setEdit({ id: o.id, code: o.code || '', text: o.text })}>Düzenle</button>
          <button type="button" className="shrink-0 text-slate-500 hover:underline" disabled={pending} onClick={() => run(() => setOutcomeActive(o.id, !o.is_active))}>{o.is_active ? 'Pasif' : 'Etkin'}</button>
          <button type="button" className="shrink-0 text-red-600 hover:underline" disabled={pending} onClick={() => { if (window.confirm('Kazanım silinsin mi?')) run(() => deleteOutcome(o.id)); }}>Sil</button>
        </div>
      ))}
      {edit ? (
        <form className="flex flex-wrap items-center gap-2 pt-1" onSubmit={e => { e.preventDefault(); run(() => saveOutcome(topicId, edit.id, edit.code, edit.text), () => setEdit(null)); }}>
          <input value={edit.code} onChange={e => setEdit({ ...edit, code: e.target.value })} placeholder="Kod (ör. M.8.1.1.2)" className="input w-36 py-1 text-xs" maxLength={40} aria-label="Kazanım kodu" />
          <input value={edit.text} onChange={e => setEdit({ ...edit, text: e.target.value })} placeholder="Kazanım metni" className="input min-w-0 flex-1 py-1 text-xs" required maxLength={600} aria-label="Kazanım metni" />
          <button className="btn-primary px-2 py-1 text-xs" disabled={pending}>Kaydet</button>
          <button type="button" className="text-xs text-slate-500" onClick={() => setEdit(null)}>Vazgeç</button>
        </form>
      ) : <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => setEdit({ id: null, code: '', text: '' })}>＋ Kazanım ekle</button>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

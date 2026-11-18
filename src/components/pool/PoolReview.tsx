'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePoolQuestions, type PoolPatch } from '@/app/ogretmen/soru-havuzu/actions';
import { DIFFICULTY_LEVELS, QUESTION_TYPES, POOL_STATUS } from '@/lib/pool';
import { GRADES, gradeLabel } from '@/lib/labels';
import type { TopicOption } from '@/lib/topicOptions';

export interface ReviewRow {
  id: string; url: string | null; section: string; question_no: number | null; page_no: number | null; option_count: number;
  correct: string | null; topic_id: string | null; difficulty: number | null; question_type: string | null; has_visual: boolean | null;
  status: string; duplicate_of: string | null; dupLabel: string | null; confidence: number | null; detect_method: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  rejected: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400', archived: 'bg-slate-200 text-slate-600 dark:bg-slate-800',
};

// Konu seçimi: sınıf düzeyi süzgeci ortak (40 satırda 40 ayrı süzgeç olmasın)
function TopicPick({ options, value, onChange, grade, label }: { options: TopicOption[]; value: string; onChange: (v: string) => void; grade: string; label: string }) {
  const shown = options.filter(o => !grade || String(o.rootGrade) === grade || o.id === value);
  return (
    <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className={'input py-1 text-xs ' + (value ? '' : 'border-amber-400')}>
      <option value="">— Konu seçin —</option>
      {shown.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.label}</option>)}
    </select>
  );
}

export function PoolReview({ rows: initial, options, defaultGrade }: { rows: ReviewRow[]; options: TopicOption[]; defaultGrade: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [grade, setGrade] = useState(defaultGrade);
  const [show, setShow] = useState<'hepsi' | 'bekleyen' | 'konusuz'>('hepsi');
  const [bulk, setBulk] = useState<{ topic: string; difficulty: string; type: string }>({ topic: '', difficulty: '', type: '' });
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => rows.filter(r => show === 'hepsi' || (show === 'bekleyen' ? r.status === 'draft' : !r.topic_id)), [rows, show]);
  const save = (ids: string[], patch: PoolPatch) => start(async () => {
    const r = await updatePoolQuestions(ids, patch);
    setMsg(r);
    if (!r.error) {
      setRows(prev => prev.map(x => (ids.includes(x.id) ? { ...x, ...(patch as Partial<ReviewRow>) } : x)));
      if (patch.status) router.refresh();
    }
  });
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selIds = [...sel].filter(id => visible.some(v => v.id === id));
  const L = (n: number) => (n === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D']);

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={selIds.length > 0 && selIds.length === visible.length} onChange={e => setSel(e.target.checked ? new Set(visible.map(v => v.id)) : new Set())} />Görünenleri seç</label>
          <span className="text-slate-400">|</span>
          {(['hepsi', 'bekleyen', 'konusuz'] as const).map(k => <button key={k} type="button" onClick={() => setShow(k)} className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + (show === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800')}>{k === 'hepsi' ? 'Hepsi' : k === 'bekleyen' ? 'Onay bekleyen' : 'Konusu yok'}</button>)}
          <label className="ml-auto flex items-center gap-1 text-xs">Konu listesi:
            <select value={grade} onChange={e => setGrade(e.target.value)} className="input w-auto py-1 text-xs"><option value="">Tüm sınıflar</option>{GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <b>Seçilen {selIds.length} soruya:</b>
          <div className="w-64"><TopicPick options={options} value={bulk.topic} onChange={v => setBulk({ ...bulk, topic: v })} grade={grade} label="Toplu konu" /></div>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={!selIds.length || !bulk.topic || pending} onClick={() => save(selIds, { topic_id: bulk.topic })}>Konu ver</button>
          <select aria-label="Toplu zorluk" value={bulk.difficulty} onChange={e => setBulk({ ...bulk, difficulty: e.target.value })} className="input w-auto py-1 text-xs"><option value="">Zorluk</option>{Object.entries(DIFFICULTY_LEVELS).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={!selIds.length || !bulk.difficulty || pending} onClick={() => save(selIds, { difficulty: Number(bulk.difficulty) })}>Ver</button>
          <select aria-label="Toplu tür" value={bulk.type} onChange={e => setBulk({ ...bulk, type: e.target.value })} className="input w-auto py-1 text-xs"><option value="">Soru türü</option>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={!selIds.length || !bulk.type || pending} onClick={() => save(selIds, { question_type: bulk.type })}>Ver</button>
          <button type="button" className="btn-primary ml-auto px-3 py-1 text-xs" disabled={!selIds.length || pending} onClick={() => save(selIds, { status: 'approved' })}>✓ Onayla</button>
          <button type="button" className="btn-secondary px-3 py-1 text-xs text-red-600" disabled={!selIds.length || pending} onClick={() => { if (window.confirm(`${selIds.length} soru reddedilsin mi? Havuzda görünmez.`)) save(selIds, { status: 'rejected' }); }}>Reddet</button>
        </div>
        {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
        {msg.ok && !msg.error && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</p>}
      </div>

      {visible.length === 0 && <p className="text-sm text-slate-500">Bu görünümde soru yok.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map(r => (
          <div key={r.id} className={'card space-y-2 p-3 ' + (sel.has(r.id) ? 'ring-2 ring-indigo-400' : '') + (r.status === 'rejected' ? ' opacity-50' : '')}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`${r.question_no}. soruyu seç`} />
              <b className="text-sm">{r.section ? r.section + ' · ' : ''}{r.question_no}. soru</b>
              <span className="text-slate-500">sayfa {r.page_no}</span>
              <span className={'rounded px-1.5 font-semibold ' + (STATUS_STYLE[r.status] || '')}>{POOL_STATUS[r.status]}</span>
              {r.detect_method === 'gaps' && <span className="rounded bg-amber-100 px-1.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200" title="Taranmış sayfa: kutu boşluklara göre bulundu, kontrol edin">düşük güven</span>}
              {r.duplicate_of && <span className="rounded bg-rose-100 px-1.5 text-rose-800 dark:bg-rose-950 dark:text-rose-200" title={r.dupLabel || ''}>muhtemel mükerrer{r.dupLabel ? ': ' + r.dupLabel : ''}</span>}
            </div>
            <button type="button" onClick={() => setZoom(r.url)} className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700" aria-label="Büyüt">
              {r.url ? <img src={r.url} alt={`${r.question_no}. soru`} className="mx-auto max-h-64 w-auto" loading="lazy" /> : <span className="block p-6 text-sm text-slate-400">Görsel yok</span>}
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2"><TopicPick options={options} value={r.topic_id || ''} onChange={v => save([r.id], { topic_id: v || null })} grade={grade} label={`${r.question_no}. soru konusu`} /></div>
              <select aria-label="Zorluk" value={r.difficulty ?? ''} onChange={e => save([r.id], { difficulty: e.target.value ? Number(e.target.value) : null })} className="input py-1 text-xs">
                <option value="">Zorluk —</option>{Object.entries(DIFFICULTY_LEVELS).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select>
              <select aria-label="Soru türü" value={r.question_type ?? ''} onChange={e => save([r.id], { question_type: e.target.value || null })} className="input py-1 text-xs">
                <option value="">Tür —</option>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Doğru:</span>
              {L(r.option_count).map(l => (
                <button key={l} type="button" onClick={() => save([r.id], { correct: r.correct === l ? null : l })} aria-pressed={r.correct === l}
                  className={'h-6 w-6 rounded-full border text-[11px] font-bold ' + (r.correct === l ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{l}</button>
              ))}
              <label className="ml-2 flex items-center gap-1"><input type="checkbox" checked={!!r.has_visual} onChange={e => save([r.id], { has_visual: e.target.checked })} />Şekil / grafik / tablo var</label>
              <span className="ml-auto flex gap-2">
                {r.status !== 'approved' && <button type="button" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400" disabled={pending} onClick={() => save([r.id], { status: 'approved' })}>Onayla</button>}
                {r.status !== 'rejected' ? <button type="button" className="text-slate-500 hover:text-red-600 hover:underline" disabled={pending} onClick={() => save([r.id], { status: 'rejected' })}>Reddet</button>
                  : <button type="button" className="text-slate-500 hover:underline" disabled={pending} onClick={() => save([r.id], { status: 'draft' })}>Geri al</button>}
              </span>
            </div>
          </div>
        ))}
      </div>
      {zoom && <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Soru görseli"><img src={zoom} alt="" className="mx-auto max-w-4xl bg-white" /></div>}
    </div>
  );
}

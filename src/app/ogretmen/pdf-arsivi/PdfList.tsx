'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPdfArchived, deletePdfDoc } from './actions';
import { analyzePdf } from '@/lib/pdfAnalyze';
import { ANALYSIS_STATUS } from '@/lib/pool';

export interface ListDoc {
  id: string; title: string; meta: string; description: string | null; url: string | null; option_count: number;
  analysis_status: string; question_count: number | null; analyzed_label: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  none: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', pending: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  processing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function PdfList({ docs, userId, archived }: { docs: ListDoc[]; userId: string; archived: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const runQueue = async (ids: string[]) => {
    const list = docs.filter(d => ids.includes(d.id) && d.url);
    setLog([]);
    for (const d of list) {
      setRunning(d.id);
      const r = await analyzePdf({ id: d.id, title: d.title, url: d.url!, option_count: d.option_count }, userId, m => setProgress(`${d.title}: ${m}`));
      setLog(l => [...l, r.error ? `✗ ${d.title}: ${r.error}` : `✓ ${d.title}: ${r.detected} soru bulundu, ${r.saved} yeni soru havuza eklendi`]);
      router.refresh();
    }
    setRunning(null); setProgress(''); setSel(new Set());
  };
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const act = (f: () => Promise<{ error?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => { const r = await f(); if (r.error) window.alert(r.error); router.refresh(); });
  };

  return (
    <div className="space-y-3">
      {!archived && docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/40">
          <label className="flex items-center gap-2"><input type="checkbox" checked={sel.size === docs.length && docs.length > 0} onChange={e => setSel(e.target.checked ? new Set(docs.map(d => d.id)) : new Set())} />Tümünü seç</label>
          <button type="button" className="btn-primary" disabled={!!running || sel.size === 0} onClick={() => runQueue([...sel])}>Seçilen {sel.size} PDF&rsquo;i analiz et</button>
          <Link href="/ogretmen/soru-havuzu/analiz" className="btn-secondary">📊 Deneme konu analizi</Link>
          <span className="text-xs text-slate-500">Analiz bu sayfada yapılır; bitene kadar sayfayı kapatmayın.</span>
        </div>
      )}
      {(progress || log.length > 0) && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
          {progress && <p className="font-semibold">⏳ {progress}</p>}
          {log.map((l, i) => <p key={i} className={l.startsWith('✗') ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-300'}>{l}</p>)}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {docs.map(d => (
          <div key={d.id} className={'card space-y-2 ' + (running === d.id ? 'ring-2 ring-amber-400' : '')}>
            <div className="flex items-start gap-3">
              {!archived && <input type="checkbox" className="mt-1" checked={sel.has(d.id)} onChange={() => toggle(d.id)} aria-label={d.title + ' seç'} disabled={!!running} />}
              <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-black text-red-700 dark:bg-red-950 dark:text-red-300">PDF</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{d.title}</p>
                <p className="text-xs text-slate-500">{d.meta}</p>
                {d.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d.description}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={'rounded-full px-2 py-0.5 font-semibold ' + (STATUS_STYLE[running === d.id ? 'processing' : d.analysis_status] || STATUS_STYLE.none)}>{ANALYSIS_STATUS[running === d.id ? 'processing' : d.analysis_status] || d.analysis_status}</span>
                  {d.question_count != null && d.analysis_status !== 'none' && <span className="text-slate-500">{d.question_count} soru{d.analyzed_label ? ' · ' + d.analyzed_label : ''}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs font-semibold dark:border-slate-800">
              {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">Aç</a>}
              {!archived && <button type="button" className="btn-primary px-3 py-1.5 text-xs" disabled={!!running || !d.url} onClick={() => runQueue([d.id])}>{d.analysis_status === 'none' ? 'Analiz et' : 'Yeniden analiz et'}</button>}
              {(d.analysis_status === 'review' || d.analysis_status === 'done') && <Link href={`/ogretmen/soru-havuzu/inceleme?pdf=${d.id}`} className="btn-secondary px-3 py-1.5 text-xs">İncele ve onayla</Link>}
              {!archived && <Link href={`/ogretmen/denemeler/yeni?pdf=${d.id}`} className="btn-secondary px-3 py-1.5 text-xs">Online deneme</Link>}
              {!archived && <Link href={`/ogretmen/pdf-soru-ayikla?pdfId=${d.id}`} className="btn-secondary px-3 py-1.5 text-xs">✂️ Elle ayıkla</Link>}
              <span className="ml-auto flex gap-3">
                <button type="button" disabled={pending || !!running} className="text-slate-500 hover:underline" onClick={() => act(() => setPdfArchived(d.id, !archived))}>{archived ? 'Geri al' : 'Kaldır'}</button>
                {archived && <button type="button" disabled={pending} className="text-red-600 hover:underline" onClick={() => act(() => deletePdfDoc(d.id), `"${d.title}" kalıcı olarak silinsin mi? Havuza alınmış sorular korunur. Bu geri alınamaz.`)}>Kalıcı sil</button>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

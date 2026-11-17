'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePage, movePage } from '@/app/ogretmen/denemeler/actions';
import { uploadExamFiles } from './uploadPages';
import { checkExamFile, MAX_PAGES } from '@/lib/pdfPages';

export function PagesManager({ examId, pages, editable }: { examId: string; pages: { id: string; url: string | null }[]; editable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const [zoom, setZoom] = useState<string | null>(null);

  const add = async (list: FileList | null) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    const bad = files.map(checkExamFile).find(Boolean);
    if (bad) { setError(bad); return; }
    setError('');
    try {
      const err = await uploadExamFiles(examId, files, setBusy, pages.length);
      if (err) setError(err);
    } catch (e) { setError((e as Error).message); }
    setBusy('');
    router.refresh();
  };
  const act = (f: () => Promise<{ error?: string }>) => start(async () => { const r = await f(); setError(r.error || ''); router.refresh(); });

  return (
    <div className="space-y-3">
      {pages.length === 0 && <p className="text-sm text-slate-500">Henüz sayfa yok. Soru kitapçığını PDF ya da fotoğraf olarak yükleyin.</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {pages.map((p, i) => (
          <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 text-xs dark:border-slate-800">
            <button type="button" onClick={() => setZoom(p.url)} className="block aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800" aria-label={`${i + 1}. sayfayı büyüt`}>
              {p.url ? <img src={p.url} alt={`${i + 1}. sayfa`} className="h-full w-full object-contain" loading="lazy" /> : '—'}
            </button>
            <div className="flex items-center gap-1 px-1.5 py-1">
              <b>{i + 1}</b>
              {editable && <>
                <button type="button" disabled={pending || i === 0} onClick={() => act(() => movePage(examId, p.id, -1))} className="ml-auto px-1 disabled:opacity-30" aria-label="Sola taşı">◀</button>
                <button type="button" disabled={pending || i === pages.length - 1} onClick={() => act(() => movePage(examId, p.id, 1))} className="px-1 disabled:opacity-30" aria-label="Sağa taşı">▶</button>
                <button type="button" disabled={pending} onClick={() => { if (window.confirm(`${i + 1}. sayfa silinsin mi?`)) act(() => deletePage(examId, p.id)); }} className="px-1 text-red-600" aria-label="Sil">✕</button>
              </>}
            </div>
          </div>
        ))}
      </div>
      {editable && pages.length < MAX_PAGES && (
        <label className={'btn-secondary cursor-pointer ' + (busy ? 'pointer-events-none opacity-60' : '')}>
          {busy || '＋ Sayfa ekle (PDF ya da fotoğraf)'}
          <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { add(e.target.files); e.target.value = ''; }} />
        </label>
      )}
      {!editable && <p className="text-xs text-slate-500">Deneme başladığı için sayfalar değiştirilemez.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {zoom && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Sayfa önizleme">
          <img src={zoom} alt="" className="mx-auto max-w-3xl bg-white" />
        </div>
      )}
    </div>
  );
}

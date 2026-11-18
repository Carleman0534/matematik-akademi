'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createExamFromPool } from '@/app/ogretmen/soru-havuzu/actions';

export interface GridItem { id: string; url: string | null; title: string; meta: string; badges: string[]; approved: boolean; dup: boolean }

// Havuz kartları: seç → seçilenlerden online deneme (taslak)
export function PoolGrid({ items, defaultTitle }: { items: GridItem[]; defaultTitle: string }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [title, setTitle] = useState(defaultTitle);
  const [minutes, setMinutes] = useState('');
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSel(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const make = () => start(async () => {
    const r = await createExamFromPool(sel, title, Number(minutes) || sel.length * 2);
    setMsg(r);
    if (r.id) router.push(`/ogretmen/denemeler/${r.id}`);
  });
  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 text-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <label className="flex items-center gap-1.5 self-center"><input type="checkbox" checked={sel.length > 0 && sel.length === items.filter(i => i.approved).length} onChange={e => setSel(e.target.checked ? items.filter(i => i.approved).map(i => i.id) : [])} />Hepsini seç</label>
        <span className="self-center font-semibold">{sel.length} soru seçildi</span>
        <div className="min-w-48 flex-1"><label className="label" htmlFor="p-title">Deneme / çalışma adı</label><input id="p-title" className="input py-1" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} /></div>
        <div className="w-28"><label className="label" htmlFor="p-min">Süre (dk)</label><input id="p-min" className="input py-1" inputMode="numeric" placeholder={String(Math.max(1, sel.length * 2))} value={minutes} onChange={e => setMinutes(e.target.value)} /></div>
        <button type="button" className="btn-primary" disabled={!sel.length || pending} onClick={make}>{pending ? 'Oluşturuluyor…' : 'Seçilenlerden online deneme oluştur'}</button>
        {msg.error && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
        <p className="w-full text-xs text-slate-500">Seçim sırası soru sırası olur. Deneme taslak açılır; sınıf/öğrenci, süre ve yayın tarihini deneme sayfasında ayarlayın. (Kişiye özel çalışma setleri bir sonraki aşamada.)</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(it => {
          const n = sel.indexOf(it.id);
          return (
            <div key={it.id} className={'card space-y-2 p-3 ' + (n >= 0 ? 'ring-2 ring-indigo-500' : '')}>
              <div className="flex items-start gap-2 text-xs">
                {it.approved ? <input type="checkbox" checked={n >= 0} onChange={() => toggle(it.id)} aria-label={it.title + ' seç'} /> : <span className="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200">onaysız</span>}
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{n >= 0 ? `#${n + 1} · ` : ''}{it.title}</p><p className="truncate text-slate-500">{it.meta}</p></div>
              </div>
              <button type="button" onClick={() => setZoom(it.url)} className="block h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700" aria-label="Büyüt">
                {it.url ? <img src={it.url} alt={it.title} className="h-full w-full object-contain object-top" loading="lazy" /> : null}
              </button>
              <div className="flex flex-wrap gap-1">{it.badges.map(b => <span key={b} className="rounded bg-slate-100 px-1.5 text-[11px] dark:bg-slate-800">{b}</span>)}{it.dup && <span className="rounded bg-rose-100 px-1.5 text-[11px] text-rose-800 dark:bg-rose-950 dark:text-rose-200">benzer soru</span>}</div>
            </div>
          );
        })}
      </div>
      {zoom && <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Soru görseli"><img src={zoom} alt="" className="mx-auto max-w-4xl bg-white" /></div>}
    </div>
  );
}

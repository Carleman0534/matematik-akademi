'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PDF_BUCKET } from '@/lib/env';
import { countPdfPages } from '@/lib/pdfPages';
import { addPdfDoc, findByHash } from './actions';
import { analyzePdf } from '@/lib/pdfAnalyze';

const TYPES: [string, string][] = [['deneme', 'Deneme'], ['soru_bankasi', 'Soru bankası'], ['cevap_anahtari', 'Cevap anahtarı'], ['cozum', 'Çözüm'], ['calisma_foyu', 'Çalışma föyü'], ['diger', 'Diğer']];
const MAX = 50 * 1024 * 1024;

interface Item {
  key: string; file: File; title: string; exam_no: string; published_on: string;
  state: 'hazir' | 'kontrol' | 'yukleniyor' | 'ayiklaniyor' | 'tamam' | 'mukerrer' | 'hata'; note: string;
}

async function sha256(file: File): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const STATE_LABEL: Record<Item['state'], string> = { hazir: 'Sırada', kontrol: 'Kontrol ediliyor…', yukleniyor: 'Yükleniyor…', ayiklaniyor: 'Sorular ayıklanıyor…', tamam: '✓ Yüklendi', mukerrer: 'Zaten arşivde', hata: 'Hata' };

// Çoklu PDF yükleme: sürükle-bırak, her dosyaya başlık/deneme no/tarih, ortak yayınevi/tür/şık sayısı; aynı dosya ikinci kez yüklenmez
export function PdfUpload({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [common, setCommon] = useState({ publisher: '', doc_type: 'deneme', grade_level: 'LGS', option_count: 4, description: '' });
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | File[] | null) => {
    setErr('');
    const files = Array.from(list || []);
    const bad = files.find(f => f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name));
    if (bad) setErr(`${bad.name}: yalnızca PDF yüklenebilir.`);
    const big = files.find(f => f.size > MAX);
    if (big) setErr(`${big.name}: 50 MB'tan büyük.`);
    const ok = files.filter(f => (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) && f.size <= MAX);
    setItems(prev => [...prev, ...ok.map(f => ({ key: crypto.randomUUID(), file: f, title: f.name.replace(/\.pdf$/i, ''), exam_no: (f.name.match(/(\d{1,2})\s*\.?\s*deneme|deneme\s*[-_ ]?(\d{1,2})/i) || []).slice(1).find(Boolean) || '', published_on: '', state: 'hazir' as const, note: '' }))]);
  };
  const patch = (key: string, p: Partial<Item>) => setItems(prev => prev.map(i => (i.key === key ? { ...i, ...p } : i)));

  const uploadAll = async () => {
    setBusy(true); setErr('');
    const sb = supabaseBrowser();
    for (const it of items.filter(i => i.state === 'hazir' || i.state === 'hata')) {
      try {
        patch(it.key, { state: 'kontrol', note: '' });
        const hash = await sha256(it.file);
        const dup = await findByHash(hash);
        if (dup) { patch(it.key, { state: 'mukerrer', note: `“${dup.title}” adıyla zaten var; yeniden yüklenmedi.` }); continue; }
        const pages = await countPdfPages(it.file);
        patch(it.key, { state: 'yukleniyor', note: pages ? `${pages} sayfa` : '' });
        const path = `${userId}/${crypto.randomUUID()}.pdf`;
        const { error } = await sb.storage.from(PDF_BUCKET).upload(path, it.file, { contentType: 'application/pdf', upsert: false });
        if (error) { patch(it.key, { state: 'hata', note: error.message }); continue; }
        const r = await addPdfDoc({
          path, file_name: it.file.name, size_bytes: it.file.size, page_count: pages, file_hash: hash, title: it.title,
          doc_type: common.doc_type, grade_level: common.grade_level, publisher: common.publisher, description: common.description, topic_id: '',
          exam_no: it.exam_no, published_on: it.published_on, option_count: common.option_count,
        });
        if (r.error || !r.id) { patch(it.key, { state: 'hata', note: r.error || 'Kaydedilemedi.' }); continue; }
        if (!auto) { patch(it.key, { state: 'tamam', note: pages ? `${pages} sayfa` : '' }); continue; }
        // Yüklenir yüklenmez soruları otomatik ayıkla (havuza "onay bekliyor" olarak girer)
        patch(it.key, { state: 'ayiklaniyor', note: 'Başlıyor…' });
        const { data: sg } = await sb.storage.from(PDF_BUCKET).createSignedUrl(path, 3600);
        if (!sg?.signedUrl) { patch(it.key, { state: 'tamam', note: 'Yüklendi; otomatik ayıklama başlatılamadı, listeden “Analiz et”e basın.' }); continue; }
        const a = await analyzePdf({ id: r.id, title: it.title, url: sg.signedUrl, option_count: common.option_count }, userId, m => patch(it.key, { note: m }));
        patch(it.key, a.error
          ? { state: 'tamam', note: `Yüklendi; ayıklama başarısız: ${a.error} Listeden “Yeniden analiz et” deneyin.` }
          : { state: 'tamam', note: `${a.detected} soru bulundu, ${a.saved} yeni soru havuza eklendi${a.note ? '. ' + a.note : ''}` });
      } catch (e) { patch(it.key, { state: 'hata', note: (e as Error).message }); }
    }
    setBusy(false);
    router.refresh();
  };

  const waiting = items.filter(i => i.state === 'hazir' || i.state === 'hata').length;
  return (
    <div className="space-y-3">
      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click(); }}
        className={'cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center text-sm transition ' + (drag ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700')}>
        <p className="font-semibold">PDF&rsquo;leri buraya sürükleyin ya da tıklayıp seçin</p>
        <p className="text-xs text-slate-500">Aynı anda birden fazla dosya · en çok 50 MB · aynı içerik ikinci kez yüklenmez</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="sr-only" onChange={e => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      {items.length > 0 && (
        <>
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-5 dark:bg-slate-800/40">
            <p className="text-xs font-semibold text-slate-600 sm:col-span-5 dark:text-slate-300">Bütün dosyalar için ortak bilgiler</p>
            <div><label className="label" htmlFor="u-pub">Yayınevi / kaynak</label><input id="u-pub" className="input" maxLength={120} value={common.publisher} onChange={e => setCommon({ ...common, publisher: e.target.value })} /></div>
            <div><label className="label" htmlFor="u-type">Tür</label><select id="u-type" className="input" value={common.doc_type} onChange={e => setCommon({ ...common, doc_type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="u-level">Seviye</label><input id="u-level" className="input" maxLength={30} value={common.grade_level} onChange={e => setCommon({ ...common, grade_level: e.target.value })} /></div>
            <div><label className="label" htmlFor="u-opt">Şık sayısı</label><select id="u-opt" className="input" value={common.option_count} onChange={e => setCommon({ ...common, option_count: Number(e.target.value) })}><option value={4}>4 (A–D, LGS)</option><option value={5}>5 (A–E)</option></select></div>
            <div><label className="label" htmlFor="u-desc">Not</label><input id="u-desc" className="input" maxLength={1000} value={common.description} onChange={e => setCommon({ ...common, description: e.target.value })} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Dosya</th><th>Başlık</th><th className="w-24">Deneme no</th><th className="w-36">Tarih</th><th>Durum</th><th></th></tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.key} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="max-w-40 truncate py-1.5 text-xs text-slate-500" title={it.file.name}>{it.file.name}<br />{(it.file.size / 1048576).toFixed(1)} MB</td>
                    <td><input aria-label="Başlık" className="input py-1" value={it.title} maxLength={200} disabled={it.state === 'tamam'} onChange={e => patch(it.key, { title: e.target.value })} /></td>
                    <td><input aria-label="Deneme no" className="input py-1" value={it.exam_no} maxLength={40} disabled={it.state === 'tamam'} onChange={e => patch(it.key, { exam_no: e.target.value })} /></td>
                    <td><input aria-label="Tarih" type="date" className="input py-1" value={it.published_on} disabled={it.state === 'tamam'} onChange={e => patch(it.key, { published_on: e.target.value })} /></td>
                    <td className={'text-xs ' + (it.state === 'tamam' ? 'text-emerald-600' : it.state === 'hata' ? 'text-red-600' : it.state === 'mukerrer' ? 'text-amber-600' : 'text-slate-500')}>{STATE_LABEL[it.state]}{it.note && <span className="block">{it.note}</span>}</td>
                    <td>{(it.state === 'hazir' || it.state === 'hata' || it.state === 'mukerrer') && !busy && <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => setItems(p => p.filter(x => x.key !== it.key))} aria-label="Listeden çıkar">✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={busy || !waiting} onClick={uploadAll}>{busy ? 'Yükleniyor…' : `${waiting} PDF'i arşive yükle`}</button>
            {!busy && items.some(i => i.state === 'tamam') && <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => setItems(p => p.filter(i => i.state !== 'tamam' && i.state !== 'mukerrer'))}>Yüklenenleri listeden temizle</button>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={auto} disabled={busy} onChange={e => setAuto(e.target.checked)} className="h-4 w-4 accent-indigo-600" />Yüklenince soruları otomatik ayıkla</label>
            <span className="text-xs text-slate-500">{auto ? 'Ayıklama bitene kadar sayfayı kapatmayın; sorular havuzda “onay bekliyor” olarak görünür.' : 'Sonra aşağıdan “Analiz et” ile soruları havuza çıkarabilirsiniz.'}</span>
          </div>
        </>
      )}
    </div>
  );
}

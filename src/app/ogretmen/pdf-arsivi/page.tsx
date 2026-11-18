import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { listPdfDocs, DOC_TYPES, fmtSize } from '@/lib/pdfLibrary';
import { fmtDate } from '@/lib/labels';
import { PdfUpload, PdfActions } from './PdfUpload';

export const metadata: Metadata = { title: 'PDF Arşivi' };

export default async function PdfArchivePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const archived = sp.kaldirilan === '1';
  const tur = sp.tur && sp.tur in DOC_TYPES ? sp.tur : '';
  const q = (sp.q || '').trim().toLocaleLowerCase('tr');
  const all = await listPdfDocs(await supabaseServer(), me.userId, archived);
  const docs = all.filter(d => (!tur || d.doc_type === tur) && (!q || [d.title, d.publisher, d.grade_level, d.description].some(x => (x || '').toLocaleLowerCase('tr').includes(q))));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">PDF Arşivi</h1>
        <p className="mt-1 text-sm text-slate-500">Denemelerini, soru bankalarını ve cevap anahtarlarını tek yerde tut. Dosyalar gizli saklanır; yalnızca sen açabilirsin.
          Bir PDF&rsquo;ten tek tıkla <b>online deneme</b> oluşturabilir ya da <b>soruları kırpıp</b> öğrencinin soru bankasına ekleyebilirsin.</p>
      </div>
      {!archived && <details className="card" open={all.length === 0}><summary className="cursor-pointer font-bold">＋ PDF yükle</summary><div className="mt-4"><PdfUpload userId={me.userId} /></div></details>}

      <form className="flex flex-wrap items-end gap-2" role="search">
        {archived && <input type="hidden" name="kaldirilan" value="1" />}
        <div className="min-w-48 flex-1"><label className="label" htmlFor="q">Ara</label><input id="q" name="q" defaultValue={sp.q || ''} className="input" placeholder="Başlık, yayınevi, seviye…" /></div>
        <div><label className="label" htmlFor="tur">Tür</label>
          <select id="tur" name="tur" defaultValue={tur} className="input"><option value="">Tümü</option>{Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <button className="btn-secondary">Süz</button>
        <Link href={archived ? '/ogretmen/pdf-arsivi' : '/ogretmen/pdf-arsivi?kaldirilan=1'} className="ml-auto self-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">{archived ? '← Arşive dön' : 'Kaldırılanlar'}</Link>
      </form>

      {docs.length === 0 ? <p className="text-sm text-slate-500">{all.length ? 'Aramaya uyan PDF yok.' : archived ? 'Kaldırılan PDF yok.' : 'Henüz PDF yok.'}</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map(d => (
            <div key={d.id} className="card space-y-2">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-red-100 text-[10px] font-black text-red-700 dark:bg-red-950 dark:text-red-300">PDF</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{d.title}</p>
                  <p className="text-xs text-slate-500">{[DOC_TYPES[d.doc_type], d.grade_level, d.publisher, d.page_count ? d.page_count + ' sayfa' : '', fmtSize(d.size_bytes), fmtDate(d.created_at)].filter(Boolean).join(' · ')}</p>
                  {d.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs font-semibold dark:border-slate-800">
                {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">Aç</a>}
                {!archived && <Link href={`/ogretmen/denemeler/yeni?pdf=${d.id}`} className="btn-primary px-3 py-1.5 text-xs">Online deneme yap</Link>}
                {!archived && <Link href={`/ogretmen/pdf-soru-ayikla?pdfId=${d.id}`} className="btn-secondary px-3 py-1.5 text-xs">✂️ Soru ayıkla</Link>}
                <span className="ml-auto"><PdfActions id={d.id} title={d.title} archived={archived} /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

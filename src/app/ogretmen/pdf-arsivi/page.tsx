import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { listPdfDocs, DOC_TYPES, fmtSize } from '@/lib/pdfLibrary';
import { fmtDate } from '@/lib/labels';
import { PdfUpload } from './PdfUpload';
import { PdfList } from './PdfList';

export const metadata: Metadata = { title: 'PDF Analiz Merkezi' };
export const dynamic = 'force-dynamic';

export default async function PdfArchivePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const archived = sp.kaldirilan === '1';
  const tur = sp.tur && sp.tur in DOC_TYPES ? sp.tur : '';
  const q = (sp.q || '').trim().toLocaleLowerCase('tr');
  const all = await listPdfDocs(await supabaseServer(), me.userId, archived);
  const docs = all.filter(d => (!tur || d.doc_type === tur) && (!q || [d.title, d.publisher, d.grade_level, d.description, d.exam_no].some(x => (x || '').toLocaleLowerCase('tr').includes(q))));
  const review = all.filter(d => d.analysis_status === 'review').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">PDF Analiz Merkezi</h1>
        <p className="mt-1 text-sm text-slate-500">Denemeleri ve soru bankalarını yükleyin, <b>Analiz et</b> ile içlerindeki soruları bulup <b>soru havuzuna</b> çıkarın
          (soru görseli, numarası, bölümü ve kitapçıktaki cevap anahtarı). Sorular siz konusunu verip onaylayana kadar &ldquo;inceleme bekliyor&rdquo; durumunda kalır.
          Dosyalar gizli saklanır; yalnızca siz açabilirsiniz.</p>
        <p className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/ogretmen/soru-havuzu" className="font-semibold text-indigo-600 dark:text-indigo-400">Soru havuzu →</Link>
          <Link href="/ogretmen/soru-havuzu/analiz" className="font-semibold text-indigo-600 dark:text-indigo-400">Deneme konu analizi →</Link>
          {review > 0 && <span className="rounded-full bg-indigo-100 px-2 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{review} PDF onay bekliyor</span>}
        </p>
      </div>
      {!archived && <details className="card" open={all.length === 0}><summary className="cursor-pointer font-bold">＋ PDF yükle (birden fazla)</summary><div className="mt-4"><PdfUpload userId={me.userId} /></div></details>}

      <form className="flex flex-wrap items-end gap-2" role="search">
        {archived && <input type="hidden" name="kaldirilan" value="1" />}
        <div className="min-w-48 flex-1"><label className="label" htmlFor="q">Ara</label><input id="q" name="q" defaultValue={sp.q || ''} className="input" placeholder="Başlık, yayınevi, deneme no…" /></div>
        <div><label className="label" htmlFor="tur">Tür</label>
          <select id="tur" name="tur" defaultValue={tur} className="input"><option value="">Tümü</option>{Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <button className="btn-secondary">Süz</button>
        <Link href={archived ? '/ogretmen/pdf-arsivi' : '/ogretmen/pdf-arsivi?kaldirilan=1'} className="ml-auto self-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">{archived ? '← Arşive dön' : 'Kaldırılanlar'}</Link>
      </form>

      {docs.length === 0 ? <p className="text-sm text-slate-500">{all.length ? 'Aramaya uyan PDF yok.' : archived ? 'Kaldırılan PDF yok.' : 'Henüz PDF yok.'}</p> : (
        <PdfList userId={me.userId} archived={archived} docs={docs.map(d => ({
          id: d.id, title: d.title, url: d.url, option_count: d.option_count, description: d.description,
          meta: [DOC_TYPES[d.doc_type], d.publisher, d.exam_no && 'Deneme ' + d.exam_no, d.grade_level, d.page_count ? d.page_count + ' sayfa' : '', fmtSize(d.size_bytes), d.published_on ? fmtDate(d.published_on) : fmtDate(d.created_at)].filter(Boolean).join(' · '),
          analysis_status: d.analysis_status, question_count: d.question_count, analyzed_label: d.analyzed_at ? fmtDate(d.analyzed_at) : null,
        }))} />
      )}
    </div>
  );
}

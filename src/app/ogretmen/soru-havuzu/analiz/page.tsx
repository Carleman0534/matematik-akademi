import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { activeOnly } from '@/lib/topics';
import { GRADES, gradeLabel } from '@/lib/labels';
import { analyzeUnits, QUESTION_TYPES, DIFFICULTY_LEVELS, type PoolRow } from '@/lib/pool';

export const metadata: Metadata = { title: 'Deneme Konu Analizi' };
export const dynamic = 'force-dynamic';

export default async function TopicAnalysisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [topics, { data: pdfData }] = await Promise.all([
    getTopics(sb),
    sb.from('pdf_documents').select('id, title, publisher, exam_no').eq('teacher_id', me.userId).neq('analysis_status', 'none').order('created_at'),
  ]);
  const pdfs = (pdfData || []) as { id: string; title: string; publisher: string | null; exam_no: string | null }[];
  const picked = ([] as string[]).concat(sp.pdf || []).filter(id => pdfs.some(p => p.id === id));
  const useIds = picked.length ? picked : pdfs.map(p => p.id);
  const grade = Number(sp.sinif) || 8;
  const { data: rowData } = useIds.length
    ? await sb.from('pool_questions').select('id, pdf_id, topic_id, question_type, difficulty, has_visual, duplicate_of, pool_question_topics(topic_id)').in('pdf_id', useIds).neq('status', 'rejected').limit(10000)
    : { data: [] };
  const rows: PoolRow[] = ((rowData || []) as (PoolRow & { pool_question_topics: { topic_id: string }[] })[]).map(r => ({ ...r, extra: r.pool_question_topics.map(t => t.topic_id) }));
  const act = activeOnly(topics);
  const units = act.filter(t => !t.parent_id && t.grade_level === grade).sort((a, b) => a.sort_order - b.sort_order);
  const result = analyzeUnits(rows, units, act);
  const unclassified = rows.filter(r => !r.topic_id).length;
  const shown = pdfs.filter(p => useIds.includes(p.id));
  const short = (p: { title: string; exam_no: string | null }) => (p.exam_no ? 'D' + p.exam_no : p.title.slice(0, 12));
  const totalQ = rows.length;

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/soru-havuzu" className="text-sm text-slate-500 hover:underline">← Soru Havuzu</Link>
      <div>
        <h1 className="text-2xl font-black">Deneme Konu Analizi</h1>
        <p className="text-sm text-slate-500">Seçilen PDF&rsquo;lerdeki sorular ünite ünite karşılaştırılır: kaç soru var, hangi alt konular kapsanmış, kaç farklı soru tipi var, zorluk dağılımı nasıl.
          Uyarılar, hangi konularda yeni soru (ileride yapay zekâyla üretilecek) gerektiğini gösterir. Sayılar sizin verdiğiniz konu/zorluk/tür bilgilerinden hesaplanır.</p>
      </div>

      <form className="card space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Düzey
            <select name="sinif" defaultValue={grade} className="input w-auto py-1">{GRADES.map(g => <option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>
          <button className="btn-primary px-3 py-1">Göster</button>
          <span className="text-xs text-slate-500">PDF seçmezseniz hepsi kullanılır.</span>
        </div>
        {pdfs.length === 0 ? <p className="text-sm text-slate-500">Analiz edilmiş PDF yok. <Link href="/ogretmen/pdf-arsivi" className="font-semibold text-indigo-600 dark:text-indigo-400">PDF Analiz Merkezi</Link>&rsquo;nden başlayın.</p> : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {pdfs.map(p => <label key={p.id} className="flex items-center gap-1.5"><input type="checkbox" name="pdf" value={p.id} defaultChecked={picked.includes(p.id)} />{p.title}{p.publisher ? <span className="text-xs text-slate-500">({p.publisher})</span> : null}</label>)}
          </div>
        )}
      </form>

      {totalQ > 0 && (
        <p className="text-sm">{shown.length} PDF · {totalQ} soru{unclassified ? <> · <b className="text-amber-600">{unclassified} sorunun konusu verilmemiş</b> (analize girmez; <Link href="/ogretmen/soru-havuzu?durum=all" className="underline">konu verin</Link>)</> : ''}</p>
      )}

      {units.length > 0 && totalQ > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50">
              <tr><th className="px-3 py-2">Ünite</th><th className="text-center">Soru<br /><span className="font-normal">(farklı)</span></th>
                {shown.map(p => <th key={p.id} className="text-center" title={p.title}>{short(p)}</th>)}
                <th className="text-center">Alt konu<br />kapsamı</th><th className="text-center">Soru<br />tipi</th><th>Zorluk (1→5)</th><th className="text-center">Şekilli</th></tr>
            </thead>
            <tbody>
              {result.map(u => (
                <tr key={u.unitId} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="px-3 py-2"><Link href={`/ogretmen/soru-havuzu?konu=${u.unitId}&durum=all`} className="font-semibold hover:underline">{u.name}</Link>
                    {u.warnings.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">{u.warnings.map(w => <li key={w}>⚠ {w}</li>)}</ul>}</td>
                  <td className="text-center font-bold">{u.total}{u.duplicates ? <span className="block text-xs font-normal text-slate-500">({u.unique})</span> : null}</td>
                  {shown.map(p => <td key={p.id} className="text-center text-slate-600 dark:text-slate-300">{u.bySource.get(p.id) || '·'}</td>)}
                  <td className="text-center" title={u.subtopics.map(s => `${s.name}: ${s.count}`).join('\n')}>{u.covered}/{u.subtopics.length}</td>
                  <td className="text-center" title={[...u.types].map(([k, v]) => `${QUESTION_TYPES[k] || k}: ${v}`).join('\n')}>{u.types.size}</td>
                  <td><div className="flex h-6 w-28 items-end gap-0.5" title={u.difficulty.map((n, i) => `${DIFFICULTY_LEVELS[i + 1]}: ${n}`).join('\n')}>
                    {u.difficulty.map((n, i) => { const max = Math.max(1, ...u.difficulty); return <span key={i} className="w-5 rounded-t bg-indigo-400" style={{ height: `${Math.max(n ? 12 : 2, (n / max) * 100)}%`, opacity: n ? 1 : 0.25 }} />; })}
                  </div></td>
                  <td className="text-center">{u.visual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {units.length === 0 && <p className="text-sm text-slate-500">Bu düzeyde konu yok.</p>}
    </div>
  );
}

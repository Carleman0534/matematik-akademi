import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { topicPath, rootOf } from '@/lib/topics';
import { POOL_SELECT, signPool, type PoolQ } from '@/lib/poolData';
import { PoolReview } from '@/components/pool/PoolReview';

export const metadata: Metadata = { title: 'Soru inceleme' };
export const dynamic = 'force-dynamic';

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const { pdf } = await searchParams;
  if (!pdf || !/^[0-9a-f-]{36}$/i.test(pdf)) notFound();
  const sb = await supabaseServer();
  const [{ data: doc }, topics, { data: qs }, { data: job }] = await Promise.all([
    sb.from('pdf_documents').select('id, title, page_count, grade_level, analysis_status').eq('id', pdf).eq('teacher_id', me.userId).maybeSingle(),
    getTopics(sb),
    sb.from('pool_questions').select(POOL_SELECT).eq('pdf_id', pdf).order('section').order('question_no').limit(500),
    sb.from('pdf_analysis_jobs').select('status, method, page_count, detected, saved, skipped_pages, answer_keys, error, finished_at').eq('pdf_id', pdf).order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!doc) notFound();
  const rows = await signPool(sb, (qs || []) as Omit<PoolQ, 'url'>[]);
  // Benzer soruların kaynağı
  const dupIds = [...new Set(rows.map(r => r.duplicate_of).filter(Boolean))] as string[];
  const { data: dups } = dupIds.length ? await sb.from('pool_questions').select('id, source_label, question_no, section').in('id', dupIds) : { data: [] };
  const dupLabel = new Map(((dups || []) as { id: string; source_label: string | null; question_no: number; section: string }[]).map(d => [d.id, `${d.source_label || 'Havuz'} ${d.section ? d.section + ' ' : ''}${d.question_no}. soru`]));

  const live = rows.filter(r => r.status !== 'rejected');
  const bySection = new Map<string, number>(); live.forEach(r => bySection.set(r.section || 'Bölümsüz', (bySection.get(r.section || 'Bölümsüz') || 0) + 1));
  const byUnit = new Map<string, number>(); live.forEach(r => { const u = rootOf(topics, r.topic_id); const k = u ? topicPath(topics, u) : 'Konusu seçilmedi'; byUnit.set(k, (byUnit.get(k) || 0) + 1); });
  const stat = (n: number, label: string, tone = '') => <div className="card p-3"><p className="text-xs text-slate-500">{label}</p><p className={'text-xl font-black ' + tone}>{n}</p></div>;
  const grade = /lgs|8/i.test(doc.grade_level || '') ? '8' : '';

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/pdf-arsivi" className="text-sm text-slate-500 hover:underline">← PDF Analiz Merkezi</Link>
      <div>
        <h1 className="text-2xl font-black">{doc.title}</h1>
        <p className="text-sm text-slate-500">Soruların konusunu, zorluğunu ve türünü verin, sonra onaylayın. Onaylanan sorular <Link href="/ogretmen/soru-havuzu" className="font-semibold text-indigo-600 dark:text-indigo-400">soru havuzunda</Link> konu bazlı çalışmalar ve denemeler için kullanılır.
          Soru görselleri kitapçıktan olduğu gibi kırpılır; kesirler, kökler ve şekiller bozulmaz.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stat(doc.page_count || job?.page_count || 0, 'Toplam sayfa')}
        {stat(live.length, 'Tespit edilen soru')}
        {stat(live.filter(r => r.status === 'approved').length, 'Onaylanan', 'text-emerald-600')}
        {stat(live.filter(r => !r.topic_id).length, 'Konusu verilmemiş', 'text-amber-600')}
        {stat(live.filter(r => r.duplicate_of).length, 'Muhtemel mükerrer', 'text-rose-600')}
        {stat(live.filter(r => r.detect_method === 'gaps').length, 'Düşük güvenle bulunan', 'text-amber-600')}
      </div>
      <div className="card space-y-1 text-sm">
        <p><b>Analiz:</b> {job ? `${job.method === 'text' ? 'metin katmanından (yüksek güven)' : 'boşluklardan (taranmış PDF, düşük güven)'} · ${job.detected ?? 0} soru bulundu · ${job.skipped_pages ?? 0} soru olmayan sayfa atlandı · cevap anahtarından ${job.answer_keys ?? 0} cevap` : '—'}{job?.error ? ` · hata: ${job.error}` : ''}</p>
        <p><b>Bölümler:</b> {[...bySection].map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
        <p><b>Konu dağılımı:</b> {[...byUnit].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-slate-500">Bu PDF&rsquo;ten henüz soru çıkarılmadı. PDF Analiz Merkezi&rsquo;nden &ldquo;Analiz et&rdquo;e basın.</p> : (
        <PoolReview options={topicOptions(topics)} defaultGrade={grade} rows={rows.map(r => ({
          id: r.id, url: r.url, section: r.section, question_no: r.question_no, page_no: r.page_no, option_count: r.option_count, correct: r.correct,
          topic_id: r.topic_id, difficulty: r.difficulty, question_type: r.question_type, has_visual: r.has_visual, status: r.status,
          duplicate_of: r.duplicate_of, dupLabel: r.duplicate_of ? dupLabel.get(r.duplicate_of) || null : null, confidence: r.confidence, detect_method: r.detect_method,
        }))} />
      )}
    </div>
  );
}

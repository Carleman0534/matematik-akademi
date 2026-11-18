import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getQuestion, getSources, getStudent, getTopics, getOutcomes, signedUrlMap } from '@/lib/data';
import { analyzeQuestion, STATUS_LABEL, RESULT_LABEL } from '@/lib/learning';
import { topicPath } from '@/lib/topics';
import { topicOptions } from '@/lib/topicOptions';
import { INITIAL_LABEL, DIFFICULTY_LABEL, STATUS_STYLE, fmtDate, fmtDateTime } from '@/lib/labels';
import { AttemptRecorder, QuestionEditForm, ArchiveButton } from '@/components/questions/QuestionClient';

export const metadata: Metadata = { title: 'Soru' };

const TYPE_LABEL: Record<string, string> = { initial: 'Bankaya eklendi', review: 'Tekrar çözüm', exam: 'Deneme', manual: 'Elle' };

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) notFound();
  const sb = await supabaseServer();
  const q = await getQuestion(sb, id); // RLS: başka öğrencinin sorusu hiç gelmez
  if (!q) notFound();
  const [topics, sources, student, outcomes] = await Promise.all([getTopics(sb), getSources(sb), s.role === 'teacher' ? getStudent(sb, q.student_id) : Promise.resolve(null), getOutcomes(sb)]);
  const extraTopics = (q.question_topic_relations || []).filter(r => r.role !== 'primary').map(r => topicPath(topics, r.topic_id)).filter(Boolean);
  const outcome = outcomes.find(o => o.id === q.outcome_id);
  const parents = Object.fromEntries(topics.map(t => [t.id, t.parent_id]));
  const imgs = [...q.question_images].sort((a, b) => a.sort_order - b.sort_order);
  const urls = await signedUrlMap(sb, imgs.map(i => i.path));
  const a = analyzeQuestion(q.created_at, q.question_attempts);
  const history = [...q.question_attempts].sort((x, y) => Date.parse(y.attempted_at) - Date.parse(x.attempted_at));
  const back = s.role === 'teacher' ? '/ogretmen/ogrenciler/' + q.student_id : '/ogrenci/soru-bankam';
  const src = sources.find(x => x.id === q.source_id)?.name;

  return (
    <div className="space-y-5">
      <Link href={back} className="text-sm text-slate-500 hover:underline">← {student ? student.full_name + ' · soru bankası' : 'Soru bankam'}</Link>
      {q.archived_at && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">Bu soru {fmtDate(q.archived_at)} tarihinde arşive taşındı; soru bankasında görünmez.</p>}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          {imgs.length ? imgs.map(i => urls.get(i.path) && (
            <a key={i.id} href={urls.get(i.path)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" title="Tam boyut aç">
              <img src={urls.get(i.path)} alt="Soru görseli" className="mx-auto max-h-[75vh] w-auto" />
            </a>
          )) : <div className="card whitespace-pre-wrap text-base">{q.question_text || 'Bu sorunun görseli ya da metni yok.'}</div>}
          {imgs.length > 0 && q.question_text && <div className="card whitespace-pre-wrap text-sm">{q.question_text}</div>}
        </section>

        <aside className="space-y-4">
          <div className="card space-y-2">
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className={'rounded px-2 py-0.5 ' + (q.initial_status === 'blank' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300')}>{INITIAL_LABEL[q.initial_status]}</span>
              <span className={'rounded px-2 py-0.5 ' + STATUS_STYLE[a.status]}>{STATUS_LABEL[a.status]}</span>
              {q.difficulty && <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{DIFFICULTY_LABEL[q.difficulty]}</span>}
            </div>
            <p className="font-bold">{topicPath(topics, q.topic_id) || 'Konu seçilmedi'}</p>
            {extraTopics.length > 0 && <p className="text-xs text-slate-500">Yardımcı konular: {extraTopics.join(' · ')}</p>}
            {outcome && <p className="text-xs text-slate-500"><b>Kazanım:</b> {outcome.code ? outcome.code + ' – ' : ''}{outcome.text}</p>}
            <p className="text-sm text-slate-500">{[src, q.test_no && 'Test ' + q.test_no, q.page_no && 'Sayfa ' + q.page_no, q.question_no && 'Soru ' + q.question_no].filter(Boolean).join(' · ') || 'Kaynak bilgisi yok'}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Eklenme</dt><dd>{fmtDate(q.created_at)}</dd>
              <dt className="text-slate-500">Doğru cevap</dt><dd>{q.correct_answer || '—'}</dd>
              <dt className="text-slate-500">Verilen cevap</dt><dd>{q.student_answer || '—'}</dd>
              <dt className="text-slate-500">Hata türü</dt><dd>{q.error_type || '—'}</dd>
              <dt className="text-slate-500">Yanlış / boş</dt><dd>{a.wrongCount} / {a.blankCount}</dd>
              <dt className="text-slate-500">Sonraki tekrar</dt><dd>{a.due ? <b className="text-indigo-600 dark:text-indigo-400">Bugün</b> : fmtDate(a.nextReviewAt)}</dd>
            </dl>
            {q.teacher_note && <p className="rounded-lg bg-indigo-50 p-2 text-sm dark:bg-indigo-950/50"><b>Öğretmen:</b> {q.teacher_note}</p>}
            {q.solution && <details className="text-sm"><summary className="cursor-pointer font-semibold">Çözümü göster</summary><p className="mt-1 whitespace-pre-wrap">{q.solution}</p></details>}
            {q.student_note && <p className="text-sm text-slate-600 dark:text-slate-400"><b>Not:</b> {q.student_note}</p>}
          </div>

          {!q.archived_at && <div className="card"><AttemptRecorder questionId={q.id} /></div>}

          <div className="card space-y-2">
            <h2 className="font-bold">Çözüm geçmişi</h2>
            <ol className="space-y-1.5 text-sm">
              {history.map(h => (
                <li key={h.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="w-36 text-slate-500">{fmtDateTime(h.attempted_at)}</span>
                  <b className={h.result === 'correct' ? 'text-emerald-600' : h.result === 'incorrect' ? 'text-red-600' : 'text-slate-500'}>{RESULT_LABEL[h.result]}</b>
                  <span className="text-xs text-slate-500">{TYPE_LABEL[h.attempt_type] || h.attempt_type}{h.time_spent_sec ? ' · ' + Math.round(h.time_spent_sec / 60 * 10) / 10 + ' dk' : ''}</span>
                  {h.note && <span className="w-full pl-36 text-xs text-slate-500">{h.note}</span>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <details className="card"><summary className="cursor-pointer font-bold">✎ Soru bilgilerini düzenle</summary>
        <div className="mt-4"><QuestionEditForm q={q} options={topicOptions(topics)} sources={sources} isTeacher={s.role === 'teacher'}
          outcomes={outcomes.filter(o => o.is_active).map(o => ({ id: o.id, topic_id: o.topic_id, code: o.code, text: o.text }))} parents={parents} /></div>
      </details>
      <ArchiveButton id={q.id} archived={!!q.archived_at} />
    </div>
  );
}

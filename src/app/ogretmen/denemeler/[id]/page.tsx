import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, getPages, getKey, eligibleStudents, getAssignees } from '@/lib/examData';
import { AssigneePicker } from '@/components/exams/AssigneePicker';
import { getClasses, getTopics } from '@/lib/data';
import { topicOptions } from '@/lib/topicOptions';
import { examPhase, PHASE_LABEL, MODE_LABEL, RESULTS_LABEL } from '@/lib/exams';
import { fmtDateTime } from '@/lib/labels';
import { ExamTabs } from '@/components/exams/ExamTabs';
import { ExamControls } from '@/components/exams/ExamControls';
import { ExamForm } from '@/components/exams/ExamForm';
import { KeyEditor } from '@/components/exams/KeyEditor';
import { PagesManager } from '@/components/exams/PagesManager';
import { PHASE_STYLE } from '@/components/exams/phaseStyle';

export const metadata: Metadata = { title: 'Deneme' };

export default async function ExamPrepPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  let scopeQ = sb.from('students').select('id, full_name').eq('teacher_id', exam.teacher_id).eq('is_active', true).order('full_name');
  if (exam.class_id) scopeQ = scopeQ.eq('class_id', exam.class_id);
  const [pages, key, topics, classes, students, { count: sessions }, picked, { data: scopeData }] = await Promise.all([
    getPages(sb, id), getKey(sb, id), getTopics(sb), getClasses(sb, exam.teacher_id), eligibleStudents(sb, exam),
    sb.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('exam_id', id),
    getAssignees(sb, id), scopeQ,
  ]);
  const scope = (scopeData || []) as { id: string; full_name: string }[];
  const ph = examPhase(exam);
  const keyed = [...key.values()].filter(k => k.correct).length;
  const steps = [
    { done: pages.length > 0, text: `Soru sayfaları (${pages.length})` },
    { done: keyed > 0, text: `Cevap anahtarı (${keyed}/${exam.question_count})` },
    { done: ph !== 'taslak', text: exam.mode === 'live' ? 'Başlat' : 'Yayımla' },
  ];
  const className = exam.class_id ? classes.find(c => c.id === exam.class_id)?.name || 'Sınıf' : 'Bütün öğrencilerim';

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/denemeler" className="text-sm text-slate-500 hover:underline">← Denemeler</Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">{exam.title}</h1>
          <p className="text-sm text-slate-500">{MODE_LABEL[exam.mode]} · {exam.question_count} soru · {exam.duration_min} dk · {className} ({students.length} öğrenci)
            {exam.mode === 'assignment' && exam.closes_at ? ` · ${exam.opens_at ? fmtDateTime(exam.opens_at) + ' – ' : 'son teslim '}${fmtDateTime(exam.closes_at)}` : ''}</p>
        </div>
        <span className={'rounded-full px-3 py-1 text-xs font-bold ' + PHASE_STYLE[ph]}>{PHASE_LABEL[ph]}</span>
      </div>
      <ExamTabs id={id} active="hazirlik" live={ph === 'canli'} />

      <section className="card space-y-3">
        <ol className="flex flex-wrap gap-2 text-sm">
          {steps.map((s, i) => <li key={i} className={'rounded-full px-3 py-1 ' + (s.done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{s.done ? '✓' : i + 1 + '.'} {s.text}</li>)}
        </ol>
        {ph === 'bekliyor' && <p className="text-sm text-amber-700 dark:text-amber-300">Öğrenciler denemeyi görüyor ve bekleme ekranında. Herkes hazır olunca <b>Şimdi başlat</b>&rsquo;a basın.</p>}
        {students.length === 0 && <p className="text-sm text-amber-700 dark:text-amber-300">Bu denemeye atanmış aktif öğrenci yok. <Link href="/ogretmen/siniflar" className="font-semibold underline">Sınıf kodu</Link> paylaşın ya da öğrenci ekleyin.</p>}
        <ExamControls id={id} phase={ph} mode={exam.mode} sessions={sessions || 0} />
        <p className="text-xs text-slate-500">Sonuçlar öğrenciye: {RESULTS_LABEL[exam.results_mode]} · Yanlışlar: {exam.penalty_divisor ? `${exam.penalty_divisor} yanlış 1 doğruyu götürür` : 'doğruyu götürmez'}</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Kimler çözecek?</h2>
        <AssigneePicker examId={id} students={scope} picked={picked} scopeLabel={className} />
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">Kâğıt üzerinde mi çözülecek?</h2>
        <p className="text-sm text-slate-500">Optik formu yazdırıp sınıfta dağıtın; sonra her öğrencinin işaretlediklerini hızlıca girin. Sonuçlar ve analiz online çözenlerle birlikte hesaplanır.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ogretmen/denemeler/${id}/optik-yazdir`} className="btn-secondary">🖨️ Optik formu yazdır</Link>
          <Link href={`/ogretmen/denemeler/${id}/optik-giris`} className="btn-secondary">⌨️ Kâğıt cevaplarını gir</Link>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Soru sayfaları</h2>
        <PagesManager examId={id} pages={pages} editable={!sessions} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Cevap anahtarı ve konular</h2>
        <p className="text-sm text-slate-500">Cevap anahtarı öğrencilere sonuçlar açılana kadar hiçbir şekilde gönderilmez. Deneme bittikten sonra da düzeltebilirsiniz; puanlar yeniden hesaplanır.</p>
        <KeyEditor examId={id} questionCount={exam.question_count} optionCount={exam.option_count} pageCount={pages.length}
          initial={[...key.values()]} topics={topicOptions(topics)} />
      </section>

      <details className="card">
        <summary className="cursor-pointer font-bold">Deneme ayarları</summary>
        <div className="mt-4"><ExamForm classes={classes} locked={!!sessions} initial={{ ...exam }} /></div>
      </details>
    </div>
  );
}

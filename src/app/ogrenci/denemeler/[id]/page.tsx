import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, getKey } from '@/lib/examData';
import { getTopics } from '@/lib/data';
import { topicPath } from '@/lib/topics';
import { examPhase, scoreSheet, topicStats, fmtNet, MODE_LABEL, RESULTS_LABEL, type Letter, type Mark } from '@/lib/exams';
import { pct, fmtDateTime } from '@/lib/labels';
import { StartExamButton, WaitingRoom } from '@/components/exams/StudentExamActions';

export const metadata: Metadata = { title: 'Deneme' };
export const dynamic = 'force-dynamic';

const MARK_STYLE: Record<Mark, string> = {
  D: 'bg-emerald-500 text-white', Y: 'bg-red-500 text-white', B: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', I: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800',
};
const nowMs = () => Date.now();

export default async function StudentExamPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStudent();
  const { id } = await params;
  const sb = await supabaseServer();
  const exam = await getExam(sb, id); // RLS: bana atanmamışsa bulunamaz
  if (!exam) notFound();
  const { data: ses } = await sb.from('exam_sessions').select('id, deadline, submitted_at, started_at').eq('exam_id', id).eq('student_id', s.studentId).maybeSingle();
  const now = nowMs();
  const ph = examPhase(exam, now);
  const done = !!ses && (!!ses.submitted_at || Date.parse(ses.deadline) < now || ph === 'bitti');
  const back = <Link href="/ogrenci/denemeler" className="text-sm text-slate-500 hover:underline">← Denemelerim</Link>;
  const head = (
    <div>
      <h1 className="text-2xl font-black">{exam.title}</h1>
      <p className="text-sm text-slate-500">{MODE_LABEL[exam.mode]} · {exam.question_count} soru · {exam.duration_min} dakika{exam.penalty_divisor ? ` · ${exam.penalty_divisor} yanlış 1 doğruyu götürür` : ''}</p>
    </div>
  );

  // ---- Bitti: sonuç (öğretmenin izin verdiği zaman) ----
  if (done || (ph === 'bitti')) {
    if (!ses) return <div className="space-y-4">{back}{head}<p className="card text-sm text-slate-500">Bu denemeye katılmadın.</p></div>;
    const key = await getKey(sb, id); // RLS: sonuçlar açılmadıysa boş gelir
    if (!key.size) {
      return (
        <div className="space-y-4">{back}{head}
          <div className="card space-y-1 text-center"><p className="text-3xl">✅</p><p className="font-bold">Denemen teslim edildi.</p>
            <p className="text-sm text-slate-500">{exam.results_mode === 'never' ? 'Sonuçları öğretmenin seninle paylaşacak.' : `Sonuçlar: ${RESULTS_LABEL[exam.results_mode].toLocaleLowerCase('tr')} açılacak.`}</p></div>
        </div>
      );
    }
    const [{ data: ansRows }, topics] = await Promise.all([
      sb.from('exam_answers').select('question_no, answer').eq('session_id', ses.id), getTopics(sb),
    ]);
    const ans: (Letter | null)[] = Array(exam.question_count).fill(null);
    ((ansRows || []) as { question_no: number; answer: Letter | null }[]).forEach(a => { if (a.question_no <= exam.question_count) ans[a.question_no - 1] = a.answer; });
    const sc = scoreSheet(ans, key, exam);
    const ts = topicStats([ans], key, exam);
    return (
      <div className="space-y-5">{back}{head}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-3"><p className="text-xs text-slate-500">Net</p><p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{fmtNet(sc.net)}</p></div>
          <div className="card p-3"><p className="text-xs text-slate-500">Doğru</p><p className="text-2xl font-black text-emerald-600">{sc.correct}</p></div>
          <div className="card p-3"><p className="text-xs text-slate-500">Yanlış</p><p className="text-2xl font-black text-red-600">{sc.wrong}</p></div>
          <div className="card p-3"><p className="text-xs text-slate-500">Boş</p><p className="text-2xl font-black">{sc.blank}</p></div>
        </div>
        <section className="card space-y-2">
          <h2 className="font-bold">Cevapların</h2>
          <p className="text-xs text-slate-500">Senin işaretin → doğru cevap. Yeşil doğru, kırmızı yanlış, gri boş.</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
            {sc.marks.map((mk, i) => <div key={i} className={'rounded-lg p-1.5 text-center text-xs ' + MARK_STYLE[mk]}><b className="block">{i + 1}</b>{ans[i] || '–'}{mk === 'Y' || mk === 'B' ? ` → ${key.get(i + 1)?.correct}` : ''}</div>)}
          </div>
        </section>
        {ts.some(t => t.topic_id) && (
          <section className="card space-y-2">
            <h2 className="font-bold">Konulara göre</h2>
            {ts.map(t => (
              <div key={t.topic_id || 'yok'} className="grid grid-cols-[1fr_100px_70px] items-center gap-2 text-sm">
                <span className="truncate">{t.topic_id ? topicPath(topics, t.topic_id) : 'Diğer'}</span>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className={'h-2.5 rounded-full ' + (t.rate >= 0.7 ? 'bg-emerald-500' : t.rate >= 0.4 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${t.rate * 100}%` }} /></div>
                <span className="text-xs text-slate-500">{pct(t.rate)}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-500">Öğretmenin yanlışlarını soru bankana ekleyince <Link href="/ogrenci/tekrar" className="font-semibold text-indigo-600 dark:text-indigo-400">Tekrar Et</Link>&rsquo;te karşına çıkacak.</p>
          </section>
        )}
      </div>
    );
  }

  // ---- Devam eden oturum ----
  if (ses) {
    return (
      <div className="space-y-4">{back}{head}
        <div className="card space-y-3 text-center"><p className="font-bold">Denemen devam ediyor.</p>
          <p className="text-sm text-slate-500">Bitiş: {fmtDateTime(ses.deadline)}. Süre sen sayfada olmasan da işliyor.</p>
          <Link href={'/coz/' + id} className="btn-primary px-6 py-3 text-base">Kaldığın yerden devam et</Link></div>
      </div>
    );
  }

  // ---- Başlamadan önce ----
  return (
    <div className="space-y-4">{back}{head}
      {exam.instructions && <p className="card whitespace-pre-line text-sm">{exam.instructions}</p>}
      {ph === 'bekliyor' && <WaitingRoom examId={id} />}
      {ph === 'acilacak' && <p className="card text-center text-sm">Bu deneme <b>{fmtDateTime(exam.opens_at)}</b> tarihinde açılacak.</p>}
      {(ph === 'canli' || ph === 'acik') && (
        <div className="card space-y-3 text-center">
          <ul className="mx-auto max-w-md list-inside list-disc text-left text-sm text-slate-600 dark:text-slate-300">
            <li>Soruları ekranda göreceksin; cevaplarını optik formda işaretle.</li>
            <li>Her işaretin anında kaydedilir; internet kesilirse sayfayı yenileyip devam edebilirsin.</li>
            <li>{exam.mode === 'live' ? 'Süre herkes için birlikte işliyor.' : `Başladığın an ${exam.duration_min} dakikalık süren başlar${exam.closes_at ? ` (en geç ${fmtDateTime(exam.closes_at)})` : ''}.`} Süre bitince deneme kendiliğinden teslim edilir.</li>
          </ul>
          <StartExamButton examId={id} label={ph === 'canli' ? 'Denemeye katıl' : 'Denemeye başla'} />
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, getKey, eligibleStudents, answerMatrix, sessionDone } from '@/lib/examData';
import { getTopics } from '@/lib/data';
import { topicPath } from '@/lib/topics';
import { parseAnswers, scoreSheet, questionStats, topicStats, examPhase, fmtNet, letters, type Mark } from '@/lib/exams';
import { pct, fmtDateTime } from '@/lib/labels';
import { ExamTabs } from '@/components/exams/ExamTabs';
import { TransferButton } from '@/components/exams/TransferButton';

export const metadata: Metadata = { title: 'Sonuçlar' };
export const dynamic = 'force-dynamic';

const MARK_STYLE: Record<Mark, string> = {
  D: 'bg-emerald-500 text-white', Y: 'bg-red-500 text-white', B: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', I: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800',
};
const rateColor = (r: number) => (r >= 0.7 ? 'bg-emerald-500' : r >= 0.4 ? 'bg-amber-400' : 'bg-red-500');
const nowMs = () => Date.now();

export default async function ResultsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireTeacher();
  const { id } = await params;
  const sel = (await searchParams).ogrenci || '';
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  const [key, students, matrix, topics, { data: src }] = await Promise.all([
    getKey(sb, id), eligibleStudents(sb, exam), answerMatrix(sb, id), getTopics(sb),
    sb.from('exam_sessions').select('student_id, source').eq('exam_id', id),
  ]);
  const now = nowMs();
  const names = new Map(students.map(s => [s.id, s.full_name]));
  const missing = matrix.filter(m => !names.has(m.student_id)).map(m => m.student_id);
  if (missing.length) {
    const { data } = await sb.from('students').select('id, full_name').in('id', missing);
    ((data || []) as { id: string; full_name: string }[]).forEach(s => names.set(s.id, s.full_name));
  }
  const source = new Map(((src || []) as { student_id: string; source: string }[]).map(r => [r.student_id, r.source]));
  const finished = matrix.filter(m => sessionDone(m, now));
  const results = finished.map(m => {
    const ans = parseAnswers(m.answers, exam.question_count);
    return { m, ans, sc: scoreSheet(ans, key, exam), name: names.get(m.student_id) || 'Öğrenci' };
  }).sort((a, b) => b.sc.net - a.sc.net || a.name.localeCompare(b.name, 'tr'));
  const sheets = results.map(r => r.ans);
  const qs = questionStats(sheets, key, exam);
  const ts = topicStats(sheets, key, exam);
  const tname = (tid: string | null) => (tid ? topicPath(topics, tid) : 'Konu girilmemiş');
  const nets = results.map(r => r.sc.net);
  const avg = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0;
  const notTransferred = results.filter(r => !r.m.transferred_at);
  const inProgress = matrix.length - finished.length;
  const notStarted = students.filter(s => !matrix.some(m => m.student_id === s.id));
  const keyed = [...key.values()].filter(k => k.correct).length;
  const ph = examPhase(exam, now);
  const one = sel ? results.find(r => r.m.student_id === sel) : null;
  const L = letters(exam.option_count);

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/denemeler" className="text-sm text-slate-500 hover:underline">← Denemeler</Link>
      <h1 className="text-2xl font-black">{exam.title}</h1>
      <ExamTabs id={id} active="sonuclar" live={ph === 'canli'} />

      {keyed === 0 && <p className="card text-sm text-amber-700 dark:text-amber-300">Cevap anahtarı girilmemiş; puan hesaplanamıyor. <Link href={`/ogretmen/denemeler/${id}`} className="font-semibold underline">Hazırlık</Link> sekmesinden girin.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="card p-3"><p className="text-xs text-slate-500">Sonuçlanan</p><p className="text-xl font-black">{results.length}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Ortalama net</p><p className="text-xl font-black">{results.length ? fmtNet(Math.round(avg * 100) / 100) : '—'}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">En yüksek / düşük</p><p className="text-xl font-black">{results.length ? `${fmtNet(Math.max(...nets))} / ${fmtNet(Math.min(...nets))}` : '—'}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Devam eden</p><p className="text-xl font-black">{inProgress}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-500">Hiç girmeyen</p><p className="text-xl font-black">{notStarted.length}</p></div>
      </div>
      {notStarted.length > 0 && <p className="text-xs text-slate-500">Girmeyenler: {notStarted.map(s => s.full_name).join(', ')} · <Link href={`/ogretmen/denemeler/${id}/optik-giris`} className="font-semibold text-indigo-600 dark:text-indigo-400">kâğıtta çözdülerse cevaplarını girin</Link></p>}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold">Öğrenci sonuçları</h2>
          <span className="ml-auto"><TransferButton examId={id} label={`Yanlışları soru bankalarına aktar (${notTransferred.length})`} pendingCount={notTransferred.length} /></span>
        </div>
        {results.length === 0 ? <p className="text-sm text-slate-500">Henüz teslim eden ya da süresi dolan öğrenci yok.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">#</th><th>Öğrenci</th><th>D</th><th>Y</th><th>B</th><th>Net</th><th>Başarı</th><th>Teslim</th><th></th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.m.session_id} className={'border-t border-slate-100 dark:border-slate-800 ' + (sel === r.m.student_id ? 'bg-indigo-50 dark:bg-indigo-950/30' : '')}>
                    <td className="py-2 text-slate-500">{i + 1}</td>
                    <td className="font-semibold"><Link href={`/ogretmen/denemeler/${id}/sonuclar?ogrenci=${r.m.student_id}#optik`} className="hover:underline">{r.name}</Link>
                      {source.get(r.m.student_id) === 'paper' && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] text-slate-500 dark:bg-slate-800">kâğıt</span>}</td>
                    <td className="text-emerald-600">{r.sc.correct}</td><td className="text-red-600">{r.sc.wrong}</td><td className="text-slate-500">{r.sc.blank}</td>
                    <td className="font-black">{fmtNet(r.sc.net)}</td><td>{pct(r.sc.pct)}</td>
                    <td className="text-xs text-slate-500">{fmtDateTime(r.m.submitted_at || r.m.deadline)}</td>
                    <td className="text-right text-xs">{r.m.transferred_at ? <span className="text-emerald-600">✓ bankada</span> : <TransferButton examId={id} studentIds={[r.m.student_id]} label="Bankaya aktar" pendingCount={1} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {one && (
        <section id="optik" className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{one.name} · optik karşılaştırma</h2>
            <Link href={`/ogretmen/denemeler/${id}/sonuclar`} className="ml-auto text-sm text-slate-500 hover:underline">Kapat ✕</Link></div>
          <p className="text-xs text-slate-500">Her kutu: soru no, öğrencinin işareti → doğru cevap. Yeşil doğru, kırmızı yanlış, gri boş, üstü çizili iptal.</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
            {one.sc.marks.map((mk, i) => (
              <div key={i} className={'rounded-lg p-1.5 text-center text-xs ' + MARK_STYLE[mk]} title={tname(key.get(i + 1)?.topic_id ?? null)}>
                <b className="block">{i + 1}</b>{one.ans[i] || '–'}{mk === 'Y' || mk === 'B' ? ` → ${key.get(i + 1)?.correct}` : ''}
              </div>
            ))}
          </div>
          <h3 className="pt-2 text-sm font-bold">Konulara göre</h3>
          <TopicTable rows={topicStats([one.ans], key, exam)} tname={tname} />
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-bold">Konu analizi (sınıf)</h2>
        {results.length === 0 ? <p className="text-sm text-slate-500">Sonuç gelince görünür.</p> : <TopicTable rows={ts} tname={tname} />}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Soru analizi</h2>
        <p className="text-xs text-slate-500">Hangi soruyu kaç kişi doğru yaptı, hangi şıkkı seçtiler. Kırmızı çerçeveli şık en çok seçilen yanlış (çeldirici).</p>
        {results.length === 0 ? <p className="text-sm text-slate-500">Sonuç gelince görünür.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Soru</th><th>Cevap</th><th className="w-40">Doğru oranı</th><th>Şıklar</th><th>Konu</th><th>Yanlış / boş yapanlar</th></tr></thead>
              <tbody>
                {qs.map(q => {
                  const wrongNames = results.filter(r => r.sc.marks[q.no - 1] === 'Y' || r.sc.marks[q.no - 1] === 'B').map(r => r.name);
                  return (
                    <tr key={q.no} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="py-2 font-bold">{q.no}</td>
                      <td className="font-bold">{q.correct || <span className="text-xs font-normal text-slate-400">iptal</span>}</td>
                      <td>{q.rate == null ? '—' : <><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={'h-2 rounded-full ' + rateColor(q.rate)} style={{ width: `${q.rate * 100}%` }} /></div><span className="text-[11px] text-slate-500">{pct(q.rate)} · {q.nCorrect}D {q.nWrong}Y {q.nBlank}B</span></>}</td>
                      <td><div className="flex gap-1">{L.map(l => (
                        <span key={l} className={'rounded px-1.5 text-xs ' + (l === q.correct ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : l === q.topWrong ? 'ring-1 ring-red-500' : 'bg-slate-50 dark:bg-slate-800')}>{l}:{q.dist[l]}</span>
                      ))}</div></td>
                      <td className="max-w-48 text-xs text-slate-500">{tname(q.topic_id)}</td>
                      <td className="max-w-64 text-xs text-slate-500">{wrongNames.length ? wrongNames.join(', ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TopicTable({ rows, tname }: { rows: ReturnType<typeof topicStats>; tname: (id: string | null) => string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">Konu bilgisi yok (cevap anahtarında konu seçilmemiş).</p>;
  return (
    <div className="space-y-1.5">
      {rows.map(t => (
        <div key={t.topic_id || 'yok'} className="grid grid-cols-[1fr_120px_90px] items-center gap-2 text-sm">
          <span className="truncate" title={tname(t.topic_id)}>{tname(t.topic_id)}</span>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className={'h-2.5 rounded-full ' + rateColor(t.rate)} style={{ width: `${t.rate * 100}%` }} /></div>
          <span className="text-xs text-slate-500">{pct(t.rate)} · {t.correct}/{t.total}</span>
        </div>
      ))}
    </div>
  );
}

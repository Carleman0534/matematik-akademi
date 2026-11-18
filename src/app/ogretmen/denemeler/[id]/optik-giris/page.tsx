import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, eligibleStudents, answerMatrix } from '@/lib/examData';
import { PaperEntry } from '@/components/exams/PaperEntry';

export const metadata: Metadata = { title: 'Kâğıt cevapları' };

export default async function PaperEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  const [students, matrix, { data: src }] = await Promise.all([
    eligibleStudents(sb, exam), answerMatrix(sb, id),
    sb.from('exam_sessions').select('student_id, source').eq('exam_id', id),
  ]);
  const bySt = new Map(matrix.map(m => [m.student_id, m]));
  const source = new Map(((src || []) as { student_id: string; source: 'online' | 'paper' }[]).map(r => [r.student_id, r.source]));
  const rows = students.map(s => ({ id: s.id, full_name: s.full_name, answers: bySt.get(s.id)?.answers ?? null, source: source.get(s.id) ?? null }));
  return (
    <div className="space-y-5">
      <Link href={`/ogretmen/denemeler/${id}`} className="text-sm text-slate-500 hover:underline">← {exam.title}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">Kâğıt cevaplarını gir</h1>
        <Link href={`/ogretmen/denemeler/${id}/optik-yazdir`} className="btn-secondary ml-auto">🖨️ Optik formu yazdır</Link>
        <Link href={`/ogretmen/denemeler/${id}/sonuclar`} className="btn-secondary">Sonuçlar →</Link>
      </div>
      <p className="text-sm text-slate-500">Her öğrencinin kâğıda işaretlediği şıkları girin. Kaydettiğiniz anda sonuçlara ve analize eklenir. Cevap anahtarı burada gösterilmez; puanlar sonuçlar sayfasında hesaplanır.</p>
      <div className="card"><PaperEntry examId={id} questionCount={exam.question_count} optionCount={exam.option_count} rows={rows} /></div>
    </div>
  );
}

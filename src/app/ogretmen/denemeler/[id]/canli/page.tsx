import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, getKey, eligibleStudents, answerMatrix } from '@/lib/examData';
import { examPhase } from '@/lib/exams';
import { ExamTabs } from '@/components/exams/ExamTabs';
import { ExamControls } from '@/components/exams/ExamControls';
import { LiveMonitor } from '@/components/exams/LiveMonitor';

export const metadata: Metadata = { title: 'Canlı izleme' };
export const dynamic = 'force-dynamic';

const nowMs = () => Date.now();

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  const [key, students, matrix, { count }] = await Promise.all([
    getKey(sb, id), eligibleStudents(sb, exam), answerMatrix(sb, id),
    sb.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('exam_id', id),
  ]);
  // Atanmamış ama oturumu olan öğrenciler de (örn. sonradan sınıf değiştirdiyse) listede görünsün
  const known = new Set(students.map(s => s.id));
  const extra = matrix.filter(m => !known.has(m.student_id)).map(m => m.student_id);
  const { data: extraSt } = extra.length ? await sb.from('students').select('id, full_name').in('id', extra) : { data: [] };
  const all = [...students, ...((extraSt || []) as { id: string; full_name: string }[])];
  const serverNow = nowMs();
  const ph = examPhase(exam, serverNow);

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/denemeler" className="text-sm text-slate-500 hover:underline">← Denemeler</Link>
      <h1 className="text-2xl font-black">{exam.title}</h1>
      <ExamTabs id={id} active="canli" live={ph === 'canli'} />
      <ExamControls id={id} phase={ph} mode={exam.mode} sessions={count || 0} />
      <LiveMonitor examId={id} timing={exam} cfg={exam} keyRows={[...key.values()]} students={all} initial={matrix} serverNow={serverNow} />
    </div>
  );
}

import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStudent } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getExam, getPages } from '@/lib/examData';
import { examPhase, type Letter } from '@/lib/exams';
import { ExamRunner } from '@/components/exams/ExamRunner';

export const metadata: Metadata = { title: 'Deneme çöz' };
export const dynamic = 'force-dynamic';

const nowMs = () => Date.now();

export default async function SolvePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStudent();
  const { id } = await params;
  const sb = await supabaseServer();
  const exam = await getExam(sb, id);
  if (!exam) notFound();
  const { data: ses } = await sb.from('exam_sessions').select('id, deadline, submitted_at, current_q').eq('exam_id', id).eq('student_id', s.studentId).maybeSingle();
  const now = nowMs();
  if (!ses || ses.submitted_at || Date.parse(ses.deadline) < now || examPhase(exam, now) === 'bitti') redirect('/ogrenci/denemeler/' + id);
  // Sayfa adresleri süre bitene kadar (+1 saat) geçerli
  const seconds = Math.max(600, Math.ceil((Date.parse(ses.deadline) - now) / 1000) + 3600);
  const [pages, { data: ans }] = await Promise.all([
    getPages(sb, id, seconds),
    sb.from('exam_answers').select('question_no, answer').eq('session_id', ses.id),
  ]);
  const answers: (Letter | null)[] = Array(exam.question_count).fill(null);
  ((ans || []) as { question_no: number; answer: Letter | null }[]).forEach(a => { if (a.question_no <= exam.question_count) answers[a.question_no - 1] = a.answer; });
  return (
    <ExamRunner examId={id} sessionId={ses.id} title={exam.title} questionCount={exam.question_count} optionCount={exam.option_count}
      deadline={ses.deadline} serverNow={now} pages={pages.map(p => ({ id: p.id, url: p.url }))} initialAnswers={answers} initialQ={ses.current_q || 1} />
  );
}

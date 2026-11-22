import 'server-only';
import { NextRequest } from 'next/server';
import type { Database } from 'sql.js';
import { saveDb } from '@/lib/db/database';
import { loadPdfAnswerSheet, type SheetFallback } from '@/lib/pdfExtraction/answerSheetDb';
import { loadPdfQuestionSolutions } from '@/lib/pdfExamSession';
import { POST as submitStudentExam } from '@/app/api/exam-results/submit-student-exam/route';

export interface ScoredDetail {
  questionNo: number;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  questionText: string | null;
  solutionText: string | null;
  topicName: string | null;
}

export type ScoreOutcome =
  | { ok: true; result: { correctCount: number; wrongCount: number; blankCount: number; netScore: number; totalDurationSeconds: number }; gradedCount: number; questionCount: number; details: ScoredDetail[] }
  | { ok: false; status: number; error: string };

// Bir PDF denemesini PDF'in cevap anahtarıyla puanlar ve sonucu mevcut gönderme akışıyla
// (sonuçlar, yanlış havuzu, konu başarısı, öğretmen paneli) kaydeder. Öğrencinin kendi gönderimi
// de öğretmenin elle girişi de aynı yoldan geçer: net formülü ve anahtar tek yerde.
// `req`, oturum çerezlerini iç isteğe taşımak için kullanılır.
export async function scoreAndStorePdfExam(
  req: NextRequest,
  db: Database,
  o: {
    examId: string;
    studentId: string;
    answers: Record<string, string>;
    durationSeconds: number;
    fallback?: SheetFallback;
    startedAtIso?: string | null;
  }
): Promise<ScoreOutcome> {
  const solutions = loadPdfQuestionSolutions(db, o.examId);
  const sheet = loadPdfAnswerSheet(db, o.examId, o.fallback);
  const keyedNos = Object.keys(sheet.key).map(Number).filter(n => n >= 1 && n <= sheet.questionCount).sort((a, b) => a - b);
  if (keyedNos.length === 0) {
    return {
      ok: false,
      status: 422,
      error: 'Bu deneme için cevap anahtarı bulunamadı; cevaplar puanlanamadı. PDF\'e cevap anahtarı ekleyin (PDF Arşivi → cevap anahtarı) ya da PDF\'ten soru çıkarıp onaylayın.',
    };
  }

  const payload = keyedNos.map(no => {
    const q = sheet.questions[no];
    const sol = solutions[no];
    const studentAnswer = String(o.answers[String(no)] || '').trim().toUpperCase() || null;
    return {
      questionNo: no,
      questionId: q?.id,
      questionText: sol?.questionText || q?.text || `${sheet.title} — Soru ${no}`,
      options: q?.options || undefined,
      studentAnswer,
      correctAnswer: sheet.key[no],
      topicName: sol?.topicName || q?.topicName || undefined,
      solutionExplanation: sol?.solutionText || undefined,
    };
  });

  // Mevcut gönderme uç noktasını aynı istek bağlamında (oturum çerezleriyle) çağır
  const inner = new NextRequest(new URL('/api/exam-results/submit-student-exam', req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body: JSON.stringify({ examId: o.examId, studentId: o.studentId, examTitle: sheet.title, durationSeconds: o.durationSeconds, answers: payload }),
  });
  const res = await submitStudentExam(inner);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return { ok: false, status: 500, error: data?.error || 'Sonuç kaydedilemedi.' };
  }
  if (o.startedAtIso) {
    try {
      db.run('UPDATE exam_results SET started_at = ? WHERE exam_id = ? AND student_id = ?', [o.startedAtIso, o.examId, o.studentId]);
      saveDb();
    } catch {}
  }

  return {
    ok: true,
    result: data.result,
    gradedCount: keyedNos.length,
    questionCount: sheet.questionCount,
    // Sınav bittiği için doğru cevaplar ve çözümler artık gösterilebilir
    details: payload.map(p => ({
      questionNo: p.questionNo,
      studentAnswer: p.studentAnswer,
      correctAnswer: p.correctAnswer,
      isCorrect: p.studentAnswer ? p.studentAnswer === p.correctAnswer : null,
      questionText: solutions[p.questionNo]?.questionText || null,
      solutionText: p.solutionExplanation || null,
      topicName: p.topicName || null,
    })),
  };
}

import 'server-only';
import type { Database } from 'sql.js';

// Öğrencinin bir PDF denemesindeki oturumu: ne zaman başladı, bitirdi mi, süre sınırı ve (bittiyse) sonuçlar.

export interface PdfQuestionSolution {
  questionText: string | null;
  solutionText: string | null;
  topicName: string | null;
}

export interface PdfExamResultDetail {
  questionNo: number;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  questionText: string | null;
  solutionText: string | null;
  topicName: string | null;
}

export interface PdfExamSessionState {
  startedAt: string | null;    // ISO (UTC)
  submittedAt: string | null;  // ISO (UTC)
  durationMin: number;         // 0 = süre sınırı yok
  serverNow: string;           // istemci saat farkını düzeltmek için
  result: { correctCount: number; wrongCount: number; blankCount: number; netScore: number; totalDurationSeconds: number } | null;
  details: PdfExamResultDetail[];
}

// SQLite datetime('now') 'YYYY-MM-DD HH:MM:SS' (UTC) döner; ISO biçimine çevir.
export function sqliteToIso(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) return new Date(s).toISOString();
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function one<T>(db: Database, sql: string, params: (string | number | null)[]): T | null {
  const st = db.prepare(sql);
  st.bind(params);
  const row = st.step() ? (st.getAsObject() as T) : null;
  st.free();
  return row;
}

export function loadPdfQuestionSolutions(db: Database, pdfId: string): Record<number, PdfQuestionSolution> {
  const out: Record<number, PdfQuestionSolution> = {};
  try {
    const st = db.prepare('SELECT question_no, question_text, solution_text, topic_name FROM pdf_question_solutions WHERE pdf_id = ?');
    st.bind([pdfId]);
    while (st.step()) {
      const r = st.getAsObject() as { question_no: number; question_text: string | null; solution_text: string | null; topic_name: string | null };
      out[Number(r.question_no)] = { questionText: r.question_text, solutionText: r.solution_text, topicName: r.topic_name };
    }
    st.free();
  } catch {
    // Tablo henüz yoksa çözüm gösterilmez
  }
  return out;
}

// Atama yoksa ya da süre girilmemişse eski davranış: 60 dakika. 0 = süresiz.
export function assignmentDurationMin(db: Database, examId: string, studentId: string): number {
  const a = one<{ duration_min: number | null }>(db, 'SELECT duration_min FROM exam_assignments WHERE exam_id = ? AND student_id = ?', [examId, studentId]);
  if (!a || a.duration_min === null || a.duration_min === undefined) return 60;
  return Math.max(0, Number(a.duration_min) || 0);
}

export function getPdfExamSessionState(db: Database, examId: string, studentId: string): PdfExamSessionState {
  const sess = one<{ started_at: string | null; submitted_at: string | null }>(
    db, 'SELECT started_at, submitted_at FROM exam_sessions WHERE exam_id = ? AND student_id = ?', [examId, studentId]);
  const state: PdfExamSessionState = {
    startedAt: sqliteToIso(sess?.started_at),
    submittedAt: sqliteToIso(sess?.submitted_at),
    durationMin: assignmentDurationMin(db, examId, studentId),
    serverNow: new Date().toISOString(),
    result: null,
    details: [],
  };

  const res = one<{ id: string; correct_count: number; wrong_count: number; blank_count: number; net_score: number; total_duration_seconds: number }>(
    db, 'SELECT id, correct_count, wrong_count, blank_count, net_score, total_duration_seconds FROM exam_results WHERE exam_id = ? AND student_id = ? ORDER BY COALESCE(completed_at, created_at) DESC LIMIT 1',
    [examId, studentId]);
  if (!res || !state.submittedAt) return state;

  state.result = {
    correctCount: Number(res.correct_count) || 0,
    wrongCount: Number(res.wrong_count) || 0,
    blankCount: Number(res.blank_count) || 0,
    netScore: Number(res.net_score) || 0,
    totalDurationSeconds: Number(res.total_duration_seconds) || 0,
  };

  const sols = loadPdfQuestionSolutions(db, examId);
  const st = db.prepare('SELECT question_no, student_answer, correct_answer, is_correct, question_text, topic_name, solution_explanation FROM exam_answers WHERE exam_result_id = ? ORDER BY question_no');
  st.bind([res.id]);
  while (st.step()) {
    const r = st.getAsObject() as { question_no: number; student_answer: string | null; correct_answer: string; is_correct: number | null; question_text: string | null; topic_name: string | null; solution_explanation: string | null };
    const no = Number(r.question_no);
    const sol = sols[no];
    state.details.push({
      questionNo: no,
      studentAnswer: r.student_answer || null,
      correctAnswer: r.correct_answer,
      isCorrect: r.is_correct === null || r.is_correct === undefined ? null : Number(r.is_correct) === 1,
      questionText: sol?.questionText ?? r.question_text ?? null,
      solutionText: sol?.solutionText ?? (r.solution_explanation || null),
      topicName: sol?.topicName ?? r.topic_name ?? null,
    });
  }
  st.free();
  return state;
}

// İlk açılışta başlangıç anını sunucuda kaydeder; sayfa yenilense de süre sıfırlanmaz.
export function startPdfExamSession(db: Database, examId: string, studentId: string): void {
  const sess = one<{ id: string; started_at: string | null }>(db, 'SELECT id, started_at FROM exam_sessions WHERE exam_id = ? AND student_id = ?', [examId, studentId]);
  if (!sess) {
    db.run(
      "INSERT INTO exam_sessions (id, exam_id, student_id, started_at, current_q) VALUES (?, ?, ?, datetime('now'), 1)",
      [`sess_${examId}_${studentId}`, examId, studentId]
    );
  } else if (!sess.started_at) {
    db.run("UPDATE exam_sessions SET started_at = datetime('now') WHERE id = ?", [sess.id]);
  }
  try {
    db.run("UPDATE exam_assignments SET status = 'in_progress' WHERE exam_id = ? AND student_id = ? AND status = 'assigned'", [examId, studentId]);
  } catch {}
}

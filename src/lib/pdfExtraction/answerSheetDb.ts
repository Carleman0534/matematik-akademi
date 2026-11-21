import 'server-only';
import type { Database } from 'sql.js';
import { resolveAnswerSheet, type AnswerSheet, type ExtractedAnswer } from './answerSheet.ts';

export interface PdfSheetInfo extends AnswerSheet {
  found: boolean;
  title: string;
  questions: Record<number, { id: string; text: string; topicName: string | null; options: Record<string, string> | null }>;
}

// İstemciden gelebilecek yedek bilgi (sunucusuz ortamda PDF kaydı bu örnekte yoksa)
export interface SheetFallback {
  title?: string;
  answerKey?: string;
  questionCount?: number;
  gradeLevel?: string;
}

export function loadPdfAnswerSheet(db: Database, pdfId: string, fallback?: SheetFallback): PdfSheetInfo {
  const dStmt = db.prepare('SELECT title, answer_key, question_count, grade_level FROM pdf_documents WHERE id = ?');
  dStmt.bind([pdfId]);
  const doc = dStmt.step() ? (dStmt.getAsObject() as { title: string; answer_key: string | null; question_count: number | null; grade_level: string | null }) : null;
  dStmt.free();

  const extracted: ExtractedAnswer[] = [];
  const questions: PdfSheetInfo['questions'] = {};
  const qStmt = db.prepare(`
    SELECT q.id, q.question_no, q.correct_answer, q.approval_status, q.question_text, q.options_json, t.name AS topic_name
    FROM pdf_extracted_questions q
    LEFT JOIN curriculum_topics t ON t.id = q.primary_topic_id
    WHERE q.pdf_id = ?
    ORDER BY q.question_no
  `);
  qStmt.bind([pdfId]);
  while (qStmt.step()) {
    const r = qStmt.getAsObject() as { id: string; question_no: number; correct_answer: string | null; approval_status: string; question_text: string; options_json: string; topic_name: string | null };
    extracted.push({ questionNo: Number(r.question_no), correctAnswer: r.correct_answer, approvalStatus: r.approval_status });
    let options: Record<string, string> | null = null;
    try { options = JSON.parse(r.options_json || 'null'); } catch {}
    questions[Number(r.question_no)] = { id: r.id, text: r.question_text || '', topicName: r.topic_name, options };
  }
  qStmt.free();

  let sheet = resolveAnswerSheet({
    extracted,
    answerKeyRaw: doc?.answer_key,
    storedQuestionCount: doc?.question_count,
    gradeLevel: doc?.grade_level,
  });
  // Sunucu kaydında anahtar yoksa istemcinin yedek bilgisi denenir
  if (sheet.keySource === 'none' && fallback) {
    const fb = resolveAnswerSheet({
      extracted: [],
      answerKeyRaw: fallback.answerKey,
      storedQuestionCount: fallback.questionCount ?? doc?.question_count,
      gradeLevel: fallback.gradeLevel ?? doc?.grade_level,
    });
    if (fb.keySource !== 'none' || !doc) sheet = fb;
  }

  return { ...sheet, found: Boolean(doc), title: doc?.title || fallback?.title || 'PDF Denemesi', questions };
}

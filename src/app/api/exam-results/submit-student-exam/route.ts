import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';

interface AnswerPayload {
  questionNo: number;
  questionId?: string;
  questionText: string;
  options?: any;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect?: boolean;
  topicName?: string;
  solutionExplanation?: string;
  difficulty?: number;
}

interface SubmitRequest {
  examId: string;
  studentId?: string;
  examTitle?: string;
  durationSeconds?: number;
  answers: AnswerPayload[];
}

function ensureStudentExists(db: any, studentId: string) {
  try {
    const sCheck = db.exec(`SELECT id FROM students WHERE id = '${studentId}' LIMIT 1`);
    if (!sCheck.length || !sCheck[0].values.length) {
      try {
        db.run(
          `INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, 'student')`,
          [
            studentId,
            studentId.includes('muhammed') ? 'Muhammed Talha' : 'Ali Metin (Ali Tarlasüren)',
            `${studentId}@matematikakademi.internal`
          ]
        );
      } catch {}
      db.run(
        `INSERT OR IGNORE INTO students (id, user_id, grade, school, status) VALUES (?, ?, '8', 'LGS Hazırlık Sınıfı', 'active')`,
        [studentId, studentId]
      );
    }
  } catch (err) {
    console.error('ensureStudentExists error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: SubmitRequest = await req.json();
    const { examId, examTitle, durationSeconds = 1200, answers = [] } = body;

    if (!examId) {
      return NextResponse.json({ error: 'Sınav ID zorunludur.' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Öğrenci ID'sini çözümle
    let targetStudentId = body.studentId;
    if (!targetStudentId || targetStudentId === 'null' || targetStudentId === 'undefined') {
      // Çerez veya varsayılan aktif öğrenci
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/studentId=([^;]+)/);
      targetStudentId = match ? match[1] : 'student_ali_metin';
    }

    // Hedef öğrencinin veritabanında var olduğundan emin ol
    ensureStudentExists(db, targetStudentId);

    // Eğer öğrenci 'f9c13771-f97f-42ea-aa59-e35098bec387' veya 'student_muhammed_talha' ise ikisini de güvenceye al
    if (targetStudentId === 'f9c13771-f97f-42ea-aa59-e35098bec387') {
      ensureStudentExists(db, 'student_muhammed_talha');
    }

    // 2. Sınav kaydını (exams) oluştur / güncelle
    const totalQCount = Math.max(1, answers.length);
    const durationMin = Math.max(10, Math.round(durationSeconds / 60));
    const title = examTitle || 'LGS Matematik Deneme Sınavı';

    try {
      db.run(
        `INSERT INTO exams (id, title, teacher_id, question_count, duration_minutes, status, created_at)
         VALUES (?, ?, 'teacher_default', ?, ?, 'active', datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           title = COALESCE(excluded.title, exams.title),
           question_count = COALESCE(excluded.question_count, exams.question_count),
           status = 'active'`,
        [examId, title, totalQCount, durationMin]
      );
    } catch (e) {
      console.warn('Exams upsert notice:', e);
    }

    // 3. Sınav Oturumunu (exam_sessions) güncelle
    const sessionId = `sess_${examId}_${targetStudentId}`;
    try {
      db.run(
        `INSERT INTO exam_sessions (id, exam_id, student_id, started_at, deadline, submitted_at, current_q)
         VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?)
         ON CONFLICT(exam_id, student_id) DO UPDATE SET
           submitted_at = datetime('now'),
           current_q = excluded.current_q`,
        [sessionId, examId, targetStudentId, totalQCount]
      );
    } catch (e) {
      console.warn('Session upsert notice:', e);
    }

    // 4. Doğru / Yanlış / Boş ve Net Hesabı
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (const a of answers) {
      const sAns = (a.studentAnswer || '').trim().toUpperCase();
      const cAns = (a.correctAnswer || '').trim().toUpperCase();
      if (!sAns) {
        blankCount++;
      } else if (sAns === cAns) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const netScore = Math.max(0, parseFloat((correctCount - wrongCount / 3).toFixed(2)));

    // 5. Atama Durumunu (exam_assignments) 'completed' yap
    try {
      db.run(
        `INSERT INTO exam_assignments (id, exam_id, student_id, assigned_by, status, duration_min, assigned_at, due_at)
         VALUES (?, ?, ?, 'system', 'completed', ?, datetime('now'), datetime('now'))
         ON CONFLICT(exam_id, student_id) DO UPDATE SET
           status = 'completed'`,
        [`assign_${examId}_${targetStudentId}`, examId, targetStudentId, durationMin]
      );
    } catch (e) {
      console.warn('Assignments upsert notice:', e);
    }

    // 6. Sınav Sonuç Tablosu (exam_results)
    const resultId = `result_${examId}_${targetStudentId}`;
    try {
      db.run(
        `INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, total_duration_seconds, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [resultId, examId, targetStudentId, correctCount, wrongCount, blankCount, netScore, durationSeconds]
      );
    } catch (e) {
      console.warn('Results upsert notice:', e);
    }

    // 7. Soru Detaylarını Kaydet (exam_answers)
    try {
      db.run(`DELETE FROM exam_answers WHERE session_id = ? OR exam_result_id = ?`, [sessionId, resultId]);
    } catch {}

    for (const a of answers) {
      const ansId = `ans_${resultId}_${a.questionNo}`;
      const sAns = (a.studentAnswer || '').trim().toUpperCase() || null;
      const cAns = (a.correctAnswer || '').trim().toUpperCase();
      const isCorr = sAns ? (sAns === cAns ? 1 : 0) : null;
      const optionsStr = typeof a.options === 'string' ? a.options : JSON.stringify(a.options || {});

      try {
        db.run(
          `INSERT INTO exam_answers (
            id, session_id, exam_result_id, question_no, student_answer, answer, is_correct,
            question_text, options_json, correct_answer, topic_name, solution_explanation, duration_seconds
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ansId,
            sessionId,
            resultId,
            a.questionNo,
            sAns,
            sAns,
            isCorr,
            a.questionText || '',
            optionsStr,
            cAns,
            a.topicName || 'LGS Matematik',
            a.solutionExplanation || '',
            Math.max(10, Math.round(durationSeconds / totalQCount))
          ]
        );
      } catch (ansErr) {
        console.warn('Error inserting exam answer:', ansErr);
      }

      // Yanlış veya Boş soruları öğrencinin akıllı yanlış havuzuna (questions tablosu) ekle
      if (isCorr === 0 || isCorr === null) {
        const qMistakeId = `wrong_${targetStudentId}_${examId}_q${a.questionNo}`;
        try {
          db.run(
            `INSERT OR REPLACE INTO questions (
              id, student_id, question_number, difficulty, question_type,
              correct_answer, student_answer, solution, teacher_note, student_note, learning_status, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now')
            )`,
            [
              qMistakeId,
              targetStudentId,
              a.questionNo,
              a.difficulty ? (a.difficulty <= 2 ? 'easy' : a.difficulty >= 4 ? 'hard' : 'medium') : 'medium',
              isCorr === 0 ? 'wrong' : 'blank',
              cAns,
              sAns,
              a.solutionExplanation || 'Ayrıntılı LGS soru çözümü hazırlandı.',
              `Deneme Sınavı: ${title}`,
              a.questionText || ''
            ]
          );
        } catch (qErr) {
          console.warn('Could not insert question mistake pool:', qErr);
        }
      }
    }

    // 8. Konu Başarı Analizlerini (student_topic_performance) Güncelle
    const topicStats: Record<string, { total: number; correct: number; wrong: number; blank: number }> = {};
    for (const a of answers) {
      const top = a.topicName || 'LGS Matematik';
      if (!topicStats[top]) topicStats[top] = { total: 0, correct: 0, wrong: 0, blank: 0 };
      topicStats[top].total++;
      const sAns = (a.studentAnswer || '').trim().toUpperCase();
      const cAns = (a.correctAnswer || '').trim().toUpperCase();
      if (!sAns) topicStats[top].blank++;
      else if (sAns === cAns) topicStats[top].correct++;
      else topicStats[top].wrong++;
    }

    for (const [topicName, stat] of Object.entries(topicStats)) {
      const masteryScore = Math.round((stat.correct / stat.total) * 100);
      const status = masteryScore >= 80 ? 'mastered' : masteryScore >= 60 ? 'good' : masteryScore >= 40 ? 'review_needed' : 'critical';
      const cleanTopic = topicName.replace(/[^a-zA-Z0-9_\u00C0-\u017F]/g, '_').toLowerCase();
      const perfId = `perf_${targetStudentId}_${cleanTopic}`;

      try {
        db.run(
          `INSERT INTO student_topic_performance (id, student_id, topic_name, mastery_score, solved_count, correct_count, wrong_count, status, last_activity_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             mastery_score = excluded.mastery_score,
             solved_count = student_topic_performance.solved_count + excluded.solved_count,
             correct_count = student_topic_performance.correct_count + excluded.correct_count,
             wrong_count = student_topic_performance.wrong_count + excluded.wrong_count,
             status = excluded.status,
             last_activity_at = datetime('now')`,
          [perfId, targetStudentId, topicName, masteryScore, stat.total, stat.correct, stat.wrong, status]
        );
      } catch (topErr) {
        console.warn('Error updating topic performance:', topErr);
      }
    }

    // 9. Değişiklikleri Dosyaya Yaz
    saveDb();

    return NextResponse.json({
      success: true,
      result: {
        examId,
        studentId: targetStudentId,
        correctCount,
        wrongCount,
        blankCount,
        netScore,
        totalDurationSeconds: durationSeconds
      }
    });
  } catch (error: any) {
    console.error('submit-student-exam error:', error);
    return NextResponse.json({ error: error.message || 'Sınav kaydedilemedi.' }, { status: 500 });
  }
}

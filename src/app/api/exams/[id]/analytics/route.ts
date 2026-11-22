import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

interface ExamRecord {
  id: string;
  title: string;
  question_count?: number;
  penalty_divisor?: number;
  file_path?: string;
  page_count?: number;
}

interface StudentResultRow {
  session_id: string;
  student_id: string;
  started_at: string;
  deadline: string;
  submitted_at: string | null;
  last_seen_at: string;
  student_name: string;
  correct_count: number | null;
  wrong_count: number | null;
  blank_count: number | null;
  net_score: number | null;
  time_spent?: string;
}

interface QuestionStatItem {
  question_no: number;
  correct_answer: string;
  topic_id: string | null;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  correct_rate: number;
  wrong_rate: number;
  blank_rate: number;
  most_common_wrong: string;
  is_defect_warning: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const db = await getDb();

    // 1. Deneme veya PDF doküman temel bilgileri
    let exam: ExamRecord | null = null;
    const eStmt = db.prepare('SELECT * FROM exams WHERE id = ?');
    eStmt.bind([examId]);
    if (eStmt.step()) {
      exam = eStmt.getAsObject() as unknown as ExamRecord;
    }
    eStmt.free();

    if (!exam) {
      const pStmt = db.prepare('SELECT * FROM pdf_documents WHERE id = ?');
      pStmt.bind([examId]);
      if (pStmt.step()) {
        exam = pStmt.getAsObject() as unknown as ExamRecord;
      }
      pStmt.free();
    }

    if (!exam) {
      return NextResponse.json({ error: 'Deneme bulunamadı.' }, { status: 404 });
    }

    // 2. Cevap Anahtarı
    const keyStmt = db.prepare('SELECT question_no, correct, topic_id FROM exam_key WHERE exam_id = ? ORDER BY question_no');
    keyStmt.bind([examId]);
    const answerKey = new Map<number, { correct: string; topic_id?: string }>();
    while (keyStmt.step()) {
      const row = keyStmt.getAsObject() as unknown as { question_no: number; correct: string; topic_id?: string };
      answerKey.set(row.question_no, { correct: row.correct, topic_id: row.topic_id });
    }
    keyStmt.free();

    // 3. Katılan Öğrenciler ve Oturumlar
    const sStmt = db.prepare(`
      SELECT 
        es.id as session_id,
        es.student_id,
        es.started_at,
        es.deadline,
        es.submitted_at,
        es.last_seen_at,
        COALESCE(u.name, 'Öğrenci') as student_name,
        er.correct_count,
        er.wrong_count,
        er.blank_count,
        er.net_score
      FROM exam_sessions es
      LEFT JOIN students st ON st.id = es.student_id
      LEFT JOIN users u ON u.id = st.user_id
      LEFT JOIN exam_results er ON er.exam_id = es.exam_id AND er.student_id = es.student_id
      WHERE es.exam_id = ?
      ORDER BY er.net_score DESC, er.correct_count DESC
    `);
    sStmt.bind([examId]);

    const studentResults: StudentResultRow[] = [];
    const sessionIds: string[] = [];
    while (sStmt.step()) {
      const row = sStmt.getAsObject() as unknown as StudentResultRow;
      studentResults.push(row);
      sessionIds.push(row.session_id);
    }
    sStmt.free();

    // 4. Öğrencilerin her soruya verdikleri cevaplar
    const allAnswers: { session_id: string; question_no: number; answer: string }[] = [];
    if (sessionIds.length > 0) {
      const ansStmt = db.prepare(`
        SELECT session_id, question_no, answer 
        FROM exam_answers 
        WHERE session_id IN (${sessionIds.map(() => '?').join(',')})
      `);
      ansStmt.bind(sessionIds);
      while (ansStmt.step()) {
        allAnswers.push(ansStmt.getAsObject() as unknown as { session_id: string; question_no: number; answer: string });
      }
      ansStmt.free();
    }

    // 5. Soru Bazlı İstatistiklerin Hesaplanması
    const questionCount = exam.question_count || 40;
    const totalStudents = studentResults.length;
    const pct = (n: number) => (totalStudents > 0 ? Math.round((n / totalStudents) * 100) : 0);
    const questionStats: QuestionStatItem[] = [];

    for (let q = 1; q <= questionCount; q++) {
      const qKey = answerKey.get(q);
      const correctAns = qKey?.correct || '';

      let correctCount = 0;
      let wrongCount = 0;
      let blankCount = 0;
      const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

      {
        for (const st of studentResults) {
          const studentAnsObj = allAnswers.find(a => a.session_id === st.session_id && a.question_no === q);
          const ans = studentAnsObj?.answer;

          if (!ans) {
            blankCount++;
          } else {
            if (optionCounts[ans] !== undefined) optionCounts[ans]++;
            if (correctAns && ans === correctAns) {
              correctCount++;
            } else {
              wrongCount++;
            }
          }
        }
      }

      let mostCommonWrong = '';
      let maxWrongCount = 0;
      for (const [opt, count] of Object.entries(optionCounts)) {
        if (opt !== correctAns && count > maxWrongCount) {
          mostCommonWrong = opt;
          maxWrongCount = count;
        }
      }

      const correctRate = pct(correctCount);
      const wrongRate = pct(wrongCount);
      const blankRate = pct(blankCount);
      const isDefectWarning = totalStudents > 0 && correctRate <= 15;

      questionStats.push({
        question_no: q,
        correct_answer: correctAns,
        topic_id: qKey?.topic_id || null,
        correct_count: correctCount,
        wrong_count: wrongCount,
        blank_count: blankCount,
        correct_rate: correctRate,
        wrong_rate: wrongRate,
        blank_rate: blankRate,
        most_common_wrong: mostCommonWrong,
        is_defect_warning: isDefectWarning,
      });
    }

    // 6. Genel Özet Metrikleri
    const submittedCount = studentResults.filter(s => !!s.submitted_at).length;
    const nets = studentResults.filter(s => s.net_score !== null).map(s => Number(s.net_score));
    const highestNet = nets.length > 0 ? Math.max(...nets) : 0;
    const lowestNet = nets.length > 0 ? Math.min(...nets) : 0;
    const avgNet = nets.length > 0 ? parseFloat((nets.reduce((a, b) => a + b, 0) / nets.length).toFixed(2)) : 0;
    const participationRate = pct(submittedCount);

    return NextResponse.json({
      exam,
      summary: {
        totalStudents,
        submittedCount,
        participationRate,
        highestNet,
        lowestNet,
        avgNet,
      },
      studentResults,
      questionStats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Analytics error:', msg);
    return NextResponse.json({ error: 'Deneme analizleri alınamadı: ' + msg }, { status: 500 });
  }
}

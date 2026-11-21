import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const studentId = searchParams.get('studentId');

    if (!examId) {
      return NextResponse.json({ error: 'examId parametresi zorunludur.' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Sınav ve Sonuç Bilgilerini Çek
    let examInfo: any = null;
    let studentClause = '';
    if (studentId) {
      const isTalha = studentId.includes('talha');
      const isAli = studentId.includes('ali');
      if (isTalha) {
        studentClause = ` AND (er.student_id = '${studentId}' OR er.student_id = 'student_muhammed_talha')`;
      } else if (isAli) {
        studentClause = ` AND (er.student_id = '${studentId}' OR er.student_id = 'student_ali_metin' OR er.student_id = 'user_ali_metin')`;
      } else {
        studentClause = ` AND er.student_id = '${studentId}'`;
      }
    }

    const resQuery = `
      SELECT 
        er.id as result_id,
        er.exam_id,
        er.student_id,
        er.correct_count,
        er.wrong_count,
        er.blank_count,
        er.net_score,
        er.total_duration_seconds,
        COALESCE(er.completed_at, er.created_at) as completed_at,
        COALESCE(e.title, 'LGS Matematik Denemesi') as title,
        COALESCE(e.question_count, 20) as question_count,
        COALESCE(e.duration_minutes, 40) as duration_minutes,
        u.name as student_name
      FROM exam_results er
      LEFT JOIN exams e ON e.id = er.exam_id
      LEFT JOIN users u ON u.id = er.student_id
      WHERE er.exam_id = '${examId}' ${studentClause}
      ORDER BY er.created_at DESC
      LIMIT 1
    `;

    const resResult = db.exec(resQuery);
    if (resResult.length > 0 && resResult[0].values.length > 0) {
      const cols = resResult[0].columns;
      examInfo = {};
      cols.forEach((c, idx) => { examInfo[c] = resResult[0].values[0][idx]; });
    } else {
      // Eğer exam_results'ta yoksa exams tablosundan kontrol et
      const eRes = db.exec(`SELECT id as exam_id, title, question_count, duration_minutes FROM exams WHERE id = '${examId}' LIMIT 1`);
      if (eRes.length > 0 && eRes[0].values.length > 0) {
        examInfo = {
          exam_id: eRes[0].values[0][0],
          title: eRes[0].values[0][1],
          question_count: eRes[0].values[0][2],
          duration_minutes: eRes[0].values[0][3],
          student_id: studentId || '',
          net_score: null,
          correct_count: null,
          wrong_count: null,
          blank_count: null
        };
      }
    }

    // 2. Soru ve Cevap Detaylarını Çek (exam_answers)
    const questions: any[] = [];
    const answersQuery = `
      SELECT 
        ea.id,
        ea.session_id,
        ea.exam_result_id,
        ea.question_no,
        ea.student_answer,
        ea.is_correct,
        ea.duration_seconds,
        ea.question_text,
        ea.options_json,
        ea.correct_answer,
        ea.topic_name,
        ea.solution_explanation,
        ea.ai_analysis
      FROM exam_answers ea
      WHERE (
        ${examInfo?.result_id ? `ea.exam_result_id = '${examInfo.result_id}' OR ` : ''}
        (ea.session_id LIKE 'sess_${examId}%' ${studentId ? `AND ea.session_id LIKE '%${studentId}%'` : ''})
        OR (ea.exam_result_id LIKE 'result_${examId}%' ${studentId ? `AND ea.exam_result_id LIKE '%${studentId}%'` : ''})
      )
      ORDER BY ea.question_no ASC
    `;

    const aRes = db.exec(answersQuery);
    if (aRes.length > 0 && aRes[0].values.length > 0) {
      const cols = aRes[0].columns;
      for (const row of aRes[0].values) {
        const item: any = {};
        cols.forEach((c, idx) => { item[c] = row[idx]; });
        
        let parsedOptions: any = {};
        try {
          if (item.options_json) {
            parsedOptions = JSON.parse(item.options_json);
          }
        } catch {
          parsedOptions = item.options_json;
        }

        questions.push({
          id: item.id,
          questionNo: item.question_no,
          questionText: item.question_text,
          options: parsedOptions,
          studentAnswer: item.student_answer,
          correctAnswer: item.correct_answer,
          isCorrect: Boolean(item.is_correct),
          isBlank: !item.student_answer,
          topicName: item.topic_name || 'LGS Matematik',
          solutionExplanation: item.solution_explanation || '',
          aiAnalysis: item.ai_analysis || null,
          durationSeconds: item.duration_seconds
        });
      }
    }

    return NextResponse.json({
      success: true,
      exam: examInfo,
      questions
    });
  } catch (error: any) {
    console.error('student-exam-detail error:', error);
    return NextResponse.json({ error: error.message || 'Detaylar yüklenemedi.' }, { status: 500 });
  }
}

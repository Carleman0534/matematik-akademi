import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

// LIKE desenindeki özel karakterleri (% _ \) kaçırır: kimlikler joker olarak yorumlanmasın
const likeEsc = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 });
    // Öğretmen istediği öğrenciyi, öğrenci yalnızca kendi sonucunu görür (veli bu uç noktayı kullanmaz)
    if (session.role !== 'teacher' && session.role !== 'student') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const requested = searchParams.get('studentId');
    const studentId = session.role === 'student' ? session.studentId : requested;
    if (session.role === 'student' && (!studentId || (requested && requested !== studentId))) {
      return NextResponse.json({ error: 'Yalnızca kendi sonuçlarınızı görebilirsiniz.' }, { status: 403 });
    }

    if (!examId) {
      return NextResponse.json({ error: 'examId parametresi zorunludur.' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Sınav ve Sonuç Bilgilerini Çek
    let examInfo: any = null;
    const resParams: (string | number)[] = [examId];
    let studentClause = '';
    if (studentId) {
      studentClause = ' AND er.student_id = ?';
      resParams.push(studentId);
    }

    const resResult = db.exec(`
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
        COALESCE(e.title, p.title, 'Deneme') as title,
        COALESCE(p.question_count, e.question_count, er.correct_count + er.wrong_count + er.blank_count) as question_count,
        COALESCE(e.duration_minutes, 0) as duration_minutes,
        u.name as student_name
      FROM exam_results er
      LEFT JOIN exams e ON e.id = er.exam_id
      LEFT JOIN pdf_documents p ON p.id = er.exam_id
      LEFT JOIN students st ON st.id = er.student_id
      LEFT JOIN users u ON u.id = st.user_id
      WHERE er.exam_id = ? ${studentClause}
      ORDER BY er.created_at DESC
      LIMIT 1
    `, resParams);
    if (resResult.length > 0 && resResult[0].values.length > 0) {
      const cols = resResult[0].columns;
      examInfo = {};
      cols.forEach((c, idx) => { examInfo[c] = resResult[0].values[0][idx]; });
    } else {
      // exam_results'ta yoksa deneme kaydından temel bilgileri al
      const eRes = db.exec(
        `SELECT id AS exam_id, title, question_count, duration_minutes FROM exams WHERE id = ?
         UNION ALL
         SELECT id, title, question_count, 0 FROM pdf_documents WHERE id = ?
         LIMIT 1`,
        [examId, examId]
      );
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
    const ansParams: string[] = [];
    const conds: string[] = [];
    if (examInfo?.result_id) {
      conds.push('ea.exam_result_id = ?');
      ansParams.push(String(examInfo.result_id));
    }
    conds.push(`(ea.session_id LIKE ? ESCAPE '\\'${studentId ? ` AND ea.session_id LIKE ? ESCAPE '\\'` : ''})`);
    ansParams.push(`sess_${likeEsc(examId)}%`);
    if (studentId) ansParams.push(`%${likeEsc(studentId)}%`);
    conds.push(`(ea.exam_result_id LIKE ? ESCAPE '\\'${studentId ? ` AND ea.exam_result_id LIKE ? ESCAPE '\\'` : ''})`);
    ansParams.push(`result_${likeEsc(examId)}%`);
    if (studentId) ansParams.push(`%${likeEsc(studentId)}%`);

    const aRes = db.exec(`
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
      WHERE (${conds.join(' OR ')})
      ORDER BY ea.question_no ASC
    `, ansParams);
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

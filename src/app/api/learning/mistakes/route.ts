import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';
import { MISTAKE_ERROR_CATEGORIES, estimateMistakeReason, type MistakeCategoryKey } from '@/lib/learning/diagnosticEngine';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetStudentId = searchParams.get('studentId') || session.studentId;

    if (!targetStudentId) {
      return NextResponse.json({ error: 'Öğrenci ID belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    const res = db.exec(`
      SELECT m.*, t.name as topic_name, st.name as subtopic_name
      FROM smart_mistake_analyses m
      LEFT JOIN curriculum_topics t ON m.topic_id = t.id
      LEFT JOIN curriculum_topics st ON m.subtopic_id = st.id
      WHERE m.student_id = '${targetStudentId}'
      ORDER BY m.created_at DESC
    `);

    const mistakes: any[] = [];
    const categoryStats: Record<string, number> = {};

    Object.keys(MISTAKE_ERROR_CATEGORIES).forEach(k => { categoryStats[k] = 0; });

    if (res.length > 0) {
      const cols = res[0].columns;
      for (const row of res[0].values) {
        const obj: any = {};
        cols.forEach((c, idx) => { obj[c] = row[idx]; });
        
        const catKey = obj.primary_error_type as MistakeCategoryKey;
        const catMeta = MISTAKE_ERROR_CATEGORIES[catKey] || {
          title: obj.primary_error_type,
          pedagogicalAdvice: ''
        };

        if (categoryStats[catKey] !== undefined) {
          categoryStats[catKey]++;
        } else {
          categoryStats[catKey] = 1;
        }

        mistakes.push({
          id: obj.id,
          questionId: obj.question_id,
          topicName: obj.topic_name || 'Genel Matematik',
          subtopicName: obj.subtopic_name,
          studentAnswer: obj.student_answer,
          correctAnswer: obj.correct_answer,
          primaryErrorType: obj.primary_error_type,
          errorTitle: catMeta.title,
          pedagogicalAdvice: catMeta.pedagogicalAdvice,
          aiProbability: obj.ai_probability,
          aiReasoning: obj.ai_reasoning_explanation,
          verifiedByTeacher: obj.verified_by_teacher === 1,
          verifiedByStudent: obj.verified_by_student === 1,
          teacherNote: obj.teacher_note,
          createdAt: obj.created_at
        });
      }
    }

    // Eğer smart_mistake_analyses'de henüz kayıt yoksa questions tablosundaki yanlışları getir
    if (mistakes.length === 0) {
      try {
        const qRes = db.exec(`
          SELECT q.id, q.question_number, q.student_answer, q.correct_answer, q.teacher_note, q.student_note, q.created_at
          FROM questions q
          WHERE (q.student_id = '${targetStudentId}' OR (('${targetStudentId}'.indexOf('talha') >= 0) AND q.student_id = 'student_muhammed_talha'))
          AND q.question_type = 'wrong'
          ORDER BY q.created_at DESC
        `);
        if (qRes.length > 0) {
          const qCols = qRes[0].columns;
          for (const row of qRes[0].values) {
            const qObj: any = {};
            qCols.forEach((c, idx) => { qObj[c] = row[idx]; });
            mistakes.push({
              id: qObj.id,
              questionId: qObj.id,
              topicName: qObj.teacher_note ? qObj.teacher_note.replace('Deneme Sınavı: ', '') : 'LGS Matematik',
              studentAnswer: qObj.student_answer || '-',
              correctAnswer: qObj.correct_answer || 'A',
              primaryErrorType: 'dikkat_eksikligi',
              errorTitle: 'Dikkat Eksikliği / İşlem Hatası',
              pedagogicalAdvice: 'Soru kökünü ve işlem adımlarını dikkatle kontrol ediniz.',
              verifiedByTeacher: false,
              teacherNote: qObj.teacher_note,
              createdAt: qObj.created_at
            });
            categoryStats['dikkat_eksikligi'] = (categoryStats['dikkat_eksikligi'] || 0) + 1;
          }
        }
      } catch {}
    }

    return NextResponse.json({
      mistakes,
      categoryStats,
      categoriesMeta: MISTAKE_ERROR_CATEGORIES
    });
  } catch (error: any) {
    console.error('Error fetching mistakes:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const body = await req.json();
    const { studentId, questionId, studentAnswer, correctAnswer, durationSeconds, questionType, topicId, topicTitle } = body;

    const analysis = estimateMistakeReason({
      studentAnswer,
      correctAnswer,
      durationSeconds: durationSeconds || 45,
      questionType: questionType || 'yeni_nesil',
      topicTitle: topicTitle || 'Matematik'
    });

    const db = await getDb();
    const id = 'm-' + Date.now();

    db.run(`
      INSERT INTO smart_mistake_analyses (
        id, student_id, question_id, topic_id, student_answer, correct_answer,
        primary_error_type, ai_probability, ai_reasoning_explanation, verified_by_teacher, verified_by_student
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `, [
      id, studentId || session.studentId, questionId, topicId || null, studentAnswer, correctAnswer,
      analysis.primaryCategory, analysis.probability, analysis.explanation
    ]);

    await saveDb();

    return NextResponse.json({
      success: true,
      id,
      analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Analiz kaydedilemedi' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });

    const body = await req.json();
    const { mistakeId, verifiedErrorType, teacherNote } = body;

    const db = await getDb();
    const isTeacher = session.role === 'teacher';

    if (verifiedErrorType) {
      db.run(`
        UPDATE smart_mistake_analyses 
        SET primary_error_type = ?, 
            verified_by_teacher = ?, 
            verified_by_student = ?,
            teacher_note = COALESCE(?, teacher_note)
        WHERE id = ?
      `, [
        verifiedErrorType,
        isTeacher ? 1 : 0,
        isTeacher ? 0 : 1,
        teacherNote || null,
        mistakeId
      ]);
    } else if (isTeacher && teacherNote !== undefined) {
      db.run(`UPDATE smart_mistake_analyses SET teacher_note = ?, verified_by_teacher = 1 WHERE id = ?`, [teacherNote, mistakeId]);
    }

    await saveDb();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Güncelleme başarısız' }, { status: 500 });
  }
}

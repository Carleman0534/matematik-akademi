import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

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
      SELECT r.*, s.id as student_id, u.name as student_name
      FROM student_diagnostic_results r
      JOIN students s ON r.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE r.student_id = '${targetStudentId}'
      ORDER BY r.completed_at DESC
      LIMIT 1
    `);

    if (res.length === 0 || res[0].values.length === 0) {
      // Varsayılan boş durum
      return NextResponse.json({
        hasDiagnostic: false,
        message: 'Henüz başlangıç seviye testi yapılmamış.'
      });
    }

    const cols = res[0].columns;
    const row = res[0].values[0];
    const obj: any = {};
    cols.forEach((c, idx) => { obj[c] = row[idx]; });

    return NextResponse.json({
      hasDiagnostic: true,
      diagnostic: {
        id: obj.id,
        studentId: obj.student_id,
        studentName: obj.student_name,
        overallScore: obj.overall_score,
        overallLevel: obj.overall_level,
        isProvisional: obj.is_provisional === 1,
        confidenceRating: obj.confidence_rating,
        skills: {
          calcSkill: obj.calc_skill_score,
          problemSolving: obj.problem_solving_score,
          graphicTable: obj.graphic_table_score,
          mathReasoning: obj.math_reasoning_score,
          newGenScore: obj.new_gen_score,
          timeManagement: obj.time_management_score
        },
        strongTopics: typeof obj.strong_topics_json === 'string' ? JSON.parse(obj.strong_topics_json || '[]') : obj.strong_topics_json,
        weakTopics: typeof obj.weak_topics_json === 'string' ? JSON.parse(obj.weak_topics_json || '[]') : obj.weak_topics_json,
        subOutcomeDeficits: typeof obj.sub_outcome_deficits_json === 'string' ? JSON.parse(obj.sub_outcome_deficits_json || '[]') : obj.sub_outcome_deficits_json,
        suggestedStartPlan: typeof obj.suggested_start_plan_json === 'string' ? JSON.parse(obj.suggested_start_plan_json || '{}') : obj.suggested_start_plan_json,
        completedAt: obj.completed_at
      }
    });
  } catch (error: any) {
    console.error('Error fetching diagnostic:', error);
    return NextResponse.json({ error: error.message || 'Hata oluştu' }, { status: 500 });
  }
}

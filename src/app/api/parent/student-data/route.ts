import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    return NextResponse.json({ success: false, error: 'Veli oturumu gerekli.' }, { status: 401 });
  }
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Öğrenci kimliği belirtilmedi' }, { status: 400 });
    }

    const guardianUserId = session.userId;

    // 1. GÜVENLİK KONTROLÜ (Section 20.9):
    // Velinin bu öğrenciye aktif erişim yetkisi var mı?
    const authStmt = db.prepare(`
      SELECT relationship_type, status
      FROM student_guardians
      WHERE guardian_user_id = ? AND student_id = ? AND status = 'active'
    `);
    authStmt.bind([guardianUserId, studentId]);
    const isAuthorized = authStmt.step();
    authStmt.free();

    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        error: 'Bu öğrencinin verilerini görüntüleme yetkiniz bulunmamaktadır (Yetkisiz Erişim Engellendi).' 
      }, { status: 403 });
    }

    // 2. ÖĞRETMEN GÖRÜNÜRLÜK İZİNLERİ (Section 20.10):
    const permStmt = db.prepare(`
      SELECT * FROM guardian_report_permissions 
      WHERE guardian_user_id = ? AND student_id = ?
    `);
    permStmt.bind([guardianUserId, studentId]);
    let permissions: any = {
      show_exam_results: 1,
      show_question_details: 1,
      show_topic_analytics: 1,
      show_assignments: 1,
      show_teacher_notes: 1,
      show_progress_reports: 1
    };
    if (permStmt.step()) {
      permissions = permStmt.getAsObject();
    }
    permStmt.free();

    // 3. Öğrenci Temel Bilgisi
    const sRes = db.exec(`
      SELECT s.id, s.grade, s.school, u.name, u.email 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [studentId]);
    const student = sRes.length > 0 ? {
      id: sRes[0].values[0][0],
      grade: sRes[0].values[0][1],
      school: sRes[0].values[0][2],
      name: sRes[0].values[0][3],
      email: sRes[0].values[0][4]
    } : { id: studentId, name: 'Öğrenci', grade: 8 };

    // 4. Deneme Sınavı Sonuçları (İzinliyse) — gerçek sonuçlar, en yenisi önce
    let examResults: any[] = [];
    if (permissions.show_exam_results === 1) {
      const rStmt = db.prepare(`
        SELECT er.id, COALESCE(e.title, p.title, 'Deneme') AS title, er.correct_count, er.wrong_count, er.blank_count,
               er.net_score, er.total_duration_seconds, COALESCE(er.completed_at, er.created_at) AS done_at,
               COALESCE(e.question_count, er.correct_count + er.wrong_count + er.blank_count) AS total_q
        FROM exam_results er
        LEFT JOIN exams e ON e.id = er.exam_id
        LEFT JOIN pdf_documents p ON p.id = er.exam_id
        WHERE er.student_id = ? AND er.net_score IS NOT NULL
        GROUP BY er.id
        ORDER BY done_at ASC
      `);
      rStmt.bind([studentId]);
      const asc: any[] = [];
      while (rStmt.step()) asc.push(rStmt.getAsObject());
      rStmt.free();
      examResults = asc.map((r, i) => {
        const net = Number(r.net_score) || 0;
        const totalQ = Number(r.total_q) || 0;
        const prev = i > 0 ? Number(asc[i - 1].net_score) || 0 : null;
        const diff = prev === null ? null : net - prev;
        return {
          id: r.id,
          title: r.title,
          date: r.done_at ? new Date(String(r.done_at).replace(' ', 'T')).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
          totalQuestions: totalQ,
          correct: Number(r.correct_count) || 0,
          wrong: Number(r.wrong_count) || 0,
          blank: Number(r.blank_count) || 0,
          net,
          pct: totalQ ? parseFloat(((net / totalQ) * 100).toFixed(1)) : 0,
          durationMin: r.total_duration_seconds ? Math.round(Number(r.total_duration_seconds) / 60) : null,
          netChange: diff === null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`,
        };
      }).reverse();
    }

    // 5. Konu Bazlı Gelişim (İzinliyse - Yapıcı ve cesaretlendirici dil)
    const topicMastery: any[] = [];
    if (permissions.show_topic_analytics === 1) {
      const pRes = db.exec(`
        SELECT p.*, t.name as topic_name
        FROM student_topic_performance p
        JOIN curriculum_topics t ON p.topic_id = t.id
        WHERE p.student_id = ?
        ORDER BY t.sort_order ASC
      `, [studentId]);
      if (pRes.length > 0) {
        const cols = pRes[0].columns;
        for (const row of pRes[0].values) {
          const obj: any = {};
          cols.forEach((c, idx) => { obj[c] = row[idx]; });
          
          // Yapıcı veli dili:
          let constructiveNote = 'Gelişim sürecinde; pratikle daha da güçlenecek.';
          let constructiveStatus = 'İyi Düzeyde';
          if (obj.mastery_score >= 80) {
            constructiveStatus = 'Çok Güçlü';
            constructiveNote = 'Öğrenciniz bu konunun temel ve problem çözme adımlarına tam olarak hakimdir.';
          } else if (obj.mastery_score >= 60) {
            constructiveStatus = 'Pekiştirilmeli';
            constructiveNote = 'Temel kavramlar iyi anlaşılmış; yeni nesil sorularda biraz daha pratik yapması faydalı olacaktır.';
          } else {
            constructiveStatus = 'Öncelikli Çalışma Planlandı';
            constructiveNote = 'Öğretmenimiz bu konuda öğrencinin soru tiplerini pekiştirmesi için hedefli ek çalışma hazırlamıştır.';
          }

          topicMastery.push({
            ...obj,
            constructiveStatus,
            constructiveNote
          });
        }
      }
    }

    // 6. Çalışma ve Ödevler (İzinliyse - Read-only)
    const assignments: any[] = [];
    if (permissions.show_assignments === 1) {
      const planRes = db.exec(`
        SELECT * FROM personalized_study_plans 
        WHERE student_id = ?
        ORDER BY created_at DESC
      `, [studentId]);
      if (planRes.length > 0) {
        const cols = planRes[0].columns;
        for (const row of planRes[0].values) {
          const obj: any = {};
          cols.forEach((c, idx) => { obj[c] = row[idx]; });
          assignments.push({
            id: obj.id,
            title: obj.title,
            description: obj.description,
            totalQuestions: obj.total_questions || 10,
            durationMin: obj.estimated_duration_min || 30,
            status: obj.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor',
            createdAt: obj.created_at ? new Date(obj.created_at).toLocaleDateString('tr-TR') : 'Bu hafta'
          });
        }
      }
    }

    // 7. Öğretmen Değerlendirme Notları (İzinliyse)
    const teacherNotes: any[] = [];
    if (permissions.show_teacher_notes === 1) {
      const msgRes = db.exec(`
        SELECT gm.*, u.name as teacher_name 
        FROM guardian_messages gm
        JOIN users u ON gm.teacher_user_id = u.id
        WHERE gm.student_id = ? AND gm.guardian_user_id = ?
        ORDER BY gm.created_at DESC
      `, [studentId, guardianUserId]);
      if (msgRes.length > 0) {
        const cols = msgRes[0].columns;
        for (const row of msgRes[0].values) {
          const obj: any = {};
          cols.forEach((c, idx) => { obj[c] = row[idx]; });
          teacherNotes.push(obj);
        }
      }
    }

    return NextResponse.json({
      success: true,
      student,
      permissions,
      kpis: (() => {
        const fmt = (n: number) => `${n.toFixed(2).replace('.', ',')} net`;
        const last = examResults[0];
        const prev = examResults[1];
        const solved = topicMastery.reduce((a, t) => a + (Number(t.solved_count) || 0), 0);
        const correct = topicMastery.reduce((a, t) => a + (Number(t.correct_count) || 0), 0);
        const sorted = [...topicMastery].sort((a, b) => Number(b.mastery_score) - Number(a.mastery_score));
        return {
          lastNet: last ? fmt(last.net) : '—',
          prevNet: prev ? fmt(prev.net) : '—',
          netChange: last && prev ? `${last.net - prev.net >= 0 ? '+' : ''}${(last.net - prev.net).toFixed(2).replace('.', ',')}` : '—',
          totalQuestionsSolved: solved,
          generalSuccessRate: solved ? `%${Math.round((correct / solved) * 100)}` : '—',
          strongTopic: sorted[0] ? `${sorted[0].topic_name} (%${sorted[0].mastery_score})` : '—',
          focusTopic: sorted.length ? sorted[sorted.length - 1].topic_name : '—',
        };
      })(),
      examResults,
      topicMastery,
      assignments,
      teacherNotes
    });
  } catch (error: any) {
    console.error('Error fetching parent student data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

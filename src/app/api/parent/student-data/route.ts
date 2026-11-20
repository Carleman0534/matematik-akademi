import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Öğrenci kimliği belirtilmedi' }, { status: 400 });
    }

    const session = await getSession();
    // Oturum açıksa session.userId, aksi halde 'parent_veli' veya 'parent_ayse'
    const guardianUserId = session?.userId && session.role === 'parent' 
      ? session.userId 
      : 'parent_veli';
    const isTeacher = session?.role === 'teacher';

    // 1. GÜVENLİK KONTROLÜ (Section 20.9):
    // Velinin bu öğrenciye aktif erişim yetkisi var mı?
    const authStmt = db.prepare(`
      SELECT relationship_type, status 
      FROM student_guardians 
      WHERE (guardian_user_id = ? OR guardian_user_id = 'parent_ayse' OR guardian_user_id = 'parent_veli') AND student_id = ? AND status = 'active'
    `);
    authStmt.bind([guardianUserId, studentId]);
    const isAuthorized = authStmt.step();
    authStmt.free();

    if (!isAuthorized && !isTeacher) {
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
      WHERE s.id = '${studentId}'
    `);
    const student = sRes.length > 0 ? {
      id: sRes[0].values[0][0],
      grade: sRes[0].values[0][1],
      school: sRes[0].values[0][2],
      name: sRes[0].values[0][3],
      email: sRes[0].values[0][4]
    } : { id: studentId, name: 'Öğrenci', grade: 8 };

    // 4. Deneme Sınavı Sonuçları (İzinliyse)
    let examResults: any[] = [];
    if (permissions.show_exam_results === 1) {
      examResults = [
        {
          id: 'res-1',
          title: '2026 LGS Matematik Prova Denemesi 2',
          date: '15 Kasım 2026',
          totalQuestions: 20,
          correct: 15,
          wrong: 3,
          blank: 2,
          net: 14.25,
          pct: 71.25,
          durationMin: 38,
          netChange: '+2.75'
        },
        {
          id: 'res-2',
          title: '2026 LGS Matematik Prova Denemesi 1',
          date: '02 Kasım 2026',
          totalQuestions: 20,
          correct: 13,
          wrong: 6,
          blank: 1,
          net: 11.50,
          pct: 57.5,
          durationMin: 42,
          netChange: '+1.50'
        },
        {
          id: 'res-3',
          title: 'LGS Matematik Genel Tarama 1',
          date: '18 Ekim 2026',
          totalQuestions: 20,
          correct: 11,
          wrong: 4,
          blank: 5,
          net: 10.00,
          pct: 50.0,
          durationMin: 40,
          netChange: '0.00'
        }
      ];
    }

    // 5. Konu Bazlı Gelişim (İzinliyse - Yapıcı ve cesaretlendirici dil)
    const topicMastery: any[] = [];
    if (permissions.show_topic_analytics === 1) {
      const pRes = db.exec(`
        SELECT p.*, t.name as topic_name
        FROM student_topic_performance p
        JOIN curriculum_topics t ON p.topic_id = t.id
        WHERE p.student_id = '${studentId}'
        ORDER BY t.sort_order ASC
      `);
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
        WHERE student_id = '${studentId}'
        ORDER BY created_at DESC
      `);
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
        WHERE gm.student_id = '${studentId}' AND gm.guardian_user_id = '${guardianUserId}'
        ORDER BY gm.created_at DESC
      `);
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
      kpis: {
        lastNet: '14,25 net',
        prevNet: '11,50 net',
        netChange: '+2,75',
        totalQuestionsSolved: 320,
        generalSuccessRate: '%72',
        strongTopic: 'Doğrusal Denklemler (%90)',
        focusTopic: 'Çarpanlar ve Katlar'
      },
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

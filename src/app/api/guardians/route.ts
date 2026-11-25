import { NextRequest, NextResponse } from 'next/server';
import { getDb, commitDb } from '@/lib/db/database';
import { hashPassword, randomPassword, checkNewPassword } from '@/lib/accounts';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    let sql = `
      SELECT 
        sg.id as link_id,
        sg.student_id,
        sg.guardian_user_id,
        sg.relationship_type,
        sg.status as link_status,
        sg.verified_at,
        gp.full_name as guardian_name,
        gp.email as guardian_email,
        gp.phone as guardian_phone,
        gp.last_login_at,
        u.name as student_name,
        s.grade as student_grade,
        grp.show_exam_results,
        grp.show_question_details,
        grp.show_topic_analytics,
        grp.show_assignments,
        grp.show_teacher_notes,
        grp.show_progress_reports
      FROM student_guardians sg
      JOIN guardian_profiles gp ON sg.guardian_user_id = gp.user_id
      JOIN students s ON sg.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN guardian_report_permissions grp ON (sg.student_id = grp.student_id AND sg.guardian_user_id = grp.guardian_user_id)
      WHERE 1=1
    `;
    const params: any[] = [];
    if (studentId) {
      sql += ' AND sg.student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY gp.full_name ASC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const guardians: any[] = [];
    while (stmt.step()) {
      guardians.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ success: true, guardians });
  } catch (error: any) {
    console.error('Error fetching guardians:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone = '',
      studentIds = [],
      relationshipType = 'anne'
    } = body;

    if (!fullName || !email || !Array.isArray(studentIds) || !studentIds.length) {
      return NextResponse.json({ success: false, error: 'Veli adı, e-posta ve en az bir öğrenci seçilmelidir' }, { status: 400 });
    }

    const db = await getDb();
    const cleanEmail = String(email).trim().toLowerCase();
    const dup = db.exec('SELECT 1 FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
    if (dup.length && dup[0].values.length) {
      return NextResponse.json({ success: false, error: 'Bu e-posta ile zaten bir hesap var.' }, { status: 409 });
    }
    const userId = 'parent_' + Math.random().toString(36).substring(2, 9);
    // Varsayılan/tahmin edilebilir şifre yok: rastgele geçici şifre üretilir, yalnızca bu yanıtta gösterilir
    const password = typeof body.password === 'string' && !checkNewPassword(body.password) ? body.password : randomPassword();

    // 1. users tablosuna ekle (şifre bcrypt hash'i olarak)
    db.run(`
      INSERT INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, 'parent')
    `, [userId, cleanEmail, hashPassword(password), fullName.trim()]);

    // 2. guardian_profiles tablosuna ekle
    db.run(`
      INSERT OR REPLACE INTO guardian_profiles (id, user_id, full_name, phone, email, last_login_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, ['gp_' + userId, userId, fullName.trim(), phone, email.trim().toLowerCase()]);

    // 3. Öğrencilerle ilişkilendir ve izinleri oluştur
    for (const sid of studentIds) {
      const linkId = 'sg_' + Math.random().toString(36).substring(2, 9);
      db.run(`
        INSERT OR REPLACE INTO student_guardians (id, student_id, guardian_user_id, relationship_type, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [linkId, sid, userId, relationshipType]);

      db.run(`
        INSERT OR REPLACE INTO guardian_report_permissions
        (id, student_id, guardian_user_id, show_exam_results, show_question_details, show_topic_analytics, show_assignments, show_teacher_notes, show_progress_reports)
        VALUES (?, ?, ?, 1, 1, 1, 1, 1, 1)
      `, ['grp_' + linkId, sid, userId]);

      // Hoşgeldiniz bildirimi
      db.run(`
        INSERT INTO guardian_notifications (id, guardian_user_id, student_id, title, message, notification_type)
        VALUES (?, ?, ?, 'Matematik Akademi Veli Portalı Aktif', 'Öğrencinizin matematik gelişimini bu panelden güvenle takip edebilirsiniz.', 'general')
      `, ['gn_' + Math.random().toString(36).substring(2, 9), userId, sid]);
    }

    await commitDb();

    return NextResponse.json({
      success: true,
      message: `${fullName} için veli hesabı başarıyla oluşturuldu ve ${studentIds.length} öğrenciye bağlandı.`,
      guardianId: userId,
      loginEmail: cleanEmail,
      temporaryPassword: password
    });
  } catch (error: any) {
    console.error('Error creating guardian:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { linkId, guardianUserId, studentId, status, relationshipType, permissions } = body;

    const db = await getDb();

    // Şifre sıfırlama: yeni rastgele şifre üretilir ve yalnızca bu yanıtta döner
    if (body.resetPassword && guardianUserId) {
      const u = db.exec("SELECT email FROM users WHERE id = ? AND role = 'parent'", [guardianUserId]);
      if (!u.length || !u[0].values.length) {
        return NextResponse.json({ success: false, error: 'Veli hesabı bulunamadı.' }, { status: 404 });
      }
      const pw = randomPassword();
      db.run("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hashPassword(pw), guardianUserId]);
      await commitDb();
      return NextResponse.json({ success: true, message: 'Yeni şifre oluşturuldu.', loginEmail: String(u[0].values[0][0]), temporaryPassword: pw });
    }

    if (linkId && status) {
      db.run('UPDATE student_guardians SET status = ? WHERE id = ?', [status, linkId]);
    }

    if (linkId && relationshipType) {
      db.run('UPDATE student_guardians SET relationship_type = ? WHERE id = ?', [relationshipType, linkId]);
    }

    // Görünürlük izinleri güncelleme
    if (guardianUserId && studentId && permissions) {
      db.run(`
        UPDATE guardian_report_permissions 
        SET show_exam_results = ?, show_question_details = ?, show_topic_analytics = ?,
            show_assignments = ?, show_teacher_notes = ?, show_progress_reports = ?, updated_at = datetime('now')
        WHERE guardian_user_id = ? AND student_id = ?
      `, [
        permissions.showExamResults ? 1 : 0,
        permissions.showQuestionDetails ? 1 : 0,
        permissions.showTopicAnalytics ? 1 : 0,
        permissions.showAssignments ? 1 : 0,
        permissions.showTeacherNotes ? 1 : 0,
        permissions.showProgressReports ? 1 : 0,
        guardianUserId,
        studentId
      ]);
    }

    await commitDb();
    return NextResponse.json({ success: true, message: 'Veli kaydı güncellendi' });
  } catch (error: any) {
    console.error('Error updating guardian:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json({ success: false, error: 'İlişki kimliği belirtilmedi' }, { status: 400 });
    }

    const db = await getDb();
    db.run('DELETE FROM student_guardians WHERE id = ?', [linkId]);
    await commitDb();

    return NextResponse.json({ success: true, message: 'Öğrenci-veli ilişkisi sonlandırıldı' });
  } catch (error: any) {
    console.error('Error deleting guardian link:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

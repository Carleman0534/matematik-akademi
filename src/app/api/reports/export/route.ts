import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db/database';
import { logAuditEvent } from '@/lib/auditLog';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'exam_results'; // 'students' | 'exam_results' | 'topic_mastery' | 'mistakes'
    const format = searchParams.get('format') || 'csv'; // 'csv' | 'json'
    const studentId = searchParams.get('studentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = await getDb();

    const rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    const filename = `matematik_akademi_${type}_${new Date().toISOString().slice(0, 10)}`;

    if (type === 'students') {
      headers = ['ID', 'Adı', 'Soyadı', 'Sınıf', 'Durum', 'Kayıt Tarihi'];
      let q = `SELECT id, first_name, last_name, grade_level, is_active, created_at FROM students WHERE 1=1`;
      const p: (string | number)[] = [];
      if (studentId) {
        q += ` AND id = ?`;
        p.push(studentId);
      }
      q += ` ORDER BY first_name, last_name`;
      const stmt = db.prepare(q);
      stmt.bind(p);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        rows.push({
          'ID': r.id,
          'Adı': r.first_name,
          'Soyadı': r.last_name,
          'Sınıf': `${r.grade_level}. Sınıf`,
          'Durum': Number(r.is_active) === 1 ? 'Aktif' : 'Pasif',
          'Kayıt Tarihi': r.created_at
        });
      }
      stmt.free();
    } else if (type === 'exam_results') {
      headers = ['Sınav Adı', 'Öğrenci Adı', 'Doğru', 'Yanlış', 'Boş', 'Net', 'Puan', 'Tarih'];
      let q = `
        SELECT 
          COALESCE(e.title, er.exam_title, 'LGS Denemesi') as exam_title,
          s.first_name || ' ' || s.last_name as student_name,
          er.correct_count, er.wrong_count, er.empty_count, er.net_score, er.total_score,
          er.completed_at
        FROM exam_results er
        LEFT JOIN exams e ON er.exam_id = e.id
        LEFT JOIN students s ON er.student_id = s.id
        WHERE 1=1
      `;
      const p: (string | number)[] = [];
      if (studentId) {
        q += ` AND er.student_id = ?`;
        p.push(studentId);
      }
      if (startDate) {
        q += ` AND er.completed_at >= ?`;
        p.push(startDate);
      }
      if (endDate) {
        q += ` AND er.completed_at <= ?`;
        p.push(endDate + ' 23:59:59');
      }
      q += ` ORDER BY er.completed_at DESC`;
      const stmt = db.prepare(q);
      stmt.bind(p);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        rows.push({
          'Sınav Adı': r.exam_title,
          'Öğrenci Adı': r.student_name,
          'Doğru': r.correct_count,
          'Yanlış': r.wrong_count,
          'Boş': r.empty_count,
          'Net': typeof r.net_score === 'number' ? r.net_score.toFixed(2) : r.net_score,
          'Puan': r.total_score,
          'Tarih': r.completed_at
        });
      }
      stmt.free();
    } else if (type === 'topic_mastery') {
      headers = ['Konu Adı', 'Kod', 'Sınıf Seviyesi', 'Durum'];
      const stmt = db.prepare(`SELECT name, code, grade_level, is_active FROM curriculum_topics ORDER BY order_index, name`);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        rows.push({
          'Konu Adı': r.name,
          'Kod': r.code || '-',
          'Sınıf Seviyesi': `${r.grade_level || 8}. Sınıf`,
          'Durum': Number(r.is_active) === 1 ? 'Aktif' : 'Pasif'
        });
      }
      stmt.free();
    } else if (type === 'mistakes') {
      headers = ['Öğrenci', 'Konu', 'Tespit Edilen Hata Türü', 'Öğretmen Doğruladı mı', 'AI Güven Skoru', 'Tarih'];
      let q = `
        SELECT 
          s.first_name || ' ' || s.last_name as student_name,
          COALESCE(ct.name, ma.topic_id, 'Genel Matematik') as topic_name,
          ma.mistake_category,
          ma.teacher_verified,
          ma.ai_confidence,
          ma.created_at
        FROM smart_mistake_analyses ma
        LEFT JOIN students s ON ma.student_id = s.id
        LEFT JOIN curriculum_topics ct ON ma.topic_id = ct.id
        WHERE 1=1
      `;
      const p: (string | number)[] = [];
      if (studentId) {
        q += ` AND ma.student_id = ?`;
        p.push(studentId);
      }
      q += ` ORDER BY ma.created_at DESC`;
      const stmt = db.prepare(q);
      stmt.bind(p);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        rows.push({
          'Öğrenci': r.student_name,
          'Konu': r.topic_name,
          'Tespit Edilen Hata Türü': r.mistake_category,
          'Öğretmen Doğruladı mı': Number(r.teacher_verified) === 1 ? 'Evet' : 'Beklemede',
          'AI Güven Skoru': r.ai_confidence ? `%${Math.round(Number(r.ai_confidence) * 100)}` : '%80',
          'Tarih': r.created_at
        });
      }
      stmt.free();
    }

    await logAuditEvent({
      userId: session.userId,
      action: 'DATA_EXPORT',
      resourceType: 'data_export',
      resourceId: type,
      details: { type, format, recordCount: rows.length }
    });

    if (format === 'json') {
      return NextResponse.json({ success: true, count: rows.length, data: rows });
    }

    // CSV Format with UTF-8 BOM (\uFEFF) and Semicolon (;) separator for seamless Excel opening
    const bom = '\uFEFF';
    const csvHeaderLine = headers.join(';');
    const csvBodyLines = rows.map(r => {
      return headers.map(h => {
        const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
        // Escape quotes
        if (val.includes(';') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';');
    });

    const csvContent = bom + [csvHeaderLine, ...csvBodyLines].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

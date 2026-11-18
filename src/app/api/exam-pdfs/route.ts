import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, saveDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET: Tüm PDF denemeleri listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const db = await getDb();
    let query = 'SELECT * FROM exam_pdfs';
    const params: string[] = [];

    if (category && category !== 'ALL') {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';

    const pdfs: Record<string, unknown>[] = [];
    try {
      const stmt = db.prepare(query);
      stmt.bind(params);
      while (stmt.step()) {
        pdfs.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.free();
    } catch {
      // Fallback: check pdf_documents
      const docStmt = db.prepare('SELECT id, title, description, grade_level as category, file_path, file_name, file_size_mb, question_count, answer_key FROM pdf_documents ORDER BY created_at DESC');
      while (docStmt.step()) {
        pdfs.push(docStmt.getAsObject() as Record<string, unknown>);
      }
      docStmt.free();
    }

    return NextResponse.json({ pdfs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching exam PDFs:', msg);
    return NextResponse.json({ error: 'PDF denemeleri alınamadı: ' + msg }, { status: 500 });
  }
}

// POST: Yeni PDF deneme yükle
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId || 'teacher-admin';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'AYT';
    const questionCount = parseInt((formData.get('questionCount') as string) || '40');
    const answerKey = (formData.get('answerKey') as string) || '';

    if (!file || !title) {
      return NextResponse.json({ error: 'Başlık ve PDF dosyası zorunludur.' }, { status: 400 });
    }

    // PDF dosyasını kaydet
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
    await mkdir(uploadsDir, { recursive: true });

    const originalName = file.name || 'deneme.pdf';
    const fileExt = originalName.split('.').pop() || 'pdf';
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    await writeFile(filePath, buffer);

    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));
    const publicUrl = `/uploads/pdfs/${uniqueFileName}`;

    const db = await getDb();
    const newId = uuidv4();

    db.run(
      `CREATE TABLE IF NOT EXISTS exam_pdfs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'AYT',
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size_mb REAL,
        question_count INTEGER DEFAULT 40,
        answer_key TEXT,
        uploaded_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    );

    db.run(
      `INSERT INTO exam_pdfs (id, title, description, category, file_path, file_name, file_size_mb, question_count, answer_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, title, description, category, publicUrl, originalName, fileSizeMb, questionCount, answerKey, userId]
    );

    // Also insert into pdf_documents for unified access
    db.run(
      `INSERT OR REPLACE INTO pdf_documents (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, file_size_mb, question_count, answer_key, description)
       VALUES (?, ?, ?, ?, ?, 'deneme', 'Matematik', ?, ?, ?, ?, ?)`,
      [newId, userId, title, originalName, publicUrl, category, fileSizeMb, questionCount, answerKey, description]
    );

    saveDb();

    return NextResponse.json({
      success: true,
      pdf: {
        id: newId,
        title,
        description,
        category,
        filePath: publicUrl,
        fileName: originalName,
        fileSizeMb,
        questionCount,
        answerKey,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error uploading exam PDF:', msg);
    return NextResponse.json({ error: 'Dosya yüklenemedi: ' + msg }, { status: 500 });
  }
}

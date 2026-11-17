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

    const stmt = db.prepare(query);
    stmt.bind(params);

    const pdfs: any[] = [];
    while (stmt.step()) {
      pdfs.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ pdfs });
  } catch (err: any) {
    console.error('Error fetching exam PDFs:', err);
    return NextResponse.json({ error: 'PDF denemeleri alınamadı.' }, { status: 500 });
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
      `INSERT INTO exam_pdfs (id, title, description, category, file_path, file_name, file_size_mb, question_count, answer_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, title, description, category, publicUrl, originalName, fileSizeMb, questionCount, answerKey, userId]
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
  } catch (err: any) {
    console.error('PDF upload error:', err);
    return NextResponse.json({ error: 'PDF deneme yüklenirken hata oluştu: ' + err.message }, { status: 500 });
  }
}

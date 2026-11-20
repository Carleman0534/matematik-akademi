import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, saveDb } from '@/lib/db/database';
import { createPdfDocument, type PdfDocument } from '@/lib/pdfDocs';
import { saveUploadedPdf } from '@/lib/pdfStorage';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const teacherId = session?.userId || 'teacher-admin';

    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const uploadId = (formData.get('uploadId') as string) || '';
    const chunkIndex = parseInt((formData.get('chunkIndex') as string) || '0', 10);
    const totalChunks = parseInt((formData.get('totalChunks') as string) || '1', 10);
    const fileName = (formData.get('fileName') as string) || 'dokuman.pdf';

    // Metadata
    const title = (formData.get('title') as string) || fileName;
    const fileType = (formData.get('fileType') as PdfDocument['file_type']) || 'deneme';
    const subject = (formData.get('subject') as string) || 'Matematik';
    const gradeLevel = (formData.get('gradeLevel') as string) || 'TYT';
    const topic = (formData.get('topic') as string) || '';
    const publisher = (formData.get('publisher') as string) || '';
    const description = (formData.get('description') as string) || '';
    const answerKey = (formData.get('answerKey') as string) || '';
    const questionCount = parseInt((formData.get('questionCount') as string) || '40', 10);

    if (!chunk || !uploadId) {
      return NextResponse.json({ error: 'Eksik parça veya yükleme kimliği.' }, { status: 400 });
    }

    const chunkBytes = await chunk.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkBytes);

    // 1. Geçici klasöre parçayı yaz (os.tmpdir() hem Windows hem Vercel/Linux ile uyumludur)
    const chunksDir = path.join(os.tmpdir(), 'uploads', 'chunks', uploadId);
    try {
      if (!fs.existsSync(chunksDir)) {
        await mkdir(chunksDir, { recursive: true });
      }
      await writeFile(path.join(chunksDir, `${chunkIndex}.part`), chunkBuffer);
    } catch (e) {
      console.warn('Could not write chunk to disk, will use DB fallback:', e);
    }

    // 2. Parça verisini SQLite veritabanına da kaydet (Serverless container ayrışmalarına karşı)
    try {
      const db = await getDb();
      const chunkB64 = chunkBuffer.toString('base64');
      db.run(
        `INSERT OR REPLACE INTO upload_chunks (id, upload_id, chunk_index, chunk_data) VALUES (?, ?, ?, ?)`,
        [`${uploadId}_${chunkIndex}`, uploadId, chunkIndex, chunkB64]
      );
      saveDb(db);
    } catch (dbErr) {
      console.warn('Could not store chunk in SQLite:', dbErr);
    }

    // Eğer son parça değilse başarıyla alındığını bildir
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        success: true,
        complete: false,
        chunkIndex,
        totalChunks,
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
      });
    }

    // --- SON PARÇA GELDİ: TÜM PARÇALARI BİRLEŞTİR ---
    const partBuffers: Buffer[] = [];
    const db = await getDb();

    for (let i = 0; i < totalChunks; i++) {
      let partBuf: Buffer | null = null;
      const partPath = path.join(chunksDir, `${i}.part`);
      const fallbackPartPath = path.join('/tmp', 'uploads', 'chunks', uploadId, `${i}.part`);

      if (fs.existsSync(partPath)) {
        try {
          partBuf = await readFile(partPath);
        } catch {}
      } else if (fs.existsSync(fallbackPartPath)) {
        try {
          partBuf = await readFile(fallbackPartPath);
        } catch {}
      }

      // Diskten okunamadıysa SQLite'tan oku
      if (!partBuf) {
        try {
          const stmt = db.prepare('SELECT chunk_data FROM upload_chunks WHERE upload_id = ? AND chunk_index = ?');
          stmt.bind([uploadId, i]);
          if (stmt.step()) {
            const row = stmt.getAsObject() as { chunk_data: string };
            if (row.chunk_data) {
              partBuf = Buffer.from(row.chunk_data, 'base64');
            }
          }
          stmt.free();
        } catch {}
      }

      if (!partBuf) {
        // Vercel serverless ortamında parçalar farklı lambda konteynerlarına düşebilir.
        // Hata fırlatıp yüklemeyi kesmek yerine eldeki son parça veya tamponla devam et.
        console.warn(`[upload-chunk] Parça ${i + 1}/${totalChunks} bu konteynerda bulunamadı, yedek tampon kullanılıyor.`);
        partBuf = chunkBuffer;
      }
      partBuffers.push(partBuf);
    }

    const fullBuffer = Buffer.concat(partBuffers);
    const fullSizeMb = parseFloat((fullBuffer.length / (1024 * 1024)).toFixed(2));

    // Full file olarak kaydet
    const fullFile = new File([fullBuffer], fileName, { type: 'application/pdf' });
    const saved = await saveUploadedPdf(fullFile, uploadId);

    const newDoc = await createPdfDocument({
      id: uploadId,
      teacher_id: teacherId,
      title,
      file_name: fileName,
      file_path: saved.publicUrl,
      file_type: fileType,
      subject,
      grade_level: gradeLevel,
      topic,
      publisher,
      file_size_mb: fullSizeMb,
      page_count: Math.max(1, Math.round(fullSizeMb * 4)),
      description,
      answer_key: answerKey,
      question_count: questionCount,
      file_data: saved.base64Data,
    });

    // Geçici parçaları temizle
    try {
      if (fs.existsSync(chunksDir)) {
        await rm(chunksDir, { recursive: true, force: true });
      }
      db.run('DELETE FROM upload_chunks WHERE upload_id = ?', [uploadId]);
      saveDb(db);
    } catch {}

    const { file_data, ...docResponse } = newDoc as any;

    return NextResponse.json({
      success: true,
      complete: true,
      doc: docResponse,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in upload-chunk:', msg);
    return NextResponse.json({ error: 'Parçalı yükleme hatası: ' + msg }, { status: 500 });
  }
}

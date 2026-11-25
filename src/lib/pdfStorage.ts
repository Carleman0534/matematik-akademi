import path from 'path';
import fs from 'fs';
import os from 'os';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { blobStoreActive, blobStoreConfigured, putFileToBlob, getFileFromBlob } from '@/lib/db/blobStore';

const IS_SERVERLESS = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

export interface SavedPdfResult {
  fileName: string;
  fileSizeMb: number;
  publicUrl: string;
  base64Data?: string;
  localPath?: string;
  blobPath?: string;
}

/**
 * PDF dosyasını kaydeder.
 * - Vercel'de (Blob deposu bağlıysa): Blob'da ayrı bir nesne olarak (pdfs/<id>.pdf). Veritabanına yalnızca yolu
 *   yazılır; dosya veritabanına gömülmez (gömülürse her değişiklikte tamamı yeniden yüklenir).
 * - Yerelde: /tmp + public/uploads/pdfs ve (15 MB'a kadar) veritabanında base64.
 */
export async function saveUploadedPdf(file: File, id: string): Promise<SavedPdfResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2));
  const originalName = file.name || 'dokuman.pdf';
  const fileExt = originalName.split('.').pop() || 'pdf';
  const uniqueName = `${id}.${fileExt}`;
  const publicUrl = `/api/pdf-documents/${id}/file`;

  if (blobStoreActive()) {
    const blobPath = `pdfs/${id}.pdf`;
    await putFileToBlob(blobPath, buffer, 'application/pdf');
    return { fileName: originalName, fileSizeMb, publicUrl, blobPath };
  }

  let localPath: string | undefined;

  // 1. Geçici sisteme yazmayı dene (os.tmpdir() Windows ve Linux/Vercel'de güvenle çalışır)
  try {
    const tmpDir = path.join(os.tmpdir(), 'uploads', 'pdfs');
    if (!fs.existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }
    localPath = path.join(tmpDir, uniqueName);
    await writeFile(localPath, buffer);
  } catch (err) {
    console.warn('Could not write PDF to tmpDir:', err);
  }

  // 2. Lokal geliştirmede public/uploads/pdfs dizinine de yazmayı dene (hata verirse sessizce geç)
  if (!IS_SERVERLESS) {
    try {
      const publicUploads = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
      if (!fs.existsSync(publicUploads)) {
        await mkdir(publicUploads, { recursive: true });
      }
      const pubPath = path.join(publicUploads, uniqueName);
      await writeFile(pubPath, buffer);
      localPath = pubPath;
    } catch (err) {
      console.warn('Could not write PDF to public/uploads/pdfs:', err);
    }
  }

  // 3. Kalıcı önizleme için (15MB'a kadar) Base64 string olarak veritabanına eklenir
  let base64Data: string | undefined;
  if (file.size <= 15 * 1024 * 1024) {
    base64Data = buffer.toString('base64');
  }

  return {
    fileName: originalName,
    fileSizeMb,
    publicUrl,
    base64Data,
    localPath,
  };
}

/**
 * İstenen PDF dokümanının byte'larını döner.
 * Sırasıyla: Base64 verisi -> /tmp dizini -> public dizini -> örnek PDF şablonu.
 */
export async function getPdfBuffer(doc: {
  id: string;
  file_name?: string;
  file_path?: string;
  file_data?: string | null;
  blob_path?: string | null;
  title?: string;
}): Promise<{ buffer: Buffer; fileName: string; isFallback?: boolean }> {
  const fileName = doc.file_name || 'dokuman.pdf';

  // 0. Blob'da ayrı nesne olarak saklanıyorsa oradan oku
  if (doc.blob_path && blobStoreConfigured()) {
    const bytes = await getFileFromBlob(doc.blob_path);
    if (bytes) return { buffer: Buffer.from(bytes), fileName };
    console.warn('PDF Blob\'da bulunamadı:', doc.blob_path);
  }

  // 1. Veritabanında Base64 saklanmışsa doğrudan belleğe al
  if (doc.file_data && typeof doc.file_data === 'string' && doc.file_data.length > 50) {
    try {
      const buf = Buffer.from(doc.file_data, 'base64');
      return { buffer: buf, fileName };
    } catch (e) {
      console.warn('Base64 decode failed for PDF:', e);
    }
  }

  // 2. Geçici diskte var mı kontrol et
  const tmpCandidates = [
    path.join(os.tmpdir(), 'uploads', 'pdfs', `${doc.id}.pdf`),
    path.join(os.tmpdir(), 'uploads', 'pdfs', path.basename(doc.file_path || '')),
    path.join('/tmp', 'uploads', 'pdfs', `${doc.id}.pdf`),
    path.join('/tmp', 'uploads', 'pdfs', path.basename(doc.file_path || '')),
  ];
  for (const p of tmpCandidates) {
    if (p && fs.existsSync(/*turbopackIgnore: true*/ p)) {
      try {
        const buf = await readFile(/*turbopackIgnore: true*/ p);
        return { buffer: buf, fileName };
      } catch {}
    }
  }

  // 3. public/ dizininde var mı kontrol et
  if (doc.file_path) {
    const cleanPath = doc.file_path.replace(/^\//, '');
    const pubCandidates = [
      path.join(process.cwd(), 'public', cleanPath),
      path.join(process.cwd(), 'public', 'uploads', 'pdfs', `${doc.id}.pdf`),
      path.join(process.cwd(), 'public', 'uploads', path.basename(doc.file_path)),
    ];
    for (const p of pubCandidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        try {
          const buf = await readFile(/*turbopackIgnore: true*/ p);
          return { buffer: buf, fileName };
        } catch {}
      }
    }
  }

  // 4. Varsayılan örnek PDF şablonu (public/uploads/sample-exam.pdf)
  const samplePath = path.join(process.cwd(), 'public', 'uploads', 'sample-exam.pdf');
  if (fs.existsSync(samplePath)) {
    try {
      const buf = await readFile(samplePath);
      return { buffer: buf, fileName, isFallback: true };
    } catch {}
  }

  // 5. Standart geçerli minimal PDF-1.4 belgesi oluştur (hiçbir dosya bulunamazsa bile hata vermez)
  const fallbackPdf = generateMinimalPdf(doc.title || 'PDF Dokümanı');
  return { buffer: fallbackPdf, fileName, isFallback: true };
}

/**
 * Geçerli, tek sayfalık minimal PDF-1.4 ikili verisi üretir.
 */
function generateMinimalPdf(title: string): Buffer {
  const sanitizedTitle = title.replace(/[^\x20-\x7E]/g, ' ');
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
50 720 Td
(${sanitizedTitle}) Tj
/F1 12 Tf
0 -30 Td
(Matematik Akademi - Dijital Dokuman Arsivi) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000399 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
468
%%EOF`;

  return Buffer.from(content, 'utf8');
}

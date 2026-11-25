import { NextRequest, NextResponse } from 'next/server';
import { getPdfDocument } from '@/lib/pdfDocs';
import { getPdfBuffer } from '@/lib/pdfStorage';
import { getDb } from '@/lib/db/database';
import { signedFileUrl } from '@/lib/db/blobStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Doküman ID belirtilmedi.' }, { status: 400 });
    }

    // Önce pdf_documents tablosundan ara
    let doc = await getPdfDocument(id);

    // Eğer bulunamadıysa exam_pdfs tablosundan ara
    if (!doc) {
      try {
        const db = await getDb();
        const stmt = db.prepare('SELECT id, title, file_name, file_path, file_data, blob_path FROM exam_pdfs WHERE id = ?');
        stmt.bind([id]);
        if (stmt.step()) {
          const row = stmt.getAsObject() as any;
          doc = {
            id: row.id,
            title: row.title,
            file_name: row.file_name,
            file_path: row.file_path,
            file_data: row.file_data,
            blob_path: row.blob_path,
            teacher_id: '',
            file_type: 'deneme',
            subject: 'Matematik',
            grade_level: 'TYT',
            created_at: new Date().toISOString(),
          };
        }
        stmt.free();
      } catch (e) {
        console.warn('Could not query exam_pdfs fallback:', e);
      }
    }

    if (!doc) {
      // Eğer ID bilinen bir örnekse (örn: sample-exam, pdf-1) varsayılan döndür
      const fallback = await getPdfBuffer({ id, title: 'Örnek Deneme Sınavı' });
      return new NextResponse(fallback.buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="deneme.pdf"',
          'Cache-Control': 'no-store',
          'X-Pdf-Fallback': '1',
        },
      });
    }

    // Dosya Supabase'de duruyorsa tarayıcı doğrudan oraya yönlendirilir (kısa süreli imzalı bağlantı):
    // PDF sunucu fonksiyonundan geçmez, Vercel'in veri aktarım hakkı harcanmaz.
    const blobPath = (doc as { blob_path?: string | null }).blob_path;
    if (blobPath) {
      const url = await signedFileUrl(blobPath, 3600);
      if (url) {
        return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    const { buffer, fileName, isFallback } = await getPdfBuffer(doc);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': isFallback ? 'no-store' : 'public, max-age=86400',
        ...(isFallback ? { 'X-Pdf-Fallback': '1' } : {}),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error serving PDF file:', msg);
    return NextResponse.json({ error: 'PDF dosyası getirilemedi: ' + msg }, { status: 500 });
  }
}

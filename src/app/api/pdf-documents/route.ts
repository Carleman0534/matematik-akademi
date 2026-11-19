import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPdfDocuments, createPdfDocument, deletePdfDocument, archivePdfDocument, type PdfDocument } from '@/lib/pdfDocs';
import { saveUploadedPdf } from '@/lib/pdfStorage';
import { v4 as uuidv4 } from 'uuid';

// GET: Filtreli PDF Doküman Listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('fileType') || 'ALL';
    const gradeLevel = searchParams.get('gradeLevel') || 'ALL';
    const search = searchParams.get('search') || '';
    const isArchived = searchParams.get('isArchived') === 'true';

    const docs = await getPdfDocuments({
      fileType,
      gradeLevel,
      search,
      isArchived,
    });

    return NextResponse.json({ docs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/pdf-documents:', msg);
    return NextResponse.json({ error: 'PDF dokümanları alınamadı.' }, { status: 500 });
  }
}

// POST: Yeni PDF Dokümanı Yükleme
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const teacherId = session?.userId || 'teacher-admin';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const fileType = (formData.get('fileType') as PdfDocument['file_type']) || 'deneme';
    const subject = (formData.get('subject') as string) || 'Matematik';
    const gradeLevel = (formData.get('gradeLevel') as string) || 'TYT';
    const topic = (formData.get('topic') as string) || '';
    const publisher = (formData.get('publisher') as string) || '';
    const description = (formData.get('description') as string) || '';
    const answerKey = (formData.get('answerKey') as string) || '';
    const questionCount = parseInt((formData.get('questionCount') as string) || '40');

    if (!file || !title) {
      return NextResponse.json({ error: 'Lütfen dosya ve başlık belirtin.' }, { status: 400 });
    }

    const docId = uuidv4();
    const saved = await saveUploadedPdf(file, docId);

    const newDoc = await createPdfDocument({
      id: docId,
      teacher_id: teacherId,
      title,
      file_name: saved.fileName,
      file_path: saved.publicUrl,
      file_type: fileType,
      subject,
      grade_level: gradeLevel,
      topic,
      publisher,
      file_size_mb: saved.fileSizeMb,
      page_count: Math.max(1, Math.round(saved.fileSizeMb * 4)),
      description,
      answer_key: answerKey,
      question_count: questionCount,
      file_data: saved.base64Data,
    });

    return NextResponse.json({ success: true, doc: newDoc }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/pdf-documents:', msg);
    return NextResponse.json({ error: 'Dosya yüklenirken hata oluştu: ' + msg }, { status: 500 });
  }
}

// DELETE: PDF Silme veya Arşivleme
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action') || 'delete';

    if (!id) {
      return NextResponse.json({ error: 'ID gereklidir.' }, { status: 400 });
    }

    if (action === 'archive') {
      await archivePdfDocument(id, true);
      return NextResponse.json({ success: true, message: 'Arşivlendi.' });
    } else if (action === 'unarchive') {
      await archivePdfDocument(id, false);
      return NextResponse.json({ success: true, message: 'Arşivden çıkarıldı.' });
    } else {
      await deletePdfDocument(id);
      return NextResponse.json({ success: true, message: 'Başarıyla silindi.' });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in DELETE /api/pdf-documents:', msg);
    return NextResponse.json({ error: 'İşlem başarısız oldu: ' + msg }, { status: 500 });
  }
}

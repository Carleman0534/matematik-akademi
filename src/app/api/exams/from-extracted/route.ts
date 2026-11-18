import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { EXAM_PAGE_BUCKET, isConfigured } from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface ExtractedExamItem {
  questionNo: number;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  topicId: string | null;
  imageBase64: string;
  width?: number;
  height?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'teacher') {
      return NextResponse.json({ error: 'Bu işlem için öğretmen yetkisi gereklidir.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, durationMin, classId, mode, penaltyDivisor, questions } = body as {
      title: string;
      durationMin: number;
      classId?: string;
      mode?: 'live' | 'assignment';
      penaltyDivisor?: number;
      questions: ExtractedExamItem[];
    };

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Deneme başlığı ve en az 1 soru gereklidir.' }, { status: 400 });
    }

    const sb = await supabaseServer();

    // 1. Yeni deneme oluştur
    const examInsert = {
      teacher_id: session.userId,
      class_id: classId && classId.trim() ? classId : null,
      title: title.trim().slice(0, 160),
      instructions: 'PDF üzerinden otomatik ayıklanarak oluşturulmuş deneme sınavı.',
      mode: mode === 'live' ? 'live' : 'assignment',
      question_count: questions.length,
      option_count: 5,
      duration_min: Math.max(1, Math.min(600, durationMin || 60)),
      penalty_divisor: [0, 3, 4].includes(Number(penaltyDivisor)) ? Number(penaltyDivisor) : 4,
      status: 'draft',
      results_mode: 'after_close',
    };

    const { data: newExam, error: examErr } = await sb
      .from('exams')
      .insert(examInsert)
      .select('id')
      .single();

    if (examErr || !newExam) {
      return NextResponse.json({ error: `Deneme kaydı oluşturulamadı: ${examErr?.message || 'Bilinmeyen hata'}` }, { status: 500 });
    }

    const examId = newExam.id;
    const publicExamDir = path.join(process.cwd(), 'public', 'uploads', 'exam-pages', examId);
    await mkdir(publicExamDir, { recursive: true });

    const keyRows: any[] = [];
    const pageRows: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = q.questionNo || (i + 1);
      const pageId = uuidv4();
      const fileName = `${pageId}.jpg`;
      const relativePath = `${examId}/${fileName}`;
      const width = q.width || 800;
      const height = q.height || 600;

      if (q.imageBase64 && q.imageBase64.includes('base64,')) {
        const base64Data = q.imageBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const diskPath = path.join(publicExamDir, fileName);
        await writeFile(diskPath, buffer);

        if (isConfigured()) {
          try {
            await sb.storage.from(EXAM_PAGE_BUCKET).upload(relativePath, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });
          } catch (storageErr) {
            console.warn('Storage upload fallback:', storageErr);
          }
        }
      }

      pageRows.push({
        exam_id: examId,
        path: relativePath,
        width,
        height,
        sort_order: i,
      });

      keyRows.push({
        exam_id: examId,
        question_no: qNum,
        correct: q.correctAnswer || null,
        topic_id: q.topicId || null,
        page_no: i + 1,
      });
    }

    if (pageRows.length > 0) {
      await sb.from('exam_pages').insert(pageRows);
    }
    if (keyRows.length > 0) {
      await sb.from('exam_key').insert(keyRows);
    }

    return NextResponse.json({
      success: true,
      examId,
      questionCount: questions.length,
      redirectUrl: `/ogretmen/denemeler/${examId}`,
    });
  } catch (error: any) {
    console.error('Error creating exam from extracted:', error);
    return NextResponse.json({ error: error.message || 'Deneme oluşturulamadı.' }, { status: 500 });
  }
}

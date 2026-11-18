import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET, isConfigured } from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface BulkQuestionItem {
  questionNo: string;
  topicId: string | null;
  initialStatus: 'wrong' | 'blank';
  difficulty?: 'easy' | 'medium' | 'hard';
  correctAnswer?: string | null;
  studentAnswer?: string | null;
  teacherNote?: string | null;
  imageBase64: string; // data:image/jpeg;base64,...
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
    const { studentId, sourceName, sourceId: inputSourceId, questions } = body as {
      studentId: string;
      sourceName?: string;
      sourceId?: string;
      questions: BulkQuestionItem[];
    };

    if (!studentId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Öğrenci ve en az bir soru seçilmelidir.' }, { status: 400 });
    }

    const sb = await supabaseServer();

    // Kaynak kontrolü / oluşturulması
    let sourceId: string | null = inputSourceId || null;
    if (!sourceId && sourceName && sourceName.trim()) {
      const cleanName = sourceName.trim();
      const { data: existing } = await sb
        .from('sources')
        .select('id')
        .ilike('name', cleanName)
        .maybeSingle();

      if (existing) {
        sourceId = existing.id;
      } else {
        const { data: createdSource } = await sb
          .from('sources')
          .insert({ name: cleanName, created_by: session.userId })
          .select('id')
          .maybeSingle();
        if (createdSource) sourceId = createdSource.id;
      }
    }

    const createdIds: string[] = [];
    const errors: string[] = [];

    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions', studentId);
    await mkdir(publicUploadDir, { recursive: true });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const qId = uuidv4();
        let imagePath = '';
        let thumbPath = '';
        const width = q.width || 800;
        const height = q.height || 600;

        // Görsel verisini buffer'a çevir
        if (q.imageBase64 && q.imageBase64.includes('base64,')) {
          const base64Data = q.imageBase64.split('base64,')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `${qId}.jpg`;
          const filePathOnDisk = path.join(publicUploadDir, fileName);
          await writeFile(filePathOnDisk, buffer);

          imagePath = `${studentId}/${fileName}`;
          thumbPath = `${studentId}/${fileName}`;

          // Eğer Supabase Storage devredeyse Storage'a da yüklemeyi dene
          if (isConfigured()) {
            try {
              await sb.storage.from(IMAGE_BUCKET).upload(imagePath, buffer, {
                contentType: 'image/jpeg',
                upsert: true,
              });
            } catch (storageErr) {
              console.warn('Storage upload fallback to local:', storageErr);
            }
          }
        }

        // create_question RPC çağrısı
        const imagesPayload = imagePath
          ? [{ path: imagePath, thumb_path: thumbPath, width, height }]
          : [];

        const rpcPayload = {
          student_id: studentId,
          topic_id: q.topicId || null,
          source_id: sourceId,
          initial_status: q.initialStatus === 'blank' ? 'blank' : 'wrong',
          difficulty: q.difficulty || 'medium',
          question_no: q.questionNo || String(i + 1),
          correct_answer: q.correctAnswer || null,
          student_answer: q.studentAnswer || null,
          teacher_note: q.teacherNote || '',
          student_note: '',
          images: imagesPayload,
        };

        const { data: newQId, error: rpcErr } = await sb.rpc('create_question', { p: rpcPayload });

        if (rpcErr) {
          // Eğer RPC doğrudan desteklemiyorsa düz insert fallback yap
          const { data: directInsert, error: directErr } = await sb
            .from('questions')
            .insert({
              student_id: studentId,
              topic_id: q.topicId || null,
              source_id: sourceId,
              initial_status: q.initialStatus === 'blank' ? 'blank' : 'wrong',
              difficulty: q.difficulty || 'medium',
              question_no: q.questionNo || String(i + 1),
              correct_answer: q.correctAnswer || null,
              student_answer: q.studentAnswer || null,
              teacher_note: q.teacherNote || null,
              created_by: session.userId,
            })
            .select('id')
            .single();

          if (directErr) {
            throw new Error(`Soru ${i + 1} eklenemedi: ${directErr.message}`);
          }

          if (directInsert && imagePath) {
            await sb.from('question_images').insert({
              question_id: directInsert.id,
              path: imagePath,
              thumb_path: thumbPath,
              width,
              height,
              sort_order: 0,
            });
            await sb.from('question_attempts').insert({
              question_id: directInsert.id,
              student_id: studentId,
              result: q.initialStatus === 'blank' ? 'blank' : 'incorrect',
              attempt_type: 'initial',
              created_by: session.userId,
            });
          }
          createdIds.push(directInsert.id);
        } else if (newQId) {
          createdIds.push(String(newQId));
        }
      } catch (err: any) {
        console.error(`Soru ${i + 1} hatası:`, err);
        errors.push(`Soru ${i + 1}: ${err.message || 'Hata'}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdCount: createdIds.length,
      createdIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in bulk-import:', error);
    return NextResponse.json({ error: error.message || 'Sorular aktarılamadı.' }, { status: 500 });
  }
}

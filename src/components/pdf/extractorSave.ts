'use client';
// PDF'ten kırpılan soruları kaydeder. Görseller tarayıcıdan doğrudan gizli kovalara yüklenir (sunucuya büyük istek
// gitmez, Vercel'in 4,5 MB sınırına takılmaz); yetkiyi veritabanı ve depolama kuralları denetler.
import { supabaseBrowser } from '@/lib/supabase/client';
import { IMAGE_BUCKET, EXAM_PAGE_BUCKET } from '@/lib/env';
import { ensureSource } from '@/app/soru/actions';
import { createExam, addPages, saveKey } from '@/app/ogretmen/denemeler/actions';
import type { Letter } from '@/lib/exams';

export interface CroppedItem {
  questionNo: number; imageDataUrl: string; width: number; height: number;
  correctAnswer: Letter | null; topicId: string; difficulty: 'easy' | 'medium' | 'hard'; initialStatus: 'wrong' | 'blank'; teacherNote: string;
}

const toBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

// Öğrencinin soru bankasına: her kırpılan soru ayrı soru olur
export async function importToStudentBank(studentId: string, sourceName: string, items: CroppedItem[], onProgress: (done: number) => void): Promise<{ created: number; errors: string[] }> {
  const sb = supabaseBrowser();
  const src = sourceName.trim() ? await ensureSource(sourceName) : {};
  if (src.error) return { created: 0, errors: [src.error] };
  let created = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    try {
      const path = `${studentId}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from(IMAGE_BUCKET).upload(path, await toBlob(q.imageDataUrl), { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { error } = await sb.rpc('create_question', { p: {
        student_id: studentId, topic_id: q.topicId || '', source_id: src.id || '', initial_status: q.initialStatus,
        difficulty: q.difficulty, question_no: String(q.questionNo), correct_answer: q.correctAnswer || '',
        teacher_note: q.teacherNote || '', images: [{ path, thumb_path: path, width: q.width, height: q.height }],
      } });
      if (error) { await sb.storage.from(IMAGE_BUCKET).remove([path]); throw new Error(error.message); }
      created++;
    } catch (e) {
      errors.push(`Soru ${q.questionNo}: ${(e as Error).message}`);
    }
    onProgress(i + 1);
  }
  return { created, errors };
}

// Yeni deneme: her kırpılan soru bir sayfa olur, cevap ve konu anahtara yazılır. Taslak olarak açılır.
export async function createExamFromCrops(title: string, durationMin: number, items: CroppedItem[], onProgress: (done: number) => void): Promise<{ id?: string; error?: string }> {
  const r = await createExam({
    title, instructions: '', mode: 'assignment', class_id: '', question_count: items.length, option_count: 5,
    duration_min: durationMin, penalty_divisor: 4, opens_at: '', closes_at: new Date(Date.now() + 7 * 86400000).toISOString(), results_mode: 'after_close',
  });
  if (r.error || !r.id) return { error: r.error || 'Deneme oluşturulamadı.' };
  const sb = supabaseBrowser();
  const pages: { path: string; width: number; height: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const path = `${r.id}/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from(EXAM_PAGE_BUCKET).upload(path, await toBlob(items[i].imageDataUrl), { contentType: 'image/jpeg', upsert: false });
    if (up.error) { if (pages.length) await addPages(r.id, pages); return { id: r.id, error: `Soru ${i + 1} yüklenemedi: ${up.error.message}` }; }
    pages.push({ path, width: items[i].width, height: items[i].height });
    onProgress(i + 1);
  }
  const p = await addPages(r.id, pages);
  if (p.error) return { id: r.id, error: p.error };
  const k = await saveKey(r.id, items.map((q, i) => ({ question_no: i + 1, correct: q.correctAnswer, topic_id: q.topicId || null, page_no: i + 1 })));
  return { id: r.id, error: k.error };
}

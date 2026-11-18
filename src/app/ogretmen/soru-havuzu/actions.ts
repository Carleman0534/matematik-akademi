'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { POOL_BUCKET, EXAM_PAGE_BUCKET } from '@/lib/env';
import { QUESTION_TYPES } from '@/lib/pool';
import { createExam, addPages, saveKey } from '@/app/ogretmen/denemeler/actions';
import type { Letter } from '@/lib/exams';

export interface PoolResult { error?: string; ok?: string; id?: string }
export interface PoolPatch {
  topic_id?: string | null; outcome_id?: string | null; difficulty?: number | null; question_type?: string | null;
  has_visual?: boolean | null; correct?: string | null; status?: 'draft' | 'approved' | 'rejected' | 'archived';
}

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}
const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);
const done = () => { revalidatePath('/ogretmen/soru-havuzu', 'layout'); revalidatePath('/ogretmen/pdf-arsivi'); };

// İnceleme bitince PDF "tamamlandı" olur (onay bekleyen soru kalmadıysa)
async function refreshPdfStatus(sb: Awaited<ReturnType<typeof supabaseServer>>, pdfIds: string[]) {
  for (const pdf of [...new Set(pdfIds.filter(Boolean))]) {
    const { count } = await sb.from('pool_questions').select('id', { count: 'exact', head: true }).eq('pdf_id', pdf).eq('status', 'draft');
    const { count: total } = await sb.from('pool_questions').select('id', { count: 'exact', head: true }).eq('pdf_id', pdf).neq('status', 'rejected');
    await sb.from('pdf_documents').update({ analysis_status: count ? 'review' : 'done', question_count: total ?? null }).eq('id', pdf).in('analysis_status', ['review', 'done']);
  }
}

export async function updatePoolQuestions(ids: string[], patch: PoolPatch): Promise<PoolResult> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const list = ids.filter(isUuid).slice(0, 500);
  if (!list.length) return { error: 'Soru seçin.' };
  const row: Record<string, unknown> = {};
  if ('topic_id' in patch) row.topic_id = isUuid(patch.topic_id) ? patch.topic_id : null;
  if ('outcome_id' in patch) row.outcome_id = isUuid(patch.outcome_id) ? patch.outcome_id : null;
  if ('difficulty' in patch) row.difficulty = patch.difficulty && patch.difficulty >= 1 && patch.difficulty <= 5 ? Math.round(patch.difficulty) : null;
  if ('question_type' in patch) row.question_type = patch.question_type && patch.question_type in QUESTION_TYPES ? patch.question_type : null;
  if ('has_visual' in patch) row.has_visual = patch.has_visual ?? null;
  if ('correct' in patch) row.correct = patch.correct && /^[A-E]$/.test(patch.correct) ? patch.correct : null;
  const sb = await supabaseServer();
  if (patch.status) {
    if (patch.status === 'approved') {
      // Konusu olmayan soru havuza onaylanmaz (konu bazlı çalışmalarda kaybolur)
      const { data: noTopic } = await sb.from('pool_questions').select('id').in('id', list).is('topic_id', null);
      const missing = 'topic_id' in row ? (row.topic_id ? [] : list) : (noTopic || []).map(r => r.id);
      if (missing.length) return { error: `${missing.length} sorunun konusu seçilmemiş; önce konu verin.` };
      row.approved_at = new Date().toISOString();
    }
    row.status = patch.status;
  }
  if (!Object.keys(row).length) return {};
  const { data, error } = await sb.from('pool_questions').update(row).in('id', list).select('pdf_id');
  if (error) return { error: 'Kaydedilemedi: ' + error.message };
  if (patch.status) await refreshPdfStatus(sb, (data || []).map(d => d.pdf_id as string));
  done();
  return { ok: patch.status === 'approved' ? `${list.length} soru onaylandı.` : patch.status === 'rejected' ? `${list.length} soru reddedildi.` : 'Kaydedildi.' };
}

export async function setPoolExtraTopics(id: string, topicIds: string[]): Promise<PoolResult> {
  if (!(await teacher()) || !isUuid(id)) return { error: 'Yetkiniz yok.' };
  const want = [...new Set(topicIds.filter(isUuid))].slice(0, 10);
  const sb = await supabaseServer();
  const { error: dErr } = await sb.from('pool_question_topics').delete().eq('question_id', id);
  if (dErr) return { error: dErr.message };
  if (want.length) {
    const { error } = await sb.from('pool_question_topics').insert(want.map(topic_id => ({ question_id: id, topic_id })));
    if (error) return { error: error.message };
  }
  done();
  return { ok: 'Yardımcı konular kaydedildi.' };
}

// Seçilen havuz sorularından online deneme (taslak): her soru bir sayfa; cevap, konu ve sayfa anahtara yazılır
export async function createExamFromPool(ids: string[], title: string, durationMin: number): Promise<PoolResult> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  const list = ids.filter(isUuid).slice(0, 200);
  if (!list.length) return { error: 'Soru seçin.' };
  const sb = await supabaseServer();
  const { data } = await sb.from('pool_questions').select('id, image_path, width, height, correct, topic_id, option_count, status').in('id', list);
  const rows = ((data || []) as { id: string; image_path: string; width: number | null; height: number | null; correct: Letter | null; topic_id: string | null; option_count: number; status: string }[])
    .sort((a, b) => list.indexOf(a.id) - list.indexOf(b.id));
  if (rows.some(r => r.status !== 'approved')) return { error: 'Yalnızca onaylanmış sorulardan deneme oluşturulabilir.' };
  const opt = rows.some(r => r.option_count === 5 || r.correct === 'E') ? 5 : 4;
  const ex = await createExam({
    title: String(title || '').trim() || 'Havuzdan deneme', instructions: '', mode: 'assignment', class_id: '', question_count: rows.length,
    option_count: opt, duration_min: Math.max(1, Math.min(600, Math.round(durationMin) || rows.length * 2)), penalty_divisor: opt === 4 ? 3 : 4,
    opens_at: '', closes_at: new Date(Date.now() + 7 * 86400000).toISOString(), results_mode: 'after_close',
  });
  if (ex.error || !ex.id) return { error: ex.error || 'Deneme oluşturulamadı.' };
  const pages: { path: string; width: number; height: number }[] = [];
  for (const r of rows) {
    const to = `${ex.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from(POOL_BUCKET).copy(r.image_path, to, { destinationBucket: EXAM_PAGE_BUCKET });
    if (error) return { id: ex.id, error: `Görsel kopyalanamadı: ${error.message}. Deneme taslak olarak oluşturuldu.` };
    pages.push({ path: to, width: r.width || 0, height: r.height || 0 });
  }
  const p = await addPages(ex.id, pages);
  if (p.error) return { id: ex.id, error: p.error };
  const k = await saveKey(ex.id, rows.map((r, i) => ({ question_no: i + 1, correct: r.correct, topic_id: r.topic_id, page_no: i + 1 })));
  if (k.error) return { id: ex.id, error: k.error };
  return { id: ex.id, ok: `${rows.length} soruluk deneme taslağı oluşturuldu.` };
}

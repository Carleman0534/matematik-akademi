'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { ERROR_TYPES } from '@/lib/labels';

export interface ActionResult { error?: string; ok?: string; id?: string }

// Kaynak (kitap/deneme) adını bul ya da oluştur
export async function ensureSource(name: string): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { error: 'Oturum bulunamadı; yeniden giriş yapın.' };
  const n = String(name || '').trim().slice(0, 160);
  if (!n) return {};
  const sb = await supabaseServer();
  const pattern = n.replace(/[%_\\]/g, m => '\\' + m); // joker karakterler düz harf sayılsın (büyük/küçük harf duyarsız eşitlik)
  const { data: found } = await sb.from('sources').select('id').ilike('name', pattern).maybeSingle();
  if (found) return { id: found.id };
  const { data, error } = await sb.from('sources').insert({ name: n, created_by: s.userId }).select('id').single();
  if (error) {
    const { data: again } = await sb.from('sources').select('id').ilike('name', pattern).maybeSingle(); // aynı anda eklendiyse
    return again ? { id: again.id } : { error: 'Kaynak eklenemedi: ' + error.message };
  }
  return { id: data.id };
}

// Sorunun yeniden çözümünü kaydet (geçmiş korunur: her çözüm yeni kayıt)
export async function addAttempt(questionId: string, result: 'correct' | 'incorrect' | 'blank', timeSpentSec?: number, note?: string): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { error: 'Oturum bulunamadı; yeniden giriş yapın.' };
  if (!['correct', 'incorrect', 'blank'].includes(result)) return { error: 'Geçersiz sonuç.' };
  const sb = await supabaseServer();
  const { data: q } = await sb.from('questions').select('student_id, archived_at').eq('id', questionId).maybeSingle();
  if (!q) return { error: 'Soru bulunamadı.' };
  const { error } = await sb.from('question_attempts').insert({
    question_id: questionId, student_id: q.student_id, result, attempt_type: 'review', created_by: s.userId,
    time_spent_sec: Number.isFinite(timeSpentSec) && (timeSpentSec as number) >= 0 ? Math.min(Math.round(timeSpentSec as number), 86400) : null,
    note: String(note || '').trim().slice(0, 500) || null,
  });
  if (error) return { error: 'Kaydedilemedi: ' + error.message };
  revalidatePath('/soru/' + questionId);
  return { ok: 'Kaydedildi.' };
}

const DIFFS = ['easy', 'medium', 'hard'];
const clean = (v: FormDataEntryValue | null, max = 2000) => { const t = String(v ?? '').trim().slice(0, max); return t || null; };

export async function updateQuestion(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { error: 'Oturum bulunamadı; yeniden giriş yapın.' };
  const id = String(form.get('id') || '');
  const status = String(form.get('initial_status') || '');
  const diff = String(form.get('difficulty') || '');
  const errType = clean(form.get('error_type'), 60);
  let sourceId = clean(form.get('source_id'), 60);
  const newSource = clean(form.get('new_source'), 160);
  if (newSource) { const r = await ensureSource(newSource); if (r.error) return r; sourceId = r.id || null; }
  const patch: Record<string, string | null> = {
    topic_id: clean(form.get('topic_id'), 60), source_id: sourceId,
    initial_status: status === 'blank' ? 'blank' : 'wrong', difficulty: DIFFS.includes(diff) ? diff : null,
    page_no: clean(form.get('page_no'), 20), test_no: clean(form.get('test_no'), 40), question_no: clean(form.get('question_no'), 20),
    question_text: clean(form.get('question_text'), 4000), correct_answer: clean(form.get('correct_answer'), 200), student_answer: clean(form.get('student_answer'), 200),
    error_type: errType && ERROR_TYPES.includes(errType) ? errType : null, solution: clean(form.get('solution'), 6000), student_note: clean(form.get('student_note'), 2000),
  };
  if (s.role === 'teacher') patch.teacher_note = clean(form.get('teacher_note'), 2000);
  const sb = await supabaseServer();
  const { error } = await sb.from('questions').update(patch).eq('id', id);
  if (error) return { error: 'Kaydedilemedi: ' + error.message };
  revalidatePath('/soru/' + id);
  return { ok: 'Kaydedildi.' };
}

// Silme yerine arşivleme: soru ve geçmişi korunur, bankada görünmez
export async function setArchived(id: string, archived: boolean): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { error: 'Oturum bulunamadı; yeniden giriş yapın.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('questions').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/soru/' + id);
  return { ok: archived ? 'Arşive taşındı.' : 'Arşivden çıkarıldı.' };
}

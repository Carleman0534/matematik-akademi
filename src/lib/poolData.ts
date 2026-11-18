import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { POOL_BUCKET } from '@/lib/env';
import { descendantIds, type Topic } from '@/lib/topics';

export interface PoolQ {
  id: string; pdf_id: string | null; source_label: string | null; page_no: number | null; question_no: number | null; section: string;
  image_path: string; width: number | null; height: number | null; option_count: number; correct: string | null;
  topic_id: string | null; outcome_id: string | null; difficulty: number | null; question_type: string | null; has_visual: boolean | null;
  detect_method: string | null; confidence: number | null; duplicate_of: string | null; status: string; created_at: string;
  pool_question_topics: { topic_id: string }[]; url: string | null;
}
export interface PoolFilters { pdf?: string; konu?: string; zorluk?: string; tur?: string; gorsel?: string; durum?: string; benzer?: string; yayin?: string }

export const POOL_SELECT = 'id, pdf_id, source_label, page_no, question_no, section, image_path, width, height, option_count, correct, topic_id, outcome_id, difficulty, question_type, has_visual, detect_method, confidence, duplicate_of, status, created_at, pool_question_topics(topic_id)';
export const POOL_LIMIT = 300;

export async function signPool(sb: SupabaseClient, rows: Omit<PoolQ, 'url'>[]): Promise<PoolQ[]> {
  const urls = new Map<string, string>();
  for (let i = 0; i < rows.length; i += 100) {
    const { data } = await sb.storage.from(POOL_BUCKET).createSignedUrls(rows.slice(i, i + 100).map(r => r.image_path), 3600);
    (data || []).forEach(d => { if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl); });
  }
  return rows.map(r => ({ ...r, url: urls.get(r.image_path) || null }));
}

// Havuz listesi: konu filtresi alt konuları ve yardımcı konuları da kapsar
export async function listPool(sb: SupabaseClient, teacherId: string, f: PoolFilters, topics: Topic[], pdfIdsByPublisher?: string[]): Promise<{ rows: PoolQ[]; truncated: boolean }> {
  let q = sb.from('pool_questions').select(POOL_SELECT).eq('teacher_id', teacherId).order('pdf_id').order('section').order('question_no').limit(POOL_LIMIT + 1);
  const durum = f.durum || 'approved';
  if (durum !== 'all') q = q.eq('status', durum); else q = q.neq('status', 'rejected');
  if (f.pdf && /^[0-9a-f-]{36}$/i.test(f.pdf)) q = q.eq('pdf_id', f.pdf);
  if (pdfIdsByPublisher) q = q.in('pdf_id', pdfIdsByPublisher.length ? pdfIdsByPublisher : ['00000000-0000-0000-0000-000000000000']);
  if (f.zorluk && /^[1-5]$/.test(f.zorluk)) q = q.eq('difficulty', Number(f.zorluk));
  if (f.tur) q = q.eq('question_type', f.tur);
  if (f.gorsel === '1') q = q.or('has_visual.eq.true,question_type.eq.gorsel_geometrik');
  if (f.benzer !== 'goster') q = q.is('duplicate_of', null);
  if (f.konu) {
    const ids = descendantIds(topics, f.konu);
    const safe = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
    const { data: rel } = await sb.from('pool_question_topics').select('question_id, pool_questions!inner(teacher_id)').in('topic_id', safe).eq('pool_questions.teacher_id', teacherId).limit(POOL_LIMIT);
    const relIds = [...new Set(((rel || []) as { question_id: string }[]).map(r => r.question_id))];
    q = relIds.length ? q.or(`topic_id.in.(${safe.join(',')}),id.in.(${relIds.join(',')})`) : q.in('topic_id', safe);
  }
  const { data } = await q;
  const rows = (data || []) as Omit<PoolQ, 'url'>[];
  return { rows: await signPool(sb, rows.slice(0, POOL_LIMIT)), truncated: rows.length > POOL_LIMIT };
}

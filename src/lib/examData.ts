import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EXAM_PAGE_BUCKET } from '@/lib/env';
import type { KeyRow, Letter, ExamTiming } from '@/lib/exams';

export interface ExamRow extends ExamTiming {
  id: string; teacher_id: string; class_id: string | null; title: string; instructions: string | null;
  question_count: number; option_count: number; penalty_divisor: number;
  results_mode: 'after_close' | 'after_submit' | 'never'; created_at: string;
}
export interface PageRow { id: string; path: string; width: number | null; height: number | null; sort_order: number; url: string | null }
export interface MatrixRow { session_id: string; student_id: string; started_at: string; deadline: string; submitted_at: string | null; last_seen_at: string; current_q: number | null; transferred_at: string | null; answers: string | null }

export const EXAM_SELECT = 'id, teacher_id, class_id, title, instructions, mode, question_count, option_count, duration_min, penalty_divisor, opens_at, closes_at, status, started_at, results_mode, created_at';

export async function getExam(sb: SupabaseClient, id: string): Promise<ExamRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from('exams').select(EXAM_SELECT).eq('id', id).maybeSingle();
  return (data as ExamRow) || null;
}

// Sayfalar ve süreli adresleri (RLS + depolama kuralları: öğrenci deneme açılmadan göremez)
export async function getPages(sb: SupabaseClient, examId: string, seconds = 3600): Promise<PageRow[]> {
  const { data } = await sb.from('exam_pages').select('id, path, width, height, sort_order').eq('exam_id', examId).order('sort_order');
  const pages = (data || []) as Omit<PageRow, 'url'>[];
  const urls = new Map<string, string>();
  if (pages.length) {
    const { data: signed } = await sb.storage.from(EXAM_PAGE_BUCKET).createSignedUrls(pages.map(p => p.path), seconds);
    (signed || []).forEach(s => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
  }
  return pages.map(p => ({ ...p, url: urls.get(p.path) || null }));
}

export async function getKey(sb: SupabaseClient, examId: string): Promise<Map<number, KeyRow>> {
  const { data } = await sb.from('exam_key').select('question_no, correct, topic_id, page_no').eq('exam_id', examId).order('question_no');
  return new Map(((data || []) as KeyRow[]).map(k => [k.question_no, { ...k, correct: (k.correct as Letter | null) || null }]));
}

// Denemeye atanmış (aktif) öğrenciler: seçili öğrenciler varsa yalnızca onlar; yoksa sınıf ya da öğretmenin bütün öğrencileri
export async function getAssignees(sb: SupabaseClient, examId: string): Promise<string[]> {
  const { data } = await sb.from('exam_assignees').select('student_id').eq('exam_id', examId);
  return ((data || []) as { student_id: string }[]).map(r => r.student_id);
}

export async function eligibleStudents(sb: SupabaseClient, exam: Pick<ExamRow, 'id' | 'teacher_id' | 'class_id'>): Promise<{ id: string; full_name: string }[]> {
  let q = sb.from('students').select('id, full_name').eq('teacher_id', exam.teacher_id).eq('is_active', true).order('full_name');
  if (exam.class_id) q = q.eq('class_id', exam.class_id);
  const [{ data }, picked] = await Promise.all([q, getAssignees(sb, exam.id)]);
  const list = (data || []) as { id: string; full_name: string }[];
  return picked.length ? list.filter(s => picked.includes(s.id)) : list;
}

export async function answerMatrix(sb: SupabaseClient, examId: string): Promise<MatrixRow[]> {
  const { data, error } = await sb.rpc('exam_answer_matrix', { eid: examId });
  if (error) throw new Error(error.message);
  return (data || []) as MatrixRow[];
}

// Oturum bitti mi? (teslim edildi ya da süre doldu)
export const sessionDone = (m: Pick<MatrixRow, 'submitted_at' | 'deadline'>, now: number = Date.now()): boolean => !!m.submitted_at || Date.parse(m.deadline) < now;

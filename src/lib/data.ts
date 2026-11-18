import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET, EXAM_PAGE_BUCKET, POOL_BUCKET } from '@/lib/env';
import { analyzeQuestion, summarize, type Attempt, type QuestionAnalysis, type BankSummary } from '@/lib/learning';
import { descendantIds, topicPath, type Topic } from '@/lib/topics';
import { matchesComputed, sanitizeSearch, type BankFilters } from '@/lib/filters';

export interface ImageRow { id: string; path: string; thumb_path: string | null; sort_order: number; width?: number | null; height?: number | null }
export interface AttemptRow extends Attempt { id: string; time_spent_sec: number | null; note: string | null }
export interface QuestionRow {
  id: string; student_id: string; topic_id: string | null; source_id: string | null;
  initial_status: 'wrong' | 'blank'; difficulty: 'easy' | 'medium' | 'hard' | null;
  page_no: string | null; test_no: string | null; question_no: string | null;
  question_text: string | null; correct_answer: string | null; student_answer: string | null; error_type: string | null;
  solution: string | null; teacher_note: string | null; student_note: string | null;
  created_at: string; archived_at: string | null; outcome_id: string | null;
  question_images: ImageRow[]; question_attempts: AttemptRow[];
  question_topic_relations?: { topic_id: string; role: string }[];   // yardımcı konular
}
export interface Source { id: string; name: string }
export interface StudentRow { id: string; profile_id: string | null; full_name: string; grade_level: number | null; school_name: string | null; is_active: boolean; notes: string | null; created_at: string; class_id: string | null; teacher_id: string | null; daily_goal: number }
export interface ClassRow { id: string; name: string; join_code: string; is_open: boolean; teacher_id: string; created_at: string }

// Öğretmenin sınıfları (RLS: yalnızca kendi sınıfları; yönetici hepsini görür, bu yüzden öğretmene göre süzülür)
export async function getClasses(sb: SupabaseClient, teacherId: string): Promise<ClassRow[]> {
  const { data } = await sb.from('classes').select('id, name, join_code, is_open, teacher_id, created_at').eq('teacher_id', teacherId).order('name');
  return (data || []) as ClassRow[];
}
export interface BankItem { q: QuestionRow; a: QuestionAnalysis; thumbUrl: string | null; topic: string; source: string }

const Q_SELECT = 'id, student_id, topic_id, source_id, initial_status, difficulty, page_no, test_no, question_no, question_text, correct_answer, student_answer, error_type, solution, teacher_note, student_note, created_at, archived_at, outcome_id, question_topic_relations(topic_id, role), question_images(id, path, thumb_path, sort_order, width, height), question_attempts(id, result, attempt_type, attempted_at, time_spent_sec, note)';
export const BANK_LIMIT = 400;

export async function getTopics(sb: SupabaseClient): Promise<Topic[]> {
  const { data } = await sb.from('topics').select('id, parent_id, name, grade_level, sort_order, is_active, description').order('sort_order');
  return (data || []) as Topic[];
}

export interface Outcome { id: string; topic_id: string; code: string | null; text: string; sort_order: number; is_active: boolean }
export async function getOutcomes(sb: SupabaseClient): Promise<Outcome[]> {
  const { data } = await sb.from('curriculum_outcomes').select('id, topic_id, code, text, sort_order, is_active').order('sort_order');
  return (data || []) as Outcome[];
}

export async function getSources(sb: SupabaseClient): Promise<Source[]> {
  const { data } = await sb.from('sources').select('id, name').order('name');
  return (data || []) as Source[];
}

// Gizli kovadaki görseller için süreli (1 saat) adresler. "exam-pages:<yol>" biçimindeki yollar deneme sayfası
// kovasından okunur (denemeden soru bankasına aktarılan sorular, sayfa görselini kopyalamadan kullanır).
export const EXAM_PAGE_PREFIX = 'exam-pages:';
export const POOL_PREFIX = 'question-pool:';
export async function signedUrlMap(sb: SupabaseClient, paths: string[], seconds = 3600): Promise<Map<string, string>> {
  const list = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, string>();
  const groups: [string, string[], (p: string) => string][] = [
    [IMAGE_BUCKET, list.filter(p => !p.startsWith(EXAM_PAGE_PREFIX) && !p.startsWith(POOL_PREFIX)), p => p],
    [POOL_BUCKET, list.filter(p => p.startsWith(POOL_PREFIX)).map(p => p.slice(POOL_PREFIX.length)), p => POOL_PREFIX + p],
    [EXAM_PAGE_BUCKET, list.filter(p => p.startsWith(EXAM_PAGE_PREFIX)).map(p => p.slice(EXAM_PAGE_PREFIX.length)), p => EXAM_PAGE_PREFIX + p],
  ];
  for (const [bucket, items, key] of groups) {
    for (let i = 0; i < items.length; i += 100) {
      const { data } = await sb.storage.from(bucket).createSignedUrls(items.slice(i, i + 100), seconds);
      (data || []).forEach(d => { if (d.signedUrl && d.path) out.set(key(d.path), d.signedUrl); });
    }
  }
  return out;
}

export async function fetchBank(sb: SupabaseClient, studentId: string, f: BankFilters, topics: Topic[], sources: Source[]): Promise<{ items: BankItem[]; truncated: boolean }> {
  let query = sb.from('questions').select(Q_SELECT).eq('student_id', studentId).order('created_at', { ascending: false }).limit(BANK_LIMIT + 1);
  query = f.arsiv ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  if (f.durum) query = query.eq('initial_status', f.durum);
  if (f.zorluk) query = query.eq('difficulty', f.zorluk);
  if (f.kaynak) query = query.eq('source_id', f.kaynak);
  if (f.baslangic) query = query.gte('created_at', f.baslangic + 'T00:00:00+03:00');
  if (f.bitis) query = query.lte('created_at', f.bitis + 'T23:59:59+03:00');
  let topicIds: string[] | null = null;
  if (f.konu) topicIds = descendantIds(topics, f.konu);
  else if (f.sinif) topicIds = topics.filter(t => String(t.grade_level) === f.sinif).map(t => t.id);
  if (topicIds) {
    // Ana konusu ya da yardımcı konularından biri seçilen konu (veya alt konusu) olan sorular
    const ids = topicIds.length ? topicIds : ['00000000-0000-0000-0000-000000000000'];
    const { data: rel } = await sb.from('question_topic_relations').select('question_id, questions!inner(student_id)')
      .in('topic_id', ids).eq('questions.student_id', studentId).limit(BANK_LIMIT);
    const relIds = [...new Set(((rel || []) as { question_id: string }[]).map(r => r.question_id))];
    query = relIds.length ? query.or(`topic_id.in.(${ids.join(',')}),id.in.(${relIds.join(',')})`) : query.in('topic_id', ids);
  }
  const term = sanitizeSearch(f.q);
  if (term) query = query.or(['question_text', 'student_note', 'teacher_note', 'solution', 'question_no', 'test_no'].map(c => c + '.ilike.%' + term + '%').join(','));

  const { data, error } = await query;
  if (error) throw new Error('Sorular yüklenemedi: ' + error.message);
  const rows = (data || []) as unknown as QuestionRow[];
  const truncated = rows.length > BANK_LIMIT;
  const srcName = new Map(sources.map(s => [s.id, s.name]));
  const analyzed = rows.slice(0, BANK_LIMIT)
    .map(q => ({ q, a: analyzeQuestion(q.created_at, q.question_attempts) }))
    .filter(x => matchesComputed(f, x.a));
  const firstImg = (q: QuestionRow) => [...q.question_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const urls = await signedUrlMap(sb, analyzed.map(x => { const i = firstImg(x.q); return i ? (i.thumb_path || i.path) : ''; }));
  return {
    truncated,
    items: analyzed.map(({ q, a }) => {
      const i = firstImg(q);
      return { q, a, thumbUrl: i ? urls.get(i.thumb_path || i.path) || null : null, topic: topicPath(topics, q.topic_id), source: q.source_id ? srcName.get(q.source_id) || '' : '' };
    }),
  };
}

export async function getQuestion(sb: SupabaseClient, id: string): Promise<QuestionRow | null> {
  const { data } = await sb.from('questions').select(Q_SELECT).eq('id', id).maybeSingle();
  return (data as unknown as QuestionRow) || null;
}

export async function getStudent(sb: SupabaseClient, id: string): Promise<StudentRow | null> {
  const { data } = await sb.from('students').select('id, profile_id, full_name, grade_level, school_name, is_active, notes, created_at, class_id, teacher_id, daily_goal').eq('id', id).maybeSingle();
  return (data as StudentRow) || null;
}

// Son N günde hiç soru eklememiş ve tekrar yapmamış öğrenciler
export function idleStudents<T extends { id: string }>(students: T[], lastActivity: Map<string, string>, days: number): T[] {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return students.filter(s => !((lastActivity.get(s.id) || '') > since));
}

type SummaryQ ={ student_id: string; initial_status: string; created_at: string; archived_at: string | null; question_attempts: Attempt[] };

// Bir ya da tüm öğrencilerin banka özeti (öğretmen paneli, öğrenci ana sayfası)
export async function bankSummaries(sb: SupabaseClient, studentId?: string): Promise<{ byStudent: Map<string, BankSummary>; lastActivity: Map<string, string>; all: BankSummary }> {
  let q = sb.from('questions').select('student_id, initial_status, created_at, archived_at, question_attempts(result, attempt_type, attempted_at)');
  if (studentId) q = q.eq('student_id', studentId);
  const { data } = await q;
  const rows = (data || []) as unknown as SummaryQ[];
  const groups = new Map<string, SummaryQ[]>();
  const last = new Map<string, string>();
  rows.forEach(r => {
    groups.set(r.student_id, [...(groups.get(r.student_id) || []), r]);
    const times = [r.created_at, ...r.question_attempts.map(a => a.attempted_at)];
    times.forEach(t => { if (!last.get(r.student_id) || t > (last.get(r.student_id) as string)) last.set(r.student_id, t); });
  });
  const byStudent = new Map<string, BankSummary>();
  groups.forEach((list, id) => byStudent.set(id, summarize(list)));
  return { byStudent, lastActivity: last, all: summarize(rows) };
}

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activeOnly, type Topic } from '@/lib/topics';
import { unitPerformance, type Evidence, type PoolItem, type Result, type UnitPerf } from '@/lib/studyEngine';

const DIFF_MAP: Record<string, number> = { easy: 2, medium: 3, hard: 4 };

// Öğrencinin bütün kanıtı: denemeler, soru bankası tekrarları ve çalışma planı cevapları.
// Aynı hata iki kez sayılmasın diye bankaya deneme / çalışmadan aktarılan soruların ilk (initial) kaydı hariç tutulur.
export async function loadEvidence(sb: SupabaseClient, studentId: string, role: 'teacher' | 'student'): Promise<Evidence[]> {
  const out: Evidence[] = [];
  const now = Date.now();

  // 1) Denemeler (öğrenci için yalnızca sonuçları açılmış denemelerin anahtarı görünür; RLS)
  const { data: ses } = await sb.from('exam_sessions').select('id, exam_id, submitted_at, deadline').eq('student_id', studentId);
  const done = ((ses || []) as { id: string; exam_id: string; submitted_at: string | null; deadline: string }[]).filter(s => s.submitted_at || Date.parse(s.deadline) < now);
  if (done.length) {
    const [{ data: keys }, { data: ans }] = await Promise.all([
      sb.from('exam_key').select('exam_id, question_no, correct, topic_id').in('exam_id', [...new Set(done.map(s => s.exam_id))]).not('correct', 'is', null).limit(20000),
      sb.from('exam_answers').select('session_id, question_no, answer').in('session_id', done.map(s => s.id)).limit(50000),
    ]);
    const keyBy = new Map(((keys || []) as { exam_id: string; question_no: number; correct: string; topic_id: string | null }[]).map(k => [`${k.exam_id}|${k.question_no}`, k]));
    const ansBy = new Map(((ans || []) as { session_id: string; question_no: number; answer: string | null }[]).map(a => [`${a.session_id}|${a.question_no}`, a.answer]));
    for (const s of done) {
      for (const [k, key] of keyBy) {
        if (!k.startsWith(s.exam_id + '|') || !key.topic_id) continue;
        const a = ansBy.get(`${s.id}|${key.question_no}`) ?? null;
        out.push({ topic_id: key.topic_id, result: !a ? 'blank' : a === key.correct ? 'correct' : 'incorrect', difficulty: null, type: null, at: s.submitted_at || s.deadline, source: 'exam' });
      }
    }
  }

  // 2) Soru bankası: tekrar çözümleri; ilk kayıt yalnızca öğrencinin kendi/öğretmenin dış kaynaktan eklediği sorularda
  const { data: att } = await sb.from('question_attempts')
    .select('result, attempt_type, attempted_at, questions!inner(topic_id, difficulty, question_images(path))').eq('student_id', studentId).limit(30000);
  type AttRow = { result: Result; attempt_type: string; attempted_at: string; questions: { topic_id: string | null; difficulty: string | null; question_images: { path: string }[] } | { topic_id: string | null; difficulty: string | null; question_images: { path: string }[] }[] };
  for (const a of (att || []) as unknown as AttRow[]) {
    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions;
    if (!q?.topic_id || a.attempt_type === 'exam') continue;
    const derived = (q.question_images || []).some(i => i.path.startsWith('exam-pages:') || i.path.startsWith('question-pool:'));
    if (a.attempt_type === 'initial' && derived) continue;
    out.push({ topic_id: q.topic_id, result: a.result, difficulty: q.difficulty ? DIFF_MAP[q.difficulty] ?? 3 : null, type: null, at: a.attempted_at, source: 'bank' });
  }

  // 3) Çalışma planı cevapları
  if (role === 'student') {
    const { data } = await sb.rpc('my_study_evidence');
    for (const r of (data || []) as { topic_id: string | null; difficulty: number | null; question_type: string | null; res: Result; at_time: string }[])
      if (r.topic_id) out.push({ topic_id: r.topic_id, result: r.res, difficulty: r.difficulty, type: r.question_type, at: r.at_time, source: 'study' });
  } else {
    const { data } = await sb.from('study_plan_questions').select('topic_id, difficulty, question_type, result, answered_at, study_plans!inner(student_id)').eq('study_plans.student_id', studentId).not('answered_at', 'is', null).limit(20000);
    for (const r of (data || []) as unknown as { topic_id: string | null; difficulty: number | null; question_type: string | null; result: Result; answered_at: string }[])
      if (r.topic_id) out.push({ topic_id: r.topic_id, result: r.result, difficulty: r.difficulty, type: r.question_type, at: r.answered_at, source: 'study' });
  }
  return out;
}

// Düzey (ör. 8 = LGS) için üniteler ve öğrencinin ünite/alt konu profili
export async function studentProfile(sb: SupabaseClient, studentId: string, role: 'teacher' | 'student', topics: Topic[], grade: number): Promise<{ perf: UnitPerf[]; total: number; sources: { exam: number; bank: number; study: number } }> {
  const act = activeOnly(topics);
  const units = act.filter(t => !t.parent_id && t.grade_level === grade).sort((a, b) => a.sort_order - b.sort_order);
  const ev = await loadEvidence(sb, studentId, role);
  const mine = ev.filter(e => e.topic_id && act.some(t => t.id === e.topic_id));
  return {
    perf: unitPerformance(mine, act, units, Date.now()), total: mine.length,
    sources: { exam: mine.filter(e => e.source === 'exam').length, bank: mine.filter(e => e.source === 'bank').length, study: mine.filter(e => e.source === 'study').length },
  };
}

// Çalışma setine alınabilecek havuz soruları: onaylı, doğru cevabı ve konusu olan, benzer olarak işaretlenmemiş
export async function poolCandidates(sb: SupabaseClient, teacherId: string, pdfIds?: string[]): Promise<PoolItem[]> {
  let q = sb.from('pool_questions').select('id, topic_id, difficulty, question_type, pdf_id').eq('teacher_id', teacherId).eq('status', 'approved')
    .not('correct', 'is', null).not('topic_id', 'is', null).is('duplicate_of', null).limit(5000);
  if (pdfIds?.length) q = q.in('pdf_id', pdfIds);
  const { data } = await q;
  return (data || []) as PoolItem[];
}

// Öğrencinin atanmış (arşivlenmemiş) planlarında zaten gördüğü / göreceği havuz soruları
export async function seenPoolIds(sb: SupabaseClient, studentId: string): Promise<Set<string>> {
  const { data } = await sb.from('study_plan_questions').select('pool_question_id, study_plans!inner(student_id, status)').eq('study_plans.student_id', studentId).neq('study_plans.status', 'archived').not('pool_question_id', 'is', null).limit(20000);
  return new Set(((data || []) as unknown as { pool_question_id: string }[]).map(r => r.pool_question_id));
}

'use server';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refreshRecommendations } from '@/lib/recommendations';
import { planOutcome } from '@/lib/adaptive';

export interface CompletionInfo { error?: string; correct: number; total: number; message: string; direction: 'yukari' | 'ayni' | 'asagi' }

// Öğrenci bir çalışmayı bitirince: sonuç değerlendirilir, öğrencinin konu profili güncel veriyle yeniden hesaplanır ve
// öğretmen için yeni öneriler üretilir (öğrenciye kendiliğinden bir şey atanmaz).
export async function planCompleted(planId: string): Promise<CompletionInfo> {
  const none = { correct: 0, total: 0, message: '', direction: 'ayni' as const };
  const s = await getSession();
  if (!s || s.role !== 'student' || !s.studentId || !/^[0-9a-f-]{36}$/i.test(planId)) return { ...none, error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: it, error } = await sb.rpc('study_plan_items', { pid: planId });   // yalnızca kendi planı
  if (error) return { ...none, error: 'Çalışma bulunamadı.' };
  const rows = (it || []) as { answered: string | null; res: string | null }[];
  if (!rows.length || rows.some(r => !r.answered)) return { ...none, error: 'Çalışma henüz bitmedi.' };
  const correct = rows.filter(r => r.res === 'correct').length;
  const out = planOutcome(rows.length, correct);
  try {
    const admin = supabaseAdmin();
    const { data: st } = await admin.from('students').select('teacher_id').eq('id', s.studentId).maybeSingle();
    if (st?.teacher_id) await refreshRecommendations({ read: sb, role: 'student', write: admin, teacherId: st.teacher_id, studentId: s.studentId, source: 'plan_tamamlandi' });
  } catch { /* öneri üretilemese de sonuç gösterilir */ }
  return { correct, total: rows.length, message: out.message, direction: out.direction };
}

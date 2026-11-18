'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { refreshRecommendations } from '@/lib/recommendations';

export interface RecResult { error?: string; ok?: string }
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);
async function teacher() { const s = await getSession(); return s && s.role === 'teacher' ? s : null; }

// Bütün aktif öğrencilerin (ya da tek öğrencinin) güncel verisinden önerileri yeniler
export async function refreshAll(studentId?: string): Promise<RecResult> {
  const me = await teacher();
  if (!me) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  let q = sb.from('students').select('id').eq('teacher_id', me.userId).eq('is_active', true).limit(60);
  if (studentId) { if (!isUuid(studentId)) return { error: 'Geçersiz öğrenci.' }; q = q.eq('id', studentId); }
  const { data: st } = await q;
  let created = 0, closed = 0, n = 0;
  for (const s of (st || []) as { id: string }[]) {
    try {
      const r = await refreshRecommendations({ read: sb, role: 'teacher', write: sb, teacherId: me.userId, studentId: s.id, source: 'manuel' });
      created += r.created; closed += r.closed; n++;
    } catch (e) { return { error: 'Öneriler yenilenemedi: ' + (e as Error).message }; }
  }
  revalidatePath('/ogretmen/oneriler'); revalidatePath('/ogretmen/ogrenci-analizleri', 'layout');
  return { ok: `${n} öğrenci incelendi: ${created} yeni öneri${closed ? `, ${closed} öneri artık geçerli olmadığı için kapatıldı` : ''}.` };
}

export async function dismissRecommendation(id: string): Promise<RecResult> {
  if (!(await teacher()) || !isUuid(id)) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('study_recommendations').update({ status: 'dismissed', decided_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/oneriler'); revalidatePath('/ogretmen/ogrenci-analizleri', 'layout');
  return { ok: 'Öneri reddedildi; bu konu için 7 gün yeni öneri üretilmeyecek.' };
}

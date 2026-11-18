import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTopics } from '@/lib/data';
import { studentProfile } from '@/lib/studyData';
import { buildRecommendations, type Trigger } from '@/lib/adaptive';

export interface RefreshResult { created: number; updated: number; closed: number; total: number }

// Öğrencinin güncel profilinden önerileri yeniler ve veritabanında saklar.
//  read : profili okuyan istemci (öğretmen ya da öğrencinin kendi oturumu), write : öneri tablosuna yazan istemci
//  Kurallar: aynı (ünite, tür) için tek bekleyen öneri; artık geçerli olmayan bekleyen öneri kapatılır ("stale");
//  yakın zamanda onaylanmış ya da reddedilmiş üniteler için 7 gün yeni öneri üretilmez; çözülmemiş atanmış planı olan ünite atlanır.
export async function refreshRecommendations(o: { read: SupabaseClient; role: 'teacher' | 'student'; write: SupabaseClient; teacherId: string; studentId: string; grade?: number; source: string }): Promise<RefreshResult> {
  const now = Date.now();
  const topics = await getTopics(o.read);
  const prof = await studentProfile(o.read, o.studentId, o.role, topics, o.grade || 8);
  const recs = buildRecommendations(prof.perf, now);

  const { data: ex } = await o.write.from('study_recommendations').select('id, unit_id, trigger, status, decided_at, study_plans(status)').eq('student_id', o.studentId).in('status', ['pending', 'approved', 'dismissed']).order('created_at', { ascending: false }).limit(200);
  type Row = { id: string; unit_id: string; trigger: Trigger; status: string; decided_at: string | null; study_plans: { status: string } | { status: string }[] | null };
  const rows = (ex || []) as unknown as Row[];
  const pending = new Map(rows.filter(r => r.status === 'pending').map(r => [`${r.unit_id}|${r.trigger}`, r]));
  const blocked = new Set<string>();   // bu ünite için şimdilik yeni öneri üretme
  for (const r of rows) {
    if (r.status === 'pending') continue;
    const recent = r.decided_at && now - Date.parse(r.decided_at) < 7 * 86400000;
    const pl = Array.isArray(r.study_plans) ? r.study_plans[0] : r.study_plans;
    if (recent || (r.status === 'approved' && pl?.status === 'assigned')) blocked.add(r.unit_id);
  }

  let created = 0, updated = 0, closed = 0;
  const keep = new Set<string>();
  for (const r of recs) {
    if (blocked.has(r.unitId)) continue;
    const key = `${r.unitId}|${r.trigger}`;
    keep.add(key);
    const have = pending.get(key);
    const body = { kind: r.kind, q_count: r.count, text: r.text };
    if (have) {
      const { error } = await o.write.from('study_recommendations').update(body).eq('id', have.id);
      if (!error) updated++;
    } else {
      const { error } = await o.write.from('study_recommendations').insert({ teacher_id: o.teacherId, student_id: o.studentId, unit_id: r.unitId, trigger: r.trigger, source: o.source, ...body });
      if (!error) created++;
    }
  }
  for (const [key, row] of pending) {
    if (keep.has(key)) continue;
    const { error } = await o.write.from('study_recommendations').update({ status: 'stale', decided_at: new Date().toISOString() }).eq('id', row.id);
    if (!error) closed++;
  }
  return { created, updated, closed, total: recs.length };
}

'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { POOL_BUCKET } from '@/lib/env';
import { getTopics } from '@/lib/data';
import { topicPath } from '@/lib/topics';
import { poolCandidates, seenPoolIds, studentProfile } from '@/lib/studyData';
import { selectStudy, LEVEL_LABEL, KIND_LABEL, MIN_EVIDENCE, type Kind } from '@/lib/studyEngine';

export interface PlanParams { studentIds: string[]; kind: Kind; count: number; unitIds: string[]; pdfIds: string[]; grade: number }
export interface PreviewItem { id: string; url: string | null; unitName: string; topicName: string; difficulty: number | null; type: string | null; reason: string }
export interface StudentPreview { studentId: string; name: string; summary: string; items: PreviewItem[]; notes: string[] }
export interface PlanResult { error?: string; ok?: string; ids?: string[] }

const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);
async function teacher() { const s = await getSession(); return s && s.role === 'teacher' ? s : null; }

// Her öğrenci için ayrı, kişiselleştirilmiş soru listesi önerir (henüz kaydetmez)
export async function previewPlans(p: PlanParams): Promise<{ error?: string; previews?: StudentPreview[] }> {
  const me = await teacher();
  if (!me) return { error: 'Yetkiniz yok.' };
  if (!(p.kind in KIND_LABEL)) return { error: 'Çalışma türünü seçin.' };
  const count = Math.round(p.count);
  if (!(count >= 3 && count <= 60)) return { error: 'Soru sayısı 3 ile 60 arasında olmalı.' };
  const ids = [...new Set(p.studentIds.filter(isUuid))].slice(0, 30);
  if (!ids.length) return { error: 'En az bir öğrenci seçin.' };
  const sb = await supabaseServer();
  const [topics, pool, { data: st }] = await Promise.all([
    getTopics(sb), poolCandidates(sb, me.userId, p.pdfIds.filter(isUuid)),
    sb.from('students').select('id, full_name').in('id', ids).eq('is_active', true),
  ]);
  const students = (st || []) as { id: string; full_name: string }[];
  if (!students.length) return { error: 'Seçilen öğrenciler bulunamadı.' };
  if (!pool.length) return { error: 'Havuzda onaylı, konusu ve doğru cevabı olan soru yok. PDF Analiz Merkezi’nde soruları onaylayın.' };

  const previews: StudentPreview[] = [];
  const picked: { studentIdx: number; id: string }[] = [];
  for (const s of students) {
    const [prof, seen] = await Promise.all([studentProfile(sb, s.id, 'teacher', topics, p.grade || 8), seenPoolIds(sb, s.id)]);
    const r = selectStudy({ studentKey: s.id, count, kind: p.kind, unitIds: p.unitIds.filter(isUuid), perf: prof.perf, pool, topics, seen });
    const measured = prof.perf.filter(u => u.perf.n >= MIN_EVIDENCE);
    const summary = prof.total ? `${prof.total} soru değerlendirildi · ${measured.length ? measured.sort((a, b) => (a.perf.rate ?? 1) - (b.perf.rate ?? 1)).slice(0, 3).map(u => `${u.name} ${LEVEL_LABEL[u.perf.level].toLocaleLowerCase('tr')}`).join(', ') : 'hiçbir konuda yeterli veri yok'}` : 'Bu öğrenci için henüz veri yok; ilk çalışma düzeyi ölçmek için orta düzeyden başlar.';
    previews.push({ studentId: s.id, name: s.full_name, summary, notes: r.notes, items: r.items.map(i => ({ id: i.id, url: null, unitName: i.unitName, topicName: topicPath(topics, i.topic_id).split(' › ').slice(1).join(' › ') || i.unitName, difficulty: i.difficulty, type: i.type, reason: i.reason })) });
    r.items.forEach(i => picked.push({ studentIdx: previews.length - 1, id: i.id }));
  }
  // Önizleme görselleri (süreli adres)
  const uniq = [...new Set(picked.map(x => x.id))];
  const { data: imgs } = uniq.length ? await sb.from('pool_questions').select('id, image_path').in('id', uniq) : { data: [] };
  const pathOf = new Map(((imgs || []) as { id: string; image_path: string }[]).map(r => [r.id, r.image_path]));
  const { data: signed } = pathOf.size ? await sb.storage.from(POOL_BUCKET).createSignedUrls([...new Set(pathOf.values())], 3600) : { data: [] };
  const url = new Map((signed || []).map(s => [s.path as string, s.signedUrl as string]));
  previews.forEach(pv => pv.items.forEach(it => { it.url = url.get(pathOf.get(it.id) || '') || null; }));
  return { previews };
}

export interface PlanInput { studentId: string; title: string; items: { id: string; reason: string }[] }
export interface PlanOpts { kind: Kind; solution_mode: 'after_answer' | 'after_complete' | 'never'; due_on: string; note: string; assign: boolean }

export async function createPlans(plans: PlanInput[], o: PlanOpts, recId?: string): Promise<PlanResult> {
  const me = await teacher();
  if (!me) return { error: 'Yetkiniz yok.' };
  if (!(o.kind in KIND_LABEL)) return { error: 'Çalışma türü geçersiz.' };
  const sb = await supabaseServer();
  const created: string[] = [];
  for (const pl of plans.slice(0, 30)) {
    const ids = [...new Set(pl.items.map(i => i.id).filter(isUuid))].slice(0, 100);
    if (!isUuid(pl.studentId) || ids.length === 0) continue;
    const title = String(pl.title || '').trim().slice(0, 160) || KIND_LABEL[o.kind];
    const { data: rows } = await sb.from('pool_questions').select('id, image_path, option_count, correct, topic_id, difficulty, question_type').in('id', ids).eq('teacher_id', me.userId).eq('status', 'approved').not('correct', 'is', null);
    const by = new Map(((rows || []) as { id: string; image_path: string; option_count: number; correct: string; topic_id: string | null; difficulty: number | null; question_type: string | null }[]).map(r => [r.id, r]));
    const items = pl.items.filter(i => by.has(i.id));
    if (!items.length) continue;
    const { data: plan, error } = await sb.from('study_plans').insert({
      teacher_id: me.userId, student_id: pl.studentId, title, kind: o.kind, note: String(o.note || '').trim().slice(0, 1000) || null,
      solution_mode: ['after_answer', 'after_complete', 'never'].includes(o.solution_mode) ? o.solution_mode : 'after_answer',
      status: o.assign ? 'assigned' : 'draft', assigned_at: o.assign ? new Date().toISOString() : null,
      due_on: /^\d{4}-\d{2}-\d{2}$/.test(o.due_on) ? o.due_on : null,
    }).select('id').single();
    if (error || !plan) return { error: 'Plan oluşturulamadı: ' + (error?.message || ''), ids: created };
    const { error: qErr } = await sb.from('study_plan_questions').insert(items.map((it, i) => {
      const r = by.get(it.id)!;
      return { plan_id: plan.id, pool_question_id: r.id, position: i + 1, image_path: r.image_path, option_count: r.option_count, correct: r.correct, topic_id: r.topic_id, difficulty: r.difficulty, question_type: r.question_type, reason: String(it.reason || '').slice(0, 290) };
    }));
    if (qErr) { await sb.from('study_plans').delete().eq('id', plan.id); return { error: 'Sorular eklenemedi: ' + qErr.message, ids: created }; }
    created.push(plan.id);
    // Öneriden oluşturulduysa öneriyi "onaylandı" yap ve planla ilişkilendir (yalnızca o öneri bu öğrenciye aitse)
    if (isUuid(recId)) await sb.from('study_recommendations').update({ status: 'approved', plan_id: plan.id, decided_at: new Date().toISOString() }).eq('id', recId).eq('student_id', pl.studentId).eq('status', 'pending');
  }
  if (!created.length) return { error: 'Plan oluşturulamadı: geçerli soru ya da öğrenci yok.' };
  revalidatePath('/ogretmen/ogrenme-planlari'); revalidatePath('/ogrenci/calisma'); revalidatePath('/ogretmen/oneriler');
  return { ok: o.assign ? `${created.length} çalışma öğrencilere atandı.` : `${created.length} çalışma taslak olarak kaydedildi.`, ids: created };
}

export async function setPlanStatus(id: string, status: 'draft' | 'assigned' | 'archived'): Promise<PlanResult> {
  if (!(await teacher()) || !isUuid(id)) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: pl } = await sb.from('study_plans').select('status').eq('id', id).maybeSingle();
  if (!pl) return { error: 'Plan bulunamadı.' };
  if (status === 'draft') {
    const { count } = await sb.from('study_plan_questions').select('id', { count: 'exact', head: true }).eq('plan_id', id).not('answered_at', 'is', null);
    if (count) return { error: 'Öğrenci çözmeye başladı; taslağa alınamaz. Arşivleyebilirsiniz.' };
  }
  if (pl.status === 'completed' && status !== 'archived') return { error: 'Tamamlanmış plan değiştirilemez.' };
  const patch = status === 'assigned' ? { status, assigned_at: new Date().toISOString() } : { status };
  const { error } = await sb.from('study_plans').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/ogrenme-planlari', 'layout'); revalidatePath('/ogrenci/calisma');
  return { ok: status === 'assigned' ? 'Öğrenciye atandı.' : status === 'draft' ? 'Taslağa alındı.' : 'Arşivlendi.' };
}

export async function deletePlan(id: string): Promise<PlanResult> {
  if (!(await teacher()) || !isUuid(id)) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { count } = await sb.from('study_plan_questions').select('id', { count: 'exact', head: true }).eq('plan_id', id).not('answered_at', 'is', null);
  if (count) return { error: 'Öğrenci bu planı çözmeye başladı; silinemez (öğrenme geçmişi korunur). Arşivleyin.' };
  const { error } = await sb.from('study_plans').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/ogrenme-planlari', 'layout');
  return { ok: 'Silindi.' };
}

'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export interface TopicState { error?: string; ok?: string }

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}
const done = () => revalidatePath('/ogretmen/konular');

export async function addTopic(_prev: TopicState, form: FormData): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const name = String(form.get('ad') || '').trim().slice(0, 120);
  const parentId = String(form.get('ust') || '') || null;
  const grade = parseInt(String(form.get('sinif') || ''), 10);
  if (!name) return { error: 'Konu adını yazın.' };
  const sb = await supabaseServer();
  const { data: subj } = await sb.from('subjects').select('id').eq('name', 'Matematik').maybeSingle();
  if (!subj) return { error: 'Matematik dersi bulunamadı; 0002_seed_matematik.sql dosyasını çalıştırın.' };
  let gradeLevel: number | null = grade >= 1 && grade <= 13 ? grade : null;
  if (parentId) {
    const { data: p } = await sb.from('topics').select('grade_level').eq('id', parentId).maybeSingle();
    gradeLevel = p?.grade_level ?? gradeLevel;
  }
  // Kardeşlerin sonuna eklenir
  let sibQ = sb.from('topics').select('sort_order').eq('subject_id', subj.id).order('sort_order', { ascending: false }).limit(1);
  sibQ = parentId ? sibQ.eq('parent_id', parentId) : sibQ.is('parent_id', null).eq('grade_level', gradeLevel ?? -1);
  const { data: last } = await sibQ.maybeSingle();
  const { error } = await sb.from('topics').insert({ subject_id: subj.id, parent_id: parentId, name, grade_level: gradeLevel, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return { error: error.message };
  done();
  return { ok: `"${name}" eklendi.` };
}

export async function renameTopic(id: string, name: string): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const n = String(name || '').trim().slice(0, 120);
  if (!n) return { error: 'Ad boş olamaz.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('topics').update({ name: n }).eq('id', id);
  if (error) return { error: error.message };
  done();
  return { ok: 'Kaydedildi.' };
}

// Pasif konu yeni seçimlerde görünmez; eski sorular ve kazanımları silinmez
export async function setTopicActive(id: string, active: boolean): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('topics').update({ is_active: active }).eq('id', id);
  if (error) return { error: error.message };
  done();
  return { ok: active ? 'Konu yeniden etkin.' : 'Konu pasifleştirildi.' };
}

// Kardeşler arasında yukarı / aşağı taşı (sıra numaraları yeniden yazılır)
export async function moveTopic(id: string, dir: -1 | 1): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { data: t } = await sb.from('topics').select('id, parent_id, grade_level, subject_id').eq('id', id).maybeSingle();
  if (!t) return { error: 'Konu bulunamadı.' };
  let q = sb.from('topics').select('id, sort_order, name').eq('subject_id', t.subject_id);
  q = t.parent_id ? q.eq('parent_id', t.parent_id) : q.is('parent_id', null).eq('grade_level', t.grade_level ?? -1);
  const { data } = await q;
  const list = ((data || []) as { id: string; sort_order: number; name: string }[]).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'tr'));
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return {};
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) if (list[k].sort_order !== k + 1) await sb.from('topics').update({ sort_order: k + 1 }).eq('id', list[k].id);
  done();
  return {};
}

// Konu silinirse alt konuları ve kazanımları da silinir; o konudaki sorular silinmez, yalnızca konusuz kalır
export async function deleteTopic(id: string): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('topics').delete().eq('id', id);
  if (error) return { error: error.message };
  done();
  return { ok: 'Silindi.' };
}

// ---- Kazanımlar ----
export async function saveOutcome(topicId: string, id: string | null, code: string, text: string): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const t = String(text || '').trim().slice(0, 600), c = String(code || '').trim().slice(0, 40) || null;
  if (!t) return { error: 'Kazanım metnini yazın.' };
  const sb = await supabaseServer();
  if (id) {
    const { error } = await sb.from('curriculum_outcomes').update({ code: c, text: t }).eq('id', id);
    if (error) return { error: error.code === '23505' ? 'Bu konuda aynı kodlu bir kazanım var.' : error.message };
  } else {
    const { data: last } = await sb.from('curriculum_outcomes').select('sort_order').eq('topic_id', topicId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await sb.from('curriculum_outcomes').insert({ topic_id: topicId, code: c, text: t, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) return { error: error.code === '23505' ? 'Bu konuda aynı kodlu bir kazanım var.' : error.message };
  }
  done();
  return { ok: 'Kazanım kaydedildi.' };
}

export async function setOutcomeActive(id: string, active: boolean): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('curriculum_outcomes').update({ is_active: active }).eq('id', id);
  if (error) return { error: error.message };
  done();
  return {};
}

export async function deleteOutcome(id: string): Promise<TopicState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('curriculum_outcomes').delete().eq('id', id);
  if (error) return { error: error.message };
  done();
  return { ok: 'Kazanım silindi.' };
}

'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export interface TopicState { error?: string; ok?: string }

export async function addTopic(_prev: TopicState, form: FormData): Promise<TopicState> {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return { error: 'Yetkiniz yok.' };
  const name = String(form.get('ad') || '').trim();
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
  const { count } = await sb.from('topics').select('id', { count: 'exact', head: true }).eq('subject_id', subj.id);
  const { error } = await sb.from('topics').insert({ subject_id: subj.id, parent_id: parentId, name, grade_level: gradeLevel, sort_order: (count || 0) + 1 });
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/konular');
  return { ok: `"${name}" eklendi.` };
}

// Konu silinirse alt konuları da silinir; o konudaki sorular silinmez, yalnızca konusuz kalır
export async function deleteTopic(id: string): Promise<TopicState> {
  const s = await getSession();
  if (!s || s.role !== 'teacher') return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('topics').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/konular');
  return { ok: 'Silindi.' };
}

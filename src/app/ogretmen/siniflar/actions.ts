'use server';
import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { makeCode } from '@/lib/exams';

export interface ClassState { error?: string; ok?: string }

async function teacher() {
  const s = await getSession();
  return s && s.role === 'teacher' ? s : null;
}

// Benzersiz kod: çakışırsa (çok düşük olasılık) yeniden üretilir
async function withFreshCode(run: (code: string) => PromiseLike<{ error: { code?: string; message: string } | null }>): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const { error } = await run(makeCode(8, randomInt));
    if (!error) return null;
    if (error.code !== '23505') return error.message;
  }
  return 'Kod üretilemedi, yeniden deneyin.';
}

export async function createClass(_prev: ClassState, form: FormData): Promise<ClassState> {
  const s = await teacher();
  if (!s) return { error: 'Yetkiniz yok.' };
  const name = String(form.get('ad') || '').trim().slice(0, 80);
  if (!name) return { error: 'Sınıfa bir ad verin (ör. 11-A Sayısal, Cumartesi grubu).' };
  const sb = await supabaseServer();
  const err = await withFreshCode(code => sb.from('classes').insert({ name, join_code: code, teacher_id: s.userId }));
  if (err) return { error: 'Sınıf eklenemedi: ' + err };
  revalidatePath('/ogretmen', 'layout');
  return { ok: `"${name}" eklendi.` };
}

export async function setClassOpen(id: string, open: boolean): Promise<ClassState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('classes').update({ is_open: open }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/siniflar');
  return { ok: open ? 'Kayıtlar açıldı.' : 'Kayıtlar kapatıldı.' };
}

export async function regenerateCode(id: string): Promise<ClassState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const err = await withFreshCode(code => sb.from('classes').update({ join_code: code }).eq('id', id));
  if (err) return { error: err };
  revalidatePath('/ogretmen/siniflar');
  return { ok: 'Yeni kod üretildi; eski kod artık çalışmaz.' };
}

export async function renameClass(id: string, name: string): Promise<ClassState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const n = String(name || '').trim().slice(0, 80);
  if (!n) return { error: 'Ad boş olamaz.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('classes').update({ name: n }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen', 'layout');
  return { ok: 'Ad değiştirildi.' };
}

export async function deleteClass(id: string): Promise<ClassState> {
  if (!(await teacher())) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('classes').delete().eq('id', id);
  if (error) return { error: error.code === '23503' ? 'Bu sınıfa atanmış denemeler var; önce o denemeleri silin ya da başka sınıfa atayın.' : error.message };
  revalidatePath('/ogretmen', 'layout');
  return { ok: 'Sınıf silindi; öğrencileri "grupsuz" oldu, verileri silinmedi.' };
}

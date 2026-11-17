'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { normalizeUsername, validateUsername, validatePassword, usernameToEmail } from '@/lib/usernames';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/env';

export interface FormState { error?: string; ok?: string }

async function assertTeacher() {
  const s = await getSession();
  if (!s || s.role !== 'teacher') throw new Error('Bu işlem için öğretmen olarak giriş yapmalısınız.');
}

const gradeOf = (v: FormDataEntryValue | null) => { const n = parseInt(String(v || ''), 10); return n >= 1 && n <= 13 ? n : null; };

// Öğretmen öğrenci hesabı açar: kullanıcı adı + şifre (öğrencinin e-postası gerekmez)
export async function createStudent(_prev: FormState, form: FormData): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const fullName = String(form.get('ad') || '').trim();
  const username = normalizeUsername(String(form.get('kullanici') || ''));
  const password = String(form.get('sifre') || '');
  if (!fullName) return { error: 'Öğrencinin adını yazın.' };
  const uErr = validateUsername(username) || validatePassword(password);
  if (uErr) return { error: uErr };

  let admin;
  try { admin = supabaseAdmin(); } catch (e) { return { error: (e as Error).message }; }
  const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) return { error: `"${username}" kullanıcı adı alınmış; başka bir ad deneyin.` };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username, STUDENT_EMAIL_DOMAIN), password, email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });
  if (error || !created.user) return { error: 'Hesap açılamadı: ' + (error?.message || 'bilinmeyen hata') };

  const { error: stErr } = await admin.from('students').insert({
    profile_id: created.user.id, full_name: fullName, grade_level: gradeOf(form.get('sinif')),
    school_name: String(form.get('okul') || '').trim() || null,
  });
  if (stErr) {
    await admin.auth.admin.deleteUser(created.user.id); // yarım kayıt kalmasın
    return { error: 'Öğrenci kaydı oluşturulamadı: ' + stErr.message };
  }
  revalidatePath('/ogretmen', 'layout');
  return { ok: `${fullName} eklendi. Giriş bilgileri — kullanıcı adı: ${username}` };
}

export async function updateStudent(_prev: FormState, form: FormData): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const id = String(form.get('id') || '');
  const fullName = String(form.get('ad') || '').trim();
  if (!fullName) return { error: 'Ad boş olamaz.' };
  const sb = await supabaseServer();
  const { data: st, error } = await sb.from('students').update({
    full_name: fullName, grade_level: gradeOf(form.get('sinif')),
    school_name: String(form.get('okul') || '').trim() || null, notes: String(form.get('notlar') || '').trim() || null,
  }).eq('id', id).select('profile_id').maybeSingle();
  if (error || !st) return { error: 'Kaydedilemedi: ' + (error?.message || 'öğrenci bulunamadı') };
  if (st.profile_id) await sb.from('profiles').update({ full_name: fullName }).eq('id', st.profile_id);
  revalidatePath('/ogretmen', 'layout');
  return { ok: 'Kaydedildi.' };
}

// Pasif öğrenci giriş yapamaz ve verilerine erişemez; veriler silinmez
export async function setStudentActive(id: string, active: boolean): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const sb = await supabaseServer();
  const { error } = await sb.from('students').update({ is_active: active }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen', 'layout');
  return { ok: active ? 'Öğrenci yeniden aktif.' : 'Öğrenci pasifleştirildi.' };
}

export async function resetStudentPassword(_prev: FormState, form: FormData): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const id = String(form.get('id') || '');
  const password = String(form.get('sifre') || '');
  const pErr = validatePassword(password);
  if (pErr) return { error: pErr };
  const sb = await supabaseServer();
  const { data: st } = await sb.from('students').select('profile_id').eq('id', id).maybeSingle();
  if (!st?.profile_id) return { error: 'Bu öğrencinin giriş hesabı yok.' };
  let admin;
  try { admin = supabaseAdmin(); } catch (e) { return { error: (e as Error).message }; }
  const { error } = await admin.auth.admin.updateUserById(st.profile_id, { password });
  if (error) return { error: 'Şifre değiştirilemedi: ' + error.message };
  return { ok: 'Yeni şifre kaydedildi. Öğrenciye iletin.' };
}

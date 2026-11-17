'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { loginIdToEmail } from '@/lib/usernames';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/env';

export interface LoginState { error?: string }

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const id = String(form.get('kimlik') || '').trim();
  const password = String(form.get('sifre') || '');
  if (!id || !password) return { error: 'Kullanıcı adınızı (ya da e-postanızı) ve şifrenizi girin.' };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email: loginIdToEmail(id, STUDENT_EMAIL_DOMAIN), password });
  if (error || !data.user) return { error: 'Kullanıcı adı / e-posta ya da şifre hatalı.' };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role === 'teacher') redirect('/ogretmen');
  const { data: st } = await sb.from('students').select('is_active').eq('profile_id', data.user.id).maybeSingle();
  if (!st || !st.is_active) {
    await sb.auth.signOut();
    return { error: 'Hesabınız pasif durumda ya da öğrenci kaydınız bulunamadı. Öğretmeninizle iletişime geçin.' };
  }
  redirect('/ogrenci');
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/giris');
}

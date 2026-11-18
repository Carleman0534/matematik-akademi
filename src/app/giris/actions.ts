'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SHORT_SESSION_COOKIE, LAST_ID_COOKIE } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { loginIdToEmail } from '@/lib/usernames';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/env';

export interface LoginState { error?: string }

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const id = String(form.get('kimlik') || '').trim();
  const password = String(form.get('sifre') || '');
  if (!id || !password) return { error: 'Kullanıcı adınızı (ya da e-postanızı) ve şifrenizi girin.' };
  const remember = form.get('hatirla') === 'on';
  const store = await cookies();
  const sb = await supabaseServer(!remember);
  const { data, error } = await sb.auth.signInWithPassword({ email: loginIdToEmail(id, STUDENT_EMAIL_DOMAIN), password });
  if (error || !data.user) return { error: 'Kullanıcı adı / e-posta ya da şifre hatalı.' };
  // Seçimi sonraki isteklerde (oturum yenileme) de uygulamak için çerezle taşı
  const base = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  if (remember) {
    store.delete(SHORT_SESSION_COOKIE);
    store.set(LAST_ID_COOKIE, id, { ...base, maxAge: 60 * 60 * 24 * 365 }); // yalnızca kullanıcı adı; şifre asla saklanmaz
  } else {
    store.set(SHORT_SESSION_COOKIE, '1', base);
    store.delete(LAST_ID_COOKIE);
  }
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
  (await cookies()).delete(SHORT_SESSION_COOKIE);   // son kullanıcı adı kalır (kolay yeniden giriş)
  redirect('/giris');
}

'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { loginIdToEmail } from '@/lib/usernames';
import { STUDENT_EMAIL_DOMAIN, isLocalMode } from '@/lib/env';
import { getDb } from '@/lib/db/database';
import bcrypt from 'bcryptjs';

export interface LoginState { error?: string }

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const id = String(form.get('kimlik') || '').trim();
  const password = String(form.get('sifre') || '');
  const remember = form.get('beni_hatirla') === '1' || form.get('beni_hatirla') === 'on' || form.get('beni_hatirla') === 'true';
  if (!id || !password) return { error: 'Kullanıcı adınızı (ya da e-postanızı) ve şifrenizi girin.' };

  const sessionMaxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // Beni hatırla seçilmişse 30 gün, değilse 1 gün
  const store = await cookies();

  if (remember) {
    store.set('remembered_kimlik', id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  } else {
    store.delete('remembered_kimlik');
  }

  // 1. Önce yerel veritabanı kontrolü
  let destination: string | null = null;
  try {
    const db = await getDb();
    const cleanEmail = loginIdToEmail(id, STUDENT_EMAIL_DOMAIN).toLowerCase();
    const normalizedId = id.toLowerCase().trim();
    // LIKE joker karakterlerini (% _ \) kaçır: kullanıcı adı "a%" gibi bir şeyle birden çok hesaba eşleşmesin.
    const likePrefix = normalizedId.replace(/[\\%_]/g, (c) => '\\' + c) + '@%';

    // Kimlik parametreli sorguyla tek bir kullanıcıya eşlenir (e-posta, e-postanın @ öncesi ya da tam ad).
    const userRes = db.exec(
      `SELECT id, email, password, name, role
       FROM users
       WHERE LOWER(email) = ? OR LOWER(email) LIKE ? ESCAPE '\\' OR LOWER(name) = ?
       ORDER BY CASE WHEN LOWER(email) = ? THEN 0 ELSE 1 END
       LIMIT 1`,
      [cleanEmail, likePrefix, normalizedId, cleanEmail]
    );

    if (userRes.length > 0 && userRes[0].values.length > 0) {
      const row = userRes[0].values[0];
      const user = {
        id: String(row[0]),
        email: String(row[1]),
        hashedPassword: String(row[2]),
        name: String(row[3]),
        role: String(row[4]) as 'teacher' | 'student' | 'parent'
      };

      // Yalnızca kayıtlı bcrypt hash'i ile karşılaştır (bcrypt olmayan değer hiçbir parolayla eşleşmez).
      let isMatch = false;
      try {
        isMatch = bcrypt.compareSync(password, user.hashedPassword);
      } catch {
        isMatch = false;
      }

      if (isMatch) {
        let studentId: string | null = null;
        if (user.role === 'student') {
          const sRes = db.exec('SELECT id, status FROM students WHERE user_id = ? LIMIT 1', [user.id]);
          studentId = sRes.length > 0 && sRes[0].values.length > 0
            ? String(sRes[0].values[0][0])
            : user.id;
        }

        store.set('local_session', JSON.stringify({
          userId: user.id,
          fullName: user.name,
          role: user.role,
          isAdmin: user.role === 'teacher',
          studentId
        }), {
          httpOnly: true,
          path: '/',
          maxAge: sessionMaxAge
        });

        // İstemci tarafındaki React sayfalarının anında öğrenci kimliğini tanıması için çerezleri ayarla
        if (studentId) {
          store.set('student_id', studentId, {
            path: '/',
            maxAge: sessionMaxAge,
            sameSite: 'lax',
            httpOnly: false
          });
          store.set('studentId', studentId, {
            path: '/',
            maxAge: sessionMaxAge,
            sameSite: 'lax',
            httpOnly: false
          });
          store.set('active_student_name', encodeURIComponent(user.name), {
            path: '/',
            maxAge: sessionMaxAge,
            sameSite: 'lax',
            httpOnly: false
          });
        }

        destination = user.role === 'teacher' ? '/ogretmen' : user.role === 'parent' ? '/veli' : '/ogrenci';
      }
    }
  } catch (dbErr) {
    console.warn('Local database login check failed, falling back to Supabase:', dbErr);
  }
  // redirect() bir hata fırlatarak çalışır; try/catch içinde yutulmasın diye burada çağrılır.
  if (destination) redirect(destination);

  // 2. Supabase Bulut Girişi
  if (!isLocalMode()) {
    try {
      const sb = await supabaseServer();
      const { data, error } = await sb.auth.signInWithPassword({ email: loginIdToEmail(id, STUDENT_EMAIL_DOMAIN), password });
      if (!error && data?.user) {
        const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
        if (profile?.role === 'teacher') redirect('/ogretmen');
        if (profile?.role === 'parent') redirect('/veli');
        const { data: st } = await sb.from('students').select('is_active').eq('profile_id', data.user.id).maybeSingle();
        if (!st || !st.is_active) {
          await sb.auth.signOut();
          return { error: 'Hesabınız pasif durumda ya da öğrenci kaydınız bulunamadı. Öğretmeninizle iletişime geçin.' };
        }
        redirect('/ogrenci');
      }
    } catch {
      // Supabase signIn failed
    }
  }

  return { error: 'Kullanıcı adı / e-posta ya da şifre hatalı.' };
}

export async function logout() {
  const store = await cookies();
  store.delete('local_session');

  if (!isLocalMode()) {
    try {
      const sb = await supabaseServer();
      await sb.auth.signOut();
    } catch {}
  }
  redirect('/giris');
}

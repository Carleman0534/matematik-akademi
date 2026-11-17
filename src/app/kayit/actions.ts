'use server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { normalizeUsername, validateUsername, validatePassword, usernameToEmail, isEmail } from '@/lib/usernames';
import { normalizeCode } from '@/lib/exams';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/env';

// Kayıt kodla yapılır (herkese açık kayıt kapalı):
//  * sınıf kodu → öğrenci hesabı, o sınıfın öğretmenine bağlanır
//  * öğretmen davet kodu (yöneticinin ürettiği, tek kullanımlık) → öğretmen hesabı
// Hesaplar sunucuda, sunucu anahtarıyla açılır; tarayıcı yalnızca kodu ve form bilgilerini gönderir.

export type CodeInfo = { kind: 'class'; className: string; teacherName: string } | { kind: 'teacher' } | { error: string };
export interface RegisterState { error?: string }

async function lookup(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (code.length < 6 || code.length > 12) return { code, cls: null, invite: null };
  const admin = supabaseAdmin();
  const { data: cls } = await admin.from('classes').select('id, name, teacher_id, is_open, teacher:profiles(full_name, role)').eq('join_code', code).maybeSingle();
  if (cls) return { code, cls: cls as unknown as { id: string; name: string; teacher_id: string; is_open: boolean; teacher: { full_name: string; role: string } | null }, invite: null };
  const { data: invite } = await admin.from('teacher_invites').select('code, used_at, expires_at').eq('code', code).maybeSingle();
  return { code, cls: null, invite: invite as { code: string; used_at: string | null; expires_at: string } | null };
}

export async function checkCode(rawCode: string): Promise<CodeInfo> {
  let r;
  try { r = await lookup(rawCode); } catch { return { error: 'Kayıt şu anda yapılamıyor. Biraz sonra yeniden deneyin.' }; }
  if (r.cls) {
    if (!r.cls.is_open || r.cls.teacher?.role !== 'teacher') return { error: 'Bu sınıf yeni kayıtlara kapalı. Öğretmeninize sorun.' };
    return { kind: 'class', className: r.cls.name, teacherName: r.cls.teacher?.full_name || 'Öğretmen' };
  }
  if (r.invite) {
    if (r.invite.used_at) return { error: 'Bu davet kodu daha önce kullanılmış.' };
    if (Date.parse(r.invite.expires_at) < Date.now()) return { error: 'Bu davet kodunun süresi dolmuş. Yöneticiden yeni kod isteyin.' };
    return { kind: 'teacher' };
  }
  return { error: 'Kod bulunamadı. Harfleri kontrol edin (O yerine 0, I yerine 1 kullanılmaz).' };
}

export async function register(_prev: RegisterState, form: FormData): Promise<RegisterState> {
  const fullName = String(form.get('ad') || '').trim().slice(0, 120);
  const password = String(form.get('sifre') || '');
  if (!fullName) return { error: 'Adınızı ve soyadınızı yazın.' };
  const pErr = validatePassword(password);
  if (pErr) return { error: pErr };
  if (password !== String(form.get('sifre2') || '')) return { error: 'Şifreler aynı değil.' };

  let admin, r;
  try { admin = supabaseAdmin(); r = await lookup(String(form.get('kod') || '')); }
  catch { return { error: 'Kayıt şu anda yapılamıyor. Biraz sonra yeniden deneyin.' }; }

  let email: string;
  if (r.cls) {
    // ---- Öğrenci ----
    if (!r.cls.is_open || r.cls.teacher?.role !== 'teacher') return { error: 'Bu sınıf yeni kayıtlara kapalı.' };
    const username = normalizeUsername(String(form.get('kullanici') || ''));
    const uErr = validateUsername(username);
    if (uErr) return { error: uErr };
    const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (taken) return { error: `"${username}" kullanıcı adı alınmış; başka bir ad deneyin.` };
    email = usernameToEmail(username, STUDENT_EMAIL_DOMAIN);
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, username } });
    if (error || !created.user) return { error: /registered|exists/i.test(error?.message || '') ? 'Bu kullanıcı adı alınmış.' : 'Hesap açılamadı. Yeniden deneyin.' };
    const g = parseInt(String(form.get('sinif') || ''), 10);
    const { error: stErr } = await admin.from('students').insert({
      profile_id: created.user.id, full_name: fullName, grade_level: g >= 1 && g <= 13 ? g : null,
      school_name: String(form.get('okul') || '').trim().slice(0, 160) || null,
      teacher_id: r.cls.teacher_id, class_id: r.cls.id,
    });
    if (stErr) { await admin.auth.admin.deleteUser(created.user.id); return { error: 'Öğrenci kaydı oluşturulamadı. Yeniden deneyin.' }; }
  } else if (r.invite) {
    // ---- Öğretmen (tek kullanımlık davet kodu önce ayrılır, hata olursa geri bırakılır) ----
    email = String(form.get('eposta') || '').trim().toLowerCase();
    if (!isEmail(email)) return { error: 'Geçerli bir e-posta adresi yazın.' };
    if (email.endsWith('@' + STUDENT_EMAIL_DOMAIN)) return { error: 'Bu e-posta adresi kullanılamaz.' };
    const { data: claimed } = await admin.from('teacher_invites').update({ used_at: new Date().toISOString() })
      .eq('code', r.code).is('used_at', null).gt('expires_at', new Date().toISOString()).select('code').maybeSingle();
    if (!claimed) return { error: 'Davet kodu kullanılmış ya da süresi dolmuş.' };
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !created.user) {
      await admin.from('teacher_invites').update({ used_at: null }).eq('code', r.code);
      return { error: /registered|exists/i.test(error?.message || '') ? 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.' : 'Hesap açılamadı. Yeniden deneyin.' };
    }
    await admin.from('profiles').update({ role: 'teacher', full_name: fullName }).eq('id', created.user.id);
    await admin.from('teacher_invites').update({ used_by: created.user.id }).eq('code', r.code);
  } else {
    return { error: 'Kod geçersiz.' };
  }

  // Hesap açıldı: doğrudan giriş yap
  const sb = await supabaseServer();
  const { error: sErr } = await sb.auth.signInWithPassword({ email, password });
  if (sErr) redirect('/giris');
  redirect(r.cls ? '/ogrenci' : '/ogretmen');
}

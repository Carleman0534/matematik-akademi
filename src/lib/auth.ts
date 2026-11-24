import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { isConfigured, isLocalMode } from '@/lib/env';
import { verifySession } from '@/lib/sessionCookie';

export interface SessionInfo {
  userId: string;
  fullName: string;
  role: 'teacher' | 'student' | 'parent';
  isAdmin: boolean;           // yönetici öğretmen: bütün öğretmenleri ve öğrencileri görür, davet kodu üretir
  studentId: string | null;   // öğrenci hesabının students.id'si (öğretmen/velide boş)
}

// Oturumdaki kullanıcı (getUser, çerezdeki jetonu Supabase'e doğrulatır). Aynı istekte bir kez çalışır.
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  // Yerel ya da Canlı Oturum Çerezi Kontrolü
  try {
    const store = await cookies();
    const raw = store.get('local_session')?.value;
    // Çerez imzalıdır: imzasız, değiştirilmiş ya da eski biçimdeki çerezler geçersiz sayılır
    const parsed = raw ? await verifySession(raw) : null;
    if (parsed) {
      // Ad ve rol veritabanından yenilenir: silinen hesabın oturumu geçersiz olur, rol değişikliği hemen etkili olur
      let fullName = parsed.fullName;
      let role: SessionInfo['role'] = parsed.role;
      let accountExists = true;
      try {
        const { getDb } = await import('@/lib/db/database');
        const db = await getDb();
        const r = db.exec('SELECT name, role FROM users WHERE id = ? LIMIT 1', [parsed.userId]);
        if (r.length && r[0].values.length) {
          if (r[0].values[0][0]) fullName = String(r[0].values[0][0]);
          const dbRole = String(r[0].values[0][1]);
          if (dbRole === 'teacher' || dbRole === 'student' || dbRole === 'parent') role = dbRole;
          // Pasifleştirilen öğrencinin açık oturumu da geçersiz olur
          if (dbRole === 'student') {
            const st = db.exec("SELECT 1 FROM students WHERE user_id = ? AND status = 'passive' LIMIT 1", [parsed.userId]);
            if (st.length && st[0].values.length) accountExists = false;
          }
        } else {
          accountExists = false;
        }
      } catch {
        // Veritabanı o an okunamadıysa imzalı çerezdeki bilgiye güvenilir
      }
      if (accountExists) {
        return {
          userId: parsed.userId,
          fullName,
          role,
          isAdmin: role === 'teacher' && parsed.isAdmin,
          studentId: role === 'student' ? parsed.studentId : null,
        };
      }
    }
  } catch {
    // Supabase kontrolüne geç
  }

  if (!isConfigured()) return null; // kurulum yapılmamış: giriş ekranı kurulum adımlarını gösterir

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('full_name, role, is_admin').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  let studentId: string | null = null;
  if (profile.role === 'student') {
    const { data: st } = await sb.from('students').select('id, is_active').eq('profile_id', user.id).maybeSingle();
    studentId = st && st.is_active ? st.id : null;
  }
  return { userId: user.id, fullName: profile.full_name || '', role: profile.role, isAdmin: profile.role === 'teacher' && !!profile.is_admin, studentId };
});

export async function requireTeacher(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role === 'student') redirect('/ogrenci');
  if (s.role === 'parent') redirect('/veli');
  return s;
}

export async function requireAdmin(): Promise<SessionInfo> {
  const s = await requireTeacher();
  if (!s.isAdmin) redirect('/ogretmen');
  return s;
}

export async function requireStudent(): Promise<SessionInfo & { studentId: string }> {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role === 'teacher') redirect('/ogretmen');
  if (s.role === 'parent') redirect('/veli');
  if (!s.studentId) redirect('/giris?hata=pasif');
  return s as SessionInfo & { studentId: string };
}

export async function requireParent(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role === 'teacher') redirect('/ogretmen');
  if (s.role === 'student') redirect('/ogrenci');
  return s;
}

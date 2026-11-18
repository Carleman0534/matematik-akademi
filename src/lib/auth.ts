import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { isConfigured, isLocalMode } from '@/lib/env';

export interface SessionInfo {
  userId: string;
  fullName: string;
  role: 'teacher' | 'student' | 'parent';
  isAdmin: boolean;           // yönetici öğretmen: bütün öğretmenleri ve öğrencileri görür, davet kodu üretir
  studentId: string | null;   // öğrenci hesabının students.id'si (öğretmen/velide boş)
}

// Oturumdaki kullanıcı (getUser, çerezdeki jetonu Supabase'e doğrulatır). Aynı istekte bir kez çalışır.
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  if (!isConfigured()) return null; // kurulum yapılmamış: giriş ekranı kurulum adımlarını gösterir

  // Yerel Mod (Local Mode)
  if (isLocalMode()) {
    try {
      const store = await cookies();
      const raw = store.get('local_session')?.value;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userId) {
        return {
          userId: parsed.userId,
          fullName: parsed.fullName || '',
          role: parsed.role || 'teacher',
          isAdmin: parsed.isAdmin ?? (parsed.role === 'teacher'),
          studentId: parsed.studentId ?? null,
        };
      }
    } catch {
      return null;
    }
  }

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

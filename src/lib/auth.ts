import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/env';

export interface SessionInfo {
  userId: string;
  fullName: string;
  role: 'teacher' | 'student';
  studentId: string | null;   // öğrenci hesabının students.id'si (öğretmende boş)
}

// Oturumdaki kullanıcı (getUser, çerezdeki jetonu Supabase'e doğrulatır)
export async function getSession(): Promise<SessionInfo | null> {
  if (!isConfigured()) return null; // kurulum yapılmamış: giriş ekranı kurulum adımlarını gösterir
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  let studentId: string | null = null;
  if (profile.role === 'student') {
    const { data: st } = await sb.from('students').select('id, is_active').eq('profile_id', user.id).maybeSingle();
    studentId = st && st.is_active ? st.id : null;
  }
  return { userId: user.id, fullName: profile.full_name || '', role: profile.role, studentId };
}

export async function requireTeacher(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role !== 'teacher') redirect('/ogrenci');
  return s;
}

export async function requireStudent(): Promise<SessionInfo & { studentId: string }> {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role === 'teacher') redirect('/ogretmen');
  if (!s.studentId) redirect('/giris?hata=pasif');
  return s as SessionInfo & { studentId: string };
}

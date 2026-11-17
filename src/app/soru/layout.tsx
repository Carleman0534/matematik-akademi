import { redirect } from 'next/navigation';
import { AppShell, type NavItem } from '@/components/AppShell';
import { getSession } from '@/lib/auth';

const TEACHER: NavItem[] = [
  { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
  { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥', mobile: true },
  { href: '/ogretmen/konular', label: 'Konular', icon: '🗂️', mobile: true },
];
const STUDENT: NavItem[] = [
  { href: '/ogrenci', label: 'Ana Sayfa', icon: '🏠', mobile: true },
  { href: '/ogrenci/soru-bankam', label: 'Soru Bankam', icon: '🗂️', mobile: true },
  { href: '/ogrenci/soru-ekle', label: 'Soru Ekle', icon: '📷', mobile: true },
  { href: '/ogrenci/tekrar', label: 'Tekrar Et', icon: '🔁', mobile: true },
];

export default async function QuestionLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/giris');
  if (s.role === 'student' && !s.studentId) redirect('/giris?hata=pasif');
  const teacher = s.role === 'teacher';
  return <AppShell nav={teacher ? TEACHER : STUDENT} userName={s.fullName || (teacher ? 'Öğretmen' : 'Öğrenci')} roleLabel={teacher ? 'Öğretmen' : 'Öğrenci'}>{children}</AppShell>;
}

import { AppShell, type NavItem } from '@/components/AppShell';
import { requireTeacher } from '@/lib/auth';

const NAV: NavItem[] = [
  { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
  { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥', mobile: true },
  { href: '/ogretmen/konular', label: 'Konular', icon: '🗂️', mobile: true },
  { href: '/ogretmen/deneme', label: 'Deneme Oluştur', icon: '📝', soon: 'Faz 2' },
  { href: '/ogretmen/raporlar', label: 'Raporlar', icon: '📈', soon: 'Faz 3' },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const s = await requireTeacher();
  return <AppShell nav={NAV} userName={s.fullName || 'Öğretmen'} roleLabel="Öğretmen">{children}</AppShell>;
}

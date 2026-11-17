import { AppShell, type NavItem } from '@/components/AppShell';
import { requireStudent } from '@/lib/auth';

const NAV: NavItem[] = [
  { href: '/ogrenci', label: 'Ana Sayfa', icon: '🏠', mobile: true },
  { href: '/ogrenci/denemeler', label: 'Denemelerim', icon: '📝', mobile: true },
  { href: '/ogrenci/soru-bankam', label: 'Soru Bankam', icon: '🗂️', mobile: true },
  { href: '/ogrenci/soru-ekle', label: 'Soru Ekle', icon: '📷', mobile: true },
  { href: '/ogrenci/tekrar', label: 'Tekrar Et', icon: '🔁', mobile: true },
  { href: '/ogrenci/pdf-denemeler', label: 'PDF Kaynakları', icon: '📄' },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStudent();
  return <AppShell nav={NAV} userName={s.fullName || 'Öğrenci'} roleLabel="Öğrenci">{children}</AppShell>;
}

import { AppShell, type NavItem } from '@/components/AppShell';
import { requireTeacher } from '@/lib/auth';

const NAV: NavItem[] = [
  { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
  { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥', mobile: true },
  { href: '/ogretmen/denemeler', label: 'Denemeler', icon: '📝', mobile: true },
  { href: '/ogretmen/pdf-denemeler', label: 'Hazır Denemeler (PDF)', icon: '📄', mobile: true },
  { href: '/ogretmen/siniflar', label: 'Sınıflar', icon: '🏫', mobile: true },
  { href: '/ogretmen/konular', label: 'Konular', icon: '🗂️', mobile: true },
];
const ADMIN_NAV: NavItem[] = [{ href: '/ogretmen/ogretmenler', label: 'Öğretmenler', icon: '🔑' }];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const s = await requireTeacher();
  return <AppShell nav={s.isAdmin ? [...NAV, ...ADMIN_NAV] : NAV} userName={s.fullName || 'Öğretmen'} roleLabel={s.isAdmin ? 'Yönetici öğretmen' : 'Öğretmen'}>{children}</AppShell>;
}

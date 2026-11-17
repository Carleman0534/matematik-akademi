import { AppShell, type NavItem } from '@/components/AppShell';
import { requireTeacher } from '@/lib/auth';

const NAV: NavItem[] = [
  { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
  { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi', icon: '📁', mobile: true },
  { href: '/ogretmen/denemeler', label: 'Deneme Şablonları', icon: '📝', mobile: true },
  { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀', mobile: true },
  { href: '/ogretmen/denemeler/canli', label: 'Devam Eden Sınavlar', icon: '⏱️' },
  { href: '/ogretmen/deneme-analizleri', label: 'Deneme Analizleri', icon: '📈' },
  { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥' },
  { href: '/ogretmen/siniflar', label: 'Sınıflar', icon: '🏫' },
  { href: '/ogretmen/konular', label: 'Konular', icon: '🗂️' },
];
const ADMIN_NAV: NavItem[] = [{ href: '/ogretmen/ogretmenler', label: 'Öğretmenler', icon: '🔑' }];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const s = await requireTeacher();
  return <AppShell nav={s.isAdmin ? [...NAV, ...ADMIN_NAV] : NAV} userName={s.fullName || 'Öğretmen'} roleLabel={s.isAdmin ? 'Yönetici öğretmen' : 'Öğretmen'}>{children}</AppShell>;
}

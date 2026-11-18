import { AppShell, type NavItem } from '@/components/AppShell';
import { requireTeacher } from '@/lib/auth';

const NAV: NavItem[] = [
  { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
  { href: '/ogretmen/asistan', label: 'Akademi Asistanı', icon: '✨', mobile: true },
  { href: '/ogretmen/ders-takvimi', label: 'Ders Takvimi', icon: '📅', mobile: true },
  { href: '/ogretmen/odevler', label: 'Ödev Takibi', icon: '📖', mobile: true },
  { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥', mobile: true },
  { href: '/ogretmen/hazirbulunusluk', label: 'Hazırbulunuşluk & Seviye', icon: '🎯', mobile: true },
  { href: '/ogretmen/yanlis-analizi', label: 'Akıllı Yanlış Analizi', icon: '🔍', mobile: true },
  { href: '/ogretmen/unutma-riski', label: 'Aralıklı Tekrar & Risk', icon: '🔁' },
  { href: '/ogretmen/veliler', label: 'Veliler', icon: '👨‍👩‍👧', mobile: true },
  { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredatı', icon: '📚', mobile: true },
  { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi', icon: '📁' },
  { href: '/ogretmen/pdf-analiz', label: 'PDF Analiz Merkezi', icon: '🔍' },
  { href: '/ogretmen/deneme-konu-analizi', label: 'Deneme Konu Analizi', icon: '📑' },
  { href: '/ogretmen/soru-havuzu', label: 'Soru Havuzu', icon: '🗄️', mobile: true },
  { href: '/ogretmen/ai-soru-uret', label: 'Yapay Zekâ ile Soru Üret', icon: '✨', mobile: true },
  { href: '/ogretmen/calisma-olustur', label: 'Konu Bazlı Çalışma Oluştur', icon: '✍️' },
  { href: '/ogretmen/ogrenme-planlari', label: 'Öğrenme Planları', icon: '🎯' },
  { href: '/ogretmen/ogrenci-konu-analizleri', label: 'Öğrenci Konu Analizleri', icon: '📈' },
  { href: '/ogretmen/ai-uretim-gecmisi', label: 'AI Üretim Geçmişi', icon: '⚡' },
  { href: '/ogretmen/kalite-denetim', label: 'Soru Kalite Denetimi', icon: '🛡️', mobile: true },
  { href: '/ogretmen/denemeler', label: 'Deneme Şablonları', icon: '📝' },
  { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
  { href: '/ogretmen/denemeler/canli', label: 'Canlı Takip', icon: '⏱️' },
  { href: '/ogretmen/deneme-analizleri', label: 'Deneme Sonuçları', icon: '📊' },
  { href: '/ogretmen/deneme-degerlendirme', label: 'Akıllı Deneme Raporu', icon: '📝' },
  { href: '/ogretmen/veli-raporlari', label: 'Veli Gelişim Raporları', icon: '🌱' },
  { href: '/ogretmen/veri-aktar', label: 'Veri Dışa Aktarma', icon: '📥' },
  { href: '/ogretmen/raporlar', label: 'Raporlar', icon: '📋' },
  { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
  { href: '/ogretmen/siniflar', label: 'Sınıflar', icon: '🏫' },
  { href: '/ogretmen/konular', label: 'Konular', icon: '🗂️' },
];
const ADMIN_NAV: NavItem[] = [{ href: '/ogretmen/ogretmenler', label: 'Öğretmenler', icon: '🔑' }];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const s = await requireTeacher();
  return <AppShell nav={s.isAdmin ? [...NAV, ...ADMIN_NAV] : NAV} userName={s.fullName || 'Öğretmen'} roleLabel={s.isAdmin ? 'Yönetici öğretmen' : 'Öğretmen'}>{children}</AppShell>;
}

import { AppShell, type NavGroup, type NavItem } from '@/components/AppShell';
import { requireTeacher } from '@/lib/auth';

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Ana Panel',
    icon: '🏠',
    items: [
      { href: '/ogretmen', label: 'Genel Bakış', icon: '📊', mobile: true },
      { href: '/ogretmen/asistan', label: 'Akademi Asistanı', icon: '✨', mobile: true },
    ]
  },
  {
    title: 'Öğrenci & Sınıf',
    icon: '👥',
    items: [
      { href: '/ogretmen/ogrenciler', label: 'Öğrencilerim', icon: '👥', mobile: true },
      { href: '/ogretmen/siniflar', label: 'Sınıflar', icon: '🏫' },
      { href: '/ogretmen/veliler', label: 'Veliler', icon: '👨‍👩‍👧' },
    ]
  },
  {
    title: 'Ders & Ödev',
    icon: '📅',
    items: [
      { href: '/ogretmen/ders-takvimi', label: 'Ders Takvimi', icon: '📅', mobile: true },
      { href: '/ogretmen/odevler', label: 'Ödev Takibi', icon: '📖' },
      { href: '/ogretmen/calisma-olustur', label: 'Çalışma Oluştur', icon: '✍️' },
      { href: '/ogretmen/ogrenme-planlari', label: 'Öğrenme Planları', icon: '🎯' },
    ]
  },
  {
    title: 'Akıllı Analiz',
    icon: '🧠',
    items: [
      { href: '/ogretmen/hazirbulunusluk', label: 'Hazırbulunuşluk & Seviye', icon: '🎯' },
      { href: '/ogretmen/yanlis-analizi', label: 'Akıllı Yanlış Analizi', icon: '🔍' },
      { href: '/ogretmen/unutma-riski', label: 'Aralıklı Tekrar & Risk', icon: '🔁' },
      { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
      { href: '/ogretmen/ogrenci-konu-analizleri', label: 'Öğrenci Konu Analizleri', icon: '📈' },
    ]
  },
  {
    title: 'Deneme Sınavları',
    icon: '📝',
    items: [
      { href: '/ogretmen/deneme-olustur', label: 'Akıllı Deneme Oluştur (AI & PDF)', icon: '✨', mobile: true },
      { href: '/ogretmen/denemeler', label: 'Deneme Şablonları', icon: '📝', mobile: true },
      { href: '/ogretmen/denemeler/canli', label: 'Canlı Takip', icon: '⏱️' },
      { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
      { href: '/ogretmen/deneme-analizleri', label: 'Deneme Sonuçları', icon: '📊' },
      { href: '/ogretmen/deneme-degerlendirme', label: 'Akıllı Deneme Raporu', icon: '📑' },
    ]
  },
  {
    title: 'PDF & Arşiv Merkezi',
    icon: '📁',
    items: [
      { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁', mobile: true },
      { href: '/ogretmen/deneme-olustur', label: 'Akıllı Deneme Oluştur (LGS)', icon: '✨' },
      { href: '/ogretmen/pdf-analiz', label: 'LGS PDF Analiz & Soru Çıkarma', icon: '🔍' },
      { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
    ]
  },
  {
    title: 'Soru Bankası & AI',
    icon: '🗄️',
    items: [
      { href: '/ogretmen/soru-havuzu', label: 'Soru Havuzu', icon: '🗄️' },
      { href: '/ogretmen/ai-soru-uret', label: 'Yapay Zekâ ile Soru Üret', icon: '✨' },
      { href: '/ogretmen/ai-uretim-gecmisi', label: 'AI Üretim Geçmişi', icon: '⚡' },
      { href: '/ogretmen/kalite-denetim', label: 'Soru Kalite Denetimi', icon: '🛡️' },
      { href: '/ogretmen/konular', label: 'Konular & Kazanımlar', icon: '🗂️' },
    ]
  },
  {
    title: 'Raporlar & Dışa Aktar',
    icon: '📈',
    items: [
      { href: '/ogretmen/raporlar', label: 'Raporlama Merkezi', icon: '📋' },
      { href: '/ogretmen/veli-raporlari', label: 'Veli Gelişim Raporları', icon: '🌱' },
      { href: '/ogretmen/veri-aktar', label: 'Veri Dışa Aktarma', icon: '📥' },
    ]
  }
];

const ADMIN_ITEM: NavItem = { href: '/ogretmen/ogretmenler', label: 'Öğretmenler', icon: '🔑' };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const s = await requireTeacher();
  const groups = s.isAdmin
    ? [
        ...NAV_GROUPS,
        {
          title: 'Yönetim',
          icon: '🔑',
          items: [ADMIN_ITEM, { href: '/ogretmen/ogrenci-paneli', label: 'Öğrenci Paneli Görünürlüğü', icon: '👁️' }]
        }
      ]
    : NAV_GROUPS;

  return (
    <AppShell
      groups={groups}
      userName={s.fullName || 'Öğretmen'}
      roleLabel={s.isAdmin ? 'Yönetici öğretmen' : 'Öğretmen'}
    >
      {children}
    </AppShell>
  );
}

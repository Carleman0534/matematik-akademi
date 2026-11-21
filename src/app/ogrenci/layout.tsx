import { AppShell, type NavItem } from '@/components/AppShell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientSessionSync } from '@/components/ClientSessionSync';

const NAV: NavItem[] = [
  { href: '/ogrenci', label: 'Ana Sayfa', icon: '🏠', mobile: true },
  { href: '/ogrenci/mini-dersler', label: 'Mini Dersler', icon: '📖', mobile: true },
  { href: '/ogrenci/soru-coz', label: 'İpucuyla Soru Çöz', icon: '💡', mobile: true },
  { href: '/ogrenci/gunluk-hedef', label: 'Günlük Matematik Planım', icon: '🔥', mobile: true },
  { href: '/ogrenci/aralikli-tekrar', label: 'Aralıklı Tekrar & Hafıza', icon: '🔁', mobile: true },
  { href: '/ogrenci/rozetlerim', label: 'Başarı Rozetlerim', icon: '🏆', mobile: true },
  { href: '/ogrenci/ozel-calismam', label: 'Bana Özel Çalışmam', icon: '🎯', mobile: true },
  { href: '/ogrenci/tekrar-calismalarim', label: 'Tekrar Çalışmalarım', icon: '🔁' },
  { href: '/ogrenci/konu-basarim', label: 'Konu Başarım', icon: '📊' },
  { href: '/ogrenci/gelisim-raporum', label: 'Gelişim Raporum', icon: '📈' },
  { href: '/ogrenci/denemeler', label: 'Denemelerim', icon: '📝' },
  { href: '/ogrenci/soru-bankam', label: 'Soru Bankam', icon: '🗂️' },
  { href: '/ogrenci/soru-ekle', label: 'Soru Ekle', icon: '📷' },
  { href: '/ogrenci/tekrar', label: 'Tekrar Et', icon: '💡' },
  { href: '/ogrenci/pdf-denemeler', label: 'PDF Kaynakları', icon: '📄' },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) {
    redirect('/giris');
  }

  // Öğretmen "Öğrenci Gözüyle Aç" yaptığında engellenmeden önizleyebilsin
  const isTeacherOrParentPreviewing = s.role === 'teacher' || s.role === 'parent';
  const displayName = isTeacherOrParentPreviewing 
    ? `${s.fullName} (Öğretmen Önizleme Modu)`
    : (s.fullName || 'Öğrenci');

  return (
    <AppShell 
      nav={NAV} 
      userName={displayName} 
      roleLabel={isTeacherOrParentPreviewing ? 'Öğretmen Önizleme' : 'Öğrenci'}
    >
      <ClientSessionSync studentId={s.studentId} studentName={s.fullName} role={s.role} />
      {children}
    </AppShell>
  );
}

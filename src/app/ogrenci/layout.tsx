import { AppShell, type NavItem } from '@/components/AppShell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientSessionSync } from '@/components/ClientSessionSync';
import { StudentFeatureGuard } from '@/components/StudentFeatureGuard';
import { STUDENT_FEATURES } from '@/lib/studentFeatures';
import { getVisibleStudentFeatures } from '@/lib/studentFeaturesDb';

// Ayarlar her istekte okunur (yönetici değiştirdiğinde hemen geçerli olsun)
export const dynamic = 'force-dynamic';

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

  // Öğrenciye yalnızca yöneticinin açtığı bölümler görünür; gizli bölümleri yalnızca yönetici görür
  const visible = await getVisibleStudentFeatures();
  const previewAll = s.role === 'teacher' && s.isAdmin;
  const nav: NavItem[] = STUDENT_FEATURES
    .filter(f => previewAll || visible.includes(f.key))
    .map(f => ({
      href: f.href,
      label: previewAll && !visible.includes(f.key) ? `${f.label} (gizli)` : f.label,
      icon: f.icon,
      mobile: f.mobile,
    }));

  return (
    <AppShell
      nav={nav}
      userName={displayName}
      roleLabel={isTeacherOrParentPreviewing ? 'Öğretmen Önizleme' : 'Öğrenci'}
    >
      <ClientSessionSync studentId={s.studentId} studentName={s.fullName} role={s.role} />
      <StudentFeatureGuard visible={visible} previewAll={previewAll}>
        {children}
      </StudentFeatureGuard>
    </AppShell>
  );
}

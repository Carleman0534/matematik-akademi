import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth';
import { SetupNotice } from '@/components/SetupNotice';

export default async function Home() {
  if (!isConfigured()) return <SetupNotice />;
  const s = await getSession();
  if (!s) redirect('/giris');
  redirect(s.role === 'teacher' ? '/ogretmen' : '/ogrenci');
}

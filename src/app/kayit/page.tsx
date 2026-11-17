import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from './RegisterForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SetupNotice } from '@/components/SetupNotice';
import { isConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = { title: 'Kayıt ol' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isConfigured()) return <SetupNotice />;
  const s = await getSession();
  if (s) redirect(s.role === 'teacher' ? '/ogretmen' : '/ogrenci');
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ThemeToggle className="fixed right-3 top-3" />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-black text-white">∑</span>
          <h1 className="text-2xl font-black">Kayıt ol</h1>
          <p className="mt-1 text-sm text-slate-500">Matematik Akademi&rsquo;ye kayıt yalnızca kodla yapılır.</p>
        </div>
        <div className="card"><RegisterForm initialCode={(sp.kod || '').slice(0, 14)} /></div>
        <p className="mt-4 text-center text-sm text-slate-500">Hesabınız var mı? <Link href="/giris" className="font-semibold text-indigo-600 dark:text-indigo-400">Giriş yapın</Link></p>
      </div>
    </div>
  );
}

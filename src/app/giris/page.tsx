import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LAST_ID_COOKIE } from '@/lib/supabase/session';
import { LoginForm } from './LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SetupNotice } from '@/components/SetupNotice';
import { isConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = { title: 'Giriş' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isConfigured()) return <SetupNotice />;
  const s = await getSession();
  if (s) redirect(s.role === 'teacher' ? '/ogretmen' : '/ogrenci');
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ThemeToggle className="fixed right-3 top-3" />
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-black text-white">∑</span>
          <h1 className="text-2xl font-black">Matematik Akademi</h1>
          <p className="mt-1 text-sm text-slate-500">Yanlışlarını biriktir, tekrar et, eksiklerini kapat.</p>
        </div>
        <div className="card">
          <LoginForm lastId={(await cookies()).get(LAST_ID_COOKIE)?.value} notice={sp.hata === 'pasif' ? 'Hesabınız pasif durumda. Öğretmeninizle iletişime geçin.' : undefined} />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LoginForm } from './LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SetupNotice } from '@/components/SetupNotice';
import { isConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth';
import { Sparkles, ShieldCheck, GraduationCap, CheckCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Giriş Yap — Matematik Akademi' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!isConfigured()) return <SetupNotice />;
  const s = await getSession();
  if (s) redirect(s.role === 'teacher' ? '/ogretmen' : s.role === 'parent' ? '/veli' : '/ogrenci');
  const sp = await searchParams;
  const store = await cookies();
  const initialKimlik = store.get('remembered_kimlik')?.value || '';

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Geometrik & Matematiksel Ambiyans Arka Plan Işıkları */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/15 dark:bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-500/15 dark:bg-purple-600/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Arka Planda Yüzen Zarif Matematiksel Semboller */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-25 dark:opacity-20">
        <span className="absolute top-[12%] left-[10%] text-4xl font-mono font-black text-indigo-400">∑</span>
        <span className="absolute top-[18%] right-[15%] text-3xl font-serif italic text-purple-400">π</span>
        <span className="absolute bottom-[20%] left-[14%] text-3xl font-mono text-teal-400">√x</span>
        <span className="absolute bottom-[15%] right-[12%] text-4xl font-mono text-indigo-400">x²</span>
        <span className="absolute top-[45%] left-[6%] text-2xl font-bold text-amber-400">Δ</span>
        <span className="absolute top-[48%] right-[8%] text-3xl font-mono text-sky-400">∞</span>
      </div>

      <ThemeToggle className="fixed right-4 top-4 z-20 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm" />

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Logo & Başlık Kartı */}
        <div className="mb-6 text-center space-y-3">
          <div className="relative inline-block">
            <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-60 blur-md animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-3xl font-black text-white shadow-xl">
              <span>∑</span>
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-md">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-black tracking-wide mb-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>LGS 2026 MATEMATİK AKADEMİ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
              Matematik Akademi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xs mx-auto">
              Yanlışlarını biriktir, tekrar et, eksiklerini kapat ve hedefine ulaş.
            </p>
          </div>
        </div>

        {/* Ana Giriş Kutusu (Glassmorphism Tasarım) */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/10 dark:shadow-black/40">
          <LoginForm 
            initialKimlik={initialKimlik}
            notice={sp.hata === 'pasif' ? 'Hesabınız pasif durumda. Öğretmeninizle iletişime geçin.' : undefined} 
          />
        </div>

        {/* Güvenlik & Standart Rozetleri */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit Güvenli Oturum</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-indigo-500" />
            <span>MEB 2026 LGS Uyumlu</span>
          </div>
        </div>
      </div>
    </div>
  );
}

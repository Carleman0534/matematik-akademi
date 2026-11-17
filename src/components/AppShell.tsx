'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '@/app/giris/actions';

export interface NavItem { href: string; label: string; icon: string; soon?: string; mobile?: boolean }

export function AppShell({ nav, userName, roleLabel, children }: { nav: NavItem[]; userName: string; roleLabel: string; children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || (href.split('/').length > 2 && path.startsWith(href + '/'));
  return (
    <div className="min-h-screen md:flex">
      {/* Masaüstü: sol menü */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex dark:border-slate-800 dark:bg-slate-900">
        <Link href="/" className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white">∑</span>
          <span className="leading-tight"><b className="block text-sm">Matematik Akademi</b><span className="text-[11px] text-slate-500">Akıllı soru bankası</span></span>
        </Link>
        <nav className="flex-1 space-y-1" aria-label="Ana menü">
          {nav.map(n => n.soon ? (
            <span key={n.href} className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 dark:text-slate-600" title={'Sonraki aşamada: ' + n.soon}>
              <span>{n.icon}</span>{n.label}<span className="ml-auto rounded bg-slate-100 px-1.5 text-[10px] dark:bg-slate-800">{n.soon}</span>
            </span>
          ) : (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
              className={'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ' + (isActive(n.href) ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              <span>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <Link href="/" className="flex items-center gap-2 md:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-black text-white">∑</span></Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-xs leading-tight sm:block"><b className="block text-sm">{userName}</b><span className="text-slate-500">{roleLabel}</span></span>
            <ThemeToggle />
            <form action={logout}><button className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Çıkış</button></form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
      </div>

      {/* Telefon: alt menü */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900" aria-label="Ana menü">
        {nav.filter(n => n.mobile && !n.soon).map(n => (
          <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
            className={'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ' + (isActive(n.href) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500')}>
            <span className="text-lg leading-none">{n.icon}</span>{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

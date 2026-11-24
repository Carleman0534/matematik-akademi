'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '@/app/giris/actions';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  soon?: string;
  mobile?: boolean;
}

export interface NavGroup {
  title: string;
  icon?: string;
  items: NavItem[];
}

export function AppShell({
  nav,
  groups,
  userName,
  roleLabel,
  children
}: {
  nav?: NavItem[];
  groups?: NavGroup[];
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  // Track open/closed state of groups
  const initialOpenGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (groups) {
      groups.forEach(g => {
        const hasActive = g.items.some(
          n => path === n.href || (n.href.split('/').length > 2 && path.startsWith(n.href + '/'))
        );
        map[g.title] = hasActive || g.title === 'Ana Panel';
      });
    }
    return map;
  }, [groups, path]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (href: string) =>
    path === href || (href.split('/').length > 2 && path.startsWith(href + '/'));

  // Mobile navigation items (top 5 essential items)
  const mobileNav = useMemo(() => {
    if (nav) return nav.filter(n => n.mobile && !n.soon).slice(0, 5);
    if (groups) {
      return groups.flatMap(g => g.items).filter(n => n.mobile && !n.soon).slice(0, 5);
    }
    return [];
  }, [nav, groups]);

  // Filter groups when searching
  const displayedGroups = useMemo(() => {
    if (!groups) return null;
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase().trim();
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(
          item => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
        )
      }))
      .filter(g => g.items.length > 0);
  }, [groups, searchQuery]);

  return (
    <div className="min-h-screen md:flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Masaüstü: sol menü */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-3.5 md:flex dark:border-slate-800 dark:bg-slate-900 overflow-y-auto max-h-screen sticky top-0">
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-sm">
            ∑
          </span>
          <span className="leading-tight">
            <b className="block text-sm font-black">Matematik Akademi</b>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">LGS Eğitim Yönetimi</span>
          </span>
        </Link>

        {/* Hızlı Menü Arama */}
        <div className="relative mb-3 px-1">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Menüde ara (deneme, ödev...)"
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Gruplanmış Menü */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Ana menü">
          {displayedGroups ? (
            displayedGroups.map(group => {
              const isOpen = searchQuery.trim().length > 0 || !!openGroups[group.title];
              const hasActiveItem = group.items.some(n => isActive(n.href));
              return (
                <div key={group.title} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition rounded-lg ${
                      hasActiveItem
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 font-black'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      {group.icon && <span>{group.icon}</span>}
                      <span className="truncate">{group.title}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {group.items.length}
                      </span>
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-0.5 pl-1">
                      {group.items.map(n => {
                        const active = isActive(n.href);
                        return (
                          <Link
                            key={n.href}
                            href={n.href}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                              active
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <span className="text-sm shrink-0">{n.icon}</span>
                            <span className="truncate">{n.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : nav ? (
            nav.map(n => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              );
            })
          ) : null}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-black text-white">∑</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <b className="block text-sm">{userName}</b>
              <span className="text-slate-500">{roleLabel}</span>
            </span>
            <ThemeToggle />
            <Link href="/sifre" className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition">
              Şifre
            </Link>
            <form action={logout}>
              <button className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition">
                Çıkış
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
      </div>

      {/* Telefon: alt menü */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900" aria-label="Ana menü">
        {mobileNav.map(n => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${
              isActive(n.href) ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
            }`}
          >
            <span className="text-lg leading-none">{n.icon}</span>
            <span className="truncate max-w-[64px]">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

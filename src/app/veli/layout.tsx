'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, FileText, TrendingUp, CheckSquare, MessageSquare, 
  Bell, Users, ChevronDown, Sparkles, FileBarChart 
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { logout } from '@/app/giris/actions';

interface ChildStudent {
  student_id: string;
  student_name: string;
  grade: number;
  school: string;
  relationship_type: string;
}

export default function VeliLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [childrenList, setChildrenList] = useState<ChildStudent[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/parent/students');
        const data = await res.json();
        if (data.success && data.students.length > 0) {
          setChildrenList(data.students);
          // LocalStorage veya ilk çocuk
          const saved = localStorage.getItem('parent_active_student_id');
          if (saved && data.students.some((s: ChildStudent) => s.student_id === saved)) {
            setSelectedChildId(saved);
          } else {
            setSelectedChildId(data.students[0].student_id);
            localStorage.setItem('parent_active_student_id', data.students[0].student_id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchChildren();
  }, []);

  const handleSelectChild = (id: string) => {
    setSelectedChildId(id);
    localStorage.setItem('parent_active_student_id', id);
    window.dispatchEvent(new Event('active_student_changed'));
  };

  const navItems = [
    { href: '/veli', label: 'Genel Bakış', icon: Home },
    { href: '/veli/raporlar', label: 'Gelişim Raporları', icon: FileBarChart },
    { href: '/veli/denemeler', label: 'Deneme Sonuçları', icon: FileText },
    { href: '/veli/konu-gelisimi', label: 'Konu Gelişimi', icon: TrendingUp },
    { href: '/veli/calismalar', label: 'Çalışma ve Ödevler', icon: CheckSquare },
    { href: '/veli/ogretmen-notlari', label: 'Öğretmen Notları', icon: MessageSquare },
    { href: '/veli/bildirimler', label: 'Bildirimler', icon: Bell },
  ];

  const activeChild = childrenList.find(c => c.student_id === selectedChildId);

  return (
    <div className="min-h-screen bg-slate-50 md:flex dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sol Kenar Menüsü */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex dark:border-slate-800 dark:bg-slate-900">
        <Link href="/veli" className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white">∑</span>
          <span className="leading-tight">
            <b className="block text-sm">Matematik Akademi</b>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Veli Takip Portalı</span>
          </span>
        </Link>

        {/* Çoklu Çocuk Seçici (Section 20.2) */}
        {childrenList.length > 0 && (
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 dark:border-indigo-950 dark:bg-indigo-950/30">
            <label className="block text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1">
              Takip Edilen Öğrenci
            </label>
            <select
              value={selectedChildId}
              onChange={e => handleSelectChild(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 bg-white p-1.5 text-xs font-bold text-slate-800 focus:outline-none dark:border-indigo-800 dark:bg-slate-900 dark:text-white"
            >
              {childrenList.map(c => (
                <option key={c.student_id} value={c.student_id}>
                  {c.student_name} ({c.grade}. Sınıf - {c.relationship_type})
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 space-y-1" aria-label="Veli menüsü">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Ana Gövde */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst Bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <Link href="/veli" className="flex items-center gap-2 md:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-black text-white">∑</span>
            </Link>
            {activeChild && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                <span>Öğrenciniz: <b>{activeChild.student_name}</b> ({activeChild.grade}. Sınıf)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={logout}>
              <button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Çıkış Yap
              </button>
            </form>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900">
        {navItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubTabItem {
  href: string;
  label: string;
  icon?: string | React.ReactNode;
  badge?: string;
  count?: number;
  description?: string;
}

interface SubTabBarProps {
  title?: string;
  description?: string;
  tabs: SubTabItem[];
  rightAction?: React.ReactNode;
  className?: string;
}

export function SubTabBar({
  title,
  description,
  tabs,
  rightAction,
  className = '',
}: SubTabBarProps) {
  const pathname = usePathname();

  const isTabActive = (tabHref: string) => {
    if (pathname === tabHref) return true;
    // Eğer alt sayfadaysa (örn: /ogretmen/denemeler/canli/123 -> /ogretmen/denemeler/canli)
    if (tabHref !== '/ogretmen' && tabHref !== '/ogretmen/denemeler' && pathname.startsWith(tabHref + '/')) {
      return true;
    }
    return false;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {(title || rightAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && (
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          )}
          {rightAction && <div className="flex items-center gap-2 shrink-0">{rightAction}</div>}
        </div>
      )}

      {/* Yatay Sekme Şeridi */}
      <div className="bg-white dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto scrollbar-none flex items-center gap-1">
        {tabs.map((tab) => {
          const active = isTabActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon && (
                <span className={`text-sm shrink-0 ${active ? 'text-white' : 'opacity-80'}`}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>

              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {tab.badge && (
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded-md font-black tracking-wider ${
                    active
                      ? 'bg-white/25 text-white'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

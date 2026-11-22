'use client';

import React from 'react';

interface FeynRetentionDashboardProps {
  dueCount: number;
  hardCount?: number;
}

// Bugünkü tekrar özeti: yalnızca öğrencinin gerçek tekrar kuyruğundan gelen sayılar
export function FeynRetentionDashboard({ dueCount, hardCount = 0 }: FeynRetentionDashboardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bugün Tekrar Bekleyen</div>
      <div className="text-6xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{dueCount}</div>
      <div className="mt-2 text-xs font-bold text-slate-400">
        Birden çok kez yanlış yapılan: <strong className="text-rose-600 dark:text-rose-400 font-mono">{hardCount}</strong>
      </div>
    </div>
  );
}

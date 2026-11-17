'use client';

import React from 'react';
import { Calendar, Clock, Flame, ChevronRight, AlertCircle, TrendingUp, Sparkles, Folder } from 'lucide-react';

interface FeynRetentionDashboardProps {
  dueCount: number;
  newCount?: number;
  hardCount?: number;
}

export function FeynRetentionDashboard({
  dueCount = 23,
  newCount = 17,
  hardCount = 0
}: FeynRetentionDashboardProps) {
  // Calendar heatmap simulation (last 16 weeks)
  const heatmapWeeks = Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const active = (w * 7 + d) % 3 === 0 || (w * 7 + d) % 5 === 0;
      const intensity = active ? ((w + d) % 3) + 1 : 0;
      return intensity;
    })
  );

  const getHeatmapColor = (intensity: number) => {
    switch (intensity) {
      case 1: return 'bg-emerald-200 dark:bg-emerald-950';
      case 2: return 'bg-emerald-400 dark:bg-emerald-700';
      case 3: return 'bg-emerald-600 dark:bg-emerald-500';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Main Due Counter */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-600">
          <span>Bugün Tekrar Bekleyen (Due Today)</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        <div className="text-6xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
          {dueCount}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs font-bold text-slate-400">
          <span>Yeni Soru: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{newCount}</strong></span>
          <span>•</span>
          <span>Zor Soru: <strong className="text-rose-600 dark:text-rose-400 font-mono">{hardCount}</strong></span>
        </div>

        {/* Calendar Heatmap (GitHub / Feyn style) */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Çalışma & Tekrar Takvimi (Calendar Heatmap)</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">14 Günlük Seri 🔥</span>
          </div>

          <div className="flex gap-1 justify-center overflow-x-auto py-1">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((intensity, dIdx) => (
                  <div
                    key={dIdx}
                    className={`w-3 h-3 rounded-xs transition-colors ${getHeatmapColor(intensity)}`}
                    title={`Hafta ${wIdx + 1}, Gün ${dIdx + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Detail Cards Grid (Feyn Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Zorluk / Kritik Soru Kartı */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>En Çok Zorlanılan</span>
            </span>
            <div className="my-4 text-center">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-wide">
                FONKSİYONLAR
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 text-center">
            8 soru kritik zorluk seviyesinde.
          </span>
        </div>

        {/* 2. Kalıcılık Oranı (Retention Rate) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Kalıcılık Oranı (Retention)</span>
            </span>
            <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
              %51,9
            </div>
            <span className="text-xs font-bold text-amber-600 block mt-0.5">Orta / Geliştirilmeli</span>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-linear-to-r from-rose-500 via-amber-400 to-emerald-500" style={{ width: '51.9%' }}></div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>En Verimli Saat</span>
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              10:00 (Sabah) · %100 Başarı
            </div>
          </div>
        </div>

        {/* 3. 7 Günlük Tekrar Takvimi (Due Forecast) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tekrar Programı (Due)</span>
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
              <span>Bugün</span>
              <span>23</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Perşembe</span>
              <span className="font-mono">10</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Cuma</span>
              <span className="font-mono">1</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Cumartesi</span>
              <span className="font-mono">9</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <span>Pazar</span>
              <span className="font-mono">1</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>Pazartesi</span>
              <span className="font-mono">2</span>
            </div>
          </div>
        </div>

        {/* 4. Konu Klasörleri Kalıcılık Çubukları (Folders) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-2">
            <Folder className="w-3.5 h-3.5 text-indigo-500" />
            <span>Konu Kalıcılığı (Folders)</span>
          </span>
          
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Fonksiyonlar</span>
                <span className="text-emerald-600 font-bold">%82</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Polinomlar</span>
                <span className="text-amber-500 font-bold">%58</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '58%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Trigonometri</span>
                <span className="text-rose-500 font-bold">%34</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '34%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">Parabol</span>
                <span className="text-emerald-600 font-bold">%75</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

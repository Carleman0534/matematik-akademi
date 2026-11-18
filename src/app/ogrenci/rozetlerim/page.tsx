'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Target, Flame, Sparkles, Clock, CheckCircle2, Lock, TrendingUp } from 'lucide-react';

interface Badge {
  id: string;
  badge_code: string;
  badge_title: string;
  badge_description: string;
  icon: string;
  earned_at: string;
}

interface UpcomingBadge {
  code: string;
  title: string;
  desc: string;
  icon: string;
}

interface CountdownData {
  examTitle: string;
  targetDate: string;
  daysRemaining: number;
  targetNet: number;
  currentAvgNet: number;
}

export default function RozetlerimPage() {
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [upcomingBadges, setUpcomingBadges] = useState<UpcomingBadge[]>([]);
  const [countdown, setCountdown] = useState<CountdownData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/student/badges').then(r => r.json()),
      fetch('/api/system/exam-countdown').then(r => r.json())
    ]).then(([badgeRes, countRes]) => {
      setEarnedBadges(badgeRes.earnedBadges || []);
      setUpcomingBadges(badgeRes.upcomingBadges || []);
      setCountdown(countRes);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* LGS Geri Sayımı & Hedef Net Kartı (Section 14) */}
      {countdown && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center justify-center md:justify-start gap-1">
              <Clock className="w-3.5 h-3.5" /> Hedefe Kalan Süre
            </span>
            <h2 className="text-2xl font-black">{countdown.examTitle}</h2>
            <p className="text-xs text-amber-100">
              Sınav Tarihi: <strong>{new Date(countdown.targetDate).toLocaleDateString('tr-TR')}</strong>
            </p>
          </div>

          {/* Kalan Gün Sayacı */}
          <div className="flex items-center gap-4">
            <div className="text-center p-3.5 rounded-2xl bg-white/20 backdrop-blur min-w-[100px]">
              <span className="text-4xl font-black block leading-none">{countdown.daysRemaining}</span>
              <span className="text-xs font-bold text-amber-100 uppercase tracking-wider mt-1 block">Gün Kaldı</span>
            </div>

            <div className="text-center p-3.5 rounded-2xl bg-white/20 backdrop-blur min-w-[120px]">
              <div className="text-xs font-semibold text-amber-200">Hedef / Mevcut</div>
              <div className="text-xl font-black mt-0.5">
                {countdown.targetNet} <span className="text-xs font-normal text-amber-200">/ {countdown.currentAvgNet} Net</span>
              </div>
              <div className="text-[10px] text-amber-100 mt-1">Fark: +{(countdown.targetNet - countdown.currentAvgNet).toFixed(2)} Net</div>
            </div>
          </div>
        </div>
      )}

      {/* Başarı ve Motivasyon Rozetleri (Section 12) */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Başarı & Motivasyon Rozetlerim
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yarışma yerine kendi kişisel ilerlemenizi ödüllendiren gerçek çalışma rozetleri.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Rozetler yükleniyor...</div>
        ) : (
          <div className="space-y-6">
            {/* Kazanılan Rozetler */}
            <div className="card space-y-3">
              <h3 className="font-black text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Kazanılan Başarı Rozetleri ({earnedBadges.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-indigo-950/20 text-center space-y-2 shadow-xs">
                    <div className="text-4xl">{b.icon}</div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{b.badge_title}</h4>
                    <p className="text-xs text-slate-500">{b.badge_description}</p>
                    <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                      ✓ Kazanıldı
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sıradaki Kilitli Rozetler */}
            {upcomingBadges.length > 0 && (
              <div className="card space-y-3">
                <h3 className="font-black text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-5 h-5 text-slate-400" />
                  Sıradaki Kilitli Hedef Rozetler ({upcomingBadges.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {upcomingBadges.map((ub) => (
                    <div key={ub.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 dark:bg-slate-900/40 text-center space-y-2 opacity-75">
                      <div className="text-3xl filter grayscale">{ub.icon}</div>
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">{ub.title}</h4>
                      <p className="text-xs text-slate-500">{ub.desc}</p>
                      <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        🔒 Kilitli
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

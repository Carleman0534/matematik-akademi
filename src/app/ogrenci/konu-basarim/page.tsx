'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, BarChart3, TrendingUp, CheckCircle2, AlertTriangle, 
  ArrowRight, BookOpen, Sparkles 
} from 'lucide-react';

export default function KonuBasarimPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/student-analytics');
        const resData = await res.json();
        if (resData.success) {
          setData(resData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="h-4 w-4" /> MEB LGS Matematik Kazanım Yetkinliği
          </div>
          <h1 className="text-2xl font-black">Konu Bazlı Matematik Başarım</h1>
          <p className="text-sm text-blue-100 mt-1 max-w-2xl">
            12 ana LGS konusundaki ustalık düzeyin, soru çözümlerinden elde edilen başarı katsayısı ve seviye rozetlerin.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Konu başarı verilerin yükleniyor...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.topicPerformance?.map((tp: any) => {
            const mastery = tp.mastery_score || 0;
            let levelLabel = 'Başlangıç';
            let badgeStyle = 'bg-slate-100 text-slate-600';
            if (mastery >= 85) {
              levelLabel = '🏆 Usta Seviye';
              badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
            } else if (mastery >= 70) {
              levelLabel = '⭐ Güçlü';
              badgeStyle = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
            } else if (mastery >= 45) {
              levelLabel = '📈 Gelişiyor';
              badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
            } else {
              levelLabel = '⚠️ Eksik / Kritik';
              badgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
            }

            return (
              <div 
                key={tp.topic_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badgeStyle}`}>
                      {levelLabel}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      %{mastery}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {tp.topic_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tp.solved_count ? `${tp.solved_count} soru çözüldü` : 'Henüz çözülmedi'}
                    </p>
                  </div>

                  {/* İlerleme Çubuğu */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${
                        mastery >= 80 ? 'bg-emerald-500' :
                        mastery >= 60 ? 'bg-blue-500' :
                        mastery >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {tp.correct_count || 0}D / {tp.wrong_count || 0}Y
                  </span>
                  <Link
                    href="/ogrenci/ozel-calismam"
                    className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                  >
                    Çalış <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

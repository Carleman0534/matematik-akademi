'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, CheckCircle2, TrendingUp, Sparkles, ArrowRight, 
  Target, Zap, Clock 
} from 'lucide-react';

export default function KonuEksiklerimPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/student-analytics?studentId=50fa22f6-1021-4dde-8278-2339fa65030d');
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

  const criticalWeak = data?.topicPerformance?.filter((t: any) => t.status === 'critical_weak') || [];
  const improving = data?.topicPerformance?.filter((t: any) => t.status === 'improving') || [];
  const strong = data?.topicPerformance?.filter((t: any) => t.status === 'mastered' || t.status === 'good') || [];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-indigo-700 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="h-4 w-4" /> Hedefli Gelişim ve Eksik Tamamlama
          </div>
          <h1 className="text-2xl font-black">LGS Matematik Konu Eksiklerim</h1>
          <p className="text-sm text-rose-100 mt-1 max-w-2xl">
            Çözdüğün denemeler ve testlerde en çok hata yaptığın konular yapay zekâ tarafından tespit edilir. Bu konulara odaklanarak netlerini hızlıca artırabilirsin.
          </p>
        </div>
        <Link
          href="/ogrenci/ozel-calismam"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-rose-700 shadow-md transition hover:bg-rose-50"
        >
          <Sparkles className="h-4 w-4" /> Eksiklerimi Çözmeye Başla
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Konu eksiklerin analiz ediliyor...</div>
      ) : (
        <div className="space-y-6">
          {/* Acil Tekrar Gereken Konular */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-950 dark:bg-rose-950/20 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-rose-900 dark:text-rose-200">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>Öncelikli Eksik Konuların ({criticalWeak.length})</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {criticalWeak.map((topic: any) => (
                <div key={topic.topic_id} className="rounded-xl border border-white bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{topic.topic_name}</h3>
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                        Başarı: %{topic.mastery_score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Toplam {topic.solved_count} soruda <b className="text-rose-600">{topic.wrong_count} yanlış</b>, <b className="text-slate-600">{topic.blank_count} boş</b> bıraktın.
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Ort. Çözüm Süresi: {topic.avg_duration_seconds} sn</span>
                    <Link
                      href="/ogrenci/ozel-calismam"
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                    >
                      Hemen Çalış <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geliştirilmesi Gereken Konular */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-950 dark:bg-amber-950/20 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-amber-900 dark:text-amber-200">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span>Tekrarla Pekiştirilmesi Gereken Konular ({improving.length})</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {improving.map((topic: any) => (
                <div key={topic.topic_id} className="rounded-xl border border-white bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{topic.topic_name}</h3>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Başarı: %{topic.mastery_score}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Temel kavramlar iyi ancak zorlayıcı problemlerde takılmalar yaşanıyor.
                  </p>
                  <Link
                    href="/ogrenci/ozel-calismam"
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                  >
                    Pratik Yap <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Güçlü Konular */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>En Güçlü Olduğun Konular ({strong.length})</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {strong.map((topic: any) => (
                <div key={topic.topic_id} className="rounded-xl border border-white bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{topic.topic_name}</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Yüksek net ve istikrar</p>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    %{topic.mastery_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

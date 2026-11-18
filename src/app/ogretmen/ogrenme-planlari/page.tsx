'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, Users, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  Calendar, Layers, Sparkles 
} from 'lucide-react';

export default function OgrenmePlanlariPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/study-plans');
        const data = await res.json();
        if (data.success) {
          setPlans(data.plans);
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
            <Target className="h-4 w-4" /> Bireyselleştirilmiş Öğrenme
          </div>
          <h1 className="text-2xl font-black">Kişiselleştirilmiş Öğrenme Planları</h1>
          <p className="text-sm text-blue-100 mt-1 max-w-2xl">
            Öğrencilerin LGS eksiklerine göre atanmış özel çalışma setlerini, tamamlama durumlarını ve uyarlanabilir zorluk ilerlemelerini takip edin.
          </p>
        </div>
        <Link
          href="/ogretmen/calisma-olustur"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-blue-50"
        >
          <Sparkles className="h-4 w-4" /> Yeni Plan Oluştur
        </Link>
      </div>

      {/* Plan Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Aktif ve Tamamlanan Çalışma Planları ({plans.length})</h2>
          <span className="text-xs text-slate-500">Tüm öğrenciler</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Planlar yükleniyor...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Henüz atanmış bir çalışma planı bulunmuyor. Yeni çalışma oluşturabilirsiniz.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {plans.map(p => (
              <div key={p.id} className="p-6 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Öğrenci: {p.student_name || 'Öğrenci'}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {p.total_questions || 10} Soru
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Süre: {p.estimated_duration_min || 30} dk
                    </span>
                    {p.is_adaptive ? (
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        ⚡ Uyarlanabilir
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  {p.description && (
                    <p className="text-xs text-slate-500">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                    p.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {p.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

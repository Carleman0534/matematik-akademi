'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, AlertTriangle, CheckCircle2, Sparkles, ArrowRight, 
  Layers, FileText, TrendingUp, Info 
} from 'lucide-react';

export default function DenemeKonuAnaliziPage() {
  const [loading, setLoading] = useState(true);
  const [comparative, setComparative] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/pdf-analysis');
        const data = await res.json();
        if (data.success && data.comparative) {
          setComparative(data.comparative);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" /> Çoklu Deneme Çapraz Konu Matrisi
          </div>
          <h1 className="text-2xl font-black">Birden Fazla Denemeden Ortak Konu Analizi</h1>
          <p className="text-sm text-teal-100 mt-1 max-w-2xl">
            Sisteme yüklenen tüm LGS denemeleri taranarak konuların soru sayıları, farklı problem tipleri ve görsel zenginliği karşılaştırılır; eksik konular için AI soru üretim önceliği belirlenir.
          </p>
        </div>
        <Link
          href="/ogretmen/ai-soru-uret"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" /> Eksik Konulara Soru Üret
        </Link>
      </div>

      {/* Karşılaştırmalı Tablo (yalnızca PDF'lerden çıkarılmış gerçek sorulardan hesaplanır) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">LGS Konu Bazında Kaynak Dağılım Tablosu</h2>
          <span className="text-xs text-slate-500">Tüm taranan denemeler baz alınmıştır</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Analiz tablosu hazırlanıyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Konu</th>
                  <th className="px-6 py-3.5 text-center">Toplam Soru</th>
                  <th className="px-6 py-3.5 text-center">Farklı Soru Tipi</th>
                  <th className="px-6 py-3.5 text-center">Görsel Oranı</th>
                  <th className="px-6 py-3.5 text-center">Ortalama Zorluk</th>
                  <th className="px-6 py-3.5">Durum & AI Önerisi</th>
                  <th className="px-6 py-3.5 text-right">Eylem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {comparative?.topicBreakdown?.map((item: any) => (
                  <tr key={item.topicId} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {item.topicName}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {item.totalQuestions} soru
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.questionTypesCount} tip
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        %{item.hasVisualPercent}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        {item.avgDifficulty} / 5
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                          item.statusNote.includes('Kritik') ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60' :
                          item.statusNote.includes('Sınırlı') ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                        }`}>
                          {item.statusNote}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">{item.recommendation}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/ogretmen/ai-soru-uret?topicId=${item.topicId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        Soru Üret <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

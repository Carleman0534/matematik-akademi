'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Repeat, Sparkles, ArrowRight } from 'lucide-react';

interface ReviewItem {
  id: string;
  topicName: string;
  sourceType: string;
  questionText: string;
  nextReviewAt: string | null;
  lastPerformance: string | null;
  repetitionLevel: number;
  isMastered: boolean;
}

// Tekrar kuyruğu: öğrencinin gerçek aralıklı tekrar kayıtlarından
export default function TekrarCalismalarimPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning/spaced-repetition', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(d => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const due = items.filter(i => !i.isMastered && (!i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now));
  const learning = items.filter(i => !i.isMastered && i.nextReviewAt && new Date(i.nextReviewAt).getTime() > now);
  const mastered = items.filter(i => i.isMastered);
  const reviewed = items.filter(i => i.lastPerformance);
  const successRate = reviewed.length
    ? Math.round((reviewed.filter(i => i.lastPerformance === 'correct').length / reviewed.length) * 100)
    : null;

  const kpis = [
    { label: 'Bugün Tekrar Bekleyen', value: `${due.length} Soru`, cls: 'text-rose-600' },
    { label: 'Öğrenilme Aşamasında', value: `${learning.length} Soru`, cls: 'text-amber-600' },
    { label: 'Kalıcı Öğrenilenler', value: `${mastered.length} Soru`, cls: 'text-emerald-600' },
    { label: 'Tekrar Başarı Oranı', value: successRate === null ? '—' : `%${successRate}`, cls: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Repeat className="h-4 w-4" /> Aralıklı Tekrar Sistemi
          </div>
          <h1 className="text-2xl font-black">Tekrar Çalışmalarım</h1>
          <p className="text-sm text-teal-100 mt-1 max-w-2xl">
            Denemelerde yanlış yaptığın veya boş bıraktığın sorular unutma eğrisine göre belirli aralıklarla karşına çıkar.
          </p>
        </div>
        <Link
          href="/ogrenci/ozel-calismam"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" /> Tekrar Testini Başlat
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">{k.label}</p>
            <p className={`mt-1 text-2xl font-black ${k.cls}`}>{loading ? '…' : k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Bugün Çözülmesi Gereken Tekrar Soruları</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Yükleniyor…</div>
        ) : due.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Bugün tekrar etmen gereken soru yok. Deneme çözdükçe yanlışların burada sırayla karşına çıkacak.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {due.map(q => (
              <div key={q.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <div className="space-y-1.5 flex-1">
                  <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {q.topicName}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{q.questionText}</p>
                </div>
                <Link
                  href="/ogrenci/ozel-calismam"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 shrink-0 self-end sm:self-center"
                >
                  Şimdi Tekrar Çöz <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

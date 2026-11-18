'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Repeat, CheckCircle2, Clock, Calendar, Sparkles, ArrowRight, 
  HelpCircle, AlertCircle, BookOpen 
} from 'lucide-react';

export default function TekrarCalismalarimPage() {
  const [loading, setLoading] = useState(false);

  const reviewQueue = [
    {
      id: 'rev-1',
      topic: 'Çarpanlar ve Katlar',
      subtopic: 'EBOB-EKOK Problemleri',
      errorType: 'İşlem Hatası',
      daysAgo: 2,
      difficulty: 3,
      text: 'Ahmet Bey bahçesine dikdörtgen şeklinde bir çit çekecektir. Kenar uzunlukları 48 metre ve 72 metre olan bu bahçenin etrafına eşit aralıklarla fidan dikilecektir...'
    },
    {
      id: 'rev-2',
      topic: 'Üçgenler',
      subtopic: 'Pisagor Bağıntısı',
      errorType: 'Kavram Eksikliği',
      daysAgo: 4,
      difficulty: 4,
      text: 'Bir dik üçgenin dik kenar uzunlukları 9 cm ve 12 cm dir. Bu üçgenin hipotenüs uzunluğuna eşit kenarı olan bir eşkenar üçgen çizilmek isteniyor...'
    },
    {
      id: 'rev-3',
      topic: 'Kareköklü İfadeler',
      subtopic: 'Kareköklü Sayılarda Alan',
      errorType: 'Soru Kökünü Yanlış Okuma',
      daysAgo: 1,
      difficulty: 3,
      text: 'Alanı 150 cm² olan kare şeklindeki bir kartonun bir kenar uzunluğu hangi iki ardışık doğal sayı arasındadır?'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Repeat className="h-4 w-4" /> Aralıklı Tekrar Sistemi (SM-2)
          </div>
          <h1 className="text-2xl font-black">Tekrar Çalışmalarım</h1>
          <p className="text-sm text-teal-100 mt-1 max-w-2xl">
            Denemelerde yanlış yaptığın veya boş bıraktığın sorular unutma eğrisine göre belirli aralıklarla karşına çıkar. Böylece yaptığın hataları kalıcı öğrenmeye dönüştürürsün.
          </p>
        </div>
        <Link
          href="/ogrenci/ozel-calismam"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" /> Tekrar Testini Başlat
        </Link>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Bugün Tekrar Bekleyen</p>
          <p className="mt-1 text-2xl font-black text-rose-600">3 Soru</p>
          <p className="mt-0.5 text-xs text-rose-500 font-semibold">Hemen çözülmeli</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Öğrenilme Aşamasında</p>
          <p className="mt-1 text-2xl font-black text-amber-600">8 Soru</p>
          <p className="mt-0.5 text-xs text-slate-400">1 kez doğru yapıldı</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Kalıcı Öğrenilenler</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">24 Soru</p>
          <p className="mt-0.5 text-xs text-emerald-600 font-semibold">Hafızaya yerleşti</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Tekrar Başarı Oranı</p>
          <p className="mt-1 text-2xl font-black text-indigo-600">%78.5</p>
          <p className="mt-0.5 text-xs text-slate-400">Yüksek net artışı</p>
        </div>
      </div>

      {/* Tekrar Kuyruğu */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Bugün Çözülmesi Gereken Tekrar Soruları</h2>
          <span className="text-xs text-slate-500">Aralıklı tekrar algoritması</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reviewQueue.map(q => (
            <div key={q.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {q.topic}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {q.subtopic}
                  </span>
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    Neden: {q.errorType}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  {q.text}
                </p>
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
      </div>
    </div>
  );
}

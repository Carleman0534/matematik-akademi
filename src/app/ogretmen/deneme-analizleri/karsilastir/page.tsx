'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award,
  Users,
  BookOpen
} from 'lucide-react';

export default function GelisimKarsilastirmaPage() {
  const [selectedStudent, setSelectedStudent] = useState('Ahmet Yılmaz');
  const [selectedExam, setSelectedExam] = useState('2026 AYT Matematik Türkiye Geneli Deneme');

  // Örnek 1. ve 2. Çözüm Verisi
  const comparisonData = {
    attempt1: {
      date: '15 Ekim 2026',
      correct: 24,
      wrong: 10,
      blank: 6,
      net: 21.5,
      duration: '58 dk',
    },
    attempt2: {
      date: '15 Kasım 2026',
      correct: 33,
      wrong: 4,
      blank: 3,
      net: 32.0,
      duration: '47 dk',
    },
    recoveredQuestions: [3, 7, 12, 14, 21, 28, 35], // İlkinde yanlış ikincisinde doğru
    persistentWrongQuestions: [18, 32], // İkisinde de yanlış
  };

  const netDiff = parseFloat((comparisonData.attempt2.net - comparisonData.attempt1.net).toFixed(2));

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/ogretmen/deneme-analizleri" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Aynı Denemenin Gelişim Karşılaştırması</h1>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Retest & Öğrenme Kanıtı
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencinin aynı denemeyi iki farklı tarihte çözdüğündeki net, süre ve soru bazlı gelişimini kıyaslayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
          >
            <option value="Ahmet Yılmaz">Ahmet Yılmaz (12. Sınıf)</option>
            <option value="Mehmet Demir">Mehmet Demir (12. Sınıf)</option>
            <option value="Ayşe Kaya">Ayşe Kaya (12. Sınıf)</option>
          </select>
        </div>
      </div>

      {/* Net ve Süre Değişim Özeti Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Çözüm Kartı */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Sınav Oturumu</span>
          <div className="text-xs text-slate-500">{comparisonData.attempt1.date}</div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-2">
            {comparisonData.attempt1.net} <span className="text-xs font-semibold">Net</span>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{comparisonData.attempt1.correct}D / {comparisonData.attempt1.wrong}Y / {comparisonData.attempt1.blank}B</span>
            <span>{comparisonData.attempt1.duration}</span>
          </div>
        </div>

        {/* 2. Çözüm Kartı */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">2. Tekrar Sınavı</span>
          <div className="text-xs text-slate-500">{comparisonData.attempt2.date}</div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {comparisonData.attempt2.net} <span className="text-xs font-semibold">Net</span>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{comparisonData.attempt2.correct}D / {comparisonData.attempt2.wrong}Y / {comparisonData.attempt2.blank}B</span>
            <span>{comparisonData.attempt2.duration}</span>
          </div>
        </div>

        {/* Gelişim Farkı Kartı */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-3xl shadow-md space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-100">
              <TrendingUp className="w-4 h-4" />
              <span>Net Artışı & Hızlanma</span>
            </div>
            <div className="text-3xl font-black mt-2">
              +{netDiff} Net 🚀
            </div>
          </div>
          <div className="text-xs text-indigo-100 pt-2 border-t border-white/20 flex justify-between">
            <span>11 dakika daha hızlı çözdü</span>
            <span>+7 Soru Telafi Edildi</span>
          </div>
        </div>
      </div>

      {/* Soru Bazlı İyileşme Detayı */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kazanılan Sorular */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Telafi Edilen / Kazanılan Sorular ({comparisonData.recoveredQuestions.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Öğrencinin 1. sınavda yanlış yapıp, çalıştıktan sonra 2. sınavda başarıyla doğruya çevirdiği sorular:
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {comparisonData.recoveredQuestions.map((q) => (
              <span
                key={q}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
              >
                <span>Soru {q}</span>
                <span className="text-[10px] text-emerald-600">✓ (+1.25 Net)</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hâlâ Eksik Kalan Sorular */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-rose-600">
            <XCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Hâlâ Destek Gereken Sorular ({comparisonData.persistentWrongQuestions.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Her iki sınav oturumunda da yanlış yapılan ve özel derste odaklanılması önerilen konular:
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {comparisonData.persistentWrongQuestions.map((q) => (
              <span
                key={q}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-xl font-bold text-xs border border-rose-200 dark:border-rose-800"
              >
                Soru {q} (Trigonometrik Denklemler)
              </span>
            ))}
          </div>

          <div className="pt-3">
            <Link
              href="/ogretmen/ogrenciler"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
            >
              <span>Bu konular için öğrencinin soru bankasına git →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

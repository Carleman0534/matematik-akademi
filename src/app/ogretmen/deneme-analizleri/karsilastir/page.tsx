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
  BookOpen,
  Filter,
  Calendar,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

export default function GelisimKarsilastirmaPage() {
  const [selectedStudent, setSelectedStudent] = useState('Ahmet Yılmaz');
  const [assessmentFilter, setAssessmentFilter] = useState('Güz Dönemi Deneme Serisi');

  // Görsel 4 ile Birebir Metrikler & Konu Dağılımı
  const overviewStats = {
    totalStudents: '4,620',
    totalStudentsDelta: '+2.1%',
    averageGrade: '7.5',
    averageGradeDelta: '+0.2',
    averageMarks: '81.6%',
    averageMarksDelta: '+1.8%',
    avgPointsOffNext: '9.1',
    avgPointsDelta: '-0.5',
    totalExams: '9,314',
    totalExamsDelta: '+5.2%',
  };

  const subjectPerformance = [
    { subject: 'Matematik (AYT & TYT)', average_score: '82.4%', level_4_plus: '70.4%', level_5_plus: '53.4%', students: 247 },
    { subject: 'Geometri', average_score: '76.9%', level_4_plus: '69.5%', level_5_plus: '53.9%', students: 243 },
    { subject: 'Fonksiyonlar & Polinomlar', average_score: '77.3%', level_4_plus: '77.5%', level_5_plus: '61.3%', students: 142 },
    { subject: 'Trigonometri & Analitik', average_score: '72.8%', level_4_plus: '75.6%', level_5_plus: '59.0%', students: 156 },
    { subject: 'Türev & İntegral', average_score: '74.1%', level_4_plus: '79.1%', level_5_plus: '62.8%', students: 148 },
    { subject: 'Temel Kavramlar & Sayılar', average_score: '88.7%', level_4_plus: '82.4%', level_5_plus: '63.7%', students: 234 },
  ];

  const keyStrengths = [
    { name: 'Temel Kavramlar & Sayılar', score: '88.7%' },
    { name: 'Matematik (Genel AYT)', score: '82.4%' },
    { name: 'Fonksiyonlar & Polinomlar', score: '77.3%' },
  ];

  const areasForImprovement = [
    { name: 'Trigonometri & Analitik', score: '72.8%' },
    { name: 'Türev & İntegral', score: '74.1%' },
    { name: 'Geometri (Katı Cisimler)', score: '76.9%' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      {/* Üst Bar: Filtreler (Görsel 4 Formatı) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            🎓
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Öğrenci Gelişimi & Performans Kontrol Paneli
            </h1>
            <p className="text-xs text-slate-500">
              2026 Akademik Takvim · Dönem Karşılaştırmalı Gelişim ve Net Artış Analitiği
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seri Filtresi */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Güz Dönemi Serisi</span>
          </div>

          {/* Sınıf Filtresi */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-xl text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Tüm Seviyeler (11 & 12)</span>
          </div>

          <Link
            href="/ogretmen/deneme-analizleri"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            ← Denemelere Dön
          </Link>
        </div>
      </div>

      {/* 5 ÜST METRİK KARTI (Görsel 4 ile Birebir Kartlar ve Delta Rozetleri) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Kart 1: Toplam Öğrenci */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Öğrenci Sayısı</span>
            <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
              ↗ {overviewStats.totalStudentsDelta}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {overviewStats.totalStudents}
          </div>
        </div>

        {/* Kart 2: Ortalama Derece */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Ortalama Not</span>
            <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
              ↗ {overviewStats.averageGradeDelta}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {overviewStats.averageGrade}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">YKS Skalası (1-10)</span>
        </div>

        {/* Kart 3: Ortalama Başarı */}
        <div className="bg-[#e6fffa] dark:bg-emerald-950/30 p-4 rounded-2xl border border-[#b2f5ea] dark:border-emerald-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#234e52] dark:text-emerald-300 font-bold">
            <span>Başarı Puanı</span>
            <span className="text-emerald-700 font-bold text-[11px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-xs">
              ↗ {overviewStats.averageMarksDelta}
            </span>
          </div>
          <div className="text-2xl font-black text-[#234e52] dark:text-emerald-200 mt-2">
            {overviewStats.averageMarks}
          </div>
        </div>

        {/* Kart 4: Hedefe Kalan Puan */}
        <div className="bg-[#fffaf0] dark:bg-amber-950/30 p-4 rounded-2xl border border-[#feebc8] dark:border-amber-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#744210] dark:text-amber-300 font-bold">
            <span>Hedefe Kalan Net</span>
            <span className="text-amber-700 font-bold text-[11px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-xs">
              ↘ {overviewStats.avgPointsDelta}
            </span>
          </div>
          <div className="text-2xl font-black text-[#744210] dark:text-amber-200 mt-2">
            {overviewStats.avgPointsOffNext}
          </div>
        </div>

        {/* Kart 5: Toplam Çözülen Sınav */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Toplam Deneme</span>
            <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
              ↗ {overviewStats.totalExamsDelta}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {overviewStats.totalExams}
          </div>
        </div>
      </div>

      {/* DERS / KONU BAZLI GENEL PERFORMANS TABLOSU (Görsel 4 Formatı) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Konu ve Alan Bazlı Performans Özeti (Subject Performance Overview)
          </h2>
          <span className="text-xs text-indigo-600 font-bold cursor-pointer hover:underline">
            Tümünü Gör →
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Ders / Konu Başlığı</th>
                <th className="py-3.5 px-5 text-center">Ortalama Başarı Skoru</th>
                <th className="py-3.5 px-5 text-center">Seviye 4+ Başarı</th>
                <th className="py-3.5 px-5 text-center">Seviye 5+ İleri Başarı</th>
                <th className="py-3.5 px-5 text-right">Öğrenci Sayısı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {subjectPerformance.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                    {row.subject}
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-emerald-600">
                    {row.average_score}
                  </td>
                  <td className="py-3.5 px-5 text-center text-slate-700 dark:text-slate-300">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                      {row.level_4_plus}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-center text-slate-700 dark:text-slate-300">
                    <span className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                      {row.level_5_plus}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-slate-500">
                    {row.students}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALT PANEL: GÜÇLÜ YÖNLER (YEŞİL) VE GELİŞTİRİLMESİ GEREKEN ALANLAR (KIRMIZI) (Görsel 4 Formatı) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sol: Güçlü Yönler (Key Strengths) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>En Güçlü Alanlar (Key Strengths)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold cursor-pointer hover:underline">
              Tümünü Gör →
            </span>
          </div>

          <div className="space-y-2">
            {keyStrengths.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-emerald-900 dark:text-emerald-200">{item.name}</span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 font-mono text-sm">
                  {item.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Geliştirilmesi Gereken Alanlar (Areas for Improvement) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>Geliştirilmesi Gereken Konular (Areas for Improvement)</span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold cursor-pointer hover:underline">
              Tümünü Gör →
            </span>
          </div>

          <div className="space-y-2">
            {areasForImprovement.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-rose-900 dark:text-rose-200">{item.name}</span>
                <span className="font-black text-rose-700 dark:text-rose-300 font-mono text-sm">
                  {item.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

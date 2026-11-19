'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, BarChart3, AlertCircle, ArrowRight, Download, Filter, HelpCircle } from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function EksiklikHaritasiPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Pedagogy Suite Tarzı Öğrenciler & Beceriler Matrisi
  const skills = [
    { id: 'number_sense', name: 'Sayı Duyusu', short: 'Sayılar' },
    { id: 'algebraic_thinking', name: 'Cebirsel Düşünme', short: 'Cebir' },
    { id: 'geometry', name: 'Geometri', short: 'Geometri' },
    { id: 'data_analysis', name: 'Veri Analizi', short: 'Veri & Olasılık' },
    { id: 'functions', name: 'Fonksiyonlar', short: 'Fonksiyon' },
    { id: 'problem_solving', name: 'Problem Çözme', short: 'Problemler' },
  ];

  // 1: Needs Support (mor/kırmızı/pembe), 2: Developing, 3: Proficient (mavi), 4: Advanced (camgöbeği/turkuaz)
  const students = [
    { name: 'Ahmet Yılmaz', class: '12-A', scores: [2, 4, 3, 2, 1, 2] },
    { name: 'Mehmet Demir', class: '12-A', scores: [3, 2, 4, 3, 2, 3] },
    { name: 'Ayşe Kaya', class: '12-A', scores: [4, 3, 4, 2, 4, 4] },
    { name: 'Zeynep Çelik', class: '12-B', scores: [2, 2, 3, 1, 3, 2] },
    { name: 'Can Baran', class: 'Mezun', scores: [3, 4, 2, 3, 2, 3] },
    { name: 'Elif Şahin', class: '12-B', scores: [2, 3, 3, 2, 4, 3] },
    { name: 'Burak Öztürk', class: '11-A', scores: [1, 2, 4, 3, 2, 2] },
    { name: 'Selin Doğan', class: '12-A', scores: [3, 2, 4, 3, 1, 4] },
  ];

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-purple-300 dark:bg-purple-900/60 text-purple-950 dark:text-purple-200'; // Needs Support
      case 2:
        return 'bg-blue-200 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200';
      case 3:
        return 'bg-blue-600 dark:bg-blue-600 text-white font-bold'; // Proficient
      case 4:
        return 'bg-teal-400 dark:bg-teal-500 text-teal-950 dark:text-slate-900 font-black'; // Advanced
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return 'Destek Gerekir (%25-45)';
      case 2: return 'Geliştirilmeli (%50-65)';
      case 3: return 'Yetkin / Başarılı (%70-85)';
      case 4: return 'İleri Seviye (%90-100)';
      default: return 'Veri Yok';
    }
  };

  const ANALYSIS_TABS = [
    { href: '/ogretmen/hazirbulunusluk', label: 'Hazırbulunuşluk & Seviye', icon: '🎯' },
    { href: '/ogretmen/yanlis-analizi', label: 'Akıllı Yanlış Analizi', icon: '🔍' },
    { href: '/ogretmen/unutma-riski', label: 'Aralıklı Tekrar & Risk', icon: '🔁' },
    { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
    { href: '/ogretmen/ogrenci-konu-analizleri', label: 'Öğrenci Konu Analizleri', icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Akıllı Analiz ve Öğrenci Gelişimi"
        description="Hazırbulunuşluk, kök neden analizi, aralıklı tekrar ve eksiklik haritaları"
        tabs={ANALYSIS_TABS}
      />

      {/* Üst Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Konu Bazlı Eksiklik & Yetkinlik Haritası
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencilerin konu ve beceri düzeyindeki güçlü ve zayıf taraflarını tek bakışta analiz edin (Pedagogy Suite Modeli).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
          >
            Eksiklere Göre Deneme Ata →
          </Link>
        </div>
      </div>

      {/* Orta Bölüm: Isı Haritası (Heat Map) & Sağda Sınıf Özeti + AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol 2 Kolon: Student Mastery Heat Map */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Öğrenci Yetkinlik Isı Haritası (Student Mastery Heat Map)
              </h2>
              <span className="text-[11px] text-slate-400">
                Beceriler ve Konular vs. Öğrenci Listesi
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">8 Öğrenci · 6 Alan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 text-left font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    Öğrenci
                  </th>
                  {skills.map((s) => (
                    <th
                      key={s.id}
                      className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800"
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {st.name}
                      <span className="ml-1.5 text-[10px] text-slate-400 font-normal">({st.class})</span>
                    </td>
                    {st.scores.map((score, sIdx) => (
                      <td key={sIdx} className="p-1 text-center">
                        <div
                          className={`w-full py-2 rounded-lg cursor-pointer transition-transform hover:scale-105 flex items-center justify-center text-[10px] ${getCellColor(
                            score
                          )}`}
                          title={`${st.name} - ${skills[sIdx].name}: ${getLevelLabel(score)}`}
                        >
                          {score === 1 && 'Destek'}
                          {score === 2 && 'Orta'}
                          {score === 3 && 'Yetkin'}
                          {score === 4 && 'İleri'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color Scale Legend */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Yetkinlik Skalası:</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300">
                <span className="w-3.5 h-3.5 rounded-sm bg-purple-300 dark:bg-purple-900/60 inline-block"></span>
                <span>Destek Gerekir (Needs Support)</span>
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 inline-block"></span>
                <span>Yetkin (Proficient)</span>
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300">
                <span className="w-3.5 h-3.5 rounded-sm bg-teal-400 inline-block"></span>
                <span>İleri Seviye (Advanced)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: AI Insight & Class Performance Overview */}
        <div className="space-y-6">
          {/* AI Insight Card */}
          <div className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Yapay Zekâ İçgörüsü (AI Insight)</span>
            </div>
            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              <strong>Cebirsel Düşünme</strong> ve <strong>Fonksiyonlar</strong> konularını pekiştiren öğrenciler, genel deneme netlerinde en yüksek gelişim trendini (<strong>%+34</strong>) sergilemektedir.
            </p>
            <div className="pt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
              Önerilen Telafi Föyünü İncele →
            </div>
          </div>

          {/* Class Performance Overview Bar Chart */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Sınıf Başarı Ortalaması (Class Overview)
              </h3>
              <span className="text-[10px] text-slate-400">Yetkinlik %</span>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Cebirsel Düşünme</span>
                  <span className="font-bold text-blue-600">%78</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Okuduğunu Anlama</span>
                  <span className="font-bold text-purple-600">%72</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Geometri</span>
                  <span className="font-bold text-sky-500">%50</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Problem Çözme</span>
                  <span className="font-bold text-teal-500">%58</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Sayı Duyusu</span>
                  <span className="font-bold text-indigo-500">%55</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: '55%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Bölüm: Öğrenci Gelişim Yörüngesi (Student Growth Trajectory) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Öğrenci Gelişim Yörüngesi (Student Growth Trajectory)
            </h3>
            <span className="text-[11px] text-slate-400">
              Soru Bankası & Aralıklı Tekrar Sistemi ile Tahmin Edilen YKS/LGS Puan Eğrisi
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Matematik Akademi ile (Predicted with PS)</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-600">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>Klasik Yöntem (Without System)</span>
            </span>
          </div>
        </div>

        {/* Line Chart Illustration */}
        <div className="relative h-56 w-full pt-4">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
            {/* Grid lines */}
            <line x1="50" y1="30" x2="780" y2="30" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800" />
            <line x1="50" y1="80" x2="780" y2="80" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800" />
            <line x1="50" y1="130" x2="780" y2="130" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800" />
            <line x1="50" y1="180" x2="780" y2="180" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800" />

            {/* Historical divider */}
            <line x1="380" y1="10" x2="380" y2="190" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.5" />
            <text x="320" y="200" fill="#94a3b8" fontSize="11" fontWeight="bold">Geçmiş Veri</text>
            <text x="395" y="200" fill="#94a3b8" fontSize="11" fontWeight="bold">Gelecek Tahmini →</text>

            {/* Historical Solid Line (Blue) */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              points="60,170 140,150 220,135 300,120 380,100"
            />
            {/* Dots on historical */}
            <circle cx="60" cy="170" r="4" fill="#3b82f6" />
            <circle cx="140" cy="150" r="4" fill="#3b82f6" />
            <circle cx="220" cy="135" r="4" fill="#3b82f6" />
            <circle cx="300" cy="120" r="4" fill="#3b82f6" />
            <circle cx="380" cy="100" r="5" fill="#2563eb" />

            {/* Forecast With System (Green, Ascending steeply) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="5 5"
              points="380,100 460,78 540,60 620,44 700,32"
            />
            <circle cx="460" cy="78" r="4" fill="#10b981" />
            <circle cx="540" cy="60" r="4" fill="#10b981" />
            <circle cx="620" cy="44" r="4" fill="#10b981" />
            <circle cx="700" cy="32" r="5" fill="#059669" />

            {/* Forecast Without System (Purple, Plateauing) */}
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              points="380,100 460,108 540,114 620,118 700,122"
            />
            <circle cx="460" cy="108" r="3.5" fill="#a855f7" />
            <circle cx="540" cy="114" r="3.5" fill="#a855f7" />
            <circle cx="620" cy="118" r="3.5" fill="#a855f7" />
            <circle cx="700" cy="122" r="4" fill="#9333ea" />
          </svg>
        </div>
      </div>
    </div>
  );
}

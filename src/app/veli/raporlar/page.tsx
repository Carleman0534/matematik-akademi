'use client';

import React, { useState, useEffect } from 'react';
import {
  FileBarChart, CheckCircle2, TrendingUp, Calendar, BookOpen,
  Printer, Award, Heart, Sparkles, MessageCircle, ArrowUpRight
} from 'lucide-react';

interface ParentReport {
  id: string;
  student_id: string;
  student_name: string;
  grade_level: number;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  empty_count: number;
  completed_homeworks: number;
  total_homeworks: number;
  attended_exams: number;
  net_change: number;
  topics_summary: { topic: string; solved: number; accuracy: number }[];
  next_week_goals: string;
  teacher_message: string;
  is_approved_by_teacher: boolean;
  status: string;
  created_at: string;
}

export default function VeliRaporlarPage() {
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedReport, setSelectedReport] = useState<ParentReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/parent-weekly?periodType=${selectedPeriod}`);
        const json = await res.json();
        if (json.reports) {
          setReports(json.reports);
          if (json.reports.length > 0) {
            setSelectedReport(json.reports[0]);
          } else {
            setSelectedReport(null);
          }
        }
      } catch (err) {
        console.error('Veli raporları yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [selectedPeriod]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Gelişim ve Başarı Raporları
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencimizin haftalık ve aylık matematik çalışma temposunu, tamamlanan ödevlerini, deneme net artışını ve öğretmen değerlendirmesini inceleyin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setSelectedPeriod('weekly')}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedPeriod === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Haftalık Raporlar
            </button>
            <button
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedPeriod === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Aylık Raporlar
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>PDF İndir / Yazdır</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Report History List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Dönem Raporları
          </h2>

          <div className="space-y-2">
            {reports.length > 0 ? (
              reports.map(rep => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span>{rep.start_date} – {rep.end_date}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {rep.period_type === 'weekly' ? 'Haftalık' : 'Aylık'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {rep.student_name} • {rep.total_questions} Soru Çözüldü
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                      <span>Net Gelişimi: +{rep.net_change?.toFixed(2)}</span>
                      <span className="text-slate-400 font-normal">
                        Ödev: {rep.completed_homeworks}/{rep.total_homeworks}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                Henüz yayınlanmış gelişim raporu bulunmuyor.
              </div>
            )}
          </div>
        </div>

        {/* Right: Full Printable Progress Card (8 cols) */}
        <div className="lg:col-span-8">
          {selectedReport ? (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Report Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedReport.period_type === 'weekly' ? 'Haftalık Gelişim Değerlendirmesi' : 'Aylık Başarı Raporu'}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {selectedReport.student_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rapor Tarih Aralığı: {selectedReport.start_date} – {selectedReport.end_date}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Net Gelişimi
                    </div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                      +{selectedReport.net_change?.toFixed(2)} Net Artış
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400">Çözülen Soru</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedReport.total_questions}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">
                    %{Math.round((selectedReport.correct_count / (selectedReport.total_questions || 1)) * 100)} Doğruluk
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400">Ödev Başarısı</div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {selectedReport.completed_homeworks} / {selectedReport.total_homeworks}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Görev tamamlandı
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400">Deneme Katılımı</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedReport.attended_exams} Sınav
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    LGS Denemesi
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400">Çalışma Disiplini</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    %95
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1">
                    İstikrarlı Katılım
                  </div>
                </div>
              </div>

              {/* Topics Studied & Success Rate */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Bu Dönemde Çalışılan Konular ve Başarı Oranları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(selectedReport.topics_summary || []).map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {t.topic}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">{t.solved} Soru</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">%{t.accuracy} Doğruluk</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${t.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher's Constructive & Encouraging Message (Section 15 requirement) */}
              <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Öğretmenimizin Veliye Özel Değerlendirme Notu</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed italic">
                  "{selectedReport.teacher_message}"
                </p>
              </div>

              {/* Next Period Goals */}
              <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Önümüzdeki Dönem Hedefleri</span>
                </div>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  {selectedReport.next_week_goals}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Görüntülemek istediğiniz raporu seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

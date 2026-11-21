'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Clock,
  Play,
  Award
} from 'lucide-react';

interface StudentExamDisplay {
  id: string;
  title: string;
  question_count: number;
  duration_min: number;
  starts_at?: string | null;
  due_at?: string | null;
  status: string;
  pdf_url?: string;
  correct_count?: number;
  wrong_count?: number;
  blank_count?: number;
  net_score?: number;
  submitted_at?: string | null;
}

export default function OgrenciDenemelerPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs = ['active', 'upcoming', 'completed', 'expired'] as const;
  const initialTab = validTabs.includes(tabParam as any) ? (tabParam as typeof validTabs[number]) : 'active';

  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'expired'>(initialTab);
  const [examData, setExamData] = useState<{
    active: StudentExamDisplay[];
    upcoming: StudentExamDisplay[];
    completed: StudentExamDisplay[];
    expired: StudentExamDisplay[];
  }>({
    active: [],
    upcoming: [],
    completed: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    async function loadStudentExams() {
      try {
        setLoading(true);
        // Önce gerçek atamaları dene
        const assignRes = await fetch('/api/exam-assignments').catch(() => null);
        if (assignRes && assignRes.ok) {
          const assignData = await assignRes.json();
          if (assignData.active || assignData.upcoming || assignData.completed || assignData.expired) {
            const mapItem = (item: any): StudentExamDisplay => ({
              id: item.exam_id || item.id,
              title: item.exam_title || item.title || 'Matematik Denemesi',
              question_count: item.question_count || 40,
              duration_min: item.duration_min || item.default_duration || 60,
              starts_at: item.starts_at,
              due_at: item.due_at || item.deadline,
              status: item.assignment_status || item.status || 'in_progress',
              pdf_url: item.pdf_url || '/uploads/sample-exam.pdf',
              correct_count: item.correct_count,
              wrong_count: item.wrong_count,
              blank_count: item.blank_count,
              net_score: item.net_score,
              submitted_at: item.submitted_at,
            });

            const activeList = (assignData.active || []).map(mapItem);
            const upcomingList = (assignData.upcoming || []).map(mapItem);
            const completedList = (assignData.completed || []).map(mapItem);
            const expiredList = (assignData.expired || []).map(mapItem);

            // Yalnızca öğretmenin gerçekten atadığı denemeler gösterilir (örnek/uydurma deneme yok)
            setExamData({
              active: activeList,
              upcoming: upcomingList,
              completed: completedList,
              expired: expiredList,
            });
            return;
          }
        }

        // Atamalar okunamadıysa boş liste (örnek deneme gösterilmez)
        setExamData({ active: [], upcoming: [], completed: [], expired: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentExams();
  }, []);

  const currentList = examData[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Denemelerim</h1>
          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
            Sınav Merkezi
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Öğretmeninizin size atadığı deneme sınavlarını çözün, sürenizi takip edin ve sonuçlarınızı inceleyin.
        </p>
      </div>

      {/* Kategori Sekmeleri */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'active', label: 'Devam Eden & Hazır Denemeler', count: examData.active.length, icon: '✍️' },
          { id: 'upcoming', label: 'Yaklaşan Denemeler', count: examData.upcoming.length, icon: '🕒' },
          { id: 'completed', label: 'Tamamlananlar', count: examData.completed.length, icon: '✅' },
          { id: 'expired', label: 'Süresi Dolanlar', count: examData.expired.length, icon: '⏳' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Sınav Kartları Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : currentList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {currentList.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {exam.question_count} Soru · {exam.duration_min} Dakika
                  </span>
                  {exam.due_at && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Son: {new Date(exam.due_at).toLocaleDateString('tr-TR')}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {exam.title}
                </h3>

                {activeTab === 'completed' && exam.net_score !== undefined && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        {exam.correct_count} Doğru · {exam.wrong_count} Yanlış · {exam.blank_count} Boş
                      </span>
                    </div>
                    <div className="font-black text-emerald-800 dark:text-emerald-200 text-sm">
                      {exam.net_score} Net
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {activeTab === 'active' && (
                  <Link
                    href={`/ogrenci/denemeler/${exam.id}/coz`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold text-xs transition shadow-md shadow-indigo-500/20"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Sınava Başla / Çöz</span>
                  </Link>
                )}

                {activeTab === 'upcoming' && (
                  <div className="w-full text-center py-2 text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    Sınav başlangıç saati bekleniyor
                  </div>
                )}

                {activeTab === 'completed' && (
                  <Link
                    href={`/ogrenci/denemeler/${exam.id}/coz?viewOnly=true`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-bold text-xs transition"
                  >
                    <Award className="w-4 h-4" />
                    <span>Cevaplarını & Sonuçlarını İncele</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Bu Kategoride Deneme Yok</h3>
          <p className="text-xs text-slate-400 mt-1">Öğretmeniniz yeni sınav atadığında burada listelenecektir.</p>
        </div>
      )}
    </div>
  );
}

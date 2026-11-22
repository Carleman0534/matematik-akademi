'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, XCircle, Clock, Award, 
  ArrowRight, FileText, ChevronRight, User, Sparkles
} from 'lucide-react';

export interface ExamFeedItem {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  netScore: number;
  totalDurationSeconds?: number;
  completedAt: string;
}

interface Props {
  initialExams: ExamFeedItem[];
}

export function RecentExamsFeed({ initialExams }: Props) {
  const [exams, setExams] = useState<ExamFeedItem[]>(initialExams);
  const [filterStudent, setFilterStudent] = useState<string>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Tarayıcı hafızasındaki (localStorage) en son çözülen denemeleri de birleştir
    try {
      const raw = localStorage.getItem('student_completed_exams');
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList) && localList.length > 0) {
          const mappedLocal: ExamFeedItem[] = localList.map((l: any, idx: number) => ({
            id: l.id || `local_${l.examId}_${idx}`,
            examId: l.examId,
            examTitle: l.title || 'LGS Matematik Denemesi',
            studentId: l.studentId || 'student_muhammed_talha',
            studentName: l.studentName || (l.studentId?.includes('talha') ? 'Muhammed Talha' : 'Öğrenci'),
            correctCount: Number(l.correctCount) || 0,
            wrongCount: Number(l.wrongCount) || 0,
            blankCount: Number(l.blankCount) || 0,
            netScore: Number(l.netScore) || 0,
            totalDurationSeconds: l.durationSeconds || 1200,
            completedAt: l.completedAt || new Date().toISOString()
          }));

          setExams(prev => {
            const map = new Map<string, ExamFeedItem>();
            // Önce yerel hafızadakileri ekle
            mappedLocal.forEach(item => map.set(`${item.examId}_${item.studentId}`, item));
            // Sonra sunucudan gelenleri ekle
            prev.forEach(item => {
              const k = `${item.examId}_${item.studentId}`;
              if (!map.has(k)) map.set(k, item);
            });
            return Array.from(map.values()).sort((a, b) => 
              new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );
          });
        }
      }
    } catch (e) {
      console.warn('RecentExamsFeed local sync error:', e);
    }
  }, []);

  const filtered = exams.filter(e => {
    if (filterStudent === 'all') return true;
    return e.studentId.toLowerCase().includes(filterStudent.toLowerCase()) || 
           e.studentName.toLowerCase().includes(filterStudent.toLowerCase());
  });

  const formatDuration = (secs?: number) => {
    if (!secs) return '20 dk';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} dk ${s > 0 ? `${s} sn` : ''}`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <section className="card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Son Çözülen Denemeler & Öğrenci Sınav Sonuçları</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                Canlı Akış
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Öğrencilerinizin kendi profillerinden çözdüğü deneme sınavları, netleri ve ayrıntılı başarı analizleri.
            </p>
          </div>
        </div>

        {/* Öğrenci Filtre Hapları */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterStudent('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterStudent === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tüm Öğrenciler ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStudent('talha')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
              filterStudent === 'talha'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>⭐ Muhammed Talha</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {filterStudent === 'talha' ? 'Muhammed Talha için henüz çözülmüş deneme bulunmuyor.' : 'Henüz tamamlanan bir deneme sınavı bulunmuyor.'}
          </p>
          <p className="text-xs text-slate-500">
            Öğrenci kendi profilinden bir deneme veya çalışma çözdüğünde burada net puanı ve yanlışlarıyla birlikte otomatik olarak listelenir.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2.5 font-bold">Öğrenci</th>
                <th className="py-2.5 font-bold">Deneme / Çalışma Başlığı</th>
                <th className="py-2.5 font-bold">Doğru / Yanlış / Boş</th>
                <th className="py-2.5 font-bold">Net Puanı</th>
                <th className="py-2.5 font-bold">Süre</th>
                <th className="py-2.5 font-bold">Çözülme Tarihi</th>
                <th className="py-2.5 font-bold text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item, idx) => {
                const totalQ = item.correctCount + item.wrongCount + item.blankCount || 20;
                const accuracy = totalQ > 0 ? Math.round((item.correctCount / totalQ) * 100) : 0;
                const isTalha = item.studentId.includes('talha') || item.studentName.toLowerCase().includes('talha');

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                    <td className="py-3">
                      <Link 
                        href={`/ogretmen/ogrenciler/${item.studentId}?tab=exams`}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 flex items-center gap-1.5"
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          isTalha 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {item.studentName.charAt(0)}
                        </span>
                        <span>{item.studentName}</span>
                      </Link>
                    </td>

                    <td className="py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.examTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>LGS Formatı</span>
                        <span>·</span>
                        <span className={accuracy >= 70 ? 'text-emerald-600 font-bold' : accuracy >= 50 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold'}>
                          %{accuracy} Başarı
                        </span>
                      </div>
                    </td>

                    <td className="py-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {item.correctCount} D
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          {item.wrongCount} Y
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {item.blankCount} B
                        </span>
                      </div>
                    </td>

                    <td className="py-3">
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {item.netScore.toFixed(2)} Net
                      </span>
                    </td>

                    <td className="py-3 text-slate-500 text-xs">
                      {formatDuration(item.totalDurationSeconds)}
                    </td>

                    <td className="py-3 text-slate-500 text-xs">
                      {formatDate(item.completedAt)}
                    </td>

                    <td className="py-3 text-right">
                      <Link
                        href={`/ogretmen/ogrenciler/${item.studentId}?tab=exams`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
                      >
                        <span>İncele</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

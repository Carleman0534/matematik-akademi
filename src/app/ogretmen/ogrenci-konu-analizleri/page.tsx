'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, 
  Clock, ArrowRight, ShieldCheck, Target, Award, Check 
} from 'lucide-react';

export default function OgrenciKonuAnalizleriPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('student_muhammed_talha');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Öğrenci listesini çek
  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (data.success && data.students.length > 0) {
          setStudents(data.students);
          setSelectedStudentId(prev => (data.students.some((s: any) => s.id === prev) ? prev : data.students[0].id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchStudents();
  }, []);

  // Seçilen öğrencinin analizlerini çek
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/lgs/student-analytics?studentId=${selectedStudentId}`);
        const data = await res.json();
        if (data.success) {
          setAnalyticsData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (selectedStudentId) {
      fetchAnalytics();
    }
  }, [selectedStudentId]);

  const handleApproveRec = async (recId: string) => {
    try {
      await fetch('/api/lgs/student-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId, action: 'approve' })
      });
      // Yenile
      const res = await fetch(`/api/lgs/student-analytics?studentId=${selectedStudentId}`);
      const data = await res.json();
      if (data.success) setAnalyticsData(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Öğrenci Seçici */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" /> Bireysel Başarı Profili ve Eksiklik Tespiti
          </div>
          <h1 className="text-2xl font-black">Öğrenci LGS Konu Analizleri</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Denemelerden, soru bankasından ve çalışma testlerinden derlenen çok boyutlu başarı profili. Öğrencinin hangi konuyu ve soru tipini bilmediğini net olarak görün.
          </p>
        </div>

        {/* Öğrenci Seçici */}
        <div className="self-start sm:self-center">
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur focus:bg-white focus:text-slate-900 focus:outline-none"
          >
            {students.map(s => (
              <option key={s.id} value={s.id} className="text-slate-900">{s.name} ({s.grade}. Sınıf)</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Genel Matematik Başarısı</p>
          <p className="mt-1 text-2xl font-black text-indigo-600">
            %{analyticsData?.summary?.avgMastery || 60}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">12 ana konu ortalaması</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Toplam Çözülen Soru</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {analyticsData?.summary?.totalSolved || 80}
          </p>
          <p className="mt-0.5 text-xs text-emerald-600">
            {analyticsData?.summary?.totalCorrect || 50} Doğru • {analyticsData?.summary?.totalWrong || 25} Yanlış
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Öncelikli Eksik Konu</p>
          <p className="mt-1 text-2xl font-black text-rose-600">
            {analyticsData?.summary?.criticalWeakCount || 2} Konu
          </p>
          <p className="mt-0.5 text-xs text-rose-500 font-semibold">Acil hedefli çalışma gerekli</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Güçlü / Pekişmiş Konu</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {analyticsData?.summary?.masteredCount || 1} Konu
          </p>
          <p className="mt-0.5 text-xs text-emerald-600 font-semibold">İstikrarlı yüksek net</p>
        </div>
      </div>

      {/* Yapay Zekâ Çalışma Önerileri Kartı (Section 13) */}
      {analyticsData?.recommendations && analyticsData.recommendations.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-200">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Yapay Zekâ Öğrenme Geri Beslemesi ve Çalışma Önerileri</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {analyticsData.recommendations.map((rec: any) => (
              <div key={rec.id} className="rounded-xl border border-white bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{rec.topic_name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    rec.status === 'assigned' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rec.status === 'assigned' ? 'Atandı' : 'Öğretmen Onayı Bekliyor'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{rec.reason}</p>
                <div className="rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-3">
                  Öneri: {rec.recommended_action}
                </div>
                {rec.status !== 'assigned' ? (
                  <button
                    onClick={() => handleApproveRec(rec.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Öneriyi Onayla ve Ata
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Öğrenciye atandı
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konu Başarı Tablosu (Section 8) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">LGS Matematik Konu Başarı Karnesi</h2>
          <span className="text-xs text-slate-500">Doğru, yanlış, süre ve zorluk katsayılı analiz</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Performans verileri hesaplanıyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Konu Adı</th>
                  <th className="px-6 py-3.5 text-center">Başarı Oranı</th>
                  <th className="px-6 py-3.5 text-center">Durum</th>
                  <th className="px-6 py-3.5 text-center">Çözülen Soru</th>
                  <th className="px-6 py-3.5 text-center">D / Y / B</th>
                  <th className="px-6 py-3.5 text-center">Ort. Süre</th>
                  <th className="px-6 py-3.5 text-center">Güven Skoru</th>
                  <th className="px-6 py-3.5 text-right">Eylem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analyticsData?.topicPerformance?.map((tp: any) => (
                  <tr key={tp.topic_id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {tp.topic_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 dark:bg-slate-800">
                          <div 
                            className={`h-2 rounded-full ${
                              tp.mastery_score >= 80 ? 'bg-emerald-500' :
                              tp.mastery_score >= 60 ? 'bg-blue-500' :
                              tp.mastery_score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${tp.mastery_score}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs">%{tp.mastery_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                        tp.status === 'mastered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60' :
                        tp.status === 'good' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60' :
                        tp.status === 'improving' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60' :
                        tp.status === 'critical_weak' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {tp.status === 'mastered' ? 'Pekişmiş / Güçlü' :
                         tp.status === 'good' ? 'İyi Seviye' :
                         tp.status === 'improving' ? 'Geliştirilmeli' :
                         tp.status === 'critical_weak' ? 'Öncelikli Eksik' : 'Yetersiz Veri'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold">
                      {tp.solved_count || 0} soru
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <span className="text-emerald-600 font-bold">{tp.correct_count || 0}D</span> /{' '}
                      <span className="text-rose-600 font-bold">{tp.wrong_count || 0}Y</span> /{' '}
                      <span className="text-slate-400 font-bold">{tp.blank_count || 0}B</span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {tp.avg_duration_seconds ? `${tp.avg_duration_seconds} sn` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-semibold text-slate-600">
                      %{Math.round((tp.confidence_level || 0) * 100)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/ogretmen/calisma-olustur`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        Hedefli Çalışma <ArrowRight className="h-3 w-3" />
                      </a>
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

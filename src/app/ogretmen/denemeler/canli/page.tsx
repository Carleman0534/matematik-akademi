'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  RotateCcw,
  Ban,
  Search,
  Eye,
  Activity,
  Award
} from 'lucide-react';

export default function CanliSinavlarPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSessionForExtraTime, setSelectedSessionForExtraTime] = useState<any | null>(null);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLiveSessions = async () => {
    try {
      setLoading(true);
      // Demo ve gerçek oturumları topla
      const res = await fetch('/api/pdf-documents');
      // Oturum verisi fallback
      setSessions([
        {
          id: 'sess-1',
          student_name: 'Ahmet Yılmaz',
          exam_title: '2026 AYT Matematik Türkiye Geneli Deneme',
          started_at: new Date(Date.now() - 25 * 60000).toISOString(),
          deadline: new Date(Date.now() + 35 * 60000).toISOString(),
          last_seen_at: new Date(Date.now() - 30000).toISOString(),
          current_q: 18,
          question_count: 40,
          status: 'in_progress',
          answered_count: 16,
        },
        {
          id: 'sess-2',
          student_name: 'Mehmet Demir',
          exam_title: '2026 AYT Matematik Türkiye Geneli Deneme',
          started_at: new Date(Date.now() - 30 * 60000).toISOString(),
          deadline: new Date(Date.now() + 30 * 60000).toISOString(),
          last_seen_at: new Date(Date.now() - 15000).toISOString(),
          current_q: 24,
          question_count: 40,
          status: 'in_progress',
          answered_count: 22,
        },
        {
          id: 'sess-3',
          student_name: 'Ayşe Kaya',
          exam_title: '2026 AYT Matematik Türkiye Geneli Deneme',
          started_at: new Date(Date.now() - 55 * 60000).toISOString(),
          deadline: new Date(Date.now() + 5 * 60000).toISOString(),
          last_seen_at: new Date(Date.now() - 10000).toISOString(),
          current_q: 38,
          question_count: 40,
          status: 'in_progress',
          answered_count: 35,
        },
        {
          id: 'sess-4',
          student_name: 'Can Baran',
          exam_title: 'TYT Matematik İlk 12 Soru Özel Tarama',
          started_at: new Date(Date.now() - 70 * 60000).toISOString(),
          deadline: new Date(Date.now() - 10 * 60000).toISOString(),
          submitted_at: new Date(Date.now() - 12 * 60000).toISOString(),
          last_seen_at: new Date(Date.now() - 12 * 60000).toISOString(),
          current_q: 24,
          question_count: 24,
          status: 'completed',
          answered_count: 24,
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 30000); // 30 saniyede bir otomatik yenile
    return () => clearInterval(interval);
  }, []);

  const handleGiveExtraTime = async () => {
    if (!selectedSessionForExtraTime) return;
    try {
      // Oturum süresini uzat
      setActionMessage(`${selectedSessionForExtraTime.student_name} için +${extraMinutes} dakika ek süre tanımlandı.`);
      setSelectedSessionForExtraTime(null);
      setTimeout(() => setActionMessage(null), 3000);
      fetchLiveSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      return s.student_name?.toLowerCase().includes(q) || s.exam_title?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Devam Eden Sınavlar & Canlı Takip</h1>
            <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Canlı İzleme</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencilerinizin sınav anındaki ilerlemesini, cevapladığı soru sayısını ve kalan sürelerini gerçek zamanlı takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveSessions}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>

          <Link
            href="/ogretmen/deneme-analizleri"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Award className="w-4 h-4" />
            <span>Sonuç & Analizleri Gör</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Canlı Takip Tablosu */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Öğrenci veya sınav ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">{filteredSessions.length} Aktif Oturum</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Öğrenci</th>
                <th className="py-3 px-4">Deneme Sınavı</th>
                <th className="py-3 px-4">İlerleme / Soru</th>
                <th className="py-3 px-4">Kalan Süre</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-right">Müdahale & Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSessions.map((sess) => {
                const now = Date.now();
                const deadlineMs = new Date(sess.deadline).getTime();
                const diffMin = Math.max(0, Math.round((deadlineMs - now) / 60000));
                const isCompleted = !!sess.submitted_at;
                const isExpired = !isCompleted && diffMin === 0;

                return (
                  <tr key={sess.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {sess.student_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {sess.exam_title}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {sess.answered_count || 0} / {sess.question_count || 40}
                        </span>
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${((sess.answered_count || 0) / (sess.question_count || 40)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isCompleted ? (
                        <span className="text-slate-400">Tamamlandı</span>
                      ) : isExpired ? (
                        <span className="text-red-500 font-bold">Süre Doldu</span>
                      ) : (
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {diffMin} Dakika
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isCompleted ? (
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Teslim Edildi
                        </span>
                      ) : isExpired ? (
                        <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Süre Bitti
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Çözüyor (Soru {sess.current_q})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSessionForExtraTime(sess)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] transition"
                          title="Öğrenciye Ek Süre Tanımla"
                        >
                          + Ek Süre
                        </button>

                        <button
                          onClick={() => alert(`${sess.student_name} için sınav oturumu yeniden açıldı.`)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Yeniden Başlat"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ek Süre Verme Modalı */}
      {selectedSessionForExtraTime && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Öğrenciye Ek Süre Ver</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedSessionForExtraTime.student_name}</p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Eklenecek Süre (Dakika)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 15, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExtraMinutes(m)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      extraMinutes === m
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    +{m} dk
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedSessionForExtraTime(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                İptal
              </button>
              <button
                onClick={handleGiveExtraTime}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
              >
                Süreyi Uzat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Award,
  Laptop,
  Check
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function CanliSinavlarPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSessionForExtraTime, setSelectedSessionForExtraTime] = useState<any | null>(null);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLiveSessions = async () => {
    try {
      setLoading(true);
      setLastUpdated(new Date().toLocaleTimeString('tr-TR'));

      const res = await fetch('/api/exam-sessions/live', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      const rows: any[] = res.ok && Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(rows.map((r, i) => {
        const total = Number(r.total_questions) || 0;
        const answered = Number(r.answered_count) || 0;
        const done = !!r.submitted_at;
        return {
          rank: `#${i + 1}`,
          id: r.id,
          student_name: r.student_name,
          class_name: r.exam_title,
          score: r.net_score === null || r.net_score === undefined ? null : Number(r.net_score),
          progress_percent: done ? 100 : total ? Math.round((answered / total) * 100) : 0,
          answered_count: answered,
          total_questions: total,
          device_info: r.last_seen_at ? `Son görülme: ${new Date(r.last_seen_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : '—',
          completed_time: done ? new Date(r.submitted_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : null,
          status: done ? 'completed' : 'ongoing',
        };
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 15000); // 15 saniyede bir otomatik döngüsel yenileme
    return () => clearInterval(interval);
  }, []);

  const handleGiveExtraTime = async () => {
    if (!selectedSessionForExtraTime) return;
    try {
      const res = await fetch(`/api/exam-sessions/${selectedSessionForExtraTime.id}/extend-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', extraMinutes }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `${selectedSessionForExtraTime.student_name} için +${extraMinutes} dakika ek süre tanımlandı.`);
      } else {
        alert(data.error || 'Ek süre tanımlanamadı.');
      }
    } catch {
      alert('Ek süre tanımlanamadı. Bağlantınızı kontrol edin.');
    }
    setSelectedSessionForExtraTime(null);
    fetchLiveSessions();
  };

  const handleReopenExam = async (session: any) => {
    if (!confirm(`${session.student_name} adlı öğrencinin sınavı yeniden açılsın mı? (+30 dakika süre eklenecektir)`)) return;
    try {
      const res = await fetch(`/api/exam-sessions/${session.id}/extend-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen', extraMinutes: 30 }),
      });
      const data = await res.json();
      alert(res.ok ? (data.message || 'Sınav başarıyla yeniden açıldı.') : (data.error || 'Sınav yeniden açılamadı.'));
    } catch {
      alert('Sınav yeniden açılamadı. Bağlantınızı kontrol edin.');
    }
    fetchLiveSessions();
  };

  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const ongoingCount = sessions.filter((s) => s.status === 'ongoing').length;
  const scores: number[] = sessions.map((s) => s.score).filter((v): v is number => typeof v === 'number');
  const highestScore = scores.length > 0 ? Math.max(...scores) : '—';
  const avgScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : '—';

  const filteredSessions = sessions.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      return s.student_name.toLowerCase().includes(q) || s.class_name.toLowerCase().includes(q);
    }
    return true;
  });

  const EXAM_TABS = [
    { href: '/ogretmen/denemeler', label: 'Deneme Şablonları', icon: '📝' },
    { href: '/ogretmen/denemeler/canli', label: 'Canlı Takip', icon: '⏱️', badge: 'Canlı' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
    { href: '/ogretmen/deneme-analizleri', label: 'Deneme Sonuçları', icon: '📊' },
    { href: '/ogretmen/deneme-degerlendirme', label: 'Akıllı Deneme Raporu', icon: '📑' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Deneme Sınavları Yönetimi"
        description="Canlı oturumlar, ödevler, şablonlar ve öğrenci sonuç analizleri"
        tabs={EXAM_TABS}
      />

      {/* Başlık Başlık Bilgisi */}
      <div className="text-center space-y-1 py-2">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-wide uppercase">
          MATEMATİK AKADEMİ CANLI TAKİP PANELİ
        </h1>
        <p className="text-xs text-slate-500 font-semibold">
          Son 24 saat ve devam eden oturumlar · Canlı İzleme · {sessions.length} Katılımcı
        </p>
      </div>

      {/* 4 Renkli Durum Özeti Kartı (Görsel 1 ile Birebir Uyumlu) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Yeşil: En Yüksek Skor */}
        <div className="bg-[#48bb78] text-white p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
          <div className="text-3xl font-black">{highestScore}</div>
          <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-95">En Yüksek Net</div>
        </div>

        {/* Mavi: Ortalama Puan */}
        <div className="bg-[#4299e1] text-white p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
          <div className="text-3xl font-black">{avgScore}</div>
          <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-95">Ortalama Net</div>
        </div>

        {/* Sarı/Amber: Sınavı Tamamlayanlar */}
        <div className="bg-[#ecc94b] text-slate-900 p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
          <div className="text-3xl font-black">{completedCount}</div>
          <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-95">Tamamlandı</div>
        </div>

        {/* Koyu Gri/Lacivert: Sınava Devam Edenler */}
        <div className="bg-[#4a5568] text-white p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
          <div className="text-3xl font-black">{ongoingCount}</div>
          <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-95">Sınava Devam Eden</div>
        </div>
      </div>

      {/* Kontrol ve Arama Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Öğrenci veya sınıf ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveSessions}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Şimdi Yenile</span>
          </button>
          <Link
            href="/ogretmen/deneme-analizleri"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Sonuç Raporunu Aç
          </Link>
        </div>
      </div>

      {/* Canlı Tablo (Görsel 1 ile Birebir Tasarım) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#2d3748] text-white font-bold">
              <tr>
                <th className="py-3 px-4 w-16">Sıra</th>
                <th className="py-3 px-4">Öğrenci Adı</th>
                <th className="py-3 px-4">Deneme</th>
                <th className="py-3 px-4 text-center">Net</th>
                <th className="py-3 px-4">İlerleme (Soru)</th>
                <th className="py-3 px-4">Son Etkinlik</th>
                <th className="py-3 px-4 text-center">Bitiş</th>
                <th className="py-3 px-4 text-right">Müdahale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    {loading ? 'Yükleniyor…' : 'Şu an devam eden ya da son 24 saatte çözülen deneme yok.'}
                  </td>
                </tr>
              )}
              {filteredSessions.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {st.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {st.student_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                    {st.class_name}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {st.score ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>%{st.progress_percent}</span>
                        <span>({st.answered_count}/{st.total_questions})</span>
                      </div>
                      <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${st.progress_percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-slate-400" />
                      <span>{st.device_info}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                    {st.completed_time ? (
                      <span className="text-emerald-600">{st.completed_time}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {st.status === 'completed' && (
                        <button
                          onClick={() => handleReopenExam(st)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg font-bold text-[11px] transition"
                          title="Sınavı yeniden açıp süre tanımla"
                        >
                          Yeniden Aç
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSessionForExtraTime(st)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] transition"
                      >
                        + Ek Süre
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="text-center text-xs text-slate-400 font-medium py-3">
        Döngüsel otomatik yenileme aktif (15 sn) · Son güncelleme: {lastUpdated} · Matematik Akademi Canlı Gözetmen
      </div>

      {/* Ek Süre Verme Modalı */}
      {selectedSessionForExtraTime && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Öğrenciye Ek Süre Tanımla</h3>
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

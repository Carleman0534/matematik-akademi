'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Award,
  Download,
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  BookOpen,
  Printer,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function DenemeAnalizleriPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'questions' ? 'questions' : 'ranking';

  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ranking' | 'questions' | 'common_errors' | 'mastery'>(initialTab);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [penaltyDivisor, setPenaltyDivisor] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAnalytics = async (examId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${examId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        // Analiz alınamadıysa uydurma veri gösterme
        setAnalytics(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadExams() {
      try {
        setLoading(true);
        const res = await fetch('/api/pdf-documents');
        const data = await res.json();
        const list = data.docs || [];
        setExams(list);
        if (list.length > 0) {
          setSelectedExamId(list[0].id);
          loadAnalytics(list[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  const handleExportCsv = () => {
    if (!analytics || !analytics.studentResults) return;
    const rows = [
      ['Sira', 'Ogrenci', 'Dogru', 'Yanlis', 'Bos', 'Net Puan'],
      ...analytics.studentResults.map((s: any, idx: number) => [
        idx + 1,
        s.student_name,
        s.correct_count,
        s.wrong_count,
        s.blank_count,
        s.net_score,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'deneme_sonuclari.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTransferToQuestionBank = async () => {
    if (!selectedExamId) return;
    setIsProcessing(true);
    try {
      setTransferMessage('⏳ Yanlış ve boş sorular taranıyor ve öğrenci soru bankalarına aktarılıyor...');
      const res = await fetch(`/api/exams/${selectedExamId}/transfer-wrong-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setTransferMessage('✅ ' + (data.message || 'Yanlış ve boş sorular başarıyla soru bankasına aktarıldı!'));
      } else {
        setTransferMessage('❌ ' + (data.error || 'Aktarma sırasında bir hata oluştu.'));
      }
      setTimeout(() => setTransferMessage(null), 6000);
    } catch {
      setTransferMessage('❌ Ağ hatası oluştu.');
      setTimeout(() => setTransferMessage(null), 6000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedExamId) return;
    setIsProcessing(true);
    try {
      setTransferMessage('⏳ Cevap anahtarına göre öğrenci oturumları yeniden değerlendiriliyor...');
      const res = await fetch(`/api/exams/${selectedExamId}/recalculate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setTransferMessage('✅ ' + (data.message || 'Sınav sonuçları güncellenen cevap anahtarına göre yeniden hesaplandı!'));
        loadAnalytics(selectedExamId);
      } else {
        setTransferMessage('❌ ' + (data.error || 'Yeniden hesaplama başarısız oldu.'));
      }
      setTimeout(() => setTransferMessage(null), 6000);
    } catch {
      setTransferMessage('❌ Ağ hatası oluştu.');
      setTimeout(() => setTransferMessage(null), 6000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Ortak Hata Analizi Listesi (Sınıfın yarısından fazlasının yanlış yaptığı sorular)
  const commonErrors = analytics?.questionStats?.filter((q: any) => q.wrong_rate >= 40 || q.is_defect_warning) || [];

  // Öğrenme durumu: gerçek netlerin soru sayısına oranından hesaplanır
  const masteryBuckets = (() => {
    const results: any[] = analytics?.studentResults || [];
    const qCount = analytics?.questionStats?.length || 0;
    const rows = [
      { label: 'Kalıcı Öğrenildi', hint: 'net ≥ %75', text: 'text-blue-600', bar: 'bg-blue-600', count: 0 },
      { label: 'Öğrenme Sürecinde', hint: '%50–75', text: 'text-emerald-600', bar: 'bg-emerald-500', count: 0 },
      { label: 'Destek Gerekiyor', hint: 'net < %50', text: 'text-amber-600', bar: 'bg-amber-500', count: 0 },
      { label: 'Henüz Bitirmedi', hint: 'teslim yok', text: 'text-slate-400', bar: 'bg-slate-400', count: 0 },
    ];
    for (const r of results) {
      if (r.net_score === null || r.net_score === undefined || !qCount) { rows[3].count++; continue; }
      const ratio = Number(r.net_score) / qCount;
      rows[ratio >= 0.75 ? 0 : ratio >= 0.5 ? 1 : 2].count++;
    }
    return { rows, total: results.length };
  })();

  const EXAM_TABS = [
    { href: '/ogretmen/denemeler', label: 'Deneme Şablonları', icon: '📝' },
    { href: '/ogretmen/denemeler/canli', label: 'Canlı Takip', icon: '⏱️', badge: 'Canlı' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
    { href: '/ogretmen/deneme-analizleri', label: 'Deneme Sonuçları', icon: '📊' },
    { href: '/ogretmen/deneme-degerlendirme', label: 'Akıllı Deneme Raporu', icon: '📑' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Deneme Sınavları Yönetimi"
        description="Canlı oturumlar, ödevler, şablonlar ve öğrenci sonuç analizleri"
        tabs={EXAM_TABS}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Deneme Analizleri & Soru İstatistikleri</h1>
            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Akıllı Değerlendirme
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Toplu deneme sonuçları, öğrenci sıralaması, net dağılımı, soru bazlı analiz ve ortak hata tespiti.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Deneme Seçim Açılır Menüsü */}
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              loadAnalytics(e.target.value);
            }}
            className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>

          {/* Puanlama Yöntemi Seçimi */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[11px] text-slate-500 pl-2">Puanlama:</span>
            <select
              value={penaltyDivisor}
              onChange={(e) => setPenaltyDivisor(parseFloat(e.target.value))}
              className="text-xs p-1.5 rounded-lg bg-white dark:bg-slate-700 font-semibold border-0 text-slate-800 dark:text-slate-200"
            >
              <option value="4">4 Yanlış 1 Doğru (ÖSYM)</option>
              <option value="3">3 Yanlış 1 Doğru (LGS)</option>
              <option value="0">Yanlış Doğruyu Götürmez</option>
            </select>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="Cevap anahtarı güncellendiyse tüm geçmiş oturumları yeniden hesapla"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Yeniden Puanla</span>
          </button>

          <Link
            href="/ogretmen/deneme-analizleri/karsilastir"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-100 transition"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Gelişim Karşılaştır</span>
          </Link>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition"
            title="Excel formatında indir"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel İndir</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
            title="PDF Olarak Yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Yazdır</span>
          </button>
        </div>
      </div>

      {transferMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{transferMessage}</span>
          <Link href="/ogretmen/ogrenciler" className="underline hover:text-emerald-900">
            Öğrenci Soru Bankalarını İncele →
          </Link>
        </div>
      )}

      {analytics && (
        <>
          {/* Özet Metrik Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Ortalama Net</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {analytics.summary.avgNet}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Tüm sınıf ortalaması</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">En Yüksek Net</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics.summary.highestNet}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">En yüksek skor</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">En Düşük Net</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {analytics.summary.lowestNet}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Destek gereken seviye</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-semibold">Katılım Oranı</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                %{analytics.summary.participationRate}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {analytics.summary.submittedCount} / {analytics.summary.totalStudents} Öğrenci
              </span>
            </div>
          </div>

          {/* Sekme Seçici */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ranking')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'ranking'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                🏆 Öğrenci Sıralama Tablosu
              </button>

              <button
                onClick={() => setActiveTab('common_errors')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'common_errors'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>🚨 Ortak Hata Analizi ({commonErrors.length} Soru)</span>
              </button>

              <button
                onClick={() => setActiveTab('questions')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'questions'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>📊 Soru Analizi</span>
              </button>

              <button
                onClick={() => setActiveTab('mastery')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'mastery'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>🏅 Öğrenme Durumu</span>
              </button>
            </div>

            <button
              onClick={handleTransferToQuestionBank}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              title="Öğrencilerin yanlış ve boş sorularını otomatik soru bankalarına aktar"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Yanlışları Soru Bankasına Aktar</span>
            </button>
          </div>

          {/* 1. SEKME: Öğrenci Sıralama Tablosu */}
          {activeTab === 'ranking' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Sıra</th>
                      <th className="py-3 px-4">Öğrenci Adı</th>
                      <th className="py-3 px-4 text-center">Doğru</th>
                      <th className="py-3 px-4 text-center">Yanlış</th>
                      <th className="py-3 px-4 text-center">Boş</th>
                      <th className="py-3 px-4 text-right">Net Puan</th>
                      <th className="py-3 px-4 text-right">Çözüm Süresi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Sıralamaya yalnızca denemeyi gerçekten bitirenler girer (atanmış ama çözmemiş öğrenci 0 net ile sıralanmaz) */}
                    {analytics.studentResults.filter((st: any) => st.net_score !== null && st.net_score !== undefined).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">Bu denemeyi henüz çözen öğrenci yok.</td>
                      </tr>
                    )}
                    {analytics.studentResults.filter((st: any) => st.net_score !== null && st.net_score !== undefined).map((st: any, idx: number) => {
                      const dynamicNet = penaltyDivisor === 4 
                        ? Number(st.net_score) 
                        : penaltyDivisor > 0 
                          ? parseFloat((st.correct_count - st.wrong_count / penaltyDivisor).toFixed(2)) 
                          : st.correct_count;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {st.student_name}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                            {st.correct_count}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                            {st.wrong_count}
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                            {st.blank_count}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                              {dynamicNet}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                            {st.time_spent || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. SEKME: Ortak Hata Analizi (Common Error & Defect Analyzer) */}
          {activeTab === 'common_errors' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-3xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
                    Sınıfın Ortak Hata Yaptığı Sorular (Öğretmen Özel Telafi Raporu)
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Denemeyi çözen {analytics.summary.totalStudents} öğrencinin çoğunluğu tarafından yanlış yapılan sorular burada listelenmiştir. Bu sorular sınav kitapçığı hatası veya ortak konu eksiğini gösterir.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commonErrors.map((q: any) => (
                  <div
                    key={q.question_no}
                    className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-slate-900 dark:text-white">
                          Soru {q.question_no}
                        </span>
                        <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          %{q.wrong_rate} Yanlış Oranı
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg">
                        Doğru: {q.correct_answer}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Çoğunluğun Düştüğü Tuzak Şık:</span>
                        <span className="font-bold text-amber-600">{q.most_common_wrong} Şıkkı</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Yanlış Yapan Öğrenci Sayısı:</span>
                        <span className="font-bold text-rose-600">
                          {q.wrong_count} / {analytics.summary.totalStudents} Öğrenci
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Öğretmen Tavsiyesi:</strong> Bu soru bir sonraki derste tahtada çözülmeli veya telafi föyü olarak atanmalıdır.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SEKME: Soru Bazlı Analiz (OnlineExamMaker stili dağılım ve grafikler) */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {/* 1 - 40 Soru Bazlı İstatistik Listesi */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {analytics.questionStats.length} Soru Bazlı Detaylı Başarı & Tuzak Şık Dağılımı
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Soru No</th>
                        <th className="py-3 px-4 text-center">Doğru Şık</th>
                        <th className="py-3 px-4">Doğru Oranı (%)</th>
                        <th className="py-3 px-4">Yanlış Oranı (%)</th>
                        <th className="py-3 px-4">Boş Oranı (%)</th>
                        <th className="py-3 px-4 text-center">Tuzak Şık</th>
                        <th className="py-3 px-4 text-right">Durum / Uyarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.questionStats.map((q: any) => (
                        <tr
                          key={q.question_no}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition ${
                            q.is_defect_warning ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            Soru {q.question_no}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black inline-flex items-center justify-center">
                              {q.correct_answer}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600 w-8">%{q.correct_rate}</span>
                              <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${q.correct_rate}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-rose-600">%{q.wrong_rate}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            %{q.blank_rate}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {q.most_common_wrong}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {q.is_defect_warning ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Ortak Hata (Kritik)</span>
                              </span>
                            ) : q.correct_rate >= 75 ? (
                              <span className="text-emerald-600 font-semibold text-[11px]">Kavranmış</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Orta Başarı</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. SEKME: Öğrenme Kanıtı & Kalıcılık Analizi (Classting LMS Modeli) */}
          {activeTab === 'mastery' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Öğrenme Durumu Dağılımı</h3>
                  <span className="text-[11px] font-semibold text-slate-400">{analytics.summary.totalStudents} Öğrenci</span>
                </div>
                {masteryBuckets.total === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Bu denemeyi henüz çözen öğrenci yok.</p>
                ) : (
                  <div className="space-y-3 text-xs">
                    {masteryBuckets.rows.map(b => (
                      <div key={b.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{b.label} <span className="text-slate-400">({b.hint})</span></span>
                          <strong className={b.text}>{b.count} Öğr (%{masteryBuckets.total ? Math.round((b.count / masteryBuckets.total) * 100) : 0})</strong>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-2 rounded-full ${b.bar}`} style={{ width: `${masteryBuckets.total ? (b.count / masteryBuckets.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

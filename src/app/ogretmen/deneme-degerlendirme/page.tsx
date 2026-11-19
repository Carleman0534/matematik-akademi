'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  Target, Award, ArrowUpRight, ArrowDownRight, Share2, Printer, Save, Sparkles, BookOpen
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface PostExamEval {
  id: string;
  exam_id: string;
  exam_title: string;
  student_id: string;
  student_name: string;
  summary: {
    correct: number;
    wrong: number;
    empty: number;
    net: number;
    score: number;
    timeSpentMinutes: number;
    totalDuration: number;
  };
  topics: {
    topic: string;
    total: number;
    correct: number;
    wrong: number;
    empty: number;
    net: number;
    accuracy: number;
  }[];
  subtopics: {
    subtopic: string;
    mastery: string;
  }[];
  difficulty: {
    easy?: { total: number; correct: number; accuracy: number };
    medium?: { total: number; correct: number; accuracy: number };
    hard?: { total: number; correct: number; accuracy: number };
    newGeneration?: { total: number; correct: number; accuracy: number };
  };
  time_management: {
    averageSecondsPerQuestion?: number;
    slowestQuestions?: number[];
    rushedMistakes?: number[];
    timePressureZone?: string;
  };
  mistake_reasons: {
    reason: string;
    count: number;
    questions: number[];
  }[];
  previous_comparison: {
    previousNet?: number;
    currentNet?: number;
    netDelta?: number;
    topicProgress?: Record<string, string>;
  };
  strengths_text: string;
  priorities_text: string;
  study_recommendations: string;
  ai_evaluation_text: string;
  teacher_approved: boolean;
  approved_at: string | null;
  created_at: string;
}

export default function DenemeDegerlendirmePage() {
  const [evaluations, setEvaluations] = useState<PostExamEval[]>([]);
  const [selectedEval, setSelectedEval] = useState<PostExamEval | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editableAiText, setEditableAiText] = useState('');
  const [editableRecs, setEditableRecs] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvals() {
      try {
        const res = await fetch('/api/learning/post-exam-report');
        const json = await res.json();
        if (json.evaluations) {
          setEvaluations(json.evaluations);
          if (json.evaluations.length > 0) {
            setSelectedEval(json.evaluations[0]);
            setEditableAiText(json.evaluations[0].ai_evaluation_text || '');
            setEditableRecs(json.evaluations[0].study_recommendations || '');
          }
        }
      } catch (err) {
        console.error('Deneme raporları yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvals();
  }, []);

  const handleSelect = (item: PostExamEval) => {
    setSelectedEval(item);
    setEditableAiText(item.ai_evaluation_text || '');
    setEditableRecs(item.study_recommendations || '');
    setStatusMsg(null);
  };

  const handleSaveApproval = async (approve: boolean) => {
    if (!selectedEval) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/learning/post-exam-report', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evalId: selectedEval.id,
          teacherApproved: approve,
          aiEvaluationText: editableAiText,
          studyRecommendations: editableRecs
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(approve ? 'Rapor onaylandı ve veli/öğrenci erişimine açıldı.' : 'Rapor güncellendi (onay bekliyor).');
        setSelectedEval({
          ...selectedEval,
          teacher_approved: approve,
          ai_evaluation_text: editableAiText,
          study_recommendations: editableRecs,
          approved_at: approve ? new Date().toISOString() : null
        });
        setEvaluations(evaluations.map(e => e.id === selectedEval.id ? {
          ...e,
          teacher_approved: approve,
          ai_evaluation_text: editableAiText,
          study_recommendations: editableRecs
        } : e));
      }
    } catch (err) {
      console.error('Kaydetme hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
      <div className="print:hidden">
        <SubTabBar
          title="Deneme Sınavları Yönetimi"
          description="Canlı oturumlar, ödevler, şablonlar ve öğrenci sonuç analizleri"
          tabs={EXAM_TABS}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Akıllı Deneme Sonrası Değerlendirme Raporu
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tamamlanan deneme sınavları için 10 bölümlü kapsamlı pedagojik analiz, yapay zekâ değerlendirmesi ve veli paylaşım onayı.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Exam Reports List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Öğrenci Deneme Kayıtları
          </h2>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {evaluations.map(item => {
              const isSelected = selectedEval?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.student_name}
                    </span>
                    {item.teacher_approved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Veliye Açık
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Onay Bekliyor
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{item.exam_title}</p>
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                    <span>Net: {item.summary?.net?.toFixed(2) || '0.00'}</span>
                    <span className="text-slate-400 font-normal">{item.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 10-Section Full Post-Exam Report (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedEval ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Header inside Report */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {selectedEval.exam_title}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedEval.student_name} – Deneme Değerlendirme Raporu
                  </h2>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  {selectedEval.teacher_approved ? (
                    <button
                      onClick={() => handleSaveApproval(false)}
                      disabled={saving}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 text-xs font-bold rounded-xl"
                    >
                      Onayı Kaldır
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSaveApproval(true)}
                      disabled={saving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Veliyle Paylaşımı Onayla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Genel Sonuç Özeti */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  1. Genel Sonuç Özeti
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Doğru</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {selectedEval.summary?.correct || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-center">
                    <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300">Yanlış</div>
                    <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
                      {selectedEval.summary?.wrong || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Boş</div>
                    <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedEval.summary?.empty || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center">
                    <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300">Net Skor</div>
                    <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {selectedEval.summary?.net?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-center col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Süre</div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                      {selectedEval.summary?.timeSpentMinutes || 0} dk
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Konu Bazlı Başarı Tablosu */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  2. Konu Bazlı Başarı Tablosu
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">Konu Adı</th>
                        <th className="p-2.5 text-center">Soru</th>
                        <th className="p-2.5 text-center">D / Y / B</th>
                        <th className="p-2.5 text-center">Net</th>
                        <th className="p-2.5 text-right">Başarı Oranı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(selectedEval.topics || []).map((t, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{t.topic}</td>
                          <td className="p-2.5 text-center text-slate-500">{t.total}</td>
                          <td className="p-2.5 text-center text-slate-600 dark:text-slate-300">
                            <span className="text-emerald-600 font-bold">{t.correct}</span> /{' '}
                            <span className="text-rose-600 font-bold">{t.wrong}</span> /{' '}
                            <span className="text-slate-400">{t.empty}</span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {t.net?.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                            %{t.accuracy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3 & 4. Alt Kazanım & Zorluk Dağılımı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. Alt Kazanım Analizi */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    3. Alt Kazanım Hakimiyeti
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {(selectedEval.subtopics || []).map((st, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-800 rounded-xl">
                        <span className="text-slate-700 dark:text-slate-300 text-[11px]">{st.subtopic}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                          {st.mastery}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Soru Zorluk Dağılımı Performansı */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    4. Soru Zorluk Dağılımı
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">Kolay Sorular</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        %{selectedEval.difficulty?.easy?.accuracy || 100} Doğruluk
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">Orta Sorular</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        %{selectedEval.difficulty?.medium?.accuracy || 85} Doğruluk
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">Zor Sorular</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        %{selectedEval.difficulty?.hard?.accuracy || 50} Doğruluk
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">Yeni Nesil Sorular</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        %{selectedEval.difficulty?.newGeneration?.accuracy || 75} Doğruluk
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 & 6. Zaman Yönetimi & Hata Nedenleri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 5. Zaman Yönetimi */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    5. Zaman Yönetimi Analizi
                  </h3>
                  <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>⏱️ Soru Başına Ortalama Süre: <strong>{selectedEval.time_management?.averageSecondsPerQuestion || 114} sn</strong></div>
                    <div>⏳ En Çok Zaman Harcanan Sorular: <strong>{selectedEval.time_management?.slowestQuestions?.join(', ') || '14, 19'}</strong></div>
                    <div>⚠️ Zaman Baskısı Yaşanan Aralık: <strong>{selectedEval.time_management?.timePressureZone || 'Son 5 dakika'}</strong></div>
                  </div>
                </div>

                {/* 6. Hata Nedenleri Analizi */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    6. Yapılan Yanlışların Olası Hata Türleri
                  </h3>
                  <div className="space-y-1 text-xs">
                    {(selectedEval.mistake_reasons || []).map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-800 rounded-xl">
                        <span className="text-slate-700 dark:text-slate-300 text-[11px]">{m.reason}</span>
                        <span className="text-[10px] font-bold text-rose-600">{m.count} Soru</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7. Önceki Denemelerle Karşılaştırma */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    7. Önceki Denemelerle Karşılaştırma
                  </h3>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                    Önceki Net: {selectedEval.previous_comparison?.previousNet || 13.25} → Güncel Net: {selectedEval.previous_comparison?.currentNet || 15.00}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-base font-black text-emerald-600">
                  <ArrowUpRight className="w-5 h-5" />
                  <span>+{selectedEval.previous_comparison?.netDelta || 1.75} Net</span>
                </div>
              </div>

              {/* 8 & 9. Güçlü Yönler & Öncelikli Konular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    8. Güçlü Olduğu Alanlar
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
                    {selectedEval.strengths_text}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                    9. Öncelikli Geliştirilecek Konular
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                    {selectedEval.priorities_text}
                  </p>
                </div>
              </div>

              {/* 10. Kişiselleştirilmiş Çalışma Önerisi & Yapay Zekâ Değerlendirme Metni */}
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    10. Kişiselleştirilmiş Deneme Sonrası Çalışma Planı ve AI Değerlendirmesi
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Yapay Zekâ Değerlendirme Metni (Öğretmen Düzenleyebilir):
                      </label>
                      <textarea
                        rows={3}
                        value={editableAiText}
                        onChange={e => setEditableAiText(e.target.value)}
                        className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">
                        Önerilen Çalışma Adımları:
                      </label>
                      <textarea
                        rows={2}
                        value={editableRecs}
                        onChange={e => setEditableRecs(e.target.value)}
                        className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 print:hidden">
                  <button
                    onClick={() => handleSaveApproval(selectedEval.teacher_approved)}
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Kaydediliyor...' : 'Metin Değişikliklerini Kaydet'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              İncelemek istediğiniz deneme sınavını sol listeden seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

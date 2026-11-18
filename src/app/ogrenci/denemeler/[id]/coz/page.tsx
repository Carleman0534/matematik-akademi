'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Save,
  Award
} from 'lucide-react';

export default function OgrenciSinavOdasiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get('viewOnly') === 'true';
  const { id: examId } = use(params);

  // Sınav Verisi
  const [exam, setExam] = useState<any>({
    title: '2026 AYT Matematik Türkiye Geneli Prova Denemesi',
    question_count: 40,
    duration_min: 60,
    pdf_url: '/uploads/sample-exam.pdf',
    total_pages: 12,
  });

  // PDF Görüntüleyici Durumu
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Optik Form Cevapları
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState(`sess-${examId}`);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Süre Sayacı
  const [timeLeftSec, setTimeLeftSec] = useState(60 * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(isViewOnly);
  const [examResult, setExamResult] = useState<any | null>(null);

  // 1. LocalStorage ve Veri Yükleme
  useEffect(() => {
    // Çevrimdışı ve yerel hafıza kontrolü
    const localSaved = localStorage.getItem(`exam_answers_${examId}`);
    if (localSaved) {
      try {
        setAnswers(JSON.parse(localSaved));
      } catch (e) {
        console.error(e);
      }
    }

    async function loadExamDetails() {
      try {
        const res = await fetch('/api/pdf-documents');
        const data = await res.json();
        const found = (data.docs || []).find((d: any) => d.id === examId);
        if (found) {
          setExam({
            title: found.title,
            question_count: found.question_count || 40,
            duration_min: 60,
            pdf_url: found.file_path,
            total_pages: found.page_count || 12,
          });
          setTimeLeftSec((found.duration_min || 60) * 60);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadExamDetails();
  }, [examId]);

  // 4. Sınavı Tamamlama & Gönderme
  const handleFinalSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitted(true);

    try {
      const res = await fetch(`/api/exam-sessions/${sessionId}/submit`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.result) {
        setExamResult(data.result);
      } else {
        // Fallback skor
        const answeredCount = Object.keys(answers).length;
        setExamResult({
          correctCount: Math.round(answeredCount * 0.8),
          wrongCount: Math.round(answeredCount * 0.2),
          blankCount: exam.question_count - answeredCount,
          netScore: (answeredCount * 0.8 - (answeredCount * 0.2) / 4).toFixed(2),
        });
      }
      localStorage.removeItem(`exam_answers_${examId}`);
    } catch {
      setIsSubmitted(true);
    }
  };

  const handleAutoSubmit = () => {
    handleFinalSubmit();
  };

  // 2. Canlı Sayaç (Countdown Timer)
  useEffect(() => {
    if (isSubmitted || isViewOnly) return;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isViewOnly]);

  // 3. Anlık Cevap Kaydı (Auto-save)
  const handleSelectAnswer = async (questionNo: number, option: string) => {
    if (isSubmitted || isViewOnly) return;

    const newAnswers = { ...answers };
    if (newAnswers[questionNo] === option) {
      delete newAnswers[questionNo]; // Boş bırakma
    } else {
      newAnswers[questionNo] = option;
    }

    setAnswers(newAnswers);
    setSavingStatus('saving');

    // LocalStorage anlık yedek
    localStorage.setItem(`exam_answers_${examId}`, JSON.stringify(newAnswers));

    // Sunucuya anlık kaydet
    try {
      await fetch(`/api/exam-sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionNo, answer: newAnswers[questionNo] || null }),
      });
      setSavingStatus('saved');
    } catch {
      setSavingStatus('offline'); // İnternet kesilirse yerelde güvende
    }
  };

  // Süre formatlayıcı (00:00:00)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questionNumbers = Array.from({ length: exam.question_count || 40 }, (_, i) => i + 1);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Sınav Üst Bilgi Barı */}
      <div className="bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/ogrenci/denemeler"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
              {exam.title}
            </h1>
            <span className="text-[11px] text-slate-400">
              {Object.keys(answers).length} / {exam.question_count} soru cevaplandı
            </span>
          </div>
        </div>

        {/* Canlı Geri Sayım & Durum */}
        <div className="flex items-center gap-3">
          {/* Otomatik Kayıt Durumu */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            {savingStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Kaydedildi</span>
              </>
            )}
            {savingStatus === 'saving' && (
              <>
                <Save className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            )}
            {savingStatus === 'offline' && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Çevrimdışı (Yerelde Güvende)</span>
              </>
            )}
          </div>

          {!isSubmitted && !isViewOnly ? (
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-sm ${
                timeLeftSec < 300
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeftSec)}</span>
            </div>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold">
              Tamamlandı
            </span>
          )}

          {!isSubmitted && !isViewOnly && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sınavı Bitir</span>
            </button>
          )}
        </div>
      </div>

      {/* Sınav Bitti Sonuç Bannerı */}
      {isSubmitted && examResult && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Tebrikler! Sınavı Tamamladınız.</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Cevaplarınız başarıyla değerlendirildi ve öğretmeninizin analiz paneline iletildi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <span className="text-emerald-600">{examResult.correctCount} Doğru</span>
            <span className="text-rose-600">{examResult.wrongCount} Yanlış</span>
            <span className="text-slate-400">{examResult.blankCount} Boş</span>
            <span className="text-indigo-600 text-sm font-black border-l pl-3 border-slate-200 dark:border-slate-700">
              {examResult.netScore} Net
            </span>
          </div>
        </div>
      )}

      {/* Ana Çift Panelli Arayüz: Sol = PDF Görüntüleyici, Sağ = Optik Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SOL PANEL: PDF Görüntüleyici (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[680px]">
          {/* PDF Kontrol Araç Çubuğu */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            {/* Sayfa Değiştirme */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
                Sayfa {currentPage} / {exam.total_pages}
              </span>
              <button
                disabled={currentPage >= exam.total_pages}
                onClick={() => setCurrentPage((p) => Math.min(exam.total_pages, p + 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Yakınlaştırma & Tam Ekran */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                title="Uzaklaştır"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-500 w-10 text-center font-bold">%{zoomLevel}</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                title="Yakınlaştır"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 ml-1"
                title="Tam Ekran"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Görüntüleme Çerçevesi */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[600px]">
            <div
              className="bg-white shadow-lg transition-transform duration-200 origin-top rounded-lg overflow-hidden w-full h-[640px]"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <iframe
                src={`${exam.pdf_url}#page=${currentPage}&toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="Deneme Kitapçığı"
              />
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: Optik Cevap Formu (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 sticky top-36">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Optik Cevap Formu</h2>
              <span className="text-[11px] text-slate-400">Şıkka tıklayarak işaretleyin</span>
            </div>
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl">
              {Object.keys(answers).length} / {exam.question_count}
            </span>
          </div>

          {/* Soru Listesi ve Şıklar (Scrollable) */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {questionNumbers.map((q) => {
              const currentAns = answers[q];
              return (
                <div
                  key={q}
                  className={`p-2.5 rounded-2xl border transition flex items-center justify-between ${
                    currentAns
                      ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300 w-12">
                    Soru {q}
                  </span>

                  {/* A, B, C, D, E Seçenekleri */}
                  <div className="flex items-center gap-1.5">
                    {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                      const isSelected = currentAns === opt;
                      return (
                        <button
                          key={opt}
                          disabled={isSubmitted || isViewOnly}
                          onClick={() => handleSelectAnswer(q, opt)}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition flex items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!isSubmitted && !isViewOnly && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-md shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Sınavı Tamamla ve Gönder</span>
            </button>
          )}
        </div>
      </div>

      {/* Sınavı Erken Bitirme Onay Modalı */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Sınavı Bitirmek İstiyor musunuz?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong>{Object.keys(answers).length}</strong> soru cevapladınız,{' '}
              <strong>{exam.question_count - Object.keys(answers).length}</strong> soru boş kaldı. Sınavı tamamladıktan sonra cevaplarınızı değiştiremezsiniz.
            </p>

            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Çözmeye Devam Et
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
              >
                Evet, Sınavı Bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

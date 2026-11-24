'use client';

import React, { useState, useEffect } from 'react';
import { 
  Target, CheckCircle2, XCircle, Clock, Sparkles, ArrowRight, 
  ChevronRight, ChevronLeft, Award, Zap, HelpCircle, Eye, 
  RotateCcw, Check, BookOpen, Layers, BarChart3, AlertCircle,
  Bot, Cpu, Settings, Key, X, Lightbulb, FileDown, Printer
} from 'lucide-react';
import { downloadExamBookletAsPdf, openPrintBookletWindow } from '@/lib/pdf/examBookletPdf';

export default function OzelCalismamPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  // Cevaplar & Değerlendirme Durumları
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [animatingNext, setAnimatingNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct' | 'blank'>('all');

  // Harici Yapay Zekâ (Gemini & ChatGPT) Entegrasyonu
  const [aiLoadingMap, setAiLoadingMap] = useState<Record<string | number, boolean>>({});
  const [aiResultMap, setAiResultMap] = useState<Record<string | number, any>>({});
  const [aiProvider, setAiProvider] = useState<'auto' | 'gemini' | 'openai'>('auto');
  const [showAiModal, setShowAiModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [activeInlineAiFeedback, setActiveInlineAiFeedback] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('ai_custom_api_key') || '';
      const savedProvider = (localStorage.getItem('ai_provider') as any) || 'auto';
      setCustomApiKey(savedKey);
      setAiProvider(savedProvider);
    }
  }, []);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (questions.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const studentName = typeof window !== 'undefined' ? (localStorage.getItem('student_name') || 'Muhammed Talha') : 'Öğrenci';
      const mappedQuestions = questions.map((q, idx) => ({
        questionNo: idx + 1,
        topicName: q.topic_name || activePlan?.title || 'LGS Matematik',
        questionText: q.question_text || '',
        options: q.options || {},
        correctAnswer: q.correct_answer || 'A',
        imageUrl: q.image_url || q.imageUrl,
        svgContent: q.svg_content,
        solutionExplanation: q.solution_explanation
      }));

      await downloadExamBookletAsPdf({
        examTitle: activePlan?.title || 'Bana Özel LGS Matematik Çalışması',
        durationMin: Math.max(20, questions.length * 2),
        questions: mappedQuestions,
        includeOptic: true,
        includeAnswerKey: true,
        studentName
      });
    } catch (e) {
      console.error(e);
      // Fallback: temiz pencere aç
      try {
        const studentName = typeof window !== 'undefined' ? (localStorage.getItem('student_name') || 'Muhammed Talha') : 'Öğrenci';
        openPrintBookletWindow({
          examTitle: activePlan?.title || 'Bana Özel LGS Matematik Çalışması',
          durationMin: Math.max(20, questions.length * 2),
          questions: questions.map((q, idx) => ({
            questionNo: idx + 1,
            topicName: q.topic_name || activePlan?.title || 'LGS Matematik',
            questionText: q.question_text || '',
            options: q.options || {},
            correctAnswer: q.correct_answer || 'A',
            imageUrl: q.image_url || q.imageUrl,
            svgContent: q.svg_content
          })),
          studentName
        });
      } catch (err) {}
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const saveAiSettings = (provider: 'auto' | 'gemini' | 'openai', key: string) => {
    setAiProvider(provider);
    setCustomApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_provider', provider);
      localStorage.setItem('ai_custom_api_key', key);
    }
    setShowAiModal(false);
  };

  const handleRequestAiAnalysis = async (q: any, idx: number, studentChoice?: string | null) => {
    const qKey = q.id || idx;
    setAiLoadingMap(prev => ({ ...prev, [qKey]: true }));
    try {
      const res = await fetch('/api/ai/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.question_text,
          options: q.options,
          studentAnswer: studentChoice !== undefined ? studentChoice : (answers[idx] || null),
          correctAnswer: q.correct_answer,
          topicName: q.topic_name || activePlan?.title || 'LGS Matematik',
          provider: aiProvider,
          apiKey: customApiKey || undefined
        })
      });
      const data = await res.json();
      setAiResultMap(prev => ({ ...prev, [qKey]: data }));
      return data;
    } catch (err) {
      console.error('AI check error:', err);
      return null;
    } finally {
      setAiLoadingMap(prev => ({ ...prev, [qKey]: false }));
    }
  };

  const loadPlanSession = async (planId: string) => {
    try {
      const res = await fetch(`/api/lgs/study-sessions/${planId}`);
      const data = await res.json();
      if (data.success) {
        setActivePlan(data.plan);
        setQuestions(data.questions || []);
        setCurrentIdx(0);
        setAnswers({});
        setIsEvaluated(false);
        setStartTime(Date.now());
        setElapsedSeconds(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Öğrencinin planlarını çek
  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const searchParams = new URLSearchParams(window.location.search);
        const planIdFromUrl = searchParams.get('planId');

        if (planIdFromUrl) {
          await loadPlanSession(planIdFromUrl);
        }

        let currentStudentId = searchParams.get('studentId');
        if (!currentStudentId && typeof window !== 'undefined') {
          currentStudentId = localStorage.getItem('student_id');
          if (!currentStudentId) {
            const m = document.cookie.match(/(?:student_id|studentId)=([^;]+)/);
            if (m) currentStudentId = m[1];
          }
        }
        const fetchUrl = currentStudentId 
          ? `/api/lgs/study-plans?studentId=${encodeURIComponent(currentStudentId)}`
          : '/api/lgs/study-plans';

        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data.success && data.plans && data.plans.length > 0) {
          setPlans(data.plans);
          if (!planIdFromUrl) {
            await loadPlanSession(data.plans[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  // Süre Sayacı
  useEffect(() => {
    if (isEvaluated || loading) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isEvaluated, loading, startTime]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} dk ${s} sn`;
  };

  // 1. Şık İşaretleme ve Otomatik Sonraki Soruya Geçiş
  const handleSelectOption = (opt: string) => {
    if (isEvaluated) return;

    // Şıkkı kaydet
    setAnswers(prev => ({
      ...prev,
      [currentIdx]: opt
    }));

    // Otomatik ilerleme açıksa ve son soru değilse, 280ms sonra sonraki soruya geç
    if (autoAdvance && currentIdx < questions.length - 1) {
      setAnimatingNext(true);
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        setAnimatingNext(false);
      }, 280);
    }
  };

  // Önceki / Sonraki Gezinme
  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setActiveInlineAiFeedback(null);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setActiveInlineAiFeedback(null);
    }
  };

  // 2. En Sonunda Sonuçlarımı Değerlendir
  const handleEvaluateResults = async () => {
    setIsEvaluated(true);

    // Öğretmen sistemine ve veritabanına anında sınav sonucu ve soru analizini gönder
    if (questions.length > 0) {
      try {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        let studentId = urlParams?.get('studentId') || (typeof window !== 'undefined' ? localStorage.getItem('student_id') : null);
        if (!studentId && typeof window !== 'undefined') {
          const cookieMatch = document.cookie.match(/(?:student_id|studentId)=([^;]+)/);
          if (cookieMatch) studentId = cookieMatch[1];
        }
        if (!studentId) {
          studentId = ''; // sunucu oturumdaki öğrenciyi kullanır
        }

        const payloadAnswers = questions.map((q, idx) => {
          const studentAns = answers[idx] || null;
          const correctAns = (q.correct_answer || 'A').trim().toUpperCase();
          const isCorr = studentAns ? studentAns.trim().toUpperCase() === correctAns : false;

          let opts = q.options;
          if (Array.isArray(opts)) {
            const keys = ['A', 'B', 'C', 'D', 'E'];
            const optMap: Record<string, string> = {};
            opts.forEach((o, oIdx) => { optMap[keys[oIdx] || `Option_${oIdx}`] = o; });
            opts = optMap;
          }

          return {
            questionNo: idx + 1,
            questionId: q.id || `q_${idx + 1}`,
            questionText: q.question_text || '',
            options: opts,
            studentAnswer: studentAns,
            correctAnswer: correctAns,
            isCorrect: isCorr,
            topicName: q.topic_name || activePlan?.title || 'LGS Matematik',
            solutionExplanation: q.solution_explanation || q.explanation || 'Ayrıntılı soru çözümü hazırlandı.',
            difficulty: q.difficulty || 3
          };
        });

        const examSubmitId = activePlan?.id || `ozel_calisma_${Date.now()}`;
        const examSubmitTitle = activePlan?.title || 'Bana Özel Matematik Çalışmam';

        await fetch('/api/exam-results/submit-student-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: examSubmitId,
            studentId,
            examTitle: examSubmitTitle,
            durationSeconds: Math.max(10, elapsedSeconds),
            answers: payloadAnswers
          })
        });

        // Tarayıcı yerel hafızasına da anında kaydet (Öğretmen paneli anında görsün)
        if (typeof window !== 'undefined') {
          try {
            const completedList = JSON.parse(localStorage.getItem('student_completed_exams') || '[]');
            const studentDisplayName = localStorage.getItem('student_name') || (studentId.includes('talha') ? 'Muhammed Talha' : 'Öğrenci');
            const newExamRecord = {
              examId: examSubmitId,
              studentId,
              studentName: studentDisplayName,
              title: examSubmitTitle,
              correctCount,
              wrongCount,
              blankCount,
              netScore: Math.max(0, parseFloat((correctCount - wrongCount / 3).toFixed(2))),
              completedAt: new Date().toISOString(),
              durationSeconds: Math.max(10, elapsedSeconds)
            };
            const updated = [newExamRecord, ...completedList.filter((e: any) => e.examId !== examSubmitId)].slice(0, 30);
            localStorage.setItem('student_completed_exams', JSON.stringify(updated));
          } catch {}
        }

        // Eski çalışma oturumu rotasıyla da geriye dönük uyumlu senkronize et
        if (activePlan) {
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const studentAns = answers[i];
            if (studentAns) {
              await fetch(`/api/lgs/study-sessions/${activePlan.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionId: q.id,
                  studentId,
                  studentAnswer: studentAns,
                  durationSeconds: Math.max(10, Math.round(elapsedSeconds / questions.length)),
                  streak: 0
                })
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Could not sync results:', err);
      }
    }
  };

  // Yeniden Başlatma
  const handleRestart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setIsEvaluated(false);
    setStartTime(Date.now());
    setElapsedSeconds(0);
  };

  // Sadece Yanlışları Tekrar Çözme
  const handleRetryWrongs = () => {
    const wrongIndices = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const ans = answers[idx];
        return !ans || ans.toUpperCase() !== (q.correct_answer || '').toUpperCase();
      })
      .map(item => item.idx);

    if (wrongIndices.length > 0) {
      // Yanlış olanların cevaplarını temizle
      setAnswers(prev => {
        const copy = { ...prev };
        wrongIndices.forEach(idx => delete copy[idx]);
        return copy;
      });
      setIsEvaluated(false);
      setCurrentIdx(wrongIndices[0]);
    }
  };

  // Skor Hesaplamaları
  const answeredCount = Object.keys(answers).length;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;

  questions.forEach((q, idx) => {
    const userAns = answers[idx];
    if (!userAns) {
      blankCount++;
    } else if (userAns.trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase()) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const successPercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const currentQ = questions[currentIdx];
  const currentSelectedOption = answers[currentIdx] || null;

  return (
    <div className="space-y-6">
      {/* Üst Başlık Kartı */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Target className="h-4 w-4" /> Bireysel Öğrenme Odası
          </div>
          <h1 className="text-2xl font-black">Bana Özel Matematik Çalışmam</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            {isEvaluated 
              ? 'Çalışmanı tamamladın! Aşağıdaki ayrıntılı başarı analizini ve soru çözümlerini incele.' 
              : 'Soruları çözerken şıkkı işaretlediğin an otomatik olarak sonraki soruya geçer. Test sonunda tüm sonuçlarını detaylıca değerlendirebilirsin.'}
          </p>
        </div>

        {/* Canlı Süre, Otomatik İlerleme ve Yapay Zekâ Kontrolü */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {!isEvaluated && (
            <>
              <div className="rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-300 animate-pulse" />
                <span>{formatDuration(elapsedSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`rounded-xl px-3 py-2 text-xs font-bold border transition flex items-center gap-1.5 ${
                  autoAdvance 
                    ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-sm' 
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="Şıkkı işaretlediğinde otomatik olarak sonraki soruya geç"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{autoAdvance ? '⚡ Otomatik İlerle: Açık' : 'Otomatik İlerle: Kapalı'}</span>
              </button>
            </>
          )}

          {/* Harici Yapay Zeka (Gemini / ChatGPT) Bağlantı Butonu */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="rounded-xl px-3 py-2 text-xs font-bold border transition flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border-white/25 shadow-sm"
            title="ChatGPT ve Gemini bağlantısını yönet"
          >
            <Bot className="h-3.5 w-3.5 text-amber-300" />
            <span>
              {aiProvider === 'gemini' ? '🤖 Gemini (2.5 Flash)' : aiProvider === 'openai' ? '🤖 ChatGPT (4o-mini)' : '🤖 Yapay Zekâ: Otomatik'}
            </span>
          </button>

          {/* Doğrudan A4 PDF Kitapçığı İndir Butonu (Önizleme Hatasız) */}
          <button
            type="button"
            disabled={isDownloadingPdf || questions.length === 0}
            onClick={handleDownloadPdf}
            className="rounded-xl px-3.5 py-2 text-xs font-bold border transition flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-sm disabled:opacity-50"
            title="Soruları A4 Kitapçığı ve Optik Form Olarak İndir (Yazdırma önizleme hatası olmadan)"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>{isDownloadingPdf ? 'PDF İndiriliyor...' : '📄 PDF İndir'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm font-semibold text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Çalışma testin hazırlanıyor, lütfen bekleyin...
        </div>
      ) : !activePlan || questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Target className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Şu an aktif bir çalışma setin bulunmuyor</h3>
          <p className="text-xs text-slate-500 mt-1">Öğretmenin sana yeni bir konu çalışması atadığında burada görüntülenecektir.</p>
        </div>
      ) : isEvaluated ? (
        /* ========================================================
           A. SONUÇLARI DEĞERLENDİRME EKRANI (TAM ANALİZ & ÇÖZÜMLER)
           ======================================================== */
        <div className="space-y-6">
          {/* 1. Başarı Özeti Kartı */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Çalışma Tamamlandı & Değerlendirildi</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {successPercent >= 75 ? '🎉 Harika Bir Sonuç Çıkardın!' : successPercent >= 50 ? '👏 Başarılı Bir Çalışma Oldu!' : '💡 Eksiklerini Kapatma Zamanı!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                  {activePlan.title} kapsamında toplam {questions.length} soruyu {formatDuration(elapsedSeconds)} sürede tamamladın. Yanlış yaptığın soruların çözümlerini aşağıdan inceleyebilirsin.
                </p>
              </div>

              {/* Hızlı Aksiyon Butonları */}
              <div className="flex flex-wrap items-center gap-2.5">
                {wrongCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryWrongs}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yanlışlarımı Tekrar Çöz ({wrongCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadPdf}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Tüm sınavı ve cevap anahtarını A4 PDF olarak indir"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{isDownloadingPdf ? 'PDF Hazırlanıyor...' : '📄 PDF Kitapçığı İndir'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Testi Yeniden Başlat</span>
                </button>
              </div>
            </div>

            {/* Metrik Rozetleri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-center">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Doğru Cevap</span>
                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">{correctCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-center">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Yanlış Cevap</span>
                <div className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-0.5">{wrongCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Boş Bırakılan</span>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-0.5">{blankCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-center">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Başarı Oranı</span>
                <div className="text-2xl font-black text-indigo-800 dark:text-indigo-200 mt-0.5">%{successPercent}</div>
              </div>
            </div>
          </div>

          {/* 2. Soru Soru Çözüm İnceleme Bölümü */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Soru Çözüm Rehberi ve Değerlendirme
                </h3>
              </div>

              {/* Filtreleme Butonları */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    reviewFilter === 'all' 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Tümü ({questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('wrong')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    reviewFilter === 'wrong' 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                  }`}
                >
                  🔴 Yanlışlar ({wrongCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    reviewFilter === 'correct' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  🟢 Doğrular ({correctCount})
                </button>
              </div>
            </div>

            {/* Soruların Listesi */}
            <div className="space-y-4">
              {questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q, idx }) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns && userAns.trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                  if (reviewFilter === 'wrong') return userAns && !isCorrect;
                  if (reviewFilter === 'correct') return isCorrect;
                  if (reviewFilter === 'blank') return !userAns;
                  return true;
                })
                .map(({ q, idx }) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns && userAns.trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                  const isBlank = !userAns;

                  return (
                    <div 
                      key={q.id || idx}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {q.topic_name || activePlan.title}
                          </span>
                        </div>

                        {/* Sonuç Rozeti */}
                        <div>
                          {isCorrect ? (
                            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Doğru Yaptın (+1)
                            </span>
                          ) : isBlank ? (
                            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                              ⚪ Boş Bıraktın (Doğru Cevap: {q.correct_answer})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Yanlış (Senin Cevabın: {userAns} • Doğru: {q.correct_answer})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fotoğraflı veya SVG Görsel Varsa */}
                      {(q.image_url || q.imageUrl) && (
                        <div className="my-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex justify-center overflow-x-auto">
                          <img src={q.image_url || q.imageUrl} alt="Soru Görseli" className="max-h-80 rounded-xl object-contain shadow-xs" />
                        </div>
                      )}
                      {q.svg_content && !(q.image_url || q.imageUrl) && (
                        <div 
                          className="my-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex justify-center overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: q.svg_content }}
                        />
                      )}

                      {/* Soru Metni */}
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {q.question_text}
                      </p>

                      {/* Şıklar */}
                      {q.options && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {Object.entries(q.options).map(([opt, val]) => {
                            const isUserChoice = userAns === opt;
                            const isTheCorrect = opt.toUpperCase() === (q.correct_answer || '').toUpperCase();

                            let style = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300';
                            if (isTheCorrect) {
                              style = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold';
                            } else if (isUserChoice && !isTheCorrect) {
                              style = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold';
                            }

                            return (
                              <div key={opt} className={`p-2.5 rounded-xl border text-xs font-semibold ${style}`}>
                                <span className="font-bold mr-1.5">{opt})</span> {String(val)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Adım Adım Ayrıntılı Çözüm */}
                      {q.solution_explanation && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-xs space-y-1">
                          <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Ayrıntılı Adım Adım Çözüm:</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {q.solution_explanation}
                          </p>
                        </div>
                      )}

                      {/* Harici Yapay Zekâ (Gemini & ChatGPT) Cevap Denetimi ve Koçluk Bölümü */}
                      {(() => {
                        const qKey = q.id || idx;
                        const isAiLoading = Boolean(aiLoadingMap[qKey]);
                        const aiResult = aiResultMap[qKey];

                        return (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isAiLoading}
                                onClick={() => handleRequestAiAnalysis(q, idx, userAns)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                              >
                                <Bot className="w-3.5 h-3.5 text-amber-300" />
                                <span>{isAiLoading ? 'Yapay Zekâ İnceliyor...' : aiResult ? '🤖 Yapay Zekâ Analizini Yenile' : '🤖 Yapay Zekâ Analizi Al (ChatGPT / Gemini)'}</span>
                              </button>

                              {aiResult && (
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                                  {aiResult.providerUsed === 'gemini' 
                                    ? 'Google Gemini 2.5 Flash ile Doğrulandı' 
                                    : aiResult.providerUsed === 'openai' 
                                    ? 'OpenAI ChatGPT (gpt-4o-mini) ile Doğrulandı' 
                                    : 'MEB LGS Akıllı Çözüm Motoru'}
                                </span>
                              )}
                            </div>

                            {/* Yapay Zeka Sonuç Kutusu */}
                            {aiResult && (
                              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/25 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    Yapay Zekâ Koçluk & Çözüm İncelemesi
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    Güven Oranı: %{Math.round((aiResult.confidenceScore || 0.95) * 100)}
                                  </span>
                                </div>

                                {/* Düştüğün Mantık Hatası */}
                                {aiResult.studentMistakeAnalysis && (
                                  <div className="p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-900 dark:text-rose-200">
                                    <span className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300 mb-0.5">
                                      <AlertCircle className="w-3.5 h-3.5" /> Düştüğün Mantık Hatası / Çeldirici:
                                    </span>
                                    <p className="leading-relaxed">{aiResult.studentMistakeAnalysis}</p>
                                  </div>
                                )}

                                {/* Pedagojik İpucu */}
                                {aiResult.pedagogicalTip && (
                                  <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200">
                                    <span className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300 mb-0.5">
                                      <Lightbulb className="w-3.5 h-3.5" /> Bir Sonraki Benzer Soru İçin Altın Kural:
                                    </span>
                                    <p className="leading-relaxed">{aiResult.pedagogicalTip}</p>
                                  </div>
                                )}

                                {/* Adım Adım Yapay Zeka Çözümü */}
                                {aiResult.stepByStepSolution && (
                                  <div className="space-y-1 text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Yapay Zekânın Adım Adım Çözümü:
                                    </span>
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono text-[11px] bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                      {aiResult.stepByStepSolution}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           B. AKTİF ÇÖZÜM MODU (İŞARETLEME & OTOMATİK İLERLEME)
           ======================================================== */
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sol Panel: Soru Listesi / İlerleme */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase">Aktif Çalışma</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{activePlan.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{activePlan.description}</p>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Cevaplanan</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{answeredCount} / {questions.length}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / (questions.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Soru Izgarası */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                Soru İlerlemesi ({currentIdx + 1}/{questions.length})
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_, i) => {
                  const hasAnswered = Boolean(answers[i]);
                  const isCurrent = i === currentIdx;

                  let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300';
                  if (isCurrent) {
                    btnStyle = 'ring-2 ring-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200 font-black shadow-xs';
                  } else if (hasAnswered) {
                    btnStyle = 'bg-indigo-600 text-white font-bold';
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${btnStyle}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Erken Değerlendir Butonu */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleEvaluateResults}
                disabled={answeredCount === 0}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>Testi Bitir & Değerlendir</span>
              </button>
            </div>
          </div>

          {/* Sağ Panel: İnteraktif Soru Çözüm Ekranı */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            {/* Soru Üst Bilgisi */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  {currentIdx + 1}. Soru
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Zorluk: {currentQ?.difficulty || 3}/5
                </span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Soru {currentIdx + 1} / {questions.length}
              </span>
            </div>

            {/* Fotoğraflı veya SVG Çizimi Varsa */}
            {(currentQ?.image_url || currentQ?.imageUrl) && (
              <div className="my-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex justify-center overflow-x-auto">
                <img src={currentQ.image_url || currentQ.imageUrl} alt="Soru Görseli" className="max-h-96 rounded-xl object-contain shadow-xs" />
              </div>
            )}
            {currentQ?.svg_content && !(currentQ?.image_url || currentQ?.imageUrl) && (
              <div 
                className="my-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: currentQ.svg_content }} 
              />
            )}

            {/* Soru Metni */}
            <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-line leading-relaxed">
              {currentQ?.question_text}
            </p>

            {/* Şıklar */}
            {currentQ?.options && (
              <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                {Object.entries(currentQ.options).map(([opt, val]) => {
                  const isSelected = currentSelectedOption === opt;
                  let optStyle = 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200';

                  if (isSelected) {
                    optStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200 font-bold ring-2 ring-indigo-500 shadow-sm';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition ${optStyle}`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {opt}
                      </span>
                      <span className="font-semibold">{String(val)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Canlı Yapay Zekâ Doğrulama & İpucu Kutusu */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!currentSelectedOption || Boolean(aiLoadingMap[currentQ?.id || currentIdx])}
                  onClick={async () => {
                    const res = await handleRequestAiAnalysis(currentQ, currentIdx, currentSelectedOption);
                    setActiveInlineAiFeedback(res);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
                  title="İşaretlediğin şıkkı Gemini veya ChatGPT ile doğrula ve ipucu al"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>
                    {Boolean(aiLoadingMap[currentQ?.id || currentIdx]) 
                      ? '🤖 Yapay Zekâ İnceliyor...' 
                      : '🤖 Seçtiğim Cevabı Yapay Zekâya Doğrulat & İpucu Al'}
                  </span>
                </button>

                {activeInlineAiFeedback && (
                  <button
                    type="button"
                    onClick={() => setActiveInlineAiFeedback(null)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Kapat ✕
                  </button>
                )}
              </div>

              {/* Anlık Yapay Zekâ Geri Bildirimi */}
              {activeInlineAiFeedback && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800/60 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      {activeInlineAiFeedback.providerUsed === 'gemini' 
                        ? 'Google Gemini 2.5 Flash ile Doğrulandı' 
                        : activeInlineAiFeedback.providerUsed === 'openai' 
                        ? 'OpenAI ChatGPT ile Doğrulandı' 
                        : 'MEB LGS Çözüm Motoru'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      activeInlineAiFeedback.isStudentCorrect 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {activeInlineAiFeedback.isStudentCorrect ? '✅ Doğru Seçim' : '⚠️ Dikkat: Olası Çeldirici'}
                    </span>
                  </div>

                  {activeInlineAiFeedback.studentMistakeAnalysis && !activeInlineAiFeedback.isStudentCorrect && (
                    <p className="text-rose-900 dark:text-rose-200 font-medium">
                      <strong>İpucu / Çeldirici Analizi:</strong> {activeInlineAiFeedback.studentMistakeAnalysis}
                    </p>
                  )}

                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Koçluk Tavsiyesi:</strong> {activeInlineAiFeedback.pedagogicalTip}
                  </p>
                </div>
              )}
            </div>

            {/* Alt İlerleme & Aksiyon Çubuğu */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {currentSelectedOption ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 stroke-[3]" /> Bu soru için &quot;{currentSelectedOption}&quot; seçildi.
                  </span>
                ) : (
                  <span>Bir seçeneğe tıklayınca otomatik sonrakine geçer.</span>
                )}
              </div>

              {/* Gezinme ve Değerlendir Butonları */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  disabled={currentIdx === 0}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Önceki
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
                  >
                    Sonraki <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}

                {/* Son Soruda veya Tüm Sorular Bittiğinde "Sonuçlarımı Değerlendir" */}
                {(currentIdx === questions.length - 1 || answeredCount === questions.length) && (
                  <button
                    type="button"
                    onClick={handleEvaluateResults}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>🏁 Sonuçlarımı Değerlendir ({answeredCount}/{questions.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yapay Zekâ (Gemini / ChatGPT) Bağlantı & Yapılandırma Modalı */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Yapay Zekâ Denetleyici (ChatGPT & Gemini)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Soru çözümlerini ve cevap kontrolünü harici yapay zekâ modellerine bağlayın
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model Tercihi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Kullanılacak Yapay Zekâ Motoru:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAiProvider('auto')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                    aiProvider === 'auto'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 ring-2 ring-purple-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Otomatik</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500">Gemini / ChatGPT Akıllı Tercih</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('gemini')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                    aiProvider === 'gemini'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Google Gemini</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500">Gemini 2.5 Flash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiProvider('openai')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                    aiProvider === 'openai'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                    <span>OpenAI ChatGPT</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500">GPT-4o Mini</span>
                </button>
              </div>
            </div>

            {/* Özel API Anahtarı Alanı (Opsiyonel) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Özel API Anahtarı (Opsiyonel):</span>
                <span className="text-[10px] font-normal text-slate-400">Sunucu anahtarı yoksa geçerlidir</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy... veya sk-..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💡 Sunucu ortamında (<code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> / <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">OPENAI_API_KEY</code>) tanımlı anahtar varsa otomatik kullanılır. Anahtar girilmediğinde sistemin yerel MEB LGS Matematik Motoru devrede kalır.
              </p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => saveAiSettings(aiProvider, customApiKey)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Ayarları Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Send, 
  Award, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Bot,
  Cpu,
  Lightbulb,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';
import { generateCurriculumQuestion } from '@/lib/ai/questionGenerator';
import { downloadExamBookletAsPdf } from '@/lib/pdf/examBookletPdf';

interface QuestionItem {
  id: string;
  questionNo: number;
  topicName: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  solutionExplanation?: string;
  svgContent?: string;
  imageUrl?: string;
  difficulty: number;
}

export default function StudentDenemeRoomPage({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const routeParams = useParams();
  let resolvedId = '';
  try {
    if (params) {
      const resolved = use(params);
      resolvedId = resolved?.id || '';
    }
  } catch {}
  if (!resolvedId && routeParams?.id) {
    resolvedId = routeParams.id as string;
  }
  const examId = resolvedId || 'exam_lgs_sample_2';

  const [examTitle, setExamTitle] = useState('2026 LGS Matematik Deneme Sınavı');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeftSec, setTimeLeftSec] = useState(40 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoadingMap, setAiLoadingMap] = useState<Record<number, boolean>>({});
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<number, any>>({});

  const handleDownloadPdf = async () => {
    if (questions.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const studentName = typeof window !== 'undefined' ? (localStorage.getItem('student_name') || 'Muhammed Talha') : 'Öğrenci';
      await downloadExamBookletAsPdf({
        examTitle,
        durationMin: 40,
        questions: questions.map(q => ({
          questionNo: q.questionNo,
          topicName: q.topicName,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          imageUrl: q.imageUrl,
          svgContent: q.svgContent,
          solutionExplanation: q.solutionExplanation
        })),
        includeOptic: true,
        includeAnswerKey: true,
        studentName
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleRequestAiAnalysisForDeneme = async (q: QuestionItem) => {
    setAiLoadingMap(prev => ({ ...prev, [q.questionNo]: true }));
    try {
      const studentAns = answers[q.questionNo] || null;
      const res = await fetch('/api/ai/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.questionText,
          options: q.options,
          studentAnswer: studentAns,
          correctAnswer: q.correctAnswer,
          topicName: q.topicName,
          provider: 'auto'
        })
      });
      const data = await res.json();
      setAiAnalysisMap(prev => ({ ...prev, [q.questionNo]: data }));
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingMap(prev => ({ ...prev, [q.questionNo]: false }));
    }
  };

  // 1. Sınav ve Soruları Yükle
  useEffect(() => {
    async function loadExam() {
      try {
        setLoading(true);

        // A. Eğer plan_ ile başlıyorsa çalışma planı oturumundan çek
        if (examId.startsWith('plan_')) {
          const res = await fetch(`/api/lgs/study-sessions/${examId}`);
          const data = await res.json();
          if (data.success && data.questions && data.questions.length > 0) {
            setExamTitle(data.plan?.title || 'LGS Kişiselleştirilmiş Hedef Denemesi');
            const mapped: QuestionItem[] = data.questions.map((q: any, idx: number) => ({
              id: q.id || `q_${idx + 1}`,
              questionNo: idx + 1,
              topicName: q.topic_name || 'LGS Matematik',
              questionText: (q.question_text || '').replace(/^\d+\.\s*Soru\s*\[[^\]]+\]:\s*/gi, '').replace(/^\[[^\]]+\]:\s*/gi, '').trim(),
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
              correctAnswer: q.correct_answer || 'A',
              solutionExplanation: q.solution_explanation,
              svgContent: q.svg_content,
              imageUrl: q.image_url || q.imageUrl,
              difficulty: q.difficulty || 3
            }));
            setQuestions(mapped);
            setLoading(false);
            return;
          }
        }

        // B. PDF Dokümanlarında Var mı Kontrol Et
        try {
          const docRes = await fetch('/api/pdf-documents');
          const docData = await docRes.json();
          const doc = (docData.docs || []).find((d: any) => d.id === examId);
          if (doc) {
            setExamTitle(doc.title);
          }
        } catch {}

        // C. Standart LGS Örnek Denemesi Başlığı
        let title = 'LGS Matematik Deneme Sınavı (20 Soru)';
        if (examId === 'exam_lgs_sample_1') {
          title = '2026 LGS Matematik Türkiye Geneli Prova 1';
        } else if (examId === 'exam_lgs_sample_2') {
          title = 'LGS Sayısal Matematik Konu Tarama Denemesi';
        } else if (examId === 'exam_lgs_2026_genel_1') {
          title = '2026 LGS 1. Dönem Matematik Genel Prova';
        } else if (examId === 'exam_lgs_sayilar_cebir') {
          title = 'LGS Çarpanlar & Üslü Sayılar Hedef Tarama';
        } else if (examId === 'exam_lgs_geometri_ucgen') {
          title = 'LGS Üçgenler ve Pisagor Geometrik Odak Denemesi';
        }
        setExamTitle(title);

        // 20 Gerçek LGS Sorusu Oluştur (Müfredat motorundan)
        const generatedList: QuestionItem[] = [];
        const count = 20;
        for (let i = 0; i < count; i++) {
          const topic = INITIAL_LGS_TOPICS[i % INITIAL_LGS_TOPICS.length];
          const diff = i < 5 ? 2 : i < 15 ? 3 : 4;
          const gen = generateCurriculumQuestion({
            topicId: topic.id,
            difficulty: diff,
            questionType: 'yeni_nesil',
            visualRequired: i % 2 === 1,
            variationIndex: i
          });

          generatedList.push({
            id: `gen_q_${i + 1}`,
            questionNo: i + 1,
            topicName: topic.name,
            questionText: gen.questionText,
            options: gen.options,
            correctAnswer: gen.correctAnswer,
            solutionExplanation: gen.solutionExplanation,
            svgContent: gen.svgContent,
            difficulty: diff
          });
        }
        setQuestions(generatedList);
      } catch (err) {
        console.error('Error loading exam:', err);
      } finally {
        setLoading(false);
      }
    }

    loadExam();
  }, [examId]);

  // Süre Sayacı
  useEffect(() => {
    if (isSubmitted || timeLeftSec <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSec(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeftSec]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectOption = (qNo: number, opt: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [qNo]: opt
    }));

    // Şıkkı işaretleyince otomatik bir sonraki soruya geç
    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 280);
    }
  };

  const handleSubmitExam = async () => {
    setIsSubmitted(true);
    let correct = 0;
    let wrong = 0;
    let blank = 0;

    questions.forEach(q => {
      const studentAns = answers[q.questionNo];
      if (!studentAns) {
        blank++;
      } else if (studentAns === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const net = Math.max(0, +(correct - wrong / 3).toFixed(2));
    const resultObj = {
      total: questions.length,
      correct,
      wrong,
      blank,
      net
    };
    setExamResult(resultObj);

    // Öğretmen ve veli sistemine anında senkronize et
    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      let studentId = searchParams?.get('studentId') || (typeof window !== 'undefined' ? localStorage.getItem('student_id') : null);
      if (!studentId && typeof window !== 'undefined') {
        const cookieMatch = document.cookie.match(/(?:student_id|studentId)=([^;]+)/);
        if (cookieMatch) studentId = cookieMatch[1];
      }
      if (!studentId) {
        studentId = 'student_muhammed_talha';
      }

      const payloadAnswers = questions.map(q => ({
        questionNo: q.questionNo,
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        studentAnswer: answers[q.questionNo] || null,
        correctAnswer: q.correctAnswer,
        isCorrect: answers[q.questionNo] === q.correctAnswer,
        topicName: q.topicName,
        solutionExplanation: q.solutionExplanation,
        difficulty: q.difficulty
      }));

      await fetch('/api/exam-results/submit-student-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          studentId,
          examTitle,
          durationSeconds: Math.max(10, (40 * 60) - timeLeftSec),
          answers: payloadAnswers
        })
      });

      // Tarayıcı hafızasına da anında kaydet
      if (typeof window !== 'undefined') {
        try {
          const completedList = JSON.parse(localStorage.getItem('student_completed_exams') || '[]');
          const studentDisplayName = localStorage.getItem('student_name') || (studentId.includes('talha') ? 'Muhammed Talha' : 'Öğrenci');
          const newExamRecord = {
            examId,
            studentId,
            studentName: studentDisplayName,
            title: examTitle,
            correctCount: correct,
            wrongCount: wrong,
            blankCount: blank,
            netScore: net,
            completedAt: new Date().toISOString(),
            durationSeconds: Math.max(10, (40 * 60) - timeLeftSec)
          };
          const updated = [newExamRecord, ...completedList.filter((e: any) => e.examId !== examId)].slice(0, 30);
          localStorage.setItem('student_completed_exams', JSON.stringify(updated));
        } catch {}
      }
    } catch (err) {
      console.warn('Could not persist student exam submission:', err);
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 space-y-5">
      {/* 1. Üst Kontrol & Başlık Çubuğu */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ogrenci/denemeler"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                LGS Deneme Sınavı
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {questions.length} Soru · 40 Dakika
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {examTitle}
            </h1>
          </div>
        </div>

        {/* Canlı Sayaç, PDF İndir & Sınavı Bitir */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isDownloadingPdf || questions.length === 0}
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Sınav kitapçığını ve optik formu PDF olarak bilgisayarınıza indirin"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isDownloadingPdf ? 'PDF İndiriliyor...' : '📄 PDF İndir'}</span>
          </button>

          {!isSubmitted ? (
            <>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-sm shadow-xs">
                <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>{formatTime(timeLeftSec)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sınavı Bitir</span>
              </button>
            </>
          ) : (
            <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Sınav Tamamlandı
            </span>
          )}
        </div>
      </div>

      {/* Sınav Tamamlandığında Sonuç Kartı */}
      {isSubmitted && examResult && (
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold text-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Deneme Sınavınız Tamamlandı!</h2>
              <p className="text-xs text-white/80 mt-0.5">
                Cevaplarınız puanlandı. Sonuçlarınız gelişim karnenize kaydedildi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold bg-white text-slate-900 px-5 py-3 rounded-2xl shadow-sm">
            <span className="text-emerald-600">{examResult.correct} Doğru</span>
            <span className="text-rose-600">{examResult.wrong} Yanlış</span>
            <span className="text-slate-500">{examResult.blank} Boş</span>
            <span className="text-indigo-600 text-base font-black border-l pl-3 border-slate-200">
              {examResult.net} Net
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-bold">LGS Deneme Soruları Yükleniyor...</p>
        </div>
      ) : (
        /* Ana Çift Kolon: Sol = Soru Kitapçığı, Sağ = Optik Form */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* SOL PANEL: Soru Kitapçığı & İnteraktif Soru Görüntüleyici (8 Kolon) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            {/* Soru Üst Bilgisi */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentQ?.questionNo}
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {currentQ?.topicName}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Zorluk: {currentQ?.difficulty}/5
                </span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Soru {currentIdx + 1} / {questions.length}
              </span>
            </div>

            {/* Fotoğraflı Soru Görseli veya Vektörel Şekil */}
            {currentQ?.imageUrl && (
              <div className="my-3 flex justify-center overflow-x-auto p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <img src={currentQ.imageUrl} alt="Soru Görseli" className="max-h-96 rounded-xl object-contain shadow-xs" />
              </div>
            )}
            {currentQ?.svgContent && !currentQ?.imageUrl && (
              <div 
                className="my-3 flex justify-center overflow-x-auto p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: currentQ.svgContent }}
              />
            )}

            {/* Soru Metni */}
            <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {currentQ?.questionText}
            </p>

            {/* Şıklar */}
            {currentQ?.options && (
              <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                {Object.entries(currentQ.options).map(([opt, val]) => {
                  const isSelected = answers[currentQ.questionNo] === opt;
                  let optStyle = 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200';

                  if (isSubmitted) {
                    if (opt === currentQ.correctAnswer) {
                      optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold';
                    } else if (isSelected && opt !== currentQ.correctAnswer) {
                      optStyle = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200 font-bold shadow-xs';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(currentQ.questionNo, opt)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm text-left transition ${optStyle}`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
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

            {/* Sınav Tamamlandıysa: Çözüm ve Yapay Zekâ Denetleme Alanı */}
            {isSubmitted && currentQ && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {currentQ.solutionExplanation && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-xs space-y-1">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Çözüm Açıklaması:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {currentQ.solutionExplanation}
                    </p>
                  </div>
                )}

                {(() => {
                  const isAiLoading = Boolean(aiLoadingMap[currentQ.questionNo]);
                  const aiResult = aiAnalysisMap[currentQ.questionNo];

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isAiLoading}
                          onClick={() => handleRequestAiAnalysisForDeneme(currentQ)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
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
                              ? 'OpenAI ChatGPT ile Doğrulandı' 
                              : 'MEB LGS Çözüm Motoru'}
                          </span>
                        )}
                      </div>

                      {aiResult && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/25 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              Yapay Zekâ Koçluk & Analiz
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              Güven: %{Math.round((aiResult.confidenceScore || 0.95) * 100)}
                            </span>
                          </div>

                          {aiResult.studentMistakeAnalysis && (
                            <div className="p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-900 dark:text-rose-200">
                              <span className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-300 mb-0.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Düştüğün Mantık Hatası / Çeldirici:
                              </span>
                              <p className="leading-relaxed">{aiResult.studentMistakeAnalysis}</p>
                            </div>
                          )}

                          {aiResult.pedagogicalTip && (
                            <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200">
                              <span className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300 mb-0.5">
                                <Lightbulb className="w-3.5 h-3.5" /> İpucu & Altın Kural:
                              </span>
                              <p className="leading-relaxed">{aiResult.pedagogicalTip}</p>
                            </div>
                          )}

                          {aiResult.stepByStepSolution && (
                            <div className="space-y-1 text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Adım Adım Yapay Zekâ Çözümü:
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
            )}

            {/* Soru Gezinme Butonları */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={currentIdx <= 0}
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Önceki Soru
              </button>

              <button
                type="button"
                disabled={currentIdx >= questions.length - 1}
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-40"
              >
                Sonraki Soru
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SAĞ PANEL: Optik Cevap Formu (4 Kolon) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Optik Cevap Formu</h3>
                <p className="text-[11px] text-slate-400">Şıkka tıklayarak işaretleyin</p>
              </div>
              <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl">
                {Object.keys(answers).length} / {questions.length}
              </span>
            </div>

            {/* 1'den 20'ye Soru Baloncukları */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {questions.map((q) => {
                const currentAns = answers[q.questionNo];
                const isActive = q.questionNo === currentIdx + 1;
                return (
                  <div
                    key={q.questionNo}
                    onClick={() => setCurrentIdx(q.questionNo - 1)}
                    className={`p-2 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/40'
                        : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 w-12">
                      Soru {q.questionNo}
                    </span>

                    {/* A, B, C, D Seçenekleri */}
                    <div className="flex items-center gap-1.5">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const isSelected = currentAns === opt;
                        let bubbleStyle = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100';

                        if (isSubmitted) {
                          if (opt === q.correctAnswer) {
                            bubbleStyle = 'bg-emerald-600 border-emerald-600 text-white font-black';
                          } else if (isSelected && opt !== q.correctAnswer) {
                            bubbleStyle = 'bg-rose-500 border-rose-500 text-white font-black';
                          }
                        } else if (isSelected) {
                          bubbleStyle = 'bg-indigo-600 border-indigo-600 text-white font-black shadow-xs';
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isSubmitted}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOption(q.questionNo, opt);
                            }}
                            className={`w-7 h-7 rounded-full text-xs font-bold border transition flex items-center justify-center ${bubbleStyle}`}
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
          </div>
        </div>
      )}
    </div>
  );
}

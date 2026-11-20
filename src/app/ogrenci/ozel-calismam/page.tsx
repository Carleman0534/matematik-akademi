'use client';

import React, { useState, useEffect } from 'react';
import { 
  Target, CheckCircle2, XCircle, Clock, Sparkles, ArrowRight, 
  ChevronRight, Award, Zap, HelpCircle, Eye 
} from 'lucide-react';

export default function OzelCalismamPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadPlanSession = async (planId: string) => {
    try {
      const res = await fetch(`/api/lgs/study-sessions/${planId}`);
      const data = await res.json();
      if (data.success) {
        setActivePlan(data.plan);
        setQuestions(data.questions);
        setCurrentIdx(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setAnswerResult(null);
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

        const res = await fetch('/api/lgs/study-plans');
        const data = await res.json();
        if (data.success && data.plans.length > 0) {
          setPlans(data.plans);
          // URL'den planId verilmemişse ilk planı aktif yap
          if (!planIdFromUrl) {
            loadPlanSession(data.plans[0].id);
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

  const handleSelectOption = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
  };

  const handleCheckAnswer = async () => {
    if (!selectedOption || !activePlan) return;
    const currentQ = questions[currentIdx];

    try {
      const res = await fetch(`/api/lgs/study-sessions/${activePlan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          studentId: (typeof window !== 'undefined' ? localStorage.getItem('student_id') : null) || 'student_ali_metin',
          studentAnswer: selectedOption,
          durationSeconds: 45,
          streak
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAnswered(true);
        setAnswerResult(data);
        setStreak(data.streak || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setAnswerResult(null);
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="space-y-6">
      {/* Başlık Kartı */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Target className="h-4 w-4" /> Bireysel Öğrenme Odası
          </div>
          <h1 className="text-2xl font-black">Bana Özel Matematik Çalışmam</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Öğretmeninin senin eksiklerine özel hazırladığı LGS çalışma testleri. Her sorudan sonra ayrıntılı çözümü görerek eksiklerini anında kapat.
          </p>
        </div>
        {streak > 1 && (
          <div className="rounded-xl bg-amber-400/20 px-3.5 py-2 border border-amber-300/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 self-start">
            <Zap className="h-4 w-4 text-amber-300" /> {streak} Soru Üst Üste Doğru!
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Çalışma testin yükleniyor...</div>
      ) : !activePlan || questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Target className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Şu an aktif bir çalışma setin bulunmuyor</h3>
          <p className="text-xs text-slate-500 mt-1">Öğretmenin sana yeni bir konu çalışması atadığında burada görüntülenecektir.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sol Panel: Soru Listesi / İlerleme */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase">Aktif Çalışma</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{activePlan.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{activePlan.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Soru İlerlemesi ({currentIdx + 1}/{questions.length})</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIdx(i);
                      setSelectedOption(null);
                      setIsAnswered(false);
                      setAnswerResult(null);
                    }}
                    className={`h-8 rounded-lg text-xs font-bold transition ${
                      i === currentIdx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ Panel: İnteraktif Soru Çözüm Ekranı */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            {/* Soru Üst Bilgisi */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {currentIdx + 1}. Soru
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Zorluk: {currentQ?.difficulty || 3}/5
                </span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">LGS Matematik Formatı</span>
            </div>

            {/* SVG Çizimi Varsa */}
            {currentQ?.svg_content && (
              <div 
                className="overflow-hidden" 
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
                  const isSelected = selectedOption === opt;
                  let optStyle = 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200';

                  if (isAnswered) {
                    if (opt === answerResult?.correctAnswer) {
                      optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold';
                    } else if (isSelected && !answerResult?.isCorrect) {
                      optStyle = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-indigo-600 bg-indigo-50/50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-200 font-bold';
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm text-left transition ${optStyle}`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-xs shrink-0">
                        {opt}
                      </span>
                      <span className="font-semibold">{String(val)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Kontrol Et & Sonraki Soru Butonları */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-400">
                {isAnswered ? (
                  answerResult?.isCorrect ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Tebrikler! Doğru cevap.
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Yanlış cevap. Doğru şık: {answerResult?.correctAnswer}
                    </span>
                  )
                ) : (
                  <span>Lütfen bir şık seçip cevabınızı kontrol edin.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isAnswered ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={!selectedOption}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Cevabı Kontrol Et
                  </button>
                ) : (
                  currentIdx < questions.length - 1 ? (
                    <button
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-700"
                    >
                      Sonraki Soru <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
                      Çalışmayı Tamamladın! 🎉
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Adım Adım Çözüm Gösterimi */}
            {isAnswered && answerResult?.solutionExplanation && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20 space-y-1.5">
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Ayrıntılı Matematiksel Çözüm:
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {answerResult.solutionExplanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

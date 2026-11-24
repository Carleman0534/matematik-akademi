'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, Lightbulb, CheckCircle2, XCircle, ArrowRight, 
  Repeat, BookOpen, Sparkles, ChevronRight, Calculator 
} from 'lucide-react';

export default function SoruCozPage() {
  const [currentQuestion, setCurrentQuestion] = useState({
    id: 'sample-q1',
    topicId: 'top_carpanlar_katlar',
    topicName: 'Çarpanlar ve Katlar',
    text: 'Kenar uzunlukları 72 metre ve 96 metre olan dikdörtgen şeklindeki bir tarlanın etrafına köşelerine de birer fidan dikilmek şartıyla eşit aralıklarla fidan dikilecektir. Bu iş için en az kaç fidan gereklidir?',
    options: { A: '12', B: '14', C: '16', D: '18' },
    correctAnswer: 'B',
    explanation: 'Eşit ve en büyük aralıklarla dikileceği için EBOB(72, 96) hesaplanır. 72 ve 96 sayılarının en büyük ortak böleni EBOB(72, 96) = 24 metredir. Dikdörtgenin çevresi = 2 · (72 + 96) = 2 · 168 = 336 metredir. Gerekli fidan sayısı = Çevre / EBOB = 336 / 24 = 14 adet fidandır.'
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [firstStep, setFirstStep] = useState<string | null>(null);
  const [fullSolution, setFullSolution] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleCheck = async () => {
    if (!selectedOption) return;
    setIsAnswered(true);

    try {
      const studentId = (typeof window !== 'undefined' ? localStorage.getItem('student_id') : null) || '';
      const isCorrect = selectedOption === currentQuestion.correctAnswer;
      await fetch('/api/student/interactive-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attempt',
          studentId,
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          studentAnswer: selectedOption,
          correctAnswer: currentQuestion.correctAnswer,
          isCorrect,
          topicId: currentQuestion.topicId,
          topicName: currentQuestion.topicName,
          solutionExplanation: currentQuestion.explanation
        })
      });
    } catch {}
  };

  const handleAction = async (action: 'get_hint' | 'first_step' | 'full_solution' | 'similar_question' | 'add_to_review') => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/student/interactive-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          solutionExplanation: currentQuestion.explanation,
          action,
          topicId: currentQuestion.topicId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (action === 'get_hint') setHint(data.hint);
        if (action === 'first_step') setFirstStep(data.step);
        if (action === 'full_solution') setFullSolution(data.solution);
        if (action === 'add_to_review') {
          setToast(data.message || 'Soru aralıklı tekrar kuyruğunuza eklendi!');
          setTimeout(() => setToast(null), 3500);
        }
        if (action === 'similar_question' && data.similarQuestion) {
          setCurrentQuestion({
            id: data.similarQuestion.id,
            topicId: currentQuestion.topicId,
            topicName: currentQuestion.topicName,
            text: data.similarQuestion.text,
            options: data.similarQuestion.options,
            correctAnswer: data.similarQuestion.correctAnswer,
            explanation: data.similarQuestion.explanation
          });
          setSelectedOption(null);
          setIsAnswered(false);
          setHint(null);
          setFirstStep(null);
          setFullSolution(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            {currentQuestion.topicName}
          </span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-600" />
            Etkileşimli Soru Çözümü & İpucu Asistanı
          </h1>
        </div>

        <button
          onClick={() => handleAction('add_to_review')}
          disabled={loadingAction}
          className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1 text-slate-700 dark:text-slate-300"
        >
          <Repeat className="w-3.5 h-3.5 text-indigo-600" />
          Tekrar Listeme Ekle
        </button>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Soru Kartı */}
      <div className="card space-y-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border text-slate-800 dark:text-slate-100 text-sm font-medium leading-relaxed">
          {currentQuestion.text}
        </div>

        {/* Seçenekler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(currentQuestion.options).map(([key, val]) => {
            const isSelected = selectedOption === key;
            const isCorrect = isAnswered && key === currentQuestion.correctAnswer;
            const isWrong = isAnswered && isSelected && key !== currentQuestion.correctAnswer;

            return (
              <button
                key={key}
                disabled={isAnswered}
                onClick={() => setSelectedOption(key)}
                className={`p-3.5 rounded-xl border font-bold text-sm text-left transition-all flex items-center justify-between ${
                  isCorrect
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : isWrong
                    ? 'bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                    : isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-center">
                    {key}
                  </span>
                  <span>{val}</span>
                </div>
                {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isWrong && <XCircle className="w-4 h-4 text-rose-600" />}
              </button>
            );
          })}
        </div>

        {/* Cevabı Kontrol Et Butonu */}
        {!isAnswered && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCheck}
              disabled={!selectedOption}
              className="btn-primary text-xs px-6 py-2.5"
            >
              Cevabımı Kontrol Et ➔
            </button>
          </div>
        )}

        {/* Çözüm Sonucu Geri Bildirimi */}
        {isAnswered && (
          <div className={`p-4 rounded-xl border text-xs font-semibold ${
            selectedOption === currentQuestion.correctAnswer
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
          }`}>
            {selectedOption === currentQuestion.correctAnswer ? (
              <p className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Tebrikler! Doğru cevap. Soru mantığını ve işlem adımlarını başarıyla yürüttün.
              </p>
            ) : (
              <p className="flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4 text-rose-600" />
                Cevabın hatalı. Aşağıdaki "İlk Çözüm Adımı" veya "Detaylı Çözüm" butonlarına tıklayarak çözüm basamaklarını inceleyebilirsin.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Öğretici Geri Bildirim Butonları (Section 13) */}
      <div className="card space-y-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          💡 Öğrenme & Destek Araçları:
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleAction('get_hint')}
            disabled={loadingAction}
            className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            İpucu Göster
          </button>
          <button
            onClick={() => handleAction('first_step')}
            disabled={loadingAction}
            className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
            İlk Çözüm Adımını Göster
          </button>
          <button
            onClick={() => handleAction('full_solution')}
            disabled={loadingAction}
            className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            Detaylı Çözümü Göster
          </button>
          <button
            onClick={() => handleAction('similar_question')}
            disabled={loadingAction}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Benzer Soru Çöz
          </button>
        </div>

        {/* Dinamik Açılan Alanlar */}
        {hint && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-900 dark:text-amber-200">
            <strong>İpucu:</strong> {hint}
          </div>
        )}

        {firstStep && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 text-xs text-blue-900 dark:text-blue-200">
            <strong>İlk Adım:</strong> {firstStep}
          </div>
        )}

        {fullSolution && (
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <strong className="block mb-1 text-indigo-600 font-bold">Tam Çözüm Açıklaması:</strong>
            {fullSolution}
          </div>
        )}
      </div>
    </div>
  );
}

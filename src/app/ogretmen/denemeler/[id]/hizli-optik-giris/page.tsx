'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Keyboard,
  CheckCircle2,
  Send,
  ArrowLeft,
  Printer,
  Sparkles,
  Award,
  Users
} from 'lucide-react';

export default function HizliOptikGirisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: examId } = use(params);

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/students');
        if (res.ok) {
          const data = await res.json();
          if (data.students) {
            setStudents(data.students);
            if (data.students.length > 0) setSelectedStudentId(data.students[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadStudents();
  }, []);

  // Klavye Dinleyicisi: A, B, C, D, E veya Boşluk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        e.preventDefault();
        setAnswers((prev) => ({ ...prev, [currentQuestion]: key }));
        if (currentQuestion < 40) setCurrentQuestion((q) => q + 1);
      } else if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentQuestion < 40) setCurrentQuestion((q) => q + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        if (currentQuestion > 1) setCurrentQuestion((q) => q - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion]);

  const handleSaveOptical = async () => {
    setIsSubmitting(true);
    setSuccessResult(null);

    try {
      const res = await fetch(`/api/exams/${examId}/quick-optical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          answers,
          durationMin: 60,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessResult(data.result);
      } else {
        alert(data.error || 'Kaydedilemedi');
      }
    } catch {
      alert('Ağ hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const questions = Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/ogretmen/denemeler" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Basılı Optik Form Hızlı Giriş Ekranı</h1>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              30 Saniyede Puanlama
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencinin kâğıt üzerinde çözdüğü basılı deneme cevaplarını klavyeden (A, B, C, D, E) basarak saniyeler içinde kaydedin.
          </p>
        </div>

        <Link
          href={`/ogretmen/denemeler/${examId}/optik-yazdir`}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition"
        >
          <Printer className="w-4 h-4" />
          <span>Boş Optik Form Yazdır</span>
        </Link>
      </div>

      {/* Klavye Kısayolu Yönergesi */}
      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-600" />
          <span>
            <strong>Klavyeden Hızlı Kodlama:</strong> Klavyenizdeki <strong>A, B, C, D, E</strong> tuşlarına basarak cevapları girin. Sistem otomatik sonraki soruya geçer. Boş bırakmak için <strong>Boşluk (Space)</strong> tuşuna basın.
          </span>
        </div>
        <span className="font-bold font-mono text-xs">Aktif Soru: {currentQuestion}</span>
      </div>

      {/* Başarı Sonuç Kartı */}
      {successResult && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="font-bold text-sm">Öğrencinin Optik Formu Başarıyla Puanlandı!</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">Sonuçlar deneme analizlerine eklendi.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-emerald-200">
            <span className="text-emerald-600">{successResult.correctCount} Doğru</span>
            <span className="text-rose-600">{successResult.wrongCount} Yanlış</span>
            <span className="text-slate-400">{successResult.blankCount} Boş</span>
            <span className="text-indigo-600 font-black text-sm">{successResult.netScore} Net</span>
          </div>
        </div>
      )}

      {/* Ana Form Alanı */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* Öğrenci Seçimi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Optik Formu Girilen Öğrenci:</span>
          </div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold w-full sm:w-72"
          >
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name} ({st.grade_level || 12}. Sınıf)
              </option>
            ))}
          </select>
        </div>

        {/* 40 Soru Optik Izgarası (Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {questions.map((q) => {
            const isCurrent = currentQuestion === q;
            const currentAns = answers[q];
            return (
              <div
                key={q}
                onClick={() => setCurrentQuestion(q)}
                className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : currentAns
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500">Soru {q}</span>
                <div className="flex items-center gap-1">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswers((prev) => ({ ...prev, [q]: opt }));
                        if (q < 40) setCurrentQuestion(q + 1);
                      }}
                      className={`w-5 h-5 rounded-full text-[10px] font-bold transition flex items-center justify-center ${
                        currentAns === opt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Kaydet & Puanla */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Doldurulan: <strong>{answeredCount}</strong> / 40 Soru
          </span>

          <button
            disabled={isSubmitting || answeredCount === 0}
            onClick={handleSaveOptical}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Puanlanıyor...' : 'Optik Formu Kaydet ve Puanla'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

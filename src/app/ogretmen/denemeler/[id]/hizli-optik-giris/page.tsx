'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Keyboard,
  CheckCircle2,
  Send,
  ArrowLeft,
  Printer,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface SheetInfo {
  title: string;
  questionCount: number;
  letters: string[];
  hasKey: boolean;
}

export default function HizliOptikGirisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);

  const [sheet, setSheet] = useState<SheetInfo | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [durationMin, setDurationMin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [needOverwrite, setNeedOverwrite] = useState<any | null>(null);

  const questionCount = sheet?.questionCount || 0;
  const letters = sheet?.letters?.length ? sheet.letters : ['A', 'B', 'C', 'D'];

  useEffect(() => {
    async function load() {
      try {
        const [sheetRes, stRes] = await Promise.all([
          fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/answer-sheet`).then(r => r.json()).catch(() => null),
          fetch('/api/students').then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (sheetRes?.success) {
          setSheet({ title: sheetRes.title, questionCount: sheetRes.questionCount, letters: sheetRes.letters, hasKey: sheetRes.hasKey });
        }
        const list = stRes?.students || [];
        setStudents(list);
        // Öğrenci profilinden gelindiyse (?studentId=...) o öğrenci seçili başlar
        const wanted = new URLSearchParams(window.location.search).get('studentId');
        setSelectedStudentId(list.find((s: any) => s.id === wanted)?.id || list[0]?.id || '');
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [examId]);

  // Klavye: A–D (şıklar) cevabı girer ve sonraki soruya geçer; Boşluk/→ boş bırakıp geçer; ←/Backspace geri gider.
  // Süre kutusu gibi alanlara yazarken kısayollar devre dışıdır.
  useEffect(() => {
    if (!questionCount) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      const key = e.key.toUpperCase();
      if (letters.includes(key)) {
        e.preventDefault();
        setAnswers((prev) => ({ ...prev, [currentQuestion]: key }));
        if (currentQuestion < questionCount) setCurrentQuestion((q) => q + 1);
      } else if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentQuestion < questionCount) setCurrentQuestion((q) => q + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        if (currentQuestion > 1) setCurrentQuestion((q) => q - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, questionCount, letters]);

  const save = async (overwrite: boolean) => {
    setIsSubmitting(true);
    setSuccessResult(null);
    setError('');
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(examId)}/quick-optical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          answers,
          durationMin: durationMin === '' ? 0 : Number(durationMin),
          overwrite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setNeedOverwrite(data.existing || {});
      } else if (res.ok) {
        setNeedOverwrite(null);
        setSuccessResult(data);
      } else {
        setError(data.error || `Kaydedilemedi (${res.status}).`);
      }
    } catch {
      setError('Ağ hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const questions = Array.from({ length: questionCount }, (_, i) => i + 1);
  const studentName = students.find((s) => s.id === selectedStudentId)?.full_name || '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/ogretmen/denemeler" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Öğrenci Adına Cevap Girişi</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {sheet?.title ? <strong>{sheet.title}</strong> : 'Deneme yükleniyor…'} — öğrencinin cevaplarını (kâğıttan ya da ekrandan) onun adına girin.
            Puanlama, öğrencinin kendi göndermesiyle aynı cevap anahtarı ve net formülüyle yapılır.
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

      {sheet && !sheet.hasKey && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Bu deneme için cevap anahtarı tanımlı değil; cevaplar puanlanamaz. Önce PDF Arşivi'nden cevap anahtarını ekleyin.</span>
        </div>
      )}

      {/* Klavye Kısayolu Yönergesi */}
      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-600" />
          <span>
            <strong>Klavyeden hızlı giriş:</strong> {letters.join(', ')} tuşlarına basın, sistem sonraki soruya geçer. Boş bırakmak için <strong>Boşluk</strong>, geri gitmek için <strong>←</strong>.
          </span>
        </div>
        <span className="font-bold font-mono text-xs">Aktif Soru: {currentQuestion}</span>
      </div>

      {/* Başarı Sonuç Kartı */}
      {successResult && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-emerald-900 dark:text-emerald-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <div className="font-bold text-sm">{studentName} için cevaplar kaydedildi ve puanlandı.</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300">Sonuç öğrencinin profiline ve deneme analizlerine eklendi.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-emerald-200">
              <span className="text-emerald-600">{successResult.result.correctCount} Doğru</span>
              <span className="text-rose-600">{successResult.result.wrongCount} Yanlış</span>
              <span className="text-slate-400">{successResult.result.blankCount} Boş</span>
              <span className="text-indigo-600 font-black text-sm">{successResult.result.netScore} Net</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            {(successResult.details || []).map((d: any) => (
              <span
                key={d.questionNo}
                className={`px-2 py-1 rounded-lg ${d.isCorrect === true ? 'bg-emerald-100 text-emerald-800' : d.isCorrect === false ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'}`}
                title={`Doğru cevap: ${d.correctAnswer}`}
              >
                {d.questionNo}: {d.studentAnswer || '—'}{d.isCorrect === false ? ` (doğru ${d.correctAnswer})` : ''}
              </span>
            ))}
          </div>
          <Link href={`/ogretmen/ogrenciler/${selectedStudentId}`} className="inline-block text-xs font-bold text-indigo-700 hover:underline">
            {studentName} profilini aç →
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-700">{error}</div>
      )}

      {needOverwrite && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-sm text-amber-900 space-y-2">
          <div className="font-semibold">
            {studentName} bu denemeyi zaten tamamlamış
            {needOverwrite.correctCount !== undefined && ` (${needOverwrite.correctCount} D, ${needOverwrite.wrongCount} Y, ${needOverwrite.blankCount} B, ${needOverwrite.netScore} net)`}.
            Yeni girdiğiniz cevaplar eski sonucun yerine geçecek.
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => save(true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">Üzerine yaz ve kaydet</button>
            <button type="button" onClick={() => setNeedOverwrite(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Vazgeç</button>
          </div>
        </div>
      )}

      {/* Ana Form Alanı */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* Öğrenci ve süre */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cevapları girilen öğrenci:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => { setSelectedStudentId(e.target.value); setNeedOverwrite(null); setSuccessResult(null); }}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold w-full sm:w-64"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.grade_level || 8}. Sınıf)
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            Çözüm süresi (dk):
            <input
              type="number"
              min="0"
              max="600"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="bilinmiyor"
              className="w-28 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
            />
          </label>
        </div>

        {/* Optik ızgara: gerçek soru sayısı kadar */}
        {questionCount === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Deneme bilgisi yükleniyor…</p>
        ) : (
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
                    {letters.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Aynı şıkka tekrar basmak cevabı kaldırır (boş bırakma)
                          setAnswers((prev) => {
                            const next = { ...prev };
                            if (next[q] === opt) delete next[q]; else next[q] = opt;
                            return next;
                          });
                          if (q < questionCount) setCurrentQuestion(q + 1);
                        }}
                        className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold transition flex items-center justify-center ${
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
        )}

        {/* Kaydet & Puanla */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            İşaretlenen: <strong>{answeredCount}</strong> / {questionCount} soru (işaretlenmeyenler boş sayılır)
          </span>

          <button
            disabled={isSubmitting || answeredCount === 0 || !selectedStudentId || (sheet ? !sheet.hasKey : true)}
            onClick={() => save(false)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Puanlanıyor…' : 'Kaydet ve Puanla'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

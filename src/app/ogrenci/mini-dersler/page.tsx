'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle, Video, FileText, ArrowRight, Sparkles, ChevronRight, Calculator } from 'lucide-react';

interface MiniLesson {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  summaryText: string;
  formulas: string[];
  solvedExamples: Array<{ question: string; solution: string }>;
  videoUrl?: string;
}

export default function MiniDerslerPage() {
  const [lessons, setLessons] = useState<MiniLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<MiniLesson | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/mini-lessons')
      .then(r => r.json())
      .then(res => {
        const l = res.lessons || [];
        setLessons(l);
        if (l.length > 0) setSelectedLesson(l[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const steps = [
    { label: 'Konu Anlatımı', icon: '📖' },
    { label: 'Formül & Kurallar', icon: '📐' },
    { label: 'Çözümlü Örnekler', icon: '💡' },
    { label: 'Seviye Alıştırmaları', icon: '✍️' },
    { label: 'Yeni Nesil Sorular', icon: '🎯' }
  ];

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
          <BookOpen className="h-4 w-4" /> Yalnızca Soru Değil, Kavramsal Öğrenme
        </div>
        <h1 className="text-2xl font-black">Matematik Konu Anlatımı & Mini Dersler</h1>
        <p className="text-sm text-blue-100 mt-1 max-w-2xl">
          Eksik hissettiğin konularda formülleri, kuralları ve çözümlü model soruları inceleyerek temelini sağlamlaştır.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Dersler yükleniyor...</div>
      ) : lessons.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">Henüz eklenmiş mini ders bulunmamaktadır.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sol: Konu Listesi */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Konu Başlıkları</span>
            {lessons.map((l) => (
              <button
                key={l.id}
                onClick={() => { setSelectedLesson(l); setActiveStep(0); }}
                className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                  selectedLesson?.id === l.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{l.title}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>

          {/* Sağ: Ders İçeriği ve Pedagojik Öğrenme Sıralaması */}
          {selectedLesson && (
            <div className="md:col-span-3 space-y-6">
              {/* Kademeli Öğrenme Sıralaması */}
              <div className="card p-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 border">
                {steps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeStep === idx
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Aktif Adım İçeriği */}
              {activeStep === 0 && (
                <div className="card space-y-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Adım 1: Kavramsal Özet</span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedLesson.title}</h2>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                    {selectedLesson.summaryText}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setActiveStep(1)} className="btn-primary text-xs flex items-center gap-1">
                      Sonraki: Formül & Kurallar ➔
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="card space-y-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Adım 2: Formül ve Matematiksel Bağıntılar</span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Önemli Kurallar & Formüller</h2>
                  
                  <div className="space-y-2">
                    {selectedLesson.formulas.map((f, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        <span className="font-mono bg-indigo-200 dark:bg-indigo-900 px-2 py-0.5 rounded text-xs">#{idx + 1}</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setActiveStep(0)} className="btn-outline text-xs">⬅ Konu Anlatımı</button>
                    <button onClick={() => setActiveStep(2)} className="btn-primary text-xs flex items-center gap-1">
                      Sonraki: Çözümlü Örnekler ➔
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="card space-y-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Adım 3: Çözümlü Model Sorular</span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Örnek Soru & Adım Adım Çözüm</h2>

                  {selectedLesson.solvedExamples.map((ex, idx) => (
                    <div key={idx} className="space-y-3 p-4 rounded-xl border bg-slate-50 dark:bg-slate-850">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {ex.question}
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        <strong className="block mb-1 text-emerald-800 dark:text-emerald-300">✅ Çözüm Adımları:</strong>
                        {ex.solution}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2">
                    <button onClick={() => setActiveStep(1)} className="btn-outline text-xs">⬅ Formüller</button>
                    <button onClick={() => setActiveStep(3)} className="btn-primary text-xs flex items-center gap-1">
                      Sonraki: Alıştırma Soru Çözümüne Geç ➔
                    </button>
                  </div>
                </div>
              )}

              {(activeStep === 3 || activeStep === 4) && (
                <div className="card text-center py-10 space-y-4">
                  <Calculator className="w-12 h-12 text-indigo-600 mx-auto" />
                  <h3 className="text-lg font-black">Konu Alıştırma ve Yeni Nesil Soruları</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Bu konuya ait kolay, orta ve LGS tarzı yeni nesil soruları etkileşimli ipucu sistemiyle çözmek için soru modülüne geçebilirsiniz.
                  </p>
                  <Link href="/ogrenci/soru-coz" className="btn-primary inline-flex text-xs">
                    Etkileşimli Soru Çözümüne Başla ➔
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

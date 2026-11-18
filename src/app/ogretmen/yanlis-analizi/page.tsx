'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle, MessageSquare, Filter, Check, Edit3 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface MistakeItem {
  id: string;
  questionId: string;
  topicName: string;
  subtopicName?: string;
  studentAnswer: string;
  correctAnswer: string;
  primaryErrorType: string;
  errorTitle: string;
  pedagogicalAdvice: string;
  aiProbability: number;
  aiReasoning: string;
  verifiedByTeacher: boolean;
  verifiedByStudent: boolean;
  teacherNote?: string;
  createdAt: string;
}

export default function YanlisAnaliziPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [categoriesMeta, setCategoriesMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Düzenleme / Doğrulama Modalı
  const [editingMistake, setEditingMistake] = useState<MistakeItem | null>(null);
  const [newErrorType, setNewErrorType] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(d => {
        if (d && d.length > 0) {
          setStudents(d);
          setSelectedStudentId(d[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const loadMistakes = (studentId: string) => {
    setLoading(true);
    fetch(`/api/learning/mistakes?studentId=${studentId}`)
      .then(r => r.json())
      .then(res => {
        setMistakes(res.mistakes || []);
        setCategoryStats(res.categoryStats || {});
        setCategoriesMeta(res.categoriesMeta || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadMistakes(selectedStudentId);
    }
  }, [selectedStudentId]);

  const handleOpenEdit = (m: MistakeItem) => {
    setEditingMistake(m);
    setNewErrorType(m.primaryErrorType);
    setNoteText(m.teacherNote || '');
  };

  const handleSaveVerification = async () => {
    if (!editingMistake) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/learning/mistakes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mistakeId: editingMistake.id,
          verifiedErrorType: newErrorType,
          teacherNote: noteText
        })
      });
      if (res.ok) {
        setEditingMistake(null);
        loadMistakes(selectedStudentId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Seçici */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-indigo-600" />
            Akıllı Yanlış Analizi – Öğrenci Neden Yanlış Yapıyor?
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yapay zekâ ve pedagojik analiz desteğiyle yanlış cevapların altında yatan 10 temel hata nedenini teşhis ve teyit edin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Öğrenci:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="input max-w-xs font-semibold"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 10 Hata Türü Dağılım Kartları */}
      <div className="card space-y-4">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          Hata Türü Sıklık Dağılımı (Özet)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(categoriesMeta).map(([key, meta]: [string, any]) => {
            const count = categoryStats[key] || 0;
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border text-center transition-all ${
                  count > 0
                    ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-slate-200 bg-slate-50/30 opacity-70'
                }`}
              >
                <div className="text-2xl font-black text-indigo-600">{count}</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight line-clamp-2">
                  {meta.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yanlış Sorular Listesi */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
          Analiz Edilen Sorular ({mistakes.length})
        </h3>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Yanlış kayıtları yükleniyor...</div>
        ) : mistakes.length === 0 ? (
          <div className="card text-center py-10 text-slate-500">
            Bu öğrenciye ait kaydedilmiş bir yanlış soru analizi bulunmamaktadır.
          </div>
        ) : (
          <div className="space-y-4">
            {mistakes.map((m) => (
              <div key={m.id} className="card border-l-4 border-l-indigo-600 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {m.topicName} {m.subtopicName ? `› ${m.subtopicName}` : ''}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Öğrenci: {m.studentAnswer} | Doğru: {m.correctAnswer}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.verifiedByTeacher ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                        <Check className="w-3.5 h-3.5" /> Öğretmen Onaylı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        Yapay Zekâ Tahmini (%{Math.round(m.aiProbability * 100)})
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="btn-outline text-xs px-2.5 py-1 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Düzenle
                    </button>
                  </div>
                </div>

                {/* Hata Türü & Pedagojik Açıklama */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                    <span className="text-xs font-bold text-slate-500 uppercase">Teşhis Edilen Hata Türü</span>
                    <div className="font-black text-sm text-indigo-600 mt-1">{m.errorTitle}</div>
                  </div>

                  <div className="md:col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                    <span className="text-xs font-bold text-slate-500 uppercase">Yapay Zekâ & Pedagojik Değerlendirme</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic">
                      "{m.aiReasoning}"
                    </p>
                  </div>
                </div>

                {/* Tavsiye ve Öğretmen Notu */}
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-lg flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Önerilen Destek:</strong> {m.pedagogicalAdvice}
                    {m.teacherNote && (
                      <div className="mt-1 font-semibold text-indigo-700 dark:text-indigo-300">
                        👨‍🏫 <strong>Öğretmen Notu:</strong> {m.teacherNote}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Düzenleme / Teşhis Teyit Modalı */}
      {editingMistake && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full space-y-4">
            <h3 className="font-black text-lg">Hata Nedenini Doğrula veya Değiştir</h3>
            <p className="text-xs text-slate-500">
              Bu soru için öğrencinin hata nedenini öğretmen gözleminize göre güncelleyebilirsiniz.
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="label">10 Temel Hata Kategorisi</label>
                <select
                  value={newErrorType}
                  onChange={(e) => setNewErrorType(e.target.value)}
                  className="input font-semibold"
                >
                  {Object.entries(categoriesMeta).map(([k, meta]: [string, any]) => (
                    <option key={k} value={k}>{meta.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Öğretmen Özel Değerlendirme Notu</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Öğrencinin çözümündeki spesifik hata basamağını not edin..."
                  rows={3}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingMistake(null)} className="btn-outline">
                İptal
              </button>
              <button onClick={handleSaveVerification} disabled={submitting} className="btn-primary">
                {submitting ? 'Kaydediliyor...' : 'Doğrula ve Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileEdit, Users, Clock, Calendar, CheckCircle2, AlertCircle, 
  Sparkles, Layers, ArrowRight, Trash2 
} from 'lucide-react';

export default function CalismaOlusturPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedIds = searchParams.get('selected')?.split(',').filter(Boolean) || [];

  const [title, setTitle] = useState('LGS Çarpanlar ve Katlar Pekiştirme Çalışması');
  const [description, setDescription] = useState('EBOB-EKOK ve aralarında asal sayılar odaklı yeni nesil çalışma seti.');
  const [durationMin, setDurationMin] = useState(30);
  const [isAdaptive, setIsAdaptive] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Öğrencileri yükle
        const sRes = await fetch('/api/students');
        const sData = await sRes.json();
        if (sData.success) {
          setStudents(sData.students);
          if (sData.students.length > 0) {
            setSelectedStudentIds([sData.students[0].id]);
          }
        }

        // Soru havuzunu yükle
        const qRes = await fetch('/api/lgs/question-pool');
        const qData = await qRes.json();
        if (qData.success) {
          if (preSelectedIds.length > 0) {
            setQuestions(qData.questions.filter((q: any) => preSelectedIds.includes(q.id)));
          } else {
            // Varsayılan ilk 5 soru
            setQuestions(qData.questions.slice(0, 6));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert('Lütfen en az bir öğrenci seçin.');
      return;
    }
    if (questions.length === 0) {
      alert('Lütfen çalışma setine en az bir soru ekleyin.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/lgs/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          studentIds: selectedStudentIds,
          questions,
          durationMin,
          isAdaptive
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          router.push('/ogretmen/ogrenme-planlari');
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <FileEdit className="h-4 w-4" /> Kişiselleştirilmiş Çalışma Seti
          </div>
          <h1 className="text-2xl font-black">Konu Bazlı Matematik Çalışması Oluştur</h1>
          <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
            Seçilen konularda PDF kaynak soruları ve yapay zekâ sorularını birleştirerek hedefe yönelik özel çalışma testi hazırlayın ve öğrencilerinize anında atayın.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMsg} Yönlendiriliyorsunuz...</span>
        </div>
      )}

      <form onSubmit={handleAssign} className="grid gap-6 lg:grid-cols-3">
        {/* Sol 2 Kolon: Çalışma Detayı ve Soru Listesi */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Çalışma Seti Bilgileri</h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Çalışma Başlığı</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama & Yönerge</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Çalışma Setindeki Sorular */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Seçilen Sorular ({questions.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">Soru havuzundan eklenenler</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">Sorular yükleniyor...</div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">Henüz soru eklenmedi. Soru havuzundan soru seçebilirsiniz.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {idx + 1}. Soru
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {q.topic_name || q.primary_topic_id || 'Matematik'} • Zorluk: {q.difficulty}/5
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                        {q.question_text || q.questionText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Kolon: Öğrenci Seçimi ve Atama Ayarları */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" /> Öğrenci Seçimi
            </h2>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {students.map(s => {
                const isChecked = selectedStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isChecked 
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30' 
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.grade}. Sınıf • {s.school || 'LGS'}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedStudentIds(prev => 
                          isChecked ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Önerilen Süre (Dakika)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={durationMin}
                  onChange={e => setDurationMin(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="adapt"
                  checked={isAdaptive}
                  onChange={e => setIsAdaptive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="adapt" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Uyarlanabilir Öğrenme Modu (Doğru/yanlışa göre zorluk uyarlanır)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || questions.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? 'Atama Yapılıyor...' : 'Çalışmayı Öğrencilere Ata'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

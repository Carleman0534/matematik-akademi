'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, CheckCircle2, Clock, AlertTriangle, Users, Share2, BarChart3 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface HomeworkItem {
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  description?: string;
  topic_name?: string;
  question_count: number;
  difficulty_level: number;
  start_date: string;
  due_date: string;
  status: string;
  completed_question_count: number;
  correct_count: number;
  wrong_count: number;
  completion_percentage: number;
  share_with_parent: number;
}

export default function OdevlerPage() {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Ödev Ekleme Modalı
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(15);
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [dueDate, setDueDate] = useState('');
  const [shareWithParent, setShareWithParent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch('/api/teacher/homework')
      .then(r => r.json())
      .then(res => setHomeworks(res.homeworks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDueDate(nextWeek.toISOString().split('T')[0]);

    fetch('/api/students')
      .then(r => r.json())
      .then(d => {
        if (d && d.length > 0) {
          setStudents(d);
          setStudentId(d[0].id);
        }
      })
      .catch(console.error);

    loadData();
  }, []);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/teacher/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          title,
          description,
          questionCount,
          difficultyLevel,
          dueDate,
          shareWithParent
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setTitle('');
        setDescription('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (h: HomeworkItem) => {
    if (h.completion_percentage >= 100) {
      return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">✓ Tamamlandı</span>;
    }
    if (h.completed_question_count > 0) {
      return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-800 flex items-center gap-1">⏳ Devam Ediyor (%{Math.round(h.completion_percentage)})</span>;
    }
    return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">📌 Başlanmadı</span>;
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Buton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Ödev ve Görev Takip Sistemi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Öğrencilere konu bazlı ödevler atayın, çözülen soru sayılarını, başarı yüzdelerini ve teslim durumlarını canlı takip edin.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Yeni Ödev Ata
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Ödevler yükleniyor...</div>
      ) : homeworks.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          Henüz atanmış aktif ödev bulunmamaktadır.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeworks.map((h) => (
            <div key={h.id} className="card space-y-3 border-l-4 border-l-indigo-600">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Öğrenci: {h.student_name}
                  </span>
                  <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 mt-0.5">{h.title}</h3>
                </div>
                {statusBadge(h)}
              </div>

              {h.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {h.description}
                </p>
              )}

              {/* İlerleme Çubuğu */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>İlerleme: {h.completed_question_count} / {h.question_count} Soru</span>
                  <span className="text-indigo-600">%{Math.round(h.completion_percentage)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${h.completion_percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900">
                  <span className="text-slate-500 block">Zorluk</span>
                  <span className="font-bold">⭐ {h.difficulty_level}/5</span>
                </div>
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                  <span className="block">Doğru</span>
                  <span className="font-black">{h.correct_count}</span>
                </div>
                <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300">
                  <span className="block">Yanlış</span>
                  <span className="font-black">{h.wrong_count}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>Son Teslim: <strong>{h.due_date}</strong></span>
                {h.share_with_parent === 1 && (
                  <span className="text-indigo-600 font-semibold flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> Veliye Açık
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Ödev Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateHomework} className="card max-w-md w-full space-y-4">
            <h3 className="font-black text-lg">Yeni Ödev Ata</h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="label">Öğrenci Seç</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input font-semibold">
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Ödev Başlığı</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Çarpanlar ve Katlar 15 Soru Test"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="label">Açıklama / Yönergeler</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Öğrencinin dikkat etmesi gereken adımlar..."
                  rows={2}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Soru Sayısı</label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    min={5}
                    max={100}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Zorluk (1-5)</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(Number(e.target.value))}
                    className="input font-semibold"
                  >
                    <option value={1}>1 - Temel Kavram</option>
                    <option value={2}>2 - Kolay</option>
                    <option value={3}>3 - Orta Düzey</option>
                    <option value={4}>4 - Zor (LGS Tarzı)</option>
                    <option value={5}>5 - İleri Düzey Problem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Son Teslim Tarihi</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shareParent"
                  checked={shareWithParent}
                  onChange={(e) => setShareWithParent(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label htmlFor="shareParent" className="text-xs font-semibold cursor-pointer">
                  Veli takip panelinde görünmesine izin ver
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">İptal</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Atanıyor...' : 'Ödevi Ata'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

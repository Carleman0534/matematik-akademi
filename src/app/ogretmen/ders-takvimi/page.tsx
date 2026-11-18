'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, CheckCircle, BookOpen, User, MessageSquare, ChevronRight } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface LessonSchedule {
  id: string;
  student_id: string;
  student_name: string;
  lesson_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  topic_name?: string;
  planned_goals?: string;
}

interface LessonHistory {
  id: string;
  student_id: string;
  student_name: string;
  lesson_date: string;
  topic_name?: string;
  subtopics_covered?: string;
  questions_solved_count: number;
  student_performance_rating: number;
  teacher_private_notes?: string;
  teacher_parent_notes?: string;
  assigned_homework?: string;
  next_lesson_goals?: string;
}

export default function DersTakvimiPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules');
  const [schedules, setSchedules] = useState<LessonSchedule[]>([]);
  const [history, setHistory] = useState<LessonHistory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Ders Ekleme Modalı
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [plannedGoals, setPlannedGoals] = useState('');

  // Ders Tamamlama / Not Kaydetme Modalı
  const [completingSchedule, setCompletingSchedule] = useState<LessonSchedule | null>(null);
  const [subtopicsCovered, setSubtopicsCovered] = useState('');
  const [questionsSolved, setQuestionsSolved] = useState(15);
  const [performanceRating, setPerformanceRating] = useState(4);
  const [privateNotes, setPrivateNotes] = useState('');
  const [parentNotes, setParentNotes] = useState('');
  const [homeworkText, setHomeworkText] = useState('');
  const [nextGoals, setNextGoals] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch('/api/teacher/lessons')
      .then(r => r.json())
      .then(res => {
        setSchedules(res.schedules || []);
        setHistory(res.history || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLessonDate(new Date().toISOString().split('T')[0]);
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

  const handleScheduleLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teacher/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_lesson',
          studentId,
          lessonDate,
          startTime,
          durationMinutes,
          plannedGoals
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setPlannedGoals('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSchedule) return;

    try {
      const res = await fetch('/api/teacher/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_history',
          scheduleId: completingSchedule.id,
          studentId: completingSchedule.student_id,
          lessonDate: completingSchedule.lesson_date,
          subtopicsCovered,
          questionsSolvedCount: questionsSolved,
          studentPerformanceRating: performanceRating,
          teacherPrivateNotes: privateNotes,
          teacherParentNotes: parentNotes,
          assignedHomework: homeworkText,
          nextLessonGoals: nextGoals
        })
      });
      if (res.ok) {
        setCompletingSchedule(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Buton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" />
            Akıllı Ders & Çalışma Takvimi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Haftalık ders programı, işlenen konular, öğrenci performans notları ve bir sonraki ders hedefleri.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Yeni Ders Planla
        </button>
      </div>

      {/* Sekmeler */}
      <div className="flex border-b gap-4">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-2.5 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'schedules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📅 Planlanan Dersler ({schedules.filter(s => s.status === 'scheduled').length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📜 Ders Geçmişi & Not Kayıtları ({history.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Ders kayıtları yükleniyor...</div>
      ) : activeTab === 'schedules' ? (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">Planlanmış aktif ders bulunmamaktadır.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((s) => (
                <div key={s.id} className="card border-l-4 border-l-indigo-600 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase text-indigo-600">Öğrenci</span>
                      <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{s.student_name}</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      s.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {s.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                      {s.lesson_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {s.start_time} ({s.duration_minutes} dk)
                    </span>
                  </div>

                  {s.planned_goals && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                      <strong>Hedef:</strong> {s.planned_goals}
                    </div>
                  )}

                  {s.status === 'scheduled' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setCompletingSchedule(s);
                          setPlannedGoals(s.planned_goals || '');
                        }}
                        className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Dersi Tamamla & Not Gir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">Ders geçmişi kaydı bulunmamaktadır.</div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-800 dark:text-slate-100">{h.student_name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {h.lesson_date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Çözülen Soru: <strong>{h.questions_solved_count} adet</strong></span>
                      <span>•</span>
                      <span>Dersteki Başarı: <strong>⭐ {h.student_performance_rating} / 5</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <span className="font-bold text-slate-500 uppercase">İşlenen Konu & Kazanımlar</span>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                        {h.subtopics_covered || h.topic_name || 'Genel Soru Çözümü'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <span className="font-bold text-slate-500 uppercase">Verilen Ödev</span>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                        {h.assigned_homework || 'Belirtilmedi'}
                      </p>
                    </div>
                  </div>

                  {/* Özel ve Veli Notu */}
                  <div className="space-y-2 pt-1 text-xs">
                    {h.teacher_private_notes && (
                      <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 text-amber-900 dark:text-amber-200">
                        🔒 <strong>Öğretmen Özel Notu (Yalnızca siz görürsünüz):</strong> {h.teacher_private_notes}
                      </div>
                    )}
                    {h.teacher_parent_notes && (
                      <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 text-indigo-900 dark:text-indigo-200">
                        👨‍👩‍👧 <strong>Veliyle Paylaşılan Not:</strong> {h.teacher_parent_notes}
                      </div>
                    )}
                    {h.next_lesson_goals && (
                      <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        🎯 <strong>Gelecek Ders Hedefi:</strong> {h.next_lesson_goals}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Yeni Ders Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleScheduleLesson} className="card max-w-md w-full space-y-4">
            <h3 className="font-black text-lg">Yeni Ders Planla</h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="label">Öğrenci Seç</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input font-semibold">
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tarih</label>
                  <input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} required className="input" />
                </div>
                <div>
                  <label className="label">Saat</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="input" />
                </div>
              </div>

              <div>
                <label className="label">Süre (Dakika)</label>
                <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} min={30} step={15} className="input" />
              </div>

              <div>
                <label className="label">Dersin Hedefi ve Konusu</label>
                <textarea
                  value={plannedGoals}
                  onChange={(e) => setPlannedGoals(e.target.value)}
                  placeholder="Örn: EBOB-EKOK yeni nesil soruları pekiştirme..."
                  rows={2}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">İptal</button>
              <button type="submit" className="btn-primary">Takvime Ekle</button>
            </div>
          </form>
        </div>
      )}

      {/* Dersi Tamamla & Not Gir Modalı */}
      {completingSchedule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRecordHistory} className="card max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-lg">Dersi Tamamla & Geçmişe Kaydet</h3>
            <p className="text-xs text-slate-500">
              <strong>{completingSchedule.student_name}</strong> öğrencisiyle yapılan dersin detaylarını ve notlarını girin.
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="label">İşlenen Alt Konular & Kazanımlar</label>
                <input
                  type="text"
                  value={subtopicsCovered}
                  onChange={(e) => setSubtopicsCovered(e.target.value)}
                  placeholder="Örn: Asal çarpanlara ayırma, EBOB problemleri"
                  required
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Çözülen Soru Sayısı</label>
                  <input
                    type="number"
                    value={questionsSolved}
                    onChange={(e) => setQuestionsSolved(Number(e.target.value))}
                    min={0}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Öğrenci Performansı (1-5)</label>
                  <select
                    value={performanceRating}
                    onChange={(e) => setPerformanceRating(Number(e.target.value))}
                    className="input font-semibold"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ Mükemmel (5)</option>
                    <option value={4}>⭐⭐⭐⭐ Çok İyi (4)</option>
                    <option value={3}>⭐⭐⭐ Orta Düzey (3)</option>
                    <option value={2}>⭐⭐ Geliştirilmeli (2)</option>
                    <option value={1}>⭐ Kritik Destek Gerekli (1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Öğretmen Özel Notu (Gizli)</label>
                <textarea
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Öğrencinin zorlandığı işlem adımları vb..."
                  rows={2}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Veliyle Paylaşılacak Rehberlik Notu</label>
                <textarea
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  placeholder="Veli portalında velinin göreceği yapıcı değerlendirme mesajı..."
                  rows={2}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Verilen Ödev</label>
                <input
                  type="text"
                  value={homeworkText}
                  onChange={(e) => setHomeworkText(e.target.value)}
                  placeholder="Örn: 20 soru EBOB-EKOK pekiştirme testi"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Bir Sonraki Dersin Hedefleri</label>
                <input
                  type="text"
                  value={nextGoals}
                  onChange={(e) => setNextGoals(e.target.value)}
                  placeholder="Örn: Üslü sayılarda bilimsel gösterim"
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCompletingSchedule(null)} className="btn-outline">İptal</button>
              <button type="submit" className="btn-primary">Ders Kaydını Tamamla</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

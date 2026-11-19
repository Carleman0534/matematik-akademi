'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, Plus, Save,
  Users, Calendar, Heart, Share2, Sparkles, Filter, Check
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface ParentReport {
  id: string;
  student_id: string;
  student_name: string;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_questions: number;
  correct_count: number;
  completed_homeworks: number;
  total_homeworks: number;
  attended_exams: number;
  net_change: number;
  topics_summary: { topic: string; solved: number; accuracy: number }[];
  next_week_goals: string;
  teacher_message: string;
  is_approved_by_teacher: boolean;
  status: string;
  created_at: string;
}

export default function VeliRaporlariYonetimPage() {
  const [reports, setReports] = useState<ParentReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedReport, setSelectedReport] = useState<ParentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Editable fields
  const [editingMessage, setEditingMessage] = useState('');
  const [editingGoals, setEditingGoals] = useState('');

  // New Report Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [newStartDate, setNewStartDate] = useState('2026-11-10');
  const [newEndDate, setNewEndDate] = useState('2026-11-17');
  const [newTotalQ, setNewTotalQ] = useState(120);
  const [newCorrect, setNewCorrect] = useState(100);
  const [newCompletedHw, setNewCompletedHw] = useState(3);
  const [newTotalHw, setNewTotalHw] = useState(3);
  const [newAttendedExams, setNewAttendedExams] = useState(2);
  const [newNetChange, setNewNetChange] = useState(1.50);
  const [newMessage, setNewMessage] = useState('Öğrencimiz bu hafta derslere çok aktif katıldı ve ödevlerini eksiksiz tamamladı.');
  const [newGoals, setNewGoals] = useState('Haftaya üslü ve kareköklü sayılarda yeni nesil soru çözümlerine odaklanılacak.');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/parent-weekly');
      const json = await res.json();
      if (json.reports) {
        setReports(json.reports);
        if (json.reports.length > 0 && !selectedReport) {
          setSelectedReport(json.reports[0]);
          setEditingMessage(json.reports[0].teacher_message || '');
          setEditingGoals(json.reports[0].next_week_goals || '');
        }
      }
    } catch (err) {
      console.error('Raporlar yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    async function loadStudents() {
      try {
        const res = await fetch('/api/students');
        const json = await res.json();
        if (json.students) {
          setStudents(json.students);
          if (json.students.length > 0) {
            setNewStudentId(json.students[0].id);
          }
        }
      } catch (err) {
        console.error('Öğrenciler yüklenemedi:', err);
      }
    }
    loadStudents();
  }, []);

  const handleSelect = (r: ParentReport) => {
    setSelectedReport(r);
    setEditingMessage(r.teacher_message || '');
    setEditingGoals(r.next_week_goals || '');
    setStatusMsg(null);
  };

  const handleSaveUpdate = async (isApproved: boolean) => {
    if (!selectedReport) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/reports/parent-weekly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          teacherMessage: editingMessage,
          nextWeekGoals: editingGoals,
          isApproved,
          status: isApproved ? 'published' : 'draft'
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(isApproved ? 'Rapor onaylandı ve veli paneline yayınlandı.' : 'Rapor taslak olarak kaydedildi.');
        setSelectedReport({
          ...selectedReport,
          teacher_message: editingMessage,
          next_week_goals: editingGoals,
          is_approved_by_teacher: isApproved,
          status: isApproved ? 'published' : 'draft'
        });
        setReports(reports.map(r => r.id === selectedReport.id ? {
          ...r,
          teacher_message: editingMessage,
          next_week_goals: editingGoals,
          is_approved_by_teacher: isApproved,
          status: isApproved ? 'published' : 'draft'
        } : r));
      }
    } catch (err) {
      console.error('Güncelleme hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReport = async () => {
    if (!newStudentId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reports/parent-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: newStudentId,
          periodType: newPeriodType,
          startDate: newStartDate,
          endDate: newEndDate,
          totalQuestions: newTotalQ,
          correctCount: newCorrect,
          wrongCount: Math.max(0, newTotalQ - newCorrect),
          emptyCount: 0,
          completedHomeworks: newCompletedHw,
          totalHomeworks: newTotalHw,
          attendedExams: newAttendedExams,
          netChange: newNetChange,
          topicsSummary: [
            { topic: 'Çarpanlar ve Katlar', solved: Math.round(newTotalQ * 0.5), accuracy: 82 },
            { topic: 'Üslü İfadeler', solved: Math.round(newTotalQ * 0.5), accuracy: 86 }
          ],
          teacherMessage: newMessage,
          nextWeekGoals: newGoals,
          isApproved: true,
          status: 'published'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        await fetchReports();
        setStatusMsg('Yeni veli gelişim raporu başarıyla oluşturuldu ve yayınlandı.');
      }
    } catch (err) {
      console.error('Oluşturma hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  const REPORTS_TABS = [
    { href: '/ogretmen/raporlar', label: 'Raporlama Merkezi', icon: '📋' },
    { href: '/ogretmen/veli-raporlari', label: 'Veli Gelişim Raporları', icon: '🌱', badge: 'Haftalık' },
    { href: '/ogretmen/veri-aktar', label: 'Veri Dışa Aktarma & Yedek', icon: '📥' },
    { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Raporlar ve Veri Yönetimi"
        description="Akademi performans raporları, veli bilgilendirme mektupları ve veri yedekleme"
        tabs={REPORTS_TABS}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👨‍👩‍👧</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Veli Gelişim Raporları Yönetimi
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrenciler için haftalık ve aylık gelişim raporları hazırlayın, öğretmen notu ekleyin ve velilerin görmesini onaylayın.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Veli Raporu Oluştur</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reports List (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Hazırlanan Raporlar
          </h2>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {reports.map(item => {
              const isSelected = selectedReport?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.student_name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {item.status === 'published' ? 'Veliye Açık' : 'Taslak'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.period_type === 'weekly' ? 'Haftalık' : 'Aylık'} • {item.start_date} – {item.end_date}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                    <span>{item.total_questions} Soru</span>
                    <span>Net Değişimi: +{item.net_change?.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Inspection, Teacher Message Editing & Approval (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {selectedReport ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedReport.student_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedReport.period_type === 'weekly' ? 'Haftalık' : 'Aylık'} Rapor ({selectedReport.start_date} – {selectedReport.end_date})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedReport.is_approved_by_teacher ? (
                    <button
                      onClick={() => handleSaveUpdate(false)}
                      disabled={saving}
                      className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 text-xs font-bold rounded-xl"
                    >
                      Taslağa Al
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSaveUpdate(true)}
                      disabled={saving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Veliye Yayınla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Çözülen Soru</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedReport.total_questions}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Tamamlanan Ödev</div>
                  <div className="text-lg font-black text-indigo-600 mt-0.5">
                    {selectedReport.completed_homeworks} / {selectedReport.total_homeworks}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Değişimi</div>
                  <div className="text-lg font-black text-emerald-600 mt-0.5">
                    +{selectedReport.net_change?.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Editable Teacher Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Öğretmenin Veliye Özel Mesajı (Yapıcı & Takdir Edici Dil):
                </label>
                <textarea
                  rows={4}
                  value={editingMessage}
                  onChange={e => setEditingMessage(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Editable Next Goals */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Önümüzdeki Dönem Hedefleri:
                </label>
                <textarea
                  rows={2}
                  value={editingGoals}
                  onChange={e => setEditingGoals(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleSaveUpdate(selectedReport.is_approved_by_teacher)}
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Düzenlemek istediğiniz raporu sol listeden seçin.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Yeni Veli Raporu Oluştur */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Yeni Veli Gelişim Raporu Hazırla
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Öğrenci Seçin
                </label>
                <select
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Rapor Türü</label>
                  <select
                    value={newPeriodType}
                    onChange={e => setNewPeriodType(e.target.value as 'weekly' | 'monthly')}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Net Değişimi (+)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newNetChange}
                    onChange={e => setNewNetChange(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Çözülen Soru</label>
                  <input
                    type="number"
                    value={newTotalQ}
                    onChange={e => setNewTotalQ(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Ödev (Tamamlanan)</label>
                  <input
                    type="number"
                    value={newCompletedHw}
                    onChange={e => setNewCompletedHw(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-0.5">Deneme Sayısı</label>
                  <input
                    type="number"
                    value={newAttendedExams}
                    onChange={e => setNewAttendedExams(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Öğretmen Mesajı
                </label>
                <textarea
                  rows={2}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 text-xs font-bold rounded-xl"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateReport}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Kaydediliyor...' : 'Raporu Yayınla'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

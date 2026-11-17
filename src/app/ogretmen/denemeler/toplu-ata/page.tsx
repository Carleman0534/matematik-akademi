'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  X
} from 'lucide-react';

export default function TopluDenemeAtaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPdfId = searchParams.get('pdfId') || '';

  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedExamId, setSelectedExamId] = useState(initialPdfId);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(60);
  const [startsAt, setStartsAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Süzgeçler
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  // Özet Onay Modalı
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Denemeleri ve PDF'leri al
        const [pdfRes, examRes, stRes] = await Promise.all([
          fetch('/api/pdf-documents'),
          fetch('/api/exams/smart-generate').catch(() => null),
          fetch('/api/students').catch(() => null),
        ]);

        const pdfData = await pdfRes.json();
        let allExams = pdfData.docs || [];

        // Öğrencileri yükle
        if (stRes && stRes.ok) {
          const stData = await stRes.json();
          if (stData.students) setStudents(stData.students);
        } else {
          // Demo fallback
          setStudents([
            { id: 'st-1', full_name: 'Ahmet Yılmaz', grade_level: 12, class_name: '12-A Sayısal' },
            { id: 'st-2', full_name: 'Mehmet Demir', grade_level: 12, class_name: '12-A Sayısal' },
            { id: 'st-3', full_name: 'Ayşe Kaya', grade_level: 12, class_name: '12-B Eşit Ağırlık' },
            { id: 'st-4', full_name: 'Zeynep Çelik', grade_level: 11, class_name: '11-A Sayısal' },
            { id: 'st-5', full_name: 'Can Baran', grade_level: 12, class_name: '12-A Sayısal' },
            { id: 'st-6', full_name: 'Elif Şahin', grade_level: 12, class_name: '12-B Eşit Ağırlık' },
            { id: 'st-7', full_name: 'Burak Öztürk', grade_level: 11, class_name: '11-B Sayısal' },
            { id: 'st-8', full_name: 'Selin Doğan', grade_level: 12, class_name: '12-A Sayısal' },
          ]);
        }

        setExams(allExams);
        if (initialPdfId) {
          setSelectedExamId(initialPdfId);
        } else if (allExams.length > 0) {
          setSelectedExamId(allExams[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialPdfId]);

  // Öğrenci Filtreleme
  const filteredStudents = students.filter((s) => {
    if (classFilter !== 'ALL' && s.class_name && !s.class_name.includes(classFilter)) return false;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      return s.full_name?.toLowerCase().includes(q) || s.class_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmAssignment = async () => {
    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/exams/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          studentIds: selectedStudentIds,
          startsAt: startsAt || undefined,
          dueAt: dueAt || undefined,
          durationMin,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResultMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          setShowConfirmModal(false);
          router.push('/ogretmen/denemeler/canli');
        }, 1500);
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Atama başarısız.' });
      }
    } catch {
      setResultMessage({ type: 'error', text: 'Ağ bağlantı hatası oluştu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Toplu Deneme Sınavı Ata</h1>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Tek Tıkla Toplu Atama
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Seçtiğiniz PDF denemesini veya şablonunu tek seferde istediğiniz öğrenci grubuna veya sınıfa atayın.
          </p>
        </div>

        <Link
          href="/ogretmen/denemeler/canli"
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
        >
          <span>Devam Eden Sınavları Gör →</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel: Sınav ve Süre Seçimi */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>1. Deneme Şablonunu Seç</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Atanacak PDF / Deneme
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.grade_level || 'AYT'} · {exam.question_count || 40} Soru)
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-bold">{selectedExam.title}</div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  {selectedExam.publisher && `Yayın: ${selectedExam.publisher} · `}
                  {selectedExam.question_count || 40} Soru
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>2. Sınav Süresi ve Zamanı</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Sınav Süresi (Dakika) *
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 60)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Başlangıç Zamanı (İsteğe Bağlı)
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-[10px] text-slate-400">Boş bırakılırsa atandığı andan itibaren başlanabilir.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Son Teslim / Bitiş Zamanı (İsteğe Bağlı)
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Sağ Panel: Öğrenci Seçimi */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>3. Öğrencileri Seç</span>
                </h2>
                <span className="text-xs text-slate-500">
                  Seçilen: <strong>{selectedStudentIds.length}</strong> / {filteredStudents.length} öğrenci
                </span>
              </div>

              <button
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seçimi Temizle</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Bütün Öğrencileri Seç</span>
                  </>
                )}
              </button>
            </div>

            {/* Arama & Sınıf Filtresi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="İsim veya sınıf ara..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">Tüm Sınıflar</option>
                <option value="12-A">12-A Sayısal</option>
                <option value="12-B">12-B Eşit Ağırlık</option>
                <option value="11">11. Sınıflar</option>
              </select>
            </div>

            {/* Öğrenci Listesi Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border text-white ${
                          isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{student.full_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {student.class_name || `${student.grade_level || 12}. Sınıf`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Atamayı Başlat Butonu */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                disabled={selectedStudentIds.length === 0 || !selectedExamId}
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-500/20"
              >
                <span>Atamayı İncele & Onayla ({selectedStudentIds.length} Öğrenci)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Özet Onay Modalı */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-indigo-600 mb-3">
              <Play className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Toplu Sınav Atamasını Onayla</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Aşağıdaki detaylara göre her bir öğrenci için bağımsız sınav oturumu oluşturulacaktır.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Deneme:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedExam?.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Atanacak Öğrenci Sayısı:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedStudentIds.length} Öğrenci</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Sınav Süresi:</span>
                <span className="font-bold text-slate-900 dark:text-white">{durationMin} Dakika</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Başlangıç:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {startsAt ? new Date(startsAt).toLocaleString('tr-TR') : 'Hemen Başlanabilir'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Son Teslim:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {dueAt ? new Date(dueAt).toLocaleString('tr-TR') : 'Süre Sınırı Yok (Öğrenci Başladığında Sayar)'}
                </span>
              </div>
            </div>

            {resultMessage && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs font-medium border ${
                  resultMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300'
                }`}
              >
                {resultMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Geri Dön
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmAssignment}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Atanıyor...' : 'Onayla ve Sınavı Ata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

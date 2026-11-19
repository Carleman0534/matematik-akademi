'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, CheckCircle2, AlertCircle, Calendar, User } from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

export default function VeriAktarPage() {
  const [reportType, setReportType] = useState<'exam_results' | 'students' | 'topic_mastery' | 'mistakes'>('exam_results');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/students');
        const json = await res.json();
        if (json.students) setStudents(json.students);
      } catch (err) {
        console.error('Öğrenciler yüklenemedi:', err);
      }
    }
    fetchStudents();
  }, []);

  useEffect(() => {
    async function loadPreview() {
      try {
        const params = new URLSearchParams({
          type: reportType,
          format: 'json',
          ...(selectedStudent ? { studentId: selectedStudent } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {})
        });
        const res = await fetch(`/api/reports/export?${params.toString()}`);
        const json = await res.json();
        if (json.data) {
          setPreviewData(json.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Önizleme yüklenemedi:', err);
      }
    }
    loadPreview();
  }, [reportType, selectedStudent, startDate, endDate]);

  const handleDownload = () => {
    setLoading(true);
    setStatusMessage(null);

    const params = new URLSearchParams({
      type: reportType,
      format: exportFormat,
      ...(selectedStudent ? { studentId: selectedStudent } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {})
    });

    const url = `/api/reports/export?${params.toString()}`;
    window.location.href = url;

    setTimeout(() => {
      setLoading(false);
      setStatusMessage('Dışa aktarma dosyası hazırlandı ve indirme başlatıldı.');
    }, 1200);
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
            <span className="text-2xl">📥</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Veri Dışa Aktarma ve Raporlama Merkezi
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrenci listelerini, deneme sınav sonuçlarını, konu başarılarını ve hata listelerini Excel (CSV) ve JSON formatında dışa aktarın.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>{loading ? 'Hazırlanıyor...' : 'Dışa Aktar ve İndir'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Type Selector */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            1. Rapor Kategorisi Seçin
          </h2>

          <div className="space-y-2">
            {[
              {
                id: 'exam_results',
                title: 'Deneme Sınav Sonuçları',
                desc: 'Net skorlar, doğru/yanlış/boş sayıları, tamamlanma tarihleri',
                icon: '📊'
              },
              {
                id: 'students',
                title: 'Öğrenci Listesi & Durumları',
                desc: 'Sınıf, aktiflik, kayıt tarihi ve genel bilgiler',
                icon: '👥'
              },
              {
                id: 'topic_mastery',
                title: 'Müfredat & Konu Kataloğu',
                desc: 'LGS konu listesi, sınıf seviyeleri ve kazanım kodları',
                icon: '📚'
              },
              {
                id: 'mistakes',
                title: 'Hata Analizi Listesi',
                desc: 'Öğrenci bazlı tespit edilen 10 hata kategorisi ve doğruluklar',
                icon: '🔍'
              }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setReportType(item.id as typeof reportType)}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                  reportType === item.id
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle Column: Filters */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            2. Filtre ve Parametreler
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Öğrenci Filtresi
              </label>
              <div className="relative">
                <select
                  value={selectedStudent}
                  onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Tüm Öğrenciler (Genel)</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Başlangıç Tarihi
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Bitiş Tarihi
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Format & Compatibility */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            3. Çıktı Formatı
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-4 rounded-2xl border text-center transition ${
                exportFormat === 'csv'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              <div className="text-2xl mb-1">📗</div>
              <div className="text-xs">Excel / CSV</div>
              <div className="text-[10px] text-slate-400 mt-1">UTF-8 Destekli</div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`p-4 rounded-2xl border text-center transition ${
                exportFormat === 'json'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600'
              }`}
            >
              <div className="text-2xl mb-1">📦</div>
              <div className="text-xs">JSON</div>
              <div className="text-[10px] text-slate-400 mt-1">Programatik Veri</div>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700 dark:text-slate-300">💡 Excel Uyumluluğu:</span> CSV dosyaları Türkçe karakterlerin bozulmaması için özel UTF-8 BOM ve noktalı virgül (;) standardı ile üretilir. Microsoft Excel ve Google E-Tablolar ile doğrudan çift tıklanarak açılabilir.
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>👁️</span>
            Canlı Veri Önizlemesi (İlk 5 Satır)
          </h2>
          <span className="text-[11px] text-slate-400">
            {previewData.length > 0 ? `${previewData.length} kayıt listeleniyor` : 'Veri yok'}
          </span>
        </div>

        {previewData.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {Object.keys(previewData[0]).map((col, idx) => (
                    <th key={idx} className="p-3 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="p-3 text-slate-700 dark:text-slate-300">
                        {String(val ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            Seçilen filtre kriterlerine uygun kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  UploadCloud,
  Download,
  Eye,
  Key,
  Plus,
  X,
  Search,
  Filter,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export default function OgretmenPdfDenemelerPage() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('AYT');
  const [questionCount, setQuestionCount] = useState('40');
  const [answerKey, setAnswerKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Cevap Anahtarı Önizleme Modalı
  const [selectedAnswerKey, setSelectedAnswerKey] = useState<{ title: string; key: string } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const url = categoryFilter === 'ALL' ? '/api/exam-pdfs' : `/api/exam-pdfs?category=${categoryFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore && data.pdfs) setPdfs(data.pdfs);
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [categoryFilter, refreshKey]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Lütfen bir PDF dosyası seçin.');
      return;
    }
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('questionCount', questionCount);
      formData.append('answerKey', answerKey);

      const res = await fetch('/api/exam-pdfs', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowUploadModal(false);
        setTitle('');
        setDescription('');
        setAnswerKey('');
        setFile(null);
        setRefreshKey(k => k + 1);
      } else {
        const text = await res.text();
        let errMsg = 'Yükleme başarısız.';
        try {
          const d = JSON.parse(text);
          errMsg = d.error || errMsg;
        } catch {
          if (res.status === 413 || text.includes('Request Entity Too Large')) {
            errMsg = 'Dosya boyutu sunucu sınırını aştı (4.5 MB). Lütfen daha küçük bir PDF seçin veya PDF Arşivi üzerinden yükleyin.';
          }
        }
        setError(errMsg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Yükleme hatası: ' + msg);
    } finally {
      setUploading(false);
    }
  };

  const filteredPdfs = pdfs.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      return p.title?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hazır Denemeler & PDF Kütüphanesi</h1>
            <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              PDF Bankası
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Türkiye geneli denemeleri, konu tarama fasiküllerini ve hazır PDF sınavlarını yükleyin ve öğrencilerinizle paylaşın.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm shadow-indigo-500/20 whitespace-nowrap"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Yeni PDF Deneme Yükle</span>
        </button>
      </div>

      {/* Arama & Kategori Filtresi */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Deneme adı veya açıklama ara..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'AYT', label: 'AYT Denemeleri' },
            { id: 'TYT', label: 'TYT Denemeleri' },
            { id: 'Konu_Tarama', label: 'Konu Taramaları' },
            { id: 'LGS', label: 'LGS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PDF Listesi */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredPdfs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                    pdf.category === 'AYT'
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : pdf.category === 'TYT'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {pdf.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {pdf.file_size_mb ? `${pdf.file_size_mb} MB` : 'PDF'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                      {pdf.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {pdf.description || 'Açıklama belirtilmemiş.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Soru Sayısı: <strong className="text-slate-800 dark:text-slate-200">{pdf.question_count || 40} Soru</strong></span>
                  <span className="text-[11px] text-slate-400">{new Date(pdf.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <a
                  href={pdf.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>PDF Aç / İncele</span>
                </a>

                {pdf.answer_key && (
                  <button
                    onClick={() => setSelectedAnswerKey({ title: pdf.title, key: pdf.answer_key })}
                    className="inline-flex items-center gap-1.5 py-2 px-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition"
                    title="Cevap Anahtarını Gör"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Cevaplar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Henüz PDF Deneme Yüklenmedi</h3>
          <p className="text-xs text-slate-400 mt-1">Öğrencilerinize göndermek istediğiniz hazır PDF denemeleri yükleyebilirsiniz.</p>
        </div>
      )}

      {/* Cevap Anahtarı Modalı */}
      {selectedAnswerKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSelectedAnswerKey(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Cevap Anahtarı</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedAnswerKey.title}</p>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed max-h-60 overflow-y-auto">
              {selectedAnswerKey.key}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedAnswerKey(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Yükleme Modalı */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yeni Hazır PDF Deneme Yükle</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Sınav kitapçığını ve isteğe bağlı cevap anahtarını sisteme ekleyin.</p>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* PDF Dosyası Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">PDF Dosyası Seç *</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer relative bg-slate-50 dark:bg-slate-800/50">
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                        if (!title) setTitle(e.target.files[0].name.replace('.pdf', ''));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-8 h-8 text-rose-500 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {file ? file.name : 'PDF Dosyasını Sürükleyin veya Seçin'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Yalnızca .pdf uzantılı dosyalar</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deneme Başlığı *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 2026 AYT Matematik Özdebir Prova Denemesi"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AYT">AYT Denemesi</option>
                    <option value="TYT">TYT Denemesi</option>
                    <option value="Konu_Tarama">Konu Tarama Testi</option>
                    <option value="LGS">LGS Matematik</option>
                    <option value="Diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Soru Sayısı</label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama / Yayın Bilgisi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn: 3D Yayınları Türkiye Geneli 1. Deneme Matematik Bölümü"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cevap Anahtarı (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  placeholder="Örn: 1.C, 2.A, 3.D, 4.B, 5.E, 6.A..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Yükleniyor...' : 'Denemeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

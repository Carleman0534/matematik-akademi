'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Key,
  Search,
  Filter,
  BookOpen,
  X
} from 'lucide-react';

export default function OgrenciPdfDenemelerPage() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedAnswerKey, setSelectedAnswerKey] = useState<{ title: string; key: string } | null>(null);

  const fetchPdfs = async () => {
    try {
      const url = categoryFilter === 'ALL' ? '/api/exam-pdfs' : `/api/exam-pdfs?category=${categoryFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.pdfs) setPdfs(data.pdfs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, [categoryFilter]);

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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hazır Denemeler & PDF Kütüphanesi</h1>
          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
            Öğrenci Kaynakları
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Öğretmeninizin sizin için yüklediği hazır prova denemelerini, Türkiye geneli sınavları ve konu tarama PDF'lerini inceleyebilir veya indirebilirsiniz.
        </p>
      </div>

      {/* Arama & Kategori Filtresi */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Deneme adı veya konu ara..."
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
                  <span>PDF Görüntüle</span>
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
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Henüz PDF Deneme Bulunmuyor</h3>
          <p className="text-xs text-slate-400 mt-1">Öğretmeniniz yeni hazır PDF deneme yüklediğinde burada görebileceksiniz.</p>
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
    </div>
  );
}

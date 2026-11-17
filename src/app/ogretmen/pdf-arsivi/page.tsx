'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  UploadCloud,
  Eye,
  Trash2,
  Archive,
  Search,
  Filter,
  CheckCircle2,
  X,
  Play,
  Layers,
  BookOpen,
  FolderArchive,
  AlertTriangle
} from 'lucide-react';

export default function PdfArsiviPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('deneme');
  const [gradeLevel, setGradeLevel] = useState('TYT');
  const [subject, setSubject] = useState('Matematik');
  const [topic, setTopic] = useState('');
  const [publisher, setPublisher] = useState('');
  const [description, setDescription] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [questionCount, setQuestionCount] = useState('40');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      let url = `/api/pdf-documents?fileType=${fileTypeFilter}&gradeLevel=${gradeFilter}&isArchived=${showArchived}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.docs) setDocs(data.docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [fileTypeFilter, gradeFilter, showArchived]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Lütfen bir PDF dosyası seçin.');
      return;
    }
    setError('');
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('fileType', fileType);
      formData.append('gradeLevel', gradeLevel);
      formData.append('subject', subject);
      formData.append('topic', topic);
      formData.append('publisher', publisher);
      formData.append('description', description);
      formData.append('answerKey', answerKey);
      formData.append('questionCount', questionCount);

      setUploadProgress(60);
      const res = await fetch('/api/pdf-documents', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);
      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setShowUploadModal(false);
          setIsUploading(false);
          setUploadProgress(0);
          setFile(null);
          setTitle('');
          setDescription('');
          setAnswerKey('');
          fetchDocs();
        }, 400);
      } else {
        const d = await res.json();
        setError(d.error || 'Yükleme başarısız oldu.');
        setIsUploading(false);
      }
    } catch {
      setError('Ağ hatası oluştu.');
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pdf-documents?id=${id}&action=delete`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmDoc(null);
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string, isCurrentlyArchived: boolean) => {
    try {
      const action = isCurrentlyArchived ? 'unarchive' : 'archive';
      const res = await fetch(`/api/pdf-documents?id=${id}&action=${action}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const fileTypeBadges: Record<string, { label: string; color: string }> = {
    deneme: { label: 'Deneme', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
    soru_bankasi: { label: 'Soru Bankası', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    cevap_anahtari: { label: 'Cevap Anahtarı', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    cozum: { label: 'Çözüm Dokümanı', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    calisma_foyu: { label: 'Çalışma Föyü', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    diger: { label: 'Diğer', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">PDF ve Deneme Arşivi</h1>
            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {docs.length} Doküman
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Deneme sınavları, soru bankaları, cevap anahtarları ve çalışma föylerini yükleyin, yönetin ve tek tıkla toplu sınav olarak atayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <Play className="w-4 h-4" />
            <span>Toplu Sınav Başlat</span>
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Yeni PDF Yükle</span>
          </button>
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocs()}
            placeholder="Başlık, konu veya yayın ara..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Tür Filtresi */}
          <select
            value={fileTypeFilter}
            onChange={(e) => setFileTypeFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Tüm Dosya Türleri</option>
            <option value="deneme">Denemeler</option>
            <option value="soru_bankasi">Soru Bankaları</option>
            <option value="calisma_foyu">Çalışma Föyleri</option>
            <option value="cevap_anahtari">Cevap Anahtarları</option>
            <option value="cozum">Çözüm Dokümanları</option>
          </select>

          {/* Sınıf / Seviye Filtresi */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">Tüm Seviyeler</option>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
            <option value="LGS">LGS</option>
            <option value="12">12. Sınıf</option>
            <option value="11">11. Sınıf</option>
            <option value="10">10. Sınıf</option>
            <option value="9">9. Sınıf</option>
          </select>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              showArchived
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? 'Arşivlenenler Açık' : 'Arşiv'}</span>
          </button>
        </div>
      </div>

      {/* Doküman Listesi */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {docs.map((doc) => {
            const badge = fileTypeBadges[doc.file_type] || fileTypeBadges.diger;
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.color}`}>
                      {badge.label} · {doc.grade_level}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {doc.file_size_mb ? `${doc.file_size_mb} MB` : 'PDF'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {doc.description || doc.topic || 'Açıklama belirtilmemiş.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Yayın: <strong className="text-slate-800 dark:text-slate-200">{doc.publisher || 'Belirtilmedi'}</strong></span>
                    <span>{doc.question_count ? `${doc.question_count} Soru` : ''}</span>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önizle</span>
                  </a>

                  <Link
                    href={`/ogretmen/denemeler/toplu-ata?pdfId=${doc.id}&title=${encodeURIComponent(doc.title)}`}
                    className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition"
                    title="Bu PDF'yi Öğrencilere Sınav Olarak Ata"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Ata</span>
                  </Link>

                  <button
                    onClick={() => handleArchive(doc.id, !!doc.is_archived)}
                    className="p-2 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={doc.is_archived ? 'Arşivden Çıkar' : 'Arşivle'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmDoc(doc)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FolderArchive className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Arşivde PDF Bulunamadı</h3>
          <p className="text-xs text-slate-400 mt-1">Öğrencileriniz için deneme, föy veya soru bankası PDF'leri yükleyebilirsiniz.</p>
        </div>
      )}

      {/* Silme Güvenlik Onayı Modalı */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Dokümanı Silmek İstiyor musunuz?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>{deleteConfirmDoc.title}</strong> isimli PDF arşivenizden kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmDoc.id)}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm"
              >
                Evet, Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Çoklu / Tekli PDF Yükleme Modalı */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Arşive Yeni PDF Dokümanı Yükle</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Soru bankası, deneme sınavı, cevap anahtarı veya çalışma föyü yükleyin.</p>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Sürükle Bırak PDF Alanı */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">PDF Dosyası Seç *</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer relative bg-slate-50 dark:bg-slate-800/50">
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setFile(f);
                        if (!title) setTitle(f.name.replace('.pdf', ''));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-8 h-8 text-rose-500 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {file ? file.name : 'PDF Dosyasını Sürükleyip Bırakın veya Seçin'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Yalnızca PDF formatı desteklenir</div>
                </div>
              </div>

              {isUploading && (
                <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Doküman Başlığı *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 2026 AYT Matematik Türkiye Geneli Prova Denemesi"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Doküman Türü</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="deneme">Deneme Sınavı</option>
                    <option value="soru_bankasi">Soru Bankası</option>
                    <option value="calisma_foyu">Çalışma Föyü</option>
                    <option value="cevap_anahtari">Cevap Anahtarı</option>
                    <option value="cozum">Çözüm Dokümanı</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sınıf / Seviye</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="TYT">TYT</option>
                    <option value="AYT">AYT</option>
                    <option value="LGS">LGS</option>
                    <option value="12">12. Sınıf</option>
                    <option value="11">11. Sınıf</option>
                    <option value="10">10. Sınıf</option>
                    <option value="9">9. Sınıf</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kaynak / Yayın</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Örn: 3D, Özdebir, MEB"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Soru Sayısı</label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama / Konu</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn: Fonksiyonlar ve Parabol Özel Tarama Testi"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cevap Anahtarı (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  placeholder="Örn: 1.C, 2.A, 3.D, 4.B, 5.E..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
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
                  disabled={isUploading}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUploading ? 'Yükleniyor...' : 'Arşive Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

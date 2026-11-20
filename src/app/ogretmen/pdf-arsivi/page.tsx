'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  UploadCloud,
  Eye,
  Trash2,
  Archive,
  Search,
  CheckCircle2,
  X,
  Play,
  FolderArchive,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Plus,
  BookOpen,
  FileCheck,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { PdfDocument } from '@/lib/pdfDocs';
import { SubTabBar } from '@/components/SubTabBar';
import {
  saveClientPdfDoc,
  getClientPdfDocs,
  getClientPdfBlob,
  removeClientPdfDoc,
  mergeClientAndServerDocs,
} from '@/lib/clientPdfStorage';

interface FileQueueItem {
  file: File;
  title: string;
  fileType: string;
  gradeLevel: string;
  sizeMb: number;
}

export default function PdfArsiviPage() {
  const [docs, setDocs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<PdfDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  // Upload Form & Queue State
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [subject, setSubject] = useState('Matematik');
  const [topic, setTopic] = useState('');
  const [publisher, setPublisher] = useState('');
  const [description, setDescription] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [questionCount, setQuestionCount] = useState('40');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/pdf-documents?fileType=${fileTypeFilter}&gradeLevel=${gradeFilter}&isArchived=${showArchived}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('PDF dokümanları yüklenirken sunucu yanıt vermedi:', res.status);
        const local = getClientPdfDocs();
        if (local.length > 0) setDocs(local);
        return;
      }
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn('PDF yanıtı JSON olarak ayrıştırılamadı.');
        const local = getClientPdfDocs();
        if (local.length > 0) setDocs(local);
        return;
      }
      if (data?.docs) {
        const merged = mergeClientAndServerDocs(data.docs);
        setDocs(merged);
      } else {
        const local = getClientPdfDocs();
        if (local.length > 0) setDocs(local);
      }
    } catch (err) {
      console.error('fetchDocs hatası:', err);
      const local = getClientPdfDocs();
      if (local.length > 0) setDocs(local);
    } finally {
      setLoading(false);
    }
  }, [fileTypeFilter, gradeFilter, showArchived, search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Dosya Ekleme ve Doğrulama
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const newItems: FileQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        setError('Yalnızca PDF formatındaki dosyalar yüklenebilir.');
        continue;
      }
      const sizeMb = parseFloat((f.size / (1024 * 1024)).toFixed(2));
      if (sizeMb > 50) {
        setError(`"${f.name}" dosya boyutu 50MB sınırını aşıyor (${sizeMb} MB).`);
        continue;
      }

      newItems.push({
        file: f,
        title: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        fileType: 'deneme',
        gradeLevel: 'TYT',
        sizeMb,
      });
    }

    setFileQueue((prev) => [...prev, ...newItems]);
  };

  const handleUploadAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileQueue.length === 0) {
      setError('Lütfen yüklenecek en az bir PDF dosyası seçin.');
      return;
    }
    setError('');
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatusText('Yükleme başlatılıyor...');

    try {
      const total = fileQueue.length;
      const CHUNK_SIZE = 1.8 * 1024 * 1024; // 1.8 MB (Vercel 4.5MB sınırının çok altında, güvenli ve hızlı)

      for (let i = 0; i < total; i++) {
        const item = fileQueue[i];
        const file = item.file;
        const filePrefix = total > 1 ? `[${i + 1}/${total}] ` : '';

        let savedDoc: PdfDocument | null = null;

        // 2 MB'den büyük dosyalar için otomatik Parçalı Yükleme (Chunked Upload)
        if (file.size > 2 * 1024 * 1024) {
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          for (let c = 0; c < totalChunks; c++) {
            const start = c * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunkBlob = file.slice(start, end);

            const chunkForm = new FormData();
            chunkForm.append('chunk', chunkBlob, file.name);
            chunkForm.append('uploadId', uploadId);
            chunkForm.append('chunkIndex', String(c));
            chunkForm.append('totalChunks', String(totalChunks));
            chunkForm.append('fileName', file.name);
            chunkForm.append('title', item.title);
            chunkForm.append('fileType', item.fileType);
            chunkForm.append('gradeLevel', item.gradeLevel);
            chunkForm.append('subject', subject);
            chunkForm.append('topic', topic);
            chunkForm.append('publisher', publisher);
            chunkForm.append('description', description);
            chunkForm.append('answerKey', answerKey);
            chunkForm.append('questionCount', questionCount);

            const chunkPercent = Math.round(((c + 0.5) / totalChunks) * 100);
            const overallPercent = Math.round(((i + (c / totalChunks)) / total) * 100);
            setUploadProgress(Math.max(5, overallPercent));
            setUploadStatusText(`${filePrefix}Parça ${c + 1}/${totalChunks} yükleniyor (%${chunkPercent})...`);

            try {
              const res = await fetch('/api/pdf-documents/upload-chunk', {
                method: 'POST',
                body: chunkForm,
              });

              const text = await res.text();
              let d: any = null;
              try {
                d = JSON.parse(text);
              } catch {}

              if (res.ok && c === totalChunks - 1 && d?.doc) {
                savedDoc = d.doc;
              }
            } catch (chunkErr) {
              console.warn(`[Parça ${c + 1}/${totalChunks}] Sunucu bildirim uyarısı:`, chunkErr);
            }
          }
        } else {
          // 2 MB altındaki küçük dosyalar için doğrudan yükleme
          setUploadStatusText(`${filePrefix}"${item.title}" yükleniyor...`);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', item.title);
          formData.append('fileType', item.fileType);
          formData.append('gradeLevel', item.gradeLevel);
          formData.append('subject', subject);
          formData.append('topic', topic);
          formData.append('publisher', publisher);
          formData.append('description', description);
          formData.append('answerKey', answerKey);
          formData.append('questionCount', questionCount);

          const res = await fetch('/api/pdf-documents', {
            method: 'POST',
            body: formData,
          });

          const text = await res.text();
          let d: any = null;
          try {
            d = JSON.parse(text);
          } catch {
            if (res.status === 413 || text.includes('Request Entity Too Large')) {
              throw new Error('Dosya boyutu sunucu sınırını aştı (4.5 MB). Lütfen parçalı yükleme için sayfayı yenileyin.');
            }
            throw new Error(text.slice(0, 120) || `Sunucu hatası (${res.status})`);
          }

          if (!res.ok) {
            throw new Error(d?.error || `"${item.title}" yüklenemedi.`);
          }

          if (d?.doc) {
            savedDoc = d.doc;
          }
        }

        // Eğer sunucu bir doc nesnesi döndüyse veya oluşturulduysa yerel hafızaya kaydet
        const finalDoc: PdfDocument = savedDoc || {
          id: `doc_${Date.now()}_${i}`,
          teacher_id: 'teacher-admin',
          title: item.title,
          file_name: file.name,
          file_path: `/api/pdf-documents/doc_${Date.now()}_${i}/file`,
          file_type: item.fileType as any,
          grade_level: item.gradeLevel,
          subject: subject || 'Matematik',
          topic: topic || '',
          publisher: publisher || '',
          file_size_mb: item.sizeMb,
          page_count: Math.max(1, Math.round(item.sizeMb * 4)),
          description: description || '',
          answer_key: answerKey || '',
          question_count: parseInt(questionCount, 10) || 40,
          is_archived: 0,
          created_at: new Date().toISOString(),
        };

        // Yerel depolamaya (IndexedDB + localStorage) anında kaydet
        await saveClientPdfDoc(finalDoc, file);

        // React durumuna anında ekle (kullanıcı hemen listede görsün)
        setDocs((prev) => [finalDoc, ...prev.filter((d) => d.id !== finalDoc.id)]);

        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      setUploadStatusText('Yükleme tamamlandı!');
      setUploadProgress(100);

      setTimeout(() => {
        setShowUploadModal(false);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText('');
        setFileQueue([]);
        setDescription('');
        setAnswerKey('');
        fetchDocs();
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Yükleme başarısız oldu.');
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeClientPdfDoc(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
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
    deneme: { label: 'Deneme Sınavı', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
    soru_bankasi: { label: 'Soru Bankası', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    cevap_anahtari: { label: 'Cevap Anahtarı', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    cozum: { label: 'Çözüm Dokümanı', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    calisma_foyu: { label: 'Çalışma Föyü', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    diger: { label: 'Diğer', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  };

  const PDF_TABS = [
    { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁', count: docs.length },
    { href: '/ogretmen/deneme-olustur', label: 'Akıllı Deneme Oluştur', icon: '✨', badge: 'AI & PDF' },
    { href: '/ogretmen/pdf-analiz', label: 'LGS PDF Analiz & Soru Çıkarıcı', icon: '🔍', badge: 'AI Destekli' },
    { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="PDF & Doküman Arşivi"
        description="Deneme sınavları, soru bankaları, cevap anahtarları ve AI analiz merkezi"
        tabs={PDF_TABS}
      />

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

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ogretmen/deneme-olustur"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Akıllı Deneme Oluştur (AI & PDF)</span>
          </Link>

          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <Play className="w-4 h-4" />
            <span>Toplu Sınav Başlat</span>
          </Link>

          <button
            onClick={() => {
              setFileQueue([]);
              setError('');
              setShowUploadModal(true);
            }}
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
        <div className="p-12 text-center text-xs text-slate-400">Yükleniyor...</div>
      ) : docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => {
            const badge = fileTypeBadges[doc.file_type] || fileTypeBadges.diger;
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      {doc.grade_level && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {doc.grade_level}
                        </span>
                      )}
                    </div>
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
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={async () => {
                      let safeUrl = '';
                      const blob = await getClientPdfBlob(doc.id);
                      if (blob) {
                        safeUrl = URL.createObjectURL(blob);
                      } else {
                        safeUrl = doc.file_path && (doc.file_path.startsWith('/api') || doc.file_path.startsWith('http') || doc.file_path.startsWith('data:'))
                          ? doc.file_path
                          : `/api/pdf-documents/${doc.id}/file`;
                      }
                      setPreviewDoc({ url: safeUrl, title: doc.title });
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önizle</span>
                  </button>

                  <Link
                    href={`/ogretmen/pdf-analiz?pdfId=${doc.id}`}
                    className="inline-flex items-center gap-1 py-2 px-2.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition"
                    title="LGS Yapay Zekâ Analizine Gönder"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="hidden sm:inline">AI</span>
                  </Link>

                  <Link
                    href={`/ogretmen/denemeler/toplu-ata?pdfId=${doc.id}&title=${encodeURIComponent(doc.title)}`}
                    className="inline-flex items-center gap-1.5 py-2 px-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition"
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

      {/* Güvenli Silme Onay Modalı */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Dokümanı Silmek İstiyor musunuz?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>{deleteConfirmDoc.title}</strong> isimli PDF arşivinizden kalıcı olarak silinecektir. Bu işlem geri alınamaz.
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

      {/* PDF Önizleme Modalı */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 transition-all ${
              isPreviewFullscreen ? 'w-full h-full rounded-none' : 'max-w-5xl w-full h-[90vh]'
            }`}
          >
            {/* Önizleme Başlık Barı */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {previewDoc.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  İndir
                </a>
                <button
                  onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title={isPreviewFullscreen ? 'Normal Boyut' : 'Tam Ekran'}
                >
                  {isPreviewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Önizleme Alanı */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              <iframe
                src={`${previewDoc.url}#toolbar=1&navpanes=1`}
                className="w-full h-full rounded-2xl border-0 shadow-inner bg-white"
                title="PDF Önizleme"
              />
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Soru bankası, deneme sınavı, cevap anahtarı veya çalışma föyü yükleyin (Çoklu yükleme ve sürükle-bırak desteklenir).
            </p>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUploadAll} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Sürükle Bırak PDF Alanı */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer relative transition ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Birden fazla PDF seçebilir veya buraya sürükleyebilirsiniz
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Maksimum 50 MB / dosya</div>
              </div>

              {/* Seçilen Dosyalar Listesi & Ad Düzenleme */}
              {fileQueue.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Yüklenecek Dosyalar ({fileQueue.length})</span>
                    <span className="text-[11px] font-normal text-slate-400">Yükleme öncesi başlıkları düzenleyebilirsiniz</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {fileQueue.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-slate-400 truncate">{item.file.name} ({item.sizeMb} MB)</span>
                          <button
                            type="button"
                            onClick={() => setFileQueue(fileQueue.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Listeden Kaldır"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const newQ = [...fileQueue];
                            newQ[idx].title = e.target.value;
                            setFileQueue(newQ);
                          }}
                          placeholder="Deneme / Doküman Başlığı"
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white font-medium"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={item.fileType}
                            onChange={(e) => {
                              const newQ = [...fileQueue];
                              newQ[idx].fileType = e.target.value;
                              setFileQueue(newQ);
                            }}
                            className="text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                          >
                            <option value="deneme">Deneme Sınavı</option>
                            <option value="soru_bankasi">Soru Bankası</option>
                            <option value="calisma_foyu">Çalışma Föyü</option>
                            <option value="cevap_anahtari">Cevap Anahtarı</option>
                            <option value="cozum">Çözüm Dokümanı</option>
                            <option value="diger">Diğer</option>
                          </select>
                          <select
                            value={item.gradeLevel}
                            onChange={(e) => {
                              const newQ = [...fileQueue];
                              newQ[idx].gradeLevel = e.target.value;
                              setFileQueue(newQ);
                            }}
                            className="text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="truncate pr-2">{uploadStatusText || 'Yükleniyor...'}</span>
                    <span>%{uploadProgress}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

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
                  placeholder="Örn: 1.C, 2.A, 3.D, 4.B, 5.E veya ABCDE..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                />
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
                  disabled={isUploading || fileQueue.length === 0}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {isUploading ? 'Yükleniyor...' : `Arşive Kaydet (${fileQueue.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  UploadCloud,
  Layers,
  Sparkles,
  Scissors,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Move,
  Download,
  BookOpen,
  UserCheck,
  Check,
  X,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Zap,
  Grid
} from 'lucide-react';
import type { TopicOption } from '@/lib/topicOptions';

export interface CropBox {
  id: string;
  name: string;
  x: number; // Yüzde (0-100)
  y: number; // Yüzde (0-100)
  width: number; // Yüzde (0-100)
  height: number; // Yüzde (0-100)
}

export interface ExtractedQuestion {
  id: string;
  pageNo: number;
  questionNo: number;
  cropBox: CropBox;
  imageDataUrl: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialStatus: 'wrong' | 'blank';
  teacherNote: string;
  width: number;
  height: number;
}

interface StudentOption {
  id: string;
  full_name: string;
  grade_level: number | null;
}

interface PdfDocOption {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  grade_level?: string;
  publisher?: string;
}

interface Props {
  students: StudentOption[];
  topicOptions: TopicOption[];
  sources: { id: string; name: string }[];
  pdfDocs?: PdfDocOption[];
  initialStudentId?: string;
}

export default function PdfQuestionExtractor({
  students,
  topicOptions,
  sources,
  pdfDocs = [],
  initialStudentId = '',
}: Props) {
  // Kaynak & PDF State
  const [activeTab, setActiveTab] = useState<'upload' | 'archive'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageThumbnails, setPageThumbnails] = useState<{ page: number; thumb: string }[]>([]);

  // Tuval & Kırpma State
  const [cropBoxes, setCropBoxes] = useState<CropBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 1100 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Ayıklanan Sorular Listesi
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // Toplu Ayarlar
  const [commonTopicId, setCommonTopicId] = useState('');
  const [commonStatus, setCommonStatus] = useState<'wrong' | 'blank'>('wrong');
  const [commonDifficulty, setCommonDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Aktarım Hedefleri State
  const [exportTarget, setExportTarget] = useState<'student' | 'exam'>('student');
  const [targetStudentId, setTargetStudentId] = useState(initialStudentId || (students[0]?.id ?? ''));
  const [sourceName, setSourceName] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState('80');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // PDF.JS Kütüphanesini Dinamik Yükle
  const loadPdfJs = async () => {
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '6.5.438'}/pdf.worker.min.mjs`;
      }
    }
    return pdfjs;
  };

  // PDF Dosyasını Yükle ve Sayfaları Tara
  const handlePdfFile = async (file: File) => {
    setSelectedFile(file);
    setPdfTitle(file.name.replace(/\.pdf$/i, ''));
    setSourceName(file.name.replace(/\.pdf$/i, ''));
    setExamTitle(file.name.replace(/\.pdf$/i, '') + ' Denemesi');
    setIsLoadingPdf(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const pdfjs = await loadPdfJs();
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
      const doc = await loadingTask.promise;

      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);

      // İlk birkaç sayfanın önizlemesini hızlıca oluştur
      const thumbs: { page: number; thumb: string }[] = [];
      const thumbMax = Math.min(doc.numPages, 16);
      for (let i = 1; i <= thumbMax; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.2 });
        const c = document.createElement('canvas');
        c.width = vp.width;
        c.height = vp.height;
        const ctx = c.getContext('2d');
        if (ctx) {
          await page.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
          thumbs.push({ page: i, thumb: c.toDataURL('image/jpeg', 0.6) });
        }
      }
      setPageThumbnails(thumbs);

      // İlk sayfayı çiz ve varsayılan TYT 2 sütun şablonunu uygula
      await renderPage(doc, 1);
      applyPreset('tyt_2col_4q', 1);
    } catch (err: any) {
      console.error('PDF yükleme hatası:', err);
      setErrorMessage(`PDF dosyası işlenemedi: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Arşivdeki bir PDF belgesini yükle
  const handleSelectArchiveDoc = async (docOption: PdfDocOption) => {
    setIsLoadingPdf(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPdfTitle(docOption.title);
    setSourceName(docOption.title);
    setExamTitle(docOption.title + ' Denemesi');

    try {
      const res = await fetch(docOption.file_path);
      if (!res.ok) throw new Error('PDF sunucudan indirilemedi.');
      const blob = await res.blob();
      const file = new File([blob], docOption.file_name || 'arsiv.pdf', { type: 'application/pdf' });
      await handlePdfFile(file);
    } catch (err: any) {
      setErrorMessage(`Arşiv PDF'i açılamadı: ${err.message}`);
      setIsLoadingPdf(false);
    }
  };

  // Belirli bir sayfayı ana tuvale çiz
  const renderPage = async (doc: any, pageNumber: number) => {
    if (!doc || !canvasRef.current) return;
    try {
      const page = await doc.getPage(pageNumber);
      const targetWidth = 1400; // Yüksek çözünürlük
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      setCanvasDimensions({ width: canvas.width, height: canvas.height });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Sayfa çizilemedi:', err);
    }
  };

  // Sayfa Değiştiğinde
  const handlePageChange = async (newPage: number) => {
    if (!pdfDoc || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    await renderPage(pdfDoc, newPage);
    // Sayfa değiştiğinde mevcut şablon kutularını bu sayfaya da uygula
    if (cropBoxes.length === 0) {
      applyPreset('tyt_2col_4q', newPage);
    }
  };

  // Akıllı Otomatik Şablonlar (Presets)
  const applyPreset = (
    preset: 'tyt_2col_4q' | '2col_6q' | '1col_3q' | '1col_2q' | 'auto_detect',
    pageNum = currentPage
  ) => {
    const baseNum = (pageNum - 1) * 4 + 1;

    if (preset === 'tyt_2col_4q') {
      // Klasik TYT/AYT 2 Sütun, 4 Soru
      setCropBoxes([
        { id: '1', name: `Soru ${baseNum}`, x: 4, y: 5, width: 44, height: 43 },
        { id: '2', name: `Soru ${baseNum + 1}`, x: 4, y: 51, width: 44, height: 43 },
        { id: '3', name: `Soru ${baseNum + 2}`, x: 52, y: 5, width: 44, height: 43 },
        { id: '4', name: `Soru ${baseNum + 3}`, x: 52, y: 51, width: 44, height: 43 },
      ]);
    } else if (preset === '2col_6q') {
      // 2 Sütun, 6 Soru
      const b6 = (pageNum - 1) * 6 + 1;
      setCropBoxes([
        { id: '1', name: `Soru ${b6}`, x: 4, y: 5, width: 44, height: 28 },
        { id: '2', name: `Soru ${b6 + 1}`, x: 4, y: 35, width: 44, height: 28 },
        { id: '3', name: `Soru ${b6 + 2}`, x: 4, y: 65, width: 44, height: 28 },
        { id: '4', name: `Soru ${b6 + 3}`, x: 52, y: 5, width: 44, height: 28 },
        { id: '5', name: `Soru ${b6 + 4}`, x: 52, y: 35, width: 44, height: 28 },
        { id: '6', name: `Soru ${b6 + 5}`, x: 52, y: 65, width: 44, height: 28 },
      ]);
    } else if (preset === '1col_3q') {
      // Tek Sütun, 3 Soru
      const b3 = (pageNum - 1) * 3 + 1;
      setCropBoxes([
        { id: '1', name: `Soru ${b3}`, x: 6, y: 5, width: 88, height: 28 },
        { id: '2', name: `Soru ${b3 + 1}`, x: 6, y: 35, width: 88, height: 28 },
        { id: '3', name: `Soru ${b3 + 2}`, x: 6, y: 65, width: 88, height: 28 },
      ]);
    } else if (preset === '1col_2q') {
      // Tek Sütun, 2 Soru
      const b2 = (pageNum - 1) * 2 + 1;
      setCropBoxes([
        { id: '1', name: `Soru ${b2}`, x: 6, y: 6, width: 88, height: 43 },
        { id: '2', name: `Soru ${b2 + 1}`, x: 6, y: 51, width: 88, height: 43 },
      ]);
    } else if (preset === 'auto_detect') {
      // Piksel Yoğunluğu Analizi ile Otomatik Boşluk Ayıklama
      autoDetectBoxes(pageNum);
    }
  };

  // Piksel Analizli Akıllı Soru Ayıklama (Whitespace Detector)
  const autoDetectBoxes = (pageNum: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const { width, height } = canvas;
      // Ortada dikey sütun ayrımı var mı kontrol et (x: %45 - %55)
      const midImageData = ctx.getImageData(Math.floor(width * 0.48), 0, Math.floor(width * 0.04), height);
      let isTwoColumn = true;
      let darkCount = 0;
      for (let i = 0; i < midImageData.data.length; i += 4) {
        const r = midImageData.data[i], g = midImageData.data[i + 1], b = midImageData.data[i + 2];
        if (r < 180 && g < 180 && b < 180) darkCount++;
      }
      // Eğer ortada çok fazla metin varsa tek sütundur
      if (darkCount > (midImageData.data.length / 4) * 0.15) {
        isTwoColumn = false;
      }

      if (isTwoColumn) {
        // İki sütun 4 soru şablonunu uyarla
        applyPreset('tyt_2col_4q', pageNum);
      } else {
        // Tek sütun 3 soru şablonunu uyarla
        applyPreset('1col_3q', pageNum);
      }
    } catch (e) {
      applyPreset('tyt_2col_4q', pageNum);
    }
  };

  // Tuval üzerinde mouse ile serbest kutu çizme
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setIsDrawing(true);
    setDrawStart({ x, y });
    const nextId = String(cropBoxes.length + 1);
    const newBox: CropBox = {
      id: nextId,
      name: `Soru ${extractedQuestions.length + cropBoxes.length + 1}`,
      x,
      y,
      width: 1,
      height: 1,
    };
    setCropBoxes([...cropBoxes, newBox]);
    setActiveBoxId(nextId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !containerRef.current || !activeBoxId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const left = Math.min(drawStart.x, currentX);
    const top = Math.min(drawStart.y, currentY);
    const width = Math.max(2, Math.abs(currentX - drawStart.x));
    const height = Math.max(2, Math.abs(currentY - drawStart.y));

    setCropBoxes(prev =>
      prev.map(box => (box.id === activeBoxId ? { ...box, x: left, y: top, width, height } : box))
    );
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDrawStart(null);
  };

  // Kutu Silme
  const handleRemoveBox = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCropBoxes(prev => prev.filter(b => b.id !== id));
    if (activeBoxId === id) setActiveBoxId(null);
  };

  // Belirli bir kutuyu tuvalden kırpıp görsel DataURL üret
  const cropBoxToDataUrl = (
    box: CropBox,
    canvas: HTMLCanvasElement
  ): { dataUrl: string; width: number; height: number } => {
    const naturalWidth = canvas.width;
    const naturalHeight = canvas.height;

    const cropX = Math.floor((box.x / 100) * naturalWidth);
    const cropY = Math.floor((box.y / 100) * naturalHeight);
    const cropW = Math.max(10, Math.floor((box.width / 100) * naturalWidth));
    const cropH = Math.max(10, Math.floor((box.height / 100) * naturalHeight));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return { dataUrl: '', width: cropW, height: cropH };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropW, cropH);
    ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return {
      dataUrl: tempCanvas.toDataURL('image/jpeg', 0.92),
      width: cropW,
      height: cropH,
    };
  };

  // Geçerli Sayfadaki Kutuları Soru Kuyruğuna Ekle
  const handleExtractCurrentPage = () => {
    if (!canvasRef.current || cropBoxes.length === 0) return;
    const canvas = canvasRef.current;

    const newExtracted: ExtractedQuestion[] = [];
    let startQNum = extractedQuestions.length + 1;

    for (const box of cropBoxes) {
      const { dataUrl, width, height } = cropBoxToDataUrl(box, canvas);
      if (!dataUrl) continue;

      newExtracted.push({
        id: crypto.randomUUID(),
        pageNo: currentPage,
        questionNo: startQNum++,
        cropBox: { ...box },
        imageDataUrl: dataUrl,
        correctAnswer: null,
        topicId: commonTopicId || (topicOptions[0]?.id ?? ''),
        difficulty: commonDifficulty,
        initialStatus: commonStatus,
        teacherNote: '',
        width,
        height,
      });
    }

    setExtractedQuestions(prev => [...prev, ...newExtracted]);
    setSuccessMessage(`${newExtracted.length} soru başarıyla ayıklandı ve listeye eklendi.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // TÜM SAYFALARI TOPLU AYIKLA (Otomatik Batch Extract)
  const handleExtractAllPages = async () => {
    if (!pdfDoc || totalPages === 0) return;
    setIsLoadingPdf(true);
    setErrorMessage(null);

    try {
      const allExtracted: ExtractedQuestion[] = [];
      let currentQNum = extractedQuestions.length + 1;

      // Kullanıcının şu anki şablon oranlarını referans alalım (örn. 4 kutulu 2 sütun)
      const templateBoxes = cropBoxes.length > 0 ? cropBoxes : [
        { id: '1', name: 'Soru 1', x: 4, y: 5, width: 44, height: 43 },
        { id: '2', name: 'Soru 2', x: 4, y: 51, width: 44, height: 43 },
        { id: '3', name: 'Soru 3', x: 52, y: 5, width: 44, height: 43 },
        { id: '4', name: 'Soru 4', x: 52, y: 51, width: 44, height: 43 },
      ];

      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDoc.getPage(p);
        const targetWidth = 1400;
        const baseVp = page.getViewport({ scale: 1 });
        const scale = targetWidth / baseVp.width;
        const viewport = page.getViewport({ scale });

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = Math.ceil(viewport.width);
        pageCanvas.height = Math.ceil(viewport.height);
        const pCtx = pageCanvas.getContext('2d');
        if (!pCtx) continue;

        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        await page.render({ canvas: pageCanvas, canvasContext: pCtx, viewport }).promise;

        for (const box of templateBoxes) {
          const { dataUrl, width, height } = cropBoxToDataUrl(box, pageCanvas);
          if (!dataUrl) continue;

          allExtracted.push({
            id: crypto.randomUUID(),
            pageNo: p,
            questionNo: currentQNum++,
            cropBox: { ...box },
            imageDataUrl: dataUrl,
            correctAnswer: null,
            topicId: commonTopicId || (topicOptions[0]?.id ?? ''),
            difficulty: commonDifficulty,
            initialStatus: commonStatus,
            teacherNote: '',
            width,
            height,
          });
        }
      }

      setExtractedQuestions(prev => [...prev, ...allExtracted]);
      setSuccessMessage(`Tüm ${totalPages} sayfa başarıyla tarandı ve toplam ${allExtracted.length} soru ayıklandı!`);
    } catch (err: any) {
      console.error('Toplu tarama hatası:', err);
      setErrorMessage(`Toplu tarama sırasında hata oluştu: ${err.message}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Kuyruktaki bir soruyu güncelle
  const updateQuestion = (id: string, updates: Partial<ExtractedQuestion>) => {
    setExtractedQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  // Kuyruktan soru sil
  const removeQuestion = (id: string) => {
    setExtractedQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Tüm sorulara tek tıkla ortak konu / zorluk ata
  const applyCommonTopicToAll = () => {
    if (!commonTopicId) return;
    setExtractedQuestions(prev => prev.map(q => ({ ...q, topicId: commonTopicId })));
  };

  const applyCommonStatusToAll = () => {
    setExtractedQuestions(prev => prev.map(q => ({ ...q, initialStatus: commonStatus })));
  };

  // Soruları İndir
  const handleDownloadAll = () => {
    if (extractedQuestions.length === 0) return;
    extractedQuestions.forEach((q, idx) => {
      const a = document.createElement('a');
      a.href = q.imageDataUrl;
      a.download = `soru_${q.questionNo || idx + 1}_sayfa_${q.pageNo}.jpg`;
      a.click();
    });
  };

  // HEDEF 1: Öğrencinin Soru Bankasına Aktar
  const handleImportToStudentBank = async () => {
    if (!targetStudentId) {
      setErrorMessage('Lütfen hedef öğrenciyi seçin.');
      return;
    }
    if (extractedQuestions.length === 0) {
      setErrorMessage('Aktarılacak ayıklanmış soru bulunmuyor.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitProgress({ current: 0, total: extractedQuestions.length });

    try {
      const payload = {
        studentId: targetStudentId,
        sourceName: sourceName || pdfTitle || 'PDF İçe Aktarım',
        questions: extractedQuestions.map(q => ({
          questionNo: String(q.questionNo),
          topicId: q.topicId || null,
          initialStatus: q.initialStatus,
          difficulty: q.difficulty,
          correctAnswer: q.correctAnswer,
          teacherNote: q.teacherNote,
          imageBase64: q.imageDataUrl,
          width: q.width,
          height: q.height,
        })),
      };

      const res = await fetch('/api/questions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sorular aktarılamadı.');
      }

      const targetStudent = students.find(s => s.id === targetStudentId);
      setSuccessMessage(
        `🎉 ${data.createdCount} soru başarıyla ${targetStudent?.full_name || 'öğrenci'}nin soru bankasına eklendi!`
      );
      setExtractedQuestions([]);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Sorular aktarılırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  // HEDEF 2: Yeni Deneme Sınavı Oluştur
  const handleCreateExamFromQuestions = async () => {
    if (!examTitle.trim()) {
      setErrorMessage('Lütfen deneme sınavı için bir başlık girin.');
      return;
    }
    if (extractedQuestions.length === 0) {
      setErrorMessage('Deneme oluşturmak için en az 1 soru ayıklamalısınız.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        title: examTitle.trim(),
        durationMin: parseInt(examDuration) || 80,
        mode: 'assignment',
        penaltyDivisor: 4,
        questions: extractedQuestions.map(q => ({
          questionNo: q.questionNo,
          correctAnswer: q.correctAnswer,
          topicId: q.topicId || null,
          imageBase64: q.imageDataUrl,
          width: q.width,
          height: q.height,
        })),
      };

      const res = await fetch('/api/exams/from-extracted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Deneme oluşturulamadı.');
      }

      setSuccessMessage(`🎉 ${data.questionCount} soruluk deneme sınavı başarıyla oluşturuldu!`);
      // 1.5 sn sonra deneme detay sayfasına yönlendir
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/ogretmen/denemeler';
      }, 1200);
    } catch (err: any) {
      console.error('Exam creation error:', err);
      setErrorMessage(err.message || 'Deneme oluşturulurken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-bold">
              ✂️
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Akıllı PDF Soru Ayıklayıcı & İçe Aktarma
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dışarıdan eklediğiniz PDF test ve denemelerindeki soruları otomatik ayrıştırın, öğrencinin soru bankasına aktarın veya anında yeni deneme sınavı oluşturun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ogretmen/pdf-arsivi"
            className="btn btn-outline text-xs flex items-center gap-1.5"
          >
            <BookOpen className="h-4 w-4" /> PDF Arşivi
          </Link>
          <Link
            href="/ogretmen/deneme-olustur"
            className="btn btn-outline text-xs flex items-center gap-1.5"
          >
            <Layers className="h-4 w-4" /> Deneme Oluştur
          </Link>
        </div>
      </div>

      {/* Bildirim Mesajları */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* ADIM 1: PDF Seçimi (Eğer henüz PDF seçilmediyse veya değiştirmek için) */}
      {!pdfDoc && (
        <div className="card space-y-4">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="h-4 w-4" /> Bilgisayardan PDF Yükle
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 ${
                activeTab === 'archive'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="h-4 w-4" /> PDF Arşivinden Seç ({pdfDocs.length})
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                id="pdf-upload-input"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfFile(f);
                }}
              />
              <label
                htmlFor="pdf-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                    PDF Deneme veya Test Dosyasını Seçin ya da Buraya Sürükleyin
                  </p>
                  <p className="text-xs text-slate-500">
                    ÖSYM TYT / AYT, MEB veya Yayın evi soru bankası PDF'leri (Maksimum 60 MB)
                  </p>
                </div>
                <span className="btn btn-primary text-xs px-4 py-2 mt-2">
                  Dosya Gözat
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              {pdfDocs.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Arşivde henüz kayıtlı PDF belgesi yok.{' '}
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Bilgisayarınızdan yükleyin
                  </button>
                  .
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pdfDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="card p-4 hover:border-indigo-500 cursor-pointer transition-all flex flex-col justify-between"
                      onClick={() => handleSelectArchiveDoc(doc)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {doc.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                          {doc.grade_level && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                              {doc.grade_level}
                            </span>
                          )}
                          {doc.publisher && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium">
                              {doc.publisher}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-primary text-xs w-full mt-3 flex items-center justify-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Bu PDF'i Ayıkla
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF YÜKLENDİ: ÇALIŞMA STÜDYOSU (STUDIO WORKSPACE) */}
      {pdfDoc && (
        <div className="space-y-6">
          {/* Üst Bilgi ve Hızlı Araç Çubuğu */}
          <div className="card p-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 dark:text-white">{pdfTitle}</h2>
                <p className="text-xs text-slate-500">
                  Toplam {totalPages} Sayfa · Şu an Sayfa {currentPage} görüntüleniyor
                </p>
              </div>
            </div>

            {/* Sayfa Gezgini */}
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || isLoadingPdf}
                onClick={() => handlePageChange(currentPage - 1)}
                className="btn btn-outline text-xs px-2.5 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Önceki
              </button>
              <span className="text-xs font-bold px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages || isLoadingPdf}
                onClick={() => handlePageChange(currentPage + 1)}
                className="btn btn-outline text-xs px-2.5 py-1.5 disabled:opacity-40"
              >
                Sonraki <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setPdfDoc(null);
                  setSelectedFile(null);
                  setCropBoxes([]);
                }}
                className="btn btn-ghost text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-2"
              >
                PDF Değiştir
              </button>
            </div>
          </div>

          {/* Sayfa Tırnakları Çubuğu (Carousel Thumbnails) */}
          {pageThumbnails.length > 0 && (
            <div className="overflow-x-auto pb-2 flex gap-2">
              {pageThumbnails.map(thumb => (
                <button
                  key={thumb.page}
                  onClick={() => handlePageChange(thumb.page)}
                  className={`flex flex-col items-center shrink-0 p-1 rounded-xl border transition-all ${
                    currentPage === thumb.page
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white dark:bg-slate-900'
                  }`}
                >
                  <img
                    src={thumb.thumb}
                    alt={`Sayfa ${thumb.page}`}
                    className="h-20 w-14 object-cover rounded border border-slate-100 dark:border-slate-800"
                  />
                  <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-400">
                    S. {thumb.page}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ANA ÇALIŞMA ALANI: SOLDA TUVAL, SAĞDA KONTROLLER VE KUYRUK */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* SOL KOLON: TUVAL & KIRPMA KUTULARI (7 Kolon) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Algılama Modları Şablon Butonları */}
              <div className="card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Akıllı Soru Algılama Şablonu:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sayfadaki {cropBoxes.length} soru kutusu tanımlı
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => applyPreset('tyt_2col_4q')}
                    className="btn btn-outline text-xs py-1 px-2.5 hover:border-indigo-500 hover:text-indigo-600"
                  >
                    ⚡ TYT 2 Sütun (4 Soru)
                  </button>
                  <button
                    onClick={() => applyPreset('2col_6q')}
                    className="btn btn-outline text-xs py-1 px-2.5 hover:border-indigo-500 hover:text-indigo-600"
                  >
                    ⚡ 2 Sütun (6 Soru)
                  </button>
                  <button
                    onClick={() => applyPreset('1col_3q')}
                    className="btn btn-outline text-xs py-1 px-2.5 hover:border-indigo-500 hover:text-indigo-600"
                  >
                    ⚡ Tek Sütun (3 Soru)
                  </button>
                  <button
                    onClick={() => applyPreset('1col_2q')}
                    className="btn btn-outline text-xs py-1 px-2.5 hover:border-indigo-500 hover:text-indigo-600"
                  >
                    ⚡ Tek Sütun (2 Soru)
                  </button>
                  <button
                    onClick={() => applyPreset('auto_detect')}
                    className="btn btn-outline text-xs py-1 px-2.5 hover:border-indigo-500 hover:text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                  >
                    🔍 Otomatik Algıla
                  </button>
                </div>
              </div>

              {/* Tuval Konteyneri */}
              <div
                ref={containerRef}
                className="relative border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 shadow-md select-none"
                style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* PDF Sayfası Canvas'ı */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto block pointer-events-none"
                />

                {/* Soru Kırpma Kutuları Overlay */}
                {cropBoxes.map(box => (
                  <div
                    key={box.id}
                    onClick={e => {
                      e.stopPropagation();
                      setActiveBoxId(box.id);
                    }}
                    className={`absolute border-2 rounded-lg transition-colors flex flex-col justify-between p-1.5 ${
                      activeBoxId === box.id
                        ? 'border-indigo-600 bg-indigo-500/20 ring-2 ring-indigo-400'
                        : 'border-rose-500 bg-rose-500/15 hover:bg-rose-500/25'
                    }`}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-900/80 text-white text-[11px] font-black px-2 py-0.5 rounded shadow">
                        {box.name}
                      </span>
                      <button
                        onClick={e => handleRemoveBox(box.id, e)}
                        className="bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-700"
                        title="Kutuyu Sil"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex justify-between items-end opacity-75 text-[10px] text-slate-800 dark:text-slate-200 font-mono">
                      <span>✂️ Kırpma Alanı</span>
                      <Move className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tuval Altı Hızlı Butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-xs text-slate-500">
                  💡 İpucu: Sayfa üzerinde fareyi basılı tutup sürükleyerek yeni soru kutusu çizebilirsiniz.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExtractCurrentPage}
                    className="btn btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow"
                  >
                    <Scissors className="h-4 w-4" /> Bu Sayfadaki ({cropBoxes.length}) Soruyu Ekle
                  </button>

                  <button
                    onClick={handleExtractAllPages}
                    className="btn btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Zap className="h-4 w-4" /> Tüm ({totalPages}) Sayfayı Otomatik Tara
                  </button>
                </div>
              </div>
            </div>

            {/* SAĞ KOLON: AYIKLANAN SORULAR KUYRUĞU & HEDEFE AKTARIM (5 Kolon) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Başlık ve Toplu Eylemler */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-black text-xs">
                      {extractedQuestions.length}
                    </span>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Ayıklanan Sorular ({extractedQuestions.length})
                    </h3>
                  </div>

                  {extractedQuestions.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleDownloadAll}
                        title="Tüm Kırpılmış Görselleri İndir"
                        className="btn btn-ghost text-xs p-1.5 text-slate-600 hover:text-indigo-600"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setExtractedQuestions([])}
                        title="Listeyi Temizle"
                        className="btn btn-ghost text-xs p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Toplu Atama Araçları */}
                {extractedQuestions.length > 0 && (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ⚡ Tüm Sorulara Ortak Ata:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={commonTopicId}
                          onChange={e => {
                            setCommonTopicId(e.target.value);
                            if (e.target.value) {
                              setExtractedQuestions(prev =>
                                prev.map(q => ({ ...q, topicId: e.target.value }))
                              );
                            }
                          }}
                          className="input text-xs py-1"
                        >
                          <option value="">Ortak Konu Seçin</option>
                          {topicOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {'\u00A0'.repeat(opt.depth * 2)}{opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={commonStatus}
                          onChange={e => {
                            const val = e.target.value as 'wrong' | 'blank';
                            setCommonStatus(val);
                            setExtractedQuestions(prev =>
                              prev.map(q => ({ ...q, initialStatus: val }))
                            );
                          }}
                          className="input text-xs py-1"
                        >
                          <option value="wrong">Yanlış Çözülen</option>
                          <option value="blank">Boş Bırakılan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sorular Listesi Akordeon / Kartlar */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {extractedQuestions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
                      <Scissors className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Henüz soru ayıklanmadı
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Soldaki sayfadan "Bu Sayfadaki Soruları Ekle" veya "Tüm Sayfaları Otomatik Tara" butonuna basın.
                      </p>
                    </div>
                  ) : (
                    extractedQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-sm space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">
                            Soru #{q.questionNo || idx + 1}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Sayfa {q.pageNo})
                            </span>
                          </span>

                          <button
                            onClick={() => removeQuestion(q.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Önizleme Görseli */}
                        <div className="relative group rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-center">
                          <img
                            src={q.imageDataUrl}
                            alt={`Soru ${q.questionNo}`}
                            className="max-h-36 object-contain"
                          />
                          <button
                            onClick={() => setPreviewModalImg(q.imageDataUrl)}
                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                          >
                            <Eye className="h-4 w-4 mr-1" /> Büyüt
                          </button>
                        </div>

                        {/* Hızlı Doğru Cevap Tuşları */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Doğru Cevap:
                          </span>
                          <div className="flex gap-1">
                            {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => (
                              <button
                                key={letter}
                                onClick={() =>
                                  updateQuestion(q.id, {
                                    correctAnswer: q.correctAnswer === letter ? null : letter,
                                  })
                                }
                                className={`h-6 w-6 rounded text-xs font-bold transition-all ${
                                  q.correctAnswer === letter
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Konu ve Zorluk Seçimi */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <select
                            value={q.topicId}
                            onChange={e => updateQuestion(q.id, { topicId: e.target.value })}
                            className="input text-xs py-1"
                          >
                            <option value="">Konu Seçin</option>
                            {topicOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {'\u00A0'.repeat(opt.depth * 2)}{opt.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={q.difficulty}
                            onChange={e =>
                              updateQuestion(q.id, {
                                difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                              })
                            }
                            className="input text-xs py-1"
                          >
                            <option value="easy">Kolay</option>
                            <option value="medium">Orta</option>
                            <option value="hard">Zor</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* HEDEFE AKTARIM PANELİ (EXPORT ACCORDION) */}
              {extractedQuestions.length > 0 && (
                <div className="card p-4 space-y-4 border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between border-b pb-2 border-indigo-100 dark:border-indigo-900">
                    <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      🚀 İçe Aktarma Hedefi Seçin:
                    </span>
                    <div className="flex rounded-lg border border-indigo-300 dark:border-indigo-700 overflow-hidden text-xs">
                      <button
                        onClick={() => setExportTarget('student')}
                        className={`px-3 py-1 font-bold ${
                          exportTarget === 'student'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Öğrenci Soru Bankası
                      </button>
                      <button
                        onClick={() => setExportTarget('exam')}
                        className={`px-3 py-1 font-bold ${
                          exportTarget === 'exam'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Yeni Deneme Sınavı
                      </button>
                    </div>
                  </div>

                  {/* 1. Seçenek: Öğrenci Soru Bankası */}
                  {exportTarget === 'student' && (
                    <div className="space-y-3">
                      <div>
                        <label className="label text-xs font-bold">Hedef Öğrenci</label>
                        <select
                          value={targetStudentId}
                          onChange={e => setTargetStudentId(e.target.value)}
                          className="input text-xs"
                        >
                          <option value="">Öğrenci Seçin</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.full_name} {s.grade_level ? `(${s.grade_level}. Sınıf)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label text-xs font-bold">Kaynak Adı / Kitap</label>
                        <input
                          type="text"
                          value={sourceName}
                          onChange={e => setSourceName(e.target.value)}
                          placeholder="Örn: 345 TYT Denemesi 1"
                          className="input text-xs"
                        />
                      </div>

                      <button
                        disabled={isSubmitting || !targetStudentId}
                        onClick={handleImportToStudentBank}
                        className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Sorular Aktarılıyor...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" /> Seçilen {extractedQuestions.length} Soruyu Soru Bankasına Aktar
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* 2. Seçenek: Yeni Deneme Sınavı */}
                  {exportTarget === 'exam' && (
                    <div className="space-y-3">
                      <div>
                        <label className="label text-xs font-bold">Deneme Başlığı</label>
                        <input
                          type="text"
                          value={examTitle}
                          onChange={e => setExamTitle(e.target.value)}
                          placeholder="Örn: Mart TYT Matematik Denemesi 1"
                          className="input text-xs"
                        />
                      </div>

                      <div>
                        <label className="label text-xs font-bold">Sınav Süresi (Dakika)</label>
                        <input
                          type="number"
                          value={examDuration}
                          onChange={e => setExamDuration(e.target.value)}
                          className="input text-xs"
                        />
                      </div>

                      <button
                        disabled={isSubmitting || !examTitle.trim()}
                        onClick={handleCreateExamFromQuestions}
                        className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Deneme Oluşturuluyor...
                          </>
                        ) : (
                          <>
                            <Layers className="h-4 w-4" /> {extractedQuestions.length} Soruluk Deneme Sınavı Oluştur
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BÜYÜTÜLMÜŞ GÖRSEL ÖNİZLEME MODALI */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-4 space-y-3 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                Soru Önizlemesi
              </h3>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center">
              <img
                src={previewModalImg}
                alt="Önizleme"
                className="max-w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

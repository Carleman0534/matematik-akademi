'use client';

import React, { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getClientPdfDocs } from '@/lib/clientPdfStorage';
import { resolveAnswerSheet } from '@/lib/pdfExtraction/answerSheet';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  Save,
  Award,
  Sparkles,
  Copy,
  ExternalLink,
  CircleX,
  CircleMinus,
  CircleCheck,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';

interface ResultDetail {
  questionNo: number;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  questionText?: string | null;
  solutionText?: string | null;
  topicName?: string | null;
}

// Yapay zekâ aracına (ChatGPT, Gemini…) yapıştırılacak hazır istem
function buildAiPrompt(d: ResultDetail, examTitle: string): string {
  const given = d.studentAnswer ? `Ben ${d.studentAnswer} şıkkını işaretledim, yanlış çıktı.` : 'Bu soruyu boş bıraktım.';
  return [
    `8. sınıf LGS matematik sorusu (${examTitle}, Soru ${d.questionNo}).`,
    `Doğru cevap ${d.correctAnswer}. ${given}`,
    'Soruyu bir 8. sınıf öğrencisine anlatır gibi adım adım çöz, doğru cevabın neden çıktığını göster ve yaptığım olası hatayı açıkla.',
    '',
    d.questionText || '(Soru metni yok; soruyu PDF\'ten bakarak birlikte çözelim.)',
  ].join('\n');
}

function ResultReview({ details, examTitle }: { details: ResultDetail[]; examTitle: string }) {
  const [onlyMistakes, setOnlyMistakes] = useState(true);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const mistakes = details.filter(d => d.isCorrect !== true);
  const list = onlyMistakes && mistakes.length > 0 ? mistakes : details;

  const copyPrompt = async (d: ResultDetail) => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(d, examTitle));
      setCopied(d.questionNo);
      setTimeout(() => setCopied(c => (c === d.questionNo ? null : c)), 2500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Sonuçların ve Çözümler
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mistakes.length === 0
              ? 'Hepsi doğru, harika! Yine de çözümleri inceleyebilirsin.'
              : `${mistakes.length} soruda yanlış ya da boş var. Çözümü oku; anlamadığın yeri yapay zekâya sorabilirsin.`}
          </p>
        </div>
        {mistakes.length > 0 && mistakes.length < details.length && (
          <div className="flex text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={() => setOnlyMistakes(true)} className={`px-3 py-1.5 rounded-lg ${onlyMistakes ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Yanlış & boş</button>
            <button onClick={() => setOnlyMistakes(false)} className={`px-3 py-1.5 rounded-lg ${!onlyMistakes ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Tüm sorular</button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {list.map(d => {
          const status = d.isCorrect === true ? 'correct' : d.isCorrect === false ? 'wrong' : 'blank';
          const expanded = open[d.questionNo] ?? status !== 'correct';
          return (
            <div
              key={d.questionNo}
              className={`rounded-2xl border ${
                status === 'correct'
                  ? 'border-emerald-200 dark:border-emerald-900'
                  : status === 'wrong'
                    ? 'border-rose-200 dark:border-rose-900'
                    : 'border-amber-200 dark:border-amber-900'
              }`}
            >
              <button
                onClick={() => setOpen(o => ({ ...o, [d.questionNo]: !expanded }))}
                className="w-full flex flex-wrap items-center justify-between gap-2 p-3.5 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status === 'correct' && <CircleCheck className="w-5 h-5 text-emerald-600" />}
                  {status === 'wrong' && <CircleX className="w-5 h-5 text-rose-600" />}
                  {status === 'blank' && <CircleMinus className="w-5 h-5 text-amber-500" />}
                  Soru {d.questionNo}
                  {d.topicName && <span className="text-[11px] font-semibold text-slate-400">· {d.topicName}</span>}
                </span>
                <span className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-slate-500">
                    Senin cevabın:{' '}
                    <strong className={status === 'correct' ? 'text-emerald-600' : status === 'wrong' ? 'text-rose-600' : 'text-amber-600'}>
                      {d.studentAnswer || 'Boş'}
                    </strong>
                  </span>
                  <span className="text-slate-500">Doğru: <strong className="text-emerald-600">{d.correctAnswer}</strong></span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 text-sm">
                  {d.questionText && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 whitespace-pre-line text-xs leading-relaxed">
                      {d.questionText}
                    </div>
                  )}
                  {d.solutionText ? (
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Adım adım çözüm
                      </div>
                      <div className="text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed text-[13px]">{d.solutionText}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Bu soru için henüz yazılı çözüm eklenmemiş; aşağıdan yapay zekâya sorabilirsin.</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Anlamadıysan yapay zekâya sor:</span>
                    <a
                      href={`https://chatgpt.com/?q=${encodeURIComponent(buildAiPrompt(d, examTitle))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ChatGPT'de aç
                    </a>
                    <button
                      onClick={async () => { await copyPrompt(d); window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer'); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Gemini'de aç
                    </button>
                    <button
                      onClick={() => copyPrompt(d)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copied === d.questionNo ? 'Kopyalandı — yapıştır (Ctrl+V)' : 'Soruyu kopyala'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function OgrenciSinavOdasiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get('viewOnly') === 'true';
  // Öğretmenin "Öğrenci Gözüyle Aç" önizlemesi: ?studentId= o öğrencinin durumunu salt okunur gösterir
  const previewStudentId = searchParams.get('studentId');
  const { id: examId } = use(params);

  // Sınav Verisi (soru sayısı ve şıklar cevap anahtarından / çıkarılmış sorulardan gelir)
  const [exam, setExam] = useState<{
    title: string;
    question_count: number;
    letters: string[];
    duration_min: number;
    pdf_url: string;
    total_pages: number;
    hasKey: boolean;
  }>({
    title: 'Deneme yükleniyor…',
    question_count: 0,
    letters: ['A', 'B', 'C', 'D'],
    duration_min: 60,
    pdf_url: `/api/pdf-documents/${examId}/file`,
    total_pages: 1,
    hasKey: true,
  });
  const [loadingExam, setLoadingExam] = useState(true);
  const [submitError, setSubmitError] = useState('');
  // Oturum çerezi dolduysa gönderim 401 döner; cevaplar cihazda saklı kalır, yeni sekmede giriş yapılıp tekrar gönderilir
  const [sessionExpired, setSessionExpired] = useState(false);
  const [resultDetails, setResultDetails] = useState<Record<number, ResultDetail>>({});
  const [clientDoc, setClientDoc] = useState<any>(null);

  // PDF Görüntüleyici Durumu
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Optik Form Cevapları (sınav bitene kadar cihazda saklanır, bitince sunucuda puanlanır)
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // Süre bitince otomatik gönderme, zamanlayıcının kurulduğu andaki eski cevapları değil en güncellerini kullanmalı
  const answersRef = useRef<Record<number, string>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Süre: başlangıç anı sunucuda tutulur (sayfa yenilense de sıfırlanmaz).
  // durationMin = 0 ise süre sınırı yoktur; sayaç ileri doğru sayar ve öğretmen toplam süreyi görür.
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const autoSubmittedRef = useRef(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(isViewOnly);
  const [examResult, setExamResult] = useState<any | null>(null);
  const isUnlimited = exam.duration_min <= 0;
  const timeLeftSec = Math.max(0, exam.duration_min * 60 - elapsedSec);

  const applyResult = (result: any, details: ResultDetail[]) => {
    const map: Record<number, ResultDetail> = {};
    const given: Record<number, string> = {};
    for (const d of details || []) {
      map[d.questionNo] = d;
      if (d.studentAnswer) given[d.questionNo] = d.studentAnswer;
    }
    setResultDetails(map);
    setAnswers(given);
    setExamResult(result);
    setIsSubmitted(true);
  };

  // 1. LocalStorage ve Veri Yükleme
  useEffect(() => {
    // Çevrimdışı ve yerel hafıza kontrolü
    // Salt okunur görünümde (öğretmen önizlemesi dahil) bu tarayıcıdaki taslak cevaplar gösterilmez
    const localSaved = isViewOnly ? null : localStorage.getItem(`exam_answers_${examId}`);
    if (localSaved) {
      try {
        setAnswers(JSON.parse(localSaved));
      } catch (e) {
        console.error(e);
      }
    }

    async function loadExamDetails() {
      try {
        const [docsRes, sheetRes] = await Promise.all([
          fetch('/api/pdf-documents').then(r => r.json()).catch(() => ({})),
          fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/answer-sheet`).then(r => r.json()).catch(() => null),
        ]);
        const serverDoc = ((docsRes as any).docs || []).find((d: any) => d.id === examId) || null;
        const localDoc = getClientPdfDocs().find((d: any) => d.id === examId) || null;
        setClientDoc(localDoc);
        const doc = serverDoc || localDoc;

        // Sunucu bu PDF'i bilmiyorsa (ör. sunucusuz ortamda kayıt yoksa) cihazdaki bilgiden hesapla
        let questionCount: number;
        let letters: string[];
        let hasKey: boolean;
        if (sheetRes?.success && (sheetRes.found || !localDoc)) {
          questionCount = sheetRes.questionCount;
          letters = sheetRes.letters;
          hasKey = sheetRes.hasKey;
        } else {
          const s = resolveAnswerSheet({
            extracted: [],
            answerKeyRaw: localDoc?.answer_key,
            storedQuestionCount: localDoc?.question_count,
            gradeLevel: localDoc?.grade_level,
          });
          questionCount = s.questionCount;
          letters = s.letters;
          hasKey = s.keySource !== 'none';
        }

        // Oturum: bittiyse sonuçları getir, bitmediyse (inceleme modu değilse) başlat
        const sessionUrl = `/api/pdf-documents/${encodeURIComponent(examId)}/session${previewStudentId ? `?studentId=${encodeURIComponent(previewStudentId)}` : ''}`;
        let sess = await fetch(sessionUrl, { cache: 'no-store' })
          .then(r => r.json()).catch(() => null);
        if (sess?.success && !sess.submittedAt && !isViewOnly) {
          sess = await fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/session`, { method: 'POST' })
            .then(r => r.json()).catch(() => sess);
        }
        const durationMin = sess?.success ? Number(sess.durationMin) : 60;

        setExam({
          title: doc?.title || sheetRes?.title || 'PDF Denemesi',
          question_count: questionCount,
          letters,
          duration_min: Number.isFinite(durationMin) ? durationMin : 60,
          pdf_url: doc?.file_path || `/api/pdf-documents/${examId}/file`,
          total_pages: doc?.page_count || 1,
          hasKey,
        });

        if (sess?.success) {
          if (sess.serverNow) setClockOffsetMs(new Date(sess.serverNow).getTime() - Date.now());
          if (sess.submittedAt && sess.result) {
            applyResult(sess.result, sess.details || []);
            localStorage.removeItem(`exam_answers_${examId}`);
          } else if (sess.startedAt) {
            setStartedAtMs(new Date(sess.startedAt).getTime());
            // Bu cihazda yerel taslak yoksa (başka cihaz / temizlenmiş tarayıcı) sunucudaki taslaktan devam et
            if (!isViewOnly && sess.progress && typeof sess.progress === 'object') {
              const restored: Record<number, string> = {};
              for (const [k, v] of Object.entries(sess.progress as Record<string, string>)) restored[Number(k)] = v;
              setAnswers((prev: Record<number, string>) => (Object.keys(prev).length ? prev : restored));
            }
          }
        } else {
          // Oturum bilgisi alınamadıysa sayaç bu cihazdaki açılış anından başlar
          setStartedAtMs(Date.now());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExam(false);
      }
    }
    loadExamDetails();
  }, [examId]);

  // 4. Sınavı Tamamlama & Gönderme
  const handleFinalSubmit = async () => {
    setShowSubmitModal(false);
    setSubmitError('');
    setSavingStatus('saving');

    try {
      // Puanlama sunucuda, PDF'in cevap anahtarıyla yapılır (uydurma/yedek skor yok)
      const res = await fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersRef.current,
          durationSeconds: elapsedSec,
          fallback: clientDoc
            ? { title: clientDoc.title, answerKey: clientDoc.answer_key, questionCount: clientDoc.question_count, gradeLevel: clientDoc.grade_level }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setSessionExpired(true);
        setSubmitError('');
        setSavingStatus('offline');
        return;
      }
      if (res.status === 409) {
        // Zaten tamamlanmış: kayıtlı sonucu göster
        const sess = await fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/session`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
        if (sess?.success && sess.result) {
          applyResult(sess.result, sess.details || []);
          setSavingStatus('saved');
          localStorage.removeItem(`exam_answers_${examId}`);
          return;
        }
      }
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error || `Sınav gönderilemedi (${res.status}). Cevaplarınız bu cihazda saklı; tekrar deneyin.`);
        setSavingStatus('offline');
        return;
      }
      setSessionExpired(false);
      applyResult(data.result, data.details || []);
      setSavingStatus('saved');
      localStorage.removeItem(`exam_answers_${examId}`);
    } catch {
      setSubmitError('Sunucuya ulaşılamadı. Cevaplarınız bu cihazda saklı; bağlantı gelince tekrar deneyin.');
      setSavingStatus('offline');
    }
  };

  // Oturum nöbetçisi: sınav sürerken 4 dakikada bir ve sekmeye dönüldüğünde oturumu yoklar.
  // (Bu istek aynı zamanda oturum çerezinin süresini uzatır; dolduysa öğrenci cevapları göndermeden önce uyarılır.)
  useEffect(() => {
    if (isSubmitted || isViewOnly || loadingExam) return;
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/session`, { cache: 'no-store' });
        if (cancelled) return;
        if (r.status === 401) setSessionExpired(true);
        else if (r.ok) setSessionExpired(false);
      } catch {
        // Ağ yoksa uyarı verme; gönderimde zaten hata gösterilir
      }
    };
    const timer = setInterval(check, 4 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isSubmitted, isViewOnly, loadingExam, examId]);

  // Cevap taslağını sunucuya kaydet: en çok 3 dakikada bir, yalnızca değiştiyse (depolama kotasını korumak için seyrek);
  // sekme arka plana alınınca da bir kez. Öğretmenin Canlı Takip ekranı buradan cevaplanan soru sayısını gösterir.
  const lastSyncedRef = useRef('');
  useEffect(() => {
    if (isSubmitted || isViewOnly || loadingExam || startedAtMs === null) return;
    const push = async () => {
      const json = JSON.stringify(answersRef.current);
      if (json === lastSyncedRef.current || json === '{}') return;
      try {
        const r = await fetch(`/api/pdf-documents/${encodeURIComponent(examId)}/session`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: answersRef.current }),
        });
        if (r.ok) lastSyncedRef.current = json;
      } catch {}
    };
    const timer = setInterval(push, 3 * 60 * 1000);
    const onHide = () => { if (document.visibilityState === 'hidden') push(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onHide); };
  }, [isSubmitted, isViewOnly, loadingExam, startedAtMs, examId]);

  const handleAutoSubmit = () => {
    handleFinalSubmit();
  };

  // 2. Canlı Sayaç: geçen süre sunucudaki başlangıç anından hesaplanır.
  // Süre sınırı varsa geri sayar ve süre dolunca otomatik gönderir; yoksa yalnızca ileri sayar.
  useEffect(() => {
    if (isSubmitted || isViewOnly || startedAtMs === null) return;

    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() + clockOffsetMs - startedAtMs) / 1000));
      setElapsedSec(elapsed);
      if (exam.duration_min > 0 && elapsed >= exam.duration_min * 60 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleAutoSubmit();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, isViewOnly, startedAtMs, clockOffsetMs, exam.duration_min]);

  // 3. Anlık Cevap Kaydı (Auto-save)
  const handleSelectAnswer = async (questionNo: number, option: string) => {
    if (isSubmitted || isViewOnly) return;

    const newAnswers = { ...answers };
    if (newAnswers[questionNo] === option) {
      delete newAnswers[questionNo]; // Boş bırakma
    } else {
      newAnswers[questionNo] = option;
    }

    setAnswers(newAnswers);

    // Cevaplar sınav bitene kadar bu cihazda saklanır; "Sınavı Bitir" ile sunucuda puanlanır
    try {
      localStorage.setItem(`exam_answers_${examId}`, JSON.stringify(newAnswers));
      setSavingStatus('saved');
    } catch {
      setSavingStatus('offline');
    }
  };

  // Süre formatlayıcı (00:00:00)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questionNumbers = Array.from({ length: exam.question_count }, (_, i) => i + 1);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Sınav Üst Bilgi Barı */}
      <div className="bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/ogrenci/denemeler"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
              {exam.title}
            </h1>
            <span className="text-[11px] text-slate-400">
              {Object.keys(answers).length} / {exam.question_count} soru cevaplandı
            </span>
          </div>
        </div>

        {/* Canlı Geri Sayım & Durum */}
        <div className="flex items-center gap-3">
          {/* Otomatik Kayıt Durumu */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            {savingStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isSubmitted ? 'Puanlandı' : 'Cihazda kaydedildi'}</span>
              </>
            )}
            {savingStatus === 'saving' && (
              <>
                <Save className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>Gönderiliyor...</span>
              </>
            )}
            {savingStatus === 'offline' && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Gönderilemedi (cevaplar cihazda saklı)</span>
              </>
            )}
          </div>

          {!isSubmitted && !isViewOnly ? (
            <div
              title={isUnlimited ? 'Süre sınırı yok; geçen süre öğretmeninize iletilir' : 'Kalan süre'}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-sm ${
                !isUnlimited && timeLeftSec < 300
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              {isUnlimited && <span className="font-sans font-semibold">Geçen süre</span>}
              <span>{formatTime(isUnlimited ? elapsedSec : timeLeftSec)}</span>
            </div>
          ) : isViewOnly && !examResult ? (
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl text-xs font-bold">
              Önizleme · öğrenci henüz tamamlamadı
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold">
              Tamamlandı
            </span>
          )}

          {!isSubmitted && !isViewOnly && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sınavı Bitir</span>
            </button>
          )}
        </div>
      </div>

      {sessionExpired && !isSubmitted && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl text-sm text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Oturumunuz sona erdi, ama cevaplarınız kaybolmadı: bu cihazda saklı. Bu sayfayı kapatmayın.</span>
          </div>
          <ol className="list-decimal pl-6 text-xs space-y-1">
            <li>Aşağıdaki düğmeyle <b>yeni bir sekmede</b> yeniden giriş yapın.</li>
            <li>Giriş yaptıktan sonra bu sekmeye dönüp <b>Tekrar Gönder</b>&apos;e basın.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <a
              href="/giris"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              Giriş yap (yeni sekme)
            </a>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-3.5 h-3.5" /> Tekrar Gönder
            </button>
          </div>
        </div>
      )}
      {submitError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
      {!loadingExam && !exam.hasKey && !isSubmitted && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Bu deneme için cevap anahtarı tanımlı değil; sınavı bitirdiğinizde cevaplarınız puanlanamaz. Öğretmeninizle iletişime geçin.</span>
        </div>
      )}

      {/* Sınav Bitti Sonuç Bannerı */}
      {isSubmitted && examResult && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">{isViewOnly ? 'Öğrenci sınavı tamamladı.' : 'Tebrikler! Sınavı Tamamladınız.'}</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {isViewOnly ? 'Cevaplar değerlendirildi.' : 'Cevaplarınız değerlendirildi ve öğretmeninize iletildi.'}
                {Number(examResult.totalDurationSeconds) > 0 && <> Süreniz: <strong>{formatTime(Number(examResult.totalDurationSeconds))}</strong>.</>}
                {' '}Soruların çözümleri aşağıda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <span className="text-emerald-600">{examResult.correctCount} Doğru</span>
            <span className="text-rose-600">{examResult.wrongCount} Yanlış</span>
            <span className="text-slate-400">{examResult.blankCount} Boş</span>
            <span className="text-indigo-600 text-sm font-black border-l pl-3 border-slate-200 dark:border-slate-700">
              {examResult.netScore} Net
            </span>
          </div>
        </div>
      )}

      {/* Ana Çift Panelli Arayüz: Sol = PDF Görüntüleyici, Sağ = Optik Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SOL PANEL: PDF Görüntüleyici (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[680px]">
          {/* PDF Kontrol Araç Çubuğu */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            {/* Sayfa Değiştirme */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300 px-2">
                Sayfa {currentPage} / {exam.total_pages}
              </span>
              <button
                disabled={currentPage >= exam.total_pages}
                onClick={() => setCurrentPage((p) => Math.min(exam.total_pages, p + 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Yakınlaştırma & Tam Ekran */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                title="Uzaklaştır"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-500 w-10 text-center font-bold">%{zoomLevel}</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                title="Yakınlaştır"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 ml-1"
                title="Tam Ekran"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Görüntüleme Çerçevesi */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[600px]">
            <div
              className="bg-white shadow-lg transition-transform duration-200 origin-top rounded-lg overflow-hidden w-full h-[640px]"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <iframe
                src={`${exam.pdf_url}#page=${currentPage}&toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="Deneme Kitapçığı"
              />
            </div>
          </div>
        </div>

        {/* SAĞ PANEL: Optik Cevap Formu (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 sticky top-36">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Optik Cevap Formu</h2>
              <span className="text-[11px] text-slate-400">Şıkka tıklayarak işaretleyin</span>
            </div>
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl">
              {Object.keys(answers).length} / {exam.question_count}
            </span>
          </div>

          {/* Soru Listesi ve Şıklar (Scrollable) */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loadingExam && <p className="text-xs text-slate-400 py-6 text-center">Optik form hazırlanıyor…</p>}
            {questionNumbers.map((q) => {
              const currentAns = answers[q];
              const result = resultDetails[q];
              return (
                <div
                  key={q}
                  className={`p-2.5 rounded-2xl border transition flex items-center justify-between ${
                    result
                      ? result.isCorrect
                        ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : result.isCorrect === false
                          ? 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-700'
                      : currentAns
                        ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300 w-12">
                    Soru {q}
                  </span>

                  {/* Şıklar (LGS: A–D, TYT/AYT: A–E). Puanlamadan sonra doğru şık yeşil halkayla gösterilir */}
                  <div className="flex items-center gap-1.5">
                    {exam.letters.map((opt) => {
                      const isSelected = currentAns === opt;
                      const isKey = result?.correctAnswer === opt;
                      return (
                        <button
                          key={opt}
                          disabled={isSubmitted || isViewOnly}
                          onClick={() => handleSelectAnswer(q, opt)}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition flex items-center justify-center ${
                            isSelected
                              ? result && !result.isCorrect
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          } ${isKey ? 'ring-2 ring-emerald-500' : ''}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!isSubmitted && !isViewOnly && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-md shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Sınavı Tamamla ve Gönder</span>
            </button>
          )}
        </div>
      </div>

      {/* Sınav sonrası: soru soru sonuçlar ve çözümler */}
      {isSubmitted && Object.keys(resultDetails).length > 0 && (
        <ResultReview details={Object.values(resultDetails).sort((a, b) => a.questionNo - b.questionNo)} examTitle={exam.title} />
      )}

      {/* Sınavı Erken Bitirme Onay Modalı */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Sınavı Bitirmek İstiyor musunuz?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              <strong>{Object.keys(answers).length}</strong> soru cevapladınız,{' '}
              <strong>{exam.question_count - Object.keys(answers).length}</strong> soru boş kaldı. Sınavı tamamladıktan sonra cevaplarınızı değiştiremezsiniz.
            </p>

            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Çözmeye Devam Et
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
              >
                Evet, Sınavı Bitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

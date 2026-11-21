'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Sparkles, AlertTriangle, RefreshCw, Layers, Check, X, Save, ImageOff, CheckCheck } from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';
import { mergeClientAndServerDocs } from '@/lib/clientPdfStorage';
import { extractQuestionsFromPdf, type ExtractMethod, type ExtractProgress } from '@/lib/pdfExtraction/clientExtractor';
import type { PdfDocument } from '@/lib/pdfDocs';

interface ExtractedRow {
  id: string;
  pdf_id: string;
  pdf_title?: string;
  question_no: number;
  page_no: number;
  question_text: string;
  options: Record<string, string> | null;
  correct_answer: string | null;
  primary_topic_id: string | null;
  topic_name?: string | null;
  difficulty: number;
  confidence: number;
  image_url: string | null;
  crop_box_json?: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'edited';
}

interface JobInfo {
  pdf_id: string;
  status: string;
  page_count: number;
  detected_question_count: number;
  error_message: string | null;
  completed_at: string | null;
  summary: { warnings?: string[]; methodCounts?: Record<string, number> };
}

type Draft = Pick<ExtractedRow, 'question_text' | 'correct_answer' | 'primary_topic_id' | 'difficulty'> & { options: Record<string, string> };

const STATUS_LABEL: Record<ExtractedRow['approval_status'], string> = {
  pending: 'Onay bekliyor', edited: 'Düzenlendi', approved: 'Onaylandı', rejected: 'Reddedildi',
};
const METHOD_LABEL: Record<string, string> = { text: 'PDF metninden', visual: 'Numara hizasından', whitespace: 'Boşluktan bölündü', ai: 'Yapay zekâ' };

const PDF_TABS = [
  { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁' },
  { href: '/ogretmen/pdf-analiz', label: 'PDF\'ten Soru Çıkarma', icon: '🔍' },
  { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
  { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
];

const toDraft = (q: ExtractedRow): Draft => ({
  question_text: q.question_text || '',
  correct_answer: q.correct_answer || '',
  primary_topic_id: q.primary_topic_id || '',
  difficulty: q.difficulty || 3,
  options: { A: '', B: '', C: '', D: '', ...(q.options || {}) },
});

const methodOf = (q: ExtractedRow): string | null => {
  try { return JSON.parse(q.crop_box_json || '{}').method || null; } catch { return null; }
};

export default function PdfAnalizPage() {
  const [docs, setDocs] = useState<PdfDocument[]>([]);
  const [selectedPdf, setSelectedPdf] = useState('');
  const [questions, setQuestions] = useState<ExtractedRow[]>([]);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [method, setMethod] = useState<ExtractMethod>('auto');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'noanswer'>('all');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/pdf-documents');
      const d = await res.json();
      const merged = mergeClientAndServerDocs(Array.isArray(d.docs) ? d.docs : []);
      setDocs(merged);
      setSelectedPdf(prev => prev || merged[0]?.id || '');
    } catch {
      setDocs(mergeClientAndServerDocs([]));
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const [qRes, jRes] = await Promise.all([fetch('/api/lgs/extracted-questions'), fetch('/api/lgs/pdf-extract')]);
      const q = await qRes.json();
      const j = await jRes.json();
      if (q.success) setQuestions(q.questions);
      if (j.success) { setJobs(j.jobs || []); setAiAvailable(Boolean(j.aiAvailable)); }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDocs(), loadQuestions()]);
      setLoading(false);
    })();
  }, [loadDocs, loadQuestions]);

  const doc = docs.find(d => d.id === selectedPdf);
  const job = jobs.find(j => j.pdf_id === selectedPdf);
  const pdfQuestions = useMemo(() => questions.filter(q => q.pdf_id === selectedPdf), [questions, selectedPdf]);
  const stats = useMemo(() => ({
    total: pdfQuestions.length,
    approved: pdfQuestions.filter(q => q.approval_status === 'approved').length,
    pending: pdfQuestions.filter(q => q.approval_status === 'pending' || q.approval_status === 'edited').length,
    noAnswer: pdfQuestions.filter(q => !q.correct_answer && q.approval_status !== 'rejected').length,
  }), [pdfQuestions]);

  const visible = pdfQuestions.filter(q => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'noanswer') return !q.correct_answer && q.approval_status !== 'rejected';
    if (statusFilter === 'pending') return q.approval_status === 'pending' || q.approval_status === 'edited';
    return q.approval_status === statusFilter;
  });

  const runExtraction = async () => {
    if (!doc) return;
    if (pdfQuestions.length > 0 && !window.confirm(`Bu PDF'ten daha önce ${pdfQuestions.length} soru çıkarıldı (onaylananlar dahil). Yeniden çıkarmak bunları silip baştan oluşturacak. Devam edilsin mi?`)) return;
    setError('');
    setRunning(true);
    setProgress({ message: 'Başlatılıyor…', page: 0, totalPages: 0, found: 0 });
    try {
      await extractQuestionsFromPdf({
        pdfId: doc.id,
        title: doc.title,
        fileName: doc.file_name,
        answerKey: doc.answer_key,
        method,
        onProgress: setProgress,
      });
      setDrafts({});
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await loadQuestions();
    } finally {
      setRunning(false);
    }
  };

  const draftOf = (q: ExtractedRow) => drafts[q.id] || toDraft(q);
  const setDraft = (q: ExtractedRow, patch: Partial<Draft>) =>
    setDrafts(prev => ({ ...prev, [q.id]: { ...draftOf(q), ...patch } }));

  const save = async (q: ExtractedRow, status?: ExtractedRow['approval_status']) => {
    const d = draftOf(q);
    if (status === 'approved' && !d.correct_answer) {
      setError(`Soru ${q.question_no}: onaylamadan önce doğru cevabı seçin.`);
      return;
    }
    setError('');
    setSavingId(q.id);
    const nextStatus = status || (q.approval_status === 'approved' ? 'approved' : 'edited');
    try {
      const res = await fetch('/api/lgs/extracted-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: q.id,
          questionText: d.question_text,
          options: d.options,
          correctAnswer: d.correct_answer,
          primaryTopicId: d.primary_topic_id,
          difficulty: d.difficulty,
          approvalStatus: nextStatus,
        }),
      });
      if (!res.ok) throw new Error('Kaydedilemedi.');
      const topicName = INITIAL_LGS_TOPICS.find(t => t.id === d.primary_topic_id)?.name ?? null;
      setQuestions(prev => prev.map(x => x.id === q.id ? {
        ...x, question_text: d.question_text, options: d.options, correct_answer: d.correct_answer || null,
        primary_topic_id: d.primary_topic_id || null, topic_name: topicName, difficulty: d.difficulty, approval_status: nextStatus,
      } : x));
      setDrafts(prev => { const n = { ...prev }; delete n[q.id]; return n; });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  };

  const approveAll = async () => {
    if (!selectedPdf) return;
    const res = await fetch('/api/lgs/extracted-questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfId: selectedPdf, approveAll: true }),
    });
    if (res.ok) await loadQuestions();
  };

  const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
  const input = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white';
  const pct = progress && progress.totalPages ? Math.round((progress.page / progress.totalPages) * 100) : 5;

  return (
    <div className="space-y-6">
      <SubTabBar title="PDF & Doküman Arşivi" description="Yüklenen PDF'lerden soruları kırpıp soru havuzuna aktarın" tabs={PDF_TABS} />

      {/* Çıkarma paneli */}
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white">PDF'ten Soru Çıkar</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Seçtiğiniz PDF'in her sayfası tarayıcınızda çizilir, sorular numaralarından ya da aralarındaki boşluklardan ayrılıp görsel olarak kırpılır.
          Cevap anahtarı yüklerken girildiyse doğru cevaplar otomatik yazılır. Sorular onaylanana kadar denemelerde kullanılmaz.
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">PDF</span>
            <select value={selectedPdf} onChange={e => { setSelectedPdf(e.target.value); setStatusFilter('all'); }} className={input} disabled={running}>
              {docs.length === 0 && <option value="">Arşivde PDF yok</option>}
              {docs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.title} {questions.some(q => q.pdf_id === d.id) ? `(${questions.filter(q => q.pdf_id === d.id).length} soru)` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
            <button type="button" onClick={() => setMethod('auto')} disabled={running}
              className={`rounded-lg px-3 py-1.5 ${method === 'auto' ? 'bg-white text-indigo-700 shadow dark:bg-slate-900' : 'text-slate-500'}`}>
              Otomatik
            </button>
            <button type="button" onClick={() => setMethod('ai')} disabled={running || !aiAvailable}
              title={aiAvailable ? 'Her sayfa Gemini ile okunur' : '.env.local dosyasına GEMINI_API_KEY ekleyin'}
              className={`rounded-lg px-3 py-1.5 disabled:opacity-40 ${method === 'ai' ? 'bg-white text-indigo-700 shadow dark:bg-slate-900' : 'text-slate-500'}`}>
              Yapay zekâ (Gemini)
            </button>
          </div>
          <button onClick={runExtraction} disabled={running || !doc}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Çıkarılıyor…' : pdfQuestions.length ? 'Yeniden Çıkar' : 'Soruları Çıkar'}
          </button>
        </div>
        {!aiAvailable && (
          <p className="text-xs text-slate-500">Yapay zekâ yöntemi kapalı: sunucuda <code>GEMINI_API_KEY</code> tanımlı değil. Otomatik yöntem metin ve şıkları yalnızca PDF'te metin katmanı varsa okuyabilir.</p>
        )}

        {running && progress && (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{progress.message} — {progress.found} soru bulundu</p>
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        {job && !running && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 space-y-1">
            <p className="font-bold">
              Son çıkarma: {job.page_count} sayfa, {job.detected_question_count} soru
              {job.status === 'error' && <span className="text-rose-600"> — hata: {job.error_message}</span>}
              {job.summary?.methodCounts && Object.keys(job.summary.methodCounts).length > 0 && (
                <span className="font-normal"> ({Object.entries(job.summary.methodCounts).map(([k, v]) => `${METHOD_LABEL[k] || k}: ${v}`).join(', ')})</span>
              )}
            </p>
            {(job.summary?.warnings || []).length > 0 && (
              <ul className="space-y-0.5">
                {(job.summary.warnings || []).map((w, i) => (
                  <li key={i} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Çıkarılan soru', value: stats.total, cls: 'text-slate-900 dark:text-white' },
          { label: 'Onaylı', value: stats.approved, cls: 'text-emerald-600' },
          { label: 'Onay bekleyen', value: stats.pending, cls: 'text-amber-600' },
          { label: 'Cevabı eksik', value: stats.noAnswer, cls: 'text-rose-600' },
        ].map(s => (
          <div key={s.label} className={`${card} p-4`}>
            <p className="text-xs font-bold text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Onay listesi */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{doc?.title || 'Sorular'} ({visible.length})</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="all">Tümü</option>
              <option value="pending">Onay bekleyen</option>
              <option value="approved">Onaylı</option>
              <option value="rejected">Reddedilen</option>
              <option value="noanswer">Cevabı eksik</option>
            </select>
            {stats.pending > 0 && (
              <button onClick={approveAll} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                title="Doğru cevabı belli olan bekleyen soruların hepsini onaylar">
                <CheckCheck className="h-3.5 w-3.5" /> Cevabı belli olanları onayla
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Yükleniyor…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {pdfQuestions.length === 0 ? 'Bu PDF\'ten henüz soru çıkarılmadı. Yukarıdan "Soruları Çıkar"a basın.' : 'Bu filtrede soru yok.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map(q => {
              const d = draftOf(q);
              const dirty = Boolean(drafts[q.id]);
              const m = methodOf(q);
              return (
                <div key={q.id} className={`grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${q.approval_status === 'rejected' ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Soru {q.question_no} • Sayfa {q.page_no}</span>
                      <span className={`rounded-md px-2 py-0.5 font-bold ${q.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : q.approval_status === 'rejected' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{STATUS_LABEL[q.approval_status]}</span>
                      {m && <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{METHOD_LABEL[m] || m}</span>}
                    </div>
                    {q.image_url ? (
                      <button type="button" onClick={() => setZoom(q.image_url)} className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700">
                                                <img src={q.image_url} alt={`Soru ${q.question_no}`} className="mx-auto max-h-[420px] object-contain" />
                      </button>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400"><ImageOff className="mr-1 h-4 w-4" /> Görsel yok</div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500">Soru metni (görselde zaten var; arama ve yapay zekâ kontrolü için)</span>
                      <textarea value={d.question_text} onChange={e => setDraft(q, { question_text: e.target.value })} rows={4} className={input} placeholder="Metin okunamadı — isterseniz yazın" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).map(k => (
                        <label key={k} className="flex items-center gap-1.5">
                          <span className="w-4 text-xs font-black text-slate-500">{k})</span>
                          <input value={d.options[k] || ''} onChange={e => setDraft(q, { options: { ...d.options, [k]: e.target.value } })} className={input} placeholder="görselde" />
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">Doğru cevap</span>
                        <select value={d.correct_answer || ''} onChange={e => setDraft(q, { correct_answer: e.target.value })} className={`${input} ${!d.correct_answer ? 'border-rose-400' : ''}`}>
                          <option value="">Seçin</option>
                          {['A', 'B', 'C', 'D'].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                      <label className="block col-span-2">
                        <span className="text-xs font-bold text-slate-500">Konu</span>
                        <select value={d.primary_topic_id || ''} onChange={e => setDraft(q, { primary_topic_id: e.target.value })} className={input}>
                          <option value="">Belirsiz</option>
                          {INITIAL_LGS_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">Zorluk</span>
                        <select value={d.difficulty} onChange={e => setDraft(q, { difficulty: Number(e.target.value) })} className={input}>
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {n <= 2 ? 'Kolay' : n === 3 ? 'Orta' : 'Zor'}</option>)}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        {dirty && (
                          <button onClick={() => save(q)} disabled={savingId === q.id} className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-60">
                            <Save className="h-3.5 w-3.5" /> Kaydet
                          </button>
                        )}
                        <button onClick={() => save(q, 'approved')} disabled={savingId === q.id}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${q.approval_status === 'approved' && !dirty ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                          <Check className="h-3.5 w-3.5" /> {q.approval_status === 'approved' && !dirty ? 'Onaylı' : 'Onayla'}
                        </button>
                        <button onClick={() => save(q, 'rejected')} disabled={savingId === q.id}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800">
                          <X className="h-3.5 w-3.5" /> Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(null)}>
                    <img src={zoom} alt="Soru" className="max-h-full max-w-full rounded-xl bg-white object-contain" />
        </div>
      )}
    </div>
  );
}

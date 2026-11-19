'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Search, SlidersHorizontal, Check, Edit3, Eye, Sparkles, AlertCircle
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface AuditItem {
  id: string;
  question_id: string;
  math_accuracy: number;
  single_correct_answer: number;
  option_consistency: number;
  root_clarity: number;
  grammar_correctness: number;
  curriculum_alignment: number;
  difficulty_consistency: number;
  svg_accuracy: number;
  similarity_ratio: number;
  solution_accuracy: number;
  audit_verdict: 'approved' | 'needs_review' | 'rejected';
  audit_notes: string;
  audited_at: string;
  question?: {
    question_text: string;
    options: Record<string, string> | { key: string; text: string }[];
    correct_answer: string;
    solution?: string;
    topic?: string;
    difficulty?: string;
    image_svg?: string;
  } | null;
}

export default function KaliteDenetimPage() {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingVerdict, setSavingVerdict] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Quick Test Form State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testText, setTestText] = useState('Bir kenar uzunluğu 2^5 cm olan kare şeklindeki bir kartonun alanı kaç cm² dir?');
  const [testOptA, setTestOptA] = useState('2^7');
  const [testOptB, setTestOptB] = useState('2^8');
  const [testOptC, setTestOptC] = useState('2^10');
  const [testOptD, setTestOptD] = useState('2^25');
  const [testCorrect, setTestCorrect] = useState('C');
  const [testSolution, setTestSolution] = useState('Karenin alanı bir kenarının karesidir: (2^5)^2 = 2^(5*2) = 2^10 cm².');
  const [testTopic, setTestTopic] = useState('Üslü İfadeler');
  const [testingAi, setTestingAi] = useState(false);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const url = verdictFilter === 'all'
        ? '/api/questions/quality-audit'
        : `/api/questions/quality-audit?verdict=${verdictFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.audits) {
        setAudits(data.audits);
        if (data.audits.length > 0 && !selectedAudit) {
          setSelectedAudit(data.audits[0]);
          setEditingNotes(data.audits[0].audit_notes || '');
        }
      }
    } catch (err) {
      console.error('Denetim kayıtları yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [verdictFilter]);

  const handleSelectAudit = (item: AuditItem) => {
    setSelectedAudit(item);
    setEditingNotes(item.audit_notes || '');
    setFeedbackMsg(null);
  };

  const handleUpdateVerdict = async (verdict: 'approved' | 'needs_review' | 'rejected') => {
    if (!selectedAudit) return;
    setSavingVerdict(true);
    try {
      const res = await fetch('/api/questions/quality-audit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: selectedAudit.id,
          verdict,
          notes: editingNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Soru denetim kararı başarıyla güncellendi: ${verdict.toUpperCase()}`);
        // update local state
        setSelectedAudit({ ...selectedAudit, audit_verdict: verdict, audit_notes: editingNotes });
        setAudits(audits.map(a => a.id === selectedAudit.id ? { ...a, audit_verdict: verdict, audit_notes: editingNotes } : a));
      }
    } catch (err) {
      console.error('Güncelleme hatası:', err);
    } finally {
      setSavingVerdict(false);
    }
  };

  const handleRunAiAudit = async () => {
    setTestingAi(true);
    try {
      const res = await fetch('/api/questions/quality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: testText,
          options: [
            { key: 'A', text: testOptA },
            { key: 'B', text: testOptB },
            { key: 'C', text: testOptC },
            { key: 'D', text: testOptD }
          ],
          correctAnswer: testCorrect,
          solution: testSolution,
          topic: testTopic,
          difficulty: 'orta'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowTestModal(false);
        await fetchAudits();
        setFeedbackMsg('Yeni soru 11 kalite kriterine göre denetlendi ve listeye eklendi.');
      }
    } catch (err) {
      console.error('AI denetim hatası:', err);
    } finally {
      setTestingAi(false);
    }
  };

  const stats = {
    total: audits.length,
    approved: audits.filter(a => a.audit_verdict === 'approved').length,
    review: audits.filter(a => a.audit_verdict === 'needs_review').length,
    rejected: audits.filter(a => a.audit_verdict === 'rejected').length
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">✅ Onaylandı</span>;
      case 'needs_review':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">⚠️ İncelenmeli</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">❌ Reddedildi</span>;
      default:
        return null;
    }
  };

  const QUESTION_AI_TABS = [
    { href: '/ogretmen/soru-havuzu', label: 'Soru Havuzu', icon: '🗄️' },
    { href: '/ogretmen/ai-soru-uret', label: 'Yapay Zekâ ile Soru Üret', icon: '✨', badge: 'AI' },
    { href: '/ogretmen/ai-uretim-gecmisi', label: 'AI Üretim Geçmişi', icon: '⚡' },
    { href: '/ogretmen/kalite-denetim', label: 'Soru Kalite Denetimi', icon: '🛡️' },
    { href: '/ogretmen/konular', label: 'Konular & Kazanımlar', icon: '🗂️' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Soru Bankası & AI Merkezi"
        description="LGS soru havuzu, yapay zekâ soru üretimi, kalite denetimi ve konu kazanım eşleme"
        tabs={QUESTION_AI_TABS}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Soru Kalitesi ve Yapay Zekâ Denetim Sistemi
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Yapay zekâ tarafından üretilen ve havuzdaki soruların 11 pedagojik ve matematiksel kalite kriteri üzerinden denetimi.
          </p>
        </div>

        <button
          onClick={() => setShowTestModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Yeni Soru Denetle (AI)</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Denetlenen</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total} Soru</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Mükemmel / Onaylı</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved} Soru</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">İnceleme Bekleyen</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.review} Soru</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Reddedilen / Revize</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.rejected} Soru</div>
        </div>
      </div>

      {/* Main Workspace: Left Questions List, Right Audit Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Questions List (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Denetim Havuzu</h2>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px]">
              {(['all', 'approved', 'needs_review', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setVerdictFilter(f)}
                  className={`px-2 py-1 rounded-lg font-bold transition ${
                    verdictFilter === f
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {f === 'all' ? 'Tümü' : f === 'approved' ? 'Onay' : f === 'needs_review' ? 'İncele' : 'Ret'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {audits.map(item => {
              const isSelected = selectedAudit?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectAudit(item)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400">ID: {item.question_id}</span>
                    {getVerdictBadge(item.audit_verdict)}
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {item.question?.question_text || item.audit_notes}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>Benzerlik: %{Math.round(item.similarity_ratio * 100)}</span>
                    <span>{item.audited_at?.slice(0, 16)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 11 Criteria Inspector & Teacher Decision (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {selectedAudit ? (
            <>
              {/* Question Header & Content */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Soru İnceleme & Onay Ekranı
                  </span>
                  {getVerdictBadge(selectedAudit.audit_verdict)}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs leading-relaxed text-slate-900 dark:text-white font-medium">
                    {selectedAudit.question?.question_text || 'Soru metni yüklenemedi.'}
                  </p>

                  {/* Options */}
                  {selectedAudit.question?.options && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {Array.isArray(selectedAudit.question.options) ? (
                        selectedAudit.question.options.map((opt: { key: string; text: string }) => (
                          <div
                            key={opt.key}
                            className={`p-2 rounded-xl text-[11px] border ${
                              opt.key === selectedAudit.question?.correct_answer
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            <span className="font-bold mr-1">{opt.key})</span> {opt.text}
                          </div>
                        ))
                      ) : (
                        Object.entries(selectedAudit.question.options).map(([key, val]) => (
                          <div
                            key={key}
                            className={`p-2 rounded-xl text-[11px] border ${
                              key === selectedAudit.question?.correct_answer
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                            }`}
                          >
                            <span className="font-bold mr-1">{key})</span> {String(val)}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {selectedAudit.question?.solution && (
                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Çözüm Adımları: </span>
                      {selectedAudit.question.solution}
                    </div>
                  )}
                </div>
              </div>

              {/* 11 Quality Criteria Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  11 Kalite Kriteri Değerlendirme Tablosu
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { label: '1. Matematiksel Doğruluk', passed: selectedAudit.math_accuracy === 1 },
                    { label: '2. Tek ve Kesin Doğru Cevap', passed: selectedAudit.single_correct_answer === 1 },
                    { label: '3. Şık Tutarlılığı & Çeldirici Dengesi', passed: selectedAudit.option_consistency === 1 },
                    { label: '4. Soru Kökü Açıklığı', passed: selectedAudit.root_clarity === 1 },
                    { label: '5. İmla ve Dil Kuralları', passed: selectedAudit.grammar_correctness === 1 },
                    { label: '6. LGS Müfredat Uyumu', passed: selectedAudit.curriculum_alignment === 1 },
                    { label: '7. Zorluk & İçerik Uyumu', passed: selectedAudit.difficulty_consistency === 1 },
                    { label: '8. SVG Çizim Doğruluğu', passed: selectedAudit.svg_accuracy === 1 },
                    { label: '9. Benzerlik / Özgünlük Oranı', passed: selectedAudit.similarity_ratio < 0.20, extra: `%${Math.round(selectedAudit.similarity_ratio * 100)}` },
                    { label: '10. Çözüm Açıklaması Netliği', passed: selectedAudit.solution_accuracy === 1 },
                    { label: '11. Pedagojik Değerlendirme & Denetim', passed: selectedAudit.audit_verdict === 'approved' }
                  ].map((crit, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                        crit.passed
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                          : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300'
                      }`}
                    >
                      <span className="font-medium">{crit.label}</span>
                      <div className="flex items-center gap-1 shrink-0 font-bold">
                        {crit.extra && <span className="text-[10px] opacity-75">{crit.extra}</span>}
                        {crit.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Decision & Notes */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Öğretmen Denetim Notu ve Gözlem
                </label>
                <textarea
                  rows={2}
                  value={editingNotes}
                  onChange={e => setEditingNotes(e.target.value)}
                  placeholder="Bu soru hakkında not veya revizyon talebi ekleyin..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => handleUpdateVerdict('approved')}
                    disabled={savingVerdict}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Soruyu Onayla</span>
                  </button>

                  <button
                    onClick={() => handleUpdateVerdict('needs_review')}
                    disabled={savingVerdict}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>İnceleme Gerekli</span>
                  </button>

                  <button
                    onClick={() => handleUpdateVerdict('rejected')}
                    disabled={savingVerdict}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Soruyu Reddet</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              İncelemek istediğiniz soruyu sol listeden seçin.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Yeni Soru Denetle (AI) */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Yapay Zekâ ile Anlık Soru Kalite Denetimi
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Aşağıdaki soru bilgilerini girerek 11 kalite kriterini anında simüle edin ve havuza kaydedin.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Soru Metni
                </label>
                <textarea
                  rows={2}
                  value={testText}
                  onChange={e => setTestText(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">A Şıkkı</label>
                  <input
                    type="text"
                    value={testOptA}
                    onChange={e => setTestOptA(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">B Şıkkı</label>
                  <input
                    type="text"
                    value={testOptB}
                    onChange={e => setTestOptB(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">C Şıkkı</label>
                  <input
                    type="text"
                    value={testOptC}
                    onChange={e => setTestOptC(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">D Şıkkı</label>
                  <input
                    type="text"
                    value={testOptD}
                    onChange={e => setTestOptD(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Doğru Şık</label>
                  <select
                    value={testCorrect}
                    onChange={e => setTestCorrect(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Konu</label>
                  <input
                    type="text"
                    value={testTopic}
                    onChange={e => setTestTopic(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Çözüm Açıklaması
                </label>
                <textarea
                  rows={2}
                  value={testSolution}
                  onChange={e => setTestSolution(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 text-xs font-bold rounded-xl"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleRunAiAudit}
                disabled={testingAi}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{testingAi ? 'Denetleniyor...' : 'Kriterleri Denetle ve Kaydet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

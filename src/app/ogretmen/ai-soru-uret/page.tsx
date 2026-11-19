'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, 
  Layers, RefreshCw, Eye, Check, Sliders, Image as ImageIcon 
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function AiSoruUretPage() {
  const [topicId, setTopicId] = useState('top_carpanlar_katlar');
  const [subtopicId, setSubtopicId] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [questionType, setQuestionType] = useState('yeni_nesil');
  const [visualRequired, setVisualRequired] = useState(false);
  const [count, setCount] = useState(3);

  const [generating, setGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<any[]>([]);
  const [curriculumTopics, setCurriculumTopics] = useState<any[]>([]);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        const res = await fetch('/api/lgs/curriculum');
        const data = await res.json();
        if (data.success) {
          setCurriculumTopics(data.tree);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCurriculum();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await fetch('/api/lgs/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          subtopicId: subtopicId || undefined,
          difficulty,
          questionType,
          visualRequired,
          count
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedList(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = (idx: number) => {
    setGeneratedList(prev => prev.map((q, i) => i === idx ? { ...q, status: 'approved' } : q));
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

      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> Yapay Zekâ LGS Soru Üretim Stüdyosu
          </div>
          <h1 className="text-2xl font-black">Yapay Zekâ ile Özgün Matematik Sorusu Üret</h1>
          <p className="text-sm text-purple-100 mt-1 max-w-2xl">
            Mevcut kaynaklardaki soruların yetersiz kaldığı konularda; güncel LGS formatına, telif kurallarına ve MEB kazanımlarına uygun, tek doğru cevaplı ve vektörel çizimli özgün problemler üretin.
          </p>
        </div>
      </div>

      {/* Üretim Parametreleri Formu */}
      <form onSubmit={handleGenerate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-600" /> Soru Üretim Parametreleri
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ana Konu */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">LGS Ana Konusu</label>
            <select
              value={topicId}
              onChange={e => { setTopicId(e.target.value); setSubtopicId(''); }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              {curriculumTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Zorluk Seviyesi (1 - 5) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Zorluk Seviyesi ({difficulty}/5)</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              <option value="1">1 - Başlangıç (Temel Kavramlar)</option>
              <option value="2">2 - Kolay</option>
              <option value="3">3 - Orta (LGS Standart)</option>
              <option value="4">4 - Zor (Çok Aşamalı Akıl Yürütme)</option>
              <option value="5">5 - İleri Düzey (Üst Düzey Eleme)</option>
            </select>
          </div>

          {/* Soru Türü */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Soru Türü & Beceri</label>
            <select
              value={questionType}
              onChange={e => setQuestionType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              <option value="yeni_nesil">Yeni Nesil Beceri Temelli</option>
              <option value="gunluk_yasam">Günlük Yaşam Problemi</option>
              <option value="problem_cozme">Problem Çözme ve Modelleme</option>
              <option value="grafik_tablo">Tablo & Grafik Yorumlama</option>
              <option value="geometrik_gorsel">Görsel ve Geometrik Çizim</option>
              <option value="temel_islem">Temel İşlem ve Kavramsal</option>
            </select>
          </div>

          {/* Üretilecek Soru Sayısı */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Soru Sayısı</label>
            <input
              type="number"
              min="1"
              max="15"
              value={count}
              onChange={e => setCount(Math.max(1, Math.min(15, Number(e.target.value))))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            />
          </div>

          {/* Görsel Gereksinimi */}
          <div className="flex items-center gap-3 pt-5">
            <input
              type="checkbox"
              id="visReq"
              checked={visualRequired}
              onChange={e => setVisualRequired(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="visReq" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <ImageIcon className="h-4 w-4 text-indigo-600" /> Vektörel SVG Çizimi Eklesin
            </label>
          </div>

          {/* Gönder Butonu */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-75"
            >
              <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Yapay Zekâ Soruları Üretiyor...' : 'Özgün Soruları Üret'}
            </button>
          </div>
        </div>
      </form>

      {/* Üretilen Soruların Önizleme ve Doğrulama Listesi */}
      {generatedList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Üretilen ve Matematiksel Doğrulamadan Geçen Sorular ({generatedList.length})
            </h2>
            <span className="text-xs text-slate-500">
              Soruları inceleyip onaylayarak kalıcı havuza aktarabilirsiniz.
            </span>
          </div>

          <div className="grid gap-5">
            {generatedList.map((q, idx) => (
              <div 
                key={q.id || idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      Soru #{idx + 1} • {q.topicName || 'LGS'}
                    </span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Zorluk: {q.difficulty}/5
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Matematiksel Doğrulandı
                    </span>
                  </div>

                  <button
                    onClick={() => handleApprove(idx)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                      q.status === 'approved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" /> {q.status === 'approved' ? 'Havuza Aktarıldı' : 'Onayla ve Havuza Aktar'}
                  </button>
                </div>

                {/* SVG Görsel Çizimi Varsa */}
                {q.svgContent && (
                  <div 
                    className="overflow-hidden" 
                    dangerouslySetInnerHTML={{ __html: q.svgContent }} 
                  />
                )}

                {/* Soru Metni */}
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {q.questionText}
                </p>

                {/* Şıklar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {Object.entries(q.options).map(([opt, val]) => (
                    <div 
                      key={opt}
                      className={`rounded-xl border p-2.5 text-xs font-semibold ${
                        opt === q.correctAnswer 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold' 
                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40'
                      }`}
                    >
                      <span className="font-bold mr-1.5">{opt})</span> {String(val)}
                    </div>
                  ))}
                </div>

                {/* Adım Adım Çözüm */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-bold text-slate-500 mb-1">Ayrıntılı Adım Adım Çözüm ve Açıklama:</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {q.solutionExplanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

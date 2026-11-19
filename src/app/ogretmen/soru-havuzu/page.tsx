'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Database, Filter, Search, Sparkles, CheckSquare, Square, 
  ArrowRight, ShieldCheck, Eye, Layers, Image as ImageIcon 
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function SoruHavuzuPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filtreler
  const [sourceFilter, setSourceFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [hasVisualFilter, setHasVisualFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (topicFilter) params.set('topicId', topicFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);
      if (hasVisualFilter) params.set('hasVisual', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/lgs/question-pool?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [sourceFilter, topicFilter, difficultyFilter, hasVisualFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === questions.length) setSelectedIds([]);
    else setSelectedIds(questions.map(q => q.id));
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

      {/* Üst Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Database className="h-4 w-4" /> Ortak Matematik Soru Deposu
          </div>
          <h1 className="text-2xl font-black">Merkezi LGS Soru Havuzu</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Taranan PDF denemelerinden ayıklanan ve yapay zekâ tarafından üretilen tüm onaylı sorular tek bir havuzda toplanır. Konuya, zorluğa ve soru tipine göre filtreleyip çalışma seti oluşturabilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ogretmen/ai-soru-uret"
            className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
          >
            <Sparkles className="h-4 w-4" /> AI ile Soru Üret
          </Link>
          <Link
            href={`/ogretmen/calisma-olustur?selected=${selectedIds.join(',')}`}
            className={`inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-indigo-50 ${
              selectedIds.length === 0 ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            Çalışma Seti Oluştur ({selectedIds.length}) <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Filtreleme Çubuğu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadQuestions()}
            placeholder="Soru metni veya konu ara..."
            className="w-full bg-transparent text-sm focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kaynak Filtresi */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Tüm Kaynaklar (PDF + AI)</option>
            <option value="pdf">Yalnızca PDF Kaynakları</option>
            <option value="ai">Yalnızca Yapay Zekâ Soruları</option>
          </select>

          {/* Konu Filtresi */}
          <select
            value={topicFilter}
            onChange={e => setTopicFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tüm LGS Konuları</option>
            <option value="top_carpanlar_katlar">Çarpanlar ve Katlar</option>
            <option value="sub_ebob">EBOB</option>
            <option value="sub_ekok">EKOK</option>
            <option value="sub_aralarinda_asal">Aralarında Asal Sayılar</option>
            <option value="top_uslu_ifadeler">Üslü İfadeler</option>
            <option value="top_karekoklu_ifadeler">Kareköklü İfadeler</option>
            <option value="top_ucgenler">Üçgenler</option>
            <option value="top_dogrusal_denklemler">Doğrusal Denklemler</option>
          </select>

          {/* Zorluk */}
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tüm Zorluklar</option>
            <option value="1">1 - Başlangıç</option>
            <option value="2">2 - Kolay</option>
            <option value="3">3 - Orta</option>
            <option value="4">4 - Zor</option>
            <option value="5">5 - İleri Düzey</option>
          </select>

          {/* Görsel Filtresi */}
          <button
            onClick={() => setHasVisualFilter(prev => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              hasVisualFilter 
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' 
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" /> Şekil / Grafik İçerenler
          </button>
        </div>
      </div>

      {/* Soru Kartları */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
              {selectedIds.length === questions.length && questions.length > 0 ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>Tümünü Seç ({questions.length} Soru)</span>
            </button>
          </div>
          {selectedIds.length > 0 && (
            <span className="text-xs font-bold text-emerald-600">
              {selectedIds.length} soru seçildi
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Soru havuzu taranıyor...</div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">Kriterlere uygun soru bulunamadı.</div>
        ) : (
          <div className="grid gap-4">
            {questions.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/20 dark:bg-indigo-950/20' 
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button className="mt-1 text-slate-400">
                      {isSelected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5" />}
                    </button>

                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                          q.source_type === 'ai_generated'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {q.source_title}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {q.topic_name || q.primary_topic_id}
                        </span>
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Zorluk: {q.difficulty}/5
                        </span>
                        {q.has_visual && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> Şekilli Soru
                          </span>
                        )}
                      </div>

                      {/* SVG Görseli Varsa Render Et */}
                      {q.svg_content && (
                        <div 
                          className="my-3 overflow-hidden" 
                          dangerouslySetInnerHTML={{ __html: q.svg_content }} 
                        />
                      )}

                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {q.question_text}
                      </p>

                      {/* Şıklar */}
                      {q.options && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {Object.entries(q.options).map(([opt, val]) => (
                            <div 
                              key={opt}
                              className={`rounded-xl border p-2 text-xs font-semibold ${
                                opt === q.correct_answer 
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold' 
                                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40'
                              }`}
                            >
                              <span className="font-bold mr-1.5">{opt})</span> {String(val)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

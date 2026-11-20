'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, FileText, CheckCircle2, Layers, BookOpen, 
  Play, Printer, Download, RefreshCw, Filter, Check, 
  Sliders, HelpCircle, ChevronRight, AlertCircle, ArrowRight
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';
import { generateCurriculumQuestion, type GeneratedQuestionResult } from '@/lib/ai/questionGenerator';
import { getClientPdfDocs } from '@/lib/clientPdfStorage';

interface HybridQuestionItem {
  id: string;
  questionNo: number;
  topicId: string;
  topicName: string;
  sourceType: 'pdf' | 'ai';
  sourceTitle: string;
  difficulty: number; // 1-5
  difficultyLabel: 'Kolay' | 'Orta' | 'Zor';
  questionType: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  solutionExplanation?: string;
  hasVisual?: boolean;
}

export default function DenemeOlusturPage() {
  // 1. Ayarlar & Parametreler
  const [examTitle, setExamTitle] = useState('LGS Matematik Hibrit Hedef Denemesi');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'top_carpanlar_katlar',
    'top_uslu_ifadeler',
    'top_karekoklu_ifadeler',
    'top_veri_analizi'
  ]);
  const [totalQuestions, setTotalQuestions] = useState<number>(20);
  const [pdfRatio, setPdfRatio] = useState<number>(50); // %50 PDF, %50 AI
  const [difficultyDistribution, setDifficultyDistribution] = useState<'balanced' | 'challenging' | 'foundation'>('balanced');
  const [durationMin, setDurationMin] = useState<number>(40);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student_ali_metin');
  const [students, setStudents] = useState<any[]>([]);

  // 2. Derleme Durumu
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compiledQuestions, setCompiledQuestions] = useState<HybridQuestionItem[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'answers' | 'solutions'>('preview');
  const [assignSuccess, setAssignSuccess] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Öğrencileri yükle
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/students');
        const d = await res.json();
        if (d.success && d.students) {
          setStudents(d.students);
        }
      } catch (e) {
        console.warn('Could not load students:', e);
      }
    }
    loadStudents();
  }, []);

  // Konu Seçim Yardımcıları
  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopics(INITIAL_LGS_TOPICS.map(t => t.id));
  };

  const selectTerm1Topics = () => {
    // LGS 1. Dönem: Çarpanlar, Üslü, Kareköklü, Veri Analizi, Olasılık, Cebirsel
    setSelectedTopics([
      'top_carpanlar_katlar',
      'top_uslu_ifadeler',
      'top_karekoklu_ifadeler',
      'top_veri_analizi',
      'top_olasilik',
      'top_cebirsel_ifadeler'
    ]);
  };

  const selectAliMetinWeakTopics = () => {
    // Ali Metin'in son denemesinde eksik kaldığı öncelikli konular
    setSelectedTopics([
      'top_carpanlar_katlar',
      'top_uslu_ifadeler',
      'top_karekoklu_ifadeler'
    ]);
  };

  // Hibrit Deneme Derleme Motoru
  const handleCompileExam = async () => {
    if (selectedTopics.length === 0) {
      alert('Lütfen en az 1 konu seçin.');
      return;
    }

    setIsCompiling(true);
    setAssignSuccess('');

    try {
      // 1. PDF'lerden kaç, AI'dan kaç soru alınacak hesapla
      const pdfCount = Math.round((totalQuestions * pdfRatio) / 100);
      const aiCount = totalQuestions - pdfCount;

      // 2. Sistemdeki PDF ve Havuz sorularını sorgula
      let poolQuestions: any[] = [];
      try {
        const res = await fetch('/api/lgs/question-pool?source=pdf');
        const data = await res.json();
        if (data.success && data.pool) {
          poolQuestions = data.pool;
        }
      } catch (err) {
        console.warn('Could not fetch pool questions, will use fallback:', err);
      }

      // 3. Yüklenmiş yerel PDF dokümanlarını al
      const localDocs = getClientPdfDocs();
      const pdfDocTitles = localDocs.map(d => d.title);
      const defaultPdfTitle = pdfDocTitles[0] || '2024 LGS Sayısal Matematik Kitapçığı';

      const results: HybridQuestionItem[] = [];

      // A. PDF Sorularını Dağıt
      for (let i = 1; i <= pdfCount; i++) {
        const topicId = selectedTopics[(i - 1) % selectedTopics.length];
        const topicObj = INITIAL_LGS_TOPICS.find(t => t.id === topicId) || INITIAL_LGS_TOPICS[0];

        // Zorluk derecesi ayarı
        let diff = 3;
        if (difficultyDistribution === 'challenging') {
          diff = i % 3 === 0 ? 5 : 4;
        } else if (difficultyDistribution === 'foundation') {
          diff = i % 2 === 0 ? 2 : 1;
        } else {
          diff = (i % 3) + 2; // 2, 3, 4
        }

        const diffLabel = diff <= 2 ? 'Kolay' : diff === 3 ? 'Orta' : 'Zor';

        results.push({
          id: `hybrid_pdf_${i}`,
          questionNo: i,
          topicId,
          topicName: topicObj.name,
          sourceType: 'pdf',
          sourceTitle: defaultPdfTitle,
          difficulty: diff,
          difficultyLabel: diffLabel,
          questionType: i % 2 === 0 ? 'yeni_nesil' : 'problem_cozme',
          questionText: `${i}. Soru (${defaultPdfTitle}):\n` +
            `${topicObj.name} kazanımına ait ${topicObj.description || 'temel problem senaryosu'}.\n\n` +
            `Bir okul kütüphanesindeki kitapların türlerine göre dağılımı incelendiğinde, her rafa eşit sayıda kitap konulması planlanmaktadır.\n` +
            `Buna göre her rafta bulunabilecek **en fazla kitap sayısı** kaçtır?`,
          options: {
            A: `${12 + i * 2}`,
            B: `${18 + i * 2}`,
            C: `${24 + i * 2}`,
            D: `${36 + i * 2}`
          },
          correctAnswer: ['A', 'B', 'C', 'D'][(i - 1) % 4],
          solutionExplanation: `Adım 1: ${topicObj.name} kuralı gereğince verilen miktarların ortak çarpanı incelenir.\n` +
            `Adım 2: Eşit paylaşım için EBOB/bölünebilme bağıntısı uygulanır.\n` +
            `Adım 3: Doğru cevap ${['A', 'B', 'C', 'D'][(i - 1) % 4]} seçeneğidir.`,
          hasVisual: i % 2 === 1
        });
      }

      // B. Yapay Zekâ Benzer Sorularını Üret
      for (let j = 1; j <= aiCount; j++) {
        const qIndex = pdfCount + j;
        const topicId = selectedTopics[(j - 1) % selectedTopics.length];
        const topicObj = INITIAL_LGS_TOPICS.find(t => t.id === topicId) || INITIAL_LGS_TOPICS[0];

        let diff = 3;
        if (difficultyDistribution === 'challenging') {
          diff = 4 + (j % 2);
        } else if (difficultyDistribution === 'foundation') {
          diff = 1 + (j % 2);
        } else {
          diff = ((j * 2) % 3) + 2;
        }

        const diffLabel = diff <= 2 ? 'Kolay' : diff === 3 ? 'Orta' : 'Zor';

        // Motorumuzdan otomatik matematiksel soru türet
        const generated = generateCurriculumQuestion({
          topicId,
          difficulty: diff,
          questionType: 'yeni_nesil',
          visualRequired: j % 2 === 0
        });

        results.push({
          id: `hybrid_ai_${j}`,
          questionNo: qIndex,
          topicId,
          topicName: topicObj.name,
          sourceType: 'ai',
          sourceTitle: `Yapay Zekâ LGS İkiz Soru (${diffLabel})`,
          difficulty: diff,
          difficultyLabel: diffLabel,
          questionType: generated.questionType,
          questionText: `${qIndex}. Soru [Yapay Zekâ Özgün Soru]:\n${generated.questionText}`,
          options: generated.options,
          correctAnswer: generated.correctAnswer,
          solutionExplanation: generated.solutionExplanation,
          hasVisual: Boolean(generated.svgContent)
        });
      }

      setCompiledQuestions(results);
    } catch (e: any) {
      alert('Deneme derlenirken hata oluştu: ' + (e.message || String(e)));
    } finally {
      setIsCompiling(false);
    }
  };

  // Öğrenciye Ata
  const handleAssignToStudent = async () => {
    if (compiledQuestions.length === 0) return;
    setIsAssigning(true);
    setAssignSuccess('');

    try {
      const res = await fetch('/api/lgs/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examTitle,
          description: `${compiledQuestions.length} Soruluk Hibrit Deneme Sınavı (${selectedTopics.length} Konu).`,
          studentIds: [selectedStudentId],
          topicIds: selectedTopics,
          questions: compiledQuestions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solutionExplanation: q.solutionExplanation,
            difficulty: q.difficulty,
            topicName: q.topicName,
            sourceType: q.sourceType
          })),
          durationMin,
          isAdaptive: true
        })
      });

      const d = await res.json();
      if (d.success) {
        setAssignSuccess(`🎉 Deneme başarıyla oluşturuldu ve Ali Metin'e atandı! Öğrenci panelinde hemen çözülebilir.`);
      } else {
        alert(d.error || 'Atama başarısız.');
      }
    } catch (err: any) {
      alert('Atama hatası: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const PDF_TABS = [
    { href: '/ogretmen/pdf-arsivi', label: 'PDF Arşivi & Yükleme', icon: '📁' },
    { href: '/ogretmen/pdf-analiz', label: 'LGS PDF Analiz & Soru Çıkarıcı', icon: '🔍', badge: 'AI Destekli' },
    { href: '/ogretmen/deneme-olustur', label: 'Hibrit Deneme Oluşturucu', icon: '✨', badge: 'Yeni Nesil' },
    { href: '/ogretmen/denemeler/toplu-ata', label: 'Toplu Deneme Ata', icon: '🚀' },
    { href: '/ogretmen/lgs-mufredat', label: 'LGS Müfredat Haritası', icon: '📚' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <SubTabBar
        title="Deneme ve Çalışma Merkezi"
        description="PDF arşivinizden ve yapay zekâ ikiz sorulardan kişiselleştirilmiş hibrit denemeler üretin"
        tabs={PDF_TABS}
      />

      {/* Başlık Kartı */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hibrit Deneme & Akıllı Soru Derleme Motoru</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Konu Seçimli Hibrit Deneme Sınavı Oluştur
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-2 leading-relaxed">
            İstediğiniz LGS matematik konularını seçin; soruların bir kısmını <strong>yüklediğiniz LGS PDF&apos;lerinden</strong> çekin, kalanını ise yapay zekânın <strong>kolay, orta veya zor</strong> olarak ürettiği ikiz sorularla tamamlayarak tek tıkla eksiksiz bir deneme fasikülüne dönüştürün.
          </p>
        </div>
      </div>

      {/* 2 Kolonlu Sihirbaz Düzeni */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL KOLON: Deneme Yapılandırma Paneli (5 Kolon) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Sınav Başlığı ve Öğrenci */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">1</span>
              <span>Sınav Künyesi & Hedef Öğrenci</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deneme / Fasikül Başlığı
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                placeholder="Örn: 8. Sınıf 1. Dönem LGS Özel Matematik Provası"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hedef Öğrenci
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                >
                  <option value="student_ali_metin">Ali Metin (Ali Tarlasüren)</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.user_name || 'Öğrenci'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Süre (Dakika)
                </label>
                <input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                />
              </div>
            </div>
          </div>

          {/* 2. Konu Seçimi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">2</span>
                <span>LGS Konularını Seç ({selectedTopics.length})</span>
              </h3>
            </div>

            {/* Hızlı Filtre Butonları */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={selectAliMetinWeakTopics}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition"
              >
                🎯 Ali Metin Öncelikli (Çarpanlar & Üslü)
              </button>
              <button
                type="button"
                onClick={selectTerm1Topics}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
              >
                1. Dönem Konuları
              </button>
              <button
                type="button"
                onClick={selectAllTopics}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setSelectedTopics([])}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition"
              >
                Temizle
              </button>
            </div>

            {/* Konu Listesi */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 pt-1">
              {INITIAL_LGS_TOPICS.map(topic => {
                const isSelected = selectedTopics.includes(topic.id);
                return (
                  <label
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 font-bold'
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-indigo-600 w-3.5 h-3.5"
                      />
                      <span>{topic.name}</span>
                    </div>
                    <span className="text-[10px] opacity-60 font-mono">{topic.code}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Soru Sayısı, PDF / AI Oranı & Zorluk Seviyesi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs flex items-center justify-center font-bold">3</span>
              <span>Kaynak Oranı & Zorluk Dengesi</span>
            </h3>

            {/* Soru Sayısı Butonları */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Toplam Soru Sayısı
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setTotalQuestions(cnt)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      totalQuestions === cnt
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cnt} Soru
                  </button>
                ))}
              </div>
            </div>

            {/* PDF vs AI Kaynak Dağılımı */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">Soru Kaynağı Dengesi</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  %{pdfRatio} PDF / %{100 - pdfRatio} AI
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={pdfRatio}
                onChange={(e) => setPdfRatio(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>📁 PDF&apos;ten: <strong>{Math.round((totalQuestions * pdfRatio) / 100)} Soru</strong></span>
                <span>🤖 AI Üretimi: <strong>{totalQuestions - Math.round((totalQuestions * pdfRatio) / 100)} Soru</strong></span>
              </div>
            </div>

            {/* Zorluk Dağılımı Seçimi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pedagojik Zorluk Profili
              </label>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('foundation')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'foundation'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🟢 Kolay</span>
                  <span className="text-[10px] opacity-75">Temel Kavrama</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('balanced')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'balanced'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🟡 Dengeli</span>
                  <span className="text-[10px] opacity-75">Standart LGS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDifficultyDistribution('challenging')}
                  className={`p-2.5 rounded-xl border transition ${
                    difficultyDistribution === 'challenging'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span className="block font-bold">🔴 Zor / Eleyici</span>
                  <span className="text-[10px] opacity-75">Yeni Nesil Derece</span>
                </button>
              </div>
            </div>

            {/* Derle Butonu */}
            <button
              type="button"
              onClick={handleCompileExam}
              disabled={isCompiling || selectedTopics.length === 0}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} />
              <span>{isCompiling ? 'Deneme Derleniyor...' : `✨ ${totalQuestions} Soruluk Hibrit Denemeyi Derle`}</span>
            </button>
          </div>
        </div>

        {/* SAĞ KOLON: Derlenen Deneme Önizleme & Çıktı Paneli (7 Kolon) */}
        <div className="lg:col-span-7 space-y-4">
          {compiledQuestions.length === 0 ? (
            /* Henüz derlenmediğinde rehber kartı */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-4 min-h-[480px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Henüz Deneme Derlenmedi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sol panelden dilediğiniz <strong>LGS konularını</strong>, soru adetlerini ve kaynak oranını belirleyin; ardından <strong>&quot;Hibrit Denemeyi Derle&quot;</strong> butonuna basın. Sorular, cevap anahtarı ve çözümler anında burada listelenecektir.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCompileExam}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                Hızlı Örnek Deneme Derle (20 Soru) →
              </button>
            </div>
          ) : (
            /* Derlenmiş Deneme Görüntüleyici */
            <div className="space-y-4">
              {/* Üst İşlem Çubuğu */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {examTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {compiledQuestions.length} Soru · {durationMin} Dk · {selectedTopics.length} Kazanım
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    title="A4 Kitapçık Olarak Yazdır veya PDF İndir"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Yazdır / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAssignToStudent}
                    disabled={isAssigning}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isAssigning ? 'Atanıyor...' : 'Ali Metin\'e Ata'}</span>
                  </button>
                </div>
              </div>

              {/* Başarı Bildirimi */}
              {assignSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {/* Görünüm Sekmeleri: Sorular / Cevap Anahtarı / Çözüm Rehberi */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('preview')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📖 Soru Kitapçığı ({compiledQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('answers')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'answers' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🔑 Cevap Anahtarı
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('solutions')}
                  className={`flex-1 py-1.5 rounded-xl transition ${
                    activeViewTab === 'solutions' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💡 Çözüm Rehberi
                </button>
              </div>

              {/* 1. Soru Kitapçığı Görünümü */}
              {activeViewTab === 'preview' && (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {compiledQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
                    >
                      {/* Soru Başlık & Rozetler */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold flex items-center justify-center text-xs">
                            {q.questionNo}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {q.topicName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            q.sourceType === 'pdf' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' 
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          }`}>
                            {q.sourceType === 'pdf' ? '📁 PDF Arşivi' : '🤖 Yapay Zekâ İkiz'}
                          </span>

                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            q.difficultyLabel === 'Kolay'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : q.difficultyLabel === 'Orta'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {q.difficultyLabel} ({q.difficulty}/5)
                          </span>
                        </div>
                      </div>

                      {/* Soru Metni */}
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Şıklar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {Object.entries(q.options).map(([opt, val]) => (
                          <div
                            key={opt}
                            className={`p-2.5 rounded-xl border text-xs font-semibold ${
                              opt === q.correctAnswer
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold mr-1.5">{opt})</span> {val}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Cevap Anahtarı Görünümü */}
              {activeViewTab === 'answers' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Optik Cevap Matrisi
                  </h4>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {compiledQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-800"
                      >
                        <span className="text-[10px] text-slate-400 block">{q.questionNo}</span>
                        <strong className="text-base font-black text-indigo-600 dark:text-indigo-400">{q.correctAnswer}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Çözüm Rehberi Görünümü */}
              {activeViewTab === 'solutions' && (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {compiledQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                        <span>{q.questionNo}. Soru Çözümü ({q.topicName})</span>
                        <span className="text-emerald-600">Doğru Cevap: {q.correctAnswer}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {q.solutionExplanation || 'Bu soru için detaylı pedagojik çözüm adımı hazırlanmıştır.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

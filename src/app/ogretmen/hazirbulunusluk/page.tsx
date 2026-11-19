'use client';

import { useState, useEffect } from 'react';
import { Target, Award, Brain, Clock, ChevronRight, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface DiagnosticData {
  id: string;
  studentId: string;
  studentName: string;
  overallScore: number;
  overallLevel: string;
  isProvisional: boolean;
  confidenceRating: number;
  skills: {
    calcSkill: number;
    problemSolving: number;
    graphicTable: number;
    mathReasoning: number;
    newGenScore: number;
    timeManagement: number;
  };
  strongTopics: string[];
  weakTopics: string[];
  subOutcomeDeficits: string[];
  suggestedStartPlan: {
    focusTopic?: string;
    weeklyTargetQuestions?: number;
    dailyMinutes?: number;
    recommendedLevel?: string;
  };
  completedAt: string;
}

export default function HazirbulunuslukPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(d => {
        if (d && d.length > 0) {
          setStudents(d);
          setSelectedStudentId(d[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    fetch(`/api/learning/diagnostic?studentId=${selectedStudentId}`)
      .then(r => r.json())
      .then(res => {
        if (res.hasDiagnostic) {
          setData(res.diagnostic);
        } else {
          setData(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  const levelColor = (level: string) => {
    switch (level) {
      case 'ust_duzey': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
      case 'ileri': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300';
      case 'orta': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300';
      case 'gelismekte': return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300';
      default: return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300';
    }
  };

  const levelText = (level: string) => {
    switch (level) {
      case 'ust_duzey': return 'Üst Düzey Başarı';
      case 'ileri': return 'İleri Düzey';
      case 'orta': return 'Orta Düzey';
      case 'gelismekte': return 'Gelişmekte Olan';
      default: return 'Temel Düzey (Destek Gerekli)';
    }
  };

  const ANALYSIS_TABS = [
    { href: '/ogretmen/hazirbulunusluk', label: 'Hazırbulunuşluk & Seviye', icon: '🎯' },
    { href: '/ogretmen/yanlis-analizi', label: 'Akıllı Yanlış Analizi', icon: '🔍' },
    { href: '/ogretmen/unutma-riski', label: 'Aralıklı Tekrar & Risk', icon: '🔁' },
    { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
    { href: '/ogretmen/ogrenci-konu-analizleri', label: 'Öğrenci Konu Analizleri', icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Akıllı Analiz ve Öğrenci Gelişimi"
        description="Hazırbulunuşluk, kök neden analizi, aralıklı tekrar ve eksiklik haritaları"
        tabs={ANALYSIS_TABS}
      />

      {/* Başlık ve Öğrenci Seçici */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            Akıllı Hazırbulunuşluk & Seviye Belirleme
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Öğrencinin 6 boyutta matematiksel becerilerini, alt kazanım eksiklerini ve önerilen başlangıç rotasını analiz edin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Öğrenci Seç:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="input max-w-xs font-semibold"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Değerlendirme verileri yükleniyor...</div>
      ) : !data ? (
        <div className="card text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold">Henüz Seviye Belirleme Yapılmamış</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Bu öğrenci henüz başlangıç tanılama testini tamamlamamıştır. Öğrenciye seviye testi atayabilir veya ilk deneme sonuçlarını kaydedebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seviye ve Durum Özeti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card border-2 border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Genel Matematik Düzeyi</span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-black text-indigo-600">{data.overallScore}</span>
                <span className="text-sm font-semibold text-slate-500">/ 100 Puan</span>
              </div>
              <div className="mt-3">
                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${levelColor(data.overallLevel)}`}>
                  {levelText(data.overallLevel)}
                </span>
              </div>
              {data.isProvisional && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Ön değerlendirmedir; gözlem ve çözülen soru sayısı arttıkça kesinleşecektir.</span>
                </div>
              )}
            </div>

            <div className="card">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Önerilen Başlangıç Rotası</span>
              <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                Odak Konu: <span className="text-indigo-600">{data.suggestedStartPlan.focusTopic || 'Temel Kavramlar'}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p>• Haftalık Hedef: <strong>{data.suggestedStartPlan.weeklyTargetQuestions || 100} soru</strong></p>
                <p>• Günlük Çalışma: <strong>{data.suggestedStartPlan.dailyMinutes || 40} dakika</strong></p>
                <p>• Zorluk Karışımı: <strong>{data.suggestedStartPlan.recommendedLevel || 'Orta Ağırlıklı'}</strong></p>
              </div>
            </div>

            <div className="card">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Analiz Güvenilirlik Derecesi</span>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full"
                    style={{ width: `${Math.round(data.confidenceRating * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold">%{Math.round(data.confidenceRating * 100)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Tanılama testindeki 20 farklı kazanım ve alt beceri değerlendirmesine dayalıdır.
              </p>
            </div>
          </div>

          {/* 6 Matematiksel Beceri Boyutu */}
          <div className="card">
            <h3 className="font-black text-lg flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-indigo-600" />
              6 Boyutlu Matematiksel Beceri Profili
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'İşlem Becerisi (Hız & Doğruluk)', score: data.skills.calcSkill, desc: 'Dört işlem, sadeleştirme ve kuralları akıcı yürütme' },
                { title: 'Problem Çözme Becerisi', score: data.skills.problemSolving, desc: 'Günlük hayat senaryolarını matematiksel çözüme ulaştırma' },
                { title: 'Grafik ve Tablo Yorumlama', score: data.skills.graphicTable, desc: 'Sütun, daire ve çizgi grafiklerini okuma ve dönüştürme' },
                { title: 'Matematiksel Akıl Yürütme', score: data.skills.mathReasoning, desc: 'Mantıksal çıkarım yapma ve varsayımları doğrulama' },
                { title: 'LGS Yeni Nesil Soru Becerisi', score: data.skills.newGenScore, desc: 'Uzun metinli, görselli ve çok adımlı soruları analiz etme' },
                { title: 'Sınav & Süre Yönetimi', score: data.skills.timeManagement, desc: 'Soru başına düşen ideal süreyi dengeli kullanabilme' },
              ].map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{b.title}</span>
                    <span className="font-extrabold text-sm text-indigo-600">%{b.score}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${
                        b.score >= 75 ? 'bg-emerald-500' : b.score >= 55 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Güçlü ve Zayıf Konular & Alt Kazanım Eksikleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
                Güçlü Olduğu Konular
              </h3>
              <ul className="space-y-2">
                {data.strongTopics.map((t, idx) => (
                  <li key={idx} className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
                Öncelikli Geliştirilmesi Gereken Konular
              </h3>
              <ul className="space-y-2">
                {data.weakTopics.map((t, idx) => (
                  <li key={idx} className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Alt Kazanım Eksikleri */}
          {data.subOutcomeDeficits && data.subOutcomeDeficits.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-3">
                🎯 Tespit Edilen Alt Kazanım Açıkları
              </h3>
              <div className="space-y-2">
                {data.subOutcomeDeficits.map((d, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span className="font-black text-amber-600">#{idx + 1}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

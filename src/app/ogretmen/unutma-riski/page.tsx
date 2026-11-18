'use client';

import { useState, useEffect } from 'react';
import { Repeat, AlertTriangle, CheckCircle, Clock, Calendar, ArrowUpRight, Flame } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ForgettingRiskItem {
  topicId: string;
  topicName: string;
  lastStudyText: string;
  daysAgo: number;
  forgettingRisk: 'dusuk' | 'orta' | 'yuksek';
  recommendedAction: string;
}

interface RepetitionItem {
  id: string;
  topicName: string;
  questionText?: string;
  repetitionLevel: number;
  intervalDays: number;
  nextReviewAt: string;
  lastPerformance: string;
  forgettingRisk: string;
  isMastered: boolean;
}

export default function UnutmaRiskiPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [riskTable, setRiskTable] = useState<ForgettingRiskItem[]>([]);
  const [repetitionItems, setRepetitionItems] = useState<RepetitionItem[]>([]);
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
    fetch(`/api/learning/spaced-repetition?studentId=${selectedStudentId}`)
      .then(r => r.json())
      .then(res => {
        setRiskTable(res.forgettingRiskTable || []);
        setRepetitionItems(res.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStudentId]);

  const riskBadge = (risk: string) => {
    switch (risk) {
      case 'yuksek':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">🔴 Yüksek Risk</span>;
      case 'orta':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">🟡 Orta Risk</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">🟢 Düşük Risk</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Seçici */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Repeat className="w-7 h-7 text-indigo-600" />
            Aralıklı Tekrar & Unutma Riski Tahmini
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ebbinghaus öğrenme eğrisi ve gerçek çalışma verilerine dayanarak konuların kalıcılık durumunu takip edin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Öğrenci:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="input max-w-xs font-semibold"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Tekrar verileri yükleniyor...</div>
      ) : (
        <div className="space-y-6">
          {/* Ebbinghaus Bilgilendirme Kartı */}
          <div className="card bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-indigo-600" />
                Bilimsel Aralıklı Tekrar Modeli
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                Öğrenci doğru çözdükçe tekrar aralığı kademeli olarak genişler (1. gün ➔ 3. gün ➔ 7. gün ➔ 14. gün). Yanlış yaparsa aralık yeniden 1 güne çekilir.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Seviye 1: 1 Gün</span>
              <span>•</span>
              <span>Seviye 2: 3 Gün</span>
              <span>•</span>
              <span>Seviye 3: 7 Gün</span>
              <span>•</span>
              <span>Seviye 4: 14 Gün</span>
            </div>
          </div>

          {/* Konu Bazlı Unutma Riski Tablosu (Section 4) */}
          <div className="card space-y-3">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-indigo-600" />
              LGS Konu Bazlı Unutma Riski Haritası
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-3">LGS Matematik Konusu</th>
                    <th className="p-3">Son Çalışma</th>
                    <th className="p-3">Unutma Riski</th>
                    <th className="p-3">Önerilen Pedagojik Eylem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {riskTable.map((item) => (
                    <tr key={item.topicId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{item.topicName}</td>
                      <td className="p-3 text-xs text-slate-500">{item.lastStudyText}</td>
                      <td className="p-3">{riskBadge(item.forgettingRisk)}</td>
                      <td className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {item.recommendedAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Öğrencinin Aktif Tekrar Kuyruğu */}
          <div className="card space-y-3">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Öğrencinin Aralıklı Tekrar Soru Havuzu ({repetitionItems.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repetitionItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-black text-sm text-indigo-600">{item.topicName}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      Kademe: {item.repetitionLevel} ({item.intervalDays} gün aralık)
                    </span>
                  </div>

                  {item.questionText && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                      {item.questionText}
                    </p>
                  )}

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t">
                    <span>Planlanan Tekrar: {new Date(item.nextReviewAt).toLocaleDateString('tr-TR')}</span>
                    {item.isMastered && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Kalıcı Hafızada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

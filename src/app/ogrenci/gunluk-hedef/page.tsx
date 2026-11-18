'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flame, Target, CheckCircle2, Award, Zap, Clock, 
  ArrowRight, Sparkles, BookOpen, Repeat, ArrowRightCircle
} from 'lucide-react';

interface GoalItem {
  id: string;
  type: string;
  title: string;
  durationMin: number;
  questionCount: number;
  completed: boolean;
}

interface GoalData {
  id: string;
  studentId: string;
  goalDate: string;
  title: string;
  items: GoalItem[];
  totalMinutes: number;
  totalQuestions: number;
  completedMinutes: number;
  completedQuestions: number;
  isFullyCompleted: boolean;
  rolledOverToNextDay: boolean;
}

export default function GunlukHedefPage() {
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const streakDays = 7;

  const loadGoal = () => {
    setLoading(true);
    fetch('/api/learning/daily-goals')
      .then(r => r.json())
      .then(res => {
        if (res.hasGoal) {
          setGoalData(res.goal);
        } else {
          setGoalData(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGoal();
  }, []);

  const handleToggleItem = async (itemId: string) => {
    if (!goalData || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/learning/daily-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goalData.id,
          itemId,
          action: 'toggle_item'
        })
      });
      if (res.ok) {
        loadGoal();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollover = async () => {
    if (!goalData || actionLoading) return;
    if (!confirm('Tamamlayamadığınız kalan görevler yarının planına aktarılacaktır. Onaylıyor musunuz?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/learning/daily-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goalData.id,
          action: 'rollover_to_tomorrow'
        })
      });
      if (res.ok) {
        alert('Kalan çalışmalar başarıyla yarının çalışma takvimine aktarıldı!');
        loadGoal();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const completedCount = goalData?.items?.filter(i => i.completed).length || 0;
  const totalCount = goalData?.items?.length || 1;
  const percent = Math.min(100, Math.round((completedCount / totalCount) * 100));

  return (
    <div className="space-y-6">
      {/* Üst Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Flame className="h-4 w-4" /> Günlük Kişiselleştirilmiş Öğrenme Planı
          </div>
          <h1 className="text-2xl font-black">Bugünkü Matematik Çalışmam</h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            LGS matematik eksiklerine, aralıklı tekrar sıklığına ve seviyene göre hazırlanan günlük hedefler.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 backdrop-blur self-start">
          <Flame className="h-5 w-5 text-amber-300 animate-pulse" />
          <span className="text-sm font-black">{streakDays} Günlük Seri! 🔥</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Günlük hedefler yükleniyor...</div>
      ) : !goalData ? (
        <div className="card text-center py-12 space-y-4">
          <Sparkles className="w-12 h-12 text-indigo-500 mx-auto" />
          <h3 className="text-lg font-bold">Harika! Bugünün Tüm Planları Tamamlandı</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Öğretmeniniz yeni bir görev atadığında burada görüntülenecektir. Dilerseniz Soru Bankası veya Denemeler bölümünden serbest çalışma yapabilirsiniz.
          </p>
          <Link href="/ogrenci/ozel-calismam" className="btn-primary inline-flex">
            Bana Özel Çalışma Setine Git
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* İlerleme Özeti */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bugünkü Hedef Durumu</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  %{percent} Tamamlandı ({completedCount} / {totalCount} Görev)
                </h2>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden max-w-md">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Toplam planlanan süre: <strong>{goalData.totalMinutes} dk</strong> | Hedeflenen soru: <strong>{goalData.totalQuestions} adet</strong>
                </p>
              </div>

              {percent === 100 ? (
                <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                  <Award className="w-10 h-10 text-emerald-600 mx-auto mb-1" />
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">Günün Görevi Başarıyla Tamamlandı!</span>
                </div>
              ) : (
                <button
                  onClick={handleRollover}
                  disabled={actionLoading}
                  className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 self-center sm:self-auto"
                  title="Tamamlayamadığınız kalan görevleri cezalandırmadan yarına aktarın"
                >
                  <ArrowRightCircle className="w-4 h-4 text-indigo-600" />
                  Kalanları Yarına Aktar
                </button>
              )}
            </div>

            <div className="card space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pedagojik Prensip</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Her gün az da olsa odaklı çalışma, sınav haftasındaki yoğun ezberden çok daha kalıcıdır. Tamamlayamadığınız maddeler otomatik olarak sonraki güne devredilir.
              </p>
            </div>
          </div>

          {/* 5 Adımlı Günlük Matematik Planı Maddeleri */}
          <div className="card space-y-3">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Bugünün Çalışma Adımları
            </h3>

            <div className="space-y-3">
              {goalData.items.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    item.completed
                      ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 line-through opacity-80'
                      : 'bg-white dark:bg-slate-900 border-slate-200 hover:border-indigo-400 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${
                        item.completed
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {item.completed ? '✓' : idx + 1}
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${item.completed ? 'text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {item.durationMin > 0 && <span>⏱️ ~{item.durationMin} dakika</span>}
                        {item.questionCount > 0 && <span>📝 {item.questionCount} soru</span>}
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    item.completed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {item.completed ? 'Tamamlandı' : 'Tamamla ➔'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

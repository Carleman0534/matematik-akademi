'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Repeat, CheckCircle2, XCircle, AlertCircle, Sparkles, Clock, HelpCircle, ArrowRight } from 'lucide-react';

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

export default function AralikliTekrarPage() {
  const [items, setItems] = useState<RepetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultToast, setResultToast] = useState<string | null>(null);

  const loadItems = () => {
    setLoading(true);
    fetch('/api/learning/spaced-repetition')
      .then(r => r.json())
      .then(res => {
        setItems(res.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAnswer = async (performance: 'correct' | 'incorrect' | 'blank') => {
    if (items.length === 0 || submitting) return;
    const currentItem = items[activeItemIndex];
    setSubmitting(true);

    try {
      const res = await fetch('/api/learning/spaced-repetition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: currentItem.id,
          performance
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (performance === 'correct') {
          setResultToast(`Tebrikler! Doğru çözüm. Tekrar seviyesi ${data.nextLevel}'e yükseltildi (Sonraki tekrar ${data.nextIntervalDays} gün sonra).`);
        } else if (performance === 'incorrect') {
          setResultToast('Öğrenme sürecindesin! Hata pekiştirme için yarın yeniden sorulacak.');
        } else {
          setResultToast('Destek modu devrede. 2 gün sonra tekrar çözülecek.');
        }

        setTimeout(() => {
          setResultToast(null);
          if (activeItemIndex + 1 < items.length) {
            setActiveItemIndex(prev => prev + 1);
          } else {
            loadItems();
            setActiveItemIndex(0);
          }
        }, 1800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const currentItem = items[activeItemIndex];

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
          <Repeat className="h-4 w-4" /> Ebbinghaus Kalıcı Hafıza Sistemi
        </div>
        <h1 className="text-2xl font-black">Aralıklı Tekrar Çalışmalarım</h1>
        <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
          Daha önce yanlış yaptığın veya öğrendiğin sorular, unutma eşiğine geldiğinde tekrar karşına çıkar. Böylece bilgiler LGS'ye kadar kalıcı hale gelir.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Tekrar soruları yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold">Harika! Bugün Çözülmesi Gereken Tekrar Sorusu Yok</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Hafızandaki tüm konular güncel aralıklarla korunuyor. Yeni sorular çözdükçe zamanı gelen tekrarlar buraya düşecektir.
          </p>
          <Link href="/ogrenci/ozel-calismam" className="btn-primary inline-flex">
            Özel Çalışma Setine Git
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* İlerleme */}
          <div className="flex items-center justify-between text-sm font-bold text-slate-600">
            <span>Soru {activeItemIndex + 1} / {items.length}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Tekrar Kademesi: {currentItem.repetitionLevel} ({currentItem.intervalDays} gün aralıklı)
            </span>
          </div>

          {/* Soru Kartı */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-black text-indigo-600 text-sm">
                📌 Konu: {currentItem.topicName}
              </span>
              <span className="text-xs text-slate-500">
                Planlanan Tarih: {new Date(currentItem.nextReviewAt).toLocaleDateString('tr-TR')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
              {currentItem.questionText || 'Kenarları 24 cm ve 36 cm olan dikdörtgen şeklindeki levhadan kenar uzunlukları tam sayı olan kare şeklinde eş parçalar kesilecektir. En az kaç parça elde edilir?'}
            </div>

            {resultToast && (
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold animate-fade-in">
                {resultToast}
              </div>
            )}

            {/* Yanıt Butonları */}
            <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Bu soruyu kendi defterinde veya zihninde çözdükten sonra durumunu işaretle:
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleAnswer('incorrect')}
                  disabled={submitting}
                  className="btn-outline flex-1 sm:flex-none border-rose-300 text-rose-700 hover:bg-rose-50 text-xs py-2 px-3"
                >
                  <XCircle className="w-4 h-4 mr-1 text-rose-600" />
                  Zorlandım / Yanlış
                </button>
                <button
                  onClick={() => handleAnswer('blank')}
                  disabled={submitting}
                  className="btn-outline flex-1 sm:flex-none border-amber-300 text-amber-700 hover:bg-amber-50 text-xs py-2 px-3"
                >
                  <HelpCircle className="w-4 h-4 mr-1 text-amber-600" />
                  Emin Değilim
                </button>
                <button
                  onClick={() => handleAnswer('correct')}
                  disabled={submitting}
                  className="btn-primary flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-4"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Doğru Çözdüm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, ShieldCheck, DollarSign, Cpu, Clock, CheckCircle2, 
  Layers, Sparkles, Filter 
} from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function AiUretimGecmisiPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/generate-questions');
        const data = await res.json();
        if (data.success) {
          setLogs(data.questions || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Cpu className="h-4 w-4" /> AI Modeli ve Maliyet Denetimi
          </div>
          <h1 className="text-2xl font-black">Yapay Zekâ Soru Üretim Geçmişi</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Sistemde yapılan tüm yapay zekâ çağrıları, model parametreleri, harcanan tokenlar, tahmini maliyetler ve matematiksel doğrulama kayıt altına alınır.
          </p>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Kullanılan Ana Model</p>
          <p className="mt-1 text-lg font-black text-indigo-600">Yerel soru motoru</p>
          <p className="mt-0.5 text-xs text-slate-400">kural tabanlı, internet gerekmez</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Üretilen Soru Sayısı</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {logs.length} Soru
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Doğrulanmış</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {logs.filter(l => l.math_validation_status === 'verified').length} Soru
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500">Doğrulama Bekleyen</p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {logs.filter(l => l.math_validation_status !== 'verified').length} Soru
          </p>
        </div>
      </div>

      {/* Günlük Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Üretim ve Doğrulama Kayıtları</h2>
          <span className="text-xs text-slate-500">En son işlemler</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Kayıtlar yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">Henüz yapay zekâ ile üretilmiş soru yok.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((item, idx) => (
              <div key={item.id || idx} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      {item.topic_name || 'LGS Soru Üretimi'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ID: {item.id}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {item.math_validation_status || 'doğrulanmadı'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">
                    {item.question_text}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400 shrink-0">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 block">Yerel soru motoru</span>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

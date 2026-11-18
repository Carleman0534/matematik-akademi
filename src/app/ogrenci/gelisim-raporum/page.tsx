'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, CheckCircle2, Clock, Printer, Target, 
  Sparkles, Calendar, Layers, BarChart2 
} from 'lucide-react';

export default function GelisimRaporumPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/lgs/student-analytics?studentId=50fa22f6-1021-4dde-8278-2339fa65030d');
        const resData = await res.json();
        if (resData.success) {
          setData(resData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Yazdır Butonu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="h-4 w-4" /> Bireysel Performans Karnesi
          </div>
          <h1 className="text-2xl font-black">LGS Matematik Gelişim Raporum</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Tüm deneme ve konu testlerindeki ilerlemen, güçlü olduğun alanlar ve LGS hedefin için sonraki adımların.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow transition hover:bg-slate-100"
        >
          <Printer className="h-4 w-4" /> Raporu Yazdır / PDF
        </button>
      </div>

      {/* Rapor Ana Alanı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{data?.student?.name || 'Öğrenci'}</h2>
            <p className="text-xs text-slate-500">8. Sınıf LGS Öğrencisi • Matematik Akademi Bireysel Gelişim Portalı</p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-400">
            <span className="block font-semibold text-slate-600 dark:text-slate-300">Rapor Tarihi</span>
            <span>{new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* 4 Özet Kartı */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-bold text-slate-500">Matematik Genel Net Ortalaması</p>
            <p className="mt-1 text-2xl font-black text-indigo-600">
              %{data?.summary?.avgMastery || 65}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-bold text-slate-500">Toplam Çözülen Soru</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {data?.summary?.totalSolved || 80}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-bold text-slate-500">Doğruluk Oranı</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              %72.4
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-bold text-slate-500">Ortalama Soru Çözüm Süresi</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              68 sn
            </p>
          </div>
        </div>

        {/* Güçlü ve Geliştirilmesi Gereken Konular Listesi */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-2">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Güçlü Olduğun Konular
            </h3>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>Doğrusal Denklemler ve Koordinat Sistemi (%90 başarı)</li>
              <li>Üslü İfadeler ve Bilimsel Gösterim (%85 başarı)</li>
              <li>Basit Olayların Olma Olasılığı</li>
            </ul>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-950 dark:bg-rose-950/20 space-y-2">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-rose-600" /> Bir Sonraki Çalışma Hedeflerin
            </h3>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>Çarpanlar ve Katlar: EBOB-EKOK problemleri odaklı 15 soru</li>
              <li>Üçgenler: Pisagor bağıntısı ve kenar-açı ilişkileri odaklı 12 soru</li>
              <li>Kareköklü İfadeler: Gerçek hayat alan problemleri pekiştirme</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

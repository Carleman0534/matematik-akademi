'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Sparkles, Users, Clock, ArrowRight, Layers, BookOpen } from 'lucide-react';

export default function DenemeOlusturPage() {
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Deneme Oluşturma Merkezi
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            İster PDF arşivinden toplu sınav atayın, ister soru bankasından yapay zekâ dengeli sınav üretin veya sıfırdan şablon tanımlayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>Toplu Sınav Ata</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 3 Ana Deneme Oluşturma Yolu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. PDF'den Toplu Deneme Ata */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. PDF Arşivinden Toplu Deneme
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Yüklediğiniz TYT/AYT deneme PDF&apos;lerini seçin; süreyi ve başlangıç saatini belirleyip 12 öğrenciye tek tıkla toplu olarak atayın.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">✓ Çift mod: Dijital ekran veya A4 optik çıktı</div>
              <div className="flex items-center gap-1.5">✓ Cevap anahtarı ve süre yönetimi</div>
              <div className="flex items-center gap-1.5">✓ Otomatik puanlama ve ceza böleni</div>
            </div>
          </div>

          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Toplu Deneme Atama Sihirbazı →
          </Link>
        </div>

        {/* 2. Soru Bankasından Akıllı & Dengeli Deneme */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Akıllı Sınav İskeleti (Dengeli)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Öğrencilerin yanlış yaptığı sorulardan pedagojik olarak dengeli (%30 Kolay, %50 Orta, %20 Zor) ve mükerrer soruları engelleyen kişiye özel deneme derleyin.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">✓ MaivenPoint Examena iskelet motoru</div>
              <div className="flex items-center gap-1.5">✓ Son 30 günde çıkmış soruları filtreleme</div>
              <div className="flex items-center gap-1.5">✓ En zayıf konulara ağırlık verme</div>
            </div>
          </div>

          <Link
            href="/ogretmen/denemeler/toplu-ata"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-2xl text-center block shadow-sm transition"
          >
            Akıllı İskeletle Oluştur →
          </Link>
        </div>

        {/* 3. Sıfırdan Yeni Dijital Sınav Şablonu */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Özel Sınav Şablonu Tanımla
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Soru kitapçığı sayfalarını veya fotoğraflarını yükleyin, yönergeleri yazın ve canlı veya ödev modunda yeni bir şablon kaydedin.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">✓ Kitapçık sayfaları yükleme</div>
              <div className="flex items-center gap-1.5">✓ Manuel cevap anahtarı tanımlama</div>
              <div className="flex items-center gap-1.5">✓ Sınıfa özel yayınlama</div>
            </div>
          </div>

          <Link
            href="/ogretmen/denemeler/yeni"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            ＋ Yeni Sınav Şablonu Aç
          </Link>
        </div>
      </div>

      {/* Hızlı Erişim: Mevcut Deneme Şablonları & PDF Arşivi */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Kayıtlı Deneme Şablonları ve PDF Kaynakları</span>
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/ogretmen/denemeler" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Tüm Şablonlar ({'→'})
            </Link>
            <Link href="/ogretmen/pdf-arsivi" className="text-slate-500 hover:underline">
              PDF Arşivi ({'→'})
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-white block">TYT Matematik Denemesi 1</span>
            <p className="text-[11px] text-slate-400">40 Soru · 60 Dakika · Orijinal Yayınları</p>
            <div className="flex items-center gap-2 pt-1">
              <Link href="/ogretmen/denemeler/pdf-1/optik-yazdir" className="text-[11px] font-bold text-indigo-600 hover:underline">
                📄 Optik Form
              </Link>
              <span>·</span>
              <Link href="/ogretmen/denemeler/pdf-1/hizli-optik-giris" className="text-[11px] font-bold text-emerald-600 hover:underline">
                ⚡ Hızlı Notla
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-white block">AYT Fonksiyon & Polinom Taraması</span>
            <p className="text-[11px] text-slate-400">20 Soru · 45 Dakika · 345 Yayınları</p>
            <div className="flex items-center gap-2 pt-1">
              <Link href="/ogretmen/denemeler/toplu-ata" className="text-[11px] font-bold text-indigo-600 hover:underline">
                🚀 Sınıfa Ata
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-white block">Geometri Üçgenler Özel Deneme</span>
            <p className="text-[11px] text-slate-400">15 Soru · 30 Dakika · Öğretmen Hazırlığı</p>
            <div className="flex items-center gap-2 pt-1">
              <Link href="/ogretmen/denemeler/canli" className="text-[11px] font-bold text-amber-600 hover:underline">
                ⏱️ Canlı İzle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

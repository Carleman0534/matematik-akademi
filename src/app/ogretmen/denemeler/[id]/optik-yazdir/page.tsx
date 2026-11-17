'use client';

import React, { use } from 'react';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function OptikYazdirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const questionsCol1 = Array.from({ length: 20 }, (_, i) => i + 1);
  const questionsCol2 = Array.from({ length: 20 }, (_, i) => i + 21);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Yazdırma Kontrol Barı (Yazıcıda Gizlenir) */}
      <div className="print:hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <Link
          href={`/ogretmen/denemeler`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Denemelere Dön</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/ogretmen/denemeler/${id}/hizli-optik-giris`}
            className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
          >
            Öğrenci Cevaplarını Gir →
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Optik Formu Yazdır (A4)</span>
          </button>
        </div>
      </div>

      {/* A4 STANDART OPTİK FORM KAĞIDI (Baskıya Hazır) */}
      <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 mx-auto w-full max-w-[210mm] min-h-[297mm]">
        {/* Başlık Alanı */}
        <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight uppercase">Matematik Akademi</span>
              <span className="text-xs font-bold bg-black text-white px-2 py-0.5 rounded">OPTİK CEVAP KAĞIDI</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Özel Ders & Kurumsal Deneme Sınav Takip Sistemi</p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div><strong>Tarih:</strong> ____ / ____ / 2026</div>
            <div><strong>Sınav Kodu:</strong> OPT-{id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {/* Öğrenci Bilgileri Kutusu */}
        <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 rounded-lg text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold w-28">Adı Soyadı:</span>
              <span className="border-b border-black flex-1 pb-1"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold w-28">Öğrenci No / Sınıf:</span>
              <span className="border-b border-black flex-1 pb-1"></span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold w-24">Deneme Adı:</span>
              <span className="border-b border-black flex-1 pb-1">TYT / AYT Matematik Denemesi</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold w-24">Kitapçık Türü:</span>
              <div className="flex gap-4 font-bold">
                <span>( A )</span>
                <span>( B )</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kodlama Yönergesi */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg mb-6 text-[11px] text-slate-600 flex items-center justify-between">
          <span>⚠️ <strong>DOLDURMA TALİMATI:</strong> Cevaplarınızı kutucukların dışına taşırmadan koyu kurşun kalemle doldurunuz.</span>
          <div className="flex items-center gap-2 font-bold">
            <span>Doğru Kodlama:</span>
            <span className="w-4 h-4 rounded-full bg-black inline-block"></span>
            <span>Yanlış:</span>
            <span className="border border-black rounded-full px-1">✓</span>
          </div>
        </div>

        {/* 2 SÜTUNLU OPTİK CEVAP KUTUCUKLARI (1..40) */}
        <div className="grid grid-cols-2 gap-8 border-2 border-black p-6 rounded-xl">
          {/* 1. SÜTUN: 1 - 20 */}
          <div className="space-y-2">
            <div className="font-bold text-center text-xs border-b border-black pb-1 mb-2">1. BÖLÜM (SORU 1 - 20)</div>
            {questionsCol1.map((q) => (
              <div key={q} className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-xs w-8 font-mono">{q.toString().padStart(2, '0')}.</span>
                <div className="flex items-center gap-3">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div
                      key={opt}
                      className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 2. SÜTUN: 21 - 40 */}
          <div className="space-y-2">
            <div className="font-bold text-center text-xs border-b border-black pb-1 mb-2">2. BÖLÜM (SORU 21 - 40)</div>
            {questionsCol2.map((q) => (
              <div key={q} className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-xs w-8 font-mono">{q.toString().padStart(2, '0')}.</span>
                <div className="flex items-center gap-3">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div
                      key={opt}
                      className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-400">
          Bu optik form Matematik Akademi platformu üzerinden otomatik üretilmiştir. Sınav sonrasında öğretmen panelinden hızlıca puanlanabilir.
        </div>
      </div>
    </div>
  );
}

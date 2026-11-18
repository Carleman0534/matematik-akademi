'use client';

import React, { use } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OptikYazdirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Görsel 3 ile birebir uyumlu: 3 Sütunlu (1..16, 17..32, 33..48)
  const col1 = Array.from({ length: 16 }, (_, i) => i + 1);
  const col2 = Array.from({ length: 16 }, (_, i) => i + 17);
  const col3 = Array.from({ length: 16 }, (_, i) => i + 33);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Yazdırma Kontrol Barı (Baskıda Gizlenir) */}
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

      {/* A4 STANDART BASILI OPTİK CEVAP KAĞIDI (Görsel 3 ile Birebir Uyumlu) */}
      <div className="bg-white text-black p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 mx-auto w-full max-w-[210mm] min-h-[297mm] font-sans">
        {/* Üst Kısım: Sol QR, Yönergeler, Sağ QR */}
        <div className="border border-black p-3 mb-4 flex items-center justify-between gap-4">
          {/* Sol QR Kodu Şablonu */}
          <div className="w-16 h-16 border-2 border-black flex flex-col items-center justify-center p-1 shrink-0 bg-slate-50">
            <div className="w-full h-full border border-black flex items-center justify-center font-mono font-bold text-[9px] text-center leading-tight">
              OPTIC QR-1
            </div>
          </div>

          {/* Orta: Doldurma Talimatları */}
          <div className="text-[11px] leading-snug flex-1">
            <div className="font-bold uppercase tracking-wider">KODLAMA YÖNERGESİ / INSTRUCTIONS</div>
            <p className="text-slate-700 mt-0.5">
              Her soru için yalnızca bir seçeneği koyu kurşun kalemle doldurunuz. Karalama yapmayınız.
            </p>
            <div className="flex items-center gap-2 mt-1 font-semibold">
              <span>Doğru doldurma örneği:</span>
              <span className="w-4 h-3 rounded-full bg-black inline-block"></span>
            </div>
          </div>

          {/* Sağ QR Kodu Şablonu */}
          <div className="w-16 h-16 border-2 border-black flex flex-col items-center justify-center p-1 shrink-0 bg-slate-50">
            <div className="w-full h-full border border-black flex items-center justify-center font-mono font-bold text-[9px] text-center leading-tight">
              OPTIC QR-2
            </div>
          </div>
        </div>

        {/* Öğrenci Bilgileri Çizgileri */}
        <div className="border-t border-b border-black py-2.5 mb-6 text-xs flex justify-between gap-6 font-semibold">
          <div className="flex items-center gap-2 flex-1">
            <span>Öğrenci Adı Soyadı:</span>
            <span className="border-b border-black flex-1"></span>
          </div>
          <div className="flex items-center gap-2 w-44">
            <span>Tarih:</span>
            <span className="border-b border-black flex-1"></span>
          </div>
          <div className="flex items-center gap-2 w-32">
            <span>Sınıf / No:</span>
            <span className="border-b border-black flex-1"></span>
          </div>
        </div>

        {/* 3 SÜTUNLU 48 SORULUK OPTİK BALONCUK IZGARASI (Görsel 3 formatı) */}
        <div className="grid grid-cols-3 gap-6 border-t-2 border-b-2 border-black py-4">
          {/* 1. SÜTUN: 1 - 16 */}
          <div className="space-y-1.5 border-r border-slate-300 pr-4">
            {col1.map((q) => (
              <div key={q} className="flex items-center justify-between py-0.5">
                <span className="font-bold text-xs w-6 font-mono text-right mr-2">{q}</span>
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div
                      key={opt}
                      className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-[10px]"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 2. SÜTUN: 17 - 32 */}
          <div className="space-y-1.5 border-r border-slate-300 pr-4">
            {col2.map((q) => (
              <div key={q} className="flex items-center justify-between py-0.5">
                <span className="font-bold text-xs w-6 font-mono text-right mr-2">{q}</span>
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div
                      key={opt}
                      className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-[10px]"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 3. SÜTUN: 33 - 48 */}
          <div className="space-y-1.5">
            {col3.map((q) => (
              <div key={q} className="flex items-center justify-between py-0.5">
                <span className="font-bold text-xs w-6 font-mono text-right mr-2">{q}</span>
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div
                      key={opt}
                      className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-[10px]"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt Kısım: Barkod / QR ve Telif Bilgisi (Görsel 3 ile Birebir) */}
        <div className="border border-black p-3 mt-6 flex items-center justify-between gap-4 text-[10px]">
          <div className="w-14 h-14 border border-black flex items-center justify-center font-mono font-bold text-[8px] text-center">
            QR VERIFY
          </div>
          <div className="flex-1 text-center text-slate-600 leading-tight">
            Bu optik cevap formu Matematik Akademi akıllı soru ve deneme sistemi için otomatik olarak üretilmiştir.
            Sınav bittiğinde öğretmen panelindeki <strong>Hızlı Optik Giriş</strong> ekranından 30 saniyede değerlendirilebilir.
          </div>
          <div className="w-14 h-14 border border-black flex items-center justify-center font-mono font-bold text-[8px] text-center">
            BARCODE
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Map, Award, AlertTriangle, ArrowRight, Download, Users, CheckCircle2, FileText } from 'lucide-react';
import { SubTabBar } from '@/components/SubTabBar';

export default function RaporlarPage() {
  const REPORTS_TABS = [
    { href: '/ogretmen/raporlar', label: 'Raporlama Merkezi', icon: '📋' },
    { href: '/ogretmen/veli-raporlari', label: 'Veli Gelişim Raporları', icon: '🌱', badge: 'Haftalık' },
    { href: '/ogretmen/veri-aktar', label: 'Veri Dışa Aktarma & Yedek', icon: '📥' },
    { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
  ];

  return (
    <div className="space-y-6">
      {/* Üst Alt-Sekme Şeridi */}
      <SubTabBar
        title="Raporlar ve Veri Yönetimi"
        description="Akademi performans raporları, veli bilgilendirme mektupları ve veri yedekleme"
        tabs={REPORTS_TABS}
      />

      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Raporlar ve Performans Analiz Merkezi
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencilerinizin deneme sonuçlarını, konu bazlı eksiklik haritasını ve aralıklı tekrar kalıcılık analizlerini inceleyin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ogretmen/deneme-analizleri"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>Deneme Analizlerini Aç</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Ana Rapor Modülü Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Deneme Analizleri & Soru Dağılımı (OnlineExamMaker) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Toplu Deneme Analizleri & Sıralama
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tamamlanan denemelerin öğrenci sıralaması, net hesabı, soru tipi ve zorluk dağılımları ve sınıfın ortak hata yaptığı kritik sorular.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ Doğru, yanlış, boş ve net puan tablosu</div>
              <div>✓ Çoğunluğun düştüğü tuzak şık analizleri</div>
              <div>✓ Yanlışları tek tıkla soru bankasına aktarma</div>
            </div>
          </div>

          <Link
            href="/ogretmen/deneme-analizleri"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Deneme Analizlerini Aç →
          </Link>
        </div>

        {/* 2. Konu Bazlı Eksiklik Isı Haritası (Pedagogy Suite) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                <Map className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Konu Bazlı Eksiklik Isı Haritası
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Öğrencilerin konu ve beceri düzeyindeki yeterliliklerini tek ekranda renkli matris üzerinde analiz edin; yapay zekâ içgörüleriyle zayıf halkaları tespit edin.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ Beceriler vs. Öğrenci Yetkinlik Isı Haritası</div>
              <div>✓ Sınıf Konu Başarı Ortalaması çubukları</div>
            </div>
          </div>

          <Link
            href="/ogretmen/eksiklik-haritasi"
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Eksiklik Haritasını İncele →
          </Link>
        </div>

        {/* 3. Gelişim Karşılaştırma & Seri Analizi (Student Progress) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Gelişim & Seri Karşılaştırma
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bir öğrencinin denemeler arasındaki net değişimini bir önceki denemeye göre karşılaştırın.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ Denemeden denemeye net farkı</div>
              <div>✓ Güçlü konular listesi</div>
              <div>✓ Telafi gereken konular</div>
            </div>
          </div>

          <Link
            href="/ogretmen/deneme-analizleri/karsilastir"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Gelişim Paneline Git →
          </Link>
        </div>

        {/* 4. Öğrenme Kanıtı & Kalıcılık Dağılımı (Classting Kore LMS) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. Öğrenme Kanıtı & Kalıcılık Dağılımı
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Soruların sadece bir kez değil, farklı günlerde art arda doğru çözülme kanıtına göre kalıcı öğrenilme oranları.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ Öğrenme Durumu Dağılımı Donut Halkası (%58 Kalıcı)</div>
              <div>✓ Haftalık Kazanım Başarı Oranı Trendi</div>
              <div>✓ Çan eğrili seviye dağılım sütunları</div>
            </div>
          </div>

          <Link
            href="/ogretmen/deneme-analizleri"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Öğrenme Kanıtı Grafiğini Aç →
          </Link>
        </div>

        {/* 5. Akıllı Deneme Sonrası 10 Bölümlü Değerlendirme Raporu */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                10 Bölümlü Rapor
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              5. Akıllı Deneme Sonrası Değerlendirme Raporu
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Her deneme sınavı sonrasında öğrenciye özel 10 bölümlü analiz: alt kazanımlar, zorluk dağılımı, zaman yönetimi, hata kategorileri ve yapay zekâ metni.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ 10 bölümlü pedagojik tam analiz</div>
              <div>✓ Yapay zekâ kişisel değerlendirme metni</div>
              <div>✓ Öğretmen onayı ile veliyle paylaşma</div>
            </div>
          </div>

          <Link
            href="/ogretmen/deneme-degerlendirme"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Akıllı Deneme Raporunu İncele →
          </Link>
        </div>

        {/* 6. Veri Dışa Aktarma & Excel / CSV İndirme */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Excel / CSV / JSON
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              6. Veri Dışa Aktarma Merkezi
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Öğrenci listeleri, deneme sınav sonuçları, konu başarı oranları ve hata analizi kayıtlarını UTF-8 uyumlu Excel (CSV) ve JSON formatlarında dışa aktarın.
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div>✓ Excel Türkçe karakter uyumlu (UTF-8 BOM)</div>
              <div>✓ Tarih aralığı ve öğrenci bazlı filtreleme</div>
              <div>✓ Tek tıkla anında dosya indirme</div>
            </div>
          </div>

          <Link
            href="/ogretmen/veri-aktar"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl text-center block shadow-sm transition"
          >
            Veri Aktarma Merkezine Git →
          </Link>
        </div>
      </div>
    </div>
  );
}

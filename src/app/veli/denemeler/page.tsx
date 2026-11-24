'use client';

import { resolveParentStudentId } from '@/lib/parentChild';
import React, { useState, useEffect } from 'react';
import { 
  FileText, TrendingUp, CheckCircle2, Clock, Calendar, 
  BarChart3, AlertCircle, Award 
} from 'lucide-react';

export default function VeliDenemelerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('parent_active_student_id');
      const studentId = await resolveParentStudentId(saved);
      if (!studentId) { setData(null); return; }
      const res = await fetch(`/api/parent/student-data?studentId=${studentId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
    const handleChildChange = () => fetchExamData();
    window.addEventListener('active_student_changed', handleChildChange);
    return () => window.removeEventListener('active_student_changed', handleChildChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="h-4 w-4" /> Sınav Başarı Karnesi
          </div>
          <h1 className="text-2xl font-black">Deneme Sınavı Sonuçları ve Net Gelişimi</h1>
          <p className="text-sm text-blue-100 mt-1 max-w-2xl">
            Öğrencinizin girdiği tüm matematik deneme sınavlarının netleri, doğru-yanlış dağılımı ve zaman içindeki gelişim grafiği.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Deneme sonuçları yükleniyor...</div>
      ) : data?.permissions?.show_exam_results === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h3 className="text-sm font-bold">Deneme Sonuçları Henüz Paylaşıma Açılmadı</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Öğretmeniniz deneme sınavı değerlendirmesini tamamladıktan sonra sonuçlar veli panelinizde görüntülenecektir.
          </p>
        </div>
      ) : (
        <>
          {/* Net Gelişim Grafiği Özeti */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Son Denemelerdeki Net Gelişim Trendi
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {data?.examResults?.map((res: any, idx: number) => (
                <div key={res.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Deneme #{data.examResults.length - idx}</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {res.netChange !== '0.00' ? `${res.netChange} net` : 'İlk Deneme'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{res.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-600">{res.net}</span>
                    <span className="text-xs text-slate-400">/ {res.totalQuestions} Net</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ayrıntılı Sonuç Listesi */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deneme Geçmişi</h3>
              <span className="text-xs text-slate-500">Tüm oturumlar</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.examResults?.map((res: any) => (
                <div key={res.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{res.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {res.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {res.durationMin} dakika</span>
                      <span>•</span>
                      <span>Toplam {res.totalQuestions} Soru</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-semibold">Doğru / Yanlış / Boş</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        <b className="text-emerald-600">{res.correct}D</b> - <b className="text-rose-600">{res.wrong}Y</b> - <b className="text-slate-400">{res.blank}B</b>
                      </span>
                    </div>

                    <div className="text-right rounded-xl bg-indigo-50 px-3.5 py-1.5 dark:bg-indigo-950/40">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase block">Net Puan</span>
                      <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">{res.net}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

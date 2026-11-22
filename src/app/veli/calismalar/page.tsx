'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Clock, Calendar, CheckCircle2, AlertCircle, 
  Layers, Lock 
} from 'lucide-react';

export default function VeliCalismalarPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('parent_active_student_id');
      const studentId = (saved && saved !== '50fa22f6-1021-4dde-8278-2339fa65030d') ? saved : 'student_muhammed_talha';
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
    fetchAssignments();
    const handleChildChange = () => fetchAssignments();
    window.addEventListener('active_student_changed', handleChildChange);
    return () => window.removeEventListener('active_student_changed', handleChildChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckSquare className="h-4 w-4" /> Bireysel Ödev ve Test Takibi
          </div>
          <h1 className="text-2xl font-black">Matematik Çalışma ve Ödev Takibi</h1>
          <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
            Öğretmenimizin öğrencinize özel atadığı pekiştirme testleri, ödevler ve tamamlanma durumları. (Bu ekran yalnızca veli bilgilendirme amaçlıdır).
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2 text-xs font-bold backdrop-blur self-start">
          <Lock className="h-4 w-4" /> Salt Okunur Takip
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Çalışma listesi yükleniyor...</div>
      ) : data?.permissions?.show_assignments === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h3 className="text-sm font-bold">Ödev ve Çalışma Listesi Henüz Paylaşıma Açılmadı</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Öğretmeniniz çalışma atamalarını veli görünümüne açtığında burada listelenecektir.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Atanan Çalışma ve Testler</h2>
            <span className="text-xs text-slate-500">Öğrencinin kendi hesabından çözdüğü çalışmalar</span>
          </div>

          {data?.assignments && data.assignments.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.assignments.map((work: any) => (
                <div key={work.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {work.totalQuestions} Soru
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {work.durationMin} dakika
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {work.createdAt}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{work.title}</h3>
                    {work.description && (
                      <p className="text-xs text-slate-500">{work.description}</p>
                    )}
                  </div>

                  <div className="self-end sm:self-center">
                    <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                      work.status === 'Tamamlandı'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {work.status === 'Tamamlandı' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Tamamlandı
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" /> Devam Ediyor
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              Şu an atanmış aktif bir çalışma bulunmuyor.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, CheckCircle2, AlertCircle, Sparkles, 
  BookOpen, ChevronRight, Info 
} from 'lucide-react';

export default function VeliKonuGelisimiPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTopicData = async () => {
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
    fetchTopicData();
    const handleChildChange = () => fetchTopicData();
    window.addEventListener('active_student_changed', handleChildChange);
    return () => window.removeEventListener('active_student_changed', handleChildChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-teal-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="h-4 w-4" /> MEB LGS Matematik Kazanımları
          </div>
          <h1 className="text-2xl font-black">Konu Bazlı Gelişim ve Ustalık Durumu</h1>
          <p className="text-sm text-teal-100 mt-1 max-w-2xl">
            Öğrencinizin LGS matematik müfredatındaki 12 ana ünitedeki yetkinlik düzeyi ve öğretmenimizin hazırladığı rehberlik notları.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Konu gelişim verileri yükleniyor...</div>
      ) : data?.permissions?.show_topic_analytics === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h3 className="text-sm font-bold">Konu Analizleri Henüz Paylaşıma Açılmadı</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Öğretmeniniz öğrencinin kazanım değerlendirmelerini tamamladıktan sonra detaylı konu karnesi bu alanda görüntülenecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/30 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              <b>Veli Bilgilendirme İlkesi:</b> Başarı oranları öğrencinin deneme sınavları, soru bankası pratikleri ve tekrar çalışmalarının ağırlıklı ortalamasıyla hesaplanır. Amaç eksikleri cezalandırmak değil, hedefe yönelik ek çalışmalarla güçlendirmektir.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {data?.topicMastery?.map((topic: any) => {
              const mastery = topic.mastery_score || 0;
              return (
                <div 
                  key={topic.topic_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        mastery >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        mastery >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {topic.constructiveStatus}
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        %{mastery}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {topic.topic_name}
                    </h3>

                    {/* İlerleme Çubuğu */}
                    <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${
                          mastery >= 80 ? 'bg-emerald-500' :
                          mastery >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${mastery}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                      {topic.constructiveNote}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Çözülen: {topic.solved_count || 0} Soru</span>
                    <span>Doğru: {topic.correct_count || 0} • Yanlış: {topic.wrong_count || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

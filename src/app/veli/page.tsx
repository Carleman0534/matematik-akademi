'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, Award, CheckCircle2, Clock, MessageSquare, 
  ArrowRight, Sparkles, Target, AlertTriangle, BookOpen, Layers 
} from 'lucide-react';

export default function VeliAnaEkranPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('parent_active_student_id');
      const studentId = (saved && saved !== '50fa22f6-1021-4dde-8278-2339fa65030d') ? saved : 'student_ali_metin';
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
    fetchStudentData();

    const handleChildChange = () => {
      fetchStudentData();
    };
    window.addEventListener('active_student_changed', handleChildChange);
    return () => window.removeEventListener('active_student_changed', handleChildChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Karşılama Kartı */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> Matematik Akademi Veli Portalı
          </div>
          <h1 className="text-2xl font-black">
            {data?.student?.name ? `${data.student.name} – Gelişim Raporu` : 'Öğrenci Gelişim Takip Portalı'}
          </h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
            Öğrencinizin LGS matematik hazırlık sürecini, deneme sınavı net artışını, konu yetkinliklerini ve öğretmeninin paylaştığı özel değerlendirme notlarını bu ekrandan takip edebilirsiniz.
          </p>
        </div>
        <Link
          href="/veli/denemeler"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-blue-50"
        >
          Deneme Sonuçlarını İncele <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Öğrenci verileri yükleniyor...</div>
      ) : (
        <>
          {/* Gösterge Tablosu (Section 20.3) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Genel Matematik Performans Göstergeleri
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-semibold text-slate-500">Son Deneme Neti</span>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {data?.kpis?.lastNet || '14,25 net'}
                </p>
                <span className="text-[11px] text-slate-400">Önceki: {data?.kpis?.prevNet || '11,50 net'}</span>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Net Değişimi</span>
                <p className="mt-1 text-2xl font-black text-emerald-600">
                  {data?.kpis?.netChange || '+2,75'}
                </p>
                <span className="text-[11px] text-emerald-600 font-bold">Artış eğiliminde 📈</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-semibold text-slate-500">Çözülen Soru</span>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {data?.kpis?.totalQuestionsSolved || 320}
                </p>
                <span className="text-[11px] text-slate-400">Deneme ve test toplamı</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-semibold text-slate-500">Genel Başarı Oranı</span>
                <p className="mt-1 text-2xl font-black text-indigo-600">
                  {data?.kpis?.generalSuccessRate || '%72'}
                </p>
                <span className="text-[11px] text-slate-400">Kazanım ortalaması</span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-semibold text-slate-500">En Güçlü Alan</span>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  Doğrusal Denklemler
                </p>
                <span className="text-[11px] text-emerald-600 font-bold">%90 Ustalık</span>
              </div>
            </div>
          </div>

          {/* İki Kolon: Öğretmen Notları & Konu Durumu */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Öğretmenin Paylaştığı Notlar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  Öğretmenden Veliye Özel Değerlendirme
                </h3>
                <Link href="/veli/ogretmen-notlari" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  Tümünü Gör
                </Link>
              </div>

              {data?.teacherNotes && data.teacherNotes.length > 0 ? (
                <div className="space-y-3">
                  {data.teacherNotes.slice(0, 2).map((note: any) => (
                    <div key={note.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        "{note.message}"
                      </p>
                      <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                        <span>Matematik Öğretmeni: {note.teacher_name || 'Öğretmen'}</span>
                        <span>{note.created_at ? new Date(note.created_at).toLocaleDateString('tr-TR') : 'Bu hafta'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Henüz iletilen bir öğretmen notu bulunmuyor.</p>
              )}
            </div>

            {/* Konu Gelişimi ve Hedefli Çalışmalar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Öğrencinin LGS Konu Durumu
                </h3>
                <Link href="/veli/konu-gelisimi" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  Konu Karnesi
                </Link>
              </div>

              <div className="space-y-3">
                {data?.topicMastery?.slice(0, 4).map((topic: any) => (
                  <div key={topic.topic_id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{topic.topic_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{topic.constructiveStatus}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 dark:bg-slate-800">
                        <div 
                          className={`h-2 rounded-full ${
                            topic.mastery_score >= 80 ? 'bg-emerald-500' :
                            topic.mastery_score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${topic.mastery_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        %{topic.mastery_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

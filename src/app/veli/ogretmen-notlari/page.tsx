'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, User, Calendar, CheckCircle2, AlertCircle, 
  Sparkles, HeartHandshake 
} from 'lucide-react';

export default function VeliOgretmenNotlariPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
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
    fetchNotes();
    const handleChildChange = () => fetchNotes();
    window.addEventListener('active_student_changed', handleChildChange);
    return () => window.removeEventListener('active_student_changed', handleChildChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider mb-1">
            <HeartHandshake className="h-4 w-4" /> Öğretmen–Veli İşbirliği
          </div>
          <h1 className="text-2xl font-black">Öğretmenden Veliye Özel Notlar</h1>
          <p className="text-sm text-purple-100 mt-1 max-w-2xl">
            Matematik öğretmeninizin öğrencinizin ders içi performansı, ev çalışma alışkanlıkları ve sınav hazırlığı hakkında sizinle paylaştığı özel değerlendirme notları.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Öğretmen notları yükleniyor...</div>
      ) : data?.permissions?.show_teacher_notes === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h3 className="text-sm font-bold">Öğretmen Notları Henüz Paylaşıma Açılmadı</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Öğretmeniniz yeni bir değerlendirme notu paylaştığında bu sayfada görüntülenecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.teacherNotes && data.teacherNotes.length > 0 ? (
            data.teacherNotes.map((note: any) => (
              <div 
                key={note.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-xs">
                      Ö
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {note.teacher_name || 'Matematik Öğretmeni'}
                      </h3>
                      <span className="text-[11px] text-slate-400">Özel Veli Bilgilendirme Notu</span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {note.created_at ? new Date(note.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Bu hafta'}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {note.message}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Henüz iletilen bir öğretmen notu bulunmuyor.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle2, MessageSquare, FileText, Sparkles, 
  Clock, Calendar, BookOpen 
} from 'lucide-react';

export default function VeliBildirimlerPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const res = await fetch('/api/guardians/notifications', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const rows: any[] = Array.isArray(data.notifications) ? data.notifications : [];
        setNotifications(rows.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          time: n.created_at ? new Date(String(n.created_at).replace(' ', 'T')).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
          isRead: !!n.read_at,
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Bell className="h-4 w-4" /> Süreç ve Gelişim Bildirimleri
          </div>
          <h1 className="text-2xl font-black">Veli Bildirim Merkezi</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Öğrencinizin tamamladığı denemeler, açıklanan sonuçlar, yeni atanan çalışmalar ve öğretmen notları hakkında anlık bildirimler.
          </p>
        </div>
      </div>

      {/* Bildirim Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Son Bildirimler ({notifications.length})</h2>
          <span className="text-xs text-slate-400">Okunmamış bildirimler vurgulanır</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Bildirimler yükleniyor...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">Henüz bildiriminiz yok.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div 
                key={n.id}
                className={`p-5 flex items-start gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                  !n.isRead ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  n.type === 'exam_result' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60' :
                  n.type === 'teacher_note' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                }`}>
                  {n.type === 'exam_result' ? <FileText className="h-5 w-5" /> :
                   n.type === 'teacher_note' ? <MessageSquare className="h-5 w-5" /> :
                   <CheckCircle2 className="h-5 w-5" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h3>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {n.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

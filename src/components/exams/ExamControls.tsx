'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStatus, startLive, deleteExam } from '@/app/ogretmen/denemeler/actions';
import type { Phase } from '@/lib/exams';

export function ExamControls({ id, phase, mode, sessions }: { id: string; phase: Phase; mode: 'live' | 'assignment'; sessions: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const run = (f: () => Promise<{ error?: string; ok?: string }>, confirmText?: string, after?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await f();
      setMsg(r);
      if (!r.error) { if (after) router.push(after); else router.refresh(); }
    });
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {phase === 'taslak' && mode === 'live' && <>
          <button className="btn-secondary" disabled={pending} onClick={() => run(() => setStatus(id, 'published'))}>Öğrencilere duyur (bekleme odası)</button>
          <button className="btn-primary" disabled={pending} onClick={() => run(() => startLive(id), 'Deneme şimdi başlasın mı? Süre herkes için birlikte işlemeye başlar.', `/ogretmen/denemeler/${id}/canli`)}>▶ Şimdi başlat</button>
        </>}
        {phase === 'bekliyor' && <>
          <button className="btn-primary" disabled={pending} onClick={() => run(() => startLive(id), 'Deneme şimdi başlasın mı? Süre herkes için birlikte işlemeye başlar.', `/ogretmen/denemeler/${id}/canli`)}>▶ Şimdi başlat</button>
          <button className="btn-secondary" disabled={pending} onClick={() => run(() => setStatus(id, 'draft'))}>Taslağa al</button>
        </>}
        {phase === 'taslak' && mode === 'assignment' && <button className="btn-primary" disabled={pending} onClick={() => run(() => setStatus(id, 'published'))}>Yayımla</button>}
        {(phase === 'acik' || phase === 'acilacak') && sessions === 0 && <button className="btn-secondary" disabled={pending} onClick={() => run(() => setStatus(id, 'draft'))}>Taslağa al</button>}
        {(phase === 'canli' || phase === 'acik' || phase === 'acilacak') && (
          <button className="btn-danger" disabled={pending} onClick={() => run(() => setStatus(id, 'closed'), 'Deneme şimdi bitirilsin mi? Çözmekte olan öğrencilerin o ana kadarki cevapları kaydedilir.')}>■ Denemeyi bitir</button>
        )}
        {phase === 'bitti' && mode === 'assignment' && <button className="btn-secondary" disabled={pending} onClick={() => run(() => setStatus(id, 'published'), 'Deneme yeniden açılsın mı? (Son teslim tarihi geçtiyse önce ayarlardan uzatın.)')}>Yeniden aç</button>}
        <button className="btn-secondary text-red-600" disabled={pending} onClick={() => run(() => deleteExam(id), 'Deneme tamamen silinsin mi? Sayfalar, cevap anahtarı ve öğrenci cevapları silinir. Bu geri alınamaz.', '/ogretmen/denemeler')}>Sil</button>
      </div>
      {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
      {msg.ok && !msg.error && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</p>}
    </div>
  );
}

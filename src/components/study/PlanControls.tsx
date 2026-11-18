'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPlanStatus, deletePlan } from '@/app/ogretmen/ogrenme-planlari/actions';

export function PlanControls({ id, status, answered }: { id: string; status: string; answered: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const run = (f: () => Promise<{ error?: string; ok?: string }>, confirmText?: string, after?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => { const r = await f(); setMsg(r); if (!r.error) { if (after) router.push(after); else router.refresh(); } });
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && <button className="btn-primary" disabled={pending} onClick={() => run(() => setPlanStatus(id, 'assigned'))}>Öğrenciye ata</button>}
        {status === 'assigned' && !answered && <button className="btn-secondary" disabled={pending} onClick={() => run(() => setPlanStatus(id, 'draft'))}>Taslağa al</button>}
        {status !== 'archived' && <button className="btn-secondary" disabled={pending} onClick={() => run(() => setPlanStatus(id, 'archived'), 'Plan arşivlensin mi? Öğrenci artık göremez; öğrenme geçmişi korunur.')}>Arşivle</button>}
        {!answered && <button className="btn-secondary text-red-600" disabled={pending} onClick={() => run(() => deletePlan(id), 'Plan silinsin mi? Bu geri alınamaz.', '/ogretmen/ogrenme-planlari')}>Sil</button>}
      </div>
      {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
      {msg.ok && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</p>}
    </div>
  );
}

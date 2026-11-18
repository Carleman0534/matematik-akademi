'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshAll, dismissRecommendation, type RecResult } from './actions';

export function RefreshButton({ studentId, label }: { studentId?: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<RecResult>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(async () => { setMsg(await refreshAll(studentId)); router.refresh(); })}>{pending ? 'İnceleniyor…' : label || '🔄 Önerileri yenile'}</button>
      {msg.error && <span role="alert" className="text-sm text-red-600">{msg.error}</span>}
      {msg.ok && <span role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</span>}
    </div>
  );
}

export function DismissButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <>
      <button type="button" className="text-xs font-semibold text-slate-500 hover:text-red-600 hover:underline" disabled={pending}
        onClick={() => start(async () => { const r = await dismissRecommendation(id); if (r.error) setErr(r.error); else router.refresh(); })}>Reddet</button>
      {err && <span role="alert" className="text-xs text-red-600">{err}</span>}
    </>
  );
}

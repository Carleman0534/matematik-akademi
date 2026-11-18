'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transferWrongs } from '@/app/ogretmen/denemeler/actions';

export function TransferButton({ examId, studentIds, label, pendingCount }: { examId: string; studentIds?: string[]; label: string; pendingCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const go = () => {
    if (!window.confirm(`Yanlış ve boş bırakılan sorular ${studentIds?.length === 1 ? 'öğrencinin' : `${pendingCount} öğrencinin`} soru bankasına (sayfa görseliyle) eklensin mi? Her öğrenci için yalnızca bir kez aktarılır.`)) return;
    start(async () => { const r = await transferWrongs(examId, studentIds); setMsg(r); if (!r.error) router.refresh(); });
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary" disabled={pending || pendingCount === 0} onClick={go}>{pending ? 'Aktarılıyor…' : label}</button>
      {msg.error && <span role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</span>}
      {msg.ok && <span role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</span>}
    </span>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// Denemeye başla (sunucuda süre başlar) ve çözme ekranına geç
export function StartExamButton({ examId, label = 'Denemeye başla' }: { examId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('start_exam', { eid: examId });
    if (error) { setErr(error.message); setBusy(false); router.refresh(); return; }
    router.push('/coz/' + examId);
  };
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary px-6 py-3 text-base" disabled={busy} onClick={go}>{busy ? 'Başlıyor…' : label}</button>
      {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}

// Canlı deneme bekleme odası: öğretmen başlatınca kendiliğinden çözme ekranına geçer
export function WaitingRoom({ examId }: { examId: string }) {
  const router = useRouter();
  const [dots, setDots] = useState('');
  useEffect(() => {
    const sb = supabaseBrowser();
    let stop = false;
    const tick = async () => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
      const { data } = await sb.from('exams').select('started_at, status').eq('id', examId).maybeSingle();
      if (stop || !data) return;
      if (data.started_at) {
        const { error } = await sb.rpc('start_exam', { eid: examId });
        if (!error) router.push('/coz/' + examId); else router.refresh();
      } else if (data.status !== 'published') router.refresh();
    };
    const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [examId, router]);
  return (
    <div className="card space-y-2 py-10 text-center">
      <p className="text-4xl">⏳</p>
      <p className="text-lg font-bold">Öğretmenin denemeyi başlatması bekleniyor{dots}</p>
      <p className="text-sm text-slate-500">Bu sayfayı açık tut. Deneme başlayınca sorular kendiliğinden açılacak; süre herkes için aynı anda başlar.</p>
    </div>
  );
}

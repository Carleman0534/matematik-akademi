'use client';
import { useActionState, useTransition } from 'react';
import { addTopic, deleteTopic, type TopicState } from './actions';

export function AddTopicForm({ options }: { options: { id: string; label: string; depth: number; grade: number | null }[] }) {
  const [state, action, pending] = useActionState<TopicState, FormData>(addTopic, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2"><label className="label" htmlFor="ust">Üst konu</label>
        <select id="ust" name="ust" className="input"><option value="">— Yeni ünite (en üst düzey) —</option>
          {options.map(o => <option key={o.id} value={o.id}>{' '.repeat(o.depth * 3)}{o.depth === 0 && o.grade ? o.grade + '. sınıf · ' : ''}{o.label}</option>)}</select></div>
      <div><label className="label" htmlFor="sinif">Sınıf (ünite için)</label>
        <select id="sinif" name="sinif" className="input"><option value="">—</option>{[9, 10, 11, 12].map(g => <option key={g} value={g}>{g}. sınıf</option>)}</select></div>
      <div><label className="label" htmlFor="ad">Ad</label><input id="ad" name="ad" className="input" required maxLength={120} /></div>
      <div className="flex items-center gap-3 sm:col-span-4">
        <button className="btn-primary" disabled={pending}>Ekle</button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.ok && <p className="text-sm text-emerald-600">✓ {state.ok}</p>}
      </div>
    </form>
  );
}

export function DeleteTopicButton({ id, name, hasChildren }: { id: string; name: string; hasChildren: boolean }) {
  const [pending, start] = useTransition();
  const go = () => {
    if (!window.confirm(`"${name}" silinsin mi?${hasChildren ? ' Alt konuları da silinir.' : ''} Bu konudaki sorular silinmez, konusuz kalır.`)) return;
    start(async () => { const r = await deleteTopic(id); if (r.error) window.alert(r.error); });
  };
  return <button type="button" onClick={go} disabled={pending} aria-label={name + ' konusunu sil'} className="rounded px-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">Sil</button>;
}

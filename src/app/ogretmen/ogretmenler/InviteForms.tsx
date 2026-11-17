'use client';
import { useActionState, useState, useTransition } from 'react';
import { createInvite, deleteInvite, type InviteState } from './actions';

export function CreateInviteForm({ origin }: { origin: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  const link = state.code ? `${origin}/kayit?kod=${state.code}` : '';
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1"><label className="label" htmlFor="not">Kime? <span className="font-normal">(isteğe bağlı not)</span></label><input id="not" name="not" className="input" maxLength={120} placeholder="ör. Ayşe Hoca – geometri" /></div>
        <button className="btn-primary" disabled={pending}>{pending ? 'Üretiliyor…' : 'Davet kodu üret'}</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.code && (
        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <p className="text-sm">Bu kodu öğretmene gönderin. <b>Tek kullanımlıktır</b>, 14 gün geçerlidir.</p>
          <p className="my-2 font-mono text-2xl font-black tracking-[0.2em]">{state.code}</p>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch {} }}>{copied ? '✓ Bağlantı kopyalandı' : 'Kayıt bağlantısını kopyala'}</button>
        </div>
      )}
    </form>
  );
}

export function DeleteInviteButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <>
      <button type="button" disabled={pending} className="text-xs font-semibold text-red-600 hover:underline"
        onClick={() => { if (window.confirm('Davet iptal edilsin mi?')) start(async () => { const r = await deleteInvite(code); setErr(r.error || ''); }); }}>İptal et</button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </>
  );
}

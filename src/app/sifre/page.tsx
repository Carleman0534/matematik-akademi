'use client';
import { useActionState } from 'react';
import { changeOwnPassword, type PwState } from './actions';

export default function SifrePage() {
  const [state, action, pending] = useActionState<PwState, FormData>(changeOwnPassword, {});
  const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900';
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black text-slate-900">Şifre Değiştir</h1>
      <form action={action} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Mevcut şifre
          <input name="mevcut" type="password" autoComplete="current-password" required className={field} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Yeni şifre (en az 8 karakter)
          <input name="yeni" type="password" autoComplete="new-password" required minLength={8} className={field} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Yeni şifre (tekrar)
          <input name="tekrar" type="password" autoComplete="new-password" required minLength={8} className={field} />
        </label>
        {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>}
        {state.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{state.ok}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:opacity-60">
          {pending ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
        </button>
        <button type="button" onClick={() => history.back()} className="block w-full text-center text-sm font-semibold text-slate-500 underline">Geri dön</button>
      </form>
    </main>
  );
}

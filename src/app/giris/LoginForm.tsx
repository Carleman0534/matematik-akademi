'use client';
import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{notice}</p>}
      <div>
        <label htmlFor="kimlik" className="label">Kullanıcı adı ya da e-posta</label>
        <input id="kimlik" name="kimlik" className="input" autoComplete="username" autoCapitalize="off" required placeholder="ör. ayse.yilmaz" />
      </div>
      <div>
        <label htmlFor="sifre" className="label">Şifre</label>
        <input id="sifre" name="sifre" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      <p className="text-center text-sm">Hesabınız yok mu? <a href="/kayit" className="font-semibold text-indigo-600 dark:text-indigo-400">Kodla kayıt olun</a></p>
      <p className="text-center text-xs text-slate-500">Şifrenizi unuttuysanız öğretmeninize yazın; öğretmeniniz yeni şifre verebilir.</p>
    </form>
  );
}

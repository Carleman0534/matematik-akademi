'use client';
import { useActionState, useState, useEffect } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm({ notice, initialKimlik = '' }: { notice?: string; initialKimlik?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [kimlik, setKimlik] = useState(initialKimlik);
  const [rememberMe, setRememberMe] = useState(Boolean(initialKimlik));

  useEffect(() => {
    if (!initialKimlik && typeof window !== 'undefined') {
      const saved = localStorage.getItem('remembered_kimlik');
      if (saved) {
        setKimlik(saved);
        setRememberMe(true);
      }
    }
  }, [initialKimlik]);

  const handleSubmit = () => {
    if (typeof window !== 'undefined') {
      if (rememberMe && kimlik.trim()) {
        localStorage.setItem('remembered_kimlik', kimlik.trim());
      } else {
        localStorage.removeItem('remembered_kimlik');
      }
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      {notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{notice}</p>}
      <div>
        <label htmlFor="kimlik" className="label">Kullanıcı adı ya da e-posta</label>
        <input 
          id="kimlik" 
          name="kimlik" 
          value={kimlik}
          onChange={e => setKimlik(e.target.value)}
          className="input" 
          autoComplete="username" 
          autoCapitalize="off" 
          required 
          placeholder="ör. ayse.yilmaz" 
        />
      </div>
      <div>
        <label htmlFor="sifre" className="label">Şifre</label>
        <input id="sifre" name="sifre" type="password" className="input" autoComplete="current-password" required />
      </div>

      <div className="flex items-center justify-between py-0.5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            name="beni_hatirla"
            value="1"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-sm font-medium">Beni hatırla</span>
        </label>
        <span className="text-xs text-slate-400">30 gün açık tut</span>
      </div>

      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      <p className="text-center text-sm">Hesabınız yok mu? <a href="/kayit" className="font-semibold text-indigo-600 dark:text-indigo-400">Kodla kayıt olun</a></p>
      <p className="text-center text-xs text-slate-500">Şifrenizi unuttuysanız öğretmeninize yazın; öğretmeniniz yeni şifre verebilir.</p>
    </form>
  );
}

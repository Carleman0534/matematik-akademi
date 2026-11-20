'use client';
import { useActionState, useState, useEffect } from 'react';
import { login, type LoginState } from './actions';
import { User, Lock, Eye, EyeOff, ArrowRight, Sparkles, Check, HelpCircle } from 'lucide-react';

export function LoginForm({ notice, initialKimlik = '' }: { notice?: string; initialKimlik?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [kimlik, setKimlik] = useState(initialKimlik);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleQuickSelect = (username: string) => {
    setKimlik(username);
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      {notice && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Hızlı Profil Seçimi (Tek Tıkla Kullanıcı Adı Doldurma) */}
      <div className="space-y-1.5 pb-1">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
          Hızlı Seçim:
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickSelect('ali.metin')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
              kimlik === 'ali.metin'
                ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <span>⭐</span>
            <span>Ali Metin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('muhammedtalha')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
              kimlik === 'muhammedtalha'
                ? 'bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-200 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <span>⭐</span>
            <span>Muhammed Talha</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('ogretmen')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
              kimlik === 'ogretmen'
                ? 'bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-200 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <span>👨‍🏫</span>
            <span>Öğretmen</span>
          </button>
        </div>
      </div>

      {/* Kullanıcı Adı veya E-posta Alanı */}
      <div className="space-y-1">
        <label htmlFor="kimlik" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Kullanıcı Adı veya E-Posta
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <User className="h-4 w-4" />
          </div>
          <input 
            id="kimlik" 
            name="kimlik" 
            value={kimlik}
            onChange={e => setKimlik(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/15" 
            autoComplete="username" 
            autoCapitalize="off" 
            required 
            placeholder="ör. ali.metin veya e-posta" 
          />
        </div>
      </div>

      {/* Şifre Alanı */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="sifre" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Şifre
          </label>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input 
            id="sifre" 
            name="sifre" 
            type={showPassword ? 'text' : 'password'} 
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/15" 
            autoComplete="current-password" 
            required 
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Beni Hatırla & Bilgilendirme */}
      <div className="flex items-center justify-between py-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            name="beni_hatirla"
            value="1"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-xs font-semibold">Beni hatırla</span>
        </label>
        <span className="text-[11px] text-slate-400 font-medium">30 gün açık tut</span>
      </div>

      {/* Hata Mesajı */}
      {state.error && (
        <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold animate-shake">
          {state.error}
        </div>
      )}

      {/* Giriş Butonu */}
      <button 
        type="submit" 
        disabled={pending}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition transform active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>{pending ? 'Giriş Yapılıyor…' : 'Giriş Yap'}</span>
        {!pending && <ArrowRight className="w-4 h-4" />}
      </button>

      {/* Alt Bilgi & Bağlantılar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-center text-xs text-slate-500">
        <p>
          Hesabınız yok mu?{' '}
          <a href="/kayit" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Davet koduyla kayıt olun →
          </a>
        </p>
        <p className="text-[11px] text-slate-400">
          Şifrenizi unuttuysanız öğretmeninizden yeni şifre talep edebilirsiniz.
        </p>
      </div>
    </form>
  );
}

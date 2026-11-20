'use client';
import { useActionState, useState, useEffect } from 'react';
import { login, type LoginState } from './actions';
import { User, Lock, Eye, EyeOff, ArrowRight, Sparkles, Check, GraduationCap, School, Users } from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'parent';

export function LoginForm({ notice, initialKimlik = '' }: { notice?: string; initialKimlik?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [kimlik, setKimlik] = useState(initialKimlik);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(initialKimlik));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('preferred_role') as UserRole;
      if (savedRole && ['student', 'teacher', 'parent'].includes(savedRole)) {
        setSelectedRole(savedRole);
      }

      if (!initialKimlik) {
        const saved = localStorage.getItem('remembered_kimlik');
        if (saved) {
          setKimlik(saved);
          setRememberMe(true);
        }
      }
    }
  }, [initialKimlik]);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_role', role);
    }
    // Rol değiştiğinde kullanıcı adına mantıklı hızlı öneri yap
    if (role === 'student' && kimlik === 'ogretmen') {
      setKimlik('ali.metin');
    } else if (role === 'teacher' && (kimlik === 'ali.metin' || kimlik === 'muhammedtalha')) {
      setKimlik('ogretmen');
    }
  };

  const handleSubmit = () => {
    if (typeof window !== 'undefined') {
      if (rememberMe && kimlik.trim()) {
        localStorage.setItem('remembered_kimlik', kimlik.trim());
      } else {
        localStorage.removeItem('remembered_kimlik');
      }
      localStorage.setItem('preferred_role', selectedRole);
    }
  };

  const handleQuickSelect = (username: string) => {
    setKimlik(username);
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="secilen_rol" value={selectedRole} />

      {/* 1. ÖNCELİKLİ ROL AYRIMI: Öğrenci, Öğretmen, Veli Sekmeleri */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
          Giriş Yapılacak Hesap Türü:
        </label>
        
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              selectedRole === 'student'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Öğrenci</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('teacher')}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              selectedRole === 'teacher'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Öğretmen</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('parent')}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              selectedRole === 'parent'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Veli</span>
          </button>
        </div>
      </div>

      {/* 2. ROL DETAY & YOL GÖSTERİCİ BİLGİ KARTI */}
      {selectedRole === 'student' && (
        <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <span>👨‍🎓</span>
                <span>Öğrenci Giriş Portalı</span>
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Soru bankan, denemelerin ve aralıklı tekrar programın seni bekliyor.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-200/60 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 shrink-0">
              8. Sınıf LGS
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Hızlı Seç:</span>
            <button
              type="button"
              onClick={() => handleQuickSelect('ali.metin')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                kimlik === 'ali.metin'
                  ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              ⭐ Ali Metin
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('muhammedtalha')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                kimlik === 'muhammedtalha'
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              ⭐ Muhammed Talha
            </button>
          </div>
        </div>
      )}

      {selectedRole === 'teacher' && (
        <div className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <span>👨‍🏫</span>
                <span>Öğretmen & Yönetici Paneli</span>
              </p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Akıllı deneme oluşturucu, optik okuyucu ve sınıf başarı analizleri.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-200/60 dark:bg-purple-900 text-purple-900 dark:text-purple-200 shrink-0">
              Eğitmen
            </span>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Hızlı Seç:</span>
            <button
              type="button"
              onClick={() => handleQuickSelect('ogretmen')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                kimlik === 'ogretmen'
                  ? 'bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-950 dark:text-purple-200 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-purple-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              👨‍🏫 Öğretmen Hesabı
            </button>
          </div>
        </div>
      )}

      {selectedRole === 'parent' && (
        <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                <span>👪</span>
                <span>Veli Takip & Gelişim Portalı</span>
              </p>
              <p className="text-[11px] text-teal-700 dark:text-teal-300">
                Öğrencinizin LGS deneme netleri, haftalık soru karnesi ve ödev takibi.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-teal-200/60 dark:bg-teal-900 text-teal-900 dark:text-teal-200 shrink-0">
              Veli Portalı
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">Örnek:</span>
            <button
              type="button"
              onClick={() => handleQuickSelect('veli')}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold border bg-white dark:bg-slate-800 border-teal-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              👪 Veli Hesabı
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Kullanıcı Adı veya E-posta Alanı */}
      <div className="space-y-1">
        <label htmlFor="kimlik" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {selectedRole === 'student' && 'Öğrenci Kullanıcı Adı veya E-Posta'}
          {selectedRole === 'teacher' && 'Öğretmen Kullanıcı Adı veya E-Posta'}
          {selectedRole === 'parent' && 'Veli Telefon Numarası veya E-Posta'}
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
            placeholder={
              selectedRole === 'student'
                ? 'ör. ali.metin veya muhammedtalha'
                : selectedRole === 'teacher'
                ? 'ör. ogretmen veya e-posta'
                : 'ör. 0532... veya veli e-postası'
            }
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

      {/* Giriş Butonu (Seçilen Role Göre Renk & Başlık Değişir) */}
      <button 
        type="submit" 
        disabled={pending}
        className={`w-full py-3 px-4 rounded-2xl text-white font-black text-xs sm:text-sm shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 ${
          selectedRole === 'student'
            ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-600/25 hover:shadow-indigo-600/40'
            : selectedRole === 'teacher'
            ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/25 hover:shadow-purple-600/40'
            : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 shadow-teal-600/25 hover:shadow-teal-600/40'
        }`}
      >
        <span>
          {pending 
            ? 'Giriş Yapılıyor…' 
            : selectedRole === 'student' 
            ? 'Öğrenci Olarak Giriş Yap' 
            : selectedRole === 'teacher' 
            ? 'Öğretmen Olarak Giriş Yap' 
            : 'Veli Olarak Giriş Yap'}
        </span>
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

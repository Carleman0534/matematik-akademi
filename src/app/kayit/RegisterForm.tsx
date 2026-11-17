'use client';
import { useActionState, useState, useTransition } from 'react';
import { checkCode, register, type CodeInfo, type RegisterState } from './actions';

export function RegisterForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [checking, startCheck] = useTransition();
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {});

  const check = () => startCheck(async () => setInfo(await checkCode(code)));
  const ok = info && !('error' in info) ? info : null;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="kod" className="label">Kayıt kodu</label>
        <div className="flex gap-2">
          <input id="kod" className="input font-mono uppercase tracking-widest" value={code} autoCapitalize="characters" autoComplete="off"
            onChange={e => { setCode(e.target.value); setInfo(null); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check(); } }}
            placeholder="ör. K7M2QX9A" maxLength={14} />
          <button type="button" className="btn-secondary shrink-0" onClick={check} disabled={checking || code.trim().length < 6}>{checking ? '…' : 'Devam'}</button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Öğrenciyseniz öğretmeninizin verdiği <b>sınıf kodunu</b>, öğretmenseniz yöneticinin verdiği <b>davet kodunu</b> yazın.</p>
        {info && 'error' in info && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{info.error}</p>}
      </div>

      {ok && (
        <form action={action} className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <input type="hidden" name="kod" value={code} />
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
            {ok.kind === 'class' ? <>Öğrenci kaydı · <b>{ok.className}</b> ({ok.teacherName})</> : <>Öğretmen kaydı</>}
          </p>
          <div><label className="label" htmlFor="ad">Ad soyad</label><input id="ad" name="ad" className="input" required maxLength={120} autoComplete="name" /></div>
          {ok.kind === 'class' ? (
            <>
              <div><label className="label" htmlFor="kullanici">Kullanıcı adı <span className="font-normal">(girişte bunu yazacaksınız)</span></label>
                <input id="kullanici" name="kullanici" className="input" required placeholder="ör. ayse.yilmaz" autoCapitalize="off" autoComplete="username" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="sinif">Sınıf</label>
                  <select id="sinif" name="sinif" className="input" defaultValue=""><option value="">Seçin</option>{[5, 6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>{g}. sınıf</option>)}<option value="13">Mezun</option></select></div>
                <div><label className="label" htmlFor="okul">Okul</label><input id="okul" name="okul" className="input" maxLength={160} /></div>
              </div>
            </>
          ) : (
            <div><label className="label" htmlFor="eposta">E-posta</label><input id="eposta" name="eposta" type="email" className="input" required autoComplete="email" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="sifre">Şifre <span className="font-normal">(en az 8)</span></label><input id="sifre" name="sifre" type="password" className="input" required minLength={8} autoComplete="new-password" /></div>
            <div><label className="label" htmlFor="sifre2">Şifre (tekrar)</label><input id="sifre2" name="sifre2" type="password" className="input" required minLength={8} autoComplete="new-password" /></div>
          </div>
          {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? 'Hesap açılıyor…' : 'Kaydı tamamla'}</button>
        </form>
      )}
    </div>
  );
}

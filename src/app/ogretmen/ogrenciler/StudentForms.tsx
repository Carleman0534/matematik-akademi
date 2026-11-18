'use client';
import { useActionState, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStudent, updateStudent, resetStudentPassword, setStudentActive, deleteStudent, type FormState } from './actions';

const Msg = ({ s }: { s: FormState }) => s.error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{s.error}</p> : s.ok ? <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {s.ok}</p> : null;
const GradeSelect = ({ value }: { value?: number | null }) => (
  <select name="sinif" defaultValue={value ?? ''} className="input"><option value="">Seçilmedi</option>{[5, 6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>{g}. sınıf</option>)}<option value="13">Mezun</option></select>
);

export interface ClassOpt { id: string; name: string }
const ClassSelect = ({ classes, value, id }: { classes: ClassOpt[]; value?: string | null; id: string }) => (
  <div><label className="label" htmlFor={id}>Sınıf / grup</label>
    <select id={id} name="sinif_grubu" defaultValue={value ?? ''} className="input"><option value="">Grupsuz</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
);

// Rastgele, okunaklı geçici şifre (öğretmen öğrenciye iletir)
const makePassword = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; const r = crypto.getRandomValues(new Uint32Array(10)); return Array.from(r, x => A[x % A.length]).join(''); };

export function CreateStudentForm({ classes }: { classes: ClassOpt[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createStudent, {});
  const [pw, setPw] = useState('');
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label" htmlFor="ad">Ad soyad *</label><input id="ad" name="ad" className="input" required maxLength={120} /></div>
      <div><label className="label" htmlFor="kullanici">Kullanıcı adı * <span className="font-normal">(öğrenci bununla girer)</span></label><input id="kullanici" name="kullanici" className="input" required placeholder="ör. ayse.yilmaz" autoCapitalize="off" /></div>
      <div><label className="label" htmlFor="sifre">Şifre * <span className="font-normal">(en az 8 karakter)</span></label>
        <div className="flex gap-2"><input id="sifre" name="sifre" className="input" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
          <button type="button" className="btn-secondary shrink-0" onClick={() => setPw(makePassword())}>Üret</button></div></div>
      <div><label className="label" htmlFor="sinif">Sınıf</label><GradeSelect /></div>
      <div><label className="label" htmlFor="okul">Okul</label><input id="okul" name="okul" className="input" /></div>
      <ClassSelect classes={classes} id="grup" />
      <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={pending}>{pending ? 'Ekleniyor…' : 'Öğrenciyi ekle'}</button><Msg s={state} /></div>
    </form>
  );
}

export function EditStudentForm({ s, classes }: { s: { id: string; full_name: string; grade_level: number | null; school_name: string | null; notes: string | null; class_id: string | null }; classes: ClassOpt[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateStudent, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={s.id} />
      <div><label className="label" htmlFor="e-ad">Ad soyad</label><input id="e-ad" name="ad" defaultValue={s.full_name} className="input" required /></div>
      <div><label className="label" htmlFor="e-sinif">Sınıf</label><GradeSelect value={s.grade_level} /></div>
      <div><label className="label" htmlFor="e-okul">Okul</label><input id="e-okul" name="okul" defaultValue={s.school_name || ''} className="input" /></div>
      <ClassSelect classes={classes} value={s.class_id} id="e-grup" />
      <div className="sm:col-span-2"><label className="label" htmlFor="e-not">Öğretmen notları (öğrenci görmez)</label><textarea id="e-not" name="notlar" defaultValue={s.notes || ''} rows={3} className="input" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={pending}>Kaydet</button><Msg s={state} /></div>
    </form>
  );
}

export function PasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetStudentPassword, {});
  const [pw, setPw] = useState('');
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="label" htmlFor="p-sifre">Yeni şifre</label>
      <div className="flex gap-2"><input id="p-sifre" name="sifre" className="input" minLength={8} required value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
        <button type="button" className="btn-secondary shrink-0" onClick={() => setPw(makePassword())}>Üret</button></div>
      <div className="flex items-center gap-3"><button className="btn-secondary" disabled={pending}>Şifreyi değiştir</button><Msg s={state} /></div>
    </form>
  );
}

export function DeleteStudent({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState>({});
  const go = () => {
    const typed = window.prompt(`“${name}” KALICI olarak silinecek: hesabı, soruları, deneme cevapları ve çalışma planları. Bu geri alınamaz.\n\nEmin olmak için öğrencinin adını aynen yazın (geçici olarak çıkarmak için “Pasifleştir”i kullanın):`);
    if (typed === null) return;
    if (typed.trim() !== name.trim()) { setMsg({ error: 'Ad eşleşmedi; silinmedi.' }); return; }
    start(async () => { const r = await deleteStudent(id); if (r.error) setMsg(r); else router.push('/ogretmen/ogrenciler'); });
  };
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
      <button type="button" onClick={go} disabled={pending} className="btn-danger">{pending ? 'Siliniyor…' : 'Öğrenciyi kalıcı sil'}</button>
      <Msg s={msg} />
    </div>
  );
}

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState>({});
  const go = () => {
    if (active && !window.confirm('Öğrenci pasifleştirilsin mi? Giriş yapamaz; soruları ve geçmişi silinmez, sonra yeniden aktif edebilirsiniz.')) return;
    start(async () => setMsg(await setStudentActive(id, !active)));
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={go} disabled={pending} className={active ? 'btn-danger' : 'btn-primary'}>{active ? 'Pasifleştir' : 'Yeniden aktif et'}</button>
      <Msg s={msg} />
    </div>
  );
}

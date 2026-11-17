'use client';
import { useActionState, useState, useTransition } from 'react';
import { createClass, setClassOpen, regenerateCode, renameClass, deleteClass, type ClassState } from './actions';

const Msg = ({ s }: { s: ClassState }) => s.error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">{s.error}</p> : s.ok ? <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {s.ok}</p> : null;

export function CreateClassForm() {
  const [state, action, pending] = useActionState<ClassState, FormData>(createClass, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1"><label className="label" htmlFor="ad">Sınıf / grup adı</label><input id="ad" name="ad" className="input" required maxLength={80} placeholder="ör. 11-A Sayısal" /></div>
      <button className="btn-primary" disabled={pending}>{pending ? 'Ekleniyor…' : 'Sınıf ekle'}</button>
      <div className="w-full"><Msg s={state} /></div>
    </form>
  );
}

export function ClassCard({ c, students, origin }: { c: { id: string; name: string; join_code: string; is_open: boolean }; students: number; origin: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ClassState>({});
  const [copied, setCopied] = useState('');
  const link = `${origin}/kayit?kod=${c.join_code}`;
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch { setCopied(''); } };
  const run = (f: () => Promise<ClassState>, confirmText?: string) => { if (confirmText && !window.confirm(confirmText)) return; start(async () => setMsg(await f())); };
  const rename = () => { const n = window.prompt('Yeni ad', c.name); if (n && n.trim() && n !== c.name) run(() => renameClass(c.id, n)); };
  return (
    <div className={'card space-y-3 ' + (c.is_open ? '' : 'opacity-75')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0"><p className="truncate text-lg font-bold">{c.name}</p><p className="text-xs text-slate-500">{students} öğrenci · kayıtlar {c.is_open ? 'açık' : 'kapalı'}</p></div>
        <button type="button" onClick={rename} className="ml-auto text-xs font-semibold text-slate-500 hover:underline">Adı değiştir</button>
      </div>
      <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-950/50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Sınıf kodu</p>
        <p className={'font-mono text-2xl font-black tracking-[0.2em] ' + (c.is_open ? '' : 'line-through')}>{c.join_code}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => copy(c.join_code, 'kod')}>{copied === 'kod' ? '✓ Kopyalandı' : 'Kodu kopyala'}</button>
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => copy(link, 'link')}>{copied === 'link' ? '✓ Kopyalandı' : 'Kayıt bağlantısı'}</button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs font-semibold dark:border-slate-800">
        <button type="button" disabled={pending} onClick={() => run(() => setClassOpen(c.id, !c.is_open))} className="text-indigo-600 hover:underline dark:text-indigo-400">{c.is_open ? 'Kayıtları kapat' : 'Kayıtları aç'}</button>
        <button type="button" disabled={pending} onClick={() => run(() => regenerateCode(c.id), 'Yeni kod üretilsin mi? Eski kod artık çalışmaz (kayıtlı öğrenciler etkilenmez).')} className="text-slate-600 hover:underline dark:text-slate-300">Yeni kod üret</button>
        <button type="button" disabled={pending} onClick={() => run(() => deleteClass(c.id), `"${c.name}" silinsin mi? Öğrencileri silinmez, grupsuz kalır.`)} className="ml-auto text-red-600 hover:underline">Sil</button>
      </div>
      <Msg s={msg} />
    </div>
  );
}

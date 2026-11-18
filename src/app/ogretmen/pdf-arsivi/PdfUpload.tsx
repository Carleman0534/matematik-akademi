'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PDF_BUCKET } from '@/lib/env';
import { countPdfPages } from '@/lib/pdfPages';
import { addPdfDoc, setPdfArchived, deletePdfDoc } from './actions';

const TYPES: [string, string][] = [['deneme', 'Deneme'], ['soru_bankasi', 'Soru bankası'], ['cevap_anahtari', 'Cevap anahtarı'], ['cozum', 'Çözüm'], ['calisma_foyu', 'Çalışma föyü'], ['diger', 'Diğer']];
const MAX = 50 * 1024 * 1024;

export function PdfUpload({ userId }: { userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  const pick = (f: File | null) => {
    setMsg({});
    if (!f) { setFile(null); return; }
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setMsg({ error: 'Yalnızca PDF yüklenebilir.' }); return; }
    if (f.size > MAX) { setMsg({ error: 'PDF 50 MB\'tan büyük olamaz.' }); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) { setMsg({ error: 'PDF dosyasını seçin.' }); return; }
    const form = e.currentTarget;
    const f = new FormData(form);
    setMsg({});
    try {
      setBusy('Sayfalar sayılıyor…');
      const pages = await countPdfPages(file);
      setBusy('Yükleniyor…');
      const path = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error } = await supabaseBrowser().storage.from(PDF_BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) { setMsg({ error: 'Yüklenemedi: ' + error.message }); return; }
      const r = await addPdfDoc({
        path, file_name: file.name, size_bytes: file.size, page_count: pages, title,
        doc_type: String(f.get('doc_type')), grade_level: String(f.get('grade_level') || ''), publisher: String(f.get('publisher') || ''),
        description: String(f.get('description') || ''), topic_id: '',
      });
      setMsg(r);
      if (!r.error) { form.reset(); setFile(null); setTitle(''); router.refresh(); }
    } catch (err) {
      setMsg({ error: (err as Error).message });
    } finally { setBusy(''); }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label" htmlFor="pdf">PDF dosyası (en çok 50 MB)</label>
        <input id="pdf" type="file" accept="application/pdf" className="input" onChange={e => pick(e.target.files?.[0] || null)} /></div>
      <div><label className="label" htmlFor="title">Başlık *</label><input id="title" className="input" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div><label className="label" htmlFor="doc_type">Tür</label>
        <select id="doc_type" name="doc_type" className="input" defaultValue="deneme">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div><label className="label" htmlFor="grade_level">Seviye</label><input id="grade_level" name="grade_level" className="input" maxLength={30} placeholder="ör. TYT, AYT, 11. sınıf" /></div>
      <div><label className="label" htmlFor="publisher">Yayınevi</label><input id="publisher" name="publisher" className="input" maxLength={120} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="description">Not</label><input id="description" name="description" className="input" maxLength={1000} /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={!!busy || !file}>{busy || 'Arşive ekle'}</button>
        {msg.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{msg.error}</p>}
        {msg.ok && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {msg.ok}</p>}
      </div>
    </form>
  );
}

export function PdfActions({ id, title, archived }: { id: string; title: string; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const run = (f: () => Promise<{ error?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => { const r = await f(); setErr(r.error || ''); if (!r.error) router.refresh(); });
  };
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" disabled={pending} className="text-slate-500 hover:underline" onClick={() => run(() => setPdfArchived(id, !archived))}>{archived ? 'Geri al' : 'Kaldır'}</button>
      {archived && <button type="button" disabled={pending} className="text-red-600 hover:underline" onClick={() => run(() => deletePdfDoc(id), `"${title}" kalıcı olarak silinsin mi? Bu geri alınamaz.`)}>Kalıcı sil</button>}
      {err && <span className="text-red-600">{err}</span>}
    </span>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExam, updateExam, type ExamInput } from '@/app/ogretmen/denemeler/actions';
import { uploadExamFiles } from './uploadPages';
import { checkExamFile, fetchPdfFile } from '@/lib/pdfPages';

// datetime-local alanı için yerel saat (tarayıcı saat dilimi)
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');

export interface ExamFormValues {
  id?: string; title: string; instructions: string | null; mode: 'live' | 'assignment'; class_id: string | null;
  question_count: number; option_count: number; duration_min: number; penalty_divisor: number;
  opens_at: string | null; closes_at: string | null; results_mode: 'after_close' | 'after_submit' | 'never';
}

export function ExamForm({ classes, initial, locked, pdf }: { classes: { id: string; name: string }[]; initial?: ExamFormValues; locked?: boolean; pdf?: { id: string; title: string; url: string | null; file_name: string } }) {
  const router = useRouter();
  const [mode, setMode] = useState<'live' | 'assignment'>(initial?.mode || 'live');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const editing = !!initial?.id;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setOk('');
    const f = new FormData(e.currentTarget);
    const input: ExamInput = {
      title: String(f.get('title') || ''), instructions: String(f.get('instructions') || ''), mode,
      class_id: String(f.get('class_id') || ''),
      question_count: locked && initial ? initial.question_count : Number(f.get('question_count')),
      option_count: locked && initial ? initial.option_count : Number(f.get('option_count')),
      duration_min: Number(f.get('duration_min')), penalty_divisor: Number(f.get('penalty_divisor')),
      opens_at: fromLocalInput(String(f.get('opens_at') || '')), closes_at: fromLocalInput(String(f.get('closes_at') || '')),
      results_mode: String(f.get('results_mode')) as ExamInput['results_mode'],
    };
    const bad = files.map(checkExamFile).find(Boolean);
    if (bad) { setError(bad); return; }
    setBusy('Kaydediliyor…');
    try {
      if (editing) {
        const r = await updateExam(initial!.id!, input);
        if (r.error) setError(r.error); else { setOk(r.ok || ''); router.refresh(); }
        return;
      }
      let toUpload = files;
      if (!toUpload.length && pdf?.url) {
        setBusy('PDF arşivden alınıyor…');
        toUpload = [await fetchPdfFile(pdf.url, pdf.file_name)];
      }
      const r = await createExam({ ...input, pdf_id: pdf?.id || '' });
      if (r.error || !r.id) { setError(r.error || 'Oluşturulamadı.'); return; }
      if (toUpload.length) {
        const upErr = await uploadExamFiles(r.id, toUpload, setBusy);
        if (upErr) { setError(upErr + ' Deneme oluşturuldu; sayfaları deneme sayfasından yeniden yükleyebilirsiniz.'); router.push('/ogretmen/denemeler/' + r.id); return; }
      }
      router.push('/ogretmen/denemeler/' + r.id);
    } catch (err) {
      setError((err as Error).message || 'Beklenmeyen hata.');
    } finally {
      setBusy('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="title">Deneme adı *</label><input id="title" name="title" className="input" required maxLength={160} defaultValue={initial?.title ?? pdf?.title}placeholder="ör. 11. Sınıf Matematik Deneme 3" /></div>

        <fieldset className="sm:col-span-2" disabled={locked}>
          <legend className="label">Nasıl yapılacak?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([['live', 'Canlı oturum', 'Siz "Başlat"a basınca herkes aynı anda başlar, süre birlikte işler. Kim kaçıncı soruda, canlı izlersiniz.'],
               ['assignment', 'Süreli ödev', 'Belirlediğiniz tarihler arasında her öğrenci istediği an başlar; süre o an başlar.']] as const).map(([v, t, d]) => (
              <label key={v} className={'cursor-pointer rounded-xl border p-3 text-sm ' + (mode === v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-700')}>
                <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="mr-2" /><b>{t}</b>
                <span className="mt-1 block text-xs text-slate-500">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div><label className="label" htmlFor="class_id">Kimler çözecek?</label>
          <select id="class_id" name="class_id" className="input" defaultValue={initial?.class_id || ''}>
            <option value="">Bütün öğrencilerim</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label" htmlFor="duration_min">Süre (dakika) *</label><input id="duration_min" name="duration_min" type="number" min={1} max={600} required className="input" defaultValue={initial?.duration_min ?? 40} /></div>
        <div><label className="label" htmlFor="question_count">Soru sayısı *</label><input id="question_count" name="question_count" type="number" min={1} max={200} required className="input" defaultValue={initial?.question_count ?? 40} disabled={locked} /></div>
        <div><label className="label" htmlFor="option_count">Şık sayısı</label>
          <select id="option_count" name="option_count" className="input" defaultValue={initial?.option_count ?? 5} disabled={locked}><option value={5}>5 şık (A–E)</option><option value={4}>4 şık (A–D)</option></select></div>
        <div><label className="label" htmlFor="penalty_divisor">Yanlışlar doğruyu götürsün mü?</label>
          <select id="penalty_divisor" name="penalty_divisor" className="input" defaultValue={initial?.penalty_divisor ?? 4}>
            <option value={4}>4 yanlış 1 doğruyu götürür (YKS)</option><option value={3}>3 yanlış 1 doğruyu götürür (LGS)</option><option value={0}>Götürmez</option>
          </select></div>
        <div><label className="label" htmlFor="results_mode">Öğrenci sonucunu ne zaman görsün?</label>
          <select id="results_mode" name="results_mode" className="input" defaultValue={initial?.results_mode || 'after_close'}>
            <option value="after_close">Deneme bitince (önerilen)</option><option value="after_submit">Kendisi teslim edince</option><option value="never">Göstermeyin</option>
          </select></div>
        {mode === 'assignment' && (
          <>
            <div><label className="label" htmlFor="opens_at">Başlangıç <span className="font-normal">(boş = hemen)</span></label><input id="opens_at" name="opens_at" type="datetime-local" className="input" defaultValue={toLocalInput(initial?.opens_at)} /></div>
            <div><label className="label" htmlFor="closes_at">Son teslim *</label><input id="closes_at" name="closes_at" type="datetime-local" className="input" required defaultValue={toLocalInput(initial?.closes_at)} /></div>
          </>
        )}
        <div className="sm:col-span-2"><label className="label" htmlFor="instructions">Öğrencilere açıklama</label><textarea id="instructions" name="instructions" rows={2} className="input" maxLength={2000} defaultValue={initial?.instructions || ''} placeholder="ör. Hesap makinesi kullanmayın. Her soru için tek şık işaretleyin." /></div>

        {!editing && pdf && (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 sm:col-span-2 dark:bg-indigo-950/50 dark:text-indigo-200">
            📄 Sayfalar arşivdeki <b>{pdf.title}</b> PDF&rsquo;inden alınacak. Başka dosya seçersen onun yerine o kullanılır.
          </p>
        )}
        {!editing && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="files">Soru kitapçığı (PDF ya da fotoğraflar)</label>
            <input id="files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="input" onChange={e => setFiles(Array.from(e.target.files || []))} />
            <p className="mt-1 text-xs text-slate-500">PDF sayfaları telefonlarda da net görünsün diye görsele çevrilir. Sayfaları sonra da ekleyebilirsiniz.</p>
          </div>
        )}
      </div>
      {locked && <p className="text-xs text-amber-700 dark:text-amber-300">Öğrenciler çözmeye başladığı için tür, soru ve şık sayısı kilitli.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {ok && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">✓ {ok}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={!!busy}>{busy || (editing ? 'Ayarları kaydet' : 'Denemeyi oluştur')}</button>
        {!editing && <span className="text-xs text-slate-500">Sonraki adım: cevap anahtarı ve konular</span>}
      </div>
    </form>
  );
}

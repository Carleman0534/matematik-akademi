'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { addAttempt, setArchived, updateQuestion, type ActionResult } from '@/app/soru/actions';
import { DIFFICULTY_LABEL, ERROR_TYPES } from '@/lib/labels';
import { TopicSelect, type TopicOption } from './TopicSelect';

// Tekrar çözümü kaydet: Doğru / Yanlış / Boş (her biri çözüm geçmişine yeni kayıt)
export function AttemptRecorder({ questionId }: { questionId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult>({});
  const [note, setNote] = useState('');
  const t0 = useRef(0);
  useEffect(() => { t0.current = Date.now(); }, []);
  const save = (r: 'correct' | 'incorrect' | 'blank') => start(async () => {
    const res = await addAttempt(questionId, r, (Date.now() - t0.current) / 1000, note);
    setMsg(res);
    if (!res.error) { setNote(''); t0.current = Date.now(); }
  });
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Bu soruyu yeniden çözdün mü? Sonucu kaydet:</p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={pending} onClick={() => save('correct')} className="btn bg-emerald-600 text-white hover:bg-emerald-500">✓ Doğru</button>
        <button type="button" disabled={pending} onClick={() => save('incorrect')} className="btn bg-red-600 text-white hover:bg-red-500">✗ Yanlış</button>
        <button type="button" disabled={pending} onClick={() => save('blank')} className="btn bg-slate-600 text-white hover:bg-slate-500">○ Boş</button>
      </div>
      <input aria-label="Çözüm notu" placeholder="Not (isteğe bağlı)" value={note} onChange={e => setNote(e.target.value)} className="input" maxLength={500} />
      {msg.error && <p role="alert" className="text-sm text-red-600">{msg.error}</p>}
      {msg.ok && <p role="status" className="text-sm text-emerald-600">✓ Çözüm geçmişine eklendi.</p>}
    </div>
  );
}

export interface EditableQuestion {
  id: string; topic_id: string | null; source_id: string | null; initial_status: 'wrong' | 'blank'; difficulty: string | null;
  page_no: string | null; test_no: string | null; question_no: string | null; question_text: string | null;
  correct_answer: string | null; student_answer: string | null; error_type: string | null; solution: string | null;
  teacher_note: string | null; student_note: string | null;
}

export function QuestionEditForm({ q, options, sources, isTeacher }: { q: EditableQuestion; options: TopicOption[]; sources: { id: string; name: string }[]; isTeacher: boolean }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateQuestion, {});
  const [topic, setTopic] = useState(q.topic_id || '');
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={q.id} />
      <input type="hidden" name="topic_id" value={topic} />
      <div className="sm:col-span-2"><span className="label">Konu</span><TopicSelect options={options} value={topic} onChange={setTopic} /></div>
      <div><label className="label" htmlFor="e-durum">Eklenme nedeni</label><select id="e-durum" name="initial_status" defaultValue={q.initial_status} className="input"><option value="wrong">Yanlış</option><option value="blank">Boş</option></select></div>
      <div><label className="label" htmlFor="e-zorluk">Zorluk</label><select id="e-zorluk" name="difficulty" defaultValue={q.difficulty || ''} className="input"><option value="">Seçilmedi</option>{Object.entries(DIFFICULTY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div><label className="label" htmlFor="e-kaynak">Kaynak</label><select id="e-kaynak" name="source_id" defaultValue={q.source_id || ''} className="input"><option value="">Seçilmedi</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div><label className="label" htmlFor="e-yeni">ya da yeni kaynak</label><input id="e-yeni" name="new_source" className="input" maxLength={160} /></div>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
        <div><label className="label" htmlFor="e-test">Test no</label><input id="e-test" name="test_no" defaultValue={q.test_no || ''} className="input" /></div>
        <div><label className="label" htmlFor="e-sayfa">Sayfa</label><input id="e-sayfa" name="page_no" defaultValue={q.page_no || ''} className="input" /></div>
        <div><label className="label" htmlFor="e-soru">Soru no</label><input id="e-soru" name="question_no" defaultValue={q.question_no || ''} className="input" /></div>
      </div>
      <div><label className="label" htmlFor="e-dogru">Doğru cevap</label><input id="e-dogru" name="correct_answer" defaultValue={q.correct_answer || ''} className="input" /></div>
      <div><label className="label" htmlFor="e-verilen">Verilen cevap</label><input id="e-verilen" name="student_answer" defaultValue={q.student_answer || ''} className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="e-hata">Hata türü</label><select id="e-hata" name="error_type" defaultValue={q.error_type || ''} className="input"><option value="">Seçilmedi</option>{ERROR_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="e-metin">Soru metni</label><textarea id="e-metin" name="question_text" defaultValue={q.question_text || ''} rows={2} className="input" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="e-cozum">Çözüm</label><textarea id="e-cozum" name="solution" defaultValue={q.solution || ''} rows={3} className="input" /></div>
      {isTeacher
        ? <div className="sm:col-span-2"><label className="label" htmlFor="e-ogretmen">Öğretmen açıklaması (öğrenci görür)</label><textarea id="e-ogretmen" name="teacher_note" defaultValue={q.teacher_note || ''} rows={2} className="input" /></div>
        : null}
      <div className="sm:col-span-2"><label className="label" htmlFor="e-ogrenci">Öğrenci notu</label><textarea id="e-ogrenci" name="student_note" defaultValue={q.student_note || ''} rows={2} className="input" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary" disabled={pending}>{pending ? 'Kaydediliyor…' : 'Kaydet'}</button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.ok && <p className="text-sm text-emerald-600">✓ {state.ok}</p>}</div>
    </form>
  );
}

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const go = () => {
    if (!archived && !window.confirm('Soru arşive taşınsın mı? Soru bankasında görünmez; çözüm geçmişi silinmez ve istediğiniz zaman geri alabilirsiniz.')) return;
    start(async () => { const r = await setArchived(id, !archived); setMsg(r.error || r.ok || ''); });
  };
  return <span className="flex items-center gap-2"><button type="button" onClick={go} disabled={pending} className="btn-secondary">{archived ? '↩ Arşivden çıkar' : '🗄 Arşive taşı'}</button>{msg && <span className="text-xs text-slate-500">{msg}</span>}</span>;
}

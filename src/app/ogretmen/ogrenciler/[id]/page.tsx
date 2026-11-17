import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { getStudent, bankSummaries, getClasses } from '@/lib/data';
import { QuestionBank } from '@/components/questions/QuestionBank';
import { Stat } from '@/components/Stat';
import { EditStudentForm, PasswordForm, ActiveToggle } from '../StudentForms';
import { pct } from '@/lib/labels';

export const metadata: Metadata = { title: 'Öğrenci' };

export default async function StudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const s = await getStudent(sb, id);
  if (!s) notFound();
  const { data: prof } = s.profile_id ? await sb.from('profiles').select('username').eq('id', s.profile_id).maybeSingle() : { data: null };
  const sum = (await bankSummaries(sb, id)).all;
  const classes = s.teacher_id ? await getClasses(sb, s.teacher_id) : [];
  const base = '/ogretmen/ogrenciler/' + id;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/ogretmen/ogrenciler" className="text-sm text-slate-500 hover:underline">← Öğrencilerim</Link>
        <h1 className="w-full text-2xl font-black">{s.full_name} {!s.is_active && <span className="align-middle text-sm font-semibold text-slate-500">(pasif)</span>}</h1>
        {prof?.username && <p className="-mt-2 text-sm text-slate-500">Kullanıcı adı: <b>{prof.username}</b></p>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Soru bankası" value={sum.total} sub={`${sum.wrong} yanlış · ${sum.blank} boş`} />
        <Stat label="Tekrar bekleyen" value={sum.due} tone="text-indigo-600 dark:text-indigo-400" />
        <Stat label="Henüz tekrar edilmedi" value={sum.waiting} />
        <Stat label="Tekrarda yine yanlış" value={sum.reviewedWrong} tone="text-red-600 dark:text-red-400" />
        <Stat label="Öğrenilen" value={sum.learned} sub={`kalıcı ${sum.permanent} · tekrar başarısı ${pct(sum.reviewSuccess)}`} tone="text-emerald-600 dark:text-emerald-400" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Soru bankası</h2>
        <QuestionBank sb={sb} studentId={id} searchParams={sp} basePath={base} addHref={base + '/soru-ekle'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <details className="card lg:col-span-2"><summary className="cursor-pointer font-bold">Öğrenci bilgileri</summary><div className="mt-4"><EditStudentForm s={s} classes={classes} /></div></details>
        <details className="card space-y-4"><summary className="cursor-pointer font-bold">Hesap</summary>
          <div className="mt-4 space-y-5">{s.profile_id && <PasswordForm id={s.id} />}<ActiveToggle id={s.id} active={s.is_active} /></div>
        </details>
      </section>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics, getStudent } from '@/lib/data';
import { studentProfile } from '@/lib/studyData';
import { recommend, KIND_LABEL, type Kind } from '@/lib/studyEngine';
import { TRIGGER_LABEL, TRIGGER_STYLE, type Trigger } from '@/lib/adaptive';
import { RefreshButton, DismissButton } from '../../oneriler/RecControls';
import { PerfTable } from '@/components/study/PerfTable';

export const metadata: Metadata = { title: 'Öğrenci konu analizi' };
export const dynamic = 'force-dynamic';

export default async function StudentAnalysisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireTeacher();
  const { id } = await params;
  const grade = Number((await searchParams).sinif) || 8;
  const sb = await supabaseServer();
  const s = await getStudent(sb, id);
  if (!s) notFound();
  const topics = await getTopics(sb);
  const p = await studentProfile(sb, id, 'teacher', topics, grade);
  const rec = recommend(p.perf);
  const { data: pend } = await sb.from('study_recommendations').select('id, unit_id, trigger, kind, q_count, text').eq('student_id', id).eq('status', 'pending').order('created_at', { ascending: false });
  const pending = (pend || []) as { id: string; unit_id: string; trigger: Trigger; kind: Kind; q_count: number; text: string }[];
  const { data: plans } = await sb.from('study_plans').select('id, title, status, kind, created_at').eq('student_id', id).neq('status', 'archived').order('created_at', { ascending: false }).limit(5);

  return (
    <div className="space-y-5">
      <Link href="/ogretmen/ogrenci-analizleri" className="text-sm text-slate-500 hover:underline">← Öğrenci analizleri</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">{s.full_name}</h1>
        <Link href={`/ogretmen/ogrenciler/${id}`} className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Soru bankası</Link>
        <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${id}`} className="btn-primary ml-auto">🎯 Çalışma oluştur</Link>
      </div>
      <p className="text-sm text-slate-500">{p.total} soru değerlendirildi: {p.sources.exam} deneme, {p.sources.bank} soru bankası tekrarı, {p.sources.study} çalışma planı cevabı. Başarı; zorluğa ve yakınlığa göre ağırlıklandırılır, az örnekte ihtiyatlı hesaplanır. Bir denemedeki hata, konuyu bilmediği anlamına gelmez; farklı kaynaklar birlikte değerlendirilir.</p>

      <section className="card space-y-3 border-indigo-300 dark:border-indigo-800">
        <div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">Uyarlanabilir öneriler</h2><span className="ml-auto" /><RefreshButton studentId={id} label="🔄 Yenile" /></div>
        {pending.length === 0 ? <p className="text-sm text-slate-500">Bekleyen öneri yok. Öğrenci çalışmasını bitirdiğinde ya da “Yenile”ye bastığınızda güncel veriden önerilir.</p> : (
          <ul className="space-y-3">{pending.map(r => (
            <li key={r.id} className="space-y-1 border-t border-slate-100 pt-3 first:border-0 first:pt-0 dark:border-slate-800">
              <p className="text-sm"><span className={'mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ' + TRIGGER_STYLE[r.trigger]}>{TRIGGER_LABEL[r.trigger]}</span>{r.text}</p>
              <p className="flex items-center gap-4"><Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${id}&konu=${r.unit_id}&tur=${r.kind}&adet=${r.q_count}&oneri=${r.id}`} className="btn-primary px-3 py-1.5 text-xs">Önizle ve oluştur →</Link><DismissButton id={r.id} /></p>
            </li>))}</ul>)}
        <p className="text-xs text-slate-500">Öneriler öğrenciye kendiliğinden atanmaz; önizleyip onaylarsınız.</p>
      </section>

      {!pending.length && rec ? (
        <section className="card space-y-2 border-indigo-300 dark:border-indigo-800">
          <h2 className="font-bold">Önerilen çalışma</h2>
          <p className="text-sm">{rec.text}</p>
          <p className="text-xs text-slate-500">Öneri öğrenciye kendiliğinden atanmaz; önizleyip onaylarsınız.</p>
          <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${id}&konu=${rec.unitIds.join(',')}&tur=${rec.kind}&adet=${rec.count}`} className="btn-primary inline-flex">{KIND_LABEL[rec.kind]} oluştur →</Link>
        </section>
      ) : !pending.length ? <p className="card text-sm text-slate-500">Öneri için henüz yeterli veri yok. Denemeler, soru bankası tekrarları ya da bir ölçme çalışması verisi biriktikçe burada görünür.</p> : null}

      <section className="card space-y-2">
        <h2 className="font-bold">Konu bazlı başarı</h2>
        <PerfTable perf={p.perf} />
      </section>

      {(plans || []).length > 0 && (
        <section className="card space-y-1 text-sm">
          <h2 className="font-bold">Son çalışma planları</h2>
          {(plans || []).map(pl => <p key={pl.id}><Link href={`/ogretmen/ogrenme-planlari/${pl.id}`} className="font-semibold hover:underline">{pl.title}</Link> <span className="text-xs text-slate-500">· {pl.status === 'draft' ? 'taslak' : pl.status === 'assigned' ? 'atandı' : 'tamamlandı'}</span></p>)}
        </section>
      )}
    </div>
  );
}

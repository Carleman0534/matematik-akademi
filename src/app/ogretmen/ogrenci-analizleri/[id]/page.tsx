import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getTopics, getStudent } from '@/lib/data';
import { studentProfile } from '@/lib/studyData';
import { recommend, KIND_LABEL } from '@/lib/studyEngine';
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

      {rec ? (
        <section className="card space-y-2 border-indigo-300 dark:border-indigo-800">
          <h2 className="font-bold">Önerilen çalışma</h2>
          <p className="text-sm">{rec.text}</p>
          <p className="text-xs text-slate-500">Öneri öğrenciye kendiliğinden atanmaz; önizleyip onaylarsınız.</p>
          <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${id}&konu=${rec.unitIds.join(',')}&tur=${rec.kind}&adet=${rec.count}`} className="btn-primary inline-flex">{KIND_LABEL[rec.kind]} oluştur →</Link>
        </section>
      ) : <p className="card text-sm text-slate-500">Öneri için henüz yeterli veri yok. Denemeler, soru bankası tekrarları ya da bir ölçme çalışması verisi biriktikçe burada görünür.</p>}

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

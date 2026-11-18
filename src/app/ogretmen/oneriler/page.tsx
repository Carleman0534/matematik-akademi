import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { KIND_LABEL, type Kind } from '@/lib/studyEngine';
import { TRIGGER_LABEL, TRIGGER_STYLE, type Trigger } from '@/lib/adaptive';
import { RefreshButton, DismissButton } from './RecControls';
import { fmtDate } from '@/lib/labels';

export const metadata: Metadata = { title: 'Çalışma önerileri' };
export const dynamic = 'force-dynamic';

interface RecRow { id: string; student_id: string; unit_id: string; trigger: Trigger; kind: Kind; q_count: number; text: string; created_at: string; students: { full_name: string } | { full_name: string }[] | null; topics: { name: string } | { name: string }[] | null }

export default async function RecommendationsPage() {
  await requireTeacher();
  const sb = await supabaseServer();
  const { data } = await sb.from('study_recommendations').select('id, student_id, unit_id, trigger, kind, q_count, text, created_at, students(full_name), topics(name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(200);
  const recs = (data || []) as unknown as RecRow[];
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);
  const by = new Map<string, { name: string; list: RecRow[] }>();
  for (const r of recs) { const g = by.get(r.student_id) ?? { name: one(r.students)?.full_name || 'Öğrenci', list: [] }; g.list.push(r); by.set(r.student_id, g); }
  const groups = [...by.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'tr'));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-black">Çalışma önerileri</h1>
          <p className="text-sm text-slate-500">Sistem her öğrencinin cevaplarını izler: zorlandığı konuya eksik tamamlama, bir süredir çalışılmayan konuya aralıklı tekrar, güçlü konuya daha zor sorular önerir. Öneriler <b>kendiliğinden atanmaz</b>; önizleyip onaylarsınız ya da reddedersiniz. Bir öğrenci çalışmasını bitirince öğrencinin önerileri kendiliğinden yenilenir.</p></div>
        <RefreshButton />
      </div>
      {groups.length === 0 ? <p className="card text-sm text-slate-500">Bekleyen öneri yok. Öğrenciler çalışma, deneme ve soru bankası tekrarı yaptıkça burada görünür; “Önerileri yenile” ile mevcut verileri hemen taratabilirsiniz.</p> : groups.map(([sid, g]) => (
        <section key={sid} className="card space-y-3">
          <div className="flex items-center gap-3"><h2 className="font-bold">{g.name}</h2><Link href={`/ogretmen/ogrenci-analizleri/${sid}`} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Konu analizi →</Link></div>
          <ul className="space-y-3">
            {g.list.map(r => (
              <li key={r.id} className="space-y-1 border-t border-slate-100 pt-3 first:border-0 first:pt-0 dark:border-slate-800">
                <p className="flex flex-wrap items-center gap-2 text-sm"><span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + TRIGGER_STYLE[r.trigger]}>{TRIGGER_LABEL[r.trigger]}</span><b>{one(r.topics)?.name}</b><span className="text-xs text-slate-500">· {KIND_LABEL[r.kind]} · {r.q_count} soru · {fmtDate(r.created_at)}</span></p>
                <p className="text-sm">{r.text}</p>
                <p className="flex items-center gap-4">
                  <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${r.student_id}&konu=${r.unit_id}&tur=${r.kind}&adet=${r.q_count}&oneri=${r.id}`} className="btn-primary px-3 py-1.5 text-xs">Önizle ve oluştur →</Link>
                  <DismissButton id={r.id} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

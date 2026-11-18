import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getClasses, getTopics } from '@/lib/data';
import { studentProfile } from '@/lib/studyData';
import { recommend, LEVEL_LABEL, LEVEL_STYLE } from '@/lib/studyEngine';
import { pct } from '@/lib/labels';

export const metadata: Metadata = { title: 'Öğrenci Konu Analizleri' };
export const dynamic = 'force-dynamic';

export default async function StudentAnalysesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireTeacher();
  const sp = await searchParams;
  const grade = Number(sp.sinif) || 8;
  const sb = await supabaseServer();
  const [classes, topics] = await Promise.all([getClasses(sb, me.userId), getTopics(sb)]);
  const classId = classes.some(c => c.id === sp.sinifgrubu) ? sp.sinifgrubu! : '';
  let q = sb.from('students').select('id, full_name').eq('teacher_id', me.userId).eq('is_active', true).order('full_name').limit(60);
  if (classId) q = q.eq('class_id', classId);
  const { data } = await q;
  const students = (data || []) as { id: string; full_name: string }[];
  const profiles = await Promise.all(students.map(async s => ({ s, p: await studentProfile(sb, s.id, 'teacher', topics, grade) })));

  // Sınıfın ortak eksikleri: ünite başına "zayıf" öğrenci sayısı
  const unitNames = new Map<string, string>(); const weakCount = new Map<string, number>(); const measured = new Map<string, number>();
  profiles.forEach(({ p }) => p.perf.forEach(u => {
    unitNames.set(u.unitId, u.name);
    if (u.perf.level !== 'veri_yok') measured.set(u.unitId, (measured.get(u.unitId) || 0) + 1);
    if (u.perf.level === 'oncelikli' || u.perf.level === 'gelistirilmeli') weakCount.set(u.unitId, (weakCount.get(u.unitId) || 0) + 1);
  }));
  const common = [...weakCount].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">Öğrenci Konu Analizleri</h1>
          <p className="text-sm text-slate-500">Her öğrencinin konu başarısı; denemeler, soru bankası tekrarları ve çalışma planı cevaplarından hesaplanır. Soru zorluğu, yakınlık ve soru sayısı dikkate alınır; az veriyle &ldquo;yeterli veri yok&rdquo; denir.</p>
        </div>
        <Link href="/ogretmen/ogrenme-planlari" className="btn-secondary">🎯 Öğrenme planları</Link>
      </div>
      <form className="flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor="sg">Sınıf / grup</label><select id="sg" name="sinifgrubu" defaultValue={classId} className="input"><option value="">Bütün öğrencilerim</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="sn">Düzey</label><select id="sn" name="sinif" defaultValue={grade} className="input">{[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>{g === 8 ? '8. sınıf (LGS)' : g + '. sınıf'}</option>)}</select></div>
        <button className="btn-secondary">Göster</button>
      </form>

      {common.length > 0 && (
        <div className="card text-sm">
          <b>Ortak eksikler:</b> {common.map(([id, n]) => <span key={id} className="mr-3 inline-block"><Link href={`/ogretmen/ogrenme-planlari/yeni?konu=${id}`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">{unitNames.get(id)}</Link> <span className="text-slate-500">({n}/{measured.get(id)} öğrenci zayıf)</span></span>)}
        </div>
      )}

      {students.length === 0 ? <p className="text-sm text-slate-500">Aktif öğrenci yok.</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50"><tr><th className="px-3 py-2">Öğrenci</th><th>Ölçülen soru</th><th>Öncelikli konular</th><th>Güçlü konular</th><th>Öneri</th></tr></thead>
            <tbody>
              {profiles.map(({ s, p }) => {
                const weak = p.perf.filter(u => u.perf.level === 'oncelikli' || u.perf.level === 'gelistirilmeli').sort((a, b) => (a.perf.rate ?? 1) - (b.perf.rate ?? 1)).slice(0, 3);
                const strong = p.perf.filter(u => u.perf.level === 'guclu').slice(0, 3);
                const rec = recommend(p.perf);
                return (
                  <tr key={s.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="px-3 py-2 font-semibold"><Link href={`/ogretmen/ogrenci-analizleri/${s.id}?sinif=${grade}`} className="hover:underline">{s.full_name}</Link></td>
                    <td>{p.total ? <>{p.total} <span className="text-[11px] text-slate-400">({p.sources.exam} deneme · {p.sources.bank} banka · {p.sources.study} çalışma)</span></> : <span className="text-slate-400">veri yok</span>}</td>
                    <td className="space-y-0.5">{weak.length ? weak.map(u => <span key={u.unitId} className={'mr-1 inline-block rounded px-1.5 text-xs font-semibold ' + LEVEL_STYLE[u.perf.level]} title={LEVEL_LABEL[u.perf.level]}>{u.name} {pct(u.perf.rate)}</span>) : <span className="text-xs text-slate-400">—</span>}</td>
                    <td>{strong.length ? strong.map(u => <span key={u.unitId} className={'mr-1 inline-block rounded px-1.5 text-xs font-semibold ' + LEVEL_STYLE.guclu}>{u.name} {pct(u.perf.rate)}</span>) : <span className="text-xs text-slate-400">—</span>}</td>
                    <td>{rec ? <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${s.id}&konu=${rec.unitIds.join(',')}&tur=${rec.kind}&adet=${rec.count}`} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Çalışma oluştur →</Link> : <Link href={`/ogretmen/ogrenme-planlari/yeni?ogrenci=${s.id}`} className="text-xs text-slate-500 hover:underline">Ölçmek için çalışma</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

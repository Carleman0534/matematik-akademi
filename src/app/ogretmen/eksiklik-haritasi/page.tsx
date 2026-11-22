import Link from 'next/link';
import { requireTeacher } from '@/lib/auth';
import { getDb } from '@/lib/db/database';
import { SubTabBar } from '@/components/SubTabBar';

export const dynamic = 'force-dynamic';

interface Cell { student_id: string; student_name: string; topic_id: string; topic_name: string; mastery: number; solved: number }

const ANALYSIS_TABS = [
  { href: '/ogretmen/hazirbulunusluk', label: 'Hazırbulunuşluk & Seviye', icon: '🎯' },
  { href: '/ogretmen/yanlis-analizi', label: 'Akıllı Yanlış Analizi', icon: '🔍' },
  { href: '/ogretmen/unutma-riski', label: 'Aralıklı Tekrar & Risk', icon: '🔁' },
  { href: '/ogretmen/eksiklik-haritasi', label: 'Eksiklik Haritası', icon: '🗺️' },
  { href: '/ogretmen/ogrenci-konu-analizleri', label: 'Öğrenci Konu Analizleri', icon: '📈' },
];

function cellClass(m: number) {
  if (m < 50) return 'bg-purple-300 dark:bg-purple-900/60 text-purple-950 dark:text-purple-200';
  if (m < 70) return 'bg-blue-200 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200';
  if (m < 90) return 'bg-blue-600 text-white font-bold';
  return 'bg-teal-400 dark:bg-teal-500 text-teal-950 dark:text-slate-900 font-black';
}

// Konu bazlı eksiklik haritası: yalnızca öğrencilerin gerçek konu performans kayıtlarından
export default async function EksiklikHaritasiPage() {
  await requireTeacher();
  const db = await getDb();
  const cells: Cell[] = [];
  try {
    const st = db.prepare(`
      SELECT p.student_id, COALESCE(u.name, 'Öğrenci') AS student_name, p.topic_id,
             COALESCE(t.name, p.topic_id) AS topic_name, p.mastery_score AS mastery, COALESCE(p.solved_count, 0) AS solved
      FROM student_topic_performance p
      JOIN students s ON s.id = p.student_id
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN curriculum_topics t ON t.id = p.topic_id
      GROUP BY p.student_id, p.topic_id
      ORDER BY student_name, topic_name
    `);
    while (st.step()) cells.push(st.getAsObject() as unknown as Cell);
    st.free();
  } catch (e) {
    console.warn('eksiklik-haritasi query failed:', e);
  }

  const students = Array.from(new Map(cells.map(c => [c.student_id, c.student_name])).entries());
  const topics = Array.from(new Map(cells.map(c => [c.topic_id, c.topic_name])).entries());
  const at = new Map(cells.map(c => [`${c.student_id}|${c.topic_id}`, c]));
  const topicAvg = topics
    .map(([id, name]) => {
      const vals = cells.filter(c => c.topic_id === id).map(c => Number(c.mastery));
      return { id, name, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
    })
    .sort((a, b) => a.avg - b.avg);

  return (
    <div className="space-y-6">
      <SubTabBar
        title="Akıllı Analiz ve Öğrenci Gelişimi"
        description="Hazırbulunuşluk, kök neden analizi, aralıklı tekrar ve eksiklik haritaları"
        tabs={ANALYSIS_TABS}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">🗺️ Konu Bazlı Eksiklik Haritası</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Öğrencilerin çözdüğü sorulardan hesaplanan konu hakimiyeti (%). Veri, öğrenciler deneme ve soru çözdükçe dolar.
          </p>
        </div>
        <Link href="/ogretmen/denemeler/toplu-ata" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition">
          Eksiklere Göre Deneme Ata →
        </Link>
      </div>

      {cells.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
          Henüz konu performans verisi yok. Öğrenciler deneme çözdükçe harita burada oluşur.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Öğrenci × Konu Hakimiyeti</h2>
              <span className="text-[11px] font-semibold text-slate-400">{students.length} Öğrenci · {topics.length} Konu</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 text-left font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">Konu</th>
                    {students.map(([id, name]) => (
                      <th key={id} className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topics.map(([tid, tname]) => (
                    <tr key={tid}>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{tname}</td>
                      {students.map(([sid, sname]) => {
                        const c = at.get(`${sid}|${tid}`);
                        return (
                          <td key={sid} className="p-1 text-center">
                            {c ? (
                              <div className={`w-full py-2 rounded-lg text-[11px] ${cellClass(Number(c.mastery))}`} title={`${sname} · ${tname}: %${c.mastery} (${c.solved} soru)`}>
                                %{c.mastery}
                              </div>
                            ) : (
                              <div className="w-full py-2 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-400">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-300 inline-block" /> &lt; %50 Destek gerekir</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> %50–69</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> %70–89</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-400 inline-block" /> %90+</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Konu Ortalamaları (en zayıftan)</h3>
            <div className="space-y-2.5">
              {topicAvg.map(t => (
                <div key={t.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{t.name}</span>
                    <span className="font-bold text-indigo-600">%{t.avg}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${t.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireTeacher } from '@/lib/auth';
import { getDb } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

interface Row {
  student_id: string;
  student_name: string;
  exam_title: string;
  net_score: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  completed_at: string | null;
}

// Öğrenci gelişimi: her öğrencinin gerçek deneme sonuçları, tarih sırasıyla ve bir öncekine göre net farkıyla
export default async function GelisimKarsilastirmaPage() {
  await requireTeacher();
  const db = await getDb();
  const rows: Row[] = [];
  try {
    const st = db.prepare(`
      SELECT er.student_id, COALESCE(u.name, 'Öğrenci') AS student_name, COALESCE(e.title, p.title, 'Deneme') AS exam_title,
             er.net_score, er.correct_count, er.wrong_count, er.blank_count, COALESCE(er.completed_at, er.created_at) AS completed_at
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN exams e ON e.id = er.exam_id
      LEFT JOIN pdf_documents p ON p.id = er.exam_id
      WHERE er.net_score IS NOT NULL
      GROUP BY er.id
      ORDER BY student_name, completed_at
    `);
    while (st.step()) rows.push(st.getAsObject() as unknown as Row);
    st.free();
  } catch (e) {
    console.warn('karsilastir query failed:', e);
  }

  const byStudent = new Map<string, { name: string; rows: Row[] }>();
  for (const r of rows) {
    const g = byStudent.get(r.student_id) || { name: r.student_name, rows: [] };
    g.rows.push(r);
    byStudent.set(r.student_id, g);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Öğrenci Gelişimi & Deneme Karşılaştırma</h1>
          <p className="text-xs text-slate-500 mt-1">Her öğrencinin çözdüğü denemeler tarih sırasıyla; net farkı bir önceki denemeye göredir.</p>
        </div>
        <Link href="/ogretmen/deneme-analizleri" className="text-xs font-bold text-indigo-600 hover:underline">← Deneme Sonuçları</Link>
      </div>

      {byStudent.size === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
          Henüz tamamlanmış deneme sonucu yok.
        </div>
      ) : (
        Array.from(byStudent.entries()).map(([id, g]) => (
          <div key={id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h2>
              <span className="text-[11px] text-slate-400">{g.rows.length} deneme</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Tarih</th>
                    <th className="py-2.5 px-4">Deneme</th>
                    <th className="py-2.5 px-4 text-center">D / Y / B</th>
                    <th className="py-2.5 px-4 text-right">Net</th>
                    <th className="py-2.5 px-4 text-right">Fark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.rows.map((r, i) => {
                    const prev = i > 0 ? Number(g.rows[i - 1].net_score) : null;
                    const diff = prev === null ? null : parseFloat((Number(r.net_score) - prev).toFixed(2));
                    return (
                      <tr key={i}>
                        <td className="py-2.5 px-4 text-slate-500">{r.completed_at ? new Date(String(r.completed_at).replace(' ', 'T')).toLocaleDateString('tr-TR') : '—'}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{r.exam_title}</td>
                        <td className="py-2.5 px-4 text-center text-slate-500">{r.correct_count} / {r.wrong_count} / {r.blank_count}</td>
                        <td className="py-2.5 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">{r.net_score}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${diff === null ? 'text-slate-400' : diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${diff}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

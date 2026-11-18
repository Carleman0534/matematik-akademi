import { LEVEL_LABEL, LEVEL_STYLE, CONFIDENCE_LABEL, type Perf, type UnitPerf } from '@/lib/studyEngine';
import { fmtDate, pct } from '@/lib/labels';

const barColor = (r: number) => (r >= 0.8 ? 'bg-emerald-600' : r >= 0.65 ? 'bg-emerald-400' : r >= 0.5 ? 'bg-amber-400' : r >= 0.35 ? 'bg-orange-500' : 'bg-red-500');

function Cells({ p }: { p: Perf }) {
  if (p.level === 'veri_yok') return <><td colSpan={3} className="text-xs text-slate-500">Bu konuda henüz yeterli veri yok{p.n ? ` (${p.n} soru)` : ''}</td><td /><td /></>;
  return (
    <>
      <td className="w-40"><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={'h-2 rounded-full ' + barColor(p.rate ?? 0)} style={{ width: `${(p.rate ?? 0) * 100}%` }} /></div>
        <span className="text-xs font-bold">{pct(p.rate)}</span> <span className="text-[11px] text-slate-500">{CONFIDENCE_LABEL[p.confidence]}</span></td>
      <td className="text-xs">{p.n} <span className="text-slate-400">·</span> <span className="text-emerald-600">{p.correct}D</span> <span className="text-red-600">{p.wrong}Y</span> <span className="text-slate-500">{p.blank}B</span></td>
      <td className="text-center text-xs">{p.types || '—'}</td>
      <td className="text-xs text-slate-500">{p.lastAt ? fmtDate(p.lastAt) : '—'}{p.trend != null && <span className={'ml-1 font-bold ' + (p.trend > 0.15 ? 'text-emerald-600' : p.trend < -0.15 ? 'text-red-600' : 'text-slate-400')} title="Son sorular önceki sorulara göre">{p.trend > 0.15 ? '▲' : p.trend < -0.15 ? '▼' : '▬'}</span>}</td>
    </>
  );
}

// Ünite ve alt konu başarı tablosu (öğretmen ve öğrenci ekranlarında ortak)
export function PerfTable({ perf }: { perf: UnitPerf[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Konu</th><th>Durum</th><th>Başarı</th><th>Soru (D/Y/B)</th><th className="text-center">Soru tipi</th><th>Son çalışma</th></tr></thead>
        {perf.map(u => (
          <tbody key={u.unitId} className="border-t border-slate-100 dark:border-slate-800">
            <tr className="align-middle">
              <td className="py-2 font-bold">
                {u.subs.some(s => s.perf.n > 0) ? (
                  <details className="group"><summary className="cursor-pointer list-none">{u.name} <span className="text-xs font-normal text-slate-400 group-open:hidden">▸ alt konular</span></summary>
                    <ul className="mt-1 space-y-0.5 pl-3 text-xs font-normal">
                      {u.subs.map(s => (
                        <li key={s.id} className="flex flex-wrap items-center gap-x-2">
                          <span className="min-w-40">{s.name}</span>
                          {s.perf.level === 'veri_yok' ? <span className="text-slate-400">{s.perf.n ? `${s.perf.n} soru · yeterli veri yok` : 'veri yok'}</span>
                            : <><span className={'rounded px-1.5 text-[11px] font-semibold ' + LEVEL_STYLE[s.perf.level]}>{LEVEL_LABEL[s.perf.level]}</span><span>{pct(s.perf.rate)} · {s.perf.n} soru</span></>}
                        </li>
                      ))}
                    </ul></details>
                ) : u.name}
              </td>
              <td><span className={'rounded px-2 py-0.5 text-xs font-semibold ' + LEVEL_STYLE[u.perf.level]}>{LEVEL_LABEL[u.perf.level]}</span>
                {u.perf.limited && <span className="mt-0.5 block text-[10px] text-amber-600" title="Yalnızca kolay sorular çözülmüş">sadece kolay sorular</span>}</td>
              <Cells p={u.perf} />
            </tr>
          </tbody>
        ))}
      </table>
    </div>
  );
}

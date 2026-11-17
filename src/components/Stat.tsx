export function Stat({ label, value, sub, tone = '' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={'mt-1 text-2xl font-black ' + tone}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

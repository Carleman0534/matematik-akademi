import Link from 'next/link';

// Deneme sayfaları arasında sekmeler (sunucu bileşeni)
export function ExamTabs({ id, active, live }: { id: string; active: 'hazirlik' | 'canli' | 'sonuclar'; live: boolean }) {
  const tabs = [
    { key: 'hazirlik', href: `/ogretmen/denemeler/${id}`, label: 'Hazırlık' },
    { key: 'canli', href: `/ogretmen/denemeler/${id}/canli`, label: live ? '● Canlı izleme' : 'Canlı izleme' },
    { key: 'sonuclar', href: `/ogretmen/denemeler/${id}/sonuclar`, label: 'Sonuçlar ve analiz' },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" aria-label="Deneme bölümleri">
      {tabs.map(t => (
        <Link key={t.key} href={t.href} aria-current={active === t.key ? 'page' : undefined}
          className={'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ' + (active === t.key ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200') + (t.key === 'canli' && live ? ' text-red-600' : '')}>{t.label}</Link>
      ))}
    </nav>
  );
}

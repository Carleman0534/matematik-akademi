'use client';

// Simge CSS ile seçilir (html.dark); durum tutulmadığı için sunucu/istemci uyuşmazlığı olmaz
export function ThemeToggle({ className = '' }: { className?: string }) {
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('tema', next ? 'koyu' : 'acik'); } catch {}
  };
  return (
    <button type="button" onClick={toggle} aria-label="Açık / koyu tema" title="Açık / koyu tema"
      className={'rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ' + className}>
      <span className="dark:hidden">🌙</span><span className="hidden dark:inline">☀️</span>
    </button>
  );
}

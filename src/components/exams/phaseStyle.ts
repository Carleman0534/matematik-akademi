import type { Phase } from '@/lib/exams';

export const PHASE_STYLE: Record<Phase, string> = {
  taslak: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  bekliyor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  canli: 'bg-red-600 text-white',
  acilacak: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  acik: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  bitti: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
};

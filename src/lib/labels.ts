// Arayüz etiketleri ve renkleri (sunucu ve istemci ortak)
import type { LearningStatus } from './learning.ts';

export const INITIAL_LABEL = { wrong: 'Yanlış', blank: 'Boş' } as const;
export const DIFFICULTY_LABEL = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' } as const;
export const ERROR_TYPES = ['Konu eksiği', 'İşlem hatası', 'Soruyu yanlış okuma', 'Süre yetmedi', 'Dikkatsizlik', 'Yöntem bilmiyordum', 'Diğer'];

export const STATUS_STYLE: Record<LearningStatus, string> = {
  yeni: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  tekrar_bekliyor: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  tekrar_yanlis: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  tekrar_dogru: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  ogrenildi: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  kalici: 'bg-emerald-600 text-white',
};

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' }) : '—';
export const fmtDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '—';
export const pct = (x: number | null | undefined): string => (x == null ? '—' : '%' + Math.round(x * 100));

// Soru bankası filtreleri: adres çubuğundaki parametreler (paylaşılabilir, sayfa yenilenince korunur)
import type { LearningStatus, QuestionAnalysis } from './learning.ts';

export interface BankFilters {
  q: string;                         // metin arama (soru metni, notlar)
  durum: '' | 'wrong' | 'blank';     // ilk eklenme nedeni
  ogrenme: '' | LearningStatus | 'due' | 'learned';
  zorluk: '' | 'easy' | 'medium' | 'hard';
  konu: string;                      // konu ya da ünite (alt konular dahil)
  sinif: string;                     // sınıf düzeyi (konunun düzeyi)
  kaynak: string;
  baslangic: string;                 // YYYY-MM-DD
  bitis: string;                     // YYYY-MM-DD
  minYanlis: number;                 // en az N kez yanlış/boş
  arsiv: boolean;                    // arşivlenenleri göster
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['yeni', 'tekrar_bekliyor', 'tekrar_yanlis', 'tekrar_dogru', 'ogrenildi', 'kalici', 'due', 'learned'];

export function parseFilters(p: Params): BankFilters {
  const durum = one(p.durum);
  const ogrenme = one(p.ogrenme);
  const zorluk = one(p.zorluk);
  const n = parseInt(one(p.minYanlis), 10);
  return {
    q: one(p.q).slice(0, 100),
    durum: durum === 'wrong' || durum === 'blank' ? durum : '',
    ogrenme: (STATUSES.includes(ogrenme) ? ogrenme : '') as BankFilters['ogrenme'],
    zorluk: zorluk === 'easy' || zorluk === 'medium' || zorluk === 'hard' ? zorluk : '',
    konu: UUID.test(one(p.konu)) ? one(p.konu) : '',
    sinif: /^(9|10|11|12)$/.test(one(p.sinif)) ? one(p.sinif) : '',
    kaynak: UUID.test(one(p.kaynak)) ? one(p.kaynak) : '',
    baslangic: DATE.test(one(p.baslangic)) ? one(p.baslangic) : '',
    bitis: DATE.test(one(p.bitis)) ? one(p.bitis) : '',
    minYanlis: Number.isFinite(n) && n > 0 && n < 100 ? n : 0,
    arsiv: one(p.arsiv) === '1',
  };
}

export function filtersToQuery(f: Partial<BankFilters>): string {
  const sp = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v === '' || v === false || v === 0 || v == null) return;
    sp.set(k, v === true ? '1' : String(v));
  });
  return sp.toString();
}

export const activeFilterCount = (f: BankFilters): number =>
  [f.q, f.durum, f.ogrenme, f.zorluk, f.konu, f.sinif, f.kaynak, f.baslangic, f.bitis].filter(Boolean).length + (f.minYanlis ? 1 : 0) + (f.arsiv ? 1 : 0);

// Metin aramasında PostgREST "or" sözdizimini bozacak karakterleri temizle
export const sanitizeSearch = (s: string): string => s.replace(/[%,()*\\:"']/g, ' ').replace(/\s+/g, ' ').trim();

// Çözüm geçmişinden hesaplanan filtreler (veritabanında alan olarak tutulmaz)
export function matchesComputed(f: BankFilters, a: QuestionAnalysis): boolean {
  if (f.minYanlis && a.wrongCount + a.blankCount < f.minYanlis) return false;
  if (!f.ogrenme) return true;
  if (f.ogrenme === 'due') return a.due;
  if (f.ogrenme === 'learned') return a.status === 'ogrenildi' || a.status === 'kalici';
  return a.status === f.ogrenme;
}

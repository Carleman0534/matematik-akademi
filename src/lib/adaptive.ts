// Uyarlanabilir öğrenme (Faz F): öğrencinin konu profilinden sıradaki çalışma önerilerini üretir.
//  * eksik         – başarısı düşük konu → adaptif düzeyde eksik tamamlama
//  * tekrar_zamani – konu bir süredir çalışılmadı → kısa pekiştirme (aralıklı tekrar: zayıfsa 7, iyiyse 14, güçlüyse 30 gün)
//  * ilerlet       – konu güçlü ve yakın zamanda çalışıldı → zorluğu artır
// Saf fonksiyonlar (veritabanı gerektirmez) → logic.test.ts
import { MIN_EVIDENCE, KIND_LABEL, targetLevels, levelsText, type Kind, type Level, type UnitPerf } from './studyEngine.ts';

export type Trigger = 'eksik' | 'tekrar_zamani' | 'ilerlet';
export const TRIGGER_LABEL: Record<Trigger, string> = { eksik: 'Eksik konu', tekrar_zamani: 'Tekrar zamanı', ilerlet: 'İlerletme' };
export const TRIGGER_STYLE: Record<Trigger, string> = {
  eksik: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  tekrar_zamani: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  ilerlet: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};

const DAY = 86400000;
// Konu düzeyine göre tekrar aralığı (gün): ne kadar iyi biliyorsa o kadar seyrek
export const REVIEW_DAYS: Partial<Record<Level, number>> = { gelistirilmeli: 5, tekrar: 7, iyi: 14, guclu: 30 };

export interface Rec {
  unitId: string; unitName: string; trigger: Trigger; kind: Kind; count: number;
  text: string;        // öğretmene
  goal: string;        // öğrenciye (kısa)
  priority: number;
}

const pct = (r: number | null) => Math.round((r ?? 0) * 100);
export const daysSince = (iso: string | null, now: number) => (iso ? Math.floor((now - Date.parse(iso)) / DAY) : null);

export function buildRecommendations(perf: UnitPerf[], now: number): Rec[] {
  const out: Rec[] = [];
  for (const u of perf) {
    const p = u.perf;
    if (p.n < MIN_EVIDENCE || p.level === 'veri_yok') continue;
    const idle = daysSince(p.lastAt, now);
    const dec = p.trend != null && p.trend <= -0.3 ? ' Son dönemde belirgin düşüş görülüyor.' : p.trend != null && p.trend >= 0.3 ? ' Son dönemde belirgin yükseliş var.' : '';
    if (p.level === 'oncelikli' || p.level === 'gelistirilmeli') {
      const subs = u.subs.filter(s => s.perf.n >= MIN_EVIDENCE && s.perf.level !== 'iyi' && s.perf.level !== 'guclu').map(s => s.name);
      const kind: Kind = 'eksik_tamamlama', count = p.level === 'oncelikli' ? 15 : 12;
      const tl = levelsText(targetLevels(kind, p));
      out.push({
        unitId: u.unitId, unitName: u.name, trigger: 'eksik', kind, count,
        text: `${u.name} konusunda zorlanıyor (başarı %${pct(p.rate)}, ${p.n} soru${subs.length ? '; özellikle ' + subs.join(', ') : ''}).${dec}${idle != null && idle >= 10 ? ` ${idle} gündür bu konuda çalışmamış.` : ''} ${count} soruluk eksik tamamlama önerilir (hedef düzey: ${tl}).`,
        goal: `${u.name} konusuna çalış (şu an %${pct(p.rate)})`,
        priority: 100 - pct(p.rate) + Math.min(20, idle ?? 0),
      });
      continue;
    }
    const gap = REVIEW_DAYS[p.level];
    if (gap != null && idle != null && idle >= gap) {
      const kind: Kind = 'pekistirme', count = 8;
      out.push({
        unitId: u.unitId, unitName: u.name, trigger: 'tekrar_zamani', kind, count,
        text: `${u.name} ${idle} gündür çalışılmadı (başarı %${pct(p.rate)}, ${gap} günlük tekrar aralığı geçti). Unutmayı önlemek için ${count} soruluk kısa pekiştirme önerilir (hedef düzey: ${levelsText(targetLevels(kind, p))}).`,
        goal: `${u.name} konusunu tekrar et (${idle} gündür çalışmadın)`,
        priority: 40 + Math.min(30, idle - gap),
      });
      continue;
    }
    if (p.level === 'guclu' && !p.limited) {
      const kind: Kind = 'zorlayici', count = 8;
      out.push({
        unitId: u.unitId, unitName: u.name, trigger: 'ilerlet', kind, count,
        text: `${u.name} konusunda başarı yüksek (%${pct(p.rate)}). Zorluğu artırmak için ${count} soruluk zorlayıcı çalışma önerilir (hedef düzey: ${levelsText(targetLevels(kind, p))}).${dec}`,
        goal: `${u.name} güçlü; zor sorulara hazırsın`,
        priority: 20,
      });
    }
  }
  return out.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

export const recTitle = (r: { kind: Kind; trigger: Trigger }) => `${KIND_LABEL[r.kind]}${r.trigger === 'tekrar_zamani' ? ' (tekrar)' : ''}`;

// Tamamlanan bir çalışmanın sonucu → öğrenciye geri bildirim ve zorluk yönü
export function planOutcome(total: number, correct: number): { rate: number; direction: 'yukari' | 'ayni' | 'asagi'; message: string } {
  const rate = total ? correct / total : 0;
  if (rate >= 0.85) return { rate, direction: 'yukari', message: 'Çok iyi! Bu konuda başarılısın; bir sonraki çalışmalarda soruların zorluğu artırılacak.' };
  if (rate < 0.4) return { rate, direction: 'asagi', message: 'Bu konu seni zorladı, sorun değil. Yanlışların Soru Bankana eklendi; öğretmenin daha temel sorularla yeni bir çalışma önerecek.' };
  return { rate, direction: 'ayni', message: 'İyi gidiyorsun. Yanlışlarını Tekrar Et bölümünden çalışmaya devam et; benzer düzeyde yeni çalışmalar gelecek.' };
}

// Günlük hedef: bugün (Türkiye saatiyle) cevaplanan soru sayısı ve art arda çalışılan gün serisi
export const trDay = (iso: string | number | Date) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
export function dailyProgress(times: string[], now: number): { today: number; streak: number } {
  const days = new Map<string, number>();
  for (const t of times) days.set(trDay(t), (days.get(trDay(t)) ?? 0) + 1);
  const today = days.get(trDay(now)) ?? 0;
  let streak = 0;
  for (let i = today > 0 ? 0 : 1; i < 400; i++) { if (days.has(trDay(now - i * DAY))) streak++; else break; }
  return { today, streak };
}

// Öğrenci konu başarı profili ve kişiselleştirilmiş soru seçimi (saf fonksiyonlar → logic.test.ts)
import type { Topic } from './topics.ts';

export type Result = 'correct' | 'incorrect' | 'blank';
export interface Evidence { topic_id: string | null; result: Result; difficulty: number | null; type: string | null; at: string; source: 'exam' | 'bank' | 'study' }

export type Level = 'veri_yok' | 'guclu' | 'iyi' | 'tekrar' | 'gelistirilmeli' | 'oncelikli';
export const LEVEL_LABEL: Record<Level, string> = { veri_yok: 'Yeterli veri yok', guclu: 'Güçlü', iyi: 'İyi', tekrar: 'Tekrar gerekli', gelistirilmeli: 'Geliştirilmeli', oncelikli: 'Öncelikli eksik' };
export const LEVEL_STYLE: Record<Level, string> = {
  veri_yok: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', guclu: 'bg-emerald-600 text-white', iyi: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  tekrar: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', gelistirilmeli: 'bg-orange-200 text-orange-900 dark:bg-orange-950 dark:text-orange-200', oncelikli: 'bg-red-600 text-white',
};
export const CONFIDENCE_LABEL = { yok: '—', dusuk: 'düşük güven', orta: 'orta güven', yuksek: 'yüksek güven' } as const;
export const KIND_LABEL = {
  ogrenme: 'Konu öğrenme testi', pekistirme: 'Konu pekiştirme testi', yeni_nesil: 'Yeni nesil soru çalışması', zorlayici: 'Zorlayıcı sorular',
  karma: 'Karma konu testi', eksik_tamamlama: 'Eksik konu tamamlama', mini_deneme: 'LGS formatında mini deneme',
} as const;
export type Kind = keyof typeof KIND_LABEL;
export const DIFF_LABEL: Record<number, string> = { 1: 'Başlangıç', 2: 'Kolay', 3: 'Orta', 4: 'Zor', 5: 'İleri' };

export interface Perf {
  n: number; correct: number; wrong: number; blank: number;
  rate: number | null;            // zorluk ve yakınlıkla ağırlıklı, küçük örnekte 0,5'e çekilmiş başarı (0–1)
  raw: number | null;             // ağırlıksız doğru oranı
  level: Level; confidence: keyof typeof CONFIDENCE_LABEL;
  types: number; lastAt: string | null; trend: number | null; limited: boolean; // limited: yalnızca kolay sorular çözülmüş
}

const DAY = 86400000;
const DIFF_WEIGHT = [0.6, 0.8, 1, 1.2, 1.4];
const diffW = (d: number | null) => (d && d >= 1 && d <= 5 ? DIFF_WEIGHT[d - 1] : 1);
const decay = (ageMs: number) => Math.max(0.25, Math.pow(0.5, Math.max(0, ageMs) / (45 * DAY)));   // yarı ömür 45 gün, en az %25 ağırlık
export const MIN_EVIDENCE = 3;

export function emptyPerf(): Perf { return { n: 0, correct: 0, wrong: 0, blank: 0, rate: null, raw: null, level: 'veri_yok', confidence: 'yok', types: 0, lastAt: null, trend: null, limited: false }; }

export function computePerf(list: Evidence[], now: number): Perf {
  if (!list.length) return emptyPerf();
  let w = 0, wc = 0, correct = 0, wrong = 0, blank = 0, limited = true, last = '';
  const types = new Set<string>();
  for (const e of list) {
    const wt = diffW(e.difficulty) * decay(now - Date.parse(e.at));
    w += wt;
    if (e.result === 'correct') { wc += wt; correct++; } else if (e.result === 'blank') blank++; else wrong++;
    if (e.type) types.add(e.type);
    if (!last || e.at > last) last = e.at;
    if ((e.difficulty ?? 3) >= 3) limited = false;
  }
  const n = list.length;
  const rate = (wc + 1) / (w + 2);                                    // 0,5 başlangıç değerine 2 ağırlıklık çekim
  let level: Level = rate >= 0.8 ? 'guclu' : rate >= 0.65 ? 'iyi' : rate >= 0.5 ? 'tekrar' : rate >= 0.35 ? 'gelistirilmeli' : 'oncelikli';
  if (n < MIN_EVIDENCE) level = 'veri_yok';
  else if (level === 'guclu' && limited) level = 'iyi';               // iki kolay soruyla uzman sayılmaz
  let trend: number | null = null;
  if (n >= 6) {
    const s = [...list].sort((a, b) => a.at.localeCompare(b.at)), h = Math.floor(n / 2);
    const frac = (xs: Evidence[]) => xs.filter(x => x.result === 'correct').length / xs.length;
    trend = frac(s.slice(h)) - frac(s.slice(0, h));
  }
  return {
    n, correct, wrong, blank, rate, raw: wc / w, level, limited: limited && level !== 'veri_yok', trend, lastAt: last || null, types: types.size,
    confidence: n < MIN_EVIDENCE ? 'yok' : n < 6 ? 'dusuk' : n < 12 ? 'orta' : 'yuksek',
  };
}

export interface UnitPerf { unitId: string; name: string; perf: Perf; subs: { id: string; name: string; perf: Perf }[] }

// Ünite ve alt konu bazında profil. units: incelenecek üniteler; topics: bütün konu ağacı
export function unitPerformance(ev: Evidence[], topics: Topic[], units: Topic[], now: number): UnitPerf[] {
  const parent = new Map(topics.map(t => [t.id, t.parent_id]));
  const chain = (id: string | null): string[] => { const out: string[] = []; for (let c = id, i = 0; c && i < 20; i++) { out.push(c); c = parent.get(c) ?? null; } return out; };
  const chains = ev.map(e => (e.topic_id ? chain(e.topic_id) : []));
  return units.map(u => {
    const idx = chains.map((c, i) => (c.includes(u.id) ? i : -1)).filter(i => i >= 0);
    const subs = topics.filter(t => t.parent_id === u.id).map(t => ({ id: t.id, name: t.name, perf: computePerf(idx.filter(i => chains[i].includes(t.id)).map(i => ev[i]), now) }));
    return { unitId: u.id, name: u.name, perf: computePerf(idx.map(i => ev[i]), now), subs };
  });
}

// ---- Soru seçimi ----
export interface PoolItem { id: string; topic_id: string; difficulty: number | null; question_type: string | null; pdf_id: string | null }
export interface Picked { id: string; unitId: string; unitName: string; topic_id: string; difficulty: number | null; type: string | null; reason: string }
export interface SelectInput {
  studentKey: string; count: number; kind: Kind; unitIds: string[]; perf: UnitPerf[]; pool: PoolItem[]; topics: Topic[]; seen: Set<string>;
}
const NEW_GEN = new Set(['yeni_nesil', 'gunluk_yasam', 'tablo_grafik', 'gorsel_geometrik', 'cok_asamali']);
const RANK: Record<Level, number> = { oncelikli: 0, gelistirilmeli: 1, tekrar: 2, veri_yok: 3, iyi: 4, guclu: 5 };

function hash(s: string): number { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }

// Öğrencinin düzeyine göre hedef zorluk basamakları
export function targetLevels(kind: Kind, p: Perf): number[] {
  if (kind === 'ogrenme') return [1, 2, 3];
  if (kind === 'pekistirme') return [2, 3];
  if (kind === 'zorlayici') return [4, 5];
  if (kind === 'mini_deneme') return [2, 3, 4];
  if (p.level === 'veri_yok' || p.rate == null) return [2, 3, 4];     // ölçmek için orta aralık
  return p.rate < 0.35 ? [1, 2] : p.rate < 0.5 ? [2, 3] : p.rate < 0.65 ? [2, 3, 4] : p.rate < 0.8 ? [3, 4] : [4, 5];
}
export const levelsText = (l: number[]) => (l.length === 1 ? DIFF_LABEL[l[0]] : `${DIFF_LABEL[l[0]]}–${DIFF_LABEL[l[l.length - 1]]}`);

export function selectStudy(inp: SelectInput): { items: Picked[]; notes: string[] } {
  const notes: string[] = [];
  const parent = new Map(inp.topics.map(t => [t.id, t.parent_id]));
  const unitOf = (id: string): string | null => { const units = new Set(inp.perf.map(p => p.unitId)); for (let c: string | null = id, i = 0; c && i < 20; i++) { if (units.has(c)) return c; c = parent.get(c) ?? null; } return null; };
  const pools = new Map<string, PoolItem[]>();
  let seenCut = 0;
  for (const c of inp.pool) {
    const u = unitOf(c.topic_id);
    if (!u) continue;
    if (inp.seen.has(c.id)) { seenCut++; continue; }
    pools.set(u, [...(pools.get(u) || []), c]);
  }
  const perfBy = new Map(inp.perf.map(p => [p.unitId, p]));
  let targets: UnitPerf[];
  if (inp.unitIds.length) targets = inp.unitIds.map(id => perfBy.get(id)).filter((p): p is UnitPerf => !!p);
  else if (inp.kind === 'mini_deneme') targets = inp.perf.filter(p => pools.has(p.unitId));
  else targets = [...inp.perf].filter(p => pools.has(p.unitId)).sort((a, b) => RANK[a.perf.level] - RANK[b.perf.level] || (a.perf.rate ?? 0.5) - (b.perf.rate ?? 0.5)).slice(0, 4);
  const asked = targets.length;
  targets = targets.filter(t => (pools.get(t.unitId) || []).length > 0);
  for (const t of inp.unitIds.length ? inp.unitIds.map(id => perfBy.get(id)).filter((p): p is UnitPerf => !!p) : []) {
    if (!(pools.get(t.unitId) || []).length) notes.push(`${t.name}: havuzda bu öğrenciye uygun (onaylı, görmediği) soru yok.`);
  }
  if (!targets.length) { notes.push(asked ? 'Seçilen konularda uygun soru bulunamadı.' : 'Havuzda uygun soru yok; önce PDF analiz edip soruları onaylayın.'); return { items: [], notes }; }

  // Dağıtım: zayıf konuya daha çok; mini denemede eşit
  const weights = targets.map(t => (inp.kind === 'mini_deneme' ? 1 : t.perf.level === 'veri_yok' || t.perf.rate == null ? 0.6 : 1 - t.perf.rate + 0.15));
  const cap = targets.map(t => (pools.get(t.unitId) || []).length);
  const alloc = targets.map(() => 0);
  let left = Math.min(inp.count, cap.reduce((a, b) => a + b, 0));
  while (left > 0) {
    const open = targets.map((_, i) => i).filter(i => alloc[i] < cap[i]);
    if (!open.length) break;
    const total = open.reduce((a, i) => a + weights[i], 0);
    const share = open.map(i => ({ i, q: (weights[i] / total) * left }));
    let given = 0;
    for (const s of share) { const g = Math.min(Math.floor(s.q), cap[s.i] - alloc[s.i]); alloc[s.i] += g; given += g; }
    const rest = left - given;
    for (const s of [...share].sort((a, b) => (b.q - Math.floor(b.q)) - (a.q - Math.floor(a.q))).slice(0, rest)) if (alloc[s.i] < cap[s.i]) { alloc[s.i]++; given++; }
    if (given === 0) break;
    left -= given;
  }

  const items: Picked[] = [];
  targets.forEach((t, ti) => {
    const levels = targetLevels(inp.kind, t.perf);
    const cands = [...(pools.get(t.unitId) || [])];
    const picked: PoolItem[] = [];
    while (picked.length < alloc[ti] && cands.length) {
      const typeCount = (x: PoolItem) => picked.filter(p => p.question_type === x.question_type).length;
      const pdfCount = (x: PoolItem) => picked.filter(p => p.pdf_id && p.pdf_id === x.pdf_id).length;
      const dist = (x: PoolItem) => { const d = x.difficulty ?? 3; return levels.includes(d) ? 0 : Math.min(...levels.map(l => Math.abs(l - d))); };
      const gen = (x: PoolItem) => (inp.kind === 'yeni_nesil' && x.question_type && NEW_GEN.has(x.question_type) ? 0 : inp.kind === 'yeni_nesil' ? 1 : 0);
      let best = 0, bestKey: number[] | null = null;
      cands.forEach((x, i) => {
        const key = [gen(x), dist(x), typeCount(x), pdfCount(x), hash(inp.studentKey + x.id) % 1000];
        if (!bestKey) { best = i; bestKey = key; return; }
        // sözlük sırasıyla küçük olan kazanır: önce uygunluk, sonra tür / kaynak çeşitliliği, en son öğrenciye özgü sabit sıralama
        for (let j = 0; j < key.length; j++) { if (key[j] < bestKey[j]) { best = i; bestKey = key; return; } if (key[j] > bestKey[j]) return; }
      });
      picked.push(cands.splice(best, 1)[0]);
    }
    const p = t.perf;
    const why = p.level === 'veri_yok' || p.rate == null ? `henüz yeterli veri yok (${p.n} soru) · seviyeyi ölçmek için ${levelsText(levels)} düzey`
      : `başarı %${Math.round(p.rate * 100)} (${p.n} soru, ${LEVEL_LABEL[p.level].toLocaleLowerCase('tr')}) · hedef düzey ${levelsText(levels)}`;
    for (const x of picked) items.push({ id: x.id, unitId: t.unitId, unitName: t.name, topic_id: x.topic_id, difficulty: x.difficulty, type: x.question_type, reason: `${t.name}: ${why}` });
    if (picked.length < Math.round((weights[ti] / weights.reduce((a, b) => a + b, 0)) * inp.count) && picked.length === cap[ti]) notes.push(`${t.name}: havuzdaki uygun soru bu kadar (${picked.length}); daha fazlası için yeni PDF ekleyin ya da soru üretimini (Aşama D) kullanın.`);
  });
  if (items.length < inp.count) notes.push(`İstenen ${inp.count} sorudan ${items.length} soru bulunabildi.`);
  if (seenCut > 0) notes.push(`Öğrencinin daha önce çalışma setlerinde gördüğü ${seenCut} soru dışarıda bırakıldı.`);
  if (inp.kind === 'mini_deneme') items.sort((a, b) => targets.findIndex(t => t.unitId === a.unitId) - targets.findIndex(t => t.unitId === b.unitId) || (a.difficulty ?? 3) - (b.difficulty ?? 3));
  else items.sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));               // kolaydan zora
  return { items, notes };
}

// Öğretmene sunulacak öneri: en zayıf ünitelerden başlayarak çalışma parametreleri
export function recommend(perf: UnitPerf[]): { unitIds: string[]; kind: Kind; count: number; text: string } | null {
  const weak = perf.filter(p => p.perf.level === 'oncelikli' || p.perf.level === 'gelistirilmeli').sort((a, b) => (a.perf.rate ?? 1) - (b.perf.rate ?? 1)).slice(0, 2);
  if (weak.length) {
    const w = weak[0];
    const subs = w.subs.filter(s => s.perf.n >= MIN_EVIDENCE && s.perf.level !== 'iyi' && s.perf.level !== 'guclu').map(s => s.name);
    return { unitIds: weak.map(x => x.unitId), kind: 'eksik_tamamlama', count: 15,
      text: `${weak.map(x => x.name).join(' ve ')} konusunda zorlanıyor (başarı %${Math.round((w.perf.rate ?? 0) * 100)}, ${w.perf.n} soru${subs.length ? '; özellikle ' + subs.join(', ') : ''}). Adaptif düzeyde 15 soruluk eksik tamamlama çalışması önerilir.` };
  }
  const noData = perf.filter(p => p.perf.level === 'veri_yok');
  if (noData.length === perf.length) return null;
  const rep = perf.filter(p => p.perf.level === 'tekrar');
  if (rep.length) return { unitIds: rep.map(x => x.unitId), kind: 'pekistirme', count: 10, text: `${rep.map(x => x.name).join(', ')} konularında tekrar gerekli; 10 soruluk pekiştirme testi önerilir.` };
  return { unitIds: [], kind: 'zorlayici', count: 10, text: 'Ölçülen konularda başarı yüksek; zorlayıcı sorularla ilerletmek için 10 soruluk çalışma önerilir.' };
}

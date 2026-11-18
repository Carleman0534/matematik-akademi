// Soru havuzu: etiketler, görsel benzerlik ve PDF'ler arası konu analizi (saf fonksiyonlar → logic.test.ts)

export const DIFFICULTY_LEVELS: Record<number, string> = { 1: 'Başlangıç', 2: 'Kolay', 3: 'Orta', 4: 'Zor', 5: 'İleri düzey' };
export const QUESTION_TYPES: Record<string, string> = {
  temel_islem: 'Temel işlem', kavramsal: 'Kavramsal yorum', problem: 'Problem çözme', yeni_nesil: 'Yeni nesil',
  gunluk_yasam: 'Günlük yaşam problemi', tablo_grafik: 'Tablo ve grafik yorumlama', gorsel_geometrik: 'Görsel ve geometrik yorumlama',
  cok_asamali: 'Çok aşamalı akıl yürütme',
};
export const POOL_STATUS: Record<string, string> = { draft: 'İnceleme bekliyor', approved: 'Onaylandı', archived: 'Arşivlendi', rejected: 'Reddedildi' };
export const ANALYSIS_STATUS: Record<string, string> = { none: 'Analiz edilmedi', pending: 'Bekliyor', processing: 'İşleniyor', review: 'Öğretmen onayı bekliyor', done: 'Tamamlandı', error: 'Hata oluştu' };

// ---- Görsel parmak izi (fark karması, dHash) ----
// gray: (size+1) x size gri tonlu piksel (satır satır). Her satırda komşu pikselleri karşılaştırır → size*size bit → hex
export function dhashHex(gray: ArrayLike<number>, size = 16): string {
  let hex = '', nib = 0, bits = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * (size + 1) + x;
      nib = (nib << 1) | (gray[i] > gray[i + 1] ? 1 : 0);
      if (++bits === 4) { hex += nib.toString(16); nib = 0; bits = 0; }
    }
  }
  return hex;
}

export function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

// Yeni soruların her biri için (varsa) en benzer önceki soru. 256 bitte ≤ 20 fark ≈ aynı soru (yeniden basım, farklı tarama)
export const DUPLICATE_BITS = 20;
export function findDuplicates(items: { id: string; hash: string | null }[], existing: { id: string; hash: string | null }[], maxBits = DUPLICATE_BITS): Map<string, string> {
  const out = new Map<string, string>();
  const pool = existing.filter(e => e.hash);
  items.forEach((it, idx) => {
    if (!it.hash) return;
    let best: { id: string; d: number } | null = null;
    for (const e of [...pool, ...items.slice(0, idx).filter(x => x.hash) as { id: string; hash: string }[]]) {
      if (e.id === it.id) continue;
      const d = hamming(it.hash, e.hash as string);
      if (d <= maxBits && (!best || d < best.d)) best = { id: e.id, d };
    }
    if (best) out.set(it.id, best.id);
  });
  return out;
}

// ---- PDF'ler arası konu analizi ----
export interface PoolRow { id: string; pdf_id: string | null; topic_id: string | null; question_type: string | null; difficulty: number | null; has_visual: boolean | null; duplicate_of: string | null; extra?: string[] }
export interface UnitTopic { id: string; name: string; parent_id: string | null }
export interface UnitAnalysis {
  unitId: string; name: string; total: number; unique: number; bySource: Map<string, number>;
  subtopics: { id: string; name: string; count: number }[]; covered: number;
  types: Map<string, number>; difficulty: number[]; visual: number; duplicates: number; warnings: string[];
}

const GEOMETRY = /üçgen|eşlik|benzerlik|dönüşüm|geometri|cisim|açı|çokgen|çember|daire|prizma/i;

// units: incelenecek üniteler (ör. LGS'nin 12 ünitesi); topics: bütün konu ağacı (alt konuları bulmak için)
export function analyzeUnits(rows: PoolRow[], units: UnitTopic[], topics: UnitTopic[]): UnitAnalysis[] {
  const parent = new Map(topics.map(t => [t.id, t.parent_id]));
  const unitOf = (id: string | null) => { let cur = id; for (let i = 0; cur && i < 20; i++) { if (units.some(u => u.id === cur)) return cur; cur = parent.get(cur) ?? null; } return null; };
  const childOf = (unitId: string, id: string | null) => { let cur = id; for (let i = 0; cur && i < 20; i++) { if (parent.get(cur) === unitId) return cur; cur = parent.get(cur) ?? null; } return null; };
  return units.map(u => {
    const mine = rows.filter(r => unitOf(r.topic_id) === u.id || (r.extra || []).some(t => unitOf(t) === u.id));
    const subs = topics.filter(t => t.parent_id === u.id).map(t => ({ id: t.id, name: t.name, count: mine.filter(r => childOf(u.id, r.topic_id) === t.id || (r.extra || []).some(e => childOf(u.id, e) === t.id)).length }));
    const bySource = new Map<string, number>();
    const types = new Map<string, number>();
    const difficulty = [0, 0, 0, 0, 0];
    let visual = 0, duplicates = 0;
    for (const r of mine) {
      bySource.set(r.pdf_id || '', (bySource.get(r.pdf_id || '') || 0) + 1);
      if (r.question_type) types.set(r.question_type, (types.get(r.question_type) || 0) + 1);
      if (r.difficulty && r.difficulty >= 1 && r.difficulty <= 5) difficulty[r.difficulty - 1]++;
      if (r.has_visual || r.question_type === 'gorsel_geometrik') visual++;
      if (r.duplicate_of) duplicates++;
    }
    const total = mine.length, unique = total - duplicates, covered = subs.filter(s => s.count > 0).length;
    const warnings: string[] = [];
    if (total === 0) warnings.push('Kaynaklarda bu üniteden soru yok.');
    else {
      if (unique < 5) warnings.push(`Soru sayısı az (${unique} farklı soru).`);
      if (unique >= 5 && types.size > 0 && types.size < 3) warnings.push('Soru sayısı yeterli ancak farklı soru tipleri sınırlı.');
      if (subs.length && covered < subs.length) warnings.push(`Hiç sorusu olmayan alt konular: ${subs.filter(s => !s.count).map(s => s.name).join(', ')}.`);
      if (GEOMETRY.test(u.name) && visual === 0) warnings.push('Görsel / geometrik yorumlama sorusu yok.');
      if (!types.get('yeni_nesil') && unique >= 5) warnings.push('Yeni nesil soru çeşitliliği artırılabilir.');
      if (duplicates && duplicates / total >= 0.2) warnings.push(`Soruların bir kısmı birbirine çok benziyor (${duplicates} benzer).`);
      const hard = difficulty[3] + difficulty[4], rated = difficulty.reduce((a, b) => a + b, 0);
      if (rated >= 5 && hard === 0) warnings.push('Zor / ileri düzey soru yok.');
    }
    return { unitId: u.id, name: u.name, total, unique, bySource, subtopics: subs, covered, types, difficulty, visual, duplicates, warnings };
  });
}

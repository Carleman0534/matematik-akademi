// Deneme puanlama ve analiz kuralları (sunucu ve istemci ortak, saf fonksiyonlar → logic.test.ts)

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';
export type Mark = 'D' | 'Y' | 'B' | 'I'; // doğru / yanlış / boş / iptal
export interface KeyRow { question_no: number; correct: Letter | null; topic_id: string | null; page_no: number | null }
export interface ExamCfg { question_count: number; option_count: number; penalty_divisor: number }
export interface ExamTiming {
  status: 'draft' | 'published' | 'closed'; mode: 'live' | 'assignment';
  started_at: string | null; opens_at: string | null; closes_at: string | null; duration_min: number;
}
export type Phase = 'taslak' | 'bekliyor' | 'canli' | 'acilacak' | 'acik' | 'bitti';

export const PHASE_LABEL: Record<Phase, string> = {
  taslak: 'Taslak', bekliyor: 'Başlaması bekleniyor', canli: 'Canlı', acilacak: 'Henüz açılmadı', acik: 'Açık', bitti: 'Bitti',
};
export const MODE_LABEL = { live: 'Canlı oturum', assignment: 'Süreli ödev' } as const;
export const RESULTS_LABEL = { after_close: 'Deneme bitince', after_submit: 'Teslim edince', never: 'Öğrenciye gösterilmez' } as const;

export const letters = (optionCount: number): Letter[] => (optionCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']);
const isLetter = (c: string): c is Letter => /^[A-E]$/.test(c);

// Veritabanının cevap matrisi metni ("AB-D…", '-' = boş) → dizi
export function parseAnswers(s: string | null | undefined, n: number): (Letter | null)[] {
  const out: (Letter | null)[] = [];
  for (let i = 0; i < n; i++) { const c = (s || '')[i] || '-'; out.push(isLetter(c) ? c : null); }
  return out;
}

// Hızlı cevap anahtarı girişi: "ABCDE ABCDE" ya da "1A 2B" değil, sırayla harfler; '-', '*', 'X' ya da '0' = iptal
export function parseKeyString(raw: string, n: number): (Letter | null)[] | string {
  const chars = String(raw || '').toLocaleUpperCase('tr').replace(/[\s,;.]/g, '').split('');
  if (!chars.length) return 'Cevap anahtarını yazın (ör. ABCDA…).';
  const bad = chars.find(c => !isLetter(c) && !'-*X0'.includes(c));
  if (bad) return `"${bad}" geçersiz. Yalnızca A–E harfleri ve iptal için - kullanın.`;
  if (chars.length > n) return `${chars.length} cevap yazdınız; denemede ${n} soru var.`;
  return Array.from({ length: n }, (_, i) => { const c = chars[i]; return c && isLetter(c) ? c : null; });
}

export function markOf(answer: Letter | null, correct: Letter | null | undefined): Mark {
  if (!correct) return 'I';
  if (!answer) return 'B';
  return answer === correct ? 'D' : 'Y';
}

export interface SheetScore { correct: number; wrong: number; blank: number; cancelled: number; scored: number; net: number; pct: number; marks: Mark[] }

export function scoreSheet(answers: (Letter | null)[], key: Map<number, KeyRow>, cfg: ExamCfg): SheetScore {
  const marks: Mark[] = [];
  let correct = 0, wrong = 0, blank = 0, cancelled = 0;
  for (let q = 1; q <= cfg.question_count; q++) {
    const m = markOf(answers[q - 1] ?? null, key.get(q)?.correct);
    marks.push(m);
    if (m === 'D') correct++; else if (m === 'Y') wrong++; else if (m === 'B') blank++; else cancelled++;
  }
  const scored = cfg.question_count - cancelled;
  const net = Math.round((cfg.penalty_divisor > 0 ? correct - wrong / cfg.penalty_divisor : correct) * 100) / 100;
  return { correct, wrong, blank, cancelled, scored, net, pct: scored ? Math.max(0, net) / scored : 0, marks };
}

export interface QuestionStat { no: number; correct: Letter | null; topic_id: string | null; page_no: number | null; nCorrect: number; nWrong: number; nBlank: number; dist: Record<Letter, number>; rate: number | null; topWrong: Letter | null }

// Soru bazlı: kaç kişi doğru/yanlış/boş, hangi şık kaç kez seçildi, en çok seçilen yanlış şık (çeldirici)
export function questionStats(sheets: (Letter | null)[][], key: Map<number, KeyRow>, cfg: ExamCfg): QuestionStat[] {
  const out: QuestionStat[] = [];
  for (let q = 1; q <= cfg.question_count; q++) {
    const k = key.get(q);
    const dist: Record<Letter, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let nCorrect = 0, nWrong = 0, nBlank = 0;
    for (const s of sheets) {
      const a = s[q - 1] ?? null;
      if (a) dist[a]++;
      const m = markOf(a, k?.correct);
      if (m === 'D') nCorrect++; else if (m === 'Y') nWrong++; else if (m === 'B') nBlank++;
    }
    let topWrong: Letter | null = null;
    for (const l of letters(cfg.option_count)) if (l !== k?.correct && dist[l] > 0 && (!topWrong || dist[l] > dist[topWrong])) topWrong = l;
    const n = nCorrect + nWrong + nBlank;
    out.push({ no: q, correct: k?.correct ?? null, topic_id: k?.topic_id ?? null, page_no: k?.page_no ?? null, nCorrect, nWrong, nBlank, dist, rate: k?.correct && n ? nCorrect / n : null, topWrong });
  }
  return out;
}

export interface TopicStat { topic_id: string | null; total: number; correct: number; wrong: number; blank: number; rate: number }

// Konu bazlı başarı (iptal edilen sorular sayılmaz); en düşük başarıdan yükseğe sıralı
export function topicStats(sheets: (Letter | null)[][], key: Map<number, KeyRow>, cfg: ExamCfg): TopicStat[] {
  const m = new Map<string, TopicStat>();
  for (const s of sheets) {
    for (let q = 1; q <= cfg.question_count; q++) {
      const k = key.get(q);
      if (!k?.correct) continue;
      const id = k.topic_id || '';
      const t = m.get(id) || { topic_id: k.topic_id, total: 0, correct: 0, wrong: 0, blank: 0, rate: 0 };
      const mk = markOf(s[q - 1] ?? null, k.correct);
      t.total++;
      if (mk === 'D') t.correct++; else if (mk === 'Y') t.wrong++; else t.blank++;
      m.set(id, t);
    }
  }
  return [...m.values()].map(t => ({ ...t, rate: t.total ? t.correct / t.total : 0 })).sort((a, b) => a.rate - b.rate || b.total - a.total);
}

// Denemenin şu anki aşaması (öğretmen ve öğrenci ekranları için)
export function examPhase(e: ExamTiming, now: number = Date.now()): Phase {
  if (e.status === 'draft') return 'taslak';
  if (e.status === 'closed') return 'bitti';
  if (e.mode === 'live') {
    if (!e.started_at) return 'bekliyor';
    return now > Date.parse(e.started_at) + (e.duration_min + 2) * 60000 ? 'bitti' : 'canli';
  }
  if (e.closes_at && now > Date.parse(e.closes_at)) return 'bitti';
  if (e.opens_at && now < Date.parse(e.opens_at)) return 'acilacak';
  return 'acik';
}

export const fmtNet = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

// Kalan süre: "1:05:09" ya da "04:59"
export function fmtRemaining(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// Sınıf ve davet kodları: karışan harfler (O/0, I/1) yok
export function makeCode(len = 8, rand: (n: number) => number = n => Math.floor(Math.random() * n)): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => A[rand(A.length)]).join('');
}
export const normalizeCode = (s: string): string => String(s || '').toLocaleUpperCase('tr').replace(/[^A-Z0-9]/g, '');

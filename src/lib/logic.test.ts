// Saf mantık testleri (Node'un yerleşik test aracıyla): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestion, summarize, dayKey, type Attempt } from './learning.ts';
import { normalizeUsername, validateUsername, loginIdToEmail, usernameToEmail } from './usernames.ts';
import { buildTree, descendantIds, topicPath, flattenForSelect, type Topic } from './topics.ts';
import { parseFilters, filtersToQuery, matchesComputed, sanitizeSearch } from './filters.ts';

const at = (d: string, result: Attempt['result'], attempt_type = 'review'): Attempt => ({ result, attempt_type, attempted_at: d + 'T10:00:00Z' });
const NOW = new Date('2026-11-20T09:00:00Z');

test('yeni eklenen soru: tekrar yok, 2 günden yeni', () => {
  const a = analyzeQuestion('2026-11-19T10:00:00Z', [at('2026-11-19', 'incorrect', 'initial')], NOW);
  assert.equal(a.status, 'yeni'); assert.equal(a.wrongCount, 1); assert.equal(a.reviewCount, 0);
  assert.equal(a.due, true); // ertesi gün tekrar
});
test('uzun süredir tekrar edilmemiş soru', () => {
  const a = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'blank', 'initial')], NOW);
  assert.equal(a.status, 'tekrar_bekliyor'); assert.equal(a.blankCount, 1); assert.equal(a.wrongCount, 0);
});
test('tek doğru çözüm "öğrenildi" sayılmaz', () => {
  const a = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-18', 'correct')], NOW);
  assert.equal(a.status, 'tekrar_dogru'); assert.equal(a.correctStreakDays, 1);
  assert.equal(dayKey(a.nextReviewAt), '2026-11-21'); assert.equal(a.due, false); // 3 gün sonra
});
test('aynı gün iki doğru tek gün sayılır', () => {
  const a = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-18', 'correct'), { result: 'correct', attempt_type: 'review', attempted_at: '2026-11-18T15:00:00Z' }], NOW);
  assert.equal(a.status, 'tekrar_dogru'); assert.equal(a.correctStreakDays, 1);
});
test('farklı günlerde iki doğru → öğrenildi; yanlış diziyi sıfırlar', () => {
  const ok = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-10', 'correct'), at('2026-11-15', 'correct')], NOW);
  assert.equal(ok.status, 'ogrenildi');
  const reset = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-10', 'correct'), at('2026-11-12', 'incorrect'), at('2026-11-15', 'correct')], NOW);
  assert.equal(reset.status, 'tekrar_dogru'); assert.equal(reset.wrongCount, 2);
});
test('üç doğru ve en az 14 gün → kalıcı; daha kısa sürede öğrenildi kalır', () => {
  const kal = analyzeQuestion('2026-10-01T10:00:00Z', [at('2026-10-01', 'incorrect', 'initial'), at('2026-10-20', 'correct'), at('2026-10-27', 'correct'), at('2026-11-10', 'correct')], NOW);
  assert.equal(kal.status, 'kalici'); assert.equal(dayKey(kal.nextReviewAt), '2026-11-24');
  const kisa = analyzeQuestion('2026-10-01T10:00:00Z', [at('2026-10-01', 'incorrect', 'initial'), at('2026-11-10', 'correct'), at('2026-11-12', 'correct'), at('2026-11-14', 'correct')], NOW);
  assert.equal(kisa.status, 'ogrenildi');
});
test('tekrar yanlış yapılan soru ertesi gün yeniden sorulur', () => {
  const a = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-18', 'blank')], NOW);
  assert.equal(a.status, 'tekrar_yanlis'); assert.equal(dayKey(a.nextReviewAt), '2026-11-19'); assert.equal(a.due, true);
});
test('gün sınırı Türkiye saatine göre', () => {
  assert.equal(dayKey('2026-11-19T22:30:00Z'), '2026-11-20'); // TR 01:30
});
test('banka özeti: arşivlenenler sayılmaz, tekrar başarı oranı', () => {
  const s = summarize([
    { initial_status: 'wrong', created_at: '2026-11-19T10:00:00Z', question_attempts: [at('2026-11-19', 'incorrect', 'initial')] },
    { initial_status: 'blank', created_at: '2026-11-01T10:00:00Z', question_attempts: [at('2026-11-01', 'blank', 'initial'), at('2026-11-10', 'correct'), at('2026-11-15', 'correct')] },
    { initial_status: 'wrong', created_at: '2026-11-01T10:00:00Z', question_attempts: [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-18', 'incorrect')] },
    { initial_status: 'wrong', created_at: '2026-11-01T10:00:00Z', archived_at: '2026-11-02T00:00:00Z', question_attempts: [] },
  ], NOW);
  assert.equal(s.total, 3); assert.equal(s.wrong, 2); assert.equal(s.blank, 1);
  assert.equal(s.waiting, 1); assert.equal(s.reviewedWrong, 1); assert.equal(s.learned, 1);
  assert.equal(s.reviewSuccess, 2 / 3);
});

test('kullanıcı adı: Türkçe karakter ve boşluk dönüştürülür', () => {
  assert.equal(normalizeUsername(' Ayşe  Yılmaz '), 'ayse.yilmaz');
  assert.equal(normalizeUsername('ÇAĞRI_Ünal-2'), 'cagri_unal-2');
  assert.equal(normalizeUsername('..ali..'), 'ali');
  assert.equal(validateUsername('al'), 'Kullanıcı adı en az 3 karakter olmalı.');
  assert.equal(validateUsername('ayse.yilmaz'), null);
});
test('giriş: e-posta olduğu gibi, kullanıcı adı iç adrese çevrilir', () => {
  assert.equal(loginIdToEmail('Ogretmen@Ornek.com'), 'ogretmen@ornek.com');
  assert.equal(loginIdToEmail('Ayşe Yılmaz', 'ogr.test'), 'ayse.yilmaz@ogr.test');
  assert.equal(usernameToEmail('ali', 'x.y'), 'ali@x.y');
});

const T = (id: string, parent_id: string | null, name: string, grade: number | null, sort = 0): Topic => ({ id, parent_id, name, grade_level: grade, sort_order: sort });
const topics = [T('u2', null, 'Fonksiyonlar', 10, 2), T('u1', null, 'Mantık', 9, 1), T('k1', 'u2', 'Bileşke fonksiyon', 10, 2), T('k0', 'u2', 'Fonksiyon kavramı', 10, 1), T('a1', 'k1', 'Bileşke problemleri', 10, 1)];
test('konu ağacı: sıralama, alt konular, yol', () => {
  const tree = buildTree(topics);
  assert.deepEqual(tree.map(t => t.name), ['Mantık', 'Fonksiyonlar']);
  assert.deepEqual(tree[1].children.map(t => t.name), ['Fonksiyon kavramı', 'Bileşke fonksiyon']);
  assert.deepEqual(descendantIds(topics, 'u2').sort(), ['a1', 'k0', 'k1', 'u2']);
  assert.deepEqual(descendantIds(topics, 'yok'), []);
  assert.equal(topicPath(topics, 'a1'), 'Fonksiyonlar › Bileşke fonksiyon › Bileşke problemleri');
  assert.deepEqual(flattenForSelect(tree).map(x => x.depth), [0, 0, 1, 1, 2]);
});

test('filtreler: geçersiz değerler yok sayılır, adres çubuğuna geri yazılır', () => {
  const f = parseFilters({ durum: 'wrong', ogrenme: 'hack', zorluk: 'hard', konu: 'not-a-uuid', baslangic: '2026-10-01', bitis: 'dün', minYanlis: '2', arsiv: '1' });
  assert.equal(f.durum, 'wrong'); assert.equal(f.ogrenme, ''); assert.equal(f.konu, ''); assert.equal(f.bitis, '');
  assert.equal(f.minYanlis, 2); assert.equal(f.arsiv, true);
  assert.equal(filtersToQuery({ durum: 'wrong', q: '', minYanlis: 2, arsiv: false }), 'durum=wrong&minYanlis=2');
  assert.equal(sanitizeSearch('a,b(c)%d'), 'a b c d');
});
test('hesaplanan filtreler: en az 2 yanlış, bugün tekrar, öğrenilenler', () => {
  const twice = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-18', 'incorrect')], NOW);
  const once = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial')], NOW);
  const f = parseFilters({ minYanlis: '2' });
  assert.equal(matchesComputed(f, twice), true); assert.equal(matchesComputed(f, once), false);
  assert.equal(matchesComputed(parseFilters({ ogrenme: 'due' }), twice), true);
  const learned = analyzeQuestion('2026-11-01T10:00:00Z', [at('2026-11-01', 'incorrect', 'initial'), at('2026-11-10', 'correct'), at('2026-11-15', 'correct')], NOW);
  assert.equal(matchesComputed(parseFilters({ ogrenme: 'learned' }), learned), true);
  assert.equal(matchesComputed(parseFilters({ ogrenme: 'learned' }), twice), false);
});

// ============ Deneme puanlama ============
import { parseAnswers, parseKeyString, scoreSheet, questionStats, topicStats, examPhase, fmtRemaining, makeCode, normalizeCode, type KeyRow, type Letter } from './exams.ts';

const keyMap = (s: string, topics: (string | null)[] = []): Map<number, KeyRow> =>
  new Map(s.split('').map((c, i) => [i + 1, { question_no: i + 1, correct: c === '-' ? null : c as Letter, topic_id: topics[i] ?? null, page_no: null }]));
const CFG = { question_count: 5, option_count: 5, penalty_divisor: 4 };

test('cevap matrisi metni ve hızlı anahtar girişi', () => {
  assert.deepEqual(parseAnswers('AB-D', 5), ['A', 'B', null, 'D', null]);
  assert.deepEqual(parseKeyString('ab c-d', 5), ['A', 'B', 'C', null, 'D']);
  assert.deepEqual(parseKeyString('AB', 4), ['A', 'B', null, null]);
  assert.match(String(parseKeyString('ABZ', 5)), /geçersiz/);
  assert.match(String(parseKeyString('ABCDEA', 5)), /5 soru/);
});

test('net: 4 yanlış 1 doğruyu götürür, iptal edilen soru sayılmaz', () => {
  const s = scoreSheet(parseAnswers('ABCE-', 5), keyMap('ABCD-'), CFG); // 3 D, 1 Y, son soru iptal
  assert.deepEqual([s.correct, s.wrong, s.blank, s.cancelled, s.scored], [3, 1, 0, 1, 4]);
  assert.equal(s.net, 2.75);
  assert.deepEqual(s.marks, ['D', 'D', 'D', 'Y', 'I']);
  assert.equal(scoreSheet(parseAnswers('ABCE-', 5), keyMap('ABCD-'), { ...CFG, penalty_divisor: 0 }).net, 3);
  assert.equal(scoreSheet(parseAnswers('EEEE-', 5), keyMap('ABCD-'), CFG).pct, 0); // negatif net yüzdeyi eksiye düşürmez
});

test('soru ve konu analizi: çeldirici ve en zayıf konu', () => {
  const key = keyMap('AB', ['t1', 't2']);
  const cfg = { question_count: 2, option_count: 5, penalty_divisor: 4 };
  const sheets = [parseAnswers('AC', 2), parseAnswers('BC', 2), parseAnswers('A-', 2)];
  const qs = questionStats(sheets, key, cfg);
  assert.deepEqual([qs[0].nCorrect, qs[0].nWrong, qs[0].nBlank], [2, 1, 0]);
  assert.equal(qs[1].topWrong, 'C'); assert.equal(qs[1].dist.C, 2); assert.equal(qs[1].rate, 0);
  const ts = topicStats(sheets, key, cfg);
  assert.equal(ts[0].topic_id, 't2'); assert.equal(ts[0].correct, 0); assert.equal(ts[0].blank, 1);
  assert.equal(ts[1].rate, 2 / 3);
});

test('deneme aşaması', () => {
  const base = { status: 'published' as const, started_at: null, opens_at: null, closes_at: null, duration_min: 40 };
  const now = Date.parse('2026-11-20T10:00:00Z');
  assert.equal(examPhase({ ...base, status: 'draft', mode: 'live' }, now), 'taslak');
  assert.equal(examPhase({ ...base, mode: 'live' }, now), 'bekliyor');
  assert.equal(examPhase({ ...base, mode: 'live', started_at: '2026-11-20T09:30:00Z' }, now), 'canli');
  assert.equal(examPhase({ ...base, mode: 'live', started_at: '2026-11-20T09:10:00Z' }, now), 'bitti');
  assert.equal(examPhase({ ...base, mode: 'assignment', opens_at: '2026-11-21T00:00:00Z' }, now), 'acilacak');
  assert.equal(examPhase({ ...base, mode: 'assignment', closes_at: '2026-11-19T00:00:00Z' }, now), 'bitti');
  assert.equal(examPhase({ ...base, mode: 'assignment', closes_at: '2026-11-21T00:00:00Z' }, now), 'acik');
  assert.equal(examPhase({ ...base, status: 'closed', mode: 'assignment' }, now), 'bitti');
});

test('süre biçimi ve kodlar', () => {
  assert.equal(fmtRemaining(299_000), '04:59');
  assert.equal(fmtRemaining(3_909_000), '1:05:09');
  assert.equal(fmtRemaining(-5), '00:00');
  assert.match(makeCode(8), /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(normalizeCode(' ab-12 cd '), 'AB12CD');
});

// ============ PDF'ten otomatik soru bulma ============
import { findQuestionMarkers, detectSection, findFooterTop, layoutBoxes, lastInkRow, segmentByGaps, parseAnswerKey, type TItem } from './questionDetect.ts';

const W = 595, H = 842;
const t = (str: string, x: number, y: number, h = 10, w = str.length * 5): TItem => ({ str, x, y, w, h });
const body = (y: number, x = 80) => t('Bir kenarının uzunluğu olan eşkenar üçgenin', x, y, 10, 200);

test('soru numaraları: büyük yazılı numaralar alınır, uyarı listesi ve cevap anahtarı alınmaz', () => {
  const page = [t('MATEMATİK', 250, 100, 11), t('1.', 52, 160, 13, 10), body(161), body(180), t('2.', 52, 450, 13, 10), body(451),
    t('3.', 300, 160, 13, 10), body(161, 320), t('1. Bu testte 20 soru vardır.', 60, 130, 9, 150), body(600), body(620)];
  const ms = findQuestionMarkers(page, W, H);
  assert.deepEqual(ms.map(m => m.n), [1, 2, 3]);
  const cover = [t('1.', 60, 500, 10, 10), t('Salon yoklama listesinde belirtilen sınıfta', 80, 500, 10, 200), body(520), body(540)];
  assert.equal(findQuestionMarkers(cover, W, H).length, 0);
  const keyPage = [t('CEVAP ANAHTARI', 200, 60, 12), t('1.', 160, 120, 13, 10), t('D', 185, 121, 9, 6)];
  assert.equal(findQuestionMarkers(keyPage, W, H).length, 0);
});

test('bölüm, alt bilgi ve iki sütunlu kutular', () => {
  assert.equal(detectSection([t('FEN BİLİMLERİ', 100, 60, 11)], H), 'Fen Bilimleri');
  assert.equal(detectSection([t('MATEMATİK', 100, 400, 11)], H), null); // sayfa ortasında değil, başlıkta aranır
  const foot = findFooterTop([t('TEST BİTTİ.', 400, 700, 9), t('30', 290, 800, 9, 10)], W, H);
  assert.equal(foot, 700);
  assert.equal(findFooterTop([t('MATEMATİK TESTİ BİTTİ.', 400, 720, 9), t('FEN BİLİMLERİ TESTİNE GEÇİNİZ.', 400, 735, 9)], W, H), 720);
  const boxes = layoutBoxes([{ n: 1, x: 52, y: 160, h: 13 }, { n: 2, x: 52, y: 450, h: 13 }, { n: 3, x: 300, y: 160, h: 13 }], W, H, 780);
  assert.equal(boxes.length, 3);
  const [b1, b2, b3] = [1, 2, 3].map(n => boxes.find(b => b.n === n)!);
  assert.ok(b1.y + b1.h <= 450 && b2.y + b2.h <= 780);     // 1. soru 2.'nin başında biter
  assert.ok(b1.x + b1.w < W / 2 && b3.x > W / 2 - 15);      // sütunlar ayrı
  const one = layoutBoxes([{ n: 5, x: 60, y: 90, h: 13 }], W, H, 780);
  assert.ok(one[0].w > W * 0.7);                           // tek sütunlu sayfa tam genişlik
});

test('boşluk kırpma ve taranmış sayfayı boşluklardan bölme', () => {
  assert.equal(lastInkRow([0, 5, 9, 0, 0, 1, 0], 2), 2);
  assert.equal(lastInkRow([0, 0, 1], 2), -1);
  const rows = [...Array(10).fill(9), ...Array(30).fill(0), ...Array(20).fill(9), ...Array(30).fill(0), 9, ...Array(5).fill(0)];
  assert.deepEqual(segmentByGaps(rows, 2, 15, 5), [[0, 10], [40, 60]]); // en alttaki tek satırlık parça (sayfa no) atılır
});

test('cevap anahtarı: bölüm sütunlarına göre', () => {
  const page = [t('“A” KİTAPÇIĞI CEVAP ANAHTARI', 150, 60, 12), t('MATEMATİK', 160, 100, 12), t('FEN BİLİMLERİ', 300, 100, 12),
    t('1.', 170, 130, 12, 10), t('D', 190, 131, 9, 6), t('2.', 170, 150, 12, 10), t('C', 190, 151, 9, 6),
    t('1.', 330, 130, 12, 10), t('A', 350, 131, 9, 6)];
  const k = parseAnswerKey(page);
  assert.equal(k.get('Matematik|1'), 'D'); assert.equal(k.get('Matematik|2'), 'C'); assert.equal(k.get('Fen Bilimleri|1'), 'A');
});

// ============ Müfredat: pasif konular, ünite, kazanım zinciri ============
import { activeOnly, rootOf, ancestorIds } from './topics.ts';
import { topicOptions } from './topicOptions.ts';
import { gradeLabel } from './labels.ts';

test('pasif konu ve altındakiler seçim listesinden çıkar; ünite ve üst konular bulunur', () => {
  const flat: Topic[] = [
    { id: 'u', parent_id: null, name: 'Çarpanlar ve Katlar', grade_level: 8, sort_order: 1 },
    { id: 'a', parent_id: 'u', name: 'EBOB', grade_level: 8, sort_order: 1 },
    { id: 'b', parent_id: 'u', name: 'EKOK', grade_level: 8, sort_order: 2, is_active: false },
    { id: 'b1', parent_id: 'b', name: 'EKOK problemleri', grade_level: 8, sort_order: 1 },
  ];
  assert.deepEqual(activeOnly(flat).map(t => t.id), ['u', 'a']);
  assert.deepEqual(topicOptions(flat).map(o => o.id), ['u', 'a']);
  assert.equal(rootOf(flat, 'b1'), 'u');
  assert.deepEqual(ancestorIds(flat, 'b1'), ['b1', 'b', 'u']);
  assert.equal(gradeLabel(8), '8. sınıf (LGS)'); assert.equal(gradeLabel(10), '10. sınıf');
});

// ============ Soru havuzu: benzerlik ve konu analizi ============
import { dhashHex, hamming, findDuplicates, analyzeUnits } from './pool.ts';

test('görsel parmak izi ve benzer soru bulma', () => {
  const g = Array.from({ length: 17 * 16 }, (_, i) => (i * 37) % 251);
  const h1 = dhashHex(g);
  assert.match(h1, /^[0-9a-f]{64}$/);
  const g2 = g.map((v, i) => (i === 5 ? v + 200 : v));            // küçük fark
  const g3 = g.map(v => 255 - v);                                 // tamamen farklı
  assert.ok(hamming(h1, dhashHex(g2)) <= 2);
  assert.ok(hamming(h1, dhashHex(g3)) > 100);
  const d = findDuplicates([{ id: 'yeni1', hash: dhashHex(g2) }, { id: 'yeni2', hash: dhashHex(g3) }], [{ id: 'eski', hash: h1 }]);
  assert.equal(d.get('yeni1'), 'eski'); assert.equal(d.has('yeni2'), false);
});

test('konu analizi: kaynak dağılımı, alt konu kapsamı ve uyarılar', () => {
  const topics = [
    { id: 'U1', name: 'Çarpanlar ve Katlar', parent_id: null }, { id: 'ebob', name: 'EBOB', parent_id: 'U1' }, { id: 'ekok', name: 'EKOK', parent_id: 'U1' },
    { id: 'U2', name: 'Üçgenler', parent_id: null }, { id: 'pis', name: 'Pisagor bağıntısı', parent_id: 'U2' },
  ];
  const r = (id: string, pdf: string, topic: string, type: string | null, extra: Partial<{ dup: string; diff: number; vis: boolean }> = {}) =>
    ({ id, pdf_id: pdf, topic_id: topic, question_type: type, difficulty: extra.diff ?? 3, has_visual: extra.vis ?? false, duplicate_of: extra.dup ?? null });
  const rows = [r('1', 'p1', 'ebob', 'problem'), r('2', 'p1', 'ebob', 'problem'), r('3', 'p2', 'ebob', 'temel_islem'), r('4', 'p2', 'U1', 'problem'),
    r('5', 'p2', 'ebob', 'problem'), r('6', 'p2', 'ebob', 'problem', { dup: '5' }), r('7', 'p1', 'pis', 'problem')];
  const [u1, u2] = analyzeUnits(rows, topics.filter(t => !t.parent_id), topics);
  assert.equal(u1.total, 6); assert.equal(u1.unique, 5); assert.equal(u1.bySource.get('p2'), 4);
  assert.deepEqual(u1.subtopics.map(s => s.count), [5, 0]);                   // EKOK'ta hiç soru yok
  assert.ok(u1.warnings.some(w => w.includes('soru tipleri sınırlı')));
  assert.ok(u1.warnings.some(w => w.includes('EKOK')));
  assert.ok(u2.warnings.some(w => w.includes('az')) && u2.warnings.some(w => w.includes('Görsel')));
});

// ============ Öğrenci konu profili ve kişiselleştirilmiş seçim ============
import { computePerf, unitPerformance, selectStudy, targetLevels, recommend, type Evidence, type PoolItem } from './studyEngine.ts';

const SNOW = Date.parse('2026-11-20T12:00:00Z');
const sev = (topic: string, ok: boolean | 'blank', d: number | null = 3, daysAgo = 1, type: string | null = null): Evidence =>
  ({ topic_id: topic, result: ok === 'blank' ? 'blank' : ok ? 'correct' : 'incorrect', difficulty: d, type, at: new Date(SNOW - daysAgo * 86400000).toISOString(), source: 'study' });

test('konu profili: az veri, kolay soru sınırı, zorluk ağırlığı ve güven', () => {
  assert.equal(computePerf([sev('a', true), sev('a', true)], SNOW).level, 'veri_yok');                         // 2 soru = yeterli veri yok
  const easyOnly = computePerf(Array.from({ length: 8 }, () => sev('a', true, 1)), SNOW);
  assert.equal(easyOnly.level, 'iyi'); assert.equal(easyOnly.limited, true);                                  // yalnızca kolay doğru → güçlü sayılmaz
  const strong = computePerf([...Array.from({ length: 10 }, () => sev('a', true, 4)), sev('a', false, 3)], SNOW);
  assert.equal(strong.level, 'guclu'); assert.equal(strong.confidence, 'orta');
  const weak = computePerf([sev('a', false), sev('a', 'blank'), sev('a', false), sev('a', true)], SNOW);
  assert.equal(weak.level, 'oncelikli'); assert.deepEqual([weak.correct, weak.wrong, weak.blank], [1, 2, 1]);
  const hardWrong = computePerf([sev('a', true, 1), sev('a', true, 1), sev('a', false, 5), sev('a', false, 5)], SNOW);
  assert.ok((hardWrong.raw as number) < 0.5);   // 2 kolay doğru, 2 zor yanlış: zorluk ağırlığıyla başarı %50'nin altında
  const improving = computePerf([...Array.from({ length: 3 }, () => sev('a', false, 3, 40)), ...Array.from({ length: 3 }, () => sev('a', true, 3, 2))], SNOW);
  assert.ok((improving.trend as number) > 0.9);
});

const stopics = [
  { id: 'U1', parent_id: null, name: 'Çarpanlar ve Katlar', grade_level: 8, sort_order: 1 }, { id: 'ebob', parent_id: 'U1', name: 'EBOB', grade_level: 8, sort_order: 1 },
  { id: 'U2', parent_id: null, name: 'Üslü İfadeler', grade_level: 8, sort_order: 2 }, { id: 'kuv', parent_id: 'U2', name: 'Kuvvetler', grade_level: 8, sort_order: 1 },
];
const sunits = stopics.filter(t => !t.parent_id);
const smk = (n: number, topic: string, prefix: string): PoolItem[] => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, topic_id: topic, difficulty: (i % 5) + 1, question_type: ['problem', 'yeni_nesil', 'temel_islem'][i % 3], pdf_id: i % 2 ? 'p1' : 'p2' }));

test('iki öğrenciye farklı çalışma: zayıf konu ağırlıklı, görülenler ve mükerrerler dışarıda', () => {
  // A: Üslü iyi, Çarpanlar zayıf. B: tersi.
  const evA = [...Array.from({ length: 10 }, () => sev('kuv', true, 3)), ...Array.from({ length: 8 }, (_, i) => sev('ebob', i === 0, 2))];
  const evB = [...Array.from({ length: 10 }, () => sev('ebob', true, 3)), ...Array.from({ length: 8 }, (_, i) => sev('kuv', i === 0, 2))];
  const pool = [...smk(20, 'ebob', 'e'), ...smk(20, 'kuv', 'k')];
  const run = (e: Evidence[], key: string, seen = new Set<string>()) => selectStudy({ studentKey: key, count: 10, kind: 'karma', unitIds: [], perf: unitPerformance(e, stopics, sunits, SNOW), pool, topics: stopics, seen });
  const a = run(evA, 'A'), b = run(evB, 'B');
  const inUnit = (r: ReturnType<typeof run>, u: string) => r.items.filter(i => i.unitId === u).length;
  assert.equal(a.items.length, 10); assert.ok(inUnit(a, 'U1') > inUnit(a, 'U2'));                            // A: Çarpanlar ağırlıklı
  assert.ok(inUnit(b, 'U2') > inUnit(b, 'U1'));                                                              // B: Üslü ağırlıklı
  assert.ok(a.items.every(i => i.reason.includes('başarı') || i.reason.includes('veri')));
  const diffs = a.items.map(i => i.difficulty ?? 3); assert.deepEqual(diffs, [...diffs].sort((x, y) => x - y)); // kolaydan zora
  const seen = new Set(a.items.map(i => i.id));
  const again = run(evA, 'A', seen);
  assert.equal(again.items.filter(i => seen.has(i.id)).length, 0);                                           // aynı soru tekrar verilmez
  assert.ok(again.notes.some(n => n.includes('dışarıda')));
  assert.equal(new Set(a.items.map(i => i.id)).size, a.items.length);
});

test('hedef zorluk uyarlanır; konu seçilince yalnızca o konu; yetersiz havuz uyarılır', () => {
  const p = (rate: number) => ({ ...computePerf(Array.from({ length: 10 }, (_, i) => sev('a', i < Math.round(rate * 10))), SNOW) });
  assert.deepEqual(targetLevels('karma', p(0.1)), [1, 2]);
  assert.deepEqual(targetLevels('karma', p(0.9)), [4, 5]);
  assert.deepEqual(targetLevels('zorlayici', p(0.1)), [4, 5]);
  const r = selectStudy({ studentKey: 'x', count: 8, kind: 'pekistirme', unitIds: ['U2'], perf: unitPerformance([], stopics, sunits, SNOW), pool: [...smk(20, 'ebob', 'e'), ...smk(3, 'kuv', 'k')], topics: stopics, seen: new Set() });
  assert.equal(r.items.length, 3); assert.ok(r.items.every(i => i.unitId === 'U2'));
  assert.ok(r.notes.some(n => n.includes('Üslü İfadeler') && n.includes('3')) && r.notes.some(n => n.includes('İstenen 8')));
  const empty = selectStudy({ studentKey: 'x', count: 5, kind: 'karma', unitIds: [], perf: unitPerformance([], stopics, sunits, SNOW), pool: [], topics: stopics, seen: new Set() });
  assert.equal(empty.items.length, 0); assert.ok(empty.notes[0].includes('PDF'));
});

test('öğretmen önerisi: en zayıf üniteler ve alt konu', () => {
  const evs = [...Array.from({ length: 8 }, (_, i) => sev('ebob', i === 0, 3)), ...Array.from({ length: 6 }, () => sev('kuv', true, 3))];
  const rec = recommend(unitPerformance(evs, stopics, sunits, SNOW));
  assert.ok(rec && rec.unitIds[0] === 'U1' && rec.kind === 'eksik_tamamlama' && rec.text.includes('EBOB'));
  assert.equal(recommend(unitPerformance([], stopics, sunits, SNOW)), null);
});

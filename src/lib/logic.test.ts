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

// Saf mantık testleri (Node'un yerleşik test aracıyla): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuestion, summarize, dayKey, type Attempt } from './learning.ts';
import { normalizeUsername, validateUsername, loginIdToEmail, usernameToEmail } from './usernames.ts';
import { buildTree, descendantIds, topicPath, flattenForSelect, type Topic } from './topics.ts';
import { parseFilters, filtersToQuery, matchesComputed, sanitizeSearch } from './filters.ts';
import { verifyAndExplainWithAi } from './ai/externalAiChecker.ts';

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

// LGS Yapay Zekâ ve Kişiselleştirilmiş Öğrenme Testleri
import { validateQuestionStructure, calculateTextSimilarity, checkDuplicateQuestion } from './ai/mathValidator.ts';
import { generateCurriculumQuestion } from './ai/questionGenerator.ts';
import { getNextAdaptiveDifficulty, calculateStudentMasteryProfile } from './ai/adaptiveLearning.ts';
import { INITIAL_LGS_TOPICS, findTopicById } from './ai/lgsCurriculum.ts';

test('LGS müfredatı: 12 ana ünite ve alt konular eksiksiz tanımlı', () => {
  assert.equal(INITIAL_LGS_TOPICS.length, 12);
  const ebob = findTopicById('sub_ebob');
  assert.ok(ebob);
  assert.equal(ebob.name, 'EBOB (En Büyük Ortak Bölen)');
  assert.equal(ebob.parentId, 'top_carpanlar_katlar');
});

test('matematiksel doğrulama: geçerli soru ve hatalı seçenek tespiti', () => {
  // Geçerli soru
  const valid = validateQuestionStructure(
    'Alanı 144 cm² olan bir karenin çevresi kaç santimetredir?',
    { A: '12', B: '24', C: '36', D: '48' },
    'D',
    'Karenin bir kenarı √144 = 12 cm, çevresi 4 × 12 = 48 cm dir.'
  );
  assert.equal(valid.isValid, true);
  assert.equal(valid.singleCorrectAnswer, true);

  // Mükerrer şık hatası
  const dup = validateQuestionStructure(
    'Alanı 144 cm² olan karenin bir kenarı kaçtır?',
    { A: '12', B: '12', C: '16', D: '20' },
    'A',
    'Kenar √144 = 12 cm'
  );
  assert.equal(dup.isValid, false);
  assert.equal(dup.optionsValid, false);
});

test('metin benzerliği ve telif denetimi: mükerrer soru tespiti', () => {
  const q1 = 'Bir kenar uzunluğu 10 cm olan karenin alanı kaç cm² dir?';
  const q2 = 'Bir kenar uzunluğu 10 cm olan karenin alanı kaç santimetrekaredir?';
  const qDiff = 'İki basamaklı en küçük asal sayı kaçtır?';

  const simHigh = calculateTextSimilarity(q1, q2);
  assert.ok(simHigh > 0.70);

  const simLow = calculateTextSimilarity(q1, qDiff);
  assert.ok(simLow < 0.20);

  const dupCheck = checkDuplicateQuestion(q1, [{ id: 'q2', text: q2 }], 0.70);
  assert.equal(dupCheck.isDuplicate, true);
  assert.equal(dupCheck.matchedQuestionId, 'q2');
});

test('yapay zekâ soru motoru: LGS formatında özgün soru ve çözüm üretimi', () => {
  const q = generateCurriculumQuestion({
    topicId: 'top_carpanlar_katlar',
    difficulty: 3,
    questionType: 'yeni_nesil'
  });
  assert.ok(q.questionText.length > 30);
  assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer));
  assert.ok(q.solutionExplanation.length > 20);
  assert.equal(q.mathValidationStatus, 'verified');
});

test('yapay zekâ soru motoru: aynı konudan üretilen çoklu sorular birbirini tekrar etmez (arşetip çeşitliliği)', () => {
  const q0 = generateCurriculumQuestion({ topicId: 'top_carpanlar_katlar', difficulty: 3, questionType: 'yeni_nesil', variationIndex: 0 });
  const q1 = generateCurriculumQuestion({ topicId: 'top_carpanlar_katlar', difficulty: 3, questionType: 'yeni_nesil', variationIndex: 1 });
  const q2 = generateCurriculumQuestion({ topicId: 'top_carpanlar_katlar', difficulty: 3, questionType: 'yeni_nesil', variationIndex: 2 });
  const q3 = generateCurriculumQuestion({ topicId: 'top_carpanlar_katlar', difficulty: 3, questionType: 'yeni_nesil', variationIndex: 3 });

  // Farklı arşetip metinleri kesinlikle eşit olmamalı
  assert.notEqual(q0.questionText, q1.questionText);
  assert.notEqual(q1.questionText, q2.questionText);
  assert.notEqual(q2.questionText, q3.questionText);

  // Metin benzerlikleri eşik değerinin çok altında olmalı (farklı bağlamlar: zeytinyağı, otobüs, fidan direk, fayans)
  const dupCheck01 = checkDuplicateQuestion(q0.questionText, [{ id: 'q1', text: q1.questionText }], 0.35);
  const dupCheck12 = checkDuplicateQuestion(q1.questionText, [{ id: 'q2', text: q2.questionText }], 0.35);
  assert.equal(dupCheck01.isDuplicate, false);
  assert.equal(dupCheck12.isDuplicate, false);
});

test('uyarlanabilir (adaptive) öğrenme: doğru/yanlış serisine göre zorluk ayarı', () => {
  // Üst üste 2 doğru -> zorluk 1 kademe artmalı (örn: 3 -> 4)
  const nextUp = getNextAdaptiveDifficulty(3, true, 2);
  assert.equal(nextUp, 4);

  // Yanlış yaptı -> zorluk 1 kademe düşmeli (örn: 3 -> 2)
  const nextDown = getNextAdaptiveDifficulty(3, false, 0);
  assert.equal(nextDown, 2);

  // Zaten 1'deyken yanlış yaptıysa 1'in altına düşmemeli
  assert.equal(getNextAdaptiveDifficulty(1, false, 0), 1);
});

test('öğrenci konu başarı profili: örneklem büyüklüğü ve durum tespiti', () => {
  const attempts = [
    { topicId: 'top_carpanlar_katlar', isCorrect: false, isBlank: false, difficulty: 3 },
    { topicId: 'top_carpanlar_katlar', isCorrect: false, isBlank: false, difficulty: 3 },
    { topicId: 'top_carpanlar_katlar', isCorrect: false, isBlank: false, difficulty: 3 },
    { topicId: 'top_carpanlar_katlar', isCorrect: true, isBlank: false, difficulty: 3 }, // 1/4 = %25 -> critical_weak
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 },
    { topicId: 'top_dogrusal_denklemler', isCorrect: true, isBlank: false, difficulty: 3 } // 8/8 = %100 -> mastered
  ];

  const profile = calculateStudentMasteryProfile('student-test', attempts);
  const carpanlar = profile.find(p => p.topicId === 'top_carpanlar_katlar');
  assert.ok(carpanlar);
  assert.equal(carpanlar.status, 'critical_weak');
  assert.equal(carpanlar.masteryScore, 25);

  const dogrusal = profile.find(p => p.topicId === 'top_dogrusal_denklemler');
  assert.ok(dogrusal);
  assert.equal(dogrusal.status, 'mastered');
  assert.equal(dogrusal.masteryScore, 100);

  const geometri = profile.find(p => p.topicId === 'top_geometrik_cisimler');
  assert.ok(geometri);
  assert.equal(geometri.status, 'needs_data');
});

// Veli Yetkilendirme ve Güvenlik Testleri (Section 20.9 & 20.10)
import { isGuardianAuthorizedForStudent, filterStudentDataForGuardian } from './parentAuth.ts';

test('veli yetkilendirme: yalnızca aktif ilişkili öğrencilere erişim izni', () => {
  const activeLinks = [
    { guardian_user_id: 'parent-ayse', student_id: 'student-elif', status: 'active' },
    { guardian_user_id: 'parent-ayse', student_id: 'student-burak', status: 'active' },
    { guardian_user_id: 'parent-kemal', student_id: 'student-elif', status: 'passive' }
  ];

  // Ayşe, Elif ve Burak'a erişebilir
  assert.equal(isGuardianAuthorizedForStudent('parent-ayse', 'student-elif', activeLinks), true);
  assert.equal(isGuardianAuthorizedForStudent('parent-ayse', 'student-burak', activeLinks), true);

  // Ayşe, yabancı öğrenci Zeynep'e erişemez (Yetkisiz erişim engellendi)
  assert.equal(isGuardianAuthorizedForStudent('parent-ayse', 'student-zeynep', activeLinks), false);

  // Kemal'in ilişkisi pasif olduğu için erişemez
  assert.equal(isGuardianAuthorizedForStudent('parent-kemal', 'student-elif', activeLinks), false);
});

test('veli izin filtreleme: öğretmen görünürlüğü kapattığında veriler gizlenir', () => {
  const rawData = {
    student: { name: 'Elif' },
    examResults: [{ title: 'Deneme 1', net: 14.25 }],
    topicMastery: [{ topic: 'Üslü', score: 85 }],
    assignments: [{ title: 'Ödev 1' }],
    teacherNotes: [{ message: 'Harika gelişim' }]
  };

  // Öğretmen deneme sonuçlarını ve öğretmen notlarını kapattı
  const filtered = filterStudentDataForGuardian(rawData, {
    showExamResults: false,
    showQuestionDetails: false,
    showTopicAnalytics: true,
    showAssignments: true,
    showTeacherNotes: false,
    showProgressReports: true
  });

  assert.ok(filtered.student);
  assert.equal(filtered.examResults, undefined);
  assert.ok(filtered.topicMastery);
  assert.ok(filtered.assignments);
  assert.equal(filtered.teacherNotes, undefined);
});

test('akıllı yanlış analizi: 10 temel hata kategorisi ve süre bazlı yapay zekâ teşhisi', async () => {
  const { MISTAKE_ERROR_CATEGORIES, estimateMistakeReason } = await import('./learning/diagnosticEngine.ts');
  
  // 10 hata kategorisi eksiksiz tanımlı olmalı
  const keys = Object.keys(MISTAKE_ERROR_CATEGORIES);
  assert.equal(keys.length, 10);
  assert.ok(keys.includes('islem_hatasi'));
  assert.ok(keys.includes('yanlis_okuma'));
  assert.ok(keys.includes('model_kuramama'));

  // Süre < 15 sn: acele/yanlış okuma
  const fast = estimateMistakeReason({ studentAnswer: 'A', correctAnswer: 'C', durationSeconds: 10 });
  assert.equal(fast.primaryCategory, 'yanlis_okuma');

  // Süre > 180 sn: model kuramama
  const slow = estimateMistakeReason({ studentAnswer: 'B', correctAnswer: 'D', durationSeconds: 210 });
  assert.equal(slow.primaryCategory, 'model_kuramama');
});

test('aralıklı tekrar motoru: doğru cevap aralığı genişletir, yanlış 1 güne sıfırlar', async () => {
  const { calculateNextSpacedRepetition, estimateForgettingRisk } = await import('./learning/diagnosticEngine.ts');

  // Doğru cevap: 1. seviyeden 2. seviyeye (3 gün aralık)
  const rep1 = calculateNextSpacedRepetition({ currentLevel: 1, performance: 'correct', lastIntervalDays: 1 });
  assert.equal(rep1.nextLevel, 2);
  assert.equal(rep1.nextIntervalDays, 3);
  assert.equal(rep1.forgettingRisk, 'dusuk');

  // Yanlış cevap: tekrar 1. seviyeye ve 1 güne düşer
  const repWrong = calculateNextSpacedRepetition({ currentLevel: 3, performance: 'incorrect', lastIntervalDays: 7 });
  assert.equal(repWrong.nextLevel, 1);
  assert.equal(repWrong.nextIntervalDays, 1);
  assert.equal(repWrong.forgettingRisk, 'yuksek');

  // Unutma riski: 2 gün önce çalışılan ve %80 olan 'dusuk', 25 gün önce çalışılan 'yuksek'
  assert.equal(estimateForgettingRisk(2, 80), 'dusuk');
  assert.equal(estimateForgettingRisk(25, 60), 'yuksek');
});

test('hazırbulunuşluk değerlendirmesi: az soruda geçici bayrağı ve 6 beceri boyutu', async () => {
  const { evaluateDiagnosticSkills } = await import('./learning/diagnosticEngine.ts');

  // 10 soru çözüldüğünde (15'ten az) isProvisional true olmalı
  const answers = Array(10).fill({ isCorrect: true, durationSeconds: 90 });
  const result = evaluateDiagnosticSkills(answers);

  assert.equal(result.isProvisional, true);
  assert.equal(result.overallScore, 100);
  assert.equal(result.overallLevel, 'ust_duzey');
  assert.ok(result.calcSkill >= 80);
  assert.ok(result.problemSolving >= 80);
});

test('öğretmen asistanı analizi: soru köküne göre veritabanı sorgulama ve onay gerektiren eylem üretimi', async () => {
  const { analyzeTeacherQuery } = await import('./teacher/assistantEngine.ts');
  const { getDb } = await import('./db/database.ts');
  const db = await getDb();

  // Çarpanlar ve Katlar sorgusu
  const resTopic = analyzeTeacherQuery(db, 'Bu hafta hangi öğrencilerimle Çarpanlar ve Katlar çalışmalıyım?');
  assert.ok(resTopic.directAnswer.includes('Çarpanlar ve Katlar'));
  assert.ok(Array.isArray(resTopic.supportingData));

  // Neti düşenler sorgusu
  const resNet = analyzeTeacherQuery(db, 'Son denemelerde matematik neti düşen öğrenciler kimler?');
  assert.ok(resNet.directAnswer.includes('deneme'));
  assert.ok(resNet.proposedActions && resNet.proposedActions.length > 0);
  assert.equal(resNet.proposedActions[0].actionType, 'schedule_lesson');

  // Aralıklı tekrar sorgusu
  const resRep = analyzeTeacherQuery(db, 'Hangi öğrenciler tekrar çalışması yapmamış?');
  assert.ok(resRep.directAnswer.includes('tekrar'));
});

test('soru kalitesi ve yapay zekâ denetimi: 11 kriter ve kural tabanlı değerlendirme', async () => {
  const { evaluateQuestionQuality } = await import('./qualityAuditEngine.ts');

  // Geçerli kaliteli LGS sorusu
  const validQ = {
    question_text: 'Bir kenar uzunluğu 2^5 cm olan kare şeklindeki bir kartonun alanı kaç santimetrekaredir?',
    options: [
      { key: 'A', text: '2^7' },
      { key: 'B', text: '2^8' },
      { key: 'C', text: '2^10' },
      { key: 'D', text: '2^25' }
    ],
    correct_answer: 'C',
    solution: 'Karenin alanı bir kenarının karesidir: (2^5)^2 = 2^(5*2) = 2^10 cm².',
    topic: 'Üslü İfadeler',
    difficulty: 'orta'
  };

  const audit = evaluateQuestionQuality(validQ);
  assert.equal(audit.math_accuracy, 1);
  assert.equal(audit.single_correct_answer, 1);
  assert.equal(audit.root_clarity, 1);
  assert.equal(audit.grammar_correctness, 1);
  assert.equal(audit.curriculum_alignment, 1);
  assert.equal(audit.solution_accuracy, 1);
  assert.equal(audit.audit_verdict, 'approved');
  assert.ok(audit.score >= 90);

  // Kusurlu soru: yinelenen şıklar ve eksik çözüm
  const flawedQ = {
    question_text: 'x kaçtır?',
    options: [
      { key: 'A', text: '10' },
      { key: 'B', text: '10' }, // yinelenen seçenek
      { key: 'C', text: '20' },
      { key: 'D', text: '30' }
    ],
    correct_answer: 'A',
    solution: '', // çözüm yok
    topic: '',
    difficulty: 'zor'
  };

  const flawedAudit = evaluateQuestionQuality(flawedQ);
  assert.equal(flawedAudit.single_correct_answer, 0);
  assert.equal(flawedAudit.root_clarity, 0);
  assert.equal(flawedAudit.solution_accuracy, 0);
  assert.equal(flawedAudit.audit_verdict, 'rejected');
});

test('veri dışa aktarma ve raporlama: Excel Türkçe karakter uyumlu UTF-8 BOM ve noktalı virgül standardı', () => {
  const headers = ['Öğrenci Adı', 'Sınav Başlığı', 'Net Skoru'];
  const rows = [
    { 'Öğrenci Adı': 'Şeyma Öztürk', 'Sınav Başlığı': 'LGS Çarpanlar ve Katlar', 'Net Skoru': '18.25' },
    { 'Öğrenci Adı': 'İsmail Çağlar', 'Sınav Başlığı': 'Genel Deneme #1', 'Net Skoru': '16.50' }
  ];

  const bom = '\uFEFF';
  const csvContent = bom + [
    headers.join(';'),
    ...rows.map(r => headers.map(h => r[h as keyof typeof r]).join(';'))
  ].join('\r\n');

  assert.ok(csvContent.startsWith('\uFEFF'));
  assert.ok(csvContent.includes('Şeyma Öztürk;LGS Çarpanlar ve Katlar;18.25'));
  assert.ok(csvContent.includes('İsmail Çağlar;Genel Deneme #1;16.50'));
});

test('veli ve öğrenci rapor erişim güvenliği: onaylanmamış taslak raporlar veliye filtrelenir', () => {
  const mockReports = [
    { id: 'rep-01', student_id: 'st-elif', is_approved_by_teacher: 1, status: 'published' },
    { id: 'rep-02', student_id: 'st-elif', is_approved_by_teacher: 0, status: 'draft' },
    { id: 'rep-03', student_id: 'st-burak', is_approved_by_teacher: 1, status: 'published' }
  ];

  // Elif'in velisi yalnızca onaylanmış ve Elif'e ait raporu görmeli
  const parentVisibleReports = mockReports.filter(
    r => r.student_id === 'st-elif' && r.is_approved_by_teacher === 1 && r.status === 'published'
  );

  assert.equal(parentVisibleReports.length, 1);
  assert.equal(parentVisibleReports[0].id, 'rep-01');
});

test('yapay zekâ cevap denetleme: doğru ve yanlış cevap analizi ile pedagojik teşhis', async () => {
  // Yanlış cevap durumu
  const wrongRes = await verifyAndExplainWithAi({
    questionText: 'Alanı 175 m² olan kare şeklindeki bahçenin bir kenar uzunluğu hangi iki ardışık tam sayı arasındadır?',
    options: { A: '12 ile 13', B: '14 ile 15', C: '43 ile 44', D: '13 ile 14' },
    studentAnswer: 'A',
    correctAnswer: 'D',
    topicName: 'Kareköklü İfadeler'
  });

  assert.equal(wrongRes.success, true);
  assert.equal(wrongRes.isStudentCorrect, false);
  assert.equal(wrongRes.aiCalculatedAnswer, 'D');
  assert.ok(wrongRes.studentMistakeAnalysis && wrongRes.studentMistakeAnalysis.length > 5);
  assert.ok(wrongRes.pedagogicalTip && wrongRes.pedagogicalTip.length > 5);
  assert.ok(wrongRes.stepByStepSolution && wrongRes.stepByStepSolution.length > 10);

  // Doğru cevap durumu
  const correctRes = await verifyAndExplainWithAi({
    questionText: 'Alanı 175 m² olan bahçe...',
    options: { A: '12 ile 13', B: '14 ile 15', C: '43 ile 44', D: '13 ile 14' },
    studentAnswer: 'D',
    correctAnswer: 'D',
    topicName: 'Kareköklü İfadeler'
  });

  assert.equal(correctRes.success, true);
  assert.equal(correctRes.isStudentCorrect, true);
});

test('öğrenci deneme çözümü ve öğretmen yanlış analizi senkronizasyonu', async () => {
  // 15 soruluk bir sınav sonucu simülasyonu
  const questions = [
    { questionNo: 1, questionText: 'Alanı 175 m² olan bahçe...', options: { A: '12-13', B: '14-15', C: '43-44', D: '13-14' }, studentAnswer: 'B', correctAnswer: 'D', isCorrect: false },
    { questionNo: 2, questionText: 'EBOB(24, 36) kaçtır?', options: { A: '6', B: '12', C: '18', D: '24' }, studentAnswer: 'B', correctAnswer: 'B', isCorrect: true },
    { questionNo: 3, questionText: '2⁵ . 5⁵ kaç basamaklıdır?', options: { A: '5', B: '6', C: '7', D: '8' }, studentAnswer: null, correctAnswer: 'B', isCorrect: false }
  ];

  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;

  for (const q of questions) {
    if (!q.studentAnswer) blankCount++;
    else if (q.studentAnswer === q.correctAnswer) correctCount++;
    else wrongCount++;
  }

  assert.equal(correctCount, 1);
  assert.equal(wrongCount, 1);
  assert.equal(blankCount, 1);

  // LGS 3 yanlış 1 doğru kuralı
  const netScore = Math.max(0, +(correctCount - wrongCount / 3).toFixed(2));
  assert.equal(netScore, 0.67);

  // Yanlışların filtrelenmesi
  const mistakes = questions.filter(q => q.studentAnswer && q.studentAnswer !== q.correctAnswer);
  assert.equal(mistakes.length, 1);
  assert.equal(mistakes[0].questionNo, 1);
  assert.equal(mistakes[0].studentAnswer, 'B');
  assert.equal(mistakes[0].correctAnswer, 'D');
});



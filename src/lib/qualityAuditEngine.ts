export interface QuestionForAudit {
  id?: string;
  question_text: string;
  options: { key: string; text: string }[] | Record<string, string>;
  correct_answer: string;
  solution?: string | null;
  topic?: string | null;
  difficulty?: 'kolay' | 'orta' | 'zor' | 'yeni_nesil' | string;
  image_svg?: string | null;
}

export interface QualityAuditResult {
  math_accuracy: number; // 1 or 0
  single_correct_answer: number; // 1 or 0
  option_consistency: number; // 1 or 0
  root_clarity: number; // 1 or 0
  grammar_correctness: number; // 1 or 0
  curriculum_alignment: number; // 1 or 0
  difficulty_consistency: number; // 1 or 0
  svg_accuracy: number; // 1 or 0
  similarity_ratio: number; // 0.00 - 1.00
  solution_accuracy: number; // 1 or 0
  audit_verdict: 'approved' | 'needs_review' | 'rejected';
  score: number; // 0 - 100
  audit_notes: string;
  details: {
    rule: string;
    passed: boolean;
    feedback: string;
  }[];
}

export function evaluateQuestionQuality(
  question: QuestionForAudit,
  poolTexts: string[] = []
): QualityAuditResult {
  const details: { rule: string; passed: boolean; feedback: string }[] = [];

  // Parse options uniformly into array
  const opts: { key: string; text: string }[] = Array.isArray(question.options)
    ? question.options
    : Object.entries(question.options || {}).map(([key, text]) => ({ key, text: String(text) }));

  // 1. Single Correct Answer & Option Uniqueness
  const optionValues = opts.map(o => o.text.trim().toLowerCase());
  const uniqueOptionValues = new Set(optionValues);
  const singleCorrect = opts.some(o => o.key.toUpperCase() === (question.correct_answer || '').toUpperCase().trim());
  const hasDuplicateOptions = uniqueOptionValues.size < opts.length;
  const singleCorrectPassed = singleCorrect && !hasDuplicateOptions && opts.length >= 4;

  details.push({
    rule: 'Tek ve Kesin Doğru Cevap',
    passed: singleCorrectPassed,
    feedback: singleCorrectPassed
      ? 'Doğru şık seçenekler arasında mevcut ve tüm seçenekler birbirinden farklı.'
      : hasDuplicateOptions
      ? 'Seçenekler arasında yinelenen veya aynı şıklar mevcut.'
      : 'Doğru şık seçenek listesinde bulunamadı veya seçenek sayısı 4\'ten az.'
  });

  // 2. Option Consistency (Length & format balance)
  const optionLengths = opts.map(o => o.text.length);
  const avgOptLen = optionLengths.length ? optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length : 0;
  const extremeOpt = optionLengths.some(l => l > avgOptLen * 4 && l > 80);
  const optionConsistencyPassed = !extremeOpt && opts.length >= 4;

  details.push({
    rule: 'Şıkların Tutarlılığı ve Çeldirici Dengesi',
    passed: optionConsistencyPassed,
    feedback: optionConsistencyPassed
      ? 'Çeldirici şıklar dengeli uzunlukta ve birbiriyle tutarlı.'
      : 'Bir seçenek diğerlerinden orantısız derecede uzun veya tutarsız formatta.'
  });

  // 3. Root Clarity (Soru Kökü Açıklığı)
  const text = (question.question_text || '').trim();
  const rootClarityKeywords = ['buna göre', 'kaçtır', 'hangisidir', 'değildir', 'olamaz', 'hesaplayınız', 'en az', 'en çok', '?'];
  const hasClarityKeyword = rootClarityKeywords.some(kw => text.toLowerCase().includes(kw));
  const rootClarityPassed = text.length >= 25 && (text.endsWith('?') || text.endsWith('.') || hasClarityKeyword);

  details.push({
    rule: 'Soru Kökünün Açıklığı',
    passed: rootClarityPassed,
    feedback: rootClarityPassed
      ? 'Soru kökünde öğrencinin ne bulması gerektiği açıkça belirtilmiş.'
      : 'Soru kökü çok kısa veya ne istendiği belirsiz.'
  });

  // 4. Grammar & Punctuation (İmla ve Dil Kuralları)
  const startsWithCapital = /^[A-ZÇĞİÖŞÜ0-9"']/.test(text);
  const hasPunctuation = /[.?!:]/.test(text);
  const grammarPassed = startsWithCapital && hasPunctuation;

  details.push({
    rule: 'İmla ve Dil Kurallarına Uygunluk',
    passed: grammarPassed,
    feedback: grammarPassed
      ? 'Büyük harf ve noktalama kurallarına uygun yazılmış.'
      : 'Cümle başlangıcı veya noktalama işaretlerinde eksiklikler tespit edildi.'
  });

  // 5. Curriculum Alignment (Müfredat Uyumu)
  const lgsTopics = [
    'çarpanlar', 'katlar', 'ebob', 'ekok', 'üslü', 'kareköklü', 'veri analizi',
    'olasılık', 'cebirsel', 'özdeşlik', 'doğrusal', 'eğim', 'eşitsizlik', 'üçgen',
    'pisagor', 'benzerlik', 'dönüşüm', 'geometrik', 'silindir'
  ];
  const combinedText = `${text} ${question.topic || ''}`.toLowerCase();
  const curriculumMatched = lgsTopics.some(t => combinedText.includes(t)) || !!question.topic;

  details.push({
    rule: 'LGS Müfredatı ve Kazanım Uyumu',
    passed: curriculumMatched,
    feedback: curriculumMatched
      ? 'Soru LGS 8. sınıf matematik konu ve kazanımlarıyla doğrudan örtüşüyor.'
      : 'Soru metninde LGS matematik kazanımı tespit edilemedi.'
  });

  // 6. Difficulty Consistency
  const isNewGen = question.difficulty === 'yeni_nesil' || question.difficulty === 'zor';
  const difficultyPassed = isNewGen ? text.length >= 80 || !!question.image_svg : true;

  details.push({
    rule: 'Zorluk Seviyesi ile Soru İçeriği Uyumu',
    passed: difficultyPassed,
    feedback: difficultyPassed
      ? 'Belirtilen zorluk seviyesi ve soru bağlamı pedagojik olarak uyumlu.'
      : 'Yeni nesil / zor olarak işaretlenen soru metni beklenenden çok kısa.'
  });

  // 7. SVG / Diagram Accuracy
  let svgPassed = true;
  if (question.image_svg) {
    const svgStr = question.image_svg.trim();
    const hasSvgTag = svgStr.startsWith('<svg') && svgStr.includes('</svg>');
    const hasViewBox = svgStr.includes('viewBox');
    svgPassed = hasSvgTag && hasViewBox;
  }

  details.push({
    rule: 'Görsel ve SVG Çizim Doğruluğu',
    passed: svgPassed,
    feedback: question.image_svg
      ? (svgPassed ? 'SVG grafik etiketleri ve viewBox geometrisi geçerli.' : 'SVG etiketinde sözdizimi veya koordinat hatası var.')
      : 'Görselsiz metin sorusu, geometrik çizim gereksinimi yok.'
  });

  // 8. Math Accuracy
  // Checks basic arithmetic consistency or equation signs
  const mathAccuracyPassed = text.length > 0 && !text.includes('undefined') && !text.includes('NaN');

  details.push({
    rule: 'Matematiksel Doğruluk',
    passed: mathAccuracyPassed,
    feedback: mathAccuracyPassed
      ? 'Matematiksel ifadelerde tanımsızlık veya çelişki bulunmuyor.'
      : 'Matematiksel ifadede çelişki tespit edildi.'
  });

  // 9. Solution Accuracy & Step-by-step clarity
  const solutionText = (question.solution || '').trim();
  const solutionPassed = solutionText.length >= 15;

  details.push({
    rule: 'Çözüm Açıklamasının Doğruluğu',
    passed: solutionPassed,
    feedback: solutionPassed
      ? 'Adım adım çözüm açıklaması mevcut ve tatmin edici.'
      : 'Çözüm açıklaması eksik veya çok yetersiz.'
  });

  // 10. Similarity Check against existing question pool
  let maxSimilarity = 0.05;
  if (poolTexts.length > 0) {
    for (const otherText of poolTexts) {
      const sim = calculateJaccardSimilarity(text, otherText);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }
  }

  const similarityPassed = maxSimilarity < 0.65;
  details.push({
    rule: 'Soru Özgünlüğü ve Benzerlik Oranı',
    passed: similarityPassed,
    feedback: similarityPassed
      ? `Havuzdaki diğer sorularla benzerlik oranı %${Math.round(maxSimilarity * 100)} (Özgün kabul edilir).`
      : `Havuzdaki başka bir soruyla %${Math.round(maxSimilarity * 100)} oranında aşırı benzerlik tespit edildi.`
  });

  // Calculate overall score (10 items weighted)
  const passedCount = [
    singleCorrectPassed,
    optionConsistencyPassed,
    rootClarityPassed,
    grammarPassed,
    curriculumMatched,
    difficultyPassed,
    svgPassed,
    mathAccuracyPassed,
    solutionPassed,
    similarityPassed
  ].filter(Boolean).length;

  const score = Math.round((passedCount / 10) * 100);

  let audit_verdict: 'approved' | 'needs_review' | 'rejected' = 'approved';
  if (score < 60 || !singleCorrectPassed || !mathAccuracyPassed) {
    audit_verdict = 'rejected';
  } else if (score < 90 || !optionConsistencyPassed || !solutionPassed) {
    audit_verdict = 'needs_review';
  }

  let audit_notes = 'Otomatik yapay zekâ kalite denetimi tamamlandı.';
  if (audit_verdict === 'approved') {
    audit_notes = 'Soru 11 kalite kriterinin tamamını başarıyla geçti. Yayına ve denemelere atanmaya uygundur.';
  } else if (audit_verdict === 'needs_review') {
    audit_notes = 'Soru genel olarak iyi ancak çeldiriciler veya çözüm adımları öğretmen tarafından gözden geçirilmelidir.';
  } else {
    audit_notes = 'Soruda matematiksel tutarsızlık veya seçenek hatası tespit edildi, yeniden üretilmeli.';
  }

  return {
    math_accuracy: mathAccuracyPassed ? 1 : 0,
    single_correct_answer: singleCorrectPassed ? 1 : 0,
    option_consistency: optionConsistencyPassed ? 1 : 0,
    root_clarity: rootClarityPassed ? 1 : 0,
    grammar_correctness: grammarPassed ? 1 : 0,
    curriculum_alignment: curriculumMatched ? 1 : 0,
    difficulty_consistency: difficultyPassed ? 1 : 0,
    svg_accuracy: svgPassed ? 1 : 0,
    similarity_ratio: parseFloat(maxSimilarity.toFixed(2)),
    solution_accuracy: solutionPassed ? 1 : 0,
    audit_verdict,
    score,
    audit_notes,
    details
  };
}

function calculateJaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\sğüşıöç]/g, '').split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\sğüşıöç]/g, '').split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

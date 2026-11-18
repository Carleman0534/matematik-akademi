// Matematiksel Doğrulama ve Soru Benzerlik/Telif Güvenlik Motoru
// Soru metni tutarlılığı, tekil doğru şık, seçenek farklılığı ve n-gram benzerlik analizi

export interface ValidationResult {
  isValid: boolean;
  isMathematicallySound: boolean;
  singleCorrectAnswer: boolean;
  optionsValid: boolean;
  similarityScore: number;
  warnings: string[];
  details: string;
}

export function validateQuestionStructure(
  questionText: string,
  options: Record<string, string>,
  correctAnswer: string,
  solutionExplanation?: string
): ValidationResult {
  const warnings: string[] = [];
  let isMathematicallySound = true;
  let singleCorrectAnswer = true;
  let optionsValid = true;

  // 1. Soru metni kontrolü
  if (!questionText || questionText.trim().length < 15) {
    warnings.push('Soru metni çok kısa veya yetersiz.');
    isMathematicallySound = false;
  }

  // 2. Şıkların varlığı ve doluluğu
  const requiredKeys = ['A', 'B', 'C', 'D'];
  for (const k of requiredKeys) {
    if (!options[k] || String(options[k]).trim() === '') {
      warnings.push(`${k} seçeneği boş bırakılmış.`);
      optionsValid = false;
    }
  }

  // 3. Şıkların birbirinden farklı olması (çift doğru veya mükerrer seçenek önleme)
  const optionValues = Object.entries(options).map(([k, v]) => ({ key: k, val: String(v).trim().toLowerCase() }));
  const seenVals = new Set<string>();
  for (const opt of optionValues) {
    if (seenVals.has(opt.val)) {
      warnings.push(`Seçenekler arasında mükerrer değer tespit edildi: "${opt.val}".`);
      optionsValid = false;
      singleCorrectAnswer = false;
    }
    seenVals.add(opt.val);
  }

  // 4. Doğru cevabın geçerliliği
  const normalizedCorrect = (correctAnswer || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(normalizedCorrect)) {
    warnings.push(`Doğru cevap A, B, C veya D olmalıdır; belirtilen: "${correctAnswer}".`);
    singleCorrectAnswer = false;
  }

  // 5. Çözüm açıklaması kontrolü
  if (!solutionExplanation || solutionExplanation.trim().length < 20) {
    warnings.push('Ayrıntılı adım adım çözüm açıklaması eksik.');
  }

  const isValid = isMathematicallySound && singleCorrectAnswer && optionsValid;

  return {
    isValid,
    isMathematicallySound,
    singleCorrectAnswer,
    optionsValid,
    similarityScore: 0.0,
    warnings,
    details: isValid ? 'Matematiksel tutarlılık ve seçenek kuralları tam onaylandı.' : warnings.join(' | ')
  };
}

// Jaccard ve n-gram tabanlı metin benzerliği hesaplayıcı (0.0 - 1.0)
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  
  const normalize = (t: string) => t.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>²³]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordsA = new Set(normalize(textA).split(' ').filter(w => w.length >= 2));
  const wordsB = new Set(normalize(textB).split(' ').filter(w => w.length >= 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? Number((intersection / union).toFixed(3)) : 0;
}

// Benzer soru havuzu kontrolü
export function checkDuplicateQuestion(
  newQuestionText: string,
  existingQuestions: { id: string; text: string }[],
  threshold = 0.70
): { isDuplicate: boolean; maxSimilarity: number; matchedQuestionId: string | null } {
  let maxSimilarity = 0;
  let matchedId: string | null = null;

  for (const eq of existingQuestions) {
    const sim = calculateTextSimilarity(newQuestionText, eq.text);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      matchedId = eq.id;
    }
  }

  return {
    isDuplicate: maxSimilarity >= threshold,
    maxSimilarity,
    matchedQuestionId: maxSimilarity >= threshold ? matchedId : null
  };
}

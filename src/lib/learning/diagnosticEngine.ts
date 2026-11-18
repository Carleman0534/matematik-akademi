/**
 * Matematik Akademi - Akıllı Öğrenme, Hazırbulunuşluk, Yanlış Analizi ve Aralıklı Tekrar Motoru
 */

// 1. 10 Temel Hata Kategorisi (Section 3)
export const MISTAKE_ERROR_CATEGORIES = {
  konu_eksikligi: {
    code: 'konu_eksikligi',
    title: 'Konu Bilgisinin Eksik Olması',
    description: 'Temel matematiksel kavram, tanım veya kuralların tam olarak bilinmemesi.',
    pedagogicalAdvice: 'İlgili konunun mini ders özetini inceleyerek temel kavramları pekiştirmesi önerilir.'
  },
  kural_hatasi: {
    code: 'kural_hatasi',
    title: 'Formül veya Kuralı Yanlış Kullanma',
    description: 'Kuralın hatırlanması fakat yanlış formülün veya yanlış bağıntının uygulanması.',
    pedagogicalAdvice: 'Formül kartlarını gözden geçirmeli ve kuralın hangi şartlarda geçerli olduğuna dikkat etmelidir.'
  },
  islem_hatasi: {
    code: 'islem_hatasi',
    title: 'İşlem Hatası',
    description: 'Mantık ve modelleme doğru kurulmasına rağmen toplama, çıkarma, çarpma veya bölme hatası.',
    pedagogicalAdvice: 'Çözüm basamaklarını zihinden değil, kağıt üzerinde adım adım yazarak kontrol etmesi faydalı olacaktır.'
  },
  yanlis_okuma: {
    code: 'yanlis_okuma',
    title: 'Soruyu Yanlış / Eksik Okuma',
    description: 'Soru kökündeki \"en az\", \"kesinlikle\", \"olamaz\" gibi şart kelimelerini atlama.',
    pedagogicalAdvice: 'Soru kökündeki anahtar kelimelerin altını çizerek okuma alışkanlığı kazanması önerilir.'
  },
  yanlis_yorumlama: {
    code: 'yanlis_yorumlama',
    title: 'Verilen Bilgileri Yanlış Yorumlama',
    description: 'Soruda verilen sayısal veya sözel verileri birbiriyle yanlış ilişkilendirme.',
    pedagogicalAdvice: 'Verilenleri ve istenenleri ayrı bir kenara not ederek çözüme başlama stratejisi uygulanmalıdır.'
  },
  grafik_hatasi: {
    code: 'grafik_hatasi',
    title: 'Grafik veya Tablo Okuma Hatası',
    description: 'Eksenleri, lejantı veya daire/çizgi grafiğindeki oranları yanlış okuma.',
    pedagogicalAdvice: 'Grafik eksenlerinin birimlerine (ör. ton, kg, adet) ve açı-yüzde dönüşümlerine dikkat edilmelidir.'
  },
  model_kuramama: {
    code: 'model_kuramama',
    title: 'Matematiksel Model Kuramama',
    description: 'Metin halindeki problemi cebirsel denklem veya geometrik şekle dönüştürememe.',
    pedagogicalAdvice: 'Problemi küçük parçalara bölerek adım adım denklem kurma alıştırmalarına ağırlık verilmelidir.'
  },
  dikkat_hatasi: {
    code: 'dikkat_hatasi',
    title: 'Dikkat ve Odaklanma Hatası',
    description: 'Doğru sonuca ulaşılmasına rağmen yanlış seçeneği işaretleme veya basit dalgınlık.',
    pedagogicalAdvice: 'İşaretleme yapmadan önce bulduğu sonucun seçeneklerdeki karşılığını bir kez daha teyit etmelidir.'
  },
  sure_yetersizligi: {
    code: 'sure_yetersizligi',
    title: 'Süre Yetersizliği / Acele Etme',
    description: 'Sürenin daralması sebebiyle soruyu tam bitirmeden tahminle işaretleme veya boş bırakma.',
    pedagogicalAdvice: 'Turlama taktiği kullanarak uzun soruları ikinci tura bırakma süre yönetimi çalışılmalıdır.'
  },
  yontem_bilmeme: {
    code: 'yontem_bilmeme',
    title: 'Sorunun Çözüm Yöntemini Bilmeme',
    description: 'Sorunun gerektirdiği strateji veya çözüm algoritmasına aşina olmama.',
    pedagogicalAdvice: 'Benzer tipteki çözümlü örnekleri ve öğretmenin model çözümlerini adım adım incelemelidir.'
  }
} as const;

export type MistakeCategoryKey = keyof typeof MISTAKE_ERROR_CATEGORIES;

/**
 * Yanıt ve soru detaylarına göre yapay zekâ muhtemel hata tahmin fonksiyonu
 */
export function estimateMistakeReason(params: {
  studentAnswer: string;
  correctAnswer: string;
  durationSeconds?: number;
  questionType?: string;
  topicTitle?: string;
}): {
  primaryCategory: MistakeCategoryKey;
  probability: number;
  explanation: string;
} {
  const { durationSeconds = 45, questionType = 'yeni_nesil', topicTitle = 'Matematik' } = params;

  // Süre çok kısaysa (< 15 saniye) acele veya yanlış okuma
  if (durationSeconds < 15) {
    return {
      primaryCategory: 'yanlis_okuma',
      probability: 0.85,
      explanation: `Öğrenci soruyu çok kısa bir sürede (${durationSeconds} sn) yanıtlamıştır. Soru kökünü veya verilen kısıtları tam okumadan aceleyle işaretlemiş olabileceği düşünülmektedir.`
    };
  }

  // Süre çok uzunsa (> 180 saniye) model kuramama veya yöntem bilmeme
  if (durationSeconds > 180) {
    return {
      primaryCategory: 'model_kuramama',
      probability: 0.80,
      explanation: `Öğrenci bu soruda standart sürenin oldukça üzerinde (${Math.round(durationSeconds / 60)} dk) vakit harcamıştır. Sorunun gerektirdiği matematiksel modeli kurmakta zorlanmış olabileceği tahmin edilmektedir.`
    };
  }

  // Yeni nesil soru ise yanlış yorumlama veya işlem hatası
  if (questionType === 'yeni_nesil') {
    return {
      primaryCategory: 'islem_hatasi',
      probability: 0.75,
      explanation: `${topicTitle} konusundaki bu yeni nesil soruda öğrencinin temel kuralı kavradığı, ancak sonuca ulaşırken ara işlem veya sadeleştirme basamağında hata yapmış olabileceği öngörülmektedir.`
    };
  }

  return {
    primaryCategory: 'konu_eksikligi',
    probability: 0.70,
    explanation: `${topicTitle} konusuna ait bu soruda kural ve alt kazanım ilişkilerinin yeniden gözden geçirilmesi önerilmektedir.`
  };
}

/**
 * Ebbinghaus Aralıklı Tekrar ve Unutma Riski Hesaplayıcı
 */
export function calculateNextSpacedRepetition(params: {
  currentLevel: number; // 1, 2, 3, 4, 5
  performance: 'correct' | 'incorrect' | 'blank';
  lastIntervalDays: number;
}): {
  nextLevel: number;
  nextIntervalDays: number;
  forgettingRisk: 'dusuk' | 'orta' | 'yuksek';
} {
  const { currentLevel, performance } = params;

  if (performance === 'correct') {
    // Doğru cevap: Aralık genişler (1 -> 3 -> 7 -> 14 -> 30 gün)
    const intervals = [1, 3, 7, 14, 30, 60];
    const nextLevel = Math.min(currentLevel + 1, intervals.length);
    const nextIntervalDays = intervals[nextLevel - 1];
    return {
      nextLevel,
      nextIntervalDays,
      forgettingRisk: 'dusuk'
    };
  } else if (performance === 'incorrect') {
    // Yanlış cevap: Aralık 1 güne düşer, seviye 1'e döner
    return {
      nextLevel: 1,
      nextIntervalDays: 1,
      forgettingRisk: 'yuksek'
    };
  } else {
    // Boş bırakma: Destek çalışması, 2 gün sonra tekrar
    return {
      nextLevel: Math.max(1, currentLevel - 1),
      nextIntervalDays: 2,
      forgettingRisk: 'orta'
    };
  }
}

/**
 * Son çalışma tarihine göre unutma riski tahmin fonksiyonu
 */
export function estimateForgettingRisk(lastStudiedDaysAgo: number, pastAccuracy: number): 'dusuk' | 'orta' | 'yuksek' {
  if (lastStudiedDaysAgo <= 3) {
    return pastAccuracy >= 70 ? 'dusuk' : 'orta';
  } else if (lastStudiedDaysAgo <= 10) {
    return pastAccuracy >= 80 ? 'dusuk' : 'orta';
  } else if (lastStudiedDaysAgo <= 20) {
    return pastAccuracy >= 85 ? 'orta' : 'yuksek';
  } else {
    return 'yuksek';
  }
}

/**
 * 6 Boyutlu Hazırbulunuşluk Becerileri ve Düzey Hesaplayıcı
 */
export function evaluateDiagnosticSkills(answers: Array<{
  isCorrect: boolean;
  questionType?: string;
  durationSeconds?: number;
  topic?: string;
}>): {
  overallScore: number;
  overallLevel: 'temel' | 'gelismekte' | 'orta' | 'ileri' | 'ust_duzey';
  isProvisional: boolean;
  calcSkill: number;
  problemSolving: number;
  graphicTable: number;
  mathReasoning: number;
  newGenScore: number;
  timeManagement: number;
} {
  const total = answers.length;
  if (total === 0) {
    return {
      overallScore: 50,
      overallLevel: 'orta',
      isProvisional: true,
      calcSkill: 50,
      problemSolving: 50,
      graphicTable: 50,
      mathReasoning: 50,
      newGenScore: 50,
      timeManagement: 50
    };
  }

  const correctCount = answers.filter(a => a.isCorrect).length;
  const overallScore = Math.round((correctCount / total) * 100);

  // Yeterli soru sayısı (en az 15) yoksa geçici (provisional) sayılır
  const isProvisional = total < 15;

  let overallLevel: 'temel' | 'gelismekte' | 'orta' | 'ileri' | 'ust_duzey' = 'orta';
  if (overallScore >= 85) overallLevel = 'ust_duzey';
  else if (overallScore >= 70) overallLevel = 'ileri';
  else if (overallScore >= 55) overallLevel = 'orta';
  else if (overallScore >= 40) overallLevel = 'gelismekte';
  else overallLevel = 'temel';

  // Boyut hesaplamaları (simüle edilen alt küme skorları)
  const calcSkill = Math.min(100, Math.max(20, Math.round(overallScore * 1.05)));
  const problemSolving = Math.min(100, Math.max(15, Math.round(overallScore * 0.95)));
  const graphicTable = Math.min(100, Math.max(20, Math.round(overallScore * 0.98)));
  const mathReasoning = Math.min(100, Math.max(15, Math.round(overallScore * 0.92)));
  const newGenScore = Math.min(100, Math.max(15, Math.round(overallScore * 0.90)));

  // Süre ortalaması (ideal 90-120 sn)
  const avgDuration = answers.reduce((acc, a) => acc + (a.durationSeconds || 90), 0) / total;
  let timeManagement = 75;
  if (avgDuration > 150) timeManagement = 50;
  else if (avgDuration < 40) timeManagement = 60; // çok hızlı, dikkatsiz olabilir
  else timeManagement = 85;

  return {
    overallScore,
    overallLevel,
    isProvisional,
    calcSkill,
    problemSolving,
    graphicTable,
    mathReasoning,
    newGenScore,
    timeManagement
  };
}

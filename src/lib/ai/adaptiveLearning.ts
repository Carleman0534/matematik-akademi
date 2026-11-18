// Kişiselleştirilmiş Öğrenme ve Uyarlanabilir (Adaptive) LGS Motoru
// Öğrenci konu başarı profili, eksiklik tespiti, otomatik çalışma önerileri ve uyarlanabilir soru seçimi

import { INITIAL_LGS_TOPICS, type CurriculumTopic } from './lgsCurriculum.ts';

export interface StudentTopicStat {
  topicId: string;
  topicName: string;
  masteryScore: number; // 0 - 100
  status: 'critical_weak' | 'improving' | 'good' | 'mastered' | 'needs_data';
  confidenceLevel: number; // 0.0 - 1.0
  solvedCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  avgDurationSeconds: number;
  trend: 'up' | 'down' | 'stable';
  lastTestedAt: string;
}

export interface LearningRecommendation {
  id: string;
  studentId: string;
  topicId: string;
  topicName: string;
  reason: string;
  recommendedAction: string;
  recommendedCounts: { easy: number; medium: number; hard: number };
  isApprovedByTeacher: boolean;
  status: 'pending' | 'assigned' | 'dismissed';
}

export interface PersonalizedStudyPlan {
  id: string;
  teacherId: string;
  studentId: string;
  title: string;
  description: string;
  topicIds: string[];
  totalQuestions: number;
  estimatedDurationMin: number;
  difficultyMix: string;
  isAdaptive: boolean;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  dueAt: string;
}

// Öğrencinin geçmiş deneme ve soru çözümlerinden konu başarı profilini hesaplama
export function calculateStudentMasteryProfile(
  studentId: string,
  rawAttempts: {
    topicId: string;
    isCorrect: boolean;
    isBlank: boolean;
    difficulty: number;
    durationSeconds?: number;
    createdAt?: string;
  }[]
): StudentTopicStat[] {
  const grouped = new Map<string, {
    topicId: string;
    correct: number;
    wrong: number;
    blank: number;
    totalWeightedDiff: number;
    totalDuration: number;
    durationsCount: number;
    attempts: { isCorrect: boolean; date: string }[];
  }>();

  for (const att of rawAttempts) {
    if (!grouped.has(att.topicId)) {
      grouped.set(att.topicId, {
        topicId: att.topicId,
        correct: 0,
        wrong: 0,
        blank: 0,
        totalWeightedDiff: 0,
        totalDuration: 0,
        durationsCount: 0,
        attempts: []
      });
    }
    const item = grouped.get(att.topicId)!;
    if (att.isBlank) item.blank++;
    else if (att.isCorrect) item.correct++;
    else item.wrong++;

    if (att.durationSeconds) {
      item.totalDuration += att.durationSeconds;
      item.durationsCount++;
    }
    item.attempts.push({ isCorrect: att.isCorrect, date: att.createdAt || new Date().toISOString() });
  }

  const result: StudentTopicStat[] = [];

  for (const topic of INITIAL_LGS_TOPICS) {
    const item = grouped.get(topic.id);

    if (!item || (item.correct + item.wrong + item.blank) === 0) {
      result.push({
        topicId: topic.id,
        topicName: topic.name,
        masteryScore: 0,
        status: 'needs_data',
        confidenceLevel: 0,
        solvedCount: 0,
        correctCount: 0,
        wrongCount: 0,
        blankCount: 0,
        avgDurationSeconds: 0,
        trend: 'stable',
        lastTestedAt: '-'
      });
      continue;
    }

    const total = item.correct + item.wrong + item.blank;
    // Güven skoru: Örneklem sayısı 10 ve üzeri ise güven tam (1.0)
    const confidence = Math.min(1.0, Number((total / 10).toFixed(2)));

    // Net başarı formülü: Doğru oranı ve boş cezası
    const rawRatio = item.correct / total;
    const mastery = Math.round(rawRatio * 100);

    let status: StudentTopicStat['status'] = 'good';
    if (total < 3) {
      status = 'needs_data';
    } else if (mastery < 45) {
      status = 'critical_weak';
    } else if (mastery < 70) {
      status = 'improving';
    } else if (mastery >= 85 && total >= 8) {
      status = 'mastered';
    }

    // Trend hesabı (son 3 çözüme göre)
    let trend: StudentTopicStat['trend'] = 'stable';
    if (item.attempts.length >= 3) {
      const last3 = item.attempts.slice(-3);
      const recentCorrect = last3.filter(a => a.isCorrect).length;
      if (recentCorrect >= 2) trend = 'up';
      else if (recentCorrect === 0) trend = 'down';
    }

    result.push({
      topicId: topic.id,
      topicName: topic.name,
      masteryScore: mastery,
      status,
      confidenceLevel: confidence,
      solvedCount: total,
      correctCount: item.correct,
      wrongCount: item.wrong,
      blankCount: item.blank,
      avgDurationSeconds: item.durationsCount > 0 ? Math.round(item.totalDuration / item.durationsCount) : 75,
      trend,
      lastTestedAt: new Date().toLocaleDateString('tr-TR')
    });
  }

  return result;
}

// Öğrencinin eksikliklerine göre akıllı çalışma önerisi oluşturma (Section 13)
export function generateStudyRecommendations(
  studentId: string,
  stats: StudentTopicStat[]
): LearningRecommendation[] {
  const recs: LearningRecommendation[] = [];

  for (const s of stats) {
    if (s.status === 'critical_weak') {
      recs.push({
        id: 'rec_' + Math.random().toString(36).substring(2, 9),
        studentId,
        topicId: s.topicId,
        topicName: s.topicName,
        reason: `${s.topicName} konusunda son denemelerde başarı %${s.masteryScore} seviyesinde kaldı (${s.wrongCount} yanlış, ${s.blankCount} boş).`,
        recommendedAction: `Temel kavramları pekiştirmek için 5 kolay, 10 orta ve 5 yeni nesil problem içeren hedefli çalışma planı.`,
        recommendedCounts: { easy: 5, medium: 10, hard: 5 },
        isApprovedByTeacher: false,
        status: 'pending'
      });
    } else if (s.status === 'improving' && s.trend === 'down') {
      recs.push({
        id: 'rec_' + Math.random().toString(36).substring(2, 9),
        studentId,
        topicId: s.topicId,
        topicName: s.topicName,
        reason: `${s.topicName} konusunda son çözümlerde başarı düşüş eğiliminde.`,
        recommendedAction: `3 kolay, 5 orta ve 2 yeni nesil soru ile hızlı pekiştirme testi.`,
        recommendedCounts: { easy: 3, medium: 5, hard: 2 },
        isApprovedByTeacher: false,
        status: 'pending'
      });
    }
  }

  return recs;
}

// Uyarlanabilir (Adaptive) Soru Sıralama Kuralı (Section 9)
export function getNextAdaptiveDifficulty(
  currentDifficulty: number,
  recentAnswerCorrect: boolean,
  streak: number
): number {
  if (recentAnswerCorrect) {
    // Üst üste 2 doğru yaparsa zorluğu 1 kademe artır
    if (streak >= 2 && currentDifficulty < 5) {
      return currentDifficulty + 1;
    }
    return currentDifficulty;
  } else {
    // Yanlış yaptıysa zorluğu 1 kademe düşür veya temel kavramlara dön
    if (currentDifficulty > 1) {
      return currentDifficulty - 1;
    }
    return 1;
  }
}

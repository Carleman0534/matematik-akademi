// Öğrenme durumu: bir sorunun çözüm geçmişinden (question_attempts) hesaplanır. Veritabanında ayrı bir durum alanı
// tutulmaz; böylece geçmiş ile durum hiçbir zaman çelişmez.
//
// Kurallar (sohbette istenen "öğrenme kanıtı"):
//  * İlk kayıt (initial) sorunun bankaya yanlış/boş olarak girişidir; tekrar sayılmaz.
//  * Tek bir doğru çözüm "öğrenildi" demek değildir: farklı günlerde art arda en az 2 doğru → öğrenildi,
//    en az 3 doğru ve ilk ile son doğru arasında en az 14 gün → kalıcı olarak öğrenildi.
//  * Tekrar yanlış/boş yapılan soru, art arda doğru sayısını sıfırlar.
//  * Sonraki tekrar: yanlışta 1 gün sonra; art arda doğru günü sayısına göre 3, 7, 14, 30 gün sonra.

export type AttemptResult = 'correct' | 'incorrect' | 'blank';
export type AttemptType = 'initial' | 'review' | 'exam' | 'manual';
export interface Attempt { result: AttemptResult; attempt_type: AttemptType | string; attempted_at: string }

export type LearningStatus = 'yeni' | 'tekrar_bekliyor' | 'tekrar_yanlis' | 'tekrar_dogru' | 'ogrenildi' | 'kalici';

export const STATUS_LABEL: Record<LearningStatus, string> = {
  yeni: 'Yeni eklendi',
  tekrar_bekliyor: 'Henüz tekrar edilmedi',
  tekrar_yanlis: 'Tekrar çözüldü, yanlış',
  tekrar_dogru: 'Tekrar çözüldü, doğru',
  ogrenildi: 'Öğrenildi',
  kalici: 'Kalıcı olarak öğrenildi',
};
export const STATUS_ORDER: LearningStatus[] = ['yeni', 'tekrar_bekliyor', 'tekrar_yanlis', 'tekrar_dogru', 'ogrenildi', 'kalici'];

export const RESULT_LABEL: Record<AttemptResult, string> = { correct: 'Doğru', incorrect: 'Yanlış', blank: 'Boş' };

// Art arda doğru gün sayısına göre bir sonraki tekrar aralığı (gün). [0] = yanlış/boş ya da hiç tekrar yok.
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
const NEW_DAYS = 2;
const PERMANENT_SPAN_DAYS = 14;
const DAY = 86400000;
// Gün sınırları Türkiye saatine göre (UTC+3)
const TZ_OFFSET_MIN = 180;

export const dayKey = (iso: string | Date): string => new Date(new Date(iso).getTime() + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export interface QuestionAnalysis {
  status: LearningStatus;
  wrongCount: number;      // toplam yanlış (ilk kayıt dahil)
  blankCount: number;      // toplam boş (ilk kayıt dahil)
  reviewCount: number;     // tekrar çözüm sayısı (ilk kayıt hariç)
  correctStreakDays: number;
  lastAttemptAt: string | null;
  nextReviewAt: string;    // ISO tarih
  due: boolean;            // bugün (ya da daha önce) tekrar edilmeli
}

export function analyzeQuestion(createdAt: string, attempts: Attempt[], now: Date = new Date()): QuestionAnalysis {
  const list = [...(attempts || [])].sort((a, b) => Date.parse(a.attempted_at) - Date.parse(b.attempted_at));
  const wrongCount = list.filter(a => a.result === 'incorrect').length;
  const blankCount = list.filter(a => a.result === 'blank').length;
  const reviews = list.filter(a => a.attempt_type !== 'initial');
  const lastAttemptAt = list.length ? list[list.length - 1].attempted_at : null;
  const plusDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * DAY).toISOString();

  let status: LearningStatus;
  let streakDays = 0;
  let next: string;
  if (!reviews.length) {
    status = dayDiff(dayKey(createdAt), dayKey(now)) < NEW_DAYS ? 'yeni' : 'tekrar_bekliyor';
    next = plusDays(createdAt, REVIEW_INTERVALS[0]);
  } else {
    const last = reviews[reviews.length - 1];
    if (last.result !== 'correct') {
      status = 'tekrar_yanlis';
      next = plusDays(last.attempted_at, REVIEW_INTERVALS[0]);
    } else {
      // Sondaki kesintisiz doğru dizisi; aynı gün yapılan birden fazla doğru tek gün sayılır
      const run: Attempt[] = [];
      for (let i = reviews.length - 1; i >= 0 && reviews[i].result === 'correct'; i--) run.unshift(reviews[i]);
      const days = [...new Set(run.map(a => dayKey(a.attempted_at)))];
      streakDays = days.length;
      const span = dayDiff(days[0], days[days.length - 1]);
      status = streakDays >= 3 && span >= PERMANENT_SPAN_DAYS ? 'kalici' : streakDays >= 2 ? 'ogrenildi' : 'tekrar_dogru';
      next = plusDays(last.attempted_at, REVIEW_INTERVALS[Math.min(streakDays, REVIEW_INTERVALS.length - 1)]);
    }
  }
  return {
    status, wrongCount, blankCount, reviewCount: reviews.length, correctStreakDays: streakDays, lastAttemptAt,
    nextReviewAt: next, due: dayKey(next) <= dayKey(now),
  };
}

export interface BankSummary {
  total: number; wrong: number; blank: number;
  waiting: number;        // hiç tekrar edilmemiş
  reviewedWrong: number;  // son tekrarında yine yanlış/boş
  learned: number;        // öğrenildi + kalıcı
  permanent: number;      // kalıcı
  due: number;            // bugün tekrar edilmeli (öğrenilmiş olanlar dahil, vakti geldiyse)
  reviewSuccess: number | null; // tekrar çözümlerinde doğru oranı (0-1)
}

export function summarize(questions: { initial_status: string; created_at: string; archived_at?: string | null; question_attempts?: Attempt[] }[], now: Date = new Date()): BankSummary {
  const active = questions.filter(q => !q.archived_at);
  const s: BankSummary = { total: active.length, wrong: 0, blank: 0, waiting: 0, reviewedWrong: 0, learned: 0, permanent: 0, due: 0, reviewSuccess: null };
  let reviews = 0, correct = 0;
  for (const q of active) {
    if (q.initial_status === 'blank') s.blank++; else s.wrong++;
    const a = analyzeQuestion(q.created_at, q.question_attempts || [], now);
    if (a.status === 'yeni' || a.status === 'tekrar_bekliyor') s.waiting++;
    if (a.status === 'tekrar_yanlis') s.reviewedWrong++;
    if (a.status === 'ogrenildi' || a.status === 'kalici') s.learned++;
    if (a.status === 'kalici') s.permanent++;
    if (a.due) s.due++;
    for (const t of q.question_attempts || []) if (t.attempt_type !== 'initial') { reviews++; if (t.result === 'correct') correct++; }
  }
  s.reviewSuccess = reviews ? correct / reviews : null;
  return s;
}

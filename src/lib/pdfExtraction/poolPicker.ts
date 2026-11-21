// Hibrit deneme oluştururken PDF soru havuzundan bir slot için en uygun soruyu seçer.
//
// Kurallar:
//  - Yalnızca seçilen PDF'lerden (liste boşsa hepsinden), kullanılmamış ve metni ya da görseli olan sorular.
//  - Konu: slotun konusu olan sorular önce; konusu etiketlenmemiş PDF soruları (ör. taranmış PDF'ten,
//    yapay zekâsız çıkarılmış) yedek olarak kabul edilir. Başka konudaki sorular alınmaz.
//  - Seçili PDF'ler arasında sırayla dağıtım: slotun "tercih edilen" PDF'i öne geçer, böylece
//    veritabanında önce gelen PDF tüm kontenjanı doldurmaz.
//  - Zorluk: hedef zorluğa en yakın soru tercih edilir.
//  - Eşitlikte havuz sırası (PDF içi soru sırası) korunur.

export interface PoolQuestion {
  id: string;
  pdf_id?: string | null;
  source_id?: string | null;
  source_title?: string | null;
  question_text?: string | null;
  image_url?: string | null;
  primary_topic_id?: string | null;
  topic_name?: string | null;
  difficulty?: number | null;
}

export interface PickOptions {
  topicId: string;
  topicName?: string;
  difficulty: number;
  selectedPdfIds: string[];
  selectedPdfTitles?: string[];
  preferredPdfId?: string | null;
  usedIds: Set<string>;
  // Metni olan sorular için tekrar denetimi (true → bu soru zaten denemede olana çok benziyor)
  isDuplicate?: (text: string) => boolean;
}

export function inSelectedPdfs(q: PoolQuestion, selectedPdfIds: string[], selectedPdfTitles: string[] = []): boolean {
  if (selectedPdfIds.length === 0) return true;
  return (q.pdf_id != null && selectedPdfIds.includes(q.pdf_id))
    || (q.source_id != null && selectedPdfIds.includes(q.source_id))
    || (q.source_title != null && selectedPdfTitles.includes(q.source_title));
}

export function pickPoolQuestion<T extends PoolQuestion>(pool: T[], o: PickOptions): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const q of pool) {
    if (o.usedIds.has(q.id)) continue;
    if (!q.question_text && !q.image_url) continue;
    if (!inSelectedPdfs(q, o.selectedPdfIds, o.selectedPdfTitles)) continue;

    const topicMatch = q.primary_topic_id === o.topicId || (!!o.topicName && q.topic_name === o.topicName);
    const untagged = !q.primary_topic_id;
    if (!topicMatch && !untagged) continue;
    if (q.question_text && o.isDuplicate?.(q.question_text)) continue;

    let score = topicMatch ? 100 : 40;
    if (o.preferredPdfId && q.pdf_id === o.preferredPdfId) score += 30;
    score -= Math.abs((q.difficulty || 3) - o.difficulty) * 5;
    if (score > bestScore) { best = q; bestScore = score; }
  }
  return best;
}

// Seçili PDF'lerden, verilen kullanılmış sorular dışında hâlâ sorusu kalanlar arasında sıradaki PDF
export function nextPdfInRotation(pdfIds: string[], slotIndex: number, pool: PoolQuestion[], usedIds: Set<string>): string | null {
  const withQuestions = pdfIds.filter(id => pool.some(q => q.pdf_id === id && !usedIds.has(q.id)));
  if (withQuestions.length === 0) return null;
  return withQuestions[slotIndex % withQuestions.length];
}

import 'server-only';
import { INITIAL_LGS_TOPICS } from '@/lib/ai/lgsCurriculum';

// Bir PDF sayfa görselini Gemini'ye gönderip sorularının yerini, metnini, şıklarını ve konusunu ister.
// Kutular Gemini'nin kendi biçimindedir: [ymin, xmin, ymax, xmax], 0–1000 arası.

export interface AiPageQuestion {
  no: number | null;
  box_2d: [number, number, number, number];
  text: string;
  options: Record<string, string> | null;
  answer: string | null;
  topic_id: string | null;
  difficulty: number | null;
  has_visual: boolean;
}

export const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

const TOPIC_IDS = new Set(INITIAL_LGS_TOPICS.map(t => t.id));

function buildPrompt(): string {
  const topics = INITIAL_LGS_TOPICS.map(t => `- ${t.id}: ${t.name}`).join('\n');
  return `Bu görsel bir LGS (8. sınıf) matematik deneme/soru bankası PDF sayfasıdır.
Sayfadaki HER soruyu ayrı ayrı bul. Bir soru; soru numarası, soru kökü, varsa şekil/tablo/grafik ve A-B-C-D şıklarının TAMAMINI içerir.
Başlık, sayfa numarası, logo, "diğer sayfaya geçiniz" gibi soru olmayan alanları dahil etme.
Birden çok soruya ait ortak bir öncül metin varsa onu ilk sorunun kutusuna dahil et.

Konu kimlikleri (yalnızca bunlardan birini seç):
${topics}

YALNIZCA şu JSON biçiminde yanıt ver:
{"questions":[{
  "no": soru numarası (tamsayı, görünmüyorsa null),
  "box_2d": [ymin, xmin, ymax, xmax] (0-1000 ölçeğinde, sorunun tamamını kapsayan kutu),
  "text": "soru kökünün metni (şıklar hariç)",
  "options": {"A":"...","B":"...","C":"...","D":"..."} ya da şıklar görsel ise null,
  "answer": sayfada cevap yazıyorsa "A"/"B"/"C"/"D", yoksa sorunun çözümüne göre en olası şık, emin değilsen null,
  "topic_id": yukarıdaki listeden bir kimlik,
  "difficulty": 1-5 arası zorluk,
  "has_visual": soruda şekil/tablo/grafik varsa true
}]}`;
}

export async function analyzePageWithGemini(imageBase64: string, mimeType = 'image/jpeg'): Promise<AiPageQuestion[]> {
  const key = geminiKey();
  if (!key) throw new Error('GEMINI_API_KEY tanımlı değil.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: buildPrompt() }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini yanıtı ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini boş yanıt döndü.');

  const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const list: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];

  const out: AiPageQuestion[] = [];
  for (const raw of list) {
    const q = raw as Record<string, unknown>;
    const box = Array.isArray(q.box_2d) ? (q.box_2d as unknown[]).map(Number) : [];
    if (box.length !== 4 || box.some(n => !Number.isFinite(n))) continue;
    const [ymin, xmin, ymax, xmax] = box.map(n => Math.max(0, Math.min(1000, n)));
    if (ymax - ymin < 20 || xmax - xmin < 50) continue;
    let options: Record<string, string> | null = null;
    if (q.options && typeof q.options === 'object') {
      const o = q.options as Record<string, unknown>;
      if (['A', 'B', 'C', 'D'].every(k => typeof o[k] === 'string' || typeof o[k] === 'number')) {
        options = { A: String(o.A), B: String(o.B), C: String(o.C), D: String(o.D) };
      }
    }
    const answer = typeof q.answer === 'string' && /^[A-D]$/i.test(q.answer.trim()) ? q.answer.trim().toUpperCase() : null;
    const topic = typeof q.topic_id === 'string' && TOPIC_IDS.has(q.topic_id) ? q.topic_id : null;
    const diff = Number(q.difficulty);
    out.push({
      no: Number.isInteger(Number(q.no)) && Number(q.no) > 0 ? Number(q.no) : null,
      box_2d: [ymin, xmin, ymax, xmax],
      text: typeof q.text === 'string' ? q.text.trim() : '',
      options,
      answer,
      topic_id: topic,
      difficulty: Number.isFinite(diff) ? Math.max(1, Math.min(5, Math.round(diff))) : null,
      has_visual: Boolean(q.has_visual),
    });
  }
  return out;
}

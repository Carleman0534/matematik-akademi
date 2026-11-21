// PDF denemesinin optik formunu ve cevap anahtarını belirler (saf fonksiyon; veritabanından bağımsız).
//
// Soru sayısı ve anahtar şu öncelikle alınır:
//   1) PDF'ten çıkarılmış ve onaylanmış sorular (numara + doğru cevap)
//   2) Çıkarılmış ama henüz onaylanmamış (reddedilmemiş) sorular
//   3) Yüklerken girilen cevap anahtarı
//   4) Hiçbiri yoksa PDF kaydındaki soru sayısı (anahtarsız; puanlanamaz)
// Şıklar: anahtarda "E" varsa ya da (anahtar yokken) sınav TYT/AYT/YKS ise A–E, aksi halde LGS gibi A–D.

import { parseAnswerKey, type AnswerKeyMap } from './answerKey.ts';

export interface ExtractedAnswer {
  questionNo: number;
  correctAnswer: string | null;
  approvalStatus: string;
}

export interface AnswerSheetInput {
  extracted: ExtractedAnswer[];
  answerKeyRaw?: string | null;
  storedQuestionCount?: number | null;
  gradeLevel?: string | null;
}

export interface AnswerSheet {
  questionCount: number;
  letters: string[];
  key: AnswerKeyMap;
  keySource: 'approved_questions' | 'extracted_questions' | 'answer_key' | 'none';
}

const LETTERS_4 = ['A', 'B', 'C', 'D'];
const LETTERS_5 = ['A', 'B', 'C', 'D', 'E'];

function keyFrom(list: ExtractedAnswer[]): AnswerKeyMap {
  const key: AnswerKeyMap = {};
  for (const q of list) {
    const a = (q.correctAnswer || '').trim().toUpperCase();
    if (q.questionNo > 0 && /^[A-E]$/.test(a)) key[q.questionNo] = a;
  }
  return key;
}

export function resolveAnswerSheet(input: AnswerSheetInput): AnswerSheet {
  const approved = input.extracted.filter(q => q.approvalStatus === 'approved');
  const usable = input.extracted.filter(q => q.approvalStatus !== 'rejected');

  let key: AnswerKeyMap = {};
  let keySource: AnswerSheet['keySource'] = 'none';
  let countFromQuestions = 0;

  if (approved.length > 0) {
    key = keyFrom(approved);
    keySource = 'approved_questions';
    countFromQuestions = Math.max(...approved.map(q => q.questionNo));
  } else if (usable.length > 0) {
    key = keyFrom(usable);
    keySource = 'extracted_questions';
    countFromQuestions = Math.max(...usable.map(q => q.questionNo));
  }

  // Çıkarılmış sorularda cevap yoksa yükleme sırasındaki anahtar kullanılır
  if (Object.keys(key).length === 0) {
    const parsed = parseAnswerKey(input.answerKeyRaw);
    if (Object.keys(parsed).length > 0) {
      key = parsed;
      keySource = 'answer_key';
    } else {
      keySource = 'none';
    }
  }

  const keyMax = Object.keys(key).length ? Math.max(...Object.keys(key).map(Number)) : 0;
  const stored = Number(input.storedQuestionCount) || 0;
  const questionCount = countFromQuestions || keyMax || stored || 20;

  const keyLetters = Object.values(key);
  const fiveOptions = keyLetters.length > 0
    ? keyLetters.includes('E')
    : /\b(TYT|AYT|YKS)\b/i.test(input.gradeLevel || '');

  return { questionCount, letters: fiveOptions ? LETTERS_5 : LETTERS_4, key, keySource };
}

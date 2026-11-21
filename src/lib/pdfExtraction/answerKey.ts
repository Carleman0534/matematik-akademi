// Yükleme sırasında girilen cevap anahtarını soru numarası → şık eşlemesine çevirir.
// Desteklenen biçimler:
//   "ABCDA..."            → 1-A, 2-B, 3-C ...
//   "A B C D" / "A,B,C"   → sırayla
//   "1-A 2-C 3)B 4.D 5:A" → numaralı
//   Satır satır "1 A" / "1A"
export type AnswerKeyMap = Record<number, string>;

const VALID = /[A-E]/;

export function parseAnswerKey(raw: string | null | undefined): AnswerKeyMap {
  const out: AnswerKeyMap = {};
  if (!raw) return out;
  const text = raw.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I');

  if (/\d/.test(text)) {
    const re = /(\d{1,3})\s*[-–.):=]?\s*([A-E])(?![A-Z])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const no = Number(m[1]);
      if (no > 0 && !(no in out)) out[no] = m[2];
    }
    return out;
  }

  let n = 1;
  for (const ch of text) {
    if (VALID.test(ch)) out[n++] = ch;
  }
  return out;
}

// Soru metnindeki anahtar kelimelerden LGS konusunu tahmin eder (yapay zekâ kullanılmadığında).
// Kimlikler curriculum_topics tablosundaki ana konu kimlikleridir.

const RULES: { id: string; words: string[] }[] = [
  { id: 'top_carpanlar_katlar', words: ['ebob', 'ekok', 'çarpan', 'kat', 'asal', 'bölen', 'ortak bölen', 'ortak kat', 'aralarında asal'] },
  { id: 'top_uslu_ifadeler', words: ['üslü', 'üs', 'kuvvet', 'bilimsel gösterim', '10⁻', '^'] },
  { id: 'top_karekoklu_ifadeler', words: ['karekök', '√', 'tam kare', 'kök'] },
  { id: 'top_veri_analizi', words: ['grafik', 'sütun grafiği', 'çizgi grafiği', 'daire grafiği', 'tablo', 'veri'] },
  // "olasılı" kökü olasılık / olasılığı / olasılıklı biçimlerinin hepsini yakalar
  { id: 'top_olasilik', words: ['olasılı', 'olası durum', 'rastgele', 'zar', 'torba'] },
  { id: 'top_cebirsel_ifadeler', words: ['özdeşlik', 'cebirsel', 'çarpanlarına ayır', 'terim', '(a + b)', '(a+b)'] },
  { id: 'top_dogrusal_denklemler', words: ['doğrusal', 'eğim', 'koordinat', 'denklem', 'doğrunun', 'eksen'] },
  { id: 'top_esitsizlikler', words: ['eşitsizlik', 'en az', 'en fazla', 'sayı doğrusu', '≤', '≥'] },
  { id: 'top_ucgenler', words: ['üçgen', 'pisagor', 'hipotenüs', 'dik kenar', 'açıortay', 'kenarortay'] },
  { id: 'top_eslik_benzerlik', words: ['benzer', 'benzerlik', 'eş üçgen', 'benzerlik oranı', 'ölçek'] },
  { id: 'top_donusum_geometrisi', words: ['öteleme', 'yansıma', 'dönüşüm', 'simetri', 'ötelen'] },
  { id: 'top_geometrik_cisimler', words: ['prizma', 'silindir', 'hacim', 'yüzey alanı', 'koni', 'piramit', 'küp'] },
];

export function guessTopicId(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = ' ' + text.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ') + ' ';
  let best: { id: string; score: number } | null = null;
  for (const rule of RULES) {
    let score = 0;
    for (const w of rule.words) {
      // tek heceli kısa kelimeler ("üs", "kat", "kök") yalnızca tam kelime olarak sayılır
      if (w.length <= 3 && /^[a-zçğıöşü]+$/.test(w)) {
        const re = new RegExp(`[^a-zçğıöşü]${w}[^a-zçğıöşü]`, 'g');
        score += (t.match(re) || []).length;
      } else {
        let idx = t.indexOf(w);
        while (idx !== -1) { score += w.length > 6 ? 2 : 1; idx = t.indexOf(w, idx + w.length); }
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { id: rule.id, score };
  }
  return best ? best.id : null;
}

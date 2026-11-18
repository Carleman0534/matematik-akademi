// Soru metninden LGS matematik ünitesini / alt konusunu tahmin eder (anahtar sözcük kuralları; yapay zekâ gerekmez).
// Emin olamazsa null döner → soru "konusuz" kalır ve öğretmen elle seçer. Bu dosya saf (tarayıcı/DB gerektirmez) → logic.test.ts

export interface TopicRow { id: string; parent_id: string | null; name: string; grade_level: number | null }
export interface Guess { unit: string; sub: string | null; score: number }

// Türkçe harfleri sadeleştirip büyük harfe çevirir: "Kareköklü" → "KAREKOKLU"
export function fold(s: string): string {
  return s.replace(/İ/g, 'I').replace(/ı/g, 'I').toLocaleUpperCase('tr')
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/\s+/g, ' ');
}

type Kw = [string, number];   // [aranan kelime parçası, ağırlık: 3 güçlü · 2 orta · 1 zayıf]
const UNITS: Record<string, Kw[]> = {
  'Çarpanlar ve Katlar': [['EBOB', 3], ['EKOK', 3], ['ORTAK BOLEN', 3], ['ORTAK KAT', 3], ['ASAL CARPAN', 3], ['ASAL SAYI', 2], ['POZITIF CARPAN', 3], ['CARPANLARI', 2], ['ARALARINDA ASAL', 3], ['ASAL', 1], ['BOLENLERI', 1]],
  'Üslü İfadeler': [['USLU', 3], ['BILIMSEL GOSTERIM', 3], ['KUVVET', 2], ['USSU', 2], ['10 UZERI', 3], ['TABAN', 1]],
  'Kareköklü İfadeler': [['KAREKOK', 3], ['KOKLU', 3], ['TAM KARE', 2], ['IRRASYONEL', 3], ['GERCEL SAYI', 2], ['ONDALIK', 1]],
  'Veri Analizi': [['SUTUN GRAFIK', 3], ['DAIRE GRAFIK', 3], ['CIZGI GRAFIK', 3], ['GRAFIK', 2], ['TABLO', 1], ['VERI', 2], ['ORTALAMA', 2], ['MEDYAN', 3], ['TEPE DEGER', 3], ['ACIKLIK', 3]],
  'Basit Olayların Olma Olasılığı': [['OLASILIK', 3], ['OLAY', 1], ['ZAR', 2], ['PARA ATIL', 3], ['TORBA', 2], ['RASTGELE', 2], ['KURA', 2], ['TOP CEKIL', 3], ['OLASI DURUM', 3]],
  'Cebirsel İfadeler ve Özdeşlikler': [['OZDESLIK', 3], ['CARPANLARA AYIR', 3], ['CEBIRSEL', 3], ['IFADENIN KATSAYI', 2], ['TAM KARE IFADE', 2], ['KARELER FARKI', 3]],
  'Doğrusal Denklemler': [['EGIM', 3], ['KOORDINAT', 3], ['DOGRUSAL', 3], ['ANALITIK DUZLEM', 3], ['DENKLEM', 2], ['EKSENI', 2], ['Y EKSEN', 2], ['X EKSEN', 2]],
  'Eşitsizlikler': [['ESITSIZLIK', 3], ['SAYI DOGRUSU', 2], ['EN AZ', 1], ['EN FAZLA', 1], ['EN BUYUK TAM SAYI', 2], ['EN KUCUK TAM SAYI', 2]],
  'Üçgenler': [['UCGEN', 2], ['PISAGOR', 3], ['UCGEN ESITSIZLIGI', 3], ['HIPOTENUS', 3], ['KENAR UZUNLUK', 1], ['DIK UCGEN', 2], ['KENAR', 1], ['ACI', 1]],
  'Eşlik ve Benzerlik': [['BENZERLIK', 3], ['BENZER', 3], ['ESLIK', 3], ['ES SEKIL', 3], ['ES UCGEN', 3], ['ORANTILI', 1]],
  'Dönüşüm Geometrisi': [['OTELEME', 3], ['OTELE', 3], ['YANSIMA', 3], ['DONUSUM', 3], ['SIMETRI', 2], ['DONDUR', 3], ['ONUN YANSI', 3]],
  'Geometrik Cisimler': [['SILINDIR', 3], ['PRIZMA', 3], ['PIRAMIT', 3], ['KONI', 3], ['HACIM', 3], ['YUZEY ALAN', 3], ['DIK DAIRESEL', 3], ['KUP', 2], ['DIKDORTGENLER PRIZMASI', 3]],
};

// Alt konu ipuçları (ünite seçildikten sonra; yalnızca açık işaret varsa)
const SUBS: Record<string, Kw[]> = {
  'EBOB': [['EBOB', 3], ['EN BUYUK ORTAK BOLEN', 3]],
  'EKOK': [['EKOK', 3], ['EN KUCUK ORTAK KAT', 3]],
  'Aralarında asal sayılar': [['ARALARINDA ASAL', 3]],
  'Pozitif tam sayıların çarpanları': [['ASAL CARPAN', 2], ['POZITIF CARPAN', 3], ['CARPANLARI', 2]],
  'Bilimsel gösterim': [['BILIMSEL GOSTERIM', 3], ['10 UZERI', 2]],
  'Tam kare doğal sayılar': [['TAM KARE', 3]],
  'Ondalık ifadelerin karekökü': [['ONDALIK', 2]],
  'Gerçek sayılar': [['GERCEL SAYI', 3], ['IRRASYONEL', 3]],
  'Daire grafikleri': [['DAIRE GRAFIK', 3]],
  'Çizgi ve sütun grafikleri': [['SUTUN GRAFIK', 3], ['CIZGI GRAFIK', 3]],
  'Eş olasılıklı olaylar': [['ES OLASILIK', 3]],
  'Özdeşlikler': [['OZDESLIK', 3], ['KARELER FARKI', 3]],
  'Çarpanlara ayırma': [['CARPANLARA AYIR', 3]],
  'Doğrunun eğimi': [['EGIM', 3]],
  'Koordinat sistemi': [['KOORDINAT', 3]],
  'Eşitsizliklerin sayı doğrusunda gösterimi': [['SAYI DOGRUSU', 3]],
  'Pisagor bağıntısı': [['PISAGOR', 3], ['HIPOTENUS', 3]],
  'Üçgen eşitsizliği': [['UCGEN ESITSIZLIGI', 3]],
  'Benzer şekiller': [['BENZER', 3]],
  'Benzerlik oranı': [['BENZERLIK ORANI', 3]],
  'Eş şekiller': [['ES SEKIL', 3], ['ESLIK', 3]],
  'Öteleme': [['OTELE', 3]],
  'Yansıma': [['YANSIMA', 3]],
  'Prizmalar': [['PRIZMA', 3]],
  'Dik dairesel silindir': [['SILINDIR', 3]],
  'Dik piramit ve koni': [['PIRAMIT', 3], ['KONI', 3]],
};

function score(text: string, kws: Kw[]): number {
  let s = 0;
  for (const [k, w] of kws) if (text.includes(k)) s += w;
  return s;
}

// Yeterince güçlü ve ikinci adaydan belirgin üstünse ünite (ve varsa alt konu) döner
export function guessTopic(rawText: string): Guess | null {
  const text = fold(rawText);
  if (text.replace(/[^A-Z]/g, '').length < 12) return null;   // neredeyse metinsiz (yalnızca şekil) → tahmin yok
  const ranked = Object.entries(UNITS).map(([unit, kws]) => ({ unit, score: score(text, kws) })).sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  if (best.score < 3 || best.score - (second?.score ?? 0) < 2) return null;
  let sub: string | null = null, subScore = 0;
  for (const [name, kws] of Object.entries(SUBS)) {
    const sc = score(text, kws);
    if (sc >= 3 && sc > subScore) { sub = name; subScore = sc; }
  }
  return { unit: best.unit, sub, score: best.score };
}

// Tahmini veritabanındaki konu kimliğine çevirir: 8. sınıf ünitesi (ad eşleşmesi) → varsa alt konusu; bulunamazsa null (konusuz)
export function resolveTopicId(g: Guess | null, topics: TopicRow[]): string | null {
  if (!g) return null;
  const nm = (s: string) => fold(s);
  const unit = topics.find(t => !t.parent_id && t.grade_level === 8 && nm(t.name) === nm(g.unit));
  if (!unit) return null;
  if (g.sub) {
    const sub = topics.find(t => t.parent_id === unit.id && nm(t.name) === nm(g.sub!));
    if (sub) return sub.id;
  }
  return unit.id;
}

// Bölüm adı matematik mi? (LGS'de "Matematik"; lise kitapçıklarında "Geometri" de matematik sayılır)
export const isMathSection = (s: string | null) => s === 'Matematik' || s === 'Geometri';

// Hangi sayfalar işlenmeli? Bölümler bulunduysa yalnızca matematik; hiç bölüm yoksa (tek dersli PDF) hepsi.
export function selectMathPages(pageSections: Map<number, string | null>): { keep: Set<number>; found: string[]; hasMath: boolean } {
  const found = [...new Set([...pageSections.values()].filter((s): s is string => !!s))];
  const hasMath = found.some(isMathSection);
  const keep = new Set<number>();
  for (const [p, s] of pageSections) {
    if (!found.length) keep.add(p);                 // bölüm başlığı hiç bulunamadı: tek dersli PDF
    else if (isMathSection(s)) keep.add(p);
  }
  return { keep, found, hasMath };
}

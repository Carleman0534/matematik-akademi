// LGS Matematik Yapay Zekâ Soru Üretim Motoru
// Gemini API entegrasyonu + Çoklu Arşetip Soru Fabrikası & Matematik Doğrulama

import { findTopicById, getTopicFullName } from './lgsCurriculum.ts';
import { validateQuestionStructure, checkDuplicateQuestion } from './mathValidator.ts';
import { generateMathematicalSvg, type SvgVisualType } from './svgGenerator.ts';

export interface GenerateQuestionParams {
  topicId: string;
  subtopicId?: string;
  difficulty: number; // 1 to 5
  questionType: 'yeni_nesil' | 'problem_cozme' | 'gunluk_yasam' | 'grafik_tablo' | 'geometrik_gorsel' | 'akil_yurutme' | 'temel_islem';
  visualRequired?: boolean;
  contextHint?: string;
  variationIndex?: number;
}

export interface GeneratedQuestionResult {
  id: string;
  topicId: string;
  subtopicId: string | null;
  topicName: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  solutionExplanation: string;
  difficulty: number;
  questionType: string;
  svgContent?: string;
  skillCategory: string;
  mathValidationStatus: 'verified' | 'warning' | 'failed';
  validationNotes: string;
  isAiGenerated: boolean;
  createdAt: string;
}

function assembleOptions(
  correctKey: 'A' | 'B' | 'C' | 'D',
  correctVal: string,
  d1: string,
  d2: string,
  d3: string
): Record<string, string> {
  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const distractors = [d1, d2, d3];
  const options: Record<string, string> = {};
  let dIdx = 0;
  for (const k of keys) {
    if (k === correctKey) {
      options[k] = correctVal;
    } else {
      options[k] = distractors[dIdx++];
    }
  }
  return options;
}

// Deterministik çoklu arşetip LGS soru havuzu fabrikası
export function generateCurriculumQuestion(params: GenerateQuestionParams): GeneratedQuestionResult {
  const { topicId, subtopicId, difficulty, questionType, visualRequired, variationIndex = 0 } = params;
  const topicName = getTopicFullName(subtopicId || topicId);

  let qText = '';
  let options: Record<string, string> = { A: '', B: '', C: '', D: '' };
  const targetKey: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  let correct: 'A' | 'B' | 'C' | 'D' = targetKey[(variationIndex + difficulty) % 4];
  let solution = '';
  let svgContent: string | undefined = undefined;
  let skill = 'Mantıksal Akıl Yürütme ve Problem Çözme';

  const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
  const lcm = (x: number, y: number): number => (x * y) / gcd(x, y);

  // 1. ÇARPANLAR VE KATLAR
  if (topicId.includes('carpanlar') || topicId.includes('01')) {
    const arch = variationIndex % 5;
    if (arch === 0) {
      skill = 'EBOB: Farklı Sıvıların Eşit Hacimli Kaplara Paylaştırılması';
      const a = 120 + (difficulty * 24);
      const b = 180 + (difficulty * 36);
      const ebobVal = gcd(a, b);
      const paketSayisi = (a / ebobVal) + (b / ebobVal);

      qText = `Bir üretici, ${a} litre zeytinyağı ile ${b} litre ayçiçek yağını birbirine karıştırmadan ve hiç artmayacak şekilde eşit hacimli en büyük bidonlara dolduracaktır.\n\nBuna göre bu işlem için **en az kaç bidona** ihtiyaç vardır?`;
      options = assembleOptions(
        correct,
        `${paketSayisi}`,
        `${paketSayisi + 2}`,
        `${paketSayisi - 1}`,
        `${ebobVal}`
      );
      solution = `1. Adım: Bidonların en büyük hacimde olması için EBOB(${a}, ${b}) = ${ebobVal} L (her bidonun kapasitesi).\n2. Adım: Zeytinyağı için ${a} ÷ ${ebobVal} = ${a / ebobVal} bidon.\n3. Adım: Ayçiçek yağı için ${b} ÷ ${ebobVal} = ${b / ebobVal} bidon.\nToplam en az: ${paketSayisi} bidon gereklidir. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'bar_chart',
          title: 'Zeytinyağı & Ayçiçek Yağı Bidon Paylaşımı',
          labels: ['Zeytinyağı', 'Ayçiçek', 'Bidon Hacmi'],
          values: [a, b, ebobVal]
        });
      }
    } else if (arch === 1) {
      skill = 'EKOK: İki Farklı Periyotta Çalışan Hatların Ortak Seferi';
      const p1 = 30 + (difficulty * 5); // 35, 40, 45...
      const p2 = 45 + (difficulty * 5); // 50, 55, 60...
      const ekokDk = lcm(p1, p2);
      const ekokSaat = Math.floor(ekokDk / 60);
      const ekokKalanDk = ekokDk % 60;
      const startHour = 8;
      const nextHour = startHour + ekokSaat;
      const timeStr = `${String(nextHour).padStart(2, '0')}:${String(ekokKalanDk).padStart(2, '0')}`;

      qText = `Aynı duraktan hareket eden iki otobüsten A otobüsü her ${p1} dakikada bir, B otobüsü ise her ${p2} dakikada bir sefere çıkmaktadır.\nBu iki otobüs ilk kez saat 08:00'de birlikte sefere çıktıklarına göre, **ikinci kez saat kaçta** yine birlikte sefere çıkarlar?`;
      options = assembleOptions(
        correct,
        `${timeStr}`,
        `10:30`,
        `12:00`,
        `11:45`
      );
      solution = `1. Adım: Birlikte hareket periyodu için EKOK(${p1}, ${p2}) bulunur.\nEKOK(${p1}, ${p2}) = ${ekokDk} dakika = ${ekokSaat} saat ${ekokKalanDk} dakika.\n2. Adım: 08:00 + ${ekokDk} dk = ${timeStr}.\nDoğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'EBOB: Dikdörtgen Arsa Kenarlarına Eşit Aralıklı Direk Dikimi';
      const kisa = 48 + (difficulty * 12);
      const uzun = 72 + (difficulty * 12);
      const aralik = gcd(kisa, uzun);
      const cevre = 2 * (kisa + uzun);
      const direkSayisi = cevre / aralik;

      qText = `Kenar uzunlukları ${kisa} metre ve ${uzun} metre olan dikdörtgen biçimindeki bir parkın kenarlarına, köşelerine de gelmek şartıyla eşit aralıklarla aydınlatma direkleri dikilecektir.\n\nBuna göre iki direk arasındaki mesafe en fazla tutulduğunda **en az kaç direk** dikilir?`;
      options = assembleOptions(
        correct,
        `${direkSayisi}`,
        `${direkSayisi + 4}`,
        `${direkSayisi - 2}`,
        `${aralik}`
      );
      solution = `1. Adım: Direkler arası en büyük eşit mesafe EBOB(${kisa}, ${uzun}) = ${aralik} metre.\n2. Adım: Parkın çevresi = 2 × (${kisa} + ${uzun}) = ${cevre} m.\n3. Adım: Direk sayısı = Çevre ÷ Aralık = ${cevre} ÷ ${aralik} = ${direkSayisi} direk. Doğru cevap ${correct}.`;
    } else if (arch === 3) {
      skill = 'EKOK: Dikdörtgen Kartonlarla Kare Zemin Kaplama';
      const e1 = 15;
      const e2 = 20;
      const kareKenar = lcm(e1, e2);
      const toplamFayans = (kareKenar / e1) * (kareKenar / e2);

      qText = `Boyutları ${e1} cm ve ${e2} cm olan dikdörtgen şeklindeki özdeş fayanslar aralarında boşluk kalmayacak ve üst üste gelmeyecek biçimde yan yana dizilerek karesel bir zemin kaplanacaktır.\n\nBuna göre oluşturulabilecek **en küçük karesel zemin için en az kaç fayans** gereklidir?`;
      options = assembleOptions(
        correct,
        `${toplamFayans}`,
        `${kareKenar}`,
        `${toplamFayans + 6}`,
        `${(kareKenar / e1) + (kareKenar / e2)}`
      );
      solution = `1. Adım: Karenin bir kenarı EKOK(${e1}, ${e2}) = ${kareKenar} cm olmalıdır.\n2. Adım: Yatayda ${kareKenar} ÷ ${e2} = ${kareKenar / e2} fayans, dikeyde ${kareKenar} ÷ ${e1} = ${kareKenar / e1} fayans gerekir.\n3. Adım: Toplam fayans = ${kareKenar / e1} × ${kareKenar / e2} = ${toplamFayans} adet. Doğru cevap ${correct}.`;
    } else {
      skill = 'Asal Çarpanlar ve Pozitif Tam Sayı Bölenleri';
      const sayi = 72 + (difficulty * 12);
      // Pozitif bölen sayısı
      let count = 0;
      for (let d = 1; d <= sayi; d++) {
        if (sayi % d === 0) count++;
      }
      qText = `Bir okul kütüphanesindeki ${sayi} adet dolabın anahtarları 1'den ${sayi}'ye kadar numaralandırılmıştır. Yalnızca dolap numarasının pozitif tam sayı bölenlerine karşılık gelen anahtarlar kilidi açabilmektedir.\n\nBuna göre ${sayi} numaralı dolabı açabilecek **kaç farklı anahtar** vardır?`;
      options = assembleOptions(
        correct,
        `${count}`,
        `${count - 2}`,
        `${count + 3}`,
        `${count + 5}`
      );
      solution = `1. Adım: Bir sayının pozitif bölen sayısı, sayının asal çarpanlarına ayrılarak üslerin birer fazlasının çarpımıyla bulunur.\n2. Adım: ${sayi} sayısının pozitif tam sayı bölen sayısı ${count} tanedir.\nDoğru cevap ${correct}.`;
    }

  // 2. ÜSLÜ İFADELER
  } else if (topicId.includes('uslu') || topicId.includes('02')) {
    const arch = variationIndex % 5;
    if (arch === 0) {
      skill = 'Üslü Sayılarda Bölünme ve Kat Problemleri';
      const us1 = 6 + difficulty;
      qText = `Bir laboratuvarda çoğaltılan bakteri türü her 1 saatte 2 katına çıkmaktadır. Deneyin başında tüpte 2⁴ adet bakteri bulunmaktadır.\n\nBuna göre ${us1} saat sonra tüpteki bakteri sayısı başlangıçtaki bakteri sayısının **kaç katı** olur?`;
      options = assembleOptions(
        correct,
        `2^${us1}`,
        `2^${us1 + 4}`,
        `2^${us1 - 1}`,
        `2^${us1 * 2}`
      );
      solution = `1. Adım: Her saat 2 katına çıkan bakteri ${us1} saatte 2^${us1} katına ulaşır.\n2. Adım: Başlangıçtaki sayının kaç katı olduğu sorulduğu için doğrudan 2^${us1} katı olur. Doğru cevap ${correct}.`;
    } else if (arch === 1) {
      skill = 'Bilimsel Gösterim ve Çok Büyük Sayılar';
      const fidan = 125000;
      const emilim = 24; // kg
      // Toplam gram: fidan * emilim * 1000 = 125000 * 24 * 1000 = 3,000,000,000 = 3 * 10^9
      qText = `Ağaçlandırma kampanyası kapsamında bir ormana ${fidan.toLocaleString('tr-TR')} adet fidan dikilmiştir. Her bir fidan yılda ortalama ${emilim} kg karbondioksit (CO₂) gazını temizlemektedir.\n\nBuna göre bu fidanların 1 yılda temizlediği toplam karbondioksit miktarının **gram cinsinden bilimsel gösterimi** aşağıdakilerden hangisidir? (1 kg = 10³ g)`;
      options = assembleOptions(
        correct,
        '3 × 10⁹',
        '3 × 10⁸',
        '0,3 × 10¹⁰',
        '30 × 10⁷'
      );
      solution = `1. Adım: Toplam kg = ${fidan} × ${emilim} = 3.000.000 kg.\n2. Adım: Grama çevir = 3.000.000 × 10³ = 3.000.000.000 g = 3 × 10⁹ g.\n3. Adım: 1 ≤ |a| < 10 şartı sağlandığından bilimsel gösterim 3 × 10⁹ dur. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Dijital Bellek Birimleri ve Üslü Sayılarda Bölme';
      const gbKapasite = Math.pow(2, 5); // 32 GB = 2^5 GB
      // 1 GB = 2^10 MB -> 2^5 * 2^10 = 2^15 MB.
      // Her dosya 2^6 MB (64 MB) -> 2^15 / 2^6 = 2^9 = 512 dosya.
      qText = `1 GB = 2¹⁰ MB dir. 32 GB (2⁵ GB) kapasiteli bir flaş belleğin tamamına, her birinin boyutu 64 MB (2⁶ MB) olan matematik konu anlatım videoları yüklenecektir.\n\nBuna göre bu belleğe **en fazla kaç adet video dosyası** sığdırılabilir?`;
      options = assembleOptions(
        correct,
        '2⁹ (512)',
        '2⁸ (256)',
        '2¹⁰ (1024)',
        '2⁷ (128)'
      );
      solution = `1. Adım: Toplam kapasite = 2⁵ × 2¹⁰ = 2¹⁵ MB.\n2. Adım: Dosya sayısı = 2¹⁵ ÷ 2⁶ = 2^(15 - 6) = 2⁹ = 512 adet.\nDoğru cevap ${correct}.`;
    } else if (arch === 3) {
      skill = 'Kağıt Katlama ve Üslü Alan Değişimi';
      const kenarUs = 6 + Math.min(2, difficulty);
      const katSayisi = 3;
      // Alan = (2^kenarUs)^2 = 2^(2 * kenarUs). Her katlamada yarıya iner: 2^(2 * kenarUs - katSayisi)
      const kalanUs = (2 * kenarUs) - katSayisi;
      qText = `Bir kenar uzunluğu 2^${kenarUs} cm olan kare biçimindeki bir el işi kağıdı, kenarlarının orta noktalarından ardışık olarak ${katSayisi} kez tam ortasından ikiye katlanıyor.\n\nSon durumda elde edilen katlanmış şeklin bir yüzünün **alanı kaç cm²** olur?`;
      options = assembleOptions(
        correct,
        `2^${kalanUs}`,
        `2^${kalanUs + 1}`,
        `2^${kalanUs - 2}`,
        `2^${2 * kenarUs}`
      );
      solution = `1. Adım: Başlangıçtaki alan = (2^${kenarUs})² = 2^${2 * kenarUs} cm².\n2. Adım: Her ikiye katlamada yüzey alanı yarıya düşer (÷2).\n3. Adım: ${katSayisi} katlama sonucu: 2^${2 * kenarUs} ÷ 2^${katSayisi} = 2^${kalanUs} cm² bulunur. Doğru cevap ${correct}.`;
    } else {
      skill = 'Üslü İfadelerde Taban Değiştirme ve Sıralama';
      qText = `a = 2⁶⁰, b = 3⁴⁰, c = 5²⁰ sayıları verilmiştir.\n\nBuna göre a, b ve c sayılarının **küçükten büyüğe doğru sıralanışı** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        'c < a < b',
        'a < b < c',
        'c < b < a',
        'b < a < c'
      );
      solution = `1. Adım: Üsler 20 tabanında eşitlenir: EBOB(60, 40, 20) = 20.\n2. Adım: a = (2³)²⁰ = 8²⁰, b = (3²)²⁰ = 9²⁰, c = (5¹)²⁰ = 5²⁰.\n3. Adım: Tabanlar 5 < 8 < 9 olduğundan c < a < b sıralaması elde edilir. Doğru cevap ${correct}.`;
    }

  // 3. KAREKÖKLÜ İFADELER
  } else if (topicId.includes('karekok') || topicId.includes('03')) {
    const arch = variationIndex % 5;
    if (arch === 0) {
      skill = 'Kareköklü Sayıların Doğal Sayı Yaklaşımı';
      const alan = 100 + (difficulty * 25);
      const yaklasik = Math.sqrt(alan);
      const alt = Math.floor(yaklasik);
      const ust = Math.ceil(yaklasik);

      qText = `Alanı ${alan} m² olan kare şeklindeki bir bahçenin bir kenar uzunluğu metre cinsinden hangi ardışık iki tam sayı arasındadır?`;
      options = assembleOptions(
        correct,
        `${alt} ile ${ust}`,
        `${alt - 1} ile ${alt}`,
        `${ust} ile ${ust + 1}`,
        `${Math.floor(alan / 4)} ile ${Math.floor(alan / 4) + 1}`
      );
      solution = `1. Adım: Karenin bir kenarı √${alan} metredir.\n2. Adım: ${alt}² = ${alt * alt} ve ${ust}² = ${ust * ust} olduğundan;\n${alt * alt} < ${alan} < ${ust * ust} eşitsizliği sağlanır.\n3. Adım: Dolayısıyla bir kenar uzunluğu ${alt} ile ${ust} arasındadır. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'square_area',
          title: 'Karesel Bölge Alan-Kenar İlişkisi',
          params: { area: alan, side: `√${alan} m` }
        });
      }
    } else if (arch === 1) {
      skill = 'a√b Biçiminde Yazma ve Çevreye Tel Çekme';
      // Kenarlar: sqrt(48) = 4sqrt(3), sqrt(75) = 5sqrt(3) -> Çevre = 2 * (9sqrt(3)) = 18sqrt(3).
      // 2 sıra tel = 36sqrt(3).
      qText = `Kenar uzunlukları √48 metre ve √75 metre olan dikdörtgen biçimindeki bir arsanın çevresine 2 sıra tel çekilecektir.\n\nBuna göre çekilecek telin **toplam uzunluğu kaç metredir?**`;
      options = assembleOptions(
        correct,
        '36√3 m',
        '18√3 m',
        '24√3 m',
        '45√3 m'
      );
      solution = `1. Adım: Kenarlar a√b biçiminde yazılır: √48 = 4√3 m, √75 = 5√3 m.\n2. Adım: Arsanın çevresi = 2 × (4√3 + 5√3) = 2 × 9√3 = 18√3 m.\n3. Adım: 2 sıra tel için 2 × 18√3 = 36√3 metre tele ihtiyaç vardır. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Kareköklü Çarpma ve Doğal Sayı Alan';
      // sqrt(18) = 3sqrt(2), sqrt(32) = 4sqrt(2) -> Alan = 3sqrt(2) * 4sqrt(2) = 12 * 2 = 24.
      qText = `Kenar uzunlukları √18 cm ve √32 cm olan dikdörtgen şeklindeki bir kartonun **alanı kaç santimetrekaredir?**`;
      options = assembleOptions(
        correct,
        '24',
        '12√2',
        '48',
        '18'
      );
      solution = `1. Adım: √18 = 3√2 cm ve √32 = 4√2 cm.\n2. Adım: Alan = 3√2 × 4√2 = (3 × 4) × (√2 × √2) = 12 × 2 = 24 cm².\nDoğru cevap ${correct}.`;
    } else if (arch === 3) {
      skill = 'Katsayıyı Kök İçine Alma ve Yükseklik Limiti';
      // Kamyon = 3sqrt(5) = sqrt(45) ~ 6.70 m. Köprü tabelası bundan büyük olmalı.
      qText = `Yüksekliği 3√5 metre olan bir nakliye tırı, yüksekliği tabelada yazılı olan bir alt geçidin altından geçecektir.\n\nTırın alt geçitten **güvenle geçebilmesi için** tabelada yazan yükseklik sınırı aşağıdakilerden hangisi olabilir?`;
      options = assembleOptions(
        correct,
        '√48 metre',
        '√40 metre',
        '√36 metre',
        '√42 metre'
      );
      solution = `1. Adım: Tırın yüksekliği kök içine alınır: 3√5 = √(3² × 5) = √(9 × 5) = √45 m.\n2. Adım: Tırın geçebilmesi için tabeladaki yüksekliğin √45'ten büyük olması gerekir.\n3. Adım: Şıklar incelendiğinde √48 > √45 olduğundan güvenle geçebilir. Doğru cevap ${correct}.`;
    } else {
      skill = 'Kareköklü İfadelerde Toplama ve Çıkarma';
      // Çıta = sqrt(200) = 10sqrt(2). Kesilenler: sqrt(18) = 3sqrt(2) ve sqrt(32) = 4sqrt(2). Kalan = 3sqrt(2) = sqrt(18).
      qText = `Uzunluğu √200 cm olan tahta bir çıtanın bir ucundan √18 cm, diğer ucundan ise √32 cm uzunluğunda iki parça kesilip atılmıştır.\n\nBuna göre geriye kalan tahta çıtanın **uzunluğu kaç santimetredir?**`;
      options = assembleOptions(
        correct,
        '3√2 (√18)',
        '4√2 (√32)',
        '5√2 (√50)',
        '2√2 (√8)'
      );
      solution = `1. Adım: Tüm sayılar a√b biçiminde yazılır: √200 = 10√2, √18 = 3√2, √32 = 4√2.\n2. Adım: Kesilen toplam miktar = 3√2 + 4√2 = 7√2 cm.\n3. Adım: Kalan parça = 10√2 - 7√2 = 3√2 cm (√18 cm). Doğru cevap ${correct}.`;
    }

  // 4. VERİ ANALİZİ
  } else if (topicId.includes('veri') || topicId.includes('04')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Daire Grafiği Yorumlama ve Merkez Açı';
      qText = `Bir öğrencinin 3 günde çözdüğü matematik sorularının türlerine göre dağılımı yandaki daire grafiğinde gösterilmiştir.\nÖğrenci toplam 360 soru çözdüğüne ve Sayılar kategorisinin merkez açısı 150° olduğuna göre, **Sayılar kategorisine ait soru sayısı** kaçtır?`;
      options = assembleOptions(
        correct,
        '150',
        '120',
        '180',
        '90'
      );
      solution = `1. Adım: Daire grafiği 360° dir. Toplam 360 soru olduğundan her 1° tam 1 soruya karşılık gelir.\n2. Adım: 150° merkez açı 150 soruya eşittir. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'pie_chart',
          title: '360° Soru Türü Dağılımı',
          labels: ['Cebir (120°)', 'Geometri (90°)', 'Sayılar (150°)']
        });
      }
    } else if (arch === 1) {
      skill = 'Daire Grafiğinden Sütun Grafiğine Dönüştürme';
      const toplamOgrenci = 720;
      // Spor: 120°, Müzik: 60°. Fark 60°. Her 1° = 720 / 360 = 2 öğrenci. Fark = 120 öğrenci.
      qText = `Bir okuldaki ${toplamOgrenci} öğrencinin katıldıkları sosyal kulüplere göre dağılımı bir daire grafiğinde gösterilmiştir. Spor kulübünün merkez açısı 120°, Müzik kulübünün merkez açısı ise 60° dir.\n\nBuna göre Spor kulübünü seçen öğrenci sayısı, Müzik kulübünü seçenlerden **kaç fazladır?**`;
      options = assembleOptions(
        correct,
        '120',
        '240',
        '90',
        '60'
      );
      solution = `1. Adım: Her 1° ye düşen öğrenci = ${toplamOgrenci} ÷ 360 = 2 öğrenci.\n2. Adım: Spor = 120 × 2 = 240 öğrenci, Müzik = 60 × 2 = 120 öğrenci.\n3. Adım: Fark = 240 - 120 = 120 öğrenci. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Aritmetik Ortalama ve Açıklık Karşılaştırması';
      const netler = [14, 16, 18, 15, 17];
      const toplam = netler.reduce((acc, v) => acc + v, 0);
      const ortalama = toplam / netler.length;
      const aciklik = Math.max(...netler) - Math.min(...netler);

      qText = `Bir LGS öğrencisinin son 5 matematik denemesinde yaptığı doğru soru sayıları sırasıyla 14, 16, 18, 15 ve 17'dir.\n\nBu veri grubunun **aritmetik ortalaması ile açıklığının toplamı** kaçtır?`;
      options = assembleOptions(
        correct,
        `${ortalama + aciklik} (Ort: ${ortalama}, Açıklık: ${aciklik})`,
        `${ortalama + aciklik + 2}`,
        `${ortalama}`,
        `${ortalama + aciklik - 3}`
      );
      solution = `1. Adım: Aritmetik ortalama = (${netler.join(' + ')}) ÷ 5 = ${toplam} ÷ 5 = ${ortalama}.\n2. Adım: Açıklık = En büyük (18) - En küçük (14) = ${aciklik}.\n3. Adım: Toplam = ${ortalama} + ${aciklik} = ${ortalama + aciklik}. Doğru cevap ${correct}.`;
    } else {
      skill = 'Çizgi Grafiği Trend ve Değişim Analizi';
      qText = `Bir teknoloji mağazasında Pazartesi 20, Salı 35, Çarşamba 25, Perşembe 40 tablet satılmıştır.\n\nBu 4 günde satılan ortalama günlük tablet sayısı kaçtır?`;
      options = assembleOptions(
        correct,
        '30',
        '28',
        '32',
        '25'
      );
      solution = `1. Adım: Toplam satış = 20 + 35 + 25 + 40 = 120 tablet.\n2. Adım: Günlük ortalama = 120 ÷ 4 = 30 tablet. Doğru cevap ${correct}.`;
    }

  // 5. BASİT OLAYLARIN OLMA OLASILIĞI
  } else if (topicId.includes('olasilik') || topicId.includes('05')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Geometrik Çark ve Olasılık Hesabı';
      qText = `Yanda 4 eş bölgeye ayrılmış (Kırmızı, Mavi, Sarı, Yeşil) bir şans çarkı verilmiştir. Çark bir kez döndürüldüğünde ibrenin **Kırmızı veya Mavi** bölgede durma olasılığı kaçtır?`;
      options = assembleOptions(
        correct,
        '1/2',
        '1/4',
        '3/4',
        '1'
      );
      solution = `1. Adım: İstenen durum sayısı = 2 (Kırmızı, Mavi).\n2. Adım: Tüm durumlar = 4.\n3. Adım: Olasılık = 2/4 = 1/2 dir. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'probability_spinner',
          title: '4 Bölmeli Olasılık Çarkı'
        });
      }
    } else if (arch === 1) {
      skill = 'Torbadan Bilye Çekme: Olayın Olmama Olasılığı';
      const k = 8;
      const m = 12;
      const s = 10;
      const toplam = k + m + s; // 30
      // Mavi olmama: (k + s) / 30 = 18 / 30 = 3/5.
      qText = `Bir torbada aynı büyüklükte ${k} kırmızı, ${m} mavi ve ${s} sarı bilye bulunmaktadır. Torbadan rastgele çekilen bir bilyenin **mavi olmama** olasılığı kaçtır?`;
      options = assembleOptions(
        correct,
        '3/5',
        '2/5',
        '1/3',
        '4/5'
      );
      solution = `1. Adım: Toplam bilye = ${k} + ${m} + ${s} = ${toplam}.\n2. Adım: Mavi olmayan bilye sayısı = ${k} + ${s} = 18.\n3. Adım: Olasılık = 18/30 = 3/5 tir. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Kart Numaralandırma ve Asal Sayı Olasılığı';
      // 1'den 20'ye: 20 kart. Asallar: 2, 3, 5, 7, 11, 13, 17, 19 (8 tane). 8/20 = 2/5.
      qText = `Üzerinde 1'den 20'ye kadar (1 ve 20 dahil) doğal sayıların yazılı olduğu özdeş kartlar bir torbaya atılıyor. Torbadan rastgele çekilen bir kartın üzerinde yazan sayının **asal sayı olma olasılığı** kaçtır?`;
      options = assembleOptions(
        correct,
        '2/5',
        '1/2',
        '3/10',
        '9/20'
      );
      solution = `1. Adım: 1 ile 20 arasındaki asal sayılar: 2, 3, 5, 7, 11, 13, 17, 19 olmak üzere 8 tanedir.\n2. Adım: Toplam kart sayısı = 20.\n3. Adım: Olasılık = 8/20 = 2/5 tir. Doğru cevap ${correct}.`;
    } else {
      skill = 'İki Nitelikli Gruptan Rastgele Seçim';
      // 12 kız, 16 erkek. Kızların 4'ü, erkeklerin 6'sı gözlüklü. Toplam 28. Gözlüksüz kız: 12 - 4 = 8. 8 / 28 = 2/7.
      qText = `Bir sınıfta 12 kız ve 16 erkek öğrenci bulunmaktadır. Kız öğrencilerin 4'ü, erkek öğrencilerin ise 6'sı gözlüklüdür.\n\nSınıftan rastgele seçilen bir başkanın **gözlüksüz kız öğrenci** olma olasılığı kaçtır?`;
      options = assembleOptions(
        correct,
        '2/7',
        '3/7',
        '1/4',
        '4/7'
      );
      solution = `1. Adım: Sınıf mevcudu = 12 + 16 = 28.\n2. Adım: Gözlüksüz kız öğrenci sayısı = 12 - 4 = 8.\n3. Adım: Olasılık = 8/28 = 2/7 dir. Doğru cevap ${correct}.`;
    }

  // 6. CEBİRSEL İFADELER VE ÖZDEŞLİKLER
  } else if (topicId.includes('cebirsel') || topicId.includes('06')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Cebir Karolarıyla Alan Modellemesi';
      qText = `Yanda verilen cebir karolarıyla modellenen dikdörtgensel bölgenin alanını veren **cebirsel ifade** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        'x² + 3x + 2',
        'x² + 2x + 1',
        '2x² + 3x + 1',
        '(x + 2)²'
      );
      solution = `1. Adım: Kenar uzunlukları (x + 1) ve (x + 2) birimdir.\n2. Adım: Alan = (x + 1)(x + 2) = x² + 2x + x + 2 = x² + 3x + 2.\nDoğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'algebraic_tiles',
          title: 'Cebir Karoları ile Modelleme'
        });
      }
    } else if (arch === 1) {
      skill = 'İki Kare Farkı Özdeşliği: Köşelerden Kare Kesme';
      qText = `Bir kenar uzunluğu a cm olan kare biçimindeki bir kartonun dört köşesinden, bir kenar uzunluğu b cm olan özdeş kareler kesilip çıkarılıyor.\n\nBuna göre geriye kalan karton parçasının bir yüzünün alanını veren **cebirsel ifade** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        '(a - 2b) · (a + 2b)',
        '(a - b) · (a + b)',
        '(a - 4b)²',
        'a² - 2b²'
      );
      solution = `1. Adım: Başlangıçtaki alan = a² cm².\n2. Adım: Kesilen 4 karenin toplam alanı = 4 × b² = (2b)² cm².\n3. Adım: Kalan alan = a² - (2b)² = (a - 2b)(a + 2b). Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Tam Kare Özdeşliği: Bahçe Genişletme';
      qText = `Bir kenar uzunluğu x metre olan kare şeklindeki bir arsanın her bir kenarı 3 metre uzatılarak daha büyük bir karesel bahçe oluşturulmuştur.\n\nBuna göre yeni bahçenin alanını veren **özdeşlik** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        'x² + 6x + 9',
        'x² + 9',
        'x² + 3x + 9',
        'x² + 6x + 6'
      );
      solution = `1. Adım: Yeni bahçenin bir kenar uzunluğu (x + 3) metredir.\n2. Adım: Yeni alan = (x + 3)² = x² + 2·3·x + 3² = x² + 6x + 9.\nDoğru cevap ${correct}.`;
    } else {
      skill = 'Ortak Çarpan Parantezi ve Dikdörtgen Çevresi';
      qText = `Kısa kenarı (2x - 3) cm ve uzun kenarı (3x + 5) cm olan bir dikdörtgenin **çevre uzunluğunu** santimetre cinsinden veren cebirsel ifade hangisidir?`;
      options = assembleOptions(
        correct,
        '10x + 4',
        '5x + 2',
        '10x + 2',
        '6x² + x - 15'
      );
      solution = `1. Adım: Dikdörtgenin çevresi = 2 × (Kısa kenar + Uzun kenar).\n2. Adım: (2x - 3) + (3x + 5) = 5x + 2.\n3. Adım: Çevre = 2 × (5x + 2) = 10x + 4 cm. Doğru cevap ${correct}.`;
    }

  // 7. DOĞRUSAL DENKLEMLER
  } else if (topicId.includes('dogrusal') || topicId.includes('07')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Koordinat Sisteminde Doğrunun Eğimi';
      const m = difficulty + 1;
      qText = `Koordinat düzleminde orijinden ve A(2, ${2 * m}) noktasından geçen doğrunun **eğimi** kaçtır?`;
      options = assembleOptions(
        correct,
        `${m}`,
        `1/${m}`,
        `${2 * m}`,
        `${m + 1}`
      );
      solution = `1. Adım: Doğrunun eğimi m = (y₂ - y₁) / (x₂ - x₁).\n2. Adım: O(0,0) ve A(2, ${2 * m}) için m = (${2 * m} - 0) / (2 - 0) = ${m}.\nDoğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'coordinate_system',
          title: 'Doğrunun Eğimi Grafiği',
          params: { slope: m, intercept: 0 }
        });
      }
    } else if (arch === 1) {
      skill = 'Engelli Rampası Standart Eğimi Hesabı';
      // Yükseklik 60 cm. Eğim %5 = 0.05. Yatay: 60 / x <= 0.05 => x >= 1200 cm = 12 metre.
      qText = `Yüksekliği 60 cm olan bir bina girişine, tekerlekli sandalye standardı gereği eğimi en fazla %5 olacak bir rampa yapılacaktır.\n\nBuna göre bu rampanın yatay uzunluğu **en az kaç metre** olmalıdır?`;
      options = assembleOptions(
        correct,
        '12 metre',
        '10 metre',
        '15 metre',
        '8 metre'
      );
      solution = `1. Adım: Eğim = Dikey yükseklik / Yatay uzunluk.\n2. Adım: 60 cm / x ≤ 5 / 100 ⟹ 5x ≥ 6000 ⟹ x ≥ 1200 cm.\n3. Adım: 1200 cm = 12 metredir. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Doğrusal İlişki Tablosu ve Denklem';
      qText = `Ali'nin kumbarasında başlangıçta 50 TL vardır. Ali her gün kumbarasına düzenli olarak 15 TL atmaktadır.\n\nBuna göre x gün sonra kumbaradaki toplam para miktarını (y) veren **doğrusal ilişki denklemi** hangisidir?`;
      options = assembleOptions(
        correct,
        'y = 15x + 50',
        'y = 50x + 15',
        'y = 15x - 50',
        'y = 65x'
      );
      solution = `1. Adım: Başlangıç sabit değeri = 50 TL (y-kesişimi).\n2. Adım: Günlük artış hızı = 15 TL (eğim).\n3. Adım: Denklem y = 15x + 50 dir. Doğru cevap ${correct}.`;
    } else {
      skill = 'Birinci Dereceden İki Bilinmeyenli Problem';
      // 50 bilet: 40 TL öğrenci, 70 TL tam. Toplam 2600 TL. 40o + 70(50 - o) = 2600 => 3500 - 30o = 2600 => 30o = 900 => o = 30.
      qText = `Bir tiyatro salonunda öğrenci bileti 40 TL, tam bilet 70 TL'dir. Toplam 50 biletin satıldığı bir seansta 2600 TL gelir elde edilmiştir.\n\nBuna göre bu seansta **kaç adet öğrenci bileti** satılmıştır?`;
      options = assembleOptions(
        correct,
        '30',
        '20',
        '25',
        '35'
      );
      solution = `1. Adım: Öğrenci sayısı x, tam bilet (50 - x).\n2. Adım: 40x + 70(50 - x) = 2600 ⟹ 40x + 3500 - 70x = 2600.\n3. Adım: 30x = 900 ⟹ x = 30 adet öğrenci bileti satılmıştır. Doğru cevap ${correct}.`;
    }

  // 8. EŞİTSİZLİKLER
  } else if (topicId.includes('esitsizlik') || topicId.includes('08')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Sayı Doğrusunda Eşitsizlik Gösterimi';
      qText = `Yandaki sayı doğrusunda yeşil renkle taranarak gösterilen eşitsizlik çözümü aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        '3 ≤ x < 7',
        '3 < x ≤ 7',
        '3 < x < 7',
        '3 ≤ x ≤ 7'
      );
      solution = `1. Adım: 3 noktasının içi dolu olduğundan küçük eşit (≥), 7 noktasının içi boş olduğundan kesin küçüktür (<).\n2. Adım: Çözüm aralığı 3 ≤ x < 7 dir. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'number_line',
          title: 'Eşitsizlik Aralığı',
          params: { aVal: 3, bVal: 7, rangeLabel: '3 ≤ x < 7' }
        });
      }
    } else if (arch === 1) {
      skill = 'Asansör Yük Kapasitesi Eşitsizlik Modellemesi';
      // Kapasite en fazla 400 kg. Görevli 80 kg, her koli 20 kg. 20x + 80 <= 400 => 20x <= 320 => x <= 16.
      qText = `En fazla 400 kg yük taşıyabilen bir asansöre 80 kg ağırlığındaki bir görevli ve her biri 20 kg olan x adet koli yüklenecektir.\n\nBuna göre asansörün güvenle hareket edebilmesi için kolilerin sayısını belirten **eşitsizlik** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        '20x + 80 ≤ 400 (x ≤ 16)',
        '20x + 80 < 400 (x < 16)',
        '20x - 80 ≤ 400',
        '20x + 80 ≥ 400'
      );
      solution = `1. Adım: Toplam ağırlık = 20x + 80 kg.\n2. Adım: En fazla 400 kg denildiği için ≤ 400 kullanılır.\n3. Adım: 20x ≤ 320 ⟹ x ≤ 16 dır. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'İki Tarifenin Karşılaştırılması';
      // A: 200 + 30x. B: 50x. 200 + 30x < 50x => 200 < 20x => x > 10 => en az 11.
      qText = `A spor kulübü aylık 200 TL kayıt ücreti ve her seans için 30 TL almaktadır. B spor kulübü ise kayıt ücreti almayıp seans başı 50 TL almaktadır.\n\nBuna göre bir ayda **en az kaç seansa** katılan bir kişi için A kulübü daha ekonomik olur?`;
      options = assembleOptions(
        correct,
        '11',
        '10',
        '9',
        '12'
      );
      solution = `1. Adım: A kulübü ücreti: 200 + 30x, B kulübü: 50x.\n2. Adım: A < B ⟹ 200 + 30x < 50x ⟹ 20x > 200 ⟹ x > 10.\n3. Adım: 10'dan büyük en küçük tam sayı 11'dir. Doğru cevap ${correct}.`;
    } else {
      skill = 'Birinci Dereceden Bir Bilinmeyenli Eşitsizlik Çözümü';
      // 3(x - 2) <= 2x + 5 => 3x - 6 <= 2x + 5 => x <= 11.
      qText = `3(x - 2) ≤ 2x + 5 eşitsizliğini sağlayan **en büyük x tam sayısı** kaçtır?`;
      options = assembleOptions(
        correct,
        '11',
        '10',
        '12',
        '9'
      );
      solution = `1. Adım: 3x - 6 ≤ 2x + 5.\n2. Adım: 3x - 2x ≤ 5 + 6 ⟹ x ≤ 11.\n3. Adım: En büyük tam sayı değeri 11'dir. Doğru cevap ${correct}.`;
    }

  // 9. ÜÇGENLER
  } else if (topicId.includes('ucgen') || topicId.includes('09')) {
    const arch = variationIndex % 4;
    if (arch === 0) {
      skill = 'Pisagor Bağıntısı: 3-4-5 Katları';
      const k1 = 3 * (difficulty + 1);
      const k2 = 4 * (difficulty + 1);
      const hipo = 5 * (difficulty + 1);

      qText = `Bir dik üçgenin dik kenar uzunlukları ${k1} cm ve ${k2} cm olduğuna göre, bu dik üçgenin **hipotenüs uzunluğu** kaç santimetredir?`;
      options = assembleOptions(
        correct,
        `${hipo}`,
        `${hipo - 2}`,
        `${hipo + 3}`,
        `${k1 + k2}`
      );
      solution = `1. Adım: a² + b² = c² (Pisagor bağıntısı).\n2. Adım: ${k1}² + ${k2}² = ${k1 * k1} + ${k2 * k2} = ${hipo * hipo}.\n3. Adım: c = √${hipo * hipo} = ${hipo} cm. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'triangle',
          title: 'Dik Üçgen Pisagor Bağıntısı',
          params: { a: `${k1} cm`, b: `${k2} cm`, c: `? (${hipo} cm)` }
        });
      }
    } else if (arch === 1) {
      skill = 'Üçgen Eşitsizliği: Üçüncü Kenar Sınırları';
      const a = 7;
      const b = 11;
      const minVal = (b - a) + 1; // 5
      const maxVal = (a + b) - 1; // 17
      const toplam = minVal + maxVal; // 22

      qText = `Bir üçgenin iki kenar uzunluğu ${a} cm ve ${b} cm'dir. Bu üçgenin üçüncü kenarının alabileceği santimetre cinsinden **en küçük tam sayı değeri ile en büyük tam sayı değerinin toplamı** kaçtır?`;
      options = assembleOptions(
        correct,
        `${toplam}`,
        `${toplam - 2}`,
        `${toplam + 4}`,
        `18`
      );
      solution = `1. Adım: |11 - 7| < x < 11 + 7 ⟹ 4 < x < 18.\n2. Adım: En küçük tam sayı 5, en büyük tam sayı 17.\n3. Adım: Toplam = 5 + 17 = ${toplam} cm. Doğru cevap ${correct}.`;
    } else if (arch === 2) {
      skill = 'Pisagor Modellemesi: Kırılan Aydınlatma Direği';
      // Direk 18 metre. 5 metreden kırıldı. Kırılan üst parça: 13 metre (hipotenüs). Taban uzaklığı = sqrt(13^2 - 5^2) = 12 metre.
      qText = `18 metre uzunluğundaki bir sokak aydınlatma direği, fırtına nedeniyle yerden 5 metre yükseklikten kırılarak devrilmiştir.\n\nDireğin tepe noktası yere değdiğine göre, tepe noktasının direğin **tabanına olan uzaklığı kaç metredir?**`;
      options = assembleOptions(
        correct,
        '12 metre',
        '13 metre',
        '10 metre',
        '14 metre'
      );
      solution = `1. Adım: Direğin kırılan üst parçası = 18 - 5 = 13 m (dik üçgenin hipotenüsü).\n2. Adım: Dik kenarlardan biri yerden kırılma boyu olan 5 metredir.\n3. Adım: x² + 5² = 13² ⟹ x² + 25 = 169 ⟹ x² = 144 ⟹ x = 12 metre (5-12-13 özel üçgeni). Doğru cevap ${correct}.`;
    } else {
      skill = 'Açı-Kenar Bağıntıları Sıralaması';
      qText = `Bir ABC üçgeninde m(Â) = 70°, m(B̂) = 60° ve m(Ĉ) = 50° dir.\n\nBuna göre üçgenin kenar uzunlukları (a, b, c) arasındaki **doğru sıralama** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        'c < b < a',
        'a < b < c',
        'b < c < a',
        'c < a < b'
      );
      solution = `1. Adım: Bir üçgende büyük açının karşısında daima büyük kenar bulunur.\n2. Adım: Açılar 50° < 60° < 70° dir.\n3. Adım: Dolayısıyla karşılarındaki kenarlar c < b < a olur. Doğru cevap ${correct}.`;
    }

  // 10. EŞLİK VE BENZERLİK
  } else if (topicId.includes('eslik') || topicId.includes('benzerlik') || topicId.includes('10')) {
    const arch = variationIndex % 3;
    if (arch === 0) {
      skill = 'Benzerlik: Gölge Boyu ile Direk Yüksekliği (Thales)';
      // Kişi: 1.6 m, gölge: 2 m. Direk gölgesi: 10 m. Direk boyu = 1.6 / 2 * 10 = 8 m.
      qText = `Boyu 1,6 metre olan bir öğrencinin gölgesinin 2 metre olduğu bir saatte, yanındaki okul bayrak direğinin gölgesi 10 metre olarak ölçülmüştür.\n\nBuna göre bayrak direğinin **boyu kaç metredir?**`;
      options = assembleOptions(
        correct,
        '8 metre',
        '7,5 metre',
        '8,5 metre',
        '9 metre'
      );
      solution = `1. Adım: Güneş ışınları aynı açıyla geldiğinden benzer üçgenler oluşur.\n2. Adım: 1,6 / 2 = h / 10 ⟹ 2h = 16 ⟹ h = 8 metre.\nDoğru cevap ${correct}.`;
    } else if (arch === 1) {
      skill = 'Benzerlik Oranı ve Alanlar Oranı';
      qText = `Benzer iki çokgenin benzerlik oranı 3/5 tir.\n\nBuna göre küçük çokgenin alanının büyük çokgenin alanına **oranı kaçtır?**`;
      options = assembleOptions(
        correct,
        '9/25',
        '3/5',
        '6/10',
        '27/125'
      );
      solution = `1. Adım: Benzer iki geometrik şeklin alanları oranı, benzerlik oranının karesine eşittir.\n2. Adım: (3/5)² = 9/25 tir. Doğru cevap ${correct}.`;
    } else {
      skill = 'Benzer Üçgenlerde Çevre Oranı';
      qText = `Benzerlik oranı 2/3 olan iki üçgenden küçük olanının çevresi 24 cm olduğuna göre, büyük üçgenin **çevresi kaç santimetredir?**`;
      options = assembleOptions(
        correct,
        '36',
        '32',
        '40',
        '30'
      );
      solution = `1. Adım: Benzer şekillerin çevreleri oranı benzerlik oranına eşittir.\n2. Adım: 2/3 = 24 / Çevre ⟹ 2 × Çevre = 72 ⟹ Çevre = 36 cm. Doğru cevap ${correct}.`;
    }

  // 11. DÖNÜŞÜM GEOMETRİSİ
  } else if (topicId.includes('donusum') || topicId.includes('11')) {
    const arch = variationIndex % 3;
    if (arch === 0) {
      skill = 'Noktanın Ötelenmesi';
      qText = `Analitik düzlemde A(-3, 4) noktası 5 birim sağa ve 2 birim aşağı ötelendiğinde elde edilen **yeni noktanın koordinatları** aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        '(2, 2)',
        '(-8, 6)',
        '(2, 6)',
        '(-8, 2)'
      );
      solution = `1. Adım: Sağa öteleme x bileşenine eklenir: -3 + 5 = 2.\n2. Adım: Aşağı öteleme y bileşeninden çıkarılır: 4 - 2 = 2.\n3. Adım: Yeni koordinatlar (2, 2) dir. Doğru cevap ${correct}.`;
    } else if (arch === 1) {
      skill = 'Eksenlere Göre Yansıma (Simetri)';
      qText = `Koordinat düzleminde B(4, -5) noktasının **x eksenine göre yansıması** altındaki görüntüsü aşağıdakilerden hangisidir?`;
      options = assembleOptions(
        correct,
        '(4, 5)',
        '(-4, -5)',
        '(-4, 5)',
        '(-5, 4)'
      );
      solution = `1. Adım: x eksenine göre yansımada x koordinatı değişmez, y koordinatının işareti değişir.\n2. Adım: (4, -5) ⟹ (4, 5) olur. Doğru cevap ${correct}.`;
    } else {
      skill = 'Orijine Göre Simetri';
      qText = `Koordinat düzleminde C(-2, 6) noktasının **orijine göre yansıması** olan noktanın koordinatları nedir?`;
      options = assembleOptions(
        correct,
        '(2, -6)',
        '(-2, -6)',
        '(6, -2)',
        '(2, 6)'
      );
      solution = `1. Adım: Orijine göre yansımada her iki koordinat da işaret değiştirir: (x, y) ⟹ (-x, -y).\n2. Adım: (-2, 6) ⟹ (2, -6) olur. Doğru cevap ${correct}.`;
    }

  // 12. GEOMETRİK CİSİMLER
  } else if (topicId.includes('cisim') || topicId.includes('12')) {
    const arch = variationIndex % 3;
    if (arch === 0) {
      skill = 'Silindir Açınımı ve Yan Yüz Alanı';
      // r = 5, h = 12, pi = 3. 2 * pi * r = 2 * 3 * 5 = 30. Alan = 30 * 12 = 360.
      qText = `Taban yarıçapı 5 cm ve yüksekliği 12 cm olan dik dairesel bir silindirin yan yüzeyinin açınımı bir dikdörtgendir.\n\nBuna göre bu yan yüzey dikdörtgeninin **alanı kaç cm² dir?** (π = 3 alınız.)`;
      options = assembleOptions(
        correct,
        '360',
        '180',
        '240',
        '450'
      );
      solution = `1. Adım: Yan yüz dikdörtgeninin bir kenarı taban çevresi (2·π·r), diğer kenarı silindirin yüksekliğidir (h).\n2. Adım: Taban çevresi = 2 × 3 × 5 = 30 cm.\n3. Adım: Yan alan = 30 × 12 = 360 cm² dir. Doğru cevap ${correct}.`;

      if (visualRequired) {
        svgContent = generateMathematicalSvg({
          type: 'cylinder_net',
          title: 'Silindir Açınımı'
        });
      }
    } else if (arch === 1) {
      skill = 'Silindir Hacim Problemi (Depo Kapasitesi)';
      // r = 2 m, h = 4 m, pi = 3. V = pi * r^2 * h = 3 * 4 * 4 = 48 m^3.
      qText = `Taban yarıçapı 2 metre ve yüksekliği 4 metre olan dik dairesel silindir biçimindeki bir su deposunun **hacmi kaç metreküptür?** (π = 3 alınız.)`;
      options = assembleOptions(
        correct,
        '48 m³',
        '24 m³',
        '36 m³',
        '64 m³'
      );
      solution = `1. Adım: Silindir hacim formülü V = π·r²·h tir.\n2. Adım: V = 3 × 2² × 4 = 3 × 4 × 4 = 48 m³ tür. Doğru cevap ${correct}.`;
    } else {
      skill = 'Silindir Toplam Yüzey Alanı';
      // r = 3, h = 7, pi = 3. Tabanlar = 2 * (3 * 9) = 54. Yan = 2 * 3 * 3 * 7 = 126. Toplam = 180.
      qText = `Taban yarıçapı 3 cm ve yüksekliği 7 cm olan kapalı bir dik dairesel silindirin **toplam yüzey alanı kaç cm² dir?** (π = 3 alınız.)`;
      options = assembleOptions(
        correct,
        '180',
        '126',
        '154',
        '210'
      );
      solution = `1. Adım: İki taban dairesinin alanı = 2 × (π·r²) = 2 × (3 × 3²) = 54 cm².\n2. Adım: Yan yüzey alanı = 2·π·r·h = 2 × 3 × 3 × 7 = 126 cm².\n3. Adım: Toplam yüzey alanı = 54 + 126 = 180 cm² dir. Doğru cevap ${correct}.`;
    }

  // DİĞER / GENEL
  } else {
    skill = 'LGS Matematik Akıl Yürütme';
    const num = 10 * difficulty + (variationIndex * 5);
    qText = `Aşağıda ${topicName} konusuyla ilgili matematiksel bir modelleme verilmiştir.\nBir kırtasiyeci toptancıdan aldığı ürünleri eşit paketlere ayırarak satmaktadır. Yapılan hesaplamada birinci parti ${num * 2} ürün, ikinci parti ${num * 3} ürün paketlenmiştir.\n\nBuna göre paketlerin eşit ve en büyük sayıda olması için her pakette kaç ürün bulunmalıdır?`;
    options = assembleOptions(
      correct,
      `${num}`,
      `${num / 2}`,
      `${num * 2}`,
      `${num + 10}`
    );
    solution = `Verilen ${num * 2} ve ${num * 3} sayılarının EBOB'u ${num} bulunur. Doğru cevap ${correct}.`;
  }

  // Matematiksel doğrulamayı çalıştır
  const validation = validateQuestionStructure(qText, options, correct, solution);

  return {
    id: 'ai_q_' + Math.random().toString(36).substring(2, 10),
    topicId,
    subtopicId: subtopicId || null,
    topicName,
    questionText: qText,
    options,
    correctAnswer: correct,
    solutionExplanation: solution,
    difficulty,
    questionType,
    svgContent,
    skillCategory: skill,
    mathValidationStatus: validation.isValid ? 'verified' : 'warning',
    validationNotes: validation.details,
    isAiGenerated: true,
    createdAt: new Date().toISOString()
  };
}

// Birden fazla soru üretimi ve benzerlik filtresi
export function generateBatchQuestions(
  params: GenerateQuestionParams,
  count = 5,
  existingQuestionTexts: { id: string; text: string }[] = []
): GeneratedQuestionResult[] {
  const list: GeneratedQuestionResult[] = [];
  const existing = [...existingQuestionTexts];

  for (let i = 0; i < count; i++) {
    const diff = Math.min(5, Math.max(1, params.difficulty + (i % 2 === 0 ? 0 : 1)));
    let varIdx = i;
    let q = generateCurriculumQuestion({
      ...params,
      difficulty: diff,
      contextHint: `varyasyon_${i + 1}`,
      variationIndex: varIdx
    });

    // Benzerlik kontrolü: daha önce üretilmiş veya kaynak sorulardan %40'tan fazla benzememeli
    let dupCheck = checkDuplicateQuestion(q.questionText, existing, 0.40);
    let attempts = 0;
    while (dupCheck.isDuplicate && attempts < 5) {
      attempts++;
      varIdx++;
      q = generateCurriculumQuestion({
        ...params,
        difficulty: diff,
        contextHint: `alternatif_${i + 1}_${attempts}`,
        variationIndex: varIdx
      });
      dupCheck = checkDuplicateQuestion(q.questionText, existing, 0.40);
    }

    list.push(q);
    existing.push({ id: q.id, text: q.questionText });
  }

  return list;
}

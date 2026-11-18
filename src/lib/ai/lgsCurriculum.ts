// LGS Matematik Merkezi Müfredat Ağacı ve Kazanım Modülü
// Millî Eğitim Bakanlığı (MEB) 8. Sınıf LGS Matematik Öğretim Programı

export interface CurriculumTopic {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  gradeLevel: number;
  sortOrder: number;
  isActive: boolean;
  description?: string;
  subtopics?: CurriculumTopic[];
}

export interface CurriculumOutcome {
  id: string;
  topicId: string;
  code: string;
  description: string;
  cognitiveLevel: 'bilgi' | 'kavrama' | 'uygulama' | 'analiz' | 'degerlendirme';
  sortOrder: number;
}

export const INITIAL_LGS_TOPICS: CurriculumTopic[] = [
  {
    id: 'top_carpanlar_katlar',
    code: 'LGS_01',
    name: 'Çarpanlar ve Katlar',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 1,
    isActive: true,
    description: 'Pozitif tam sayıların çarpanları, EBOB, EKOK ve aralarında asal sayılar.',
    subtopics: [
      { id: 'sub_pozitif_carpanlar', code: 'LGS_01_01', name: 'Pozitif tam sayıların çarpanları', parentId: 'top_carpanlar_katlar', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_ebob', code: 'LGS_01_02', name: 'EBOB (En Büyük Ortak Bölen)', parentId: 'top_carpanlar_katlar', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_ekok', code: 'LGS_01_03', name: 'EKOK (En Küçük Ortak Kat)', parentId: 'top_carpanlar_katlar', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_aralarinda_asal', code: 'LGS_01_04', name: 'Aralarında asal sayılar', parentId: 'top_carpanlar_katlar', gradeLevel: 8, sortOrder: 4, isActive: true },
      { id: 'sub_ebob_ekok_problemleri', code: 'LGS_01_05', name: 'EBOB–EKOK problemleri', parentId: 'top_carpanlar_katlar', gradeLevel: 8, sortOrder: 5, isActive: true },
    ]
  },
  {
    id: 'top_uslu_ifadeler',
    code: 'LGS_02',
    name: 'Üslü İfadeler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 2,
    isActive: true,
    description: 'Tam sayı kuvvetleri, üslü ifadelerle çarpma ve bölme, bilimsel gösterim.',
    subtopics: [
      { id: 'sub_tam_sayi_kuvvetleri', code: 'LGS_02_01', name: 'Tam sayıların tam sayı kuvvetleri', parentId: 'top_uslu_ifadeler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_uslu_ozellikler', code: 'LGS_02_02', name: 'Üslü ifadelerin özellikleri', parentId: 'top_uslu_ifadeler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_bilimsel_gosterim', code: 'LGS_02_03', name: 'Bilimsel gösterim', parentId: 'top_uslu_ifadeler', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_uslu_islemler', code: 'LGS_02_04', name: 'Üslü ifadelerle işlemler', parentId: 'top_uslu_ifadeler', gradeLevel: 8, sortOrder: 4, isActive: true },
      { id: 'sub_uslu_problemler', code: 'LGS_02_05', name: 'Üslü ifadelerle problemler', parentId: 'top_uslu_ifadeler', gradeLevel: 8, sortOrder: 5, isActive: true },
    ]
  },
  {
    id: 'top_karekoklu_ifadeler',
    code: 'LGS_03',
    name: 'Kareköklü İfadeler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 3,
    isActive: true,
    description: 'Tam kare sayılar, kareköklü sayılarda işlemler, ondalık karekök ve gerçek sayılar.',
    subtopics: [
      { id: 'sub_tam_kare_sayilar', code: 'LGS_03_01', name: 'Tam kare doğal sayılar', parentId: 'top_karekoklu_ifadeler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_karekok_ozellikler', code: 'LGS_03_02', name: 'Kareköklü ifadelerin özellikleri (a√b)', parentId: 'top_karekoklu_ifadeler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_karekok_islemler', code: 'LGS_03_03', name: 'Kareköklü ifadelerle işlemler', parentId: 'top_karekoklu_ifadeler', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_ondalik_karekok', code: 'LGS_03_04', name: 'Ondalık ifadelerin karekökü', parentId: 'top_karekoklu_ifadeler', gradeLevel: 8, sortOrder: 4, isActive: true },
      { id: 'sub_gercek_sayilar', code: 'LGS_03_05', name: 'Gerçek sayılar', parentId: 'top_karekoklu_ifadeler', gradeLevel: 8, sortOrder: 5, isActive: true },
    ]
  },
  {
    id: 'top_veri_analizi',
    code: 'LGS_04',
    name: 'Veri Analizi',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 4,
    isActive: true,
    description: 'Çizgi, sütun ve daire grafikleri; verilerin farklı gösterimlerle yorumlanması.',
    subtopics: [
      { id: 'sub_cizgi_sutun_grafikleri', code: 'LGS_04_01', name: 'Çizgi ve sütun grafikleri', parentId: 'top_veri_analizi', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_daire_grafikleri', code: 'LGS_04_02', name: 'Daire grafikleri', parentId: 'top_veri_analizi', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_grafik_yorumlama', code: 'LGS_04_03', name: 'Grafik yorumlama', parentId: 'top_veri_analizi', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_grafikler_arasi_donusum', code: 'LGS_04_04', name: 'Grafikler arası dönüşüm', parentId: 'top_veri_analizi', gradeLevel: 8, sortOrder: 4, isActive: true },
    ]
  },
  {
    id: 'top_olasilik',
    code: 'LGS_05',
    name: 'Basit Olayların Olma Olasılığı',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 5,
    isActive: true,
    description: 'Olası durumlar, eş olasılıklı olaylar ve bir olayın olasılık değeri hesabı.',
    subtopics: [
      { id: 'sub_olasi_durumlar', code: 'LGS_05_01', name: 'Olası durumlar', parentId: 'top_olasilik', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_es_olasilikli_olaylar', code: 'LGS_05_02', name: 'Eş olasılıklı olaylar', parentId: 'top_olasilik', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_olasilik_hesaplari', code: 'LGS_05_03', name: 'Olasılık hesaplamaları', parentId: 'top_olasilik', gradeLevel: 8, sortOrder: 3, isActive: true },
    ]
  },
  {
    id: 'top_cebirsel_ifadeler',
    code: 'LGS_06',
    name: 'Cebirsel İfadeler ve Özdeşlikler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 6,
    isActive: true,
    description: 'Cebirsel ifadelerle çarpma, özdeşlik modelleri ve çarpanlara ayırma.',
    subtopics: [
      { id: 'sub_cebirsel_ifadeler_temel', code: 'LGS_06_01', name: 'Cebirsel ifadeler', parentId: 'top_cebirsel_ifadeler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_ozdeslikler', code: 'LGS_06_02', name: 'Özdeşlikler', parentId: 'top_cebirsel_ifadeler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_carpanlara_ayirma', code: 'LGS_06_03', name: 'Çarpanlara ayırma', parentId: 'top_cebirsel_ifadeler', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_cebirsel_islemler', code: 'LGS_06_04', name: 'Cebirsel ifadelerle işlemler', parentId: 'top_cebirsel_ifadeler', gradeLevel: 8, sortOrder: 4, isActive: true },
    ]
  },
  {
    id: 'top_dogrusal_denklemler',
    code: 'LGS_07',
    name: 'Doğrusal Denklemler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 7,
    isActive: true,
    description: 'Koordinat sistemi, doğru grafikleri, eğim ve günlük hayat doğrusal problemleri.',
    subtopics: [
      { id: 'sub_koordinat_sistemi', code: 'LGS_07_01', name: 'Koordinat sistemi', parentId: 'top_dogrusal_denklemler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_dogrusal_iliski', code: 'LGS_07_02', name: 'Doğrusal ilişki', parentId: 'top_dogrusal_denklemler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_dogrunun_egimi', code: 'LGS_07_03', name: 'Doğrunun eğimi', parentId: 'top_dogrusal_denklemler', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_dogrusal_denklem_problemleri', code: 'LGS_07_04', name: 'Doğrusal denklem problemleri', parentId: 'top_dogrusal_denklemler', gradeLevel: 8, sortOrder: 4, isActive: true },
    ]
  },
  {
    id: 'top_esitsizlikler',
    code: 'LGS_08',
    name: 'Eşitsizlikler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 8,
    isActive: true,
    description: 'Birinci dereceden bir bilinmeyenli eşitsizlikler, sayı doğrusu ve problemler.',
    subtopics: [
      { id: 'sub_birinci_derece_esitsizlik', code: 'LGS_08_01', name: 'Birinci dereceden bir bilinmeyenli eşitsizlikler', parentId: 'top_esitsizlikler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_sayi_dogrusunda_gosterim', code: 'LGS_08_02', name: 'Eşitsizliklerin sayı doğrusunda gösterimi', parentId: 'top_esitsizlikler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_esitsizlik_problemleri', code: 'LGS_08_03', name: 'Eşitsizlik problemleri', parentId: 'top_esitsizlikler', gradeLevel: 8, sortOrder: 3, isActive: true },
    ]
  },
  {
    id: 'top_ucgenler',
    code: 'LGS_09',
    name: 'Üçgenler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 9,
    isActive: true,
    description: 'Kenar-açı bağıntıları, üçgen eşitsizliği, açıortay-kenarortay-yükseklik ve Pisagor.',
    subtopics: [
      { id: 'sub_kenar_aci_iliskileri', code: 'LGS_09_01', name: 'Üçgende kenar ve açı ilişkileri', parentId: 'top_ucgenler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_ucgen_esitsizligi', code: 'LGS_09_02', name: 'Üçgen eşitsizliği', parentId: 'top_ucgenler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_pisagor_bagintisi', code: 'LGS_09_03', name: 'Pisagor bağıntısı', parentId: 'top_ucgenler', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_ucgen_problemleri', code: 'LGS_09_04', name: 'Üçgen problemleri', parentId: 'top_ucgenler', gradeLevel: 8, sortOrder: 4, isActive: true },
    ]
  },
  {
    id: 'top_eslik_benzerlik',
    code: 'LGS_10',
    name: 'Eşlik ve Benzerlik',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 10,
    isActive: true,
    description: 'Eş ve benzer çokgenler, benzerlik oranı ve benzerlik problemleri.',
    subtopics: [
      { id: 'sub_es_sekiller', code: 'LGS_10_01', name: 'Eş şekiller', parentId: 'top_eslik_benzerlik', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_benzer_sekiller', code: 'LGS_10_02', name: 'Benzer şekiller', parentId: 'top_eslik_benzerlik', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_benzerlik_orani', code: 'LGS_10_03', name: 'Benzerlik oranı', parentId: 'top_eslik_benzerlik', gradeLevel: 8, sortOrder: 3, isActive: true },
      { id: 'sub_benzerlik_problemleri', code: 'LGS_10_04', name: 'Benzerlik problemleri', parentId: 'top_eslik_benzerlik', gradeLevel: 8, sortOrder: 4, isActive: true },
    ]
  },
  {
    id: 'top_donusum_geometrisi',
    code: 'LGS_11',
    name: 'Dönüşüm Geometrisi',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 11,
    isActive: true,
    description: 'Nokta ve şekillerin ötelenmesi, yansıması ve ardışık dönüşümler.',
    subtopics: [
      { id: 'sub_oteleme', code: 'LGS_11_01', name: 'Öteleme', parentId: 'top_donusum_geometrisi', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_yansima', code: 'LGS_11_02', name: 'Yansıma', parentId: 'top_donusum_geometrisi', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_geometrik_donusumler', code: 'LGS_11_03', name: 'Geometrik dönüşümler', parentId: 'top_donusum_geometrisi', gradeLevel: 8, sortOrder: 3, isActive: true },
    ]
  },
  {
    id: 'top_geometrik_cisimler',
    code: 'LGS_12',
    name: 'Geometrik Cisimler',
    parentId: null,
    gradeLevel: 8,
    sortOrder: 12,
    isActive: true,
    description: 'Dik prizmalar, dik dairesel silindirin temel elemanları, açınımı, yüzey alanı ve hacmi.',
    subtopics: [
      { id: 'sub_prizmalar', code: 'LGS_12_01', name: 'Prizmalar', parentId: 'top_geometrik_cisimler', gradeLevel: 8, sortOrder: 1, isActive: true },
      { id: 'sub_dik_dairesel_silindir', code: 'LGS_12_02', name: 'Dik dairesel silindir', parentId: 'top_geometrik_cisimler', gradeLevel: 8, sortOrder: 2, isActive: true },
      { id: 'sub_silindirin_yuzey_alani_hacmi', code: 'LGS_12_03', name: 'Silindirin yüzey alanı ve hacmi', parentId: 'top_geometrik_cisimler', gradeLevel: 8, sortOrder: 3, isActive: true },
    ]
  }
];

export const INITIAL_LGS_OUTCOMES: CurriculumOutcome[] = [
  { id: 'out_m8111', topicId: 'sub_pozitif_carpanlar', code: 'M.8.1.1.1', description: 'Verilen pozitif tam sayıların pozitif tam sayı çarpanlarını bulur, pozitif tam sayıların pozitif tam sayı çarpanlarını üslü ifadelerin çarpımı şeklinde yazar.', cognitiveLevel: 'kavrama', sortOrder: 1 },
  { id: 'out_m8112_ebob', topicId: 'sub_ebob', code: 'M.8.1.1.2', description: 'İki doğal sayının en büyük ortak bölenini (EBOB) ve en küçük ortak katını (EKOK) hesaplar, ilgili problemleri çözer.', cognitiveLevel: 'uygulama', sortOrder: 2 },
  { id: 'out_m8112_ekok', topicId: 'sub_ekok', code: 'M.8.1.1.2', description: 'İki doğal sayının EKOK değerini belirler ve kat problemlerinde kullanır.', cognitiveLevel: 'uygulama', sortOrder: 3 },
  { id: 'out_m8113', topicId: 'sub_aralarinda_asal', code: 'M.8.1.1.3', description: 'Verilen iki doğal sayının aralarında asal olup olmadığını belirler.', cognitiveLevel: 'kavrama', sortOrder: 4 },
  { id: 'out_m8112_prob', topicId: 'sub_ebob_ekok_problemleri', code: 'M.8.1.1.2', description: 'EBOB ve EKOK gerektiren yeni nesil hayat problemlerini modeller ve çözer.', cognitiveLevel: 'analiz', sortOrder: 5 },
  { id: 'out_m8121', topicId: 'sub_tam_sayi_kuvvetleri', code: 'M.8.1.2.1', description: 'Tam sayıların, tam sayı kuvvetlerini hesaplar.', cognitiveLevel: 'bilgi', sortOrder: 6 },
  { id: 'out_m8122', topicId: 'sub_uslu_islemler', code: 'M.8.1.2.2', description: 'Üslü ifadelerle ilgili temel kuralları anlar, aynı tabanlı veya aynı üslü ifadelerle çarpma ve bölme işlemlerini yapar.', cognitiveLevel: 'uygulama', sortOrder: 7 },
  { id: 'out_m8125', topicId: 'sub_bilimsel_gosterim', code: 'M.8.1.2.5', description: 'Çok büyük ve çok küçük sayıları bilimsel gösterimle ifade eder ve karşılaştırır.', cognitiveLevel: 'kavrama', sortOrder: 8 },
  { id: 'out_m8131', topicId: 'sub_tam_kare_sayilar', code: 'M.8.1.3.1', description: 'Tam kare doğal sayıları tanır ve kareköklerini belirler.', cognitiveLevel: 'kavrama', sortOrder: 9 },
  { id: 'out_m8132', topicId: 'sub_karekok_ozellikler', code: 'M.8.1.3.2', description: 'Tam kare olmayan kareköklü bir sayının hangi iki doğal sayı arasında olduğunu belirler; a√b biçiminde yazar.', cognitiveLevel: 'kavrama', sortOrder: 10 },
  { id: 'out_m8135', topicId: 'sub_karekok_islemler', code: 'M.8.1.3.5', description: 'Kareköklü ifadelerde toplama, çıkarma, çarpma ve bölme işlemlerini yapar.', cognitiveLevel: 'uygulama', sortOrder: 11 },
  { id: 'out_m8411', topicId: 'sub_cizgi_sutun_grafikleri', code: 'M.8.4.1.1', description: 'En fazla üç veri grubuna ait çizgi ve sütun grafiklerini yorumlar.', cognitiveLevel: 'analiz', sortOrder: 12 },
  { id: 'out_m8412', topicId: 'sub_daire_grafikleri', code: 'M.8.4.1.2', description: 'Verileri sütun, daire veya çizgi grafiği ile gösterir ve bu gösterimler arasında uygun olan dönüşümleri yapar.', cognitiveLevel: 'analiz', sortOrder: 13 },
  { id: 'out_m8515', topicId: 'sub_olasilik_hesaplari', code: 'M.8.5.1.5', description: 'Basit bir olayın olma olasılığını hesaplar (İstenen durum sayısı / Olası tüm durumların sayısı).', cognitiveLevel: 'uygulama', sortOrder: 14 },
  { id: 'out_m8213', topicId: 'sub_ozdeslikler', code: 'M.8.2.1.3', description: 'Özdeşlikleri modellerle açıklar (iki terimin toplamının karesi, farkının karesi ve iki kare farkı).', cognitiveLevel: 'kavrama', sortOrder: 15 },
  { id: 'out_m8214', topicId: 'sub_carpanlara_ayirma', code: 'M.8.2.1.4', description: 'Cebirsel ifadeleri ortak çarpan parantezine alma ve özdeşliklerden yararlanarak çarpanlarına ayırır.', cognitiveLevel: 'uygulama', sortOrder: 16 },
  { id: 'out_m8224', topicId: 'sub_dogrunun_egimi', code: 'M.8.2.2.4', description: 'Doğrunun eğimini modellerle açıklar; dikey uzunluğun yatay uzunluğa oranı olduğunu kavrar.', cognitiveLevel: 'kavrama', sortOrder: 17 },
  { id: 'out_m8231', topicId: 'sub_birinci_derece_esitsizlik', code: 'M.8.2.3.1', description: 'Birinci dereceden bir bilinmeyenli eşitsizlik içeren günlük hayat durumlarına uygun matematik cümleleri yazar.', cognitiveLevel: 'uygulama', sortOrder: 18 },
  { id: 'out_m8313', topicId: 'sub_ucgen_esitsizligi', code: 'M.8.3.1.3', description: 'Üçgenin iki kenar uzunluğunun toplamı veya farkı ile üçüncü kenarının uzunluğunu ilişkilendirir.', cognitiveLevel: 'kavrama', sortOrder: 19 },
  { id: 'out_m8315', topicId: 'sub_pisagor_bagintisi', code: 'M.8.3.1.5', description: 'Pisagor bağıntısını oluşturur ve ilgili problemleri çözer.', cognitiveLevel: 'uygulama', sortOrder: 20 },
  { id: 'out_m8323', topicId: 'sub_benzerlik_orani', code: 'M.8.3.2.3', description: 'Benzer çokgenlerin benzerlik oranını belirler; bir çokgene eş ve benzer çokgenler oluşturur.', cognitiveLevel: 'uygulama', sortOrder: 21 },
  { id: 'out_m8344', topicId: 'sub_silindirin_yuzey_alani_hacmi', code: 'M.8.3.4.4', description: 'Dik dairesel silindirin yüzey alanı ve hacim bağıntısını oluşturur, ilgili problemleri çözer.', cognitiveLevel: 'analiz', sortOrder: 22 }
];

export function getAllFlatTopics(topics: CurriculumTopic[] = INITIAL_LGS_TOPICS): CurriculumTopic[] {
  const result: CurriculumTopic[] = [];
  function recurse(list: CurriculumTopic[]) {
    for (const t of list) {
      result.push(t);
      if (t.subtopics && t.subtopics.length > 0) {
        recurse(t.subtopics);
      }
    }
  }
  recurse(topics);
  return result;
}

export function findTopicById(topicId: string, topics: CurriculumTopic[] = INITIAL_LGS_TOPICS): CurriculumTopic | null {
  const flat = getAllFlatTopics(topics);
  return flat.find(t => t.id === topicId || t.code === topicId) || null;
}

export function getTopicFullName(topicId: string, topics: CurriculumTopic[] = INITIAL_LGS_TOPICS): string {
  const t = findTopicById(topicId, topics);
  if (!t) return 'Genel Matematik';
  if (t.parentId) {
    const parent = findTopicById(t.parentId, topics);
    return parent ? `${parent.name} › ${t.name}` : t.name;
  }
  return t.name;
}

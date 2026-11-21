const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const lgsDocuments = [
  {
    id: 'pdf_lgs_2024',
    teacher_id: 'teacher-admin',
    title: '2024 LGS Sayısal Matematik (MEB Çıkmış Sınav)',
    file_name: '2024_lgs_sayisal.pdf',
    file_path: '/uploads/2024_lgs_sayisal.pdf',
    file_type: 'deneme',
    subject: 'Matematik',
    grade_level: 'LGS',
    topic: 'Tüm 8. Sınıf LGS Müfredatı',
    publisher: 'T.C. Millî Eğitim Bakanlığı',
    file_size_mb: 2.8,
    page_count: 8,
    description: '2 Haziran 2024 tarihinde uygulanan LGS Resmî Sayısal Bölüm Matematik Soru Kitapçığı',
    answer_key: '1.B 2.D 3.A 4.C 5.C 6.A 7.D 8.B 9.C 10.A 11.B 12.D 13.A 14.C 15.B 16.D 17.A 18.C 19.B 20.D',
    question_count: 20
  },
  {
    id: 'pdf_lgs_2023',
    teacher_id: 'teacher-admin',
    title: '2023 LGS Sayısal Matematik (MEB Çıkmış Sınav)',
    file_name: '2023_lgs_sayisal.pdf',
    file_path: '/uploads/2023_lgs_sayisal.pdf',
    file_type: 'deneme',
    subject: 'Matematik',
    grade_level: 'LGS',
    topic: '1. Dönem LGS Müfredatı',
    publisher: 'T.C. Millî Eğitim Bakanlığı',
    file_size_mb: 2.4,
    page_count: 8,
    description: '4 Haziran 2023 tarihinde uygulanan LGS Resmî Sayısal Bölüm Matematik Soru Kitapçığı',
    answer_key: '1.C 2.A 3.D 4.B 5.B 6.C 7.A 8.D 9.B 10.C 11.A 12.D 13.C 14.B 15.A 16.D 17.C 18.A 19.D 20.B',
    question_count: 20
  },
  {
    id: 'pdf_lgs_odsgm',
    teacher_id: 'teacher-admin',
    title: 'LGS 1. Dönem Tekrar & Örnek Soru Fasikülü',
    file_name: 'odsgm_ornek_sorular.pdf',
    file_path: '/uploads/odsgm_ornek_sorular.pdf',
    file_type: 'calisma_foyu',
    subject: 'Matematik',
    grade_level: 'LGS',
    topic: 'LGS Örnek Soru Havuzu',
    publisher: 'ÖDSGM',
    file_size_mb: 3.2,
    page_count: 12,
    description: 'Ölçme, Değerlendirme ve Sınav Hizmetleri Genel Müdürlüğü Resmî LGS Hazırlık Fasikülü',
    answer_key: '1.A 2.C 3.B 4.D 5.A 6.B 7.C 8.D 9.A 10.C 11.B 12.D 13.A 14.B 15.C 16.D 17.A 18.B 19.C 20.D 21.A 22.B 23.C 24.D 25.A',
    question_count: 25
  }
];

const lgs2024Questions = [
  {
    id: 'q_2024_01',
    pdf_id: 'pdf_lgs_2024',
    question_no: 1,
    page_no: 1,
    question_text: 'Bir marangoz uzunlukları 144 cm ve 180 cm olan iki tahta çıtayı hiç parça artmayacak şekilde eşit uzunlukta en büyük parçalara ayırmak istiyor. Marangoz her kesim işlemi için 4 saniye harcamaktadır. Buna göre marangozun kesim işlemlerini tamamlaması toplam kaç saniye sürer?',
    options_json: JSON.stringify({ A: '28', B: '24', C: '32', D: '36' }),
    correct_answer: 'B',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_02',
    pdf_id: 'pdf_lgs_2024',
    question_no: 2,
    page_no: 1,
    question_text: 'Aşağıda üzerlerinde 1\'den 20\'ye kadar tam sayıların yazılı olduğu 20 adet kart verilmiştir. Aslı, bu kartlardan asal sayı olmayan ancak yalnızca bir tane asal çarpanı olan tüm kartları seçip kenara ayırıyor. Buna göre Aslı kaç tane kart ayırmıştır?',
    options_json: JSON.stringify({ A: '3', B: '4', C: '5', D: '6' }),
    correct_answer: 'D',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 3,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_03',
    pdf_id: 'pdf_lgs_2024',
    question_no: 3,
    page_no: 2,
    question_text: 'Laboratuvar ortamındaki bir bakteri türünün sayısı her 20 dakikada bir 2 katına çıkmaktadır. Başlangıçta tüpte 4^5 adet bakteri bulunduğuna göre, 2 saatin sonunda bu tüpteki toplam bakteri sayısı kaç olur?',
    options_json: JSON.stringify({ A: '2^16', B: '2^14', C: '4^7', D: '8^4' }),
    correct_answer: 'A',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 2,
    question_type: 'yeni_nesil',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_04',
    pdf_id: 'pdf_lgs_2024',
    question_no: 4,
    page_no: 2,
    question_text: 'Güneş sistemi içerisindeki bir uzay sondası, Dünya\'dan 0,0000045 × 10^14 metre uzaklıktaki bir hedefe doğru fırlatılmıştır. Bu mesafenin bilimsel gösterimle metre cinsinden ifadesi aşağıdakilerden hangisidir?',
    options_json: JSON.stringify({ A: '45 × 10^7', B: '0,45 × 10^9', C: '4,5 × 10^8', D: '4,5 × 10^9' }),
    correct_answer: 'C',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_05',
    pdf_id: 'pdf_lgs_2024',
    question_no: 5,
    page_no: 3,
    question_text: 'Alanı 108 cm² olan kare şeklindeki bir kartonun kenarından, alanı 12 cm² olan bir kare parça kesilip atılıyor. Kalan şeklin çevre uzunluğunun santimetre cinsinden değeri hangi iki ardışık tam sayı arasındadır?',
    options_json: JSON.stringify({ A: '38 ile 39', B: '40 ile 41', C: '41 ile 42', D: '43 ile 44' }),
    correct_answer: 'C',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 4,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_06',
    pdf_id: 'pdf_lgs_2024',
    question_no: 6,
    page_no: 3,
    question_text: 'Kenar uzunlukları √75 cm ve √48 cm olan dikdörtgen şeklindeki bir panoya, bir kenar uzunluğu √3 cm olan kare şeklindeki fotoğraflar aralarında boşluk kalmayacak ve üst üste gelmeyecek biçimde yerleştirilecektir. Panonun tamamını kaplamak için bu fotoğraflardan en az kaç tane gerekir?',
    options_json: JSON.stringify({ A: '20', B: '24', C: '15', D: '18' }),
    correct_answer: 'A',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_07',
    pdf_id: 'pdf_lgs_2024',
    question_no: 7,
    page_no: 4,
    question_text: 'Bir okul kütüphanesindeki kitapların türlerine göre dağılımı bir daire grafiğinde gösterildiğinde Roman türüne ait merkez açı 120°, Hikaye türüne ait merkez açı 90°, Şiir türüne ait merkez açı 60° ve geri kalanlar Bilim türündedir. Kütüphanede 360 adet Bilim kitabı olduğuna göre, toplam kaç adet Roman kitabı vardır?',
    options_json: JSON.stringify({ A: '420', B: '450', C: '480', D: '480' }),
    correct_answer: 'D',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 3,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_08',
    pdf_id: 'pdf_lgs_2024',
    question_no: 8,
    page_no: 4,
    question_text: 'Bir ildeki 4 günlük sıcaklık değerleri sütun grafiğinde incelendiğinde; Pazartesi 18°C, Salı 22°C, Çarşamba 16°C ve Perşembe 24°C olarak ölçülmüştür. Bu 4 günün ortalama sıcaklığı kaç santigrat derecedir?',
    options_json: JSON.stringify({ A: '19', B: '20', C: '21', D: '22' }),
    correct_answer: 'B',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 1,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_09',
    pdf_id: 'pdf_lgs_2024',
    question_no: 9,
    page_no: 5,
    question_text: 'Bir kutuda renkleri dışında özdeş 8 sarı, 12 mavi ve belirli sayıda kırmızı bilye bulunmaktadır. Kutudan rastgele çekilen bir bilyenin kırmızı olma olasılığı 1/3 olduğuna göre, bu kutuda toplam kaç bilye vardır?',
    options_json: JSON.stringify({ A: '25', B: '27', C: '30', D: '36' }),
    correct_answer: 'C',
    primary_topic_id: 'top_olasilik',
    difficulty: 3,
    question_type: 'yeni_nesil',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_10',
    pdf_id: 'pdf_lgs_2024',
    question_no: 10,
    page_no: 5,
    question_text: 'Üzerinde 1\'den 30\'a kadar olan tam sayıların yazılı olduğu özdeş toplar bir torbaya atılıyor. Torbadan rastgele çekilen bir topun üzerindeki sayının tam kare sayı olma olasılığı kaçtır?',
    options_json: JSON.stringify({ A: '1/6', B: '1/5', C: '1/4', D: '1/3' }),
    correct_answer: 'A',
    primary_topic_id: 'top_olasilik',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_11',
    pdf_id: 'pdf_lgs_2024',
    question_no: 11,
    page_no: 6,
    question_text: 'Kenar uzunluğu (3x + 4) cm olan kare şeklindeki bir panodan, köşelerinden bir kenarı 2 cm olan 4 adet kare parça kesilip çıkarılıyor. Kalan bölgenin alanını santimetrekare cinsinden veren cebirsel ifade aşağıdakilerden hangisidir?',
    options_json: JSON.stringify({ A: '(3x)(3x + 8)', B: '(3x)(3x + 8)', C: '9x² + 24x', D: '9x² + 16' }),
    correct_answer: 'B',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_12',
    pdf_id: 'pdf_lgs_2024',
    question_no: 12,
    page_no: 6,
    question_text: '4a² - 12ab + 9b² ifadesi bir tam kare açılımıdır. a = 15 ve b = 10 için bu ifadenin sayısal değeri kaçtır?',
    options_json: JSON.stringify({ A: '0', B: '100', C: '400', D: '0' }),
    correct_answer: 'D',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_13',
    pdf_id: 'pdf_lgs_2024',
    question_no: 13,
    page_no: 7,
    question_text: 'Koordinat sisteminde A(2, 5) ve B(6, 13) noktalarından geçen doğrunun eğimi kaçtır?',
    options_json: JSON.stringify({ A: '2', B: '3', C: '4', D: '1/2' }),
    correct_answer: 'A',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_14',
    pdf_id: 'pdf_lgs_2024',
    question_no: 14,
    page_no: 7,
    question_text: 'Bir su deposunda başlangıçta 120 litre su vardır. Depodan her saatte 8 litre su boşaltılmaktadır. Geçen süre t (saat) ve depoda kalan su miktarı y (litre) olduğuna göre, bu ilişkiyi gösteren doğrusal denklem hangisidir?',
    options_json: JSON.stringify({ A: 'y = 120 + 8t', B: 'y = 8t - 120', C: 'y = 120 - 8t', D: 't = 120 - 8y' }),
    correct_answer: 'C',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_15',
    pdf_id: 'pdf_lgs_2024',
    question_no: 15,
    page_no: 7,
    question_text: 'Bir taksi açılış ücreti olarak 25 TL ve gidilen her kilometre için 12 TL almaktadır. Cebinde 145 TL parası olan Emre, bu taksi ile en fazla kaç kilometre yol gidebilir?',
    options_json: JSON.stringify({ A: '9', B: '10', C: '11', D: '12' }),
    correct_answer: 'B',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_16',
    pdf_id: 'pdf_lgs_2024',
    question_no: 16,
    page_no: 8,
    question_text: '3(x - 2) ≤ 2x + 5 eşitsizliğini sağlayan en büyük x tam sayısı kaçtır?',
    options_json: JSON.stringify({ A: '9', B: '10', C: '12', D: '11' }),
    correct_answer: 'D',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_17',
    pdf_id: 'pdf_lgs_2024',
    question_no: 17,
    page_no: 8,
    question_text: 'Bir ABC üçgeninde |AB| = 7 cm ve |AC| = 12 cm olduğuna göre, [BC] kenarının santimetre cinsinden alabileceği tam sayı değerlerinin sayısı kaçtır?',
    options_json: JSON.stringify({ A: '13', B: '14', C: '15', D: '11' }),
    correct_answer: 'A',
    primary_topic_id: 'top_ucgenler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_18',
    pdf_id: 'pdf_lgs_2024',
    question_no: 18,
    page_no: 8,
    question_text: 'Hipotenüs uzunluğu 25 cm ve dik kenarlarından biri 15 cm olan bir dik üçgenin alanı kaç santimetrekaredir?',
    options_json: JSON.stringify({ A: '120', B: '140', C: '150', D: '200' }),
    correct_answer: 'C',
    primary_topic_id: 'top_ucgenler',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_19',
    pdf_id: 'pdf_lgs_2024',
    question_no: 19,
    page_no: 8,
    question_text: 'Benzerlik oranı 2/3 olan iki benzer çokgenden küçüğünün alanı 36 cm² olduğuna göre, büyüğünün alanı kaç santimetrekaredir?',
    options_json: JSON.stringify({ A: '54', B: '81', C: '72', D: '90' }),
    correct_answer: 'B',
    primary_topic_id: 'top_eslik_benzerlik',
    difficulty: 4,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2024_20',
    pdf_id: 'pdf_lgs_2024',
    question_no: 20,
    page_no: 8,
    question_text: 'Taban yarıçapı 4 cm ve yüksekliği 10 cm olan bir dik dairesel silindirin yanal alanı kaç santimetrekaredir? (π = 3 alınız.)',
    options_json: JSON.stringify({ A: '180', B: '210', C: '220', D: '240' }),
    correct_answer: 'D',
    primary_topic_id: 'top_geometrik_cisimler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  }
];

const lgs2023Questions = [
  {
    id: 'q_2023_01',
    pdf_id: 'pdf_lgs_2023',
    question_no: 1,
    page_no: 1,
    question_text: 'Ahmet 12 günde bir, Burak ise 18 günde bir nöbet tutmaktadır. İkisi birlikte ilk nöbetlerini Salı günü tuttuklarına göre, birlikte tutacakları 2. nöbet hangi güne denk gelir?',
    options_json: JSON.stringify({ A: 'Pazartesi', B: 'Salı', C: 'Pazar', D: 'Çarşamba' }),
    correct_answer: 'C',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_02',
    pdf_id: 'pdf_lgs_2023',
    question_no: 2,
    page_no: 1,
    question_text: 'Aralarında asal iki pozitif tam sayının EKOK\'u 180\'dir. Bu sayılardan biri 9 olduğuna göre, diğeri kaçtır?',
    options_json: JSON.stringify({ A: '20', B: '18', C: '15', D: '12' }),
    correct_answer: 'A',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_03',
    pdf_id: 'pdf_lgs_2023',
    question_no: 3,
    page_no: 2,
    question_text: '(2^3 × 5^3) / 10^2 işleminin sonucu aşağıdakilerden hangisidir?',
    options_json: JSON.stringify({ A: '1', B: '5', C: '8', D: '10' }),
    correct_answer: 'D',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_04',
    pdf_id: 'pdf_lgs_2023',
    question_no: 4,
    page_no: 2,
    question_text: 'Bir kenar uzunluğu 8^4 mm olan kare biçimindeki bir levha 4 eş parçaya bölünmüştür. Elde edilen parçalardan birinin alanı kaç milimetrekaredir?',
    options_json: JSON.stringify({ A: '2^20', B: '2^22', C: '2^24', D: '4^10' }),
    correct_answer: 'B',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_05',
    pdf_id: 'pdf_lgs_2023',
    question_no: 5,
    page_no: 3,
    question_text: '√150 sayısı aşağıdaki sayılardan hangisi ile çarpılırsa sonuç bir doğal sayı olur?',
    options_json: JSON.stringify({ A: '√2', B: '√6', C: '√3', D: '√5' }),
    correct_answer: 'B',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_06',
    pdf_id: 'pdf_lgs_2023',
    question_no: 6,
    page_no: 3,
    question_text: 'Sayı doğrusu üzerinde 7 ile 8 sayıları arasında bulunan ve 7\'ye daha yakın olan sayı aşağıdakilerden hangisi olabilir?',
    options_json: JSON.stringify({ A: '√51', B: '√58', C: '√50', D: '√60' }),
    correct_answer: 'C',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_07',
    pdf_id: 'pdf_lgs_2023',
    question_no: 7,
    page_no: 4,
    question_text: 'Bir çiftlikte bulunan tavuk, koyun ve ineklerin sayıca dağılımı daire grafiğinde gösterilmiştir. İneklere ait dilim 60°, koyunlara ait dilim 120° ve tavuklara ait dilim 180° dir. Çiftlikte toplam 240 hayvan olduğuna göre tavuk sayısı, inek sayısından kaç fazladır?',
    options_json: JSON.stringify({ A: '80', B: '60', C: '70', D: '90' }),
    correct_answer: 'A',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 3,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_08',
    pdf_id: 'pdf_lgs_2023',
    question_no: 8,
    page_no: 4,
    question_text: 'Bir markette satılan A ve B marka sütlerin haftalık satış adetleri sütun grafiğinde verilmiştir. A markası haftalık 450 adet, B markası 350 adet satılmıştır. Toplam satışların yüzde kaçı A markasıdır?',
    options_json: JSON.stringify({ A: '%50', B: '%52,5', C: '%55', D: '%56,25' }),
    correct_answer: 'D',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 3,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_09',
    pdf_id: 'pdf_lgs_2023',
    question_no: 9,
    page_no: 5,
    question_text: 'Bir sınıfta 14 kız ve 10 erkek öğrenci vardır. Kız öğrencilerin 4\'ü, erkek öğrencilerin 2\'si gözlüklüdür. Sınıftan rastgele seçilen bir öğrencinin gözlüksüz kız öğrenci olma olasılığı kaçtır?',
    options_json: JSON.stringify({ A: '5/12', B: '5/12', C: '7/12', D: '1/4' }),
    correct_answer: 'B',
    primary_topic_id: 'top_olasilik',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_10',
    pdf_id: 'pdf_lgs_2023',
    question_no: 10,
    page_no: 5,
    question_text: 'İki basamaklı tüm doğal sayılar özdeş kartlara yazılıp bir torbaya atılıyor. Torbadan çekilen bir kartın rakamları toplamının 9 olma olasılığı kaçtır?',
    options_json: JSON.stringify({ A: '1/9', B: '1/15', C: '1/10', D: '1/18' }),
    correct_answer: 'C',
    primary_topic_id: 'top_olasilik',
    difficulty: 4,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_11',
    pdf_id: 'pdf_lgs_2023',
    question_no: 11,
    page_no: 6,
    question_text: '(2x - 5)² ifadesinin özdeşi aşağıdakilerden hangisidir?',
    options_json: JSON.stringify({ A: '4x² - 20x + 25', B: '4x² - 10x + 25', C: '4x² + 25', D: '4x² - 25' }),
    correct_answer: 'A',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_12',
    pdf_id: 'pdf_lgs_2023',
    question_no: 12,
    page_no: 6,
    question_text: 'x² - 49 ifadesi aşağıdakilerden hangisine eşittir?',
    options_json: JSON.stringify({ A: '(x - 7)²', B: '(x + 7)²', C: 'x(x - 49)', D: '(x - 7)(x + 7)' }),
    correct_answer: 'D',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_13',
    pdf_id: 'pdf_lgs_2023',
    question_no: 13,
    page_no: 7,
    question_text: '3x - 4y = 24 doğrusunun eksenleri kestiği noktalar ile orijin arasında kalan üçgensel bölgenin alanı kaç birimkaredir?',
    options_json: JSON.stringify({ A: '48', B: '36', C: '24', D: '18' }),
    correct_answer: 'C',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_14',
    pdf_id: 'pdf_lgs_2023',
    question_no: 14,
    page_no: 7,
    question_text: 'Eğimi %75 olan bir rampanın yatay uzunluğu 16 metre olduğuna göre, yüksekliği (düşey uzunluğu) kaç metredir?',
    options_json: JSON.stringify({ A: '10', B: '12', C: '14', D: '15' }),
    correct_answer: 'B',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_15',
    pdf_id: 'pdf_lgs_2023',
    question_no: 15,
    page_no: 7,
    question_text: 'Bir öğrenci günde en az 40, en fazla 75 soru çözmektedir. Bu öğrencinin 5 günde çözdüğü toplam soru sayısını (x) gösteren eşitsizlik hangisidir?',
    options_json: JSON.stringify({ A: '200 ≤ x ≤ 375', B: '200 < x < 375', C: '150 ≤ x ≤ 350', D: '40 ≤ x ≤ 375' }),
    correct_answer: 'A',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_16',
    pdf_id: 'pdf_lgs_2023',
    question_no: 16,
    page_no: 8,
    question_text: '-4x + 12 < 0 eşitsizliğinin çözüm kümesi aşağıdakilerden hangisidir?',
    options_json: JSON.stringify({ A: 'x < 3', B: 'x < -3', C: 'x > -3', D: 'x > 3' }),
    correct_answer: 'D',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_17',
    pdf_id: 'pdf_lgs_2023',
    question_no: 17,
    page_no: 8,
    question_text: 'Bir dik üçgenin dik kenarlarının uzunlukları 8 cm ve 15 cm olduğuna göre, bu üçgenin çevre uzunluğu kaç santimetredir?',
    options_json: JSON.stringify({ A: '38', B: '39', C: '40', D: '42' }),
    correct_answer: 'C',
    primary_topic_id: 'top_ucgenler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_18',
    pdf_id: 'pdf_lgs_2023',
    question_no: 18,
    page_no: 8,
    question_text: 'Çeşitkenar bir ABC üçgeninde m(B) > m(C) > m(A) olduğuna göre kenar uzunlukları arasındaki doğru sıralama hangisidir?',
    options_json: JSON.stringify({ A: 'b > c > a', B: 'a > b > c', C: 'c > b > a', D: 'b > a > c' }),
    correct_answer: 'A',
    primary_topic_id: 'top_ucgenler',
    difficulty: 2,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_19',
    pdf_id: 'pdf_lgs_2023',
    question_no: 19,
    page_no: 8,
    question_text: 'A(3, -4) noktası orijin etrafında saat yönünde 90° döndürüldüğünde elde edilen yeni noktanın koordinatları hangisi olur?',
    options_json: JSON.stringify({ A: '(4, 3)', B: '(-4, -3)', C: '(3, 4)', D: '(-4, 3)' }),
    correct_answer: 'D',
    primary_topic_id: 'top_donusum_geometrisi',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_2023_20',
    pdf_id: 'pdf_lgs_2023',
    question_no: 20,
    page_no: 8,
    question_text: 'Yüksekliği 12 cm, taban ayrıtları 6 cm ve 8 cm olan dikdörtgenler prizmasının cisim köşegeninin uzunluğu kaç santimetredir?',
    options_json: JSON.stringify({ A: '10√2', B: '2√61', C: '15', D: '16' }),
    correct_answer: 'B',
    primary_topic_id: 'top_geometrik_cisimler',
    difficulty: 4,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  }
];

const odsgmQuestions = [
  {
    id: 'q_odsgm_01',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 1,
    page_no: 1,
    question_text: 'Bir depodaki zeytinyağları 24 litrelik ve 30 litrelik tenekelere birbirine karıştırılmadan ve hiç artmayacak şekilde doldurulabilmektedir. Depodaki toplam zeytinyağı miktarı 500 litreden fazla olduğuna göre, depoda en az kaç litre zeytinyağı vardır?',
    options_json: JSON.stringify({ A: '600', B: '540', C: '560', D: '720' }),
    correct_answer: 'A',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_02',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 2,
    page_no: 1,
    question_text: 'Alanı 48 m² olan dikdörtgen şeklindeki bir bahçenin kenar uzunlukları metre cinsinden birer tam sayıdır. Buna göre bu bahçenin çevresi en az kaç metre olabilir?',
    options_json: JSON.stringify({ A: '32', B: '26', C: '28', D: '36' }),
    correct_answer: 'C',
    primary_topic_id: 'top_carpanlar_katlar',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_03',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 3,
    page_no: 2,
    question_text: '3^x = a ve 5^x = b olduğuna göre 45^x ifadesinin a ve b türünden eşiti hangisidir?',
    options_json: JSON.stringify({ A: 'a · b', B: 'a² · b', C: 'a · b²', D: 'a² · b²' }),
    correct_answer: 'B',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_04',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 4,
    page_no: 2,
    question_text: 'Bir nanometre 10^-9 metredir. Boyutu 450 nanometre olan bir virüsün metre cinsinden değerinin bilimsel gösterimi hangisidir?',
    options_json: JSON.stringify({ A: '45 × 10^-8', B: '4,5 × 10^-8', C: '0,45 × 10^-6', D: '4,5 × 10^-7' }),
    correct_answer: 'D',
    primary_topic_id: 'top_uslu_ifadeler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_05',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 5,
    page_no: 3,
    question_text: '√72 + √98 - √50 işleminin sonucu kaçtır?',
    options_json: JSON.stringify({ A: '8√2', B: '9√2', C: '7√2', D: '6√2' }),
    correct_answer: 'A',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_06',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 6,
    page_no: 3,
    question_text: '√0,64 + √1,44 işleminin sonucu kaçtır?',
    options_json: JSON.stringify({ A: '1,8', B: '2,0', C: '2,2', D: '2,4' }),
    correct_answer: 'B',
    primary_topic_id: 'top_karekoklu_ifadeler',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_07',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 7,
    page_no: 4,
    question_text: 'Bir fabrikada üretilen A, B ve C ürünlerinin dağılımı daire grafiğinde sırasıyla 150°, 90° ve 120° dir. C ürününden 2400 adet üretildiğine göre A ürününden kaç adet üretilmiştir?',
    options_json: JSON.stringify({ A: '2800', B: '3200', C: '3000', D: '3600' }),
    correct_answer: 'C',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 3,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_08',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 8,
    page_no: 4,
    question_text: 'Bir ilde 5 gün boyunca ölçülen yağış miktarları: 12 mm, 18 mm, 15 mm, 25 mm ve 10 mm\'dir. Bu verilerin açıklığı kaçtır?',
    options_json: JSON.stringify({ A: '12', B: '14', C: '13', D: '15' }),
    correct_answer: 'D',
    primary_topic_id: 'top_veri_analizi',
    difficulty: 1,
    question_type: 'grafik_tablo',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_09',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 9,
    page_no: 5,
    question_text: 'Bir torbada 6 sarı, 8 mavi ve 10 yeşil top bulunmaktadır. Torbadan rastgele çekilen bir topun mavi OLMAMA olasılığı kaçtır?',
    options_json: JSON.stringify({ A: '2/3', B: '1/3', C: '3/4', D: '5/6' }),
    correct_answer: 'A',
    primary_topic_id: 'top_olasilik',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_10',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 10,
    page_no: 5,
    question_text: 'Havaya atılan hilesiz iki zarın üst yüzüne gelen sayıların toplamının 10 olma olasılığı kaçtır?',
    options_json: JSON.stringify({ A: '1/18', B: '1/9', C: '1/12', D: '1/6' }),
    correct_answer: 'C',
    primary_topic_id: 'top_olasilik',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_11',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 11,
    page_no: 6,
    question_text: '3x(2x - 4) - 2x(3x + 1) işleminin en sade eşiti hangisidir?',
    options_json: JSON.stringify({ A: '-10x', B: '-14x', C: '-12x', D: '6x² - 14x' }),
    correct_answer: 'B',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_12',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 12,
    page_no: 6,
    question_text: '9a² - 25b² cebirsel ifadesinin çarpanlara ayrılmış hali hangisidir?',
    options_json: JSON.stringify({ A: '(3a - 5b)²', B: '(3a + 5b)²', C: '9(a² - b²)', D: '(3a - 5b)(3a + 5b)' }),
    correct_answer: 'D',
    primary_topic_id: 'top_cebirsel_ifadeler',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_13',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 13,
    page_no: 7,
    question_text: '2x + 3y - 18 = 0 doğrusunun y eksenini kestiği noktanın ordinatı kaçtır?',
    options_json: JSON.stringify({ A: '6', B: '9', C: '-6', D: '3' }),
    correct_answer: 'A',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_14',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 14,
    page_no: 7,
    question_text: 'Bir telefon tarifesinde sabit 60 TL ücret ve konuşulan her dakika için 0,5 TL faturalandırılmaktadır. Konuşma süresi x (dk) ve fatura tutarı y (TL) olduğuna göre denklem nedir?',
    options_json: JSON.stringify({ A: 'y = 60x + 0,5', B: 'y = 60 + 0,5x', C: 'y = 0,5x - 60', D: 'x = 60 + 0,5y' }),
    correct_answer: 'B',
    primary_topic_id: 'top_dogrusal_denklemler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_15',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 15,
    page_no: 8,
    question_text: '5(x + 2) > 3x + 22 eşitsizliğini sağlayan en küçük x tam sayısı kaçtır?',
    options_json: JSON.stringify({ A: '6', B: '5', C: '7', D: '8' }),
    correct_answer: 'C',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_16',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 16,
    page_no: 8,
    question_text: 'Bir asansör en fazla 450 kg yük taşıyabilmektedir. Her birinin kütlesi 40 kg olan kolilerden x tanesi kütlesi 70 kg olan bir kişiyle birlikte asansöre biniyor. Bu durumu ifade eden eşitsizlik hangisidir?',
    options_json: JSON.stringify({ A: '40x + 70 < 450', B: '40x + 70 ≥ 450', C: '70x + 40 ≤ 450', D: '40x + 70 ≤ 450' }),
    correct_answer: 'D',
    primary_topic_id: 'top_esitsizlikler',
    difficulty: 2,
    question_type: 'gunluk_yasam',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_17',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 17,
    page_no: 9,
    question_text: 'Kenar uzunlukları 5 cm, 12 cm ve x cm olan bir üçgende x\'in alabileceği en büyük tam sayı değeri ile en küçük tam sayı değerinin toplamı kaçtır?',
    options_json: JSON.stringify({ A: '24', B: '25', C: '26', D: '22' }),
    correct_answer: 'A',
    primary_topic_id: 'top_ucgenler',
    difficulty: 3,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_18',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 18,
    page_no: 9,
    question_text: 'Bir eşkenar üçgenin yüksekliği 6√3 cm olduğuna göre bu üçgenin bir kenar uzunluğu kaç santimetredir?',
    options_json: JSON.stringify({ A: '6', B: '12', C: '9', D: '18' }),
    correct_answer: 'B',
    primary_topic_id: 'top_ucgenler',
    difficulty: 3,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_19',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 19,
    page_no: 10,
    question_text: 'İki benzer üçgenin çevreleri oranı 3/5\'tir. Büyük üçgenin çevresi 60 cm olduğuna göre küçük üçgenin çevresi kaç santimetredir?',
    options_json: JSON.stringify({ A: '32', B: '35', C: '36', D: '40' }),
    correct_answer: 'C',
    primary_topic_id: 'top_eslik_benzerlik',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_20',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 20,
    page_no: 10,
    question_text: 'Benzerlik oranı 1/4 olan iki karenin alanları oranı kaçtır?',
    options_json: JSON.stringify({ A: '1/2', B: '1/8', C: '1/12', D: '1/16' }),
    correct_answer: 'D',
    primary_topic_id: 'top_eslik_benzerlik',
    difficulty: 1,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_21',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 21,
    page_no: 11,
    question_text: 'A(-2, 5) noktasının x eksenine göre yansıması olan noktanın koordinatları hangisidir?',
    options_json: JSON.stringify({ A: '(-2, -5)', B: '(2, 5)', C: '(2, -5)', D: '(5, -2)' }),
    correct_answer: 'A',
    primary_topic_id: 'top_donusum_geometrisi',
    difficulty: 1,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_22',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 22,
    page_no: 11,
    question_text: 'B(4, -1) noktası 3 birim sola, 4 birim yukarı ötelendiğinde oluşan noktanın koordinatları hangisidir?',
    options_json: JSON.stringify({ A: '(1, -5)', B: '(1, 3)', C: '(7, 3)', D: '(-1, 3)' }),
    correct_answer: 'B',
    primary_topic_id: 'top_donusum_geometrisi',
    difficulty: 2,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_23',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 23,
    page_no: 12,
    question_text: 'Taban ayrıtları 5 cm ve 6 cm, yüksekliği 8 cm olan bir dikdörtgenler prizmasının hacmi kaç santimetreküptür?',
    options_json: JSON.stringify({ A: '210', B: '220', C: '240', D: '280' }),
    correct_answer: 'C',
    primary_topic_id: 'top_geometrik_cisimler',
    difficulty: 2,
    question_type: 'problem_cozme',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_24',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 24,
    page_no: 12,
    question_text: 'Taban yarıçapı 3 cm ve yüksekliği 7 cm olan dik dairesel silindirin hacmi kaç santimetreküptür? (π = 3 alınız.)',
    options_json: JSON.stringify({ A: '162', B: '175', C: '180', D: '189' }),
    correct_answer: 'D',
    primary_topic_id: 'top_geometrik_cisimler',
    difficulty: 2,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  },
  {
    id: 'q_odsgm_25',
    pdf_id: 'pdf_lgs_odsgm',
    question_no: 25,
    page_no: 12,
    question_text: 'Bir dik dairesel silindirin açınımında yanal yüzü oluşturan dikdörtgenin bir kenar uzunluğu 18 cm\'dir. Bu silindirin taban yarıçapı 3 cm olduğuna göre (π = 3), silindirin yüksekliği kaç santimetre olabilir?',
    options_json: JSON.stringify({ A: '6', B: '8', C: '9', D: '12' }),
    correct_answer: 'A',
    primary_topic_id: 'top_geometrik_cisimler',
    difficulty: 4,
    question_type: 'geometrik_gorsel',
    approval_status: 'approved'
  }
];

async function seed() {
  const dbPath = path.join(__dirname, '..', 'data', 'app.db');
  console.log('Loading database from:', dbPath);
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // 1. Insert documents
  const docStmt = db.prepare(`
    INSERT OR REPLACE INTO pdf_documents 
    (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const doc of lgsDocuments) {
    docStmt.run([
      doc.id,
      doc.teacher_id,
      doc.title,
      doc.file_name,
      doc.file_path,
      doc.file_type,
      doc.subject,
      doc.grade_level,
      doc.topic,
      doc.publisher,
      doc.file_size_mb,
      doc.page_count,
      doc.description,
      doc.answer_key,
      doc.question_count
    ]);
  }
  docStmt.free();
  console.log('Seeded 3 official LGS PDF documents.');

  // 2. Insert questions
  const allQuestions = [...lgs2024Questions, ...lgs2023Questions, ...odsgmQuestions];
  const qStmt = db.prepare(`
    INSERT OR REPLACE INTO pdf_extracted_questions 
    (id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, difficulty, question_type, approval_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of allQuestions) {
    qStmt.run([
      q.id,
      q.pdf_id,
      q.question_no,
      q.page_no,
      q.question_text,
      q.options_json,
      q.correct_answer,
      q.primary_topic_id,
      q.difficulty,
      q.question_type,
      q.approval_status
    ]);
  }
  qStmt.free();
  console.log(`Successfully seeded ${allQuestions.length} authentic LGS questions into pdf_extracted_questions.`);

  // Write back to file
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Database successfully saved!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

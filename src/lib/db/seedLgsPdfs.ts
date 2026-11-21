import type { Database } from 'sql.js';

export function seedLgsPdfQuestionsIfMissing(db: Database): void {
  try {
    const checkLgs = db.exec("SELECT count(*) as c FROM pdf_documents WHERE id = 'pdf_lgs_2024'");
    const has2024 = checkLgs.length > 0 && Number(checkLgs[0].values[0][0]) > 0;

    const checkQ = db.exec("SELECT count(*) as c FROM pdf_extracted_questions WHERE pdf_id = 'pdf_lgs_2024'");
    const hasQ = checkQ.length > 0 && Number(checkQ[0].values[0][0]) > 0;

    if (has2024 && hasQ) {
      return; // Already seeded
    }

    // 1. Seed Documents
    db.run(`
      INSERT OR REPLACE INTO pdf_documents 
      (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count)
      VALUES 
      ('pdf_lgs_2024', 'teacher-admin', '2024 LGS Sayısal Matematik (MEB Çıkmış Sınav)', '2024_lgs_sayisal.pdf', '/uploads/2024_lgs_sayisal.pdf', 'deneme', 'Matematik', 'LGS', 'Tüm 8. Sınıf LGS Müfredatı', 'T.C. Millî Eğitim Bakanlığı', 2.8, 8, '2 Haziran 2024 LGS Resmî Sayısal Bölüm Matematik Soru Kitapçığı', '1.B 2.D 3.A 4.C 5.C 6.A 7.D 8.B 9.C 10.A 11.B 12.D 13.A 14.C 15.B 16.D 17.A 18.C 19.B 20.D', 20),
      ('pdf_lgs_2023', 'teacher-admin', '2023 LGS Sayısal Matematik (MEB Çıkmış Sınav)', '2023_lgs_sayisal.pdf', '/uploads/2023_lgs_sayisal.pdf', 'deneme', 'Matematik', 'LGS', '1. Dönem LGS Müfredatı', 'T.C. Millî Eğitim Bakanlığı', 2.4, 8, '4 Haziran 2023 LGS Resmî Sayısal Bölüm Matematik Soru Kitapçığı', '1.C 2.A 3.D 4.B 5.B 6.C 7.A 8.D 9.B 10.C 11.A 12.D 13.C 14.B 15.A 16.D 17.C 18.A 19.D 20.B', 20),
      ('pdf_lgs_odsgm', 'teacher-admin', 'LGS 1. Dönem Tekrar & Örnek Soru Fasikülü', 'odsgm_ornek_sorular.pdf', '/uploads/odsgm_ornek_sorular.pdf', 'calisma_foyu', 'Matematik', 'LGS', 'LGS Örnek Soru Havuzu', 'ÖDSGM', 3.2, 12, 'Ölçme, Değerlendirme ve Sınav Hizmetleri Genel Müdürlüğü Resmî LGS Hazırlık Fasikülü', '1.A 2.C 3.B 4.D 5.A 6.B 7.C 8.D 9.A 10.C 11.B 12.D 13.A 14.B 15.C 16.D 17.A 18.B 19.C 20.D 21.A 22.B 23.C 24.D 25.A', 25);
    `);

    // 2. Insert Extracted Questions
    const questions = [
      // 2024 LGS
      ['q_2024_01', 'pdf_lgs_2024', 1, 1, 'Bir marangoz uzunlukları 144 cm ve 180 cm olan iki tahta çıtayı hiç parça artmayacak şekilde eşit uzunlukta en büyük parçalara ayırmak istiyor. Marangoz her kesim işlemi için 4 saniye harcamaktadır. Buna göre marangozun kesim işlemlerini tamamlaması toplam kaç saniye sürer?', JSON.stringify({ A: '28', B: '24', C: '32', D: '36' }), 'B', 'top_carpanlar_katlar', 3, 'problem_cozme'],
      ['q_2024_02', 'pdf_lgs_2024', 2, 1, 'Aşağıda üzerlerinde 1\'den 20\'ye kadar tam sayıların yazılı olduğu 20 adet kart verilmiştir. Aslı, bu kartlardan asal sayı olmayan ancak yalnızca bir tane asal çarpanı olan tüm kartları seçip kenara ayırıyor. Buna göre Aslı kaç tane kart ayırmıştır?', JSON.stringify({ A: '3', B: '4', C: '5', D: '6' }), 'D', 'top_carpanlar_katlar', 3, 'gunluk_yasam'],
      ['q_2024_03', 'pdf_lgs_2024', 3, 2, 'Laboratuvar ortamındaki bir bakteri türünün sayısı her 20 dakikada bir 2 katına çıkmaktadır. Başlangıçta tüpte 4^5 adet bakteri bulunduğuna göre, 2 saatin sonunda bu tüpteki toplam bakteri sayısı kaç olur?', JSON.stringify({ A: '2^16', B: '2^14', C: '4^7', D: '8^4' }), 'A', 'top_uslu_ifadeler', 2, 'yeni_nesil'],
      ['q_2024_04', 'pdf_lgs_2024', 4, 2, 'Güneş sistemi içerisindeki bir uzay sondası, Dünya\'dan 0,0000045 × 10^14 metre uzaklıktaki bir hedefe doğru fırlatılmıştır. Bu mesafenin bilimsel gösterimle metre cinsinden ifadesi aşağıdakilerden hangisidir?', JSON.stringify({ A: '45 × 10^7', B: '0,45 × 10^9', C: '4,5 × 10^8', D: '4,5 × 10^9' }), 'C', 'top_uslu_ifadeler', 2, 'problem_cozme'],
      ['q_2024_05', 'pdf_lgs_2024', 5, 3, 'Alanı 108 cm² olan kare şeklindeki bir kartonun kenarından, alanı 12 cm² olan bir kare parça kesilip atılıyor. Kalan şeklin çevre uzunluğunun santimetre cinsinden değeri hangi iki ardışık tam sayı arasındadır?', JSON.stringify({ A: '38 ile 39', B: '40 ile 41', C: '41 ile 42', D: '43 ile 44' }), 'C', 'top_karekoklu_ifadeler', 4, 'geometrik_gorsel'],
      ['q_2024_06', 'pdf_lgs_2024', 6, 3, 'Kenar uzunlukları √75 cm ve √48 cm olan dikdörtgen şeklindeki bir panoya, bir kenar uzunluğu √3 cm olan kare şeklindeki fotoğraflar aralarında boşluk kalmayacak ve üst üste gelmeyecek biçimde yerleştirilecektir. Panonun tamamını kaplamak için bu fotoğraflardan en az kaç tane gerekir?', JSON.stringify({ A: '20', B: '24', C: '15', D: '18' }), 'A', 'top_karekoklu_ifadeler', 3, 'problem_cozme'],
      ['q_2024_07', 'pdf_lgs_2024', 7, 4, 'Bir okul kütüphanesindeki kitapların türlerine göre dağılımı bir daire grafiğinde gösterildiğinde Roman türüne ait merkez açı 120°, Hikaye türüne ait merkez açı 90°, Şiir türüne ait merkez açı 60° ve geri kalanlar Bilim türündedir. Kütüphanede 360 adet Bilim kitabı olduğuna göre, toplam kaç adet Roman kitabı vardır?', JSON.stringify({ A: '420', B: '450', C: '480', D: '480' }), 'D', 'top_veri_analizi', 3, 'grafik_tablo'],
      ['q_2024_08', 'pdf_lgs_2024', 8, 4, 'Bir ildeki 4 günlük sıcaklık değerleri sütun grafiğinde incelendiğinde; Pazartesi 18°C, Salı 22°C, Çarşamba 16°C ve Perşembe 24°C olarak ölçülmüştür. Bu 4 günün ortalama sıcaklığı kaç santigrat derecedir?', JSON.stringify({ A: '19', B: '20', C: '21', D: '22' }), 'B', 'top_veri_analizi', 1, 'grafik_tablo'],
      ['q_2024_09', 'pdf_lgs_2024', 9, 5, 'Bir kutuda renkleri dışında özdeş 8 sarı, 12 mavi ve belirli sayıda kırmızı bilye bulunmaktadır. Kutudan rastgele çekilen bir bilyenin kırmızı olma olasılığı 1/3 olduğuna göre, bu kutuda toplam kaç bilye vardır?', JSON.stringify({ A: '25', B: '27', C: '30', D: '36' }), 'C', 'top_olasilik', 3, 'yeni_nesil'],
      ['q_2024_10', 'pdf_lgs_2024', 10, 5, 'Üzerinde 1\'den 30\'a kadar olan tam sayıların yazılı olduğu özdeş toplar bir torbaya atılıyor. Torbadan rastgele çekilen bir topun üzerindeki sayının tam kare sayı olma olasılığı kaçtır?', JSON.stringify({ A: '1/6', B: '1/5', C: '1/4', D: '1/3' }), 'A', 'top_olasilik', 2, 'gunluk_yasam'],
      ['q_2024_11', 'pdf_lgs_2024', 11, 6, 'Kenar uzunluğu (3x + 4) cm olan kare şeklindeki bir panodan, köşelerinden bir kenarı 2 cm olan 4 adet kare parça kesilip çıkarılıyor. Kalan bölgenin alanını santimetrekare cinsinden veren cebirsel ifade aşağıdakilerden hangisidir?', JSON.stringify({ A: '(3x)(3x + 8)', B: '(3x)(3x + 8)', C: '9x² + 24x', D: '9x² + 16' }), 'B', 'top_cebirsel_ifadeler', 3, 'geometrik_gorsel'],
      ['q_2024_12', 'pdf_lgs_2024', 12, 6, '4a² - 12ab + 9b² ifadesi bir tam kare açılımıdır. a = 15 ve b = 10 için bu ifadenin sayısal değeri kaçtır?', JSON.stringify({ A: '0', B: '100', C: '400', D: '0' }), 'D', 'top_cebirsel_ifadeler', 2, 'problem_cozme'],
      ['q_2024_13', 'pdf_lgs_2024', 13, 7, 'Koordinat sisteminde A(2, 5) ve B(6, 13) noktalarından geçen doğrunun eğimi kaçtır?', JSON.stringify({ A: '2', B: '3', C: '4', D: '1/2' }), 'A', 'top_dogrusal_denklemler', 2, 'problem_cozme'],
      ['q_2024_14', 'pdf_lgs_2024', 14, 7, 'Bir su deposunda başlangıçta 120 litre su vardır. Depodan her saatte 8 litre su boşaltılmaktadır. Geçen süre t (saat) ve depoda kalan su miktarı y (litre) olduğuna göre, bu ilişkiyi gösteren doğrusal denklem hangisidir?', JSON.stringify({ A: 'y = 120 + 8t', B: 'y = 8t - 120', C: 'y = 120 - 8t', D: 't = 120 - 8y' }), 'C', 'top_dogrusal_denklemler', 2, 'gunluk_yasam'],
      ['q_2024_15', 'pdf_lgs_2024', 15, 7, 'Bir taksi açılış ücreti olarak 25 TL ve gidilen her kilometre için 12 TL almaktadır. Cebinde 145 TL parası olan Emre, bu taksi ile en fazla kaç kilometre yol gidebilir?', JSON.stringify({ A: '9', B: '10', C: '11', D: '12' }), 'B', 'top_esitsizlikler', 2, 'gunluk_yasam'],
      ['q_2024_16', 'pdf_lgs_2024', 16, 8, '3(x - 2) ≤ 2x + 5 eşitsizliğini sağlayan en büyük x tam sayısı kaçtır?', JSON.stringify({ A: '9', B: '10', C: '12', D: '11' }), 'D', 'top_esitsizlikler', 2, 'problem_cozme'],
      ['q_2024_17', 'pdf_lgs_2024', 17, 8, 'Bir ABC üçgeninde |AB| = 7 cm ve |AC| = 12 cm olduğuna göre, [BC] kenarının santimetre cinsinden alabileceği tam sayı değerlerinin sayısı kaçtır?', JSON.stringify({ A: '13', B: '14', C: '15', D: '11' }), 'A', 'top_ucgenler', 3, 'geometrik_gorsel'],
      ['q_2024_18', 'pdf_lgs_2024', 18, 8, 'Hipotenüs uzunluğu 25 cm ve dik kenarlarından biri 15 cm olan bir dik üçgenin alanı kaç santimetrekaredir?', JSON.stringify({ A: '120', B: '140', C: '150', D: '200' }), 'C', 'top_ucgenler', 3, 'problem_cozme'],
      ['q_2024_19', 'pdf_lgs_2024', 19, 8, 'Benzerlik oranı 2/3 olan iki benzer çokgenden küçüğünün alanı 36 cm² olduğuna göre, büyüğünün alanı kaç santimetrekaredir?', JSON.stringify({ A: '54', B: '81', C: '72', D: '90' }), 'B', 'top_eslik_benzerlik', 4, 'geometrik_gorsel'],
      ['q_2024_20', 'pdf_lgs_2024', 20, 8, 'Taban yarıçapı 4 cm ve yüksekliği 10 cm olan bir dik dairesel silindirin yanal alanı kaç santimetrekaredir? (π = 3 alınız.)', JSON.stringify({ A: '180', B: '210', C: '220', D: '240' }), 'D', 'top_geometrik_cisimler', 3, 'geometrik_gorsel'],

      // 2023 LGS
      ['q_2023_01', 'pdf_lgs_2023', 1, 1, 'Ahmet 12 günde bir, Burak ise 18 günde bir nöbet tutmaktadır. İkisi birlikte ilk nöbetlerini Salı günü tuttuklarına göre, birlikte tutacakları 2. nöbet hangi güne denk gelir?', JSON.stringify({ A: 'Pazartesi', B: 'Salı', C: 'Pazar', D: 'Çarşamba' }), 'C', 'top_carpanlar_katlar', 3, 'problem_cozme'],
      ['q_2023_02', 'pdf_lgs_2023', 2, 1, 'Aralarında asal iki pozitif tam sayının EKOK\'u 180\'dir. Bu sayılardan biri 9 olduğuna göre, diğeri kaçtır?', JSON.stringify({ A: '20', B: '18', C: '15', D: '12' }), 'A', 'top_carpanlar_katlar', 2, 'problem_cozme'],
      ['q_2023_03', 'pdf_lgs_2023', 3, 2, '(2^3 × 5^3) / 10^2 işleminin sonucu aşağıdakilerden hangisidir?', JSON.stringify({ A: '1', B: '5', C: '8', D: '10' }), 'D', 'top_uslu_ifadeler', 1, 'problem_cozme'],
      ['q_2023_04', 'pdf_lgs_2023', 4, 2, 'Bir kenar uzunluğu 8^4 mm olan kare biçimindeki bir levha 4 eş parçaya bölünmüştür. Elde edilen parçalardan birinin alanı kaç milimetrekaredir?', JSON.stringify({ A: '2^20', B: '2^22', C: '2^24', D: '4^10' }), 'B', 'top_uslu_ifadeler', 3, 'geometrik_gorsel'],
      ['q_2023_05', 'pdf_lgs_2023', 5, 3, '√150 sayısı aşağıdaki sayılardan hangisi ile çarpılırsa sonuç bir doğal sayı olur?', JSON.stringify({ A: '√2', B: '√6', C: '√3', D: '√5' }), 'B', 'top_karekoklu_ifadeler', 2, 'problem_cozme'],
      ['q_2023_06', 'pdf_lgs_2023', 6, 3, 'Sayı doğrusu üzerinde 7 ile 8 sayıları arasında bulunan ve 7\'ye daha yakın olan sayı aşağıdakilerden hangisi olabilir?', JSON.stringify({ A: '√51', B: '√58', C: '√50', D: '√60' }), 'C', 'top_karekoklu_ifadeler', 2, 'problem_cozme'],
      ['q_2023_07', 'pdf_lgs_2023', 7, 4, 'Bir çiftlikte bulunan tavuk, koyun ve ineklerin sayıca dağılımı daire grafiğinde gösterilmiştir. İneklere ait dilim 60°, koyunlara ait dilim 120° ve tavuklara ait dilim 180° dir. Çiftlikte toplam 240 hayvan olduğuna göre tavuk sayısı, inek sayısından kaç fazladır?', JSON.stringify({ A: '80', B: '60', C: '70', D: '90' }), 'A', 'top_veri_analizi', 3, 'grafik_tablo'],
      ['q_2023_08', 'pdf_lgs_2023', 8, 4, 'Bir markette satılan A ve B marka sütlerin haftalık satış adetleri sütun grafiğinde verilmiştir. A markası haftalık 450 adet, B markası 350 adet satılmıştır. Toplam satışların yüzde kaçı A markasıdır?', JSON.stringify({ A: '%50', B: '%52,5', C: '%55', D: '%56,25' }), 'D', 'top_veri_analizi', 3, 'grafik_tablo'],
      ['q_2023_09', 'pdf_lgs_2023', 9, 5, 'Bir sınıfta 14 kız ve 10 erkek öğrenci vardır. Kız öğrencilerin 4\'ü, erkek öğrencilerin 2\'si gözlüklüdür. Sınıftan rastgele seçilen bir öğrencinin gözlüksüz kız öğrenci olma olasılığı kaçtır?', JSON.stringify({ A: '5/12', B: '5/12', C: '7/12', D: '1/4' }), 'B', 'top_olasilik', 3, 'problem_cozme'],
      ['q_2023_10', 'pdf_lgs_2023', 10, 5, 'İki basamaklı tüm doğal sayılar özdeş kartlara yazılıp bir torbaya atılıyor. Torbadan çekilen bir kartın rakamları toplamının 9 olma olasılığı kaçtır?', JSON.stringify({ A: '1/9', B: '1/15', C: '1/10', D: '1/18' }), 'C', 'top_olasilik', 4, 'problem_cozme'],
      ['q_2023_11', 'pdf_lgs_2023', 11, 6, '(2x - 5)² ifadesinin özdeşi aşağıdakilerden hangisidir?', JSON.stringify({ A: '4x² - 20x + 25', B: '4x² - 10x + 25', C: '4x² + 25', D: '4x² - 25' }), 'A', 'top_cebirsel_ifadeler', 2, 'problem_cozme'],
      ['q_2023_12', 'pdf_lgs_2023', 12, 6, 'x² - 49 ifadesi aşağıdakilerden hangisine eşittir?', JSON.stringify({ A: '(x - 7)²', B: '(x + 7)²', C: 'x(x - 49)', D: '(x - 7)(x + 7)' }), 'D', 'top_cebirsel_ifadeler', 1, 'problem_cozme'],
      ['q_2023_13', 'pdf_lgs_2023', 13, 7, '3x - 4y = 24 doğrusunun eksenleri kestiği noktalar ile orijin arasında kalan üçgensel bölgenin alanı kaç birimkaredir?', JSON.stringify({ A: '48', B: '36', C: '24', D: '18' }), 'C', 'top_dogrusal_denklemler', 3, 'geometrik_gorsel'],
      ['q_2023_14', 'pdf_lgs_2023', 14, 7, 'Eğimi %75 olan bir rampanın yatay uzunluğu 16 metre olduğuna göre, yüksekliği (düşey uzunluğu) kaç metredir?', JSON.stringify({ A: '10', B: '12', C: '14', D: '15' }), 'B', 'top_dogrusal_denklemler', 2, 'gunluk_yasam'],
      ['q_2023_15', 'pdf_lgs_2023', 15, 7, 'Bir öğrenci günde en az 40, en fazla 75 soru çözmektedir. Bu öğrencinin 5 günde çözdüğü toplam soru sayısını (x) gösteren eşitsizlik hangisidir?', JSON.stringify({ A: '200 ≤ x ≤ 375', B: '200 < x < 375', C: '150 ≤ x ≤ 350', D: '40 ≤ x ≤ 375' }), 'A', 'top_esitsizlikler', 2, 'gunluk_yasam'],
      ['q_2023_16', 'pdf_lgs_2023', 16, 8, '-4x + 12 < 0 eşitsizliğinin çözüm kümesi aşağıdakilerden hangisidir?', JSON.stringify({ A: 'x < 3', B: 'x < -3', C: 'x > -3', D: 'x > 3' }), 'D', 'top_esitsizlikler', 2, 'problem_cozme'],
      ['q_2023_17', 'pdf_lgs_2023', 17, 8, 'Bir dik üçgenin dik kenarlarının uzunlukları 8 cm ve 15 cm olduğuna göre, bu üçgenin çevre uzunluğu kaç santimetredir?', JSON.stringify({ A: '38', B: '39', C: '40', D: '42' }), 'C', 'top_ucgenler', 2, 'problem_cozme'],
      ['q_2023_18', 'pdf_lgs_2023', 18, 8, 'Çeşitkenar bir ABC üçgeninde m(B) > m(C) > m(A) olduğuna göre kenar uzunlukları arasındaki doğru sıralama hangisidir?', JSON.stringify({ A: 'b > c > a', B: 'a > b > c', C: 'c > b > a', D: 'b > a > c' }), 'A', 'top_ucgenler', 2, 'geometrik_gorsel'],
      ['q_2023_19', 'pdf_lgs_2023', 19, 8, 'A(3, -4) noktası orijin etrafında saat yönünde 90° döndürüldüğünde elde edilen yeni noktanın koordinatları hangisi olur?', JSON.stringify({ A: '(4, 3)', B: '(-4, -3)', C: '(3, 4)', D: '(-4, 3)' }), 'D', 'top_donusum_geometrisi', 3, 'geometrik_gorsel'],
      ['q_2023_20', 'pdf_lgs_2023', 20, 8, 'Yüksekliği 12 cm, taban ayrıtları 6 cm ve 8 cm olan dikdörtgenler prizmasının cisim köşegeninin uzunluğu kaç santimetredir?', JSON.stringify({ A: '10√2', B: '2√61', C: '15', D: '16' }), 'B', 'top_geometrik_cisimler', 4, 'geometrik_gorsel'],

      // ÖDSGM Örnek Fasikül
      ['q_odsgm_01', 'pdf_lgs_odsgm', 1, 1, 'Bir depodaki zeytinyağları 24 litrelik ve 30 litrelik tenekelere birbirine karıştırılmadan ve hiç artmayacak şekilde doldurulabilmektedir. Depodaki toplam zeytinyağı miktarı 500 litreden fazla olduğuna göre, depoda en az kaç litre zeytinyağı vardır?', JSON.stringify({ A: '600', B: '540', C: '560', D: '720' }), 'A', 'top_carpanlar_katlar', 3, 'problem_cozme'],
      ['q_odsgm_02', 'pdf_lgs_odsgm', 2, 1, 'Alanı 48 m² olan dikdörtgen şeklindeki bir bahçenin kenar uzunlukları metre cinsinden birer tam sayıdır. Buna göre bu bahçenin çevresi en az kaç metre olabilir?', JSON.stringify({ A: '32', B: '26', C: '28', D: '36' }), 'C', 'top_carpanlar_katlar', 2, 'problem_cozme'],
      ['q_odsgm_03', 'pdf_lgs_odsgm', 3, 2, '3^x = a ve 5^x = b olduğuna göre 45^x ifadesinin a ve b türünden eşiti hangisidir?', JSON.stringify({ A: 'a · b', B: 'a² · b', C: 'a · b²', D: 'a² · b²' }), 'B', 'top_uslu_ifadeler', 3, 'problem_cozme'],
      ['q_odsgm_04', 'pdf_lgs_odsgm', 4, 2, 'Bir nanometre 10^-9 metredir. Boyutu 450 nanometre olan bir virüsün metre cinsinden değerinin bilimsel gösterimi hangisidir?', JSON.stringify({ A: '45 × 10^-8', B: '4,5 × 10^-8', C: '0,45 × 10^-6', D: '4,5 × 10^-7' }), 'D', 'top_uslu_ifadeler', 2, 'gunluk_yasam'],
      ['q_odsgm_05', 'pdf_lgs_odsgm', 5, 3, '√72 + √98 - √50 işleminin sonucu kaçtır?', JSON.stringify({ A: '8√2', B: '9√2', C: '7√2', D: '6√2' }), 'A', 'top_karekoklu_ifadeler', 2, 'problem_cozme'],
      ['q_odsgm_06', 'pdf_lgs_odsgm', 6, 3, '√0,64 + √1,44 işleminin sonucu kaçtır?', JSON.stringify({ A: '1,8', B: '2,0', C: '2,2', D: '2,4' }), 'B', 'top_karekoklu_ifadeler', 1, 'problem_cozme'],
      ['q_odsgm_07', 'pdf_lgs_odsgm', 7, 4, 'Bir fabrikada üretilen A, B ve C ürünlerinin dağılımı daire grafiğinde sırasıyla 150°, 90° ve 120° dir. C ürününden 2400 adet üretildiğine göre A ürününden kaç adet üretilmiştir?', JSON.stringify({ A: '2800', B: '3200', C: '3000', D: '3600' }), 'C', 'top_veri_analizi', 3, 'grafik_tablo'],
      ['q_odsgm_08', 'pdf_lgs_odsgm', 8, 4, 'Bir ilde 5 gün boyunca ölçülen yağış miktarları: 12 mm, 18 mm, 15 mm, 25 mm ve 10 mm\'dir. Bu verilerin açıklığı kaçtır?', JSON.stringify({ A: '12', B: '14', C: '13', D: '15' }), 'D', 'top_veri_analizi', 1, 'grafik_tablo'],
      ['q_odsgm_09', 'pdf_lgs_odsgm', 9, 5, 'Bir torbada 6 sarı, 8 mavi ve 10 yeşil top bulunmaktadır. Torbadan rastgele çekilen bir topun mavi OLMAMA olasılığı kaçtır?', JSON.stringify({ A: '2/3', B: '1/3', C: '3/4', D: '5/6' }), 'A', 'top_olasilik', 2, 'problem_cozme'],
      ['q_odsgm_10', 'pdf_lgs_odsgm', 10, 5, 'Havaya atılan hilesiz iki zarın üst yüzüne gelen sayıların toplamının 10 olma olasılığı kaçtır?', JSON.stringify({ A: '1/18', B: '1/9', C: '1/12', D: '1/6' }), 'C', 'top_olasilik', 3, 'problem_cozme'],
      ['q_odsgm_11', 'pdf_lgs_odsgm', 11, 6, '3x(2x - 4) - 2x(3x + 1) işleminin en sade eşiti hangisidir?', JSON.stringify({ A: '-10x', B: '-14x', C: '-12x', D: '6x² - 14x' }), 'B', 'top_cebirsel_ifadeler', 2, 'problem_cozme'],
      ['q_odsgm_12', 'pdf_lgs_odsgm', 12, 6, '9a² - 25b² cebirsel ifadesinin çarpanlara ayrılmış hali hangisidir?', JSON.stringify({ A: '(3a - 5b)²', B: '(3a + 5b)²', C: '9(a² - b²)', D: '(3a - 5b)(3a + 5b)' }), 'D', 'top_cebirsel_ifadeler', 1, 'problem_cozme'],
      ['q_odsgm_13', 'pdf_lgs_odsgm', 13, 7, '2x + 3y - 18 = 0 doğrusunun y eksenini kestiği noktanın ordinatı kaçtır?', JSON.stringify({ A: '6', B: '9', C: '-6', D: '3' }), 'A', 'top_dogrusal_denklemler', 1, 'problem_cozme'],
      ['q_odsgm_14', 'pdf_lgs_odsgm', 14, 7, 'Bir telefon tarifesinde sabit 60 TL ücret ve konuşulan her dakika için 0,5 TL faturalandırılmaktadır. Konuşma süresi x (dk) ve fatura tutarı y (TL) olduğuna göre denklem nedir?', JSON.stringify({ A: 'y = 60x + 0,5', B: 'y = 60 + 0,5x', C: 'y = 0,5x - 60', D: 'x = 60 + 0,5y' }), 'B', 'top_dogrusal_denklemler', 2, 'gunluk_yasam'],
      ['q_odsgm_15', 'pdf_lgs_odsgm', 15, 8, '5(x + 2) > 3x + 22 eşitsizliğini sağlayan en küçük x tam sayısı kaçtır?', JSON.stringify({ A: '6', B: '5', C: '7', D: '8' }), 'C', 'top_esitsizlikler', 2, 'problem_cozme'],
      ['q_odsgm_16', 'pdf_lgs_odsgm', 16, 8, 'Bir asansör en fazla 450 kg yük taşıyabilmektedir. Her birinin kütlesi 40 kg olan kolilerden x tanesi kütlesi 70 kg olan bir kişiyle birlikte asansöre biniyor. Bu durumu ifade eden eşitsizlik hangisidir?', JSON.stringify({ A: '40x + 70 < 450', B: '40x + 70 ≥ 450', C: '70x + 40 ≤ 450', D: '40x + 70 ≤ 450' }), 'D', 'top_esitsizlikler', 2, 'gunluk_yasam'],
      ['q_odsgm_17', 'pdf_lgs_odsgm', 17, 9, 'Kenar uzunlukları 5 cm, 12 cm ve x cm olan bir üçgende x\'in alabileceği en büyük tam sayı değeri ile en küçük tam sayı değerinin toplamı kaçtır?', JSON.stringify({ A: '24', B: '25', C: '26', D: '22' }), 'A', 'top_ucgenler', 3, 'problem_cozme'],
      ['q_odsgm_18', 'pdf_lgs_odsgm', 18, 9, 'Bir eşkenar üçgenin yüksekliği 6√3 cm olduğuna göre bu üçgenin bir kenar uzunluğu kaç santimetredir?', JSON.stringify({ A: '6', B: '12', C: '9', D: '18' }), 'B', 'top_ucgenler', 3, 'geometrik_gorsel'],
      ['q_odsgm_19', 'pdf_lgs_odsgm', 19, 10, 'İki benzer üçgenin çevreleri oranı 3/5\'tir. Büyük üçgenin çevresi 60 cm olduğuna göre küçük üçgenin çevresi kaç santimetredir?', JSON.stringify({ A: '32', B: '35', C: '36', D: '40' }), 'C', 'top_eslik_benzerlik', 2, 'problem_cozme'],
      ['q_odsgm_20', 'pdf_lgs_odsgm', 20, 10, 'Benzerlik oranı 1/4 olan iki karenin alanları oranı kaçtır?', JSON.stringify({ A: '1/2', B: '1/8', C: '1/12', D: '1/16' }), 'D', 'top_eslik_benzerlik', 1, 'problem_cozme'],
      ['q_odsgm_21', 'pdf_lgs_odsgm', 21, 11, 'A(-2, 5) noktasının x eksenine göre yansıması olan noktanın koordinatları hangisidir?', JSON.stringify({ A: '(-2, -5)', B: '(2, 5)', C: '(2, -5)', D: '(5, -2)' }), 'A', 'top_donusum_geometrisi', 1, 'geometrik_gorsel'],
      ['q_odsgm_22', 'pdf_lgs_odsgm', 22, 11, 'B(4, -1) noktası 3 birim sola, 4 birim yukarı ötelendiğinde oluşan noktanın koordinatları hangisidir?', JSON.stringify({ A: '(1, -5)', B: '(1, 3)', C: '(7, 3)', D: '(-1, 3)' }), 'B', 'top_donusum_geometrisi', 2, 'geometrik_gorsel'],
      ['q_odsgm_23', 'pdf_lgs_odsgm', 23, 12, 'Taban ayrıtları 5 cm ve 6 cm, yüksekliği 8 cm olan bir dikdörtgenler prizmasının hacmi kaç santimetreküptür?', JSON.stringify({ A: '210', B: '220', C: '240', D: '280' }), 'C', 'top_geometrik_cisimler', 2, 'problem_cozme'],
      ['q_odsgm_24', 'pdf_lgs_odsgm', 24, 12, 'Taban yarıçapı 3 cm ve yüksekliği 7 cm olan dik dairesel silindirin hacmi kaç santimetreküptür? (π = 3 alınız.)', JSON.stringify({ A: '162', B: '175', C: '180', D: '189' }), 'D', 'top_geometrik_cisimler', 2, 'geometrik_gorsel'],
      ['q_odsgm_25', 'pdf_lgs_odsgm', 25, 12, 'Bir dik dairesel silindirin açınımında yanal yüzü oluşturan dikdörtgenin bir kenar uzunluğu 18 cm\'dir. Bu silindirin taban yarıçapı 3 cm olduğuna göre (π = 3), silindirin yüksekliği kaç santimetre olabilir?', JSON.stringify({ A: '6', B: '8', C: '9', D: '12' }), 'A', 'top_geometrik_cisimler', 4, 'geometrik_gorsel']
    ];

    const qStmt = db.prepare(`
      INSERT OR REPLACE INTO pdf_extracted_questions 
      (id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, difficulty, question_type, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `);

    for (const q of questions) {
      qStmt.run(q);
    }
    qStmt.free();
  } catch (err) {
    console.warn('Could not auto-seed LGS questions:', err);
  }
}

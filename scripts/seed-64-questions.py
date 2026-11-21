import json
import sqlite3
import os
import shutil

# Database path
db_path = r'c:\Users\user\OneDrive\Desktop\Ali Metin\data\app.db'

# Define all 64 MEB questions
questions_data = [
    {
        "no": 1, "page": 1, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Ahmet ile Deniz aralarında sırasıyla birer tane pozitif tam sayı söyledikleri bir sayı oyunu oynuyorlar. Oyuncunun söylediği sayı kadar puan kendisine, söylediği sayının kendisi hariç pozitif tam sayı bölenlerinin toplamı kadar puan rakibine yazılıyor. Toplam puanı fazla olan oyuncu oyunu kazanıyor.\nÖrneğin Ahmet 10, Deniz 12 sayılarını söylemiş olsunlar. Ahmet'in aldığı puan 10 + 16 = 26, Deniz'in aldığı puan 8 + 12 = 20.\nBuna göre Ahmet'in 14 sayısını söylediği oyunda, Deniz aşağıdaki sayılardan hangisini söylerse oyunu kazanır?",
        "options": {"A": "18", "B": "20", "C": "25", "D": "36"}
    },
    {
        "no": 2, "page": 1, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "D",
        "text": "Yarıçapının uzunluğu r olan bir çemberin çevresi 2πr dir.\nMehmet bisiklet almak için bisikletçiye gidiyor ve tekerlerin merkezlerinin yere olan uzaklıkları 30 cm ile 40 cm olan iki farklı bisikleti beğeniyor.\nBu iki bisikleti aynı mesafede sürerek deneyen Mehmet, her iki bisikletin de tekerlerinin tam tur atarak mesafeyi tamamladığını görüyor.\nBuna göre Mehmet'in bisikletleri denediği mesafe en az kaç santimetredir? (π yerine 3 alınız.)",
        "options": {"A": "400", "B": "420", "C": "700", "D": "720"}
    },
    {
        "no": 3, "page": 2, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "B",
        "text": "Bir çiftçi yaptırdığı toprak analizi sonucunda tarlasının ihtiyacı olan azot miktarını belirliyor. Bu ihtiyacı karşılamak için torbalar halinde satılan A ve B marka gübrelerinden birini tercih edecektir.\nA Gübresi: 50 kg torba, %20 Azot, Fiyat: 70 TL\nB Gübresi: 50 kg torba, %44 Azot, Fiyat: 160 TL\nÇiftçi hangi markayı tercih ederse etsin aldığı gübrenin tamamını kullandığında toprağın ihtiyacı olan azot miktarının tam karşılandığını görüyor. Daha az ödeme yapacak şekilde bir tercihte bulunan çiftçi aldığı gübre için 1000 TL'den az ödüyor.\nBuna göre çiftçi diğer markayı tercih etseydi kaç TL daha fazla ödeme yapardı?",
        "options": {"A": "15", "B": "30", "C": "45", "D": "60"}
    },
    {
        "no": 4, "page": 2, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Aşağıda uzunluğu 360 cm ile 400 cm arasında olan AB doğru parçası verilmiştir.\nBu doğru parçasının üzerine kenar uzunlukları 5 cm ve 7 cm'lik kareler birer kenarları ortak olacak şekilde boşluk kalmadan ve doğru parçasından taşmadan yerleştirilebiliyor.\nBuna göre aşağıdaki karelerden hangisi yeteri kadar kullanılıp yukarıdaki gibi yerleştirildiğinde doğru parçasında boşluk ve taşma olmaz?",
        "options": {"A": "25 cm", "B": "55 cm", "C": "70 cm", "D": "105 cm"}
    },
    {
        "no": 5, "page": 3, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "B",
        "text": "Kare dik prizma şeklindeki koliler (taban 30 cm, yükseklik 80 cm) herhangi bir yüzeyi üzerinde üst üste konularak hiç boşluk kalmadan yüksekliği 3 metreden az olan bir soğuk hava deposunda tavana kadar yerleştirilebilmektedir.\nBu işlem aşağıdaki kare dik prizma şeklindeki kolilerden hangisi ile de yapılabilir?",
        "options": {"A": "90 cm x 20 cm", "B": "120 cm x 60 cm", "C": "180 cm x 50 cm", "D": "60 cm x 45 cm"}
    },
    {
        "no": 6, "page": 4, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Bir toplantı salonuna genişliği 60 cm olan koltuklar, bir doğru boyunca aralarında 25 cm boşluk bulunacak şekilde yerleştirilmiştir. İlk koltuk ile duvar arasında boşluk olmayıp son koltuk ile duvar arasında ise 25 cm boşluk vardır.\nBu salona daha fazla koltuk yerleştirmek için koltuklar, bir doğru boyunca aralarında 15 cm boşluk bulunacak şekilde yeniden düzenlenmiştir.\nBu durumda salondaki bir sıraya aynı koltuklardan en az kaç tane daha yerleştirilmiştir?",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"}
    },
    {
        "no": 7, "page": 4, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "C",
        "text": "Belediye görevlileri kaldırımlardaki dikdörtgenler prizması şeklindeki taşların arasına, görme engellilere yön belirlemede kolaylık sağlayacak üst yüzeyi kabartmalı kare prizma şeklindeki sarı renkli taşlar yerleştirmişlerdir.\nUzunluğu 30 metreden az olan düz bir kaldırıma bu taşlar görseldeki gibi bölünmeden, üst üste gelmeden ve aralarında boşluk kalmadan yerleştirilmiştir (Kaldırım blokları: 40 cm ve 70 cm).\nBu kaldırıma yerleştirilen üst yüzeyi kabartmalı kare prizma şeklindeki sarı renkli taşların sayısı en çok kaçtır?",
        "options": {"A": "40", "B": "44", "C": "70", "D": "74"}
    },
    {
        "no": 8, "page": 5, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Merdivenlerin basamaklarının yüksekliği belli standartlara göre yapılmaktadır. Bu standartlara göre basamak yüksekliği 18 cm'den fazla olmamalıdır. Zeminden birinci duvarın üstüne (210 cm) ve birinci duvardan ikinci duvarın üstüne doğru (300 cm) eş basamaklardan oluşan merdiven modellenmiştir.\nModeldeki merdivenin basamaklarının yüksekliği santimetre cinsinden tam sayı olduğuna göre bu merdiven en az kaç basamaktan oluşmuştur?",
        "options": {"A": "10", "B": "15", "C": "20", "D": "30"}
    },
    {
        "no": 9, "page": 5, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "D",
        "text": "Eylül Hanım, kredi kartı için her hanesinde bir rakam olan dört haneli bir şifre belirleyecektir. Bunun için soldan sağa doğru ilk haneye yazdığı rakamın karesini ikinci haneye ve ikinci haneye yazdığı rakamın karesini son iki haneye yazarak şifresini oluşturuyor.\nEylül Hanım'ın oluşturduğu şifrenin son rakamı 6 olduğuna göre ilk rakamı kaçtır?",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"}
    },
    {
        "no": 10, "page": 6, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "C",
        "text": "Aşağıda 1'den 100'e kadar olan doğal sayıların yazılı olduğu bir kart verilmiştir.\nSerra, bu kartta 2'nin pozitif tam sayı kuvvetlerinin yazılı olduğu kareleri sarıya, 3'ün pozitif tam sayı kuvvetlerinin yazılı olduğu kareleri maviye ve tam kare sayıların yazılı olduğu kareleri de kırmızıya boyuyor.\nSarı boyalı kareler kırmızıya boyandığında turuncu, mavi boyalı kareler kırmızıya boyandığında ise mor renk alıyor.\nBuna göre son durumda turuncu ve mor renkli kare sayıları aşağıdaki seçeneklerin hangisinde doğru olarak verilmiştir?",
        "options": {"A": "Mor: 3, Turuncu: 3", "B": "Mor: 3, Turuncu: 2", "C": "Mor: 2, Turuncu: 3", "D": "Mor: 2, Turuncu: 2"}
    },
    {
        "no": 11, "page": 6, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "A",
        "text": "a ≠ 0 ve m, n birer tam sayı olmak üzere aⁿ · aᵐ = aⁿ⁺ᵐ ve aⁿ / aᵐ = aⁿ⁻ᵐ dir.\na⁻⁵, a⁻³, a³, a⁴, a⁵ ve a⁶ üslü ifadelerinin tamamı tablodaki mavi boyalı her bir hücreye bir üslü ifade gelecek şekilde yazılacaktır.\nA, B ve C hücrelerindeki sayıların her biri bulunduğu hücrenin aynı satır ve sütununda bulunan mavi boyalı hücrelerdeki üslü ifadelerin çarpımına eşittir.\nA ve B hücrelerine yazılacak olan üslü ifadelerin çarpımı a⁹ olduğuna göre C hücresine yazılacak olan ifade aşağıdakilerden hangisidir?",
        "options": {"A": "a", "B": "a³", "C": "a⁷", "D": "a⁹"}
    },
    {
        "no": 12, "page": 7, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Bir öğretmen öğrencilerine üslü ifadeleri anlatmak için bir oyun tasarlıyor. İki tablet: 1. Tablet [-3, 4, 2, -4], 2. Tablet [2, 3, -2, -3].\nİki tablette ışığı yanan sayılar; aynı olduğunda o sayının karesi, farklı olduğunda küçük olan sayı taban, büyük olan sayı üs olacak şekilde üslü ifadenin değeri hesaplanıyor.\nMavi tuşa iki kez basılıyor. İlk basıldığında aynı sayıların, ikinci basıldığında farklı sayıların ışığı yandığına göre hesaplanan değerlerin çarpımı en çok kaçtır?",
        "options": {"A": "12⁴", "B": "18²", "C": "3⁶", "D": "2⁸"}
    },
    {
        "no": 13, "page": 7, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Laboratuvar ortamındaki boş iki farklı deney tüpünden birine 2⁹, diğerine 8⁴ tane bakteri yerleştiriliyor. Bir saat sonunda I. tüpteki bakteri sayısı 4 katına, II. tüpteki bakteri sayısı 8 katına çıkıyor.\nBir saatin sonunda I. tüpteki bakterinin yarısı, II. tüpteki bakterinin 1/4'i alındığına göre II. tüpten alınan bakteri sayısı I. tüpten alınan bakteri sayısının en az kaç katıdır?",
        "options": {"A": "1/8", "B": "1/16", "C": "1/32", "D": "1/64"}
    },
    {
        "no": 14, "page": 8, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "A",
        "text": "A, B, C, D mikroorganizmaları mikroskop altında büyütülerek incelenmiştir.\nA: Gerçek büyüklük 2,5·10⁻¹ mm, Mikroskopta görülen 3,75 mm\nB: Gerçek büyüklük 3·10⁻² mm, Mikroskopta görülen 3 mm\nC: Gerçek büyüklük 1·10⁻⁴ mm, Mikroskopta görülen 0,1 mm\nD: Gerçek büyüklük 2·10⁻³ mm, Mikroskopta görülen 2,4 mm\nBu inceleme sırasında hangi canlı için kullanılan büyütme oranı en küçüktür?",
        "options": {"A": "A mikroorganizması", "B": "B mikroorganizması", "C": "C mikroorganizması", "D": "D mikroorganizması"}
    },
    {
        "no": 15, "page": 8, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "A",
        "text": "Ağaçlar karbondioksit emilimi nedeniyle küresel ısınmanın etkilerini azaltmaktadır. Yetişkin bir ağacın bir saatte ortalama 2,3 kg karbondioksit emilimi yaptığı bilinmektedir.\n'10 Milyon Öğrenciye 10 Milyon Fidan' projesi kapsamında dikilen 10 milyon fidanın tamamının yetişkinliğe erişmesi durumunda bir saatte yapacağı ortalama karbondioksit emilimi miktarının ton cinsinden bilimsel gösterimi aşağıdakilerden hangisidir? (1 ton = 1000 kg)",
        "options": {"A": "2,3 · 10⁴", "B": "2,3 · 10⁵", "C": "2,3 · 10⁶", "D": "2,3 · 10⁷"}
    },
    {
        "no": 16, "page": 9, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "B",
        "text": "Maraton, 42 195 metrelik bir koşu yarışıdır. Bir maraton koşusunda yarışmacıların su ve gıda ihtiyaçlarını karşılamak amacıyla yolun sol tarafına eşit aralıklarla su istasyonları, sağ tarafına ise eşit aralıklarla gıda istasyonları kurulacaktır. Yarışın bittiği noktada her iki istasyonun da karşılıklı birer tane olması istenmektedir.\nBu istasyonların aralarındaki mesafeler aşağıdaki seçeneklerin hangisindeki gibi olursa karşılıklı istasyon sayısı en az olur?",
        "options": {"A": "Su: 2,5 km, Gıda: 3,5 km", "B": "Su: 2,5 km, Gıda: 4,5 km", "C": "Su: 3 km, Gıda: 4 km", "D": "Su: 3 km, Gıda: 4,5 km"}
    },
    {
        "no": 17, "page": 9, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Ayrıtları a, b, c olan dikdörtgenler prizmasının hacmi a·b·c dir.\nKutuplar üzerinde keşif uçuşları gerçekleştiren bir ekip... dikdörtgenler prizması görünümünde bir buzdağı keşfetti. Uzunluğunun 1600 metre, genişliğinin 1000 metre, suyun üzerindeki yüksekliğinin 50 metre olduğunu ve görünen kısmının buzdağının %20'sini oluşturduğunu tahmin etmektedirler.\nUzmanların tahminlerine göre bu buzdağının tamamının hacminin metreküp cinsinden bilimsel gösterimi aşağıdakilerden hangisidir?",
        "options": {"A": "8·10⁷", "B": "2,4·10⁸", "C": "4·10⁸", "D": "8·10⁸"}
    },
    {
        "no": 18, "page": 10, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Elektrik devrelerinde akımı sınırlamak için dirençler kullanılır. Renkli şerit tablosu verilmiştir:\nYeşil (5), Kahverengi (1), Sarı (Çarpan 10⁴), Gümüş (Tolerans %10).\nÜzerindeki şeritlerin renkleri soldan sağa doğru sırasıyla yeşil, kahverengi, sarı ve gümüş olan yukarıdaki direncin değeri, ohm cinsinden aşağıdakilerden hangisine eşit olabilir?",
        "options": {"A": "4,3 · 10⁴", "B": "4,9 · 10⁴", "C": "5,2 · 10⁵", "D": "6,2 · 10⁵"}
    },
    {
        "no": 19, "page": 11, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "A",
        "text": "Bir ondalık gösterimin, basamak değerleri toplamı şeklinde yazılmasına ondalık gösterimin çözümlenmesi denir. Sıramatik panelinde Gişe No ve Sıra No gösterilmektedir.\nArızanın devam ettiği süre içinde sisteme çözümlenmiş hâli 1·10¹ + 6·10⁻¹ + 2·10⁻³ biçiminde verilen ondalık gösterim işlendiğinde panel ekranında oluşacak görüntü aşağıdakilerden hangisi olabilir?",
        "options": {"A": "Gişe No: 10, Sıra No: 602", "B": "Gişe No: 10, Sıra No: 620", "C": "Gişe No: 10, Sıra No: 062", "D": "Gişe No: 16, Sıra No: 002"}
    },
    {
        "no": 20, "page": 12, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "A",
        "text": "Bir üçgenin alanı, bir kenar uzunluğunun ve o kenara ait yüksekliğin uzunluğunun çarpımının yarısına eşittir.\nSerdar Bey, kenar uzunlukları santimetre cinsinden 20'den büyük birer tam sayı olan eş çerçevelere resimleri koymuştur. Duvarda çerçevelerin üst çıtaları ile ipler arasında oluşan üçgensel bölgelerin alanları 120 ve 150 cm² dir.\nBuna göre çerçevelerin odanın zemininden yükseklikleri arasındaki farkın santimetre cinsinden alabileceği en büyük tam sayı değer kaçtır?",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"}
    },
    {
        "no": 21, "page": 13, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Aşağıda 4 hanesindeki rakamlar çevrilerek şifre oluşturulabilen özel bir kilit verilmiştir. Soldan sağa doğru ilk iki hanede oluşturulan iki basamaklı sayının asal çarpanları küçükten büyüğe doğru son iki haneye yazılmaktadır.\nYiğit, en soldaki hanede 1 rakamını çizgi ile hizaladığına göre yanındaki hanede aşağıdaki rakamlardan hangisini çizgi ile hizalamış olabilir?",
        "options": {"A": "0", "B": "5", "C": "6", "D": "8"}
    },
    {
        "no": 22, "page": 14, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "C",
        "text": "Bir okulun her katındaki sınıflar 1'den 5'e kadar numaralandırılmıştır. Kat numarası ve sınıf numarası ile salon numarası oluşturulmaktadır (ör: 14, 15).\nEylül ve Zeynep bu okulda salon numarası asal olmayan farklı sınıflarda sınava girmişlerdir. Salon numaralarının yalnızca bir tane asal çarpanı olduğuna göre bu salon numaralarının en küçük ortak katı kaçtır?",
        "options": {"A": "100", "B": "300", "C": "600", "D": "800"}
    },
    {
        "no": 23, "page": 15, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Kedi tırmalama tahtaları: Mavi ip (15 m tahta başına, metresi 4 TL), Pembe ip (12 m tahta başına, metresi 5 TL).\nÖğrencilerin yaptığı tahtaların tümü için iki renk ipten de eşit uzunlukta kullanılmış ve kullanılan iplerin toplam maliyeti 1400 ile 1700 TL arasında olmuştur.\nBuna göre toplam kaç tane kedi tırmalama tahtası yapılmıştır?",
        "options": {"A": "21", "B": "27", "C": "28", "D": "36"}
    },
    {
        "no": 24, "page": 16, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Bir marangoz ustası Kerem ve Ahmet isimli çıraklarına tahtalar verir: Kerem'e 160 cm, 100 cm, 80 cm; Ahmet'e 200 cm, 90 cm, 60 cm.\nÇıraklar yan tahtaları 1 metre (100 cm) olan basamakları eş merdiven yapacaklardır.\nBuna göre çırakların yaptığı merdivenlerin basamak sayıları arasındaki fark kaçtır?",
        "options": {"A": "1", "B": "2", "C": "3", "D": "4"}
    },
    {
        "no": 25, "page": 17, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "C",
        "text": "Bir sınıftaki kare şeklindeki eş iki pencere tüller ile süsleniyor. Tüllerin orta kısmının genişliği birinde pencerenin kenar uzunluğunun 1/4'üne, diğerinde ise 1/6'sına eşittir.\nTüllerin orta kısımlarının genişliği santimetre cinsinden birer tam sayı olduğuna göre pencerelerden birinin santimetrekare cinsinden alanı aşağıdakilerden hangisine eşit olabilir?",
        "options": {"A": "100", "B": "121", "C": "144", "D": "169"}
    },
    {
        "no": 26, "page": 18, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "A",
        "text": "Matematik öğretmeni Elif'e sekiz yapboz parçası verip değerleri birbirine eşit olan 4 parçayı birleştirerek bir yapboz modeli oluşturmasını istemiştir.\nParçalar: (-2)¹², (2¹²)⁻¹, (-16)³, (-1/16)³, (-4)⁶, (-8)⁴, (-64)⁻², (-1/8)⁻⁴.\nBuna göre Elif'in oluşturması gereken yapboz modeli aşağıdakilerden hangisidir?",
        "options": {"A": "Kırmızı - Sarı - Mavi - Pembe", "B": "Kırmızı - Gri - Yeşil - Mor", "C": "Kırmızı - Mor - Gri - Pembe", "D": "Turuncu - Sarı - Pembe - Kahverengi"}
    },
    {
        "no": 27, "page": 18, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "B",
        "text": "Rize Fırtına Vadisi'nde kaybolan bir turisti bulmak için dört farklı bölgedeki baz istasyonundan sinyal güçleri çözümlenerek verilmiştir:\n1. Bölge: 10⁰ + 2·10⁻¹ + 4·10⁻³ = 1,204\n2. Bölge: 10⁰ + 3·10⁻¹ = 1,3\n3. Bölge: 10⁰ + 8·10⁻² = 1,08\n4. Bölge: 10⁰ + 4·10⁻² + 5·10⁻³ = 1,045\nArama çalışmalarına sinyal gücü en fazla olan bölgeden başlandığına göre hangi bölgeden başlanmıştır?",
        "options": {"A": "1. Bölge", "B": "2. Bölge", "C": "3. Bölge", "D": "4. Bölge"}
    },
    {
        "no": 28, "page": 19, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Şekildeki karelerin her birinin içine 3, 5, 7, 9, 11 sayılarından biri yazılıyor. Bir doğru parçası ile birbirine bağlanan iki karenin içindeki sayılar aralarında asal olduğuna göre boyalı (ortadaki) karenin içine yazılabilecek sayıların toplamı kaçtır?",
        "options": {"A": "12", "B": "16", "C": "23", "D": "26"}
    },
    {
        "no": 29, "page": 19, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "C",
        "text": "Telefon ve bilgisayarlarda çözünürlük o cihazın ekranındaki piksel sayısını belirtir.\nAhmet bilgisayarının çözünürlüğünü 1400 x 1050 olarak ayarladığında ekranda oluşan piksel sayısı aşağıdakilerden hangisi olur?",
        "options": {"A": "1,47 · 10⁴", "B": "1,47 · 10⁵", "C": "1,47 · 10⁶", "D": "1,47 · 10⁷"}
    },
    {
        "no": 30, "page": 20, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Deniz, 180 m uzunluğundaki paralel kaldırımlardan birine 12'şer metre arayla kedi mama kapları, diğerine 15'er metre arayla köpek mama kapları koymuştur. Başında ve sonunda karşılıklı kaplar vardır.\nMahalle muhtarı karşılıklı aynı hizada bulunan mama kaplarının yanlarına birer tane su kabı koyduğuna göre muhtar kaç tane su kabı koymuştur?",
        "options": {"A": "6", "B": "8", "C": "10", "D": "12"}
    },
    {
        "no": 31, "page": 20, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "100 yıl önce kişi başına düşen tarım alanı miktarı 2,048 · 10⁷ metrekaredir. 100 yıllık süre içerisinde ülkenin nüfusu her 25 yılda bir 2 katına çıkarken tarım alanlarının miktarı her 50 yılda bir yarıya düşmüştür.\nBuna göre araştırmanın yapıldığı yıl ülkede kişi başına düşen tarım alanı miktarı kaç metrekaredir?",
        "options": {"A": "1,6 · 10³", "B": "3,2 · 10⁵", "C": "4 · 10⁵", "D": "8 · 10⁶"}
    },
    {
        "no": 32, "page": 20, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Kerem, 1 liralık madenî paraların kütlesinin 8200 mg, 50 kuruşlukların kütlesinin 6800 mg olduğunu öğreniyor. Kumbarasındaki paraları saymak yerine tartarak ayrı ayrı tartıyor ve iki tartma işleminin sonucu birbirine eşit çıkıyor.\nBuna göre Kerem'in biriktirdiği para en az kaç liradır?",
        "options": {"A": "49", "B": "51,5", "C": "54,5", "D": "58"}
    },
    {
        "no": 33, "page": 21, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Bitter çikolatalı gofretteki yağ miktarı 2,043 gram, Beyaz çikolatalı gofretteki yağ miktarı 2,702 gramdır. Öğrenciler çözümlerini kağıda yazarak vermiştir.\nBülent Öğretmen'de 13 tane bitter çikolatalı gofret kaldığına göre kaç tane beyaz çikolatalı gofret kalmıştır?",
        "options": {"A": "13", "B": "14", "C": "15", "D": "16"}
    },
    {
        "no": 34, "page": 21, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Bir markette iki farklı marka bal satılmaktadır: A Marka 600 g kavanoz 160 TL, B Marka 800 g kavanoz 180 TL.\nMarketin A marka balın satışından elde ettiği gelir ile B marka balın satışından elde ettiği gelir eşit olmuştur.\nBuna göre marketin bu iki baldan yapmış olduğu toplam satış miktarı en az kaç kilogramdır?",
        "options": {"A": "4,8", "B": "7,2", "C": "11,8", "D": "13,6"}
    },
    {
        "no": 35, "page": 22, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "A",
        "text": "Ankara'daki bir otobüs firması: İstanbul'a ilk otobüs 06.00, son otobüs 00.00 (her 90 dakikada bir); İzmir'e ilk otobüs 07.00, son otobüs 23.00 (her 120 dakikada bir).\nBuna göre bu otobüs firmasının 1 gün içinde kaç defa İstanbul'a ve İzmir'e gidecek olan otobüsleri aynı anda hareket eder?",
        "options": {"A": "2", "B": "3", "C": "4", "D": "5"}
    },
    {
        "no": 36, "page": 22, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "C",
        "text": "Bir otelin odalarına yüzler basamağındaki rakam kat numarasını gösterecek şekilde oda numaraları verilmiştir (101-140, 201-240, 301-340, 401-440, 501-540).\nOnur ve Turgut'un oda numaraları aynı doğal sayının farklı pozitif tam sayı kuvvetleridir.\nBuna göre Onur ve Turgut'un kaldığı odaların numaraları arasındaki fark kaçtır?",
        "options": {"A": "256", "B": "324", "C": "384", "D": "404"}
    },
    {
        "no": 37, "page": 23, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "B",
        "text": "Fıskiye sistemi yerine damlama sistemi ile sulandığında %40 oranında su tasarrufu sağlanmaktadır.\nHasan amca harcadığı toplam suyun yarısını fıskiye sistemi, diğer yarısını ise damlama sistemi ile suladığı tarlalar için kullanmaktadır.\nBuna göre Hasan amcanın bu tarlalarının alanları toplamı dönüm cinsinden aşağıdakilerden hangisi olabilir?",
        "options": {"A": "10", "B": "12", "C": "14", "D": "16"}
    },
    {
        "no": 38, "page": 23, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "B",
        "text": "Ürünlere 6 haneli barkodlar veriliyor. Sağdan sola doğru sırasıyla 3'ün doğal sayı kuvvetleriyle çarpılarak takip numarası hesaplanıyor (örnek: 012211 = 157).\nBuna göre aşağıdaki barkoda sahip ürünlerden hangisinin takip numarası 37'dir?",
        "options": {"A": "0 1 1 2 1 0", "B": "0 0 1 2 0 1", "C": "0 0 1 1 0 1", "D": "0 1 0 1 0 0"}
    },
    {
        "no": 39, "page": 24, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "C",
        "text": "Dünyada 1,4 milyar km³ civarında su vardır. Görselde tatlı su oranı %2,5, nehirler ve göller ise tatlı suyun %0,3'üdür.\nBuna göre nehirler ve gölleri oluşturan su miktarı metreküp cinsinden aşağıdakilerden hangisine eşittir? (1 km³ = 10⁹ m³)",
        "options": {"A": "1,05 · 10¹⁴", "B": "3,5 · 10¹⁶", "C": "4,2 · 10¹⁵", "D": "4,2 · 10¹²"}
    },
    {
        "no": 40, "page": 25, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "Tabelanın ışıklandırma sistemi açıldıktan sonra 1 dakika açık, 10 dakika kapalı; ardından 2 dk, 4 dk, 8 dk, 2'nin tam sayı kuvvetlerine eşit artan süreler boyunca yanmaya devam etmektedir.\nAkşam 19.00'da açılan bu tabela ertesi gün sabah 06.00'ya kadar açık kalmıştır (toplam 11 saat = 660 dakika).\nBuna göre tabela, bu sürede toplam kaç dakika boyunca aydınlatılmıştır?",
        "options": {"A": "470", "B": "480", "C": "560", "D": "570"}
    },
    {
        "no": 41, "page": 26, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Bir video oynatıcısında sol altta 10.21 (izlenen süre), sağ altta 06.19 (kalan süre) verilmiştir.\nBuna göre bu videonun kalan kısmının süresi aşağıdakilerden hangisi olduğunda izlenen kısmın süresinin dakika ve saniye değerleri aralarında asal sayılar olur?",
        "options": {"A": "05.55", "B": "11.15", "C": "12.55", "D": "13.51"}
    },
    {
        "no": 42, "page": 26, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "A",
        "text": "Bir fabrikada kalın (35 kg) ve ince (25 kg) olmak üzere inşaat demiri üretilmektedir. Paketlerde kütleler eşit olup 18 ton yük alabilen bir tıra bu paketlerden en çok 10 tanesi yüklenebilmektedir.\nBuna göre ince demir bulunan bir paketteki demir sayısı ile kalın demir bulunan bir paketteki demir sayısı arasındaki fark kaçtır? (1 ton = 1000 kg)",
        "options": {"A": "2", "B": "10", "C": "16", "D": "20"}
    },
    {
        "no": 43, "page": 27, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Mehmet kartları kutulara atıyor: Sadece 1 asal çarpanı olanlar siyah kutuya, 2 asal çarpanı olanlar mavi kutuya, 3 asal çarpanı olanlar kırmızı kutuya (kartlar: 19, 81, 105, 96, 24, 18, 128, 30 ve ters çevrilen 1 kart).\nSon durumda her kutuda eşit sayıda kart bulunmaktadır.\nBuna göre ters çevrilen kartta yazan doğal sayı aşağıdakilerden hangisi olabilir?",
        "options": {"A": "90", "B": "121", "C": "144", "D": "196"}
    },
    {
        "no": 44, "page": 27, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "B",
        "text": "Bir emlakçı toplam alanı 8⁵ metrekare olan dikdörtgen biçimindeki bir araziyi dikdörtgen biçiminde 8 eş parçaya ayırıp satmak istiyor.\nDikdörtgen biçimindeki bu parçaların her birinin uzun kenarı 4⁴ metredir.\nBuna göre bu parçaların kısa kenarlarının uzunluğu metre cinsinden aşağıdakilerden hangisine eşittir?",
        "options": {"A": "2³", "B": "2⁴", "C": "2⁵", "D": "2⁶"}
    },
    {
        "no": 45, "page": 28, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Kolonya üreten bir fabrikada: 200 ml'lik şişe 10 TL, 500 ml'lik şişe 23 TL. Gün sonunda iki şişelemede doldurulan kolonya miktarları eşittir.\nBir günde üretilen kolonyaların tamamının satışından elde edilen gelirin 1500 TL'den fazla olduğu bilindiğine göre bu satıştan en az kaç TL gelir elde edilmiştir?",
        "options": {"A": "1520", "B": "1536", "C": "1553", "D": "1589"}
    },
    {
        "no": 46, "page": 28, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "Bir mağazanın duvarında bulunan eşit uzunluktaki iki rafa: Çapı 20 cm olan saksılar (adeti 12 TL) ve Çapı 30 cm olan saksılar (adeti 18 TL) dizilmiştir.\nRafların her birindeki saksıların toplam satış fiyatı birbirine eşit ve 110 TL ile 170 TL arasındadır.\nBuna göre bu rafların saksı konulan bölümlerinin uzunluğu kaç santimetredir?",
        "options": {"A": "120", "B": "180", "C": "240", "D": "300"}
    },
    {
        "no": 47, "page": 29, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "C",
        "text": "Her ay yayımlanan dijital bir derginin bir aylık dosya boyutu 2⁸ MB'tır.\nOrhan, bu dijital derginin 2018-2019 yıllarına ait yayınlarının tamamını (24 ay) 8 GB'lık boş bir belleğe yükleyerek arşivlemiştir.\nBuna göre bu arşivleme işleminden sonra bellekteki boş alan MB cinsinden aşağıdakilerden hangisine eşittir? (1 GB = 2¹⁰ MB)",
        "options": {"A": "2⁹", "B": "2¹⁰", "C": "2¹¹", "D": "2¹²"}
    },
    {
        "no": 48, "page": 30, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "Harita üzerindeki iki nokta arasındaki uzaklık, gerçek uzaklığa bölünerek haritanın ölçeği bulunur.\n1. Harita: A-B arası 3 cm, gerçek 0,21 · 10⁵ km\n2. Harita: C-D arası 2 cm, gerçek 1,2 · 10⁴ km\n3. Harita: E-F arası 5 cm, gerçek 0,015 · 10⁶ km\n4. Harita: G-H arası 4 cm, gerçek 0,0008 · 10⁷ km\nBuna göre bu haritalardan hangisinin ölçeği en küçüktür? (1 km = 10⁵ cm)",
        "options": {"A": "1. Harita", "B": "2. Harita", "C": "3. Harita", "D": "4. Harita"}
    },
    {
        "no": 49, "page": 31, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "İpek böceğinden yaş koza (%87,5 kütle kaybı) -> kurutulmuş koza (%25'i iplik)... Üreticilerden 2¹¹ kg yaş koza, diğerinden 2⁸ kg kuru koza satın alınmıştır.\nFabrika elde ettiği ipliğin tamamının kilosunu 2¹¹ TL'den sattığına göre satışından elde ettiği gelir TL cinsinden aşağıdakilerden hangisine eşittir?",
        "options": {"A": "16⁵", "B": "8⁶", "C": "4⁷", "D": "2¹³"}
    },
    {
        "no": 50, "page": 31, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "A",
        "text": "Bir iş yerinde bulunan çay kahve makinesi: Çay bardağı 80 ml, kahve bardağı 60 ml.\nPazartesi günü toplam 280 bardak çay ve kahve alınmış ve koyduğu mililitre cinsinden çay ve kahve miktarlarının toplamları birbirine eşit olmuştur.\nBuna göre pazartesi günü bu makineden toplam kaç bardak çay alınmıştır?",
        "options": {"A": "120", "B": "140", "C": "160", "D": "180"}
    },
    {
        "no": 51, "page": 32, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "Bir süt fabrikasında iki farklı dolum ünitesi vardır: 1. Dolum Ünitesi (12 sn dolum + 4 sn çıkış = 16 sn), 2. Dolum Ünitesi (10 sn dolum + 5 sn çıkış = 15 sn).\nBuna göre bu iki dolum ünitesine aynı anda birer tane boş şişe girdikten sonra 128. kez iki dolum ünitesine aynı anda birer tane boş şişe girene kadar geçen süre dakika cinsinden aşağıdakilerden hangisine eşittir?",
        "options": {"A": "2⁷", "B": "4⁴", "C": "8³", "D": "32²"}
    },
    {
        "no": 52, "page": 33, "topic": "top_uslu_ifadeler", "diff": 4, "ans": "B",
        "text": "Dikdörtgen biçimindeki 2⁶ tane kâğıt ortadan ikiye katlanarak tam ortadan zımbalanıp bir not defteri elde ediliyor.\nNot defterinin tüm sayfalarına en dıştaki sayfadan başlanarak 1, 2, 2², 2³... şeklinde sırasıyla 2'nin doğal sayı kuvvetleri sayfa numarası olarak veriliyor.\nBuna göre not defterinin tam ortasındaki kağıdın, 4 sayfasına verilen sayfa numaralarının çarpımının sonucu aşağıdakilerden hangisine eşittir?",
        "options": {"A": "4²⁶⁰", "B": "4²⁵⁵", "C": "8¹⁴³", "D": "8¹³⁵"}
    },
    {
        "no": 53, "page": 34, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "A",
        "text": "9 eş kareden oluşan tablo: Sarı karelere (27, 28, 36, 88, 60) yazılmıştır. Mor renkli karelere kendisiyle ortak kenarı olan sarı karelerdeki sayılar ile aralarında asal ve iki tane asal çarpanı olan en küçük doğal sayılar yazılacaktır.\nBuna göre mor renkli karelerin içine yazılması gereken doğal sayıların toplamı kaçtır?",
        "options": {"A": "284", "B": "324", "C": "380", "D": "434"}
    },
    {
        "no": 54, "page": 34, "topic": "top_uslu_ifadeler", "diff": 3, "ans": "B",
        "text": "Elektronik cihazların bataryaları: EBA takibi (dakikada 2³ mAh), Bekleme (dakikada 2² mAh), Oyun oynama (dakikada 2⁴ mAh).\nGüney; 10.00-12.08 arası EBA, 12.08-14.16 arası bekleme, 14.16-14.48 arası oyun oynamıştır.\nBuna göre bu tabletin bataryasının tam dolu iken depoladığı elektrik enerjisi miktarı mAh cinsinden aşağıdakilerden hangisine eşittir?",
        "options": {"A": "2¹⁰", "B": "2¹¹", "C": "2¹²", "D": "2¹³"}
    },
    {
        "no": 55, "page": 35, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "50 katlı bir iş yerinde 2'den 10'a kadar numaralandırılmış 9 asansör vardır. Asansörler kat numarası asansör numarasının pozitif tam sayı katı olan katlarda durmamaktadır.\nErdem'in çalıştığı katın kat numarası 30 olduğuna göre Onur'un çalıştığı katın kat numarası aşağıdakilerden hangisi olabilir?",
        "options": {"A": "48", "B": "42", "C": "36", "D": "24"}
    },
    {
        "no": 56, "page": 35, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "D",
        "text": "Kat planındaki dikdörtgen bölümler: Toplantı odası 24 m², Kütüphane 21 m², Koridor 32 m², Yönetici odası 30 m², Çalışma ofisleri 35 m². Kenar uzunlukları metre cinsinden birer doğal sayıdır.\nBuna göre planda alanları verilmeyen arşiv ve mutfak bölümlerinin alanları toplamı en az kaç metrekaredir?",
        "options": {"A": "12", "B": "18", "C": "21", "D": "24"}
    },
    {
        "no": 57, "page": 36, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "İki raflı dolap: 1. rafta 11'den 30'a, 2. rafta 31'den 50'ye kadar klasörler vardır. Ece ve Melis bu dolaptan iki tane asal çarpanı olan aralarında asal iki klasör almışlardır.\nBuna göre bu iki klasörün etiket numaraları arasındaki fark en çok kaçtır?",
        "options": {"A": "38", "B": "37", "C": "33", "D": "31"}
    },
    {
        "no": 58, "page": 36, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "B",
        "text": "A Marka ayçiçek yağı 1,5 Litre, B Marka ayçiçek yağı 2 Litre. Şişelerin satış fiyatları birer tam sayıdır.\nMarketin A marka ayçiçek yağı satışından elde ettiği gelir 252 TL, B marka satışından elde ettiği gelir 198 TL'dir.\nBuna göre satılan B marka ayçiçek yağı miktarı, A marka ayçiçek yağı miktarından en az kaç litre daha fazladır?",
        "options": {"A": "0,5", "B": "1", "C": "1,5", "D": "2"}
    },
    {
        "no": 59, "page": 37, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "2020 Eylül ayı takvimi: Canan Öğretmen hafta içi günlerde o günün tarihine karşılık gelen doğal sayının asal çarpan sayısına eşit sayıda ders yapmaktadır.\nBuna göre Canan Öğretmen eylül ayı boyunca EBA canlı sınıf uygulaması üzerinden toplam kaç ders yapmıştır?",
        "options": {"A": "29", "B": "30", "C": "31", "D": "32"}
    },
    {
        "no": 60, "page": 37, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "D",
        "text": "I. Yay: 25 cm, II. Yay: 35 cm. Cisimler asıldığında I. yayın boyu 45 cm oluyor. Yaylarda gerçekleşen uzamaların santimetre cinsinden değerleri aralarında asal iki doğal sayıdır.\nBuna göre II. yayın son durumdaki uzunluğunun santimetre cinsinden değeri aşağıdakilerden hangisi olabilir?",
        "options": {"A": "60", "B": "61", "C": "65", "D": "68"}
    },
    {
        "no": 61, "page": 38, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "C",
        "text": "Eşit uzunluktaki iki rafa lastik (çap 90 cm) ve jant (çap 60 cm) dizilmiştir. Rafların uzunluğu 10 metreden azdır.\nBuna göre bu raflara dizilmiş olan lastik sayısı ile jant sayısı arasındaki fark en çok kaçtır?",
        "options": {"A": "3", "B": "5", "C": "7", "D": "9"}
    },
    {
        "no": 62, "page": 38, "topic": "top_carpanlar_katlar", "diff": 4, "ans": "A",
        "text": "9 eş kareden oluşan tablo: Sarı karelere 32, 45, 66, 91 yazılmıştır. Mavi renkli karelerin her birine ortak kenarı olan sarı karelerdeki sayılar ile aralarında asal ve iki tane asal çarpanı olan en küçük doğal sayı yazılacaktır.\nKırmızı renkli kareye ise mavi renkli karelere yazılan doğal sayıların toplamı yazılacaktır.\nBuna göre kırmızı renkli kareye yazılması gereken doğal sayı kaçtır?",
        "options": {"A": "219", "B": "234", "C": "250", "D": "284"}
    },
    {
        "no": 63, "page": 39, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "A",
        "text": "Şekerleme fabrikasında: Şeker (Ürün Kodu 2, Birim Fiyatı 1 TL), Çikolata (Ürün Kodu 3, Birim Fiyatı 3 TL), Lokum (Ürün Kodu 5, Birim Fiyatı 2 TL). Beş tanesi paketlenerek kodların çarpımı etiket numarası, fiyatların toplamı satış fiyatı olmaktadır.\nBuna göre etiket numaraları 270 ve 300 olan iki paketin satış fiyatlarının toplamı kaç TL'dir?",
        "options": {"A": "21", "B": "22", "C": "23", "D": "24"}
    },
    {
        "no": 64, "page": 39, "topic": "top_carpanlar_katlar", "diff": 3, "ans": "C",
        "text": "Bir teknoloji mağazasında satılan iki farklı marka cep telefonu:\nA Marka Cep Telefonu: Maliyet 4800 TL, Satış 6000 TL\nB Marka Cep Telefonu: Maliyet 5200 TL, Satış 6700 TL\nEkim ayı boyunca A marka telefonların satışından elde edilen toplam kâr ile B marka telefonların satışından elde edilen toplam kâr eşit olmuştur.\nBuna göre bu mağazada ekim ayı boyunca satılan A ve B marka cep telefonlarının toplam sayısı en az kaçtır?",
        "options": {"A": "5", "B": "7", "C": "9", "D": "11"}
    }
]

def seed_database():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    pdf_id = "pdf_meb_64_soru"
    pdf_title = "MEB LGS 1. Dönem Matematik 64 Örnek Soru Bankası"
    pdf_filename = "meb_lgs_64_ornek_sorular.pdf"
    pdf_filepath = "/uploads/pdf/meb_lgs_64_ornek_sorular.pdf"

    # 1. Register PDF document
    c.execute("""
        INSERT OR REPLACE INTO pdf_documents 
        (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, question_count, publisher, description, is_archived, created_at)
        VALUES (?, 'teacher_default', ?, ?, ?, 'soru_bankasi', 'Matematik', '8. Sınıf LGS', 64, 'Millî Eğitim Bakanlığı (MEB ÖDSGM)', 'LGS Sayısal Bölüm 1. Dönem Tamamı Şekilli 64 MEB Örnek Soru Arşivi', 0, datetime('now'))
    """, (pdf_id, pdf_title, pdf_filename, pdf_filepath))

    # 2. Insert all 64 questions into pdf_extracted_questions
    inserted_count = 0
    for q in questions_data:
        q_id = f"meb_q_{q['no']}"
        img_url = f"/uploads/questions/meb_lgs_64/q_{q['no']}.png"
        options_json = json.dumps(q["options"], ensure_ascii=False)

        c.execute("""
            INSERT OR REPLACE INTO pdf_extracted_questions
            (id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, difficulty, question_type, image_url, approval_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'yeni_nesil', ?, 'approved', datetime('now'))
        """, (
            q_id,
            pdf_id,
            q["no"],
            q["page"],
            q["text"],
            options_json,
            q["ans"],
            q["topic"],
            q["diff"],
            img_url
        ))
        inserted_count += 1

    conn.commit()
    conn.close()
    print(f"Successfully registered PDF '{pdf_title}' and inserted all {inserted_count} questions into pdf_extracted_questions!")

if __name__ == '__main__':
    seed_database()

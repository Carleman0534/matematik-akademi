# Matematik Akademi – Akıllı Soru Bankası ve Online Deneme

Özel ders öğrencilerinin **yanlış ve boş bıraktığı soruları** biriktirip tekrar ettiği, öğretmenin **online deneme** yapıp
deneme biter bitmez kimin hangi soruyu ve hangi konuyu yanlış yaptığını gördüğü web uygulaması.
Birden çok öğretmen, her öğretmenin kendi öğrencileri; matematik müfredatı hazır.

Canlı: <https://matematik-akademi-alpha.vercel.app>

## Neler var

| Alan | Özellikler |
|---|---|
| Hesaplar | Giriş ekranında **Beni hatırla** (varsayılan açık): işaretliyse oturum bu cihazda uzun süre (yaklaşık 400 gün) açık kalır ve son kullanıcı adı kendiliğinden dolar (şifre asla saklanmaz); işaretli değilse tarayıcı kapanınca oturum biter. Öğretmen e-postayla, öğrenci kullanıcı adıyla girer. **Yönetici** (ilk öğretmen) öğretmen davet kodu üretir. Öğretmen **sınıf kodu** verir; öğrenci `/kayit` sayfasında kodla kendi kaydolur ya da öğretmen hesabını açar. |
| Müfredat | **LGS (8. sınıf) matematik** konu ağacı (12 ünite, 48 alt konu) ve MEB kazanımları (52) hazır; 9–12. sınıf lise konuları da var. Öğretmen konu ekler, adlandırır, sıralar, **pasifleştirir** (eski sorular konusunu korur), kazanım ekler/düzenler. Bir soru **ana konu + yardımcı konulara** ve bir kazanıma bağlanabilir; soru bankası filtresi yardımcı konuları da bulur. |
| Soru bankası | Fotoğrafla (toplu, sayfadan kırparak) soru ekleme, yanlış/boş, kaynak, konu, zorluk, hata türü; filtreler; çözüm geçmişi; öğrenme durumu ve aralıklı tekrar. |
| Denemeler | PDF ya da fotoğraftan deneme (PDF sayfaları telefonda net görünsün diye görsele çevrilir). Cevap anahtarı + konu + sayfa. **Canlı oturum** (öğretmen başlatır, süre herkes için birlikte) ya da **süreli ödev** (tarih aralığı). Sınıfa, bütün öğrencilere ya da **seçili öğrencilere** atama. |
| Öğrenci deneme ekranı | Sayfalar + optik form; her işaret anında kaydedilir, internet kesilirse kaldığı yerden devam; süre sunucuda tutulur, bitince kendiliğinden teslim. |
| Canlı izleme | 4 sn'de bir: kim çözüyor / bağlantısı koptu / teslim etti, kaçıncı soruda, anlık D/Y/B ve net, soru bazında doğru oranı. Öğrencinin çözümünü sıfırlama. |
| Sonuçlar | Sıralı net tablosu, öğrencinin optiği ile cevap anahtarı karşılaştırması, soru analizi (şık dağılımı, çeldirici, yanlış yapanlar), konu analizi. **Yanlış ve boşları tek tuşla öğrencinin soru bankasına** (sayfa görseliyle) aktarma. |
| Kâğıt sınav | Öğrenci adlarıyla optik form yazdırma; kâğıttaki cevapları hızlı girme (ABCD-… yazıp Enter). Sonuçlar online çözenlerle birlikte hesaplanır. |
| PDF Analiz Merkezi | Birden çok PDF sürükle-bırak yüklenir (aynı içerik SHA-256 ile tanınıp ikinci kez yüklenmez); her dosyaya kaynak, yayınevi, deneme no, tarih. PDF yüklenince sorular **otomatik ayıklanır** (kapatılabilir; sade dizilmiş testlerde numara gövdeyle aynı boyutta olsa da şıklı ardışık sorular bulunur). **Analiz et**: sorular bulunur, kırpılır, kitapçığın cevap anahtarı okunur, görsel parmak iziyle benzer sorular işaretlenir; iş durumu (bekliyor/işleniyor/onay bekliyor/tamamlandı/hata) veritabanında, aynı PDF aynı anda iki kez analiz edilemez, yeniden analiz mükerrer soru eklemez. |
| **Soru havuzu** | Öğretmen sorunun konusunu/alt konusunu, zorluğunu (1–5), türünü, şekil olup olmadığını ve doğru cevabı verir (tek tek ya da toplu) ve **onaylar** (konusuz soru onaylanamaz). Havuzda konu/alt konu, kaynak, yayınevi, zorluk, tür, şekil süzgeçleri; mükerrerler gizlenebilir; seçilen sorulardan tek tuşla online deneme. **Deneme konu analizi**: PDF'ler arası ünite ünite soru sayısı, alt konu kapsamı, soru tipi çeşitliliği, zorluk dağılımı ve uyarılar. |
| **Kişisel öğrenme** | **Öğrenci Analizleri**: konu bazlı başarı (zorluk ağırlıklı, yeni kanıt daha değerli, az veride "Yeterli veri yok", yalnız kolay soruda güven sınırı), güven düzeyi, eğilim ve öneri. **Öğrenme Planları**: öğrenci/ünite/PDF/tür/soru sayısı seçilir; sistem her öğrenciye eksik konusuna orantılı, çözmediği, çeşitli (tür/kaynak/düzey) sorulardan **kişiye özel** set çıkarır, her soruda "Neden bu soru?" gerekçesi; öğretmen soru çıkarabilir, taslak kaydeder ya da öğrencilere atar. Öğrenci **Çalışmam**'da çözer (cevap bir kez, doğru cevap öğretmenin ayarına göre), yanlış/boşlar kendiliğinden **Soru Bankam**'a eklenir; **Konu Durumum**'da kendi durumunu görür. Cevap anahtarı öğrenciden gizlidir. Yapay zekâ ile soru üretimi henüz yok. |
| PDF arşivi | Deneme, soru bankası, cevap anahtarı PDF'leri gizli kovada. Arşivden tek tıkla online deneme ya da **PDF'ten soru kırpma** (öğrencinin bankasına ya da yeni denemeye). |
| Raporlar | Son 8 denemede öğrenci netleri ve değişim; **eksiklik haritası** (öğrenci × ünite doğru oranı + bankada biriken soru); öncelikli üniteler. Yazdırılabilir. |

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage) · pdf.js (tarayıcıda) · Vercel.
Ayrı bir arka uç yok: bütün yetki kuralları veritabanında (Row Level Security) ve depolama kurallarındadır.
Öğrenci cevapları yalnızca veritabanı fonksiyonlarıyla (`start_exam`, `save_answer`, `submit_exam`) ve süre içinde yazılabilir.
Dosyalar tarayıcıdan doğrudan gizli kovalara yüklenir (sunucuya büyük istek gitmez).

## Kurulum

1. Supabase projesi açın; SQL Editor'de **sırayla** çalıştırın: `supabase/migrations/0001_init.sql` … `0008_ogrenme_planlari.sql`.
2. Authentication → "Allow new users to sign up" **kapalı** (kayıt yalnızca kodla, sunucuda yapılır).
3. Öğretmen hesabı: Authentication → Users → Add user (Auto Confirm), sonra SQL Editor'de:
   ```sql
   update public.profiles set role = 'teacher', full_name = 'Adınız Soyadınız'
   where id = (select id from auth.users where email = 'sizin@epostaniz.com');
   ```
   İlk öğretmen 0003 çalışınca otomatik **yönetici** olur. Diğer öğretmenleri Öğretmenler sayfasındaki davet koduyla ekleyin.
4. `.env.example` → `.env.local`: Project URL, `anon` ve `service_role` anahtarları (`service_role` yalnızca sunucuda; kayıt ve şifre sıfırlamada kullanılır).
5. `npm install` → `npm run dev`. Vercel'de aynı üç değişkeni Environment Variables'a girin.

## Veri modeli (özet)

`profiles` (rol, yönetici) · `students` (öğretmen, sınıf) · `classes` (kayıt kodu) · `teacher_invites` ·
`questions`, `question_images`, `question_attempts` (soru bankası) ·
`curriculum_outcomes`, `question_topic_relations` (müfredat) · `pool_questions`, `pool_question_topics`, `pdf_analysis_jobs` (soru havuzu) · `study_plans`, `study_plan_questions` (öğrenme planları; öğrenci yalnızca RPC ile erişir) · `exams`, `exam_pages`, `exam_key` (öğrenciye sonuçlar açılana kadar kapalı), `exam_assignees`, `exam_sessions`, `exam_answers` ·
`pdf_documents`. Kovalar: `question-images`, `exam-pages`, `pdf-library`, `question-pool` (hepsi gizli; süreli adreslerle gösterilir).

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Öğrenme durumu, puanlama (net, iptal, çeldirici, konu analizi), deneme aşaması, filtre ve kullanıcı adı testleri |
| `npm run rls` | **Gerçek Supabase'e karşı 92 güvenlik kontrolü** (geçici hesaplar açar, sonunda siler) |
| `npm run check` | Tür denetimi + lint + testler + üretim derlemesi |
| `node scripts/e2e-accounts.mjs create <dosya> / delete` | Elle deneme için geçici öğretmen + öğrenci hesabı |

## Test durumu (18 Kasım 2026)

- ✅ Tür denetimi, lint, 31 birim testi, üretim derlemesi.
- ✅ `npm run rls` 92/92 (kazanım, yardımcı konu, soru havuzu, analiz işi ve öğrenme planı yalıtımı dahil; öğrenci plan sorularının cevap anahtarını okuyamaz, çifte cevap veremez): öğrenciler ve öğretmenler arası yalıtım; öğrenci cevap anahtarını deneme bitmeden göremez,
  süresini uzatamaz, cevap tablosuna doğrudan yazamaz, teslimden sonra cevap değiştiremez; başka öğretmen sonuçları,
  kâğıt girişini, PDF arşivini göremez; öğretmen kendini yönetici yapamaz.
- ✅ Tarayıcıda uçtan uca: PDF'ten deneme → cevap anahtarı → canlı başlatma → öğrenci katılıp çözme → canlı izleme →
  teslim → bitirme → sonuç/analiz → yanlışları bankaya aktarma (sayfa görseliyle) → öğrenci sonucu ve bankası; PDF arşivi →
  online deneme; kâğıt optik girişi; optik yazdırma; raporlar.
- ⚠️ Gerçek telefonda kamera ile soru ekleme ve deneme çözme denenmeli.

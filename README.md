# Matematik Akademi – Akıllı Soru Bankası (Faz 1)

Özel ders öğrencilerinin denemelerde ve soru bankalarında **yanlış yaptığı ya da boş bıraktığı soruları** kaybetmeden biriktirdiği,
tekrar ettiği ve gerçekten öğrenip öğrenmediğinin ölçüldüğü web uygulaması. Tek öğretmen, birden çok öğrenci, matematik.

## Faz 1'de neler var

| Özellik | Durum |
|---|---|
| Öğretmen girişi (e-posta), öğrenci girişi (kullanıcı adı) | ✅ |
| Öğretmenin öğrenci açması, düzenlemesi, şifre sıfırlaması, pasifleştirmesi | ✅ |
| Matematik müfredatı (9–12. sınıf, 25 ünite) ve öğretmenin konu ekleyip silmesi | ✅ |
| Fotoğrafla soru ekleme: kamera, galeriden **toplu** seçim, fotoğrafsız soru | ✅ |
| Yanlış / boş ayrımı, kaynak, test/sayfa/soru no, zorluk, hata türü, cevaplar, notlar | ✅ |
| Kişisel soru bankası: kart görünümü, arama, ayrıntılı filtreler, arşivleme | ✅ |
| Soru detayı: büyük görsel, bilgileri düzenleme, **çözüm geçmişi** | ✅ |
| Öğrenme durumu ve "öğrenme kanıtı" (tek doğru = öğrenildi sayılmaz) | ✅ |
| Basit günlük tekrar (tekrar zamanı gelen sorular, Doğru/Yanlış/Boş) | ✅ (Faz 3'te genişleyecek) |
| Öğretmen genel bakış: öğrenci özetleri, son eklenen sorular, çalışmayan öğrenciler | ✅ |
| Mobil uyumlu arayüz, açık/koyu tema | ✅ |
| Öğrenciler arası veri yalıtımı (veritabanı düzeyinde, RLS) | ✅ |
| Deneme oluşturma, PDF, ödev, raporlar, yapay zekâ | Faz 2–4 |

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage).
Ayrı bir arka uç sunucusu yok; yetki kuralları veritabanında (Row Level Security) uygulanır.

## Kurulum

1. **Supabase projesi açın:** <https://supabase.com> → New project (ücretsiz plan yeterli).
2. **Veritabanını kurun:** Supabase → SQL Editor'de sırayla çalıştırın:
   - `supabase/migrations/0001_init.sql` (tablolar, güvenlik kuralları, fotoğraf kovası)
   - `supabase/migrations/0002_seed_matematik.sql` (matematik konuları)
3. **Herkese açık kaydı kapatın:** Authentication → Sign In / Providers → "Allow new users to sign up" kapalı.
   Öğrenci hesaplarını yalnızca öğretmen açar.
4. **Öğretmen hesabını oluşturun:** Authentication → Users → Add user → e-posta + şifre (Auto Confirm açık).
   Sonra SQL Editor'de (e-postayı kendinizinkiyle değiştirin):
   ```sql
   update public.profiles set role = 'teacher', full_name = 'Adınız Soyadınız'
   where id = (select id from auth.users where email = 'sizin@epostaniz.com');
   ```
5. **Ortam değişkenleri:** `.env.example` dosyasını `.env.local` adıyla kopyalayın; Project Settings → API'deki
   Project URL, `anon` anahtarı ve `service_role` anahtarını girin. `service_role` anahtarı yalnızca sunucuda kullanılır;
   kimseyle paylaşmayın.
6. **Çalıştırın:**
   ```bash
   npm install
   npm run dev
   ```
   <http://localhost:3000> → öğretmen e-postanızla giriş yapın → Öğrencilerim → öğrenci ekleyin.

`.env.local` doldurulmadan açılırsa uygulama çökmez, bu adımları gösteren bir kurulum ekranı açar.

## Veri modeli

| Tablo | Açıklama |
|---|---|
| `profiles` | Her giriş hesabı; `role` = teacher / student (kayıtta her zaman student, öğretmeni SQL ile atarsınız) |
| `students` | Öğrenci bilgileri; `is_active=false` olan öğrenci giriş yapamaz, verisi silinmez |
| `subjects`, `topics` | Ders ve sınırsız seviyeli konu ağacı (`parent_id`), sınıf düzeyi |
| `sources` | Kaynak kitap / deneme adları |
| `questions` | Bir soru = bir öğrenci. İlk eklenme nedeni (`initial_status`), zorluk, kaynak, notlar; silme yerine `archived_at` |
| `question_images` | Orijinal fotoğraf ve küçük önizleme yolu (Storage, gizli kova) |
| `question_attempts` | **Her çözüm ayrı kayıt** (initial / review / exam). Aynı soru yeniden yanlış yapılınca yeni soru açılmaz |

Soru ekleme `create_question` fonksiyonuyla tek işlemde yapılır (soru + görseller + ilk yanlış/boş kaydı).

### Öğrenme durumu (çözüm geçmişinden hesaplanır)

- **Yeni eklendi** → **Henüz tekrar edilmedi** (2 günden eski) → tekrar çözümlerine göre:
- **Tekrar çözüldü, yanlış**: son tekrar yanlış/boş → ertesi gün yeniden sorulur
- **Tekrar çözüldü, doğru**: farklı günlerde art arda 1 doğru → 3 gün sonra
- **Öğrenildi**: farklı günlerde art arda en az 2 doğru → 7 gün sonra
- **Kalıcı olarak öğrenildi**: en az 3 doğru ve ilk ile son arasında en az 14 gün → 14–30 gün sonra

Kurallar `src/lib/learning.ts` içinde, testleri `src/lib/logic.test.ts` içinde.

## Güvenlik

- Öğrenci yalnızca **kendi** sorularını, görsellerini ve geçmişini görür; öğretmen hepsini (RLS + Storage politikaları).
- Öğrenci çözüm geçmişini değiştiremez ya da silemez, öğretmen notunu değiştiremez, kendine öğretmen rolü veremez.
- Fotoğraflar gizli kovada; ekranda 1 saat geçerli imzalı adreslerle gösterilir. İzinli biçimler: JPEG, PNG, WEBP (en çok 15 MB).
- `service_role` anahtarı yalnızca öğrenci hesabı açma ve şifre sıfırlamada, öğretmen olduğu doğrulandıktan sonra sunucuda kullanılır.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Öğrenme durumu, filtre, konu ağacı ve kullanıcı adı testleri (Node'un yerleşik test aracı) |
| `npm run check` | Tür denetimi + lint + testler + üretim derlemesi |

## Test durumu

- ✅ Tür denetimi, ESLint, 14 birim testi ve üretim derlemesi geçiyor.
- ✅ Supabase bilgileri girilmeden açıldığında tüm sayfalar kurulum ekranına yönleniyor.
- ✅ Gerçek Supabase projesinde: öğretmen girişi, öğrenci açma, soru ekleme (yeni kaynakla), soru detayı ve çözüm geçmişi arayüzden denendi.
- ✅ **Veri yalıtımı testi** (`npm run rls`, Windows'ta `npm.cmd run rls`): iki geçici öğrenciyle 26 kontrol — bir öğrenci diğerinin
  sorusunu, geçmişini, fotoğrafını göremiyor/değiştiremiyor; kendini öğretmen yapamıyor; geçmişi silemiyor; pasif öğrenci erişemiyor.
  Test kendi açtığı hesapları ve verileri sonunda siler.
- ⚠️ Telefon kamerasıyla fotoğraf yükleme ve önizleme oluşturma (tarayıcıdaki adım) gerçek bir telefonda denenmeli; depolama ve
  erişim kuralları test betiğiyle doğrulandı.

### Faz 1 kabul kontrol listesi

1. Öğretmen e-postasıyla giriş yapılıyor ve Genel Bakış açılıyor.
2. Öğrencilerim → yeni öğrenci (kullanıcı adı + şifre) eklenebiliyor.
3. Öğrenci kendi kullanıcı adıyla (başka tarayıcıda ya da gizli pencerede) giriş yapabiliyor.
4. Öğrenci Soru Ekle'den telefonla fotoğraf çekip ya da galeriden birden çok fotoğraf seçip kaydedebiliyor.
5. Soru yanlış ya da boş, konu ve alt konuyla kaydediliyor.
6. Öğretmen o öğrencinin sayfasında soruyu görüyor.
7. İkinci bir öğrenci, birinci öğrencinin sorusunu göremiyor (`/soru/<id>` adresi "bulunamadı" vermeli).
8. Soru detayında Doğru/Yanlış/Boş işaretleyince çözüm geçmişine yeni satır ekleniyor; eski satırlar duruyor.
9. Filtreler (yanlış/boş, konu, en az 2 kez yanlış, tarih aralığı, arama) çalışıyor.
10. Telefonda tüm bu işlemler yapılabiliyor.

## Bilinen eksikler ve sıradaki adımlar

- Tek fotoğraftaki birden çok soruyu ayrı ayrı kırpma (toplu soru tarama) henüz yok; şimdilik her soru ayrı fotoğraf.
- Aynı sorunun tekrar eklenmesini (mükerrer) algılama yok.
- Görsel döndürme/kırpma yok; HEIC (iPhone) fotoğraflar desteklenmiyor (telefon ayarı: Kamera → Biçimler → En Uyumlu).
- **Faz 2:** deneme oluşturucu (manuel + ağırlıklı otomatik seçim), dijital deneme çözme, sonuçlar, PDF çıktısı.
- **Faz 3:** konu bazlı başarı ve eksik haritası, gelişim grafikleri, ödev/görev sistemi.
- **Faz 4:** yapay zekâ ile soru tanıma, konu tahmini, hata analizi.

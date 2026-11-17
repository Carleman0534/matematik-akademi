-- Matematik müfredatı (lise, MEB üniteleri; TYT/AYT kapsamı). 0001_init.sql'den sonra bir kez çalıştırın.
-- Konular yalnızca hiç konu yoksa eklenir; sonradan uygulamadaki "Konular" ekranından ya da SQL ile yönetilebilir.
-- Yapı: ünite (parent_id boş, sınıf düzeyiyle) → konu.

insert into public.subjects (name, sort_order) values ('Matematik', 1) on conflict (name) do nothing;

do $$
declare
  subj uuid;
  unit uuid;
  u jsonb;
  units jsonb := '[
    {"g":9,  "n":"Mantık", "t":["Önermeler ve bileşik önermeler","Açık önermeler ve niceleyiciler","Koşullu ve iki yönlü koşullu önermeler","İspat yöntemleri"]},
    {"g":9,  "n":"Kümeler", "t":["Kümelerde temel kavramlar","Alt küme","Kümelerde işlemler","Kartezyen çarpım","Küme problemleri"]},
    {"g":9,  "n":"Sayılar ve Temel Kavramlar", "t":["Sayı kümeleri","Ardışık sayılar","Asal sayılar ve asal çarpanlar","Bölme ve bölünebilme","EBOB ve EKOK","Rasyonel sayılar","Ondalık gösterim"]},
    {"g":9,  "n":"Denklemler ve Eşitsizlikler", "t":["Birinci dereceden denklemler","Birinci dereceden eşitsizlikler","Mutlak değer","Üslü ifadeler","Köklü ifadeler","Oran ve orantı","Sayı ve kesir problemleri","Yaş problemleri","Yüzde, kâr-zarar ve faiz problemleri","Hareket problemleri","İşçi ve havuz problemleri","Karışım problemleri","Grafik problemleri"]},
    {"g":9,  "n":"Üçgenler", "t":["Üçgende açılar","Üçgenlerde eşlik ve benzerlik","Üçgenin yardımcı elemanları","Dik üçgen ve Pisagor bağıntısı","Dik üçgende trigonometrik oranlar","Üçgenin alanı"]},
    {"g":9,  "n":"Veri", "t":["Merkezi eğilim ve yayılım ölçüleri","Verilerin grafikle gösterimi"]},
    {"g":10, "n":"Sayma ve Olasılık", "t":["Toplama ve çarpma yoluyla sayma","Permütasyon","Kombinasyon","Pascal üçgeni ve binom açılımı","Basit olayların olasılığı"]},
    {"g":10, "n":"Fonksiyonlar", "t":["Fonksiyon kavramı ve gösterimi","Tanım ve değer kümesi","Fonksiyon grafikleri","Fonksiyon çeşitleri","Bileşke fonksiyon","Ters fonksiyon"]},
    {"g":10, "n":"Polinomlar", "t":["Polinom kavramı ve işlemler","Polinomlarda bölme","Çarpanlara ayırma","Polinom denklemleri","Rasyonel ifadelerin sadeleştirilmesi"]},
    {"g":10, "n":"İkinci Dereceden Denklemler", "t":["İkinci dereceden bir bilinmeyenli denklemler","Kökler ile katsayılar arasındaki bağıntılar","Karmaşık sayılar"]},
    {"g":10, "n":"Dörtgenler ve Çokgenler", "t":["Çokgenler","Dörtgenler ve özellikleri","Özel dörtgenler (paralelkenar, dikdörtgen, kare, eşkenar dörtgen, yamuk, deltoid)"]},
    {"g":10, "n":"Katı Cisimler", "t":["Prizmalar","Piramitler","Silindir, koni ve küre"]},
    {"g":11, "n":"Trigonometri", "t":["Yönlü açılar ve açı ölçü birimleri","Trigonometrik fonksiyonlar","Trigonometrik fonksiyonların grafikleri","Ters trigonometrik fonksiyonlar","Kosinüs ve sinüs teoremi"]},
    {"g":11, "n":"Analitik Geometri", "t":["Noktanın analitik incelenmesi","Doğrunun analitik incelenmesi","Noktanın doğruya uzaklığı"]},
    {"g":11, "n":"Fonksiyonlarda Uygulamalar", "t":["Fonksiyonlarla ilgili uygulamalar","İkinci dereceden fonksiyonlar ve grafikleri (parabol)","Fonksiyonların dönüşümleri"]},
    {"g":11, "n":"Denklem ve Eşitsizlik Sistemleri", "t":["İkinci dereceden iki bilinmeyenli denklem sistemleri","İkinci dereceden eşitsizlikler ve sistemleri"]},
    {"g":11, "n":"Çember ve Daire", "t":["Çemberin temel elemanları","Çemberde açılar","Çemberde teğet","Dairenin çevresi ve alanı"]},
    {"g":11, "n":"Olasılık", "t":["Koşullu olasılık","Deneysel ve teorik olasılık"]},
    {"g":12, "n":"Üstel ve Logaritmik Fonksiyonlar", "t":["Üstel fonksiyon","Logaritma fonksiyonu","Üstel ve logaritmik denklemler ve eşitsizlikler"]},
    {"g":12, "n":"Diziler", "t":["Gerçek sayı dizileri","Aritmetik dizi","Geometrik dizi"]},
    {"g":12, "n":"Trigonometri (12)", "t":["Toplam ve fark formülleri","Trigonometrik denklemler"]},
    {"g":12, "n":"Dönüşümler", "t":["Analitik düzlemde temel dönüşümler"]},
    {"g":12, "n":"Türev", "t":["Limit","Süreklilik","Anlık değişim oranı ve türev","Türev alma kuralları","Türevin uygulamaları (artan-azalan, ekstremum)","Maksimum-minimum problemleri"]},
    {"g":12, "n":"İntegral", "t":["Belirsiz integral","Belirli integral","Belirli integral ile alan hesabı"]},
    {"g":12, "n":"Çemberin Analitik İncelenmesi", "t":["Çember denklemi","Doğru ile çemberin durumları"]}
  ]'::jsonb;
  k int := 0;
begin
  select id into subj from public.subjects where name = 'Matematik';
  if exists (select 1 from public.topics where subject_id = subj) then return; end if;
  for u in select * from jsonb_array_elements(units) loop
    k := k + 1;
    insert into public.topics (subject_id, parent_id, name, grade_level, sort_order)
    values (subj, null, u->>'n', (u->>'g')::int, k) returning id into unit;
    insert into public.topics (subject_id, parent_id, name, grade_level, sort_order)
    select subj, unit, x.name, (u->>'g')::int, x.ord::int
    from jsonb_array_elements_text(u->'t') with ordinality as x(name, ord);
  end loop;
end $$;

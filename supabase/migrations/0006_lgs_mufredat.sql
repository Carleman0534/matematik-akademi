-- Matematik Akademi – Aşama A: LGS müfredat altyapısı
-- * Konular pasifleştirilebilir (eski sorular konusunu kaybetmez, yeni seçimlerde görünmez), açıklama alanı
-- * Kazanımlar (curriculum_outcomes): her konuya bağlı, öğretmen düzenler
-- * Bir soru ana konusuna (questions.topic_id) ek olarak yardımcı konulara bağlanabilir (question_topic_relations)
-- * LGS (8. sınıf) matematik konu ağacı ve MEB 8. sınıf kazanımları – yalnızca 8. sınıf konusu yoksa eklenir
-- 0005'ten sonra çalıştırın. Tekrar çalıştırmak güvenlidir.

alter table public.topics add column if not exists is_active boolean not null default true;
alter table public.topics add column if not exists description text check (char_length(description) <= 500);

create table if not exists public.curriculum_outcomes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  code text check (char_length(code) <= 40),
  text text not null check (char_length(text) between 1 and 600),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (topic_id, code)
);
create index if not exists outcomes_topic_idx on public.curriculum_outcomes(topic_id, sort_order);

alter table public.questions add column if not exists outcome_id uuid references public.curriculum_outcomes(id) on delete set null;

-- Yardımcı konular (ana konu questions.topic_id'de kalır)
create table if not exists public.question_topic_relations (
  question_id uuid not null references public.questions(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  role text not null default 'secondary' check (role in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  primary key (question_id, topic_id)
);
create index if not exists qtr_topic_idx on public.question_topic_relations(topic_id);

-- ============ RLS ============
alter table public.curriculum_outcomes enable row level security;
alter table public.question_topic_relations enable row level security;
drop policy if exists outcomes_read on public.curriculum_outcomes;
drop policy if exists outcomes_teacher on public.curriculum_outcomes;
drop policy if exists qtr_teacher on public.question_topic_relations;
drop policy if exists qtr_student on public.question_topic_relations;

create policy outcomes_read on public.curriculum_outcomes for select to authenticated using (true);
create policy outcomes_teacher on public.curriculum_outcomes for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create policy qtr_teacher on public.question_topic_relations for all to authenticated
  using (exists (select 1 from public.questions q where q.id = question_topic_relations.question_id and public.can_manage_student(q.student_id)))
  with check (exists (select 1 from public.questions q where q.id = question_topic_relations.question_id and public.can_manage_student(q.student_id)));
create policy qtr_student on public.question_topic_relations for all to authenticated
  using (exists (select 1 from public.questions q where q.id = question_topic_relations.question_id and q.student_id = public.my_student_id()))
  with check (exists (select 1 from public.questions q where q.id = question_topic_relations.question_id and q.student_id = public.my_student_id()));

-- ============ LGS MATEMATİK (8. SINIF) ============
do $lgs$
declare
  subj uuid;
  unit uuid;
  u jsonb;
  t text;
  o jsonb;
  i int := 0;
  j int;
  units jsonb := '[
    {"n":"Çarpanlar ve Katlar","t":["Pozitif tam sayıların çarpanları","EBOB","EKOK","Aralarında asal sayılar","EBOB–EKOK problemleri"],
     "o":[["M.8.1.1.1","Verilen pozitif tam sayıların pozitif tam sayı çarpanlarını bulur, pozitif tam sayıların pozitif tam sayı çarpanlarını üslü ifadelerin çarpımı şeklinde yazar."],
          ["M.8.1.1.2","İki doğal sayının en büyük ortak bölenini (EBOB) ve en küçük ortak katını (EKOK) hesaplar, ilgili problemleri çözer."],
          ["M.8.1.1.3","Verilen iki doğal sayının aralarında asal olup olmadığını belirler."]]},
    {"n":"Üslü İfadeler","t":["Tam sayıların tam sayı kuvvetleri","Üslü ifadelerin özellikleri","Bilimsel gösterim","Üslü ifadelerle işlemler","Üslü ifadelerle problemler"],
     "o":[["M.8.1.2.1","Tam sayıların, tam sayı kuvvetlerini hesaplar."],
          ["M.8.1.2.2","Üslü ifadelerle ilgili temel kuralları anlar, birbirine denk ifadeler oluşturur."],
          ["M.8.1.2.3","Sayıların ondalık gösterimlerini 10’un tam sayı kuvvetlerini kullanarak çözümler."],
          ["M.8.1.2.4","Verilen bir sayıyı 10’un farklı tam sayı kuvvetlerini kullanarak ifade eder."],
          ["M.8.1.2.5","Çok büyük ve çok küçük sayıları bilimsel gösterimle ifade eder ve karşılaştırır."]]},
    {"n":"Kareköklü İfadeler","t":["Tam kare doğal sayılar","Kareköklü ifadelerin özellikleri","Kareköklü ifadelerle işlemler","Ondalık ifadelerin karekökü","Gerçek sayılar"],
     "o":[["M.8.1.3.1","Tam kare pozitif tam sayılarla bu sayıların karekökleri arasındaki ilişkiyi belirler."],
          ["M.8.1.3.2","Tam kare olmayan kareköklü bir ifadenin değerinin hangi iki doğal sayı arasında olduğunu belirler."],
          ["M.8.1.3.3","Kareköklü bir ifadeyi a√b şeklinde yazar ve a√b şeklindeki ifadede katsayıyı kök içine alır."],
          ["M.8.1.3.4","Kareköklü ifadelerde çarpma ve bölme işlemlerini yapar."],
          ["M.8.1.3.5","Kareköklü ifadelerde toplama ve çıkarma işlemlerini yapar."],
          ["M.8.1.3.6","Kareköklü bir ifade ile çarpıldığında, sonucu bir doğal sayı yapan çarpanlara örnek verir."],
          ["M.8.1.3.7","Ondalık ifadelerin ve rasyonel sayıların karekökünü belirler."],
          ["M.8.1.3.8","Gerçek sayıları tanır, rasyonel ve irrasyonel sayılarla ilişkilendirir."]]},
    {"n":"Veri Analizi","t":["Çizgi ve sütun grafikleri","Daire grafikleri","Grafik yorumlama","Grafikler arası dönüşüm"],
     "o":[["M.8.4.1.1","En fazla üç veri grubuna ait çizgi ve sütun grafiklerini yorumlar."],
          ["M.8.4.1.2","Verileri sütun, daire veya çizgi grafiği ile gösterir ve bu gösterimler arasında uygun olan dönüşümleri yapar."]]},
    {"n":"Basit Olayların Olma Olasılığı","t":["Olası durumlar","Eş olasılıklı olaylar","Olasılık hesaplamaları"],
     "o":[["M.8.5.1.1","Bir olaya ait olası durumları belirler."],
          ["M.8.5.1.2","“Daha fazla”, “eşit”, “daha az” olasılıklı olayları ayırt eder; örnek verir."],
          ["M.8.5.1.3","Eşit şansa sahip olan olaylarda her bir çıktının olasılık değerinin eşit olduğunu ve bu değerin 1/n olduğunu açıklar."],
          ["M.8.5.1.4","Olasılık değerinin 0 ile 1 arasında (0 ve 1 dâhil) olduğunu anlar."],
          ["M.8.5.1.5","Basit olayların olma olasılığını hesaplar."]]},
    {"n":"Cebirsel İfadeler ve Özdeşlikler","t":["Cebirsel ifadeler","Özdeşlikler","Çarpanlara ayırma","Cebirsel ifadelerle işlemler"],
     "o":[["M.8.2.1.1","Basit cebirsel ifadeleri anlar ve farklı biçimlerde yazar."],
          ["M.8.2.1.2","Cebirsel ifadelerin çarpımını yapar."],
          ["M.8.2.1.3","Özdeşlikleri modellerle açıklar."],
          ["M.8.2.1.4","Cebirsel ifadeleri çarpanlara ayırır."]]},
    {"n":"Doğrusal Denklemler","t":["Koordinat sistemi","Doğrusal ilişki","Doğrunun eğimi","Doğrusal denklem problemleri"],
     "o":[["M.8.2.2.1","Birinci dereceden bir bilinmeyenli denklemleri çözer."],
          ["M.8.2.2.2","Koordinat sistemini özellikleriyle tanır ve sıralı ikilileri gösterir."],
          ["M.8.2.2.3","Aralarında doğrusal ilişki bulunan iki değişkenden birinin diğerine bağlı olarak nasıl değiştiğini tablo ve denklem ile ifade eder."],
          ["M.8.2.2.4","Doğrusal denklemlerin grafiğini çizer."],
          ["M.8.2.2.5","Doğrusal ilişki içeren gerçek hayat durumlarına ait denklem, tablo ve grafiği oluşturur ve yorumlar."],
          ["M.8.2.2.6","Doğrunun eğimini modellerle açıklar, doğrusal denklemleri ve grafiklerini eğimle ilişkilendirir."]]},
    {"n":"Eşitsizlikler","t":["Birinci dereceden bir bilinmeyenli eşitsizlikler","Eşitsizliklerin sayı doğrusunda gösterimi","Eşitsizlik problemleri"],
     "o":[["M.8.2.3.1","Birinci dereceden bir bilinmeyenli eşitsizlik içeren günlük hayat durumlarına uygun matematik cümleleri yazar."],
          ["M.8.2.3.2","Birinci dereceden bir bilinmeyenli eşitsizlikleri sayı doğrusunda gösterir."],
          ["M.8.2.3.3","Birinci dereceden bir bilinmeyenli eşitsizlikleri çözer."]]},
    {"n":"Üçgenler","t":["Üçgende kenar ve açı ilişkileri","Üçgen eşitsizliği","Pisagor bağıntısı","Üçgen problemleri"],
     "o":[["M.8.3.1.1","Üçgende kenarortay, açıortay ve yüksekliği inşa eder."],
          ["M.8.3.1.2","Üçgenin iki kenar uzunluğunun toplamı veya farkı ile üçüncü kenarının uzunluğunu ilişkilendirir."],
          ["M.8.3.1.3","Üçgenin kenar uzunlukları ile bu kenarların karşısındaki açıların ölçülerini ilişkilendirir."],
          ["M.8.3.1.4","Yeterli sayıda elemanının ölçüleri verilen bir üçgeni çizer."],
          ["M.8.3.1.5","Pisagor bağıntısını oluşturur, ilgili problemleri çözer."]]},
    {"n":"Eşlik ve Benzerlik","t":["Eş şekiller","Benzer şekiller","Benzerlik oranı","Benzerlik problemleri"],
     "o":[["M.8.3.2.1","Eşlik ve benzerliği ilişkilendirir, eş ve benzer şekillerin kenar ve açı özelliklerini belirler."],
          ["M.8.3.2.2","Benzer çokgenlerin benzerlik oranını belirler, bir çokgene eş ve benzer çokgenler oluşturur."]]},
    {"n":"Dönüşüm Geometrisi","t":["Öteleme","Yansıma","Geometrik dönüşümler"],
     "o":[["M.8.3.3.1","Nokta, doğru parçası ve diğer düzlemsel şekillerin bir doğruya göre yansıma altındaki görüntülerini çizer."],
          ["M.8.3.3.2","Çokgenlerin öteleme sonucunda ortaya çıkan görüntüsünü çizer."],
          ["M.8.3.3.3","Çokgenlerin ardışık öteleme ve yansımalar sonucunda ortaya çıkan görüntüsünü oluşturur."]]},
    {"n":"Geometrik Cisimler","t":["Prizmalar","Dik dairesel silindir","Silindirin yüzey alanı ve hacmi","Dik piramit ve koni"],
     "o":[["M.8.3.4.1","Dik prizmaları tanır, temel elemanlarını belirler, inşa eder ve açınımını çizer."],
          ["M.8.3.4.2","Dik dairesel silindirin temel elemanlarını belirler, inşa eder ve açınımını çizer."],
          ["M.8.3.4.3","Dik dairesel silindirin yüzey alanı bağıntısını oluşturur, ilgili problemleri çözer."],
          ["M.8.3.4.4","Dik dairesel silindirin hacim bağıntısını oluşturur, ilgili problemleri çözer."],
          ["M.8.3.4.5","Dik piramidi tanır, temel elemanlarını belirler, inşa eder ve açınımını çizer."],
          ["M.8.3.4.6","Dik koniyi tanır, temel elemanlarını belirler, inşa eder ve açınımını çizer."]]}
  ]';
begin
  insert into public.subjects (name, sort_order) values ('Matematik', 1) on conflict (name) do nothing;
  select id into subj from public.subjects where name = 'Matematik';
  if exists (select 1 from public.topics where grade_level = 8) then return; end if;
  for u in select * from jsonb_array_elements(units) loop
    i := i + 1;
    insert into public.topics (subject_id, parent_id, name, grade_level, sort_order)
    values (subj, null, u->>'n', 8, i) returning id into unit;
    j := 0;
    for t in select * from jsonb_array_elements_text(u->'t') loop
      j := j + 1;
      insert into public.topics (subject_id, parent_id, name, grade_level, sort_order) values (subj, unit, t, 8, j);
    end loop;
    j := 0;
    for o in select * from jsonb_array_elements(u->'o') loop
      j := j + 1;
      insert into public.curriculum_outcomes (topic_id, code, text, sort_order) values (unit, o->>0, o->>1, j);
    end loop;
  end loop;
end $lgs$;

-- Matematik Akademi – Faz 1 veritabanı şeması
-- Supabase SQL Editor'de bir kez çalıştırın (README → Kurulum). Tekrar çalıştırmak güvenlidir (if not exists).
--
-- Temel kurallar:
--  * Bir soru tek bir öğrenciye aittir (questions.student_id).
--  * Bir sorunun her çözümü ayrı kayıttır (question_attempts); aynı soru yeniden yanlış yapılınca yeni soru açılmaz.
--  * Silme yok: sorular arşivlenir (archived_at), çözüm geçmişi korunur.
--  * Öğrenci yalnızca kendi verisini görür; öğretmen hepsini. Kurallar veritabanında (RLS) uygulanır.

create extension if not exists pgcrypto;

-- ============ KULLANICILAR ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  grade_level int check (grade_level between 1 and 13),
  school_name text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Yeni hesap açılınca profil oluştur. Rol HER ZAMAN 'student' başlar; kullanıcı kayıt sırasında kendini öğretmen yapamaz.
-- Öğretmen rolü yalnızca SQL ile verilir (README → Öğretmen hesabı).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'username', ''), 'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Yetki yardımcıları (RLS içinde kullanılır)
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function public.my_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.students where profile_id = auth.uid() and is_active
$$;

-- ============ MÜFREDAT ============
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

-- Konu ağacı: ünite (parent_id boş) → konu → alt konu ... (sınırsız seviye)
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_id uuid references public.topics(id) on delete cascade,
  name text not null,
  grade_level int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists topics_parent_idx on public.topics(parent_id);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists sources_name_uq on public.sources (lower(name));

-- ============ SORU BANKASI ============
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  initial_status text not null check (initial_status in ('wrong', 'blank')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  page_no text, test_no text, question_no text,
  question_text text,
  correct_answer text, student_answer text,
  error_type text,
  solution text,
  teacher_note text,
  student_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists questions_student_idx on public.questions(student_id, created_at desc);
create index if not exists questions_topic_idx on public.questions(topic_id);

-- Görseller: orijinal dosya + küçük önizleme (Storage yolları)
create table if not exists public.question_images (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  path text not null,
  thumb_path text,
  width int, height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists question_images_q_idx on public.question_images(question_id);

-- Her çözüm ayrı kayıt. initial = soru bankaya eklenirken (yanlış/boş); review = tekrar çözüm; exam = deneme içinde (Faz 2)
create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  result text not null check (result in ('correct', 'incorrect', 'blank')),
  attempt_type text not null default 'review' check (attempt_type in ('initial', 'review', 'exam', 'manual')),
  time_spent_sec int check (time_spent_sec >= 0),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  attempted_at timestamptz not null default now()
);
create index if not exists attempts_q_idx on public.question_attempts(question_id, attempted_at);
create index if not exists attempts_student_idx on public.question_attempts(student_id, attempted_at desc);

-- Soru + görseller + ilk (yanlış/boş) kayıt tek işlemde. SECURITY INVOKER: çağıranın RLS kuralları geçerli.
create or replace function public.create_question(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  qid uuid;
  img jsonb;
  i int := 0;
begin
  insert into public.questions (student_id, topic_id, source_id, initial_status, difficulty, page_no, test_no, question_no,
    question_text, correct_answer, student_answer, error_type, solution, teacher_note, student_note, created_by)
  values ((p->>'student_id')::uuid, nullif(p->>'topic_id', '')::uuid, nullif(p->>'source_id', '')::uuid, p->>'initial_status',
    nullif(p->>'difficulty', ''), nullif(p->>'page_no', ''), nullif(p->>'test_no', ''), nullif(p->>'question_no', ''),
    nullif(p->>'question_text', ''), nullif(p->>'correct_answer', ''), nullif(p->>'student_answer', ''), nullif(p->>'error_type', ''),
    nullif(p->>'solution', ''), case when public.is_teacher() then nullif(p->>'teacher_note', '') end, nullif(p->>'student_note', ''), auth.uid())
  returning id into qid;

  for img in select * from jsonb_array_elements(coalesce(p->'images', '[]'::jsonb)) loop
    insert into public.question_images (question_id, path, thumb_path, width, height, sort_order)
    values (qid, img->>'path', img->>'thumb_path', (img->>'width')::int, (img->>'height')::int, i);
    i := i + 1;
  end loop;

  insert into public.question_attempts (question_id, student_id, result, attempt_type, created_by, attempted_at)
  values (qid, (p->>'student_id')::uuid, case when p->>'initial_status' = 'blank' then 'blank' else 'incorrect' end, 'initial', auth.uid(), now());

  return qid;
end $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.sources enable row level security;
alter table public.questions enable row level security;
alter table public.question_images enable row level security;
alter table public.question_attempts enable row level security;

-- Politikaları yeniden oluşturulabilir yap
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles','students','subjects','topics','sources','questions','question_images','question_attempts') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: herkes kendini, öğretmen herkesi görür; yalnızca öğretmen değiştirir (öğrenci rolünü değiştiremez)
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_teacher());
create policy profiles_teacher_update on public.profiles for update to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- students
create policy students_teacher_all on public.students for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy students_self_select on public.students for select to authenticated using (profile_id = auth.uid());

-- müfredat: giriş yapan herkes okur, öğretmen yönetir
create policy subjects_read on public.subjects for select to authenticated using (true);
create policy subjects_teacher on public.subjects for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy topics_read on public.topics for select to authenticated using (true);
create policy topics_teacher on public.topics for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- kaynaklar: herkes okur ve ekleyebilir (kendi adına); öğretmen yönetir
create policy sources_read on public.sources for select to authenticated using (true);
create policy sources_insert on public.sources for insert to authenticated with check (created_by = auth.uid());
create policy sources_teacher on public.sources for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- sorular: öğretmen hepsi; öğrenci yalnızca kendi sorusu (silme yok, arşivleme güncellemeyle)
create policy questions_teacher_all on public.questions for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy questions_student_select on public.questions for select to authenticated using (student_id = public.my_student_id());
create policy questions_student_insert on public.questions for insert to authenticated with check (student_id = public.my_student_id());
create policy questions_student_update on public.questions for update to authenticated using (student_id = public.my_student_id()) with check (student_id = public.my_student_id());

-- öğrenci öğretmen notunu değiştiremesin
create or replace function public.protect_teacher_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() and new.teacher_note is distinct from old.teacher_note then
    new.teacher_note := old.teacher_note;
  end if;
  return new;
end $$;
drop trigger if exists questions_protect_teacher_note on public.questions;
create trigger questions_protect_teacher_note before update on public.questions
  for each row execute function public.protect_teacher_note();

-- görseller
create policy images_teacher_all on public.question_images for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy images_student_select on public.question_images for select to authenticated
  using (exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id()));
create policy images_student_insert on public.question_images for insert to authenticated
  with check (exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id()));

-- çözüm geçmişi: öğrenci yalnızca ekler ve okur (değiştiremez, silemez → geçmiş korunur)
create policy attempts_teacher_all on public.question_attempts for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy attempts_student_select on public.question_attempts for select to authenticated using (student_id = public.my_student_id());
create policy attempts_student_insert on public.question_attempts for insert to authenticated
  with check (student_id = public.my_student_id()
    and exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id()));

-- ============ DEPOLAMA (soru fotoğrafları) ============
-- Gizli kova; dosya yolu: <student_id>/<rastgele>.<uzantı>. Öğrenci yalnızca kendi klasörüne erişir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-images', 'question-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qimg_select on storage.objects;
drop policy if exists qimg_insert on storage.objects;
drop policy if exists qimg_delete on storage.objects;
create policy qimg_select on storage.objects for select to authenticated
  using (bucket_id = 'question-images' and (public.is_teacher() or (storage.foldername(name))[1] = public.my_student_id()::text));
create policy qimg_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'question-images' and (public.is_teacher() or (storage.foldername(name))[1] = public.my_student_id()::text));
create policy qimg_delete on storage.objects for delete to authenticated
  using (bucket_id = 'question-images' and public.is_teacher());

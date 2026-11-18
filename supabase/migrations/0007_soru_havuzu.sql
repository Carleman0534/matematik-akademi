-- Matematik Akademi – Aşama B–C: PDF analiz merkezi ve ortak soru havuzu
-- * pdf_documents: dosya özeti (mükerrer yükleme), kaynak bilgileri, analiz durumu
-- * pdf_analysis_jobs: her analiz çalıştırması (aynı PDF için aynı anda tek iş)
-- * pool_questions (soru havuzu): PDF'lerden ayıklanan sorular; öğretmen konu/zorluk/tür verip onaylar
-- * pool_question_topics: yardımcı konular
-- 0006'dan sonra çalıştırın. Tekrar çalıştırmak güvenlidir.

alter table public.pdf_documents add column if not exists file_hash text check (file_hash ~ '^[0-9a-f]{64}$');
alter table public.pdf_documents add column if not exists exam_no text check (char_length(exam_no) <= 40);
alter table public.pdf_documents add column if not exists published_on date;
alter table public.pdf_documents add column if not exists option_count int not null default 4 check (option_count in (4, 5));
alter table public.pdf_documents add column if not exists analysis_status text not null default 'none'
  check (analysis_status in ('none', 'pending', 'processing', 'review', 'done', 'error'));
alter table public.pdf_documents add column if not exists analyzed_at timestamptz;
alter table public.pdf_documents add column if not exists question_count int;
create unique index if not exists pdf_documents_hash_uq on public.pdf_documents(teacher_id, file_hash) where file_hash is not null;

create table if not exists public.pdf_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  pdf_id uuid not null references public.pdf_documents(id) on delete cascade,
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'processing' check (status in ('pending', 'processing', 'done', 'error')),
  method text check (method in ('text', 'gaps')),
  page_count int, detected int, saved int, skipped_pages int, answer_keys int,
  error text check (char_length(error) <= 1000),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
-- Aynı PDF için aynı anda yalnızca bir iş (yanlışlıkla iki kez başlatılırsa ikincisi reddedilir)
create unique index if not exists analysis_one_active on public.pdf_analysis_jobs(pdf_id) where status in ('pending', 'processing');
create index if not exists analysis_pdf_idx on public.pdf_analysis_jobs(pdf_id, started_at desc);

create table if not exists public.pool_questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pdf_id uuid references public.pdf_documents(id) on delete set null,
  job_id uuid references public.pdf_analysis_jobs(id) on delete set null,
  source_label text check (char_length(source_label) <= 200),           -- PDF silinse de kaynağı görünsün
  page_no int check (page_no between 1 and 2000),
  question_no int check (question_no between 0 and 500),
  section text not null default '' check (char_length(section) <= 60),
  image_path text not null,                                              -- question-pool kovası: <öğretmen>/<id>.jpg
  width int, height int,
  option_count int not null default 4 check (option_count in (4, 5)),
  correct text check (correct in ('A', 'B', 'C', 'D', 'E')),
  topic_id uuid references public.topics(id) on delete set null,
  outcome_id uuid references public.curriculum_outcomes(id) on delete set null,
  difficulty int check (difficulty between 1 and 5),                    -- 1 başlangıç … 5 ileri düzey
  question_type text check (question_type in ('temel_islem', 'kavramsal', 'problem', 'yeni_nesil', 'gunluk_yasam', 'tablo_grafik', 'gorsel_geometrik', 'cok_asamali')),
  has_visual boolean,
  detect_method text check (detect_method in ('text', 'gaps', 'manual')),
  confidence numeric(3, 2) check (confidence between 0 and 1),            -- bulma güveni (metin katmanı yüksek, boşluk düşük)
  image_hash text check (image_hash ~ '^[0-9a-f]{64}$'),                 -- görsel parmak izi (benzerlik)
  duplicate_of uuid references public.pool_questions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
-- Aynı PDF yeniden analiz edilince aynı soru ikinci kez eklenmez
create unique index if not exists pool_unique_in_pdf on public.pool_questions(pdf_id, section, question_no, page_no) where pdf_id is not null;
create index if not exists pool_teacher_idx on public.pool_questions(teacher_id, status, created_at desc);
create index if not exists pool_topic_idx on public.pool_questions(topic_id);

create table if not exists public.pool_question_topics (
  question_id uuid not null references public.pool_questions(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (question_id, topic_id)
);
create index if not exists pqt_topic_idx on public.pool_question_topics(topic_id);

-- ============ RLS ============
alter table public.pdf_analysis_jobs enable row level security;
alter table public.pool_questions enable row level security;
alter table public.pool_question_topics enable row level security;
drop policy if exists jobs_teacher on public.pdf_analysis_jobs;
drop policy if exists pool_teacher on public.pool_questions;
drop policy if exists pqt_teacher on public.pool_question_topics;

create policy jobs_teacher on public.pdf_analysis_jobs for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and teacher_id = auth.uid()
    and exists (select 1 from public.pdf_documents d where d.id = pdf_analysis_jobs.pdf_id and d.teacher_id = auth.uid()));
create policy pool_teacher on public.pool_questions for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and teacher_id = auth.uid());
create policy pqt_teacher on public.pool_question_topics for all to authenticated
  using (exists (select 1 from public.pool_questions q where q.id = pool_question_topics.question_id and (public.is_admin() or q.teacher_id = auth.uid())))
  with check (exists (select 1 from public.pool_questions q where q.id = pool_question_topics.question_id and q.teacher_id = auth.uid()));

-- Soru havuzu görselleri: gizli kova, öğretmenin kendi klasörü
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-pool', 'question-pool', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qpool_select on storage.objects;
drop policy if exists qpool_insert on storage.objects;
drop policy if exists qpool_delete on storage.objects;
create policy qpool_select on storage.objects for select to authenticated
  using (bucket_id = 'question-pool' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy qpool_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'question-pool' and public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text);
create policy qpool_delete on storage.objects for delete to authenticated
  using (bucket_id = 'question-pool' and public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text);

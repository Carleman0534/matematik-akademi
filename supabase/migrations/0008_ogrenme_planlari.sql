-- Matematik Akademi – Aşama E: kişiselleştirilmiş çalışma planları
-- * study_plans / study_plan_questions: öğretmenin bir öğrenciye atadığı çalışma setleri (soru görseli, anahtar ve etiket anlık kopyası)
-- * Öğrenci tabloyu doğrudan OKUYAMAZ (doğru cevap içerir); yalnızca fonksiyonlarla: study_plan_items, answer_study_question, my_study_evidence
-- * Yanlış / boş cevap, öğrencinin soru bankasına (question-pool: görseliyle) otomatik eklenir
-- 0007'den sonra çalıştırın. Tekrar çalıştırmak güvenlidir.

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  kind text not null default 'karma' check (kind in ('ogrenme', 'pekistirme', 'yeni_nesil', 'zorlayici', 'karma', 'eksik_tamamlama', 'mini_deneme')),
  note text check (char_length(note) <= 1000),
  solution_mode text not null default 'after_answer' check (solution_mode in ('after_answer', 'after_complete', 'never')),
  status text not null default 'draft' check (status in ('draft', 'assigned', 'completed', 'archived')),
  due_on date,
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  completed_at timestamptz
);
create index if not exists study_plans_student_idx on public.study_plans(student_id, status);
create index if not exists study_plans_teacher_idx on public.study_plans(teacher_id, created_at desc);

create table if not exists public.study_plan_questions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  pool_question_id uuid references public.pool_questions(id) on delete set null,
  position int not null check (position >= 1),
  image_path text not null,
  option_count int not null default 4 check (option_count in (4, 5)),
  correct text not null check (correct in ('A', 'B', 'C', 'D', 'E')),
  topic_id uuid references public.topics(id) on delete set null,
  difficulty int check (difficulty between 1 and 5),
  question_type text,
  reason text check (char_length(reason) <= 300),
  answer text check (answer in ('A', 'B', 'C', 'D', 'E')),
  result text check (result in ('correct', 'incorrect', 'blank')),
  answered_at timestamptz,
  time_spent_sec int check (time_spent_sec >= 0),
  banked_at timestamptz,
  unique (plan_id, position)
);
create unique index if not exists spq_unique_pool on public.study_plan_questions(plan_id, pool_question_id) where pool_question_id is not null;
create index if not exists spq_pool_idx on public.study_plan_questions(pool_question_id);
create index if not exists spq_image_idx on public.study_plan_questions(image_path);

-- ============ RLS ============
alter table public.study_plans enable row level security;
alter table public.study_plan_questions enable row level security;
drop policy if exists plans_teacher on public.study_plans;
drop policy if exists plans_student on public.study_plans;
drop policy if exists spq_teacher on public.study_plan_questions;

create policy plans_teacher on public.study_plans for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and teacher_id = auth.uid() and public.can_manage_student(student_id));
create policy plans_student on public.study_plans for select to authenticated
  using (student_id = public.my_student_id() and status in ('assigned', 'completed'));
create policy spq_teacher on public.study_plan_questions for all to authenticated
  using (exists (select 1 from public.study_plans p where p.id = study_plan_questions.plan_id and (public.is_admin() or p.teacher_id = auth.uid())))
  with check (exists (select 1 from public.study_plans p where p.id = study_plan_questions.plan_id and p.teacher_id = auth.uid()));
-- (öğrenci için study_plan_questions politikası YOK: doğru cevap bu tabloda)

-- ============ ÖĞRENCİ FONKSİYONLARI ============
create or replace function public.study_plan_items(pid uuid)
returns table (qid uuid, pos int, img text, opts int, ans text, res text, cor text, answered timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  pl public.study_plans;
  all_done boolean;
begin
  select * into pl from public.study_plans p where p.id = pid and p.student_id = public.my_student_id() and p.status in ('assigned', 'completed');
  if pl.id is null then raise exception 'Çalışma bulunamadı'; end if;
  select not exists (select 1 from public.study_plan_questions z where z.plan_id = pid and z.answered_at is null) into all_done;
  return query
    select q.id, q.position, q.image_path, q.option_count, q.answer, q.result,
      case when q.answered_at is not null and (pl.solution_mode = 'after_answer' or (pl.solution_mode = 'after_complete' and all_done)) then q.correct end,
      q.answered_at
    from public.study_plan_questions q where q.plan_id = pid order by q.position;
end $$;

create or replace function public.answer_study_question(qid uuid, ans text, secs int)
returns table (res text, cor text)
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_student_id();
  q public.study_plan_questions;
  pl public.study_plans;
  r text;
  bank uuid;
  all_done boolean;
begin
  if sid is null then raise exception 'Öğrenci hesabı bulunamadı'; end if;
  select * into q from public.study_plan_questions z where z.id = qid;
  if q.id is null then raise exception 'Soru bulunamadı'; end if;
  select * into pl from public.study_plans p where p.id = q.plan_id and p.student_id = sid and p.status = 'assigned';
  if pl.id is null then raise exception 'Bu çalışma size atanmamış ya da kapanmış'; end if;
  if q.answered_at is not null then raise exception 'Bu soru zaten cevaplandı'; end if;
  if ans is not null and ans <> '' and (ans not in ('A', 'B', 'C', 'D', 'E') or (q.option_count = 4 and ans = 'E')) then
    raise exception 'Geçersiz şık';
  end if;
  r := case when ans is null or ans = '' then 'blank' when ans = q.correct then 'correct' else 'incorrect' end;
  update public.study_plan_questions z set answer = nullif(ans, ''), result = r, answered_at = now(),
    time_spent_sec = least(greatest(coalesce(secs, 0), 0), 3600) where z.id = qid;

  -- Yanlış / boş: öğrencinin soru bankasına (tekrar listesine) eklenir
  if r <> 'correct' then
    insert into public.questions (student_id, topic_id, initial_status, difficulty, question_no, question_text, correct_answer, student_answer, created_by)
    values (sid, q.topic_id, case when r = 'blank' then 'blank' else 'wrong' end,
      case when q.difficulty is null then null when q.difficulty <= 2 then 'easy' when q.difficulty = 3 then 'medium' else 'hard' end,
      q.position::text, 'Çalışma: ' || pl.title, q.correct, nullif(ans, ''), auth.uid())
    returning id into bank;
    insert into public.question_images (question_id, path, sort_order) values (bank, 'question-pool:' || q.image_path, 0);
    insert into public.question_attempts (question_id, student_id, result, attempt_type, created_by)
    values (bank, sid, case when r = 'blank' then 'blank' else 'incorrect' end, 'initial', auth.uid());
    update public.study_plan_questions z set banked_at = now() where z.id = qid;
  end if;

  select not exists (select 1 from public.study_plan_questions z where z.plan_id = q.plan_id and z.answered_at is null) into all_done;
  if all_done then
    update public.study_plans p set status = 'completed', completed_at = now() where p.id = q.plan_id;
  end if;
  return query select r, case when pl.solution_mode = 'after_answer' or (pl.solution_mode = 'after_complete' and all_done) then q.correct end;
end $$;

-- Öğrencinin kendi çalışma kanıtı (konu başarı profili için); doğru cevap içermez
create or replace function public.my_study_evidence()
returns table (topic_id uuid, difficulty int, question_type text, res text, at_time timestamptz)
language sql stable security definer set search_path = '' as $$
  select q.topic_id, q.difficulty, q.question_type, q.result, q.answered_at
  from public.study_plan_questions q join public.study_plans p on p.id = q.plan_id
  where p.student_id = public.my_student_id() and q.answered_at is not null
$$;

-- Öğrenci, atandığı çalışmanın ya da kendi bankasındaki soruların görselini okuyabilir
create or replace function public.pool_image_visible_to_me(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_student_id() is not null and (
    exists (select 1 from public.study_plan_questions q join public.study_plans pl on pl.id = q.plan_id
            where q.image_path = p and pl.student_id = public.my_student_id() and pl.status in ('assigned', 'completed'))
    or exists (select 1 from public.question_images i join public.questions qq on qq.id = i.question_id
               where i.path = 'question-pool:' || p and qq.student_id = public.my_student_id()))
$$;

drop policy if exists qpool_student on storage.objects;
create policy qpool_student on storage.objects for select to authenticated
  using (bucket_id = 'question-pool' and public.pool_image_visible_to_me(name));

-- Öğrenci kendi sorusuna rastgele havuz yolu bağlayamasın (görsel erişimi bu yoldan açılmasın)
drop policy if exists images_student_insert on public.question_images;
create policy images_student_insert on public.question_images for insert to authenticated
  with check (exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id())
    and path not like 'exam-pages:%' and path not like 'question-pool:%');

revoke execute on function public.study_plan_items(uuid), public.answer_study_question(uuid, text, int), public.my_study_evidence() from public, anon;
grant execute on function public.study_plan_items(uuid), public.answer_study_question(uuid, text, int), public.my_study_evidence() to authenticated;

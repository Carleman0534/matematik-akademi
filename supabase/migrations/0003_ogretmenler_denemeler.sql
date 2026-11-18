-- Matematik Akademi – Faz 2: birden çok öğretmen, sınıf kodları, öğretmen davetleri, online denemeler
-- 0001 ve 0002'den sonra Supabase SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
--
--  * Yönetici (profiles.is_admin) bütün öğretmenleri ve öğrencileri görür, öğretmen davet kodu üretir.
--  * Öğretmen yalnızca KENDİ öğrencilerini (students.teacher_id) ve kendi denemelerini görür.
--  * Öğrenci, öğretmenin verdiği sınıf koduyla kendi kaydolabilir (kayıt sunucuda yapılır).
--  * Deneme: sayfa görselleri + optik form. Cevap anahtarı öğrenciye sonuçlar açılana kadar gösterilmez.
--    Cevaplar yalnızca veritabanı fonksiyonlarıyla, süre içinde kaydedilir.

-- ============ ROLLER ============
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and is_admin)
$$;

-- İlk (mevcut) öğretmen yönetici olur
update public.profiles set is_admin = true
where id = (select id from public.profiles where role = 'teacher' order by created_at limit 1)
  and not exists (select 1 from public.profiles where is_admin);

-- Rol ve yönetici bayrağını yalnızca yönetici (ya da sunucu anahtarı) değiştirebilir
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (new.role is distinct from old.role or new.is_admin is distinct from old.is_admin) then
    raise exception 'Rol değiştirme yetkiniz yok';
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ============ SINIFLAR ============
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,12}$'),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists classes_teacher_idx on public.classes(teacher_id);

alter table public.students add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
alter table public.students add column if not exists class_id uuid references public.classes(id) on delete set null;
create index if not exists students_teacher_idx on public.students(teacher_id);
create index if not exists students_class_idx on public.students(class_id);

-- Mevcut öğrenciler yöneticiye bağlanır
update public.students set teacher_id = (select id from public.profiles where is_admin order by created_at limit 1)
where teacher_id is null;

-- ============ ÖĞRETMEN DAVETLERİ ============
create table if not exists public.teacher_invites (
  code text primary key check (code ~ '^[A-Z0-9]{8,12}$'),
  note text check (char_length(note) <= 120),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz
);

-- ============ YETKİ YARDIMCILARI ============
-- Öğretmen bu öğrenciyi yönetebilir mi? (kendi öğrencisi ya da yönetici)
create or replace function public.can_manage_student(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.profiles p on p.id = auth.uid()
    where s.id = sid and p.role = 'teacher' and (p.is_admin or s.teacher_id = p.id))
$$;

-- Depolama klasör adı (metin) için aynı denetim; geçersiz değerde hata vermez
create or replace function public.can_manage_student_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.profiles p on p.id = auth.uid()
    where s.id::text = folder and p.role = 'teacher' and (p.is_admin or s.teacher_id = p.id))
$$;

-- Öğretmen bu profili görebilir mi? (kendi öğrencisinin hesabı)
create or replace function public.teacher_sees_profile(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students s where s.profile_id = pid and s.teacher_id = auth.uid())
    and public.is_teacher()
$$;

-- ============ DENEMELER ============
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete restrict,          -- boş = öğretmenin bütün öğrencileri
  title text not null check (char_length(title) between 1 and 160),
  instructions text check (char_length(instructions) <= 2000),
  mode text not null check (mode in ('live', 'assignment')),               -- canlı oturum / süreli ödev
  question_count int not null check (question_count between 1 and 200),
  option_count int not null default 5 check (option_count in (4, 5)),
  duration_min int not null check (duration_min between 1 and 600),
  penalty_divisor int not null default 4 check (penalty_divisor in (0, 3, 4)), -- kaç yanlış bir doğruyu götürür (0 = götürmez)
  opens_at timestamptz,                                                    -- ödev: başlama zamanı
  closes_at timestamptz,                                                   -- ödev: son teslim
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  started_at timestamptz,                                                  -- canlı: öğretmenin başlattığı an
  results_mode text not null default 'after_close' check (results_mode in ('after_close', 'after_submit', 'never')),
  created_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);
create index if not exists exams_teacher_idx on public.exams(teacher_id, created_at desc);

create table if not exists public.exam_pages (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  path text not null,
  width int, height int,
  sort_order int not null default 0
);
create index if not exists exam_pages_exam_idx on public.exam_pages(exam_id, sort_order);

-- Cevap anahtarı: correct boş = iptal edilen soru (puanlamaya girmez)
create table if not exists public.exam_key (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_no int not null check (question_no between 1 and 200),
  correct text check (correct in ('A', 'B', 'C', 'D', 'E')),
  topic_id uuid references public.topics(id) on delete set null,
  page_no int check (page_no between 1 and 500),
  primary key (exam_id, question_no)
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  current_q int,
  transferred_at timestamptz,                                              -- yanlışlar soru bankasına aktarıldı
  unique (exam_id, student_id)
);
create index if not exists exam_sessions_student_idx on public.exam_sessions(student_id);

create table if not exists public.exam_answers (
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  question_no int not null check (question_no between 1 and 200),
  answer text check (answer in ('A', 'B', 'C', 'D', 'E')),
  updated_at timestamptz not null default now(),
  primary key (session_id, question_no)
);

-- Öğretmen bu denemeyi yönetebilir mi?
create or replace function public.can_manage_exam(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exams e join public.profiles p on p.id = auth.uid()
    where e.id = eid and p.role = 'teacher' and (p.is_admin or e.teacher_id = p.id))
$$;
create or replace function public.can_manage_exam_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exams e join public.profiles p on p.id = auth.uid()
    where e.id::text = folder and p.role = 'teacher' and (p.is_admin or e.teacher_id = p.id))
$$;

-- Deneme bu öğrenciye atanmış ve yayımlanmış mı?
create or replace function public.exam_visible_to_me(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exams e join public.students s on s.id = public.my_student_id()
    where e.id = eid and e.status <> 'draft' and e.teacher_id = s.teacher_id
      and (e.class_id is null or e.class_id = s.class_id))
$$;

-- Deneme bitti mi? (öğretmen bitirdi, ödev süresi doldu ya da canlı süre + 2 dk geçti)
create or replace function public.exam_is_over(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select e.status = 'closed'
      or (e.mode = 'assignment' and e.closes_at is not null and now() > e.closes_at)
      or (e.mode = 'live' and e.started_at is not null and now() > e.started_at + make_interval(mins => e.duration_min + 2))
    from public.exams e where e.id = eid), false)
$$;

-- Öğrenci sayfaları görebilir mi? (canlıda başladıktan, ödevde açılış saatinden sonra)
create or replace function public.exam_pages_open(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.exam_visible_to_me(eid) and exists (select 1 from public.exams e where e.id = eid and (
    (e.mode = 'live' and e.started_at is not null)
    or (e.mode = 'assignment' and (e.opens_at is null or now() >= e.opens_at))
    or e.status = 'closed'))
$$;
create or replace function public.exam_pages_open_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select public.exam_pages_open(e.id) from public.exams e where e.id::text = folder), false)
$$;

-- Öğrenci kendi sonuçlarını (cevap anahtarını) görebilir mi?
create or replace function public.exam_results_visible(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.exam_visible_to_me(eid) and exists (
    select 1 from public.exams e join public.exam_sessions ss on ss.exam_id = e.id and ss.student_id = public.my_student_id()
    where e.id = eid and (
      (e.results_mode = 'after_close' and public.exam_is_over(e.id))
      or (e.results_mode = 'after_submit' and (ss.submitted_at is not null or now() > ss.deadline or public.exam_is_over(e.id)))))
$$;

-- ---- Öğrencinin deneme işlemleri (yalnızca bu fonksiyonlarla) ----
create or replace function public.start_exam(eid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.my_student_id();
  e public.exams;
  existing uuid;
  dl timestamptz;
begin
  if sid is null then raise exception 'Öğrenci hesabı bulunamadı'; end if;
  if not public.exam_visible_to_me(eid) then raise exception 'Bu deneme size atanmamış'; end if;
  select id into existing from public.exam_sessions where exam_id = eid and student_id = sid;
  if existing is not null then return existing; end if;
  select * into e from public.exams where id = eid;
  if public.exam_is_over(eid) then raise exception 'Deneme sona erdi'; end if;
  if e.mode = 'live' then
    if e.started_at is null then raise exception 'Deneme henüz başlamadı'; end if;
    dl := e.started_at + make_interval(mins => e.duration_min);
  else
    if e.opens_at is not null and now() < e.opens_at then raise exception 'Deneme henüz açılmadı'; end if;
    dl := now() + make_interval(mins => e.duration_min);
    if e.closes_at is not null and e.closes_at < dl then dl := e.closes_at; end if;
  end if;
  if dl <= now() then raise exception 'Deneme süresi doldu'; end if;
  insert into public.exam_sessions (exam_id, student_id, deadline, current_q) values (eid, sid, dl, 1)
  on conflict (exam_id, student_id) do nothing returning id into existing;
  if existing is null then select id into existing from public.exam_sessions where exam_id = eid and student_id = sid; end if;
  return existing;
end $$;

create or replace function public.save_answer(p_session uuid, p_q int, p_answer text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  ss public.exam_sessions;
  e public.exams;
begin
  select * into ss from public.exam_sessions where id = p_session and student_id = public.my_student_id();
  if ss.id is null then raise exception 'Oturum bulunamadı'; end if;
  if ss.submitted_at is not null then raise exception 'Deneme teslim edildi'; end if;
  if now() > ss.deadline + interval '15 seconds' then raise exception 'Süre doldu'; end if;
  select * into e from public.exams where id = ss.exam_id;
  if e.status = 'closed' then raise exception 'Deneme öğretmen tarafından bitirildi'; end if;
  if p_q < 1 or p_q > e.question_count then raise exception 'Geçersiz soru numarası'; end if;
  if p_answer is not null and (p_answer not in ('A', 'B', 'C', 'D', 'E') or (e.option_count = 4 and p_answer = 'E')) then
    raise exception 'Geçersiz şık';
  end if;
  insert into public.exam_answers (session_id, question_no, answer, updated_at) values (p_session, p_q, p_answer, now())
  on conflict (session_id, question_no) do update set answer = excluded.answer, updated_at = now();
  update public.exam_sessions set last_seen_at = now(), current_q = p_q where id = p_session;
  return now();
end $$;

create or replace function public.exam_heartbeat(p_session uuid, p_q int) returns timestamptz
language sql security definer set search_path = '' as $$
  update public.exam_sessions set last_seen_at = now(), current_q = coalesce(p_q, current_q)
  where id = p_session and student_id = public.my_student_id() and submitted_at is null
  returning now()
$$;

create or replace function public.submit_exam(p_session uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare ss public.exam_sessions;
begin
  select * into ss from public.exam_sessions where id = p_session and student_id = public.my_student_id();
  if ss.id is null then raise exception 'Oturum bulunamadı'; end if;
  if ss.submitted_at is null then
    update public.exam_sessions set submitted_at = least(now(), deadline), last_seen_at = now() where id = p_session;
  end if;
  return now();
end $$;

-- ---- Öğretmen işlemleri ----
create or replace function public.start_live_exam(eid uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_exam(eid) then raise exception 'Yetkiniz yok'; end if;
  update public.exams set status = 'published', started_at = now() where id = eid and mode = 'live' and started_at is null;
  return now();
end $$;

-- Cevap matrisi: oturum başına tek satır, cevaplar tek metin ('-' = boş). Satır sınırına takılmaz.
create or replace function public.exam_answer_matrix(eid uuid)
returns table (session_id uuid, student_id uuid, started_at timestamptz, deadline timestamptz, submitted_at timestamptz,
               last_seen_at timestamptz, current_q int, transferred_at timestamptz, answers text)
language plpgsql stable security definer set search_path = '' as $$
declare n int;
begin
  if not public.can_manage_exam(eid) then raise exception 'Yetkiniz yok'; end if;
  select question_count into n from public.exams where id = eid;
  return query
    select ss.id, ss.student_id, ss.started_at, ss.deadline, ss.submitted_at, ss.last_seen_at, ss.current_q, ss.transferred_at,
      (select string_agg(coalesce(a.answer, '-'), '' order by g.q)
         from generate_series(1, n) g(q)
         left join public.exam_answers a on a.session_id = ss.id and a.question_no = g.q)
    from public.exam_sessions ss where ss.exam_id = eid;
end $$;

-- Yanlış ve boşları öğrencinin soru bankasına aktarır (sayfa görseliyle). Çağıranın yetkileri geçerli.
create or replace function public.transfer_exam_wrongs(eid uuid, sids uuid[] default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  e public.exams;
  src uuid;
  ss record;
  k record;
  ans text;
  qid uuid;
  pg text;
  n int := 0;
begin
  if not public.can_manage_exam(eid) then raise exception 'Yetkiniz yok'; end if;
  select * into e from public.exams where id = eid;
  insert into public.sources (name, created_by) values (left(e.title, 160), auth.uid()) on conflict ((lower(name))) do nothing;
  select id into src from public.sources where lower(name) = lower(left(e.title, 160));
  for ss in select * from public.exam_sessions where exam_id = eid and transferred_at is null
      and (submitted_at is not null or now() > deadline or public.exam_is_over(eid))
      and (sids is null or student_id = any(sids)) loop
    for k in select * from public.exam_key where exam_id = eid and correct is not null order by question_no loop
      select a.answer into ans from public.exam_answers a where a.session_id = ss.id and a.question_no = k.question_no;
      if ans is distinct from k.correct then
        insert into public.questions (student_id, topic_id, source_id, initial_status, page_no, question_no, question_text,
          correct_answer, student_answer, created_by, created_at)
        values (ss.student_id, k.topic_id, src, case when ans is null then 'blank' else 'wrong' end, k.page_no::text, k.question_no::text,
          e.title || ' – ' || k.question_no || '. soru', k.correct, ans, auth.uid(), coalesce(ss.submitted_at, ss.deadline))
        returning id into qid;
        pg := null;
        if k.page_no is not null then
          select p.path into pg from public.exam_pages p where p.exam_id = eid order by p.sort_order offset k.page_no - 1 limit 1;
        end if;
        if pg is not null then
          insert into public.question_images (question_id, path, thumb_path, sort_order) values (qid, 'exam-pages:' || pg, null, 0);
        end if;
        insert into public.question_attempts (question_id, student_id, result, attempt_type, created_by, attempted_at)
        values (qid, ss.student_id, case when ans is null then 'blank' else 'incorrect' end, 'initial', auth.uid(), coalesce(ss.submitted_at, ss.deadline));
        n := n + 1;
      end if;
      ans := null;
    end loop;
    update public.exam_sessions set transferred_at = now() where id = ss.id;
  end loop;
  return n;
end $$;

-- ============ RLS ============
alter table public.classes enable row level security;
alter table public.teacher_invites enable row level security;
alter table public.exams enable row level security;
alter table public.exam_pages enable row level security;
alter table public.exam_key enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_answers enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles','students','questions','question_images','question_attempts',
                      'classes','teacher_invites','exams','exam_pages','exam_key','exam_sessions','exam_answers') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: kendini; yönetici herkesi; öğretmen kendi öğrencilerini
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.teacher_sees_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin() or public.teacher_sees_profile(id) or (id = auth.uid() and public.is_teacher()))
  with check (public.is_admin() or public.teacher_sees_profile(id) or (id = auth.uid() and public.is_teacher()));

-- students: öğretmen kendi öğrencileri (yönetici hepsi); öğrenci kendini görür
create policy students_teacher on public.students for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()
    and (class_id is null or exists (select 1 from public.classes c where c.id = students.class_id and c.teacher_id = auth.uid())))));
create policy students_self_select on public.students for select to authenticated using (profile_id = auth.uid());

-- sorular / görseller / geçmiş: öğretmen yalnızca kendi öğrencilerininkini
create policy questions_teacher on public.questions for all to authenticated
  using (public.can_manage_student(student_id)) with check (public.can_manage_student(student_id));
create policy questions_student_select on public.questions for select to authenticated using (student_id = public.my_student_id());
create policy questions_student_insert on public.questions for insert to authenticated with check (student_id = public.my_student_id());
create policy questions_student_update on public.questions for update to authenticated using (student_id = public.my_student_id()) with check (student_id = public.my_student_id());

create policy images_teacher on public.question_images for all to authenticated
  using (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_student(q.student_id)))
  with check (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_student(q.student_id)));
create policy images_student_select on public.question_images for select to authenticated
  using (exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id()));
create policy images_student_insert on public.question_images for insert to authenticated
  with check (exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id())
    and path not like 'exam-pages:%');

create policy attempts_teacher on public.question_attempts for all to authenticated
  using (public.can_manage_student(student_id))
  with check (public.can_manage_student(student_id)
    and exists (select 1 from public.questions q where q.id = question_attempts.question_id and q.student_id = question_attempts.student_id));
create policy attempts_student_select on public.question_attempts for select to authenticated using (student_id = public.my_student_id());
create policy attempts_student_insert on public.question_attempts for insert to authenticated
  with check (student_id = public.my_student_id()
    and exists (select 1 from public.questions q where q.id = question_id and q.student_id = public.my_student_id()));

-- sınıflar: öğretmen kendi sınıfları; öğrenci kendi sınıfının adını görür
create policy classes_teacher on public.classes for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()));
create policy classes_student_select on public.classes for select to authenticated
  using (id = (select s.class_id from public.students s where s.id = public.my_student_id()));

-- davetler: yalnızca yönetici (kayıt sunucuda, sunucu anahtarıyla doğrulanır)
create policy invites_admin on public.teacher_invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- denemeler
create policy exams_teacher on public.exams for all to authenticated
  using (public.can_manage_exam(id))
  with check (public.is_teacher() and (public.is_admin() or teacher_id = auth.uid())
    and (class_id is null or exists (select 1 from public.classes c where c.id = exams.class_id and c.teacher_id = exams.teacher_id)));
create policy exams_student_select on public.exams for select to authenticated using (public.exam_visible_to_me(id));

create policy exam_pages_teacher on public.exam_pages for all to authenticated
  using (public.can_manage_exam(exam_id)) with check (public.can_manage_exam(exam_id));
create policy exam_pages_student on public.exam_pages for select to authenticated using (public.exam_pages_open(exam_id));

create policy exam_key_teacher on public.exam_key for all to authenticated
  using (public.can_manage_exam(exam_id)) with check (public.can_manage_exam(exam_id));
create policy exam_key_student on public.exam_key for select to authenticated using (public.exam_results_visible(exam_id));

-- oturumlar ve cevaplar: öğretmen görür, siler (yeniden çözdürmek için) ve aktarım işaretini günceller;
-- öğrenci yalnızca kendininkini görür, yazma işlemleri fonksiyonlarla
create policy sessions_teacher_select on public.exam_sessions for select to authenticated using (public.can_manage_exam(exam_id));
create policy sessions_teacher_update on public.exam_sessions for update to authenticated
  using (public.can_manage_exam(exam_id)) with check (public.can_manage_exam(exam_id));
create policy sessions_teacher_delete on public.exam_sessions for delete to authenticated using (public.can_manage_exam(exam_id));
create policy sessions_student_select on public.exam_sessions for select to authenticated using (student_id = public.my_student_id());

create policy answers_teacher_select on public.exam_answers for select to authenticated
  using (exists (select 1 from public.exam_sessions ss where ss.id = session_id and public.can_manage_exam(ss.exam_id)));
create policy answers_student_select on public.exam_answers for select to authenticated
  using (exists (select 1 from public.exam_sessions ss where ss.id = session_id and ss.student_id = public.my_student_id()));

-- ============ DEPOLAMA ============
-- Soru fotoğrafları: öğretmen yalnızca kendi öğrencilerinin klasörlerine erişir
drop policy if exists qimg_select on storage.objects;
drop policy if exists qimg_insert on storage.objects;
drop policy if exists qimg_delete on storage.objects;
create policy qimg_select on storage.objects for select to authenticated
  using (bucket_id = 'question-images' and (public.can_manage_student_folder((storage.foldername(name))[1]) or (storage.foldername(name))[1] = public.my_student_id()::text));
create policy qimg_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'question-images' and (public.can_manage_student_folder((storage.foldername(name))[1]) or (storage.foldername(name))[1] = public.my_student_id()::text));
create policy qimg_delete on storage.objects for delete to authenticated
  using (bucket_id = 'question-images' and public.can_manage_student_folder((storage.foldername(name))[1]));

-- Deneme sayfaları: <exam_id>/<dosya>. Öğretmen yönetir; öğrenci deneme açıldıktan sonra görür.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-pages', 'exam-pages', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists epage_select on storage.objects;
drop policy if exists epage_insert on storage.objects;
drop policy if exists epage_update on storage.objects;
drop policy if exists epage_delete on storage.objects;
create policy epage_select on storage.objects for select to authenticated
  using (bucket_id = 'exam-pages' and (public.can_manage_exam_folder((storage.foldername(name))[1]) or public.exam_pages_open_folder((storage.foldername(name))[1])));
create policy epage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'exam-pages' and public.can_manage_exam_folder((storage.foldername(name))[1]));
create policy epage_update on storage.objects for update to authenticated
  using (bucket_id = 'exam-pages' and public.can_manage_exam_folder((storage.foldername(name))[1]));
create policy epage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'exam-pages' and public.can_manage_exam_folder((storage.foldername(name))[1]));

-- Fonksiyonları yalnızca giriş yapmış kullanıcılar çağırabilir
revoke execute on function public.start_exam(uuid), public.save_answer(uuid, int, text), public.exam_heartbeat(uuid, int),
  public.submit_exam(uuid), public.start_live_exam(uuid), public.exam_answer_matrix(uuid), public.transfer_exam_wrongs(uuid, uuid[])
  from public, anon;
grant execute on function public.start_exam(uuid), public.save_answer(uuid, int, text), public.exam_heartbeat(uuid, int),
  public.submit_exam(uuid), public.start_live_exam(uuid), public.exam_answer_matrix(uuid), public.transfer_exam_wrongs(uuid, uuid[])
  to authenticated;

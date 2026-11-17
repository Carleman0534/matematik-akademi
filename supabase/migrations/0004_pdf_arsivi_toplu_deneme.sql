-- =========================================================================
-- Matematik Akademi - Faz 4: PDF ve Deneme Arşivi, Toplu Deneme Sınav Sistemi,
-- Soru Bazlı Analiz ve Sınav Oturum Yönetimi
-- =========================================================================

-- 1. PDF DOKÜMANLARI ARŞİVİ
create table if not exists public.pdf_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  file_name text not null,
  file_path text not null,
  file_type text not null default 'deneme' check (file_type in ('deneme', 'soru_bankasi', 'cevap_anahtari', 'cozum', 'calisma_foyu', 'diger')),
  subject text not null default 'Matematik',
  grade_level text default 'TYT',
  topic text,
  publisher text,
  file_size_mb numeric(6,2),
  page_count int default 1,
  description text,
  answer_key text,
  question_count int default 40,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pdf_docs_teacher_idx on public.pdf_documents(teacher_id, created_at desc);

-- 2. DOKÜMANLAR ARASI İLİŞKİLER (Örn: Soru Kitapçığı ile Cevap Anahtarı / Çözüm Föyü)
create table if not exists public.pdf_document_relations (
  id uuid primary key default gen_random_uuid(),
  pdf_id uuid not null references public.pdf_documents(id) on delete cascade,
  related_pdf_id uuid not null references public.pdf_documents(id) on delete cascade,
  relation_type text not null default 'answer_key' check (relation_type in ('answer_key', 'solution', 'worksheet', 'other')),
  created_at timestamptz not null default now(),
  unique (pdf_id, related_pdf_id, relation_type)
);

-- 3. DENEMELER TABLOSUNA PDF VE NET KATSAYISI GENİŞLETMESİ
alter table public.exams add column if not exists pdf_id uuid references public.pdf_documents(id) on delete set null;
alter table public.exams add column if not exists is_template boolean not null default true;
alter table public.exams add column if not exists solution_pdf_id uuid references public.pdf_documents(id) on delete set null;

-- 4. TOPLU DENEME ATAMALARI (Bir şablonun öğrencilere toplu atanması)
create table if not exists public.exam_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  starts_at timestamptz,
  due_at timestamptz,
  duration_min int not null default 60,
  extra_time_min int not null default 0,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')),
  unique (exam_id, student_id)
);
create index if not exists exam_assign_student_idx on public.exam_assignments(student_id, status);
create index if not exists exam_assign_exam_idx on public.exam_assignments(exam_id);

-- 5. SINAV DENETİM VE OLAY İZİ (Audit Log: Süre uzatma, yeniden açma, erken bitirme)
create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  session_id uuid references public.exam_sessions(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  performed_by uuid default auth.uid() references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('assigned', 'started', 'submitted', 'time_extended', 'reopened', 'cancelled', 'auto_submitted', 'key_updated')),
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists exam_events_exam_idx on public.exam_events(exam_id, created_at desc);

-- 6. TOPLU ATAMA FONKSİYONU (Tek tıkla birden fazla öğrenciye sınav oturumu ve atama oluşturma)
create or replace function public.batch_assign_exam(
  p_exam_id uuid,
  p_student_ids uuid[],
  p_starts_at timestamptz default null,
  p_due_at timestamptz default null,
  p_duration_min int default null
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_teacher_id uuid := auth.uid();
  v_exam public.exams;
  v_sid uuid;
  v_count int := 0;
  v_dur int;
begin
  select * into v_exam from public.exams where id = p_exam_id;
  if v_exam.id is null then
    raise exception 'Deneme şablonu bulunamadı';
  end if;

  if not public.can_manage_exam(p_exam_id) then
    raise exception 'Bu denemeyi atama yetkiniz yok';
  end if;

  v_dur := coalesce(p_duration_min, v_exam.duration_min, 60);

  foreach v_sid in array p_student_ids loop
    -- Öğrenci öğretmene bağlı mı kontrol et
    if exists (select 1 from public.students where id = v_sid and (teacher_id = v_teacher_id or public.is_admin())) then
      insert into public.exam_assignments (
        exam_id, student_id, assigned_by, starts_at, due_at, duration_min, status
      ) values (
        p_exam_id, v_sid, v_teacher_id, p_starts_at, p_due_at, v_dur, 'assigned'
      )
      on conflict (exam_id, student_id) do update set
        starts_at = excluded.starts_at,
        due_at = excluded.due_at,
        duration_min = excluded.duration_min,
        status = 'assigned';

      v_count := v_count + 1;
    end if;
  end loop;

  -- Deneme durumunu published yap
  update public.exams set status = 'published' where id = p_exam_id and status = 'draft';

  -- Olay günlüğüne yaz
  insert into public.exam_events (exam_id, performed_by, event_type, details)
  values (p_exam_id, v_teacher_id, 'assigned', json_build_object('student_count', v_count, 'duration', v_dur));

  return json_build_object('success', true, 'assigned_count', v_count);
end $$;

-- 7. SINAV SÜRESİ UZATMA / YENİDEN AÇMA FONKSİYONU
create or replace function public.extend_student_exam_time(
  p_session_id uuid,
  p_extra_minutes int
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_ss public.exam_sessions;
  v_new_deadline timestamptz;
begin
  select * into v_ss from public.exam_sessions where id = p_session_id;
  if v_ss.id is null then raise exception 'Oturum bulunamadı'; end if;
  if not public.can_manage_exam(v_ss.exam_id) then raise exception 'Yetkiniz yok'; end if;

  v_new_deadline := greatest(now(), v_ss.deadline) + make_interval(mins => p_extra_minutes);

  update public.exam_sessions
  set deadline = v_new_deadline,
      submitted_at = null
  where id = p_session_id;

  update public.exam_assignments
  set extra_time_min = extra_time_min + p_extra_minutes,
      status = 'in_progress'
  where exam_id = v_ss.exam_id and student_id = v_ss.student_id;

  insert into public.exam_events (exam_id, session_id, student_id, performed_by, event_type, details)
  values (v_ss.exam_id, p_session_id, v_ss.student_id, auth.uid(), 'time_extended', json_build_object('minutes', p_extra_minutes));

  return v_new_deadline;
end $$;

-- 8. GÜVENLİK (RLS) POLİTİKALARI
alter table public.pdf_documents enable row level security;
alter table public.pdf_document_relations enable row level security;
alter table public.exam_assignments enable row level security;
alter table public.exam_events enable row level security;

-- Öğretmen kendi PDF'lerini görür ve yönetir; öğrenciler kendilerine atanmış denemenin PDF'ini görebilir
create policy pdf_docs_teacher on public.pdf_documents for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

create policy pdf_docs_student on public.pdf_documents for select to authenticated
  using (
    exists (
      select 1 from public.exam_assignments ea
      join public.exams e on e.id = ea.exam_id
      where ea.student_id = public.my_student_id()
        and e.pdf_id = pdf_documents.id
    )
  );

create policy pdf_relations_teacher on public.pdf_document_relations for all to authenticated
  using (exists (select 1 from public.pdf_documents p where p.id = pdf_id and (p.teacher_id = auth.uid() or public.is_admin())));

create policy exam_assignments_teacher on public.exam_assignments for all to authenticated
  using (public.can_manage_exam(exam_id))
  with check (public.can_manage_exam(exam_id));

create policy exam_assignments_student on public.exam_assignments for select to authenticated
  using (student_id = public.my_student_id());

create policy exam_events_teacher on public.exam_events for all to authenticated
  using (public.can_manage_exam(exam_id));

grant execute on function public.batch_assign_exam(uuid, uuid[], timestamptz, timestamptz, int) to authenticated;
grant execute on function public.extend_student_exam_time(uuid, int) to authenticated;

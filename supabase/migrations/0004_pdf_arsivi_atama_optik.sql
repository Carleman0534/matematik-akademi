-- Matematik Akademi – PDF arşivi, seçili öğrencilere deneme atama, kâğıt optik girişi
-- 0003'ten sonra Supabase SQL Editor'de çalıştırın. Tekrar çalıştırmak güvenlidir.

-- ============ PDF ARŞİVİ ============
-- Öğretmenin kitap, deneme, cevap anahtarı, çözüm PDF'leri. Gizli kovada: <öğretmen_id>/<dosya>.pdf
create table if not exists public.pdf_documents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  doc_type text not null default 'deneme' check (doc_type in ('deneme', 'soru_bankasi', 'cevap_anahtari', 'cozum', 'calisma_foyu', 'diger')),
  grade_level text check (char_length(grade_level) <= 30),
  topic_id uuid references public.topics(id) on delete set null,
  publisher text check (char_length(publisher) <= 120),
  description text check (char_length(description) <= 1000),
  path text not null,
  file_name text not null check (char_length(file_name) <= 255),
  size_bytes bigint,
  page_count int,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pdf_documents_teacher_idx on public.pdf_documents(teacher_id, created_at desc);

alter table public.exams add column if not exists pdf_id uuid references public.pdf_documents(id) on delete set null;

-- ============ SEÇİLİ ÖĞRENCİLERE ATAMA ============
-- Bir denemeye satır eklenmişse deneme YALNIZCA bu öğrencilere görünür (sınıf/hepsi yerine)
create table if not exists public.exam_assignees (
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (exam_id, student_id)
);
create index if not exists exam_assignees_student_idx on public.exam_assignees(student_id);

create or replace function public.exam_visible_to_me(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exams e join public.students s on s.id = public.my_student_id()
    where e.id = eid and e.status <> 'draft' and e.teacher_id = s.teacher_id
      and (e.class_id is null or e.class_id = s.class_id)
      and (not exists (select 1 from public.exam_assignees a where a.exam_id = e.id)
           or exists (select 1 from public.exam_assignees a where a.exam_id = e.id and a.student_id = s.id)))
$$;

-- ============ KÂĞIT OPTİK ============
alter table public.exam_sessions add column if not exists source text not null default 'online' check (source in ('online', 'paper'));

-- Öğretmen, kâğıt üzerinde çözülen denemenin cevaplarını öğrenci adına girer ("AB-D…", '-' ya da boşluk = boş)
create or replace function public.record_paper_answers(eid uuid, sid uuid, p_answers text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e public.exams;
  ses uuid;
  c text;
  i int;
begin
  if not public.can_manage_exam(eid) or not public.can_manage_student(sid) then raise exception 'Yetkiniz yok'; end if;
  select * into e from public.exams where id = eid;
  if char_length(coalesce(p_answers, '')) > e.question_count then raise exception 'Cevap sayısı soru sayısından fazla'; end if;
  -- izin verilen karakterler silinince geriye bir şey kalıyorsa geçersiz şık var
  if translate(upper(coalesce(p_answers, '')), case when e.option_count = 4 then 'ABCD- ' else 'ABCDE- ' end, '') <> '' then
    raise exception 'Geçersiz şık';
  end if;
  insert into public.exam_sessions as ss (exam_id, student_id, started_at, deadline, submitted_at, last_seen_at, source)
  values (eid, sid, now(), now(), now(), now(), 'paper')
  on conflict (exam_id, student_id) do update set submitted_at = coalesce(ss.submitted_at, now()), source = 'paper'
  returning id into ses;
  delete from public.exam_answers where session_id = ses;
  for i in 1 .. char_length(coalesce(p_answers, '')) loop
    c := upper(substr(p_answers, i, 1));
    if c in ('A', 'B', 'C', 'D', 'E') then
      insert into public.exam_answers (session_id, question_no, answer) values (ses, i, c);
    end if;
  end loop;
  return ses;
end $$;

-- ============ RLS ============
alter table public.pdf_documents enable row level security;
alter table public.exam_assignees enable row level security;
drop policy if exists pdf_docs_teacher on public.pdf_documents;
drop policy if exists assignees_teacher on public.exam_assignees;
drop policy if exists assignees_student on public.exam_assignees;

create policy pdf_docs_teacher on public.pdf_documents for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and teacher_id = auth.uid());

create policy assignees_teacher on public.exam_assignees for all to authenticated
  using (public.can_manage_exam(exam_id))
  with check (public.can_manage_exam(exam_id) and public.can_manage_student(student_id));
create policy assignees_student on public.exam_assignees for select to authenticated using (student_id = public.my_student_id());

-- PDF kovası: yalnızca öğretmen kendi klasörüne (yönetici hepsini okur)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdf-library', 'pdf-library', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pdflib_select on storage.objects;
drop policy if exists pdflib_insert on storage.objects;
drop policy if exists pdflib_delete on storage.objects;
create policy pdflib_select on storage.objects for select to authenticated
  using (bucket_id = 'pdf-library' and (public.is_admin() or (public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy pdflib_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pdf-library' and public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text);
create policy pdflib_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pdf-library' and public.is_teacher() and (storage.foldername(name))[1] = auth.uid()::text);

revoke execute on function public.record_paper_answers(uuid, uuid, text) from public, anon;
grant execute on function public.record_paper_answers(uuid, uuid, text) to authenticated;

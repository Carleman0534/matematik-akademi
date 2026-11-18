-- Faz F: uyarlanabilir öğrenme
--  * study_recommendations: sistemin ürettiği çalışma önerileri (öğretmen onaylar / reddeder; kendiliğinden atanmaz)
--  * students.daily_goal: öğrencinin günlük soru hedefi (öğretmen belirler)

create table if not exists public.study_recommendations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  unit_id uuid not null references public.topics(id) on delete cascade,
  trigger text not null check (trigger in ('eksik', 'tekrar_zamani', 'ilerlet')),
  kind text not null,
  q_count int not null check (q_count between 3 and 60),
  mix text,
  text text not null,
  source text not null default 'manuel',
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed', 'stale')),
  plan_id uuid references public.study_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists recs_one_pending on public.study_recommendations(student_id, unit_id, trigger) where status = 'pending';
create index if not exists recs_teacher_idx on public.study_recommendations(teacher_id, status, created_at desc);

alter table public.study_recommendations enable row level security;
drop policy if exists recs_teacher on public.study_recommendations;
create policy recs_teacher on public.study_recommendations for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and teacher_id = auth.uid() and public.can_manage_student(student_id));
-- Öğrenci için politika YOK: öneriler öğretmene aittir.

alter table public.students add column if not exists daily_goal int not null default 10;
alter table public.students drop constraint if exists students_daily_goal_chk;
alter table public.students add constraint students_daily_goal_chk check (daily_goal between 0 and 100);

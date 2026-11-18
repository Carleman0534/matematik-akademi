-- Düzeltme: denemeler kuralı, aynı satırı can_manage_exam() ile aradığı için yeni eklenen denemeyi göremiyordu
-- (INSERT ... RETURNING reddediliyordu). Kural artık satırın kendi öğretmen alanına bakar.
drop policy if exists exams_teacher on public.exams;
create policy exams_teacher on public.exams for all to authenticated
  using (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()))
  with check (public.is_teacher() and (public.is_admin() or teacher_id = auth.uid())
    and (class_id is null or exists (select 1 from public.classes c where c.id = exams.class_id and c.teacher_id = exams.teacher_id)));

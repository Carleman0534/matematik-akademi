-- Düzeltme: students ve classes politikaları birbirine bakıyordu (students_teacher → classes, classes_student_select → students)
-- ve öğretmenin öğrenci bilgisini güncellemesi "infinite recursion detected in policy for relation students" hatası veriyordu.
-- Öğrencinin kendi sınıfı artık RLS'i atlayan (security definer) bir fonksiyonla bulunur.

create or replace function public.my_class_id() returns uuid
language sql stable security definer set search_path = public as $$
  select class_id from public.students where id = public.my_student_id()
$$;
grant execute on function public.my_class_id() to authenticated;

drop policy if exists classes_student_select on public.classes;
create policy classes_student_select on public.classes for select to authenticated
  using (id = public.my_class_id());

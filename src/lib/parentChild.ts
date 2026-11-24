// Veli sayfaları için: hangi çocuğun gösterileceğini belirler (istemci tarafı).
// Kayıtlı seçim varsa onu, yoksa velinin bağlı olduğu ilk (aktif) çocuğu kullanır. Sabit bir öğrenci kimliği yoktur.
export async function resolveParentStudentId(saved: string | null): Promise<string | null> {
  try {
    const res = await fetch('/api/parent/students');
    const json = await res.json();
    const list: { student_id: string }[] = json?.success ? json.students : [];
    if (saved && list.some((s) => s.student_id === saved)) return saved;
    const first = list[0]?.student_id || null;
    if (first) { try { localStorage.setItem('parent_active_student_id', first); } catch {} }
    return first;
  } catch {
    return null;
  }
}

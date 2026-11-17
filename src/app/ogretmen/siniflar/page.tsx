import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { requireTeacher } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getClasses } from '@/lib/data';
import { CreateClassForm, ClassCard } from './ClassForms';

export const metadata: Metadata = { title: 'Sınıflar' };

export default async function ClassesPage() {
  const me = await requireTeacher();
  const sb = await supabaseServer();
  const [classes, { data: st }] = await Promise.all([
    getClasses(sb, me.userId),
    sb.from('students').select('class_id').eq('teacher_id', me.userId).eq('is_active', true),
  ]);
  const counts = new Map<string, number>();
  (st || []).forEach((r: { class_id: string | null }) => { if (r.class_id) counts.set(r.class_id, (counts.get(r.class_id) || 0) + 1); });
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host') || ''}`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sınıflar</h1>
        <p className="mt-1 text-sm text-slate-500">Her sınıfın bir kayıt kodu vardır. Öğrenci <b>Kayıt ol</b> sayfasında bu kodu yazınca hesabı açılır ve doğrudan size ve bu sınıfa bağlanır.
          Denemeleri bir sınıfa ya da bütün öğrencilerinize atayabilirsiniz.</p>
      </div>
      <div className="card"><CreateClassForm /></div>
      {classes.length === 0 ? <p className="text-sm text-slate-500">Henüz sınıf yok. İlk sınıfınızı ekleyin, kodu öğrencilerinize gönderin.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(c => <ClassCard key={c.id} c={c} students={counts.get(c.id) || 0} origin={origin} />)}
        </div>
      )}
    </div>
  );
}

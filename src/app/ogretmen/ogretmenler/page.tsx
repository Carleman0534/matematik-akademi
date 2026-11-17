import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDate } from '@/lib/labels';
import { CreateInviteForm, DeleteInviteButton } from './InviteForms';

export const metadata: Metadata = { title: 'Öğretmenler' };

const isPast = (iso: string) => Date.parse(iso) < Date.now();

export default async function TeachersPage() {
  await requireAdmin();
  const sb = await supabaseServer();
  const [{ data: teachers }, { data: st }, { data: invites }, { data: exams }] = await Promise.all([
    sb.from('profiles').select('id, full_name, is_admin, created_at').eq('role', 'teacher').order('created_at'),
    sb.from('students').select('teacher_id, is_active'),
    sb.from('teacher_invites').select('code, note, created_at, expires_at, used_at, used_by').order('created_at', { ascending: false }).limit(50),
    sb.from('exams').select('teacher_id'),
  ]);
  // E-postalar yalnızca auth tablosunda; yönetici doğrulandıktan sonra sunucu anahtarıyla okunur
  const emails = new Map<string, string>();
  try {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
    data.users.forEach(u => { if (u.email) emails.set(u.id, u.email); });
  } catch { /* anahtar yoksa e-posta gösterilmez */ }
  const count = (rows: { teacher_id: string | null }[] | null, id: string) => (rows || []).filter(r => r.teacher_id === id).length;
  const names = new Map((teachers || []).map(t => [t.id, t.full_name]));
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host') || ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Öğretmenler</h1>
        <p className="mt-1 text-sm text-slate-500">Yeni öğretmen eklemek için davet kodu üretip gönderin; öğretmen <b>Kayıt ol</b> sayfasında kodu, e-postasını ve şifresini girer.
          Her öğretmen yalnızca kendi öğrencilerini ve denemelerini görür; siz (yönetici) hepsini görürsünüz.</p>
      </div>
      <div className="card"><CreateInviteForm origin={origin} /></div>

      <section className="card space-y-3">
        <h2 className="font-bold">Öğretmen hesapları</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Ad</th><th>E-posta</th><th>Öğrenci</th><th>Deneme</th><th>Katılım</th></tr></thead>
            <tbody>
              {(teachers || []).map(t => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-semibold">{t.full_name || '—'}{t.is_admin && <span className="ml-1.5 rounded bg-indigo-100 px-1.5 text-[11px] text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">yönetici</span>}</td>
                  <td className="text-slate-500">{emails.get(t.id) || '—'}</td>
                  <td>{count(st, t.id)}</td><td>{count(exams, t.id)}</td><td className="text-slate-500">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Davetler</h2>
        {(invites || []).length === 0 ? <p className="text-sm text-slate-500">Henüz davet yok.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {(invites || []).map(i => {
              const state = i.used_at ? `Kullanıldı · ${names.get(i.used_by || '') || ''} · ${fmtDate(i.used_at)}` : isPast(i.expires_at) ? 'Süresi doldu' : `Bekliyor · son gün ${fmtDate(i.expires_at)}`;
              return (
                <li key={i.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-mono font-bold tracking-widest">{i.code}</span>
                  <span className="text-slate-500">{i.note || ''}</span>
                  <span className={'ml-auto text-xs ' + (i.used_at ? 'text-emerald-600' : 'text-slate-500')}>{state}</span>
                  {!i.used_at && <DeleteInviteButton code={i.code} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

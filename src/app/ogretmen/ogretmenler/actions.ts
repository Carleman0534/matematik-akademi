'use server';
import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { makeCode } from '@/lib/exams';

export interface InviteState { error?: string; ok?: string; code?: string }

// Tek kullanımlık öğretmen davet kodu (14 gün geçerli). Yalnızca yönetici; RLS de denetler.
export async function createInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const s = await getSession();
  if (!s?.isAdmin) return { error: 'Yalnızca yönetici davet kodu üretebilir.' };
  const note = String(form.get('not') || '').trim().slice(0, 120) || null;
  const sb = await supabaseServer();
  for (let i = 0; i < 5; i++) {
    const code = makeCode(10, randomInt);
    const { error } = await sb.from('teacher_invites').insert({ code, note, created_by: s.userId });
    if (!error) { revalidatePath('/ogretmen/ogretmenler'); return { ok: 'Davet kodu üretildi.', code }; }
    if (error.code !== '23505') return { error: error.message };
  }
  return { error: 'Kod üretilemedi, yeniden deneyin.' };
}

export async function deleteInvite(code: string): Promise<InviteState> {
  const s = await getSession();
  if (!s?.isAdmin) return { error: 'Yetkiniz yok.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('teacher_invites').delete().eq('code', code).is('used_at', null);
  if (error) return { error: error.message };
  revalidatePath('/ogretmen/ogretmenler');
  return { ok: 'Davet iptal edildi.' };
}

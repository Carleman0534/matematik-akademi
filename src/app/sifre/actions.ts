'use server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getDb, saveDb } from '@/lib/db/database';
import { hashPassword, checkNewPassword } from '@/lib/accounts';
import { loginBlockedMinutes, recordLoginFailure, recordLoginSuccess } from '@/lib/loginLimit';

export interface PwState { error?: string; ok?: string }

// Giriş yapmış herkes (öğretmen, öğrenci, veli) kendi şifresini değiştirebilir; mevcut şifre doğrulanır.
export async function changeOwnPassword(_prev: PwState, form: FormData): Promise<PwState> {
  const s = await getSession();
  if (!s) return { error: 'Oturum bulunamadı; yeniden giriş yapın.' };
  const current = String(form.get('mevcut') || '');
  const next = String(form.get('yeni') || '');
  const again = String(form.get('tekrar') || '');
  if (next !== again) return { error: 'Yeni şifreler birbiriyle aynı değil.' };
  const bad = checkNewPassword(next);
  if (bad) return { error: bad };
  if (next === current) return { error: 'Yeni şifre eskisinden farklı olmalı.' };

  const limitKey = 'pw:' + s.userId;
  const blocked = loginBlockedMinutes(limitKey, 'pw');
  if (blocked) return { error: `Çok fazla hatalı deneme. Yaklaşık ${blocked} dakika sonra tekrar deneyin.` };

  const db = await getDb();
  const r = db.exec('SELECT password FROM users WHERE id = ?', [s.userId]);
  if (!r.length || !r[0].values.length) return { error: 'Hesap bulunamadı.' };
  let ok = false;
  try { ok = bcrypt.compareSync(current, String(r[0].values[0][0])); } catch { ok = false; }
  if (!ok) { recordLoginFailure(limitKey, 'pw'); return { error: 'Mevcut şifre hatalı.' }; }

  recordLoginSuccess(limitKey);
  db.run("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hashPassword(next), s.userId]);
  saveDb(db);
  return { ok: 'Şifreniz değiştirildi.' };
}

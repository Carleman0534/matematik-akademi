'use server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { getDb, commitDb } from '@/lib/db/database';
import { normalizeUsername, validateUsername, usernameToEmail } from '@/lib/usernames';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/env';
import { hashPassword, checkNewPassword, likeEscape } from '@/lib/accounts';

export interface FormState { error?: string; ok?: string }

// Öğrenci hesapları yerel veritabanında (users + students) tutulur; internet sürümünde bu veritabanı Blob'dadır.

async function assertTeacher() {
  const s = await getSession();
  if (!s || s.role !== 'teacher') throw new Error('Bu işlem için öğretmen olarak giriş yapmalısınız.');
  return s;
}

const gradeOf = (v: FormDataEntryValue | null) => { const n = parseInt(String(v || ''), 10); return n >= 1 && n <= 13 ? n : null; };

// Öğretmen öğrenci hesabı açar: kullanıcı adı + şifre (öğrencinin e-postası gerekmez)
export async function createStudent(_prev: FormState, form: FormData): Promise<FormState> {
  let me;
  try { me = await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const fullName = String(form.get('ad') || '').trim();
  const username = normalizeUsername(String(form.get('kullanici') || ''));
  const password = String(form.get('sifre') || '');
  if (!fullName) return { error: 'Öğrencinin adını yazın.' };
  const uErr = validateUsername(username) || checkNewPassword(password);
  if (uErr) return { error: uErr };

  const db = await getDb();
  const email = usernameToEmail(username, STUDENT_EMAIL_DOMAIN);

  // Giriş kimliği tek bir hesaba eşlenmeli: aynı e-posta ya da aynı "kullanıcıadı@..." öneki var mı?
  const dup = db.exec(
    `SELECT 1 FROM users WHERE LOWER(email) = ? OR LOWER(email) LIKE ? ESCAPE '\\' OR LOWER(name) = ? LIMIT 1`,
    [email.toLowerCase(), likeEscape(username) + '@%', username]
  );
  if (dup.length && dup[0].values.length) return { error: `"${username}" kullanıcı adı alınmış; başka bir ad deneyin.` };

  // Okunaklı, benzersiz kimlik: student_ayse_yilmaz
  const base = 'student_' + username.replace(/[^a-z0-9]/g, '_');
  let id = base;
  for (let i = 2; ; i++) {
    const t = db.exec('SELECT 1 FROM users WHERE id = ? UNION ALL SELECT 1 FROM students WHERE id = ? LIMIT 1', [id, id]);
    if (!t.length || !t[0].values.length) break;
    id = `${base}_${i}`;
  }

  db.run(
    `INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'student', datetime('now'), datetime('now'))`,
    [id, email, hashPassword(password), fullName]
  );
  db.run(
    `INSERT INTO students (id, user_id, teacher_id, grade, school, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))`,
    [id, id, me.userId, String(gradeOf(form.get('sinif')) ?? 8), String(form.get('okul') || '').trim()]
  );
  await commitDb();
  revalidatePath('/ogretmen', 'layout');
  return { ok: `${fullName} eklendi. Giriş bilgileri — kullanıcı adı: ${username}` };
}

export async function updateStudent(_prev: FormState, form: FormData): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const id = String(form.get('id') || '');
  const fullName = String(form.get('ad') || '').trim();
  if (!fullName) return { error: 'Ad boş olamaz.' };

  const db = await getDb();
  const st = db.exec('SELECT user_id FROM students WHERE id = ?', [id]);
  if (!st.length || !st[0].values.length) return { error: 'Kaydedilemedi: öğrenci bulunamadı' };
  const userId = String(st[0].values[0][0]);

  db.run(
    'UPDATE students SET grade = ?, school = ?, notes = ? WHERE id = ?',
    [String(gradeOf(form.get('sinif')) ?? 8), String(form.get('okul') || '').trim(), String(form.get('notlar') || '').trim(), id]
  );
  db.run("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?", [fullName, userId]);
  await commitDb();
  revalidatePath('/ogretmen', 'layout');
  return { ok: 'Kaydedildi.' };
}

// Pasif öğrenci giriş yapamaz ve verilerine erişemez; veriler silinmez
export async function setStudentActive(id: string, active: boolean): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const db = await getDb();
  const st = db.exec('SELECT 1 FROM students WHERE id = ?', [id]);
  if (!st.length || !st[0].values.length) return { error: 'Öğrenci bulunamadı.' };
  db.run('UPDATE students SET status = ? WHERE id = ?', [active ? 'active' : 'passive', id]);
  await commitDb();
  revalidatePath('/ogretmen', 'layout');
  return { ok: active ? 'Öğrenci yeniden aktif.' : 'Öğrenci pasifleştirildi.' };
}

export async function resetStudentPassword(_prev: FormState, form: FormData): Promise<FormState> {
  try { await assertTeacher(); } catch (e) { return { error: (e as Error).message }; }
  const id = String(form.get('id') || '');
  const password = String(form.get('sifre') || '');
  const pErr = checkNewPassword(password);
  if (pErr) return { error: pErr };

  const db = await getDb();
  const st = db.exec('SELECT user_id FROM students WHERE id = ?', [id]);
  if (!st.length || !st[0].values.length) return { error: 'Bu öğrencinin giriş hesabı yok.' };
  db.run("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hashPassword(password), String(st[0].values[0][0])]);
  await commitDb();
  return { ok: 'Yeni şifre kaydedildi. Öğrenciye iletin.' };
}

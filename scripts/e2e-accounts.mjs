// Uçtan uca deneme için GEÇİCİ öğretmen + öğrenci hesabı açar ya da siler.
//   node scripts/e2e-accounts.mjs create <cikti.json>   → hesapları açar, giriş bilgilerini dosyaya yazar (ekrana yazmaz)
//   node scripts/e2e-accounts.mjs delete                → bu hesapları ve bütün verilerini siler
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const DOMAIN = env.STUDENT_EMAIL_DOMAIN || 'ogrenci.matematikakademi.app';
const T_EMAIL = 'e2e.ogretmen@ogretmen.matematikakademi.app', S_USER = 'e2e.ogrenci', S2_USER = 'e2e.ikinci';

async function findUser(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find(u => u.email === email) || null;
}

const [, , cmd, out] = process.argv;
if (cmd === 'create') {
  const tp = crypto.randomBytes(12).toString('base64url'), sp = crypto.randomBytes(12).toString('base64url');
  const t = await admin.auth.admin.createUser({ email: T_EMAIL, password: tp, email_confirm: true, user_metadata: { full_name: 'E2E Öğretmen' } });
  if (t.error) throw t.error;
  await admin.from('profiles').update({ role: 'teacher', full_name: 'E2E Öğretmen' }).eq('id', t.data.user.id);
  const s = await admin.auth.admin.createUser({ email: `${S_USER}@${DOMAIN}`, password: sp, email_confirm: true, user_metadata: { full_name: 'E2E Öğrenci', username: S_USER } });
  if (s.error) throw s.error;
  await admin.from('students').insert({ profile_id: s.data.user.id, full_name: 'E2E Öğrenci', teacher_id: t.data.user.id, grade_level: 11 });
  const s2p = crypto.randomBytes(12).toString('base64url');
  const s2 = await admin.auth.admin.createUser({ email: `${S2_USER}@${DOMAIN}`, password: s2p, email_confirm: true, user_metadata: { full_name: 'E2E İkinci', username: S2_USER } });
  if (s2.error) throw s2.error;
  await admin.from('students').insert({ profile_id: s2.data.user.id, full_name: 'E2E İkinci', teacher_id: t.data.user.id, grade_level: 8 });
  fs.writeFileSync(out, JSON.stringify({ teacher: { email: T_EMAIL, password: tp }, student: { username: S_USER, password: sp }, student2: { username: S2_USER, password: s2p } }));
  console.log('hesaplar açıldı');
} else if (cmd === 'delete') {
  const t = await findUser(T_EMAIL), s = await findUser(`${S_USER}@${DOMAIN}`), s2 = await findUser(`${S2_USER}@${DOMAIN}`);
  if (t) {
    const { data: ex } = await admin.from('exams').select('id').eq('teacher_id', t.id);
    for (const e of ex || []) {
      const { data: files } = await admin.storage.from('exam-pages').list(e.id);
      if (files?.length) await admin.storage.from('exam-pages').remove(files.map(f => `${e.id}/${f.name}`));
    }
    await admin.from('exams').delete().eq('teacher_id', t.id);
    // Soru havuzu görselleri (depo dosyaları hesap silinince kendiliğinden gitmez)
    const { data: pool } = await admin.storage.from('question-pool').list(t.id, { limit: 1000 });
    if (pool?.length) await admin.storage.from('question-pool').remove(pool.map(f => `${t.id}/${f.name}`));
    await admin.from('pool_questions').delete().eq('teacher_id', t.id);
    const { data: docs } = await admin.from('pdf_documents').select('path').eq('teacher_id', t.id);
    if (docs?.length) await admin.storage.from('pdf-library').remove(docs.map(d => d.path));
    await admin.from('pdf_documents').delete().eq('teacher_id', t.id);
  }
  for (const u of [s, s2]) {
    if (!u) continue;
    const { data: st } = await admin.from('students').select('id').eq('profile_id', u.id).maybeSingle();
    if (st) {
      const { data: files } = await admin.storage.from('question-images').list(st.id);
      if (files?.length) await admin.storage.from('question-images').remove(files.map(f => `${st.id}/${f.name}`));
      await admin.from('questions').delete().eq('student_id', st.id);
      await admin.from('students').delete().eq('id', st.id);
    }
    await admin.auth.admin.deleteUser(u.id);
  }
  if (t) { await admin.from('classes').delete().eq('teacher_id', t.id); await admin.auth.admin.deleteUser(t.id); }
  console.log('silindi:', !!t, !!s, !!s2);
}

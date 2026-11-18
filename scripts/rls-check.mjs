// Veri yalıtımı (RLS) testi: gerçek Supabase projesine karşı çalışır.
// İki GEÇİCİ öğrenci açar, birinin diğerinin verisine hiçbir yoldan erişemediğini dener, sonunda her şeyi siler.
// Anahtarları .env.local'den okur ve hiçbir yere yazdırmaz.  Çalıştırma: node scripts/rls-check.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = env.STUDENT_EMAIL_DOMAIN || 'ogrenci.matematikakademi.app';
if (!URL_ || !ANON || !SERVICE) { console.error('.env.local eksik'); process.exit(2); }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = 'rlstest' + crypto.randomBytes(3).toString('hex');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok || !detail ? '' : '  → ' + detail)); };
const made = { users: [], students: [], files: [], exams: [], docs: [] };

async function makeTeacher(suffix) {
  const email = `${tag}.${suffix}@ogretmen.matematikakademi.app`, password = crypto.randomBytes(18).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'RLS Öğretmen ' + suffix } });
  if (error) throw new Error('öğretmen açılamadı: ' + error.message);
  made.users.push(data.user.id);
  await admin.from('profiles').update({ role: 'teacher', username: `${tag}.${suffix}` }).eq('id', data.user.id);
  const c = anonClient();
  const { error: e3 } = await c.auth.signInWithPassword({ email, password });
  if (e3) throw new Error('öğretmen girişi yapılamadı: ' + e3.message);
  return { c, userId: data.user.id };
}

async function makeStudent(suffix, teacherId = null) {
  const username = `${tag}.${suffix}`, password = crypto.randomBytes(18).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password, email_confirm: true, user_metadata: { full_name: 'RLS Test ' + suffix, username } });
  if (error) throw new Error('kullanıcı açılamadı: ' + error.message);
  made.users.push(data.user.id);
  const { data: st, error: e2 } = await admin.from('students').insert({ profile_id: data.user.id, full_name: 'RLS Test ' + suffix, teacher_id: teacherId }).select('id').single();
  if (e2) throw new Error('öğrenci kaydı açılamadı: ' + e2.message);
  made.students.push(st.id);
  const c = anonClient();
  const { error: e3 } = await c.auth.signInWithPassword({ email: `${username}@${DOMAIN}`, password });
  if (e3) throw new Error('giriş yapılamadı: ' + e3.message);
  return { c, studentId: st.id, userId: data.user.id };
}

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

try {
  console.log('Geçici öğrenciler açılıyor…');
  const A = await makeStudent('a'), B = await makeStudent('b');
  const { data: prof } = await A.c.from('profiles').select('role').eq('id', A.userId).single();
  check('Yeni hesap öğrenci rolüyle açılıyor (tetikleyici)', prof?.role === 'student', JSON.stringify(prof));

  console.log('Öğrenci A kendi verisini oluşturuyor…');
  const path = `${A.studentId}/${tag}.png`;
  const up = await A.c.storage.from('question-images').upload(path, PNG, { contentType: 'image/png' });
  check('A kendi klasörüne fotoğraf yükleyebiliyor', !up.error, up.error?.message);
  if (!up.error) made.files.push(path);
  const { data: qid, error: qErr } = await A.c.rpc('create_question', { p: { student_id: A.studentId, initial_status: 'wrong', question_text: 'RLS deneme sorusu', teacher_note: 'öğrenci yazamamalı', images: [{ path, thumb_path: path, width: 1, height: 1 }] } });
  check('A create_question ile soru ekleyebiliyor (soru + görsel + ilk kayıt)', !qErr && !!qid, qErr?.message);
  const { data: own } = await A.c.from('questions').select('id, teacher_note, question_images(id), question_attempts(id, attempt_type)').eq('id', qid).maybeSingle();
  check('A kendi sorusunu görüyor', !!own);
  check('İlk yanlış kaydı ve görsel oluştu', own?.question_attempts?.length === 1 && own?.question_attempts[0].attempt_type === 'initial' && own?.question_images?.length === 1);
  check('Öğrenci öğretmen notu yazamıyor', own?.teacher_note == null, own?.teacher_note);
  const at = await A.c.from('question_attempts').insert({ question_id: qid, student_id: A.studentId, result: 'correct', attempt_type: 'review' }).select('id').single();
  check('A kendi sorusuna tekrar çözümü ekleyebiliyor', !at.error, at.error?.message);

  console.log('Öğrenci B, A\'nın verisine erişmeyi deniyor…');
  const bq = await B.c.from('questions').select('id').eq('id', qid);
  check('B, A\'nın sorusunu göremiyor', !bq.error && bq.data.length === 0, JSON.stringify(bq.data));
  const ball = await B.c.from('questions').select('id');
  check('B soru listesinde A\'nın sorusu yok', !ball.error && ball.data.every(x => x.id !== qid));
  const ba = await B.c.from('question_attempts').select('id').eq('question_id', qid);
  check('B, A\'nın çözüm geçmişini göremiyor', !ba.error && ba.data.length === 0);
  const bi = await B.c.from('question_images').select('id').eq('question_id', qid);
  check('B, A\'nın görsel kayıtlarını göremiyor', !bi.error && bi.data.length === 0);
  const bdl = await B.c.storage.from('question-images').download(path);
  check('B, A\'nın fotoğrafını indiremiyor', !!bdl.error);
  const bsign = await B.c.storage.from('question-images').createSignedUrl(path, 60);
  check('B, A\'nın fotoğrafı için imzalı adres alamıyor', !!bsign.error || !bsign.data?.signedUrl);
  const bup = await B.c.storage.from('question-images').upload(`${A.studentId}/${tag}-b.png`, PNG, { contentType: 'image/png' });
  check('B, A\'nın klasörüne dosya yükleyemiyor', !!bup.error);
  if (!bup.error) made.files.push(`${A.studentId}/${tag}-b.png`);
  const bins = await B.c.from('questions').insert({ student_id: A.studentId, initial_status: 'wrong' }).select('id');
  check('B, A adına soru ekleyemiyor', !!bins.error);
  const brpc = await B.c.rpc('create_question', { p: { student_id: A.studentId, initial_status: 'blank' } });
  check('B, create_question ile A adına soru ekleyemiyor', !!brpc.error);
  const batt = await B.c.from('question_attempts').insert({ question_id: qid, student_id: B.studentId, result: 'correct' }).select('id');
  check('B, A\'nın sorusuna çözüm kaydı ekleyemiyor', !!batt.error);
  const bupd = await B.c.from('questions').update({ question_text: 'değiştirildi' }).eq('id', qid).select('id');
  check('B, A\'nın sorusunu değiştiremiyor', !bupd.error && bupd.data.length === 0);
  const bst = await B.c.from('students').select('id');
  check('B öğrenci listesinde yalnızca kendini görüyor', !bst.error && bst.data.length === 1 && bst.data[0].id === B.studentId, JSON.stringify(bst.data));
  const bpr = await B.c.from('profiles').select('id');
  check('B profil listesinde yalnızca kendini görüyor', !bpr.error && bpr.data.length === 1);

  console.log('Yetki yükseltme ve geçmiş silme denemeleri…');
  const role = await A.c.from('profiles').update({ role: 'teacher' }).eq('id', A.userId).select('id');
  const { data: prof2 } = await admin.from('profiles').select('role').eq('id', A.userId).single();
  check('Öğrenci kendini öğretmen yapamıyor', prof2.role === 'student' && (!!role.error || role.data.length === 0));
  const del = await A.c.from('question_attempts').delete().eq('question_id', qid).select('id');
  const { count } = await admin.from('question_attempts').select('id', { count: 'exact', head: true }).eq('question_id', qid);
  check('Öğrenci çözüm geçmişini silemiyor', count === 2 && (!!del.error || del.data.length === 0), 'kalan: ' + count);
  const qdel = await A.c.from('questions').delete().eq('id', qid).select('id');
  check('Öğrenci soruyu silemiyor (yalnızca arşivleyebilir)', !!qdel.error || qdel.data.length === 0);
  const anonQ = await anonClient().from('questions').select('id');
  check('Giriş yapmamış biri hiçbir soru göremiyor', !anonQ.error && anonQ.data.length === 0);

  console.log('Birden çok öğretmen ve denemeler…');
  const T1 = await makeTeacher('t1'), T2 = await makeTeacher('t2');
  const S1 = await makeStudent('s1', T1.userId), S2 = await makeStudent('s2', T2.userId);
  const t2st = await T2.c.from('students').select('id').eq('id', S1.studentId);
  check('Öğretmen başka öğretmenin öğrencisini göremiyor', !t2st.error && t2st.data.length === 0);
  const t2upd = await T2.c.from('students').update({ teacher_id: T2.userId }).eq('id', S1.studentId).select('id');
  check('Öğretmen başka öğretmenin öğrencisini kendine alamıyor', !!t2upd.error || t2upd.data.length === 0);
  await T2.c.from('profiles').update({ is_admin: true }).eq('id', T2.userId);
  const { data: t2p } = await admin.from('profiles').select('is_admin').eq('id', T2.userId).single();
  check('Öğretmen kendini yönetici yapamıyor', t2p?.is_admin === false);

  const ex = await T1.c.from('exams').insert({ teacher_id: T1.userId, title: tag + ' deneme', mode: 'assignment', question_count: 3, duration_min: 30,
    status: 'published', closes_at: new Date(Date.now() + 3600e3).toISOString(), results_mode: 'after_close' }).select('id').single();
  check('Öğretmen deneme oluşturabiliyor', !ex.error, ex.error?.message);
  const eid = ex.data?.id;
  if (eid) made.exams.push(eid);
  const keyIns = await T1.c.from('exam_key').insert([{ exam_id: eid, question_no: 1, correct: 'A' }, { exam_id: eid, question_no: 2, correct: 'B' }, { exam_id: eid, question_no: 3, correct: 'C' }]);
  check('Öğretmen cevap anahtarı girebiliyor', !keyIns.error, keyIns.error?.message);
  const s2see = await S2.c.from('exams').select('id').eq('id', eid);
  check('Başka öğretmenin öğrencisi denemeyi göremiyor', !s2see.error && s2see.data.length === 0);
  const s1see = await S1.c.from('exams').select('id').eq('id', eid);
  check('Kendi öğrencisi yayımlanan denemeyi görüyor', !s1see.error && s1see.data.length === 1);
  const keyEarly = await S1.c.from('exam_key').select('correct').eq('exam_id', eid);
  check('Öğrenci deneme bitmeden cevap anahtarını göremiyor', !keyEarly.error && keyEarly.data.length === 0);
  const st = await S1.c.rpc('start_exam', { eid });
  check('Öğrenci denemeye başlayabiliyor', !st.error && !!st.data, st.error?.message);
  const sv = await S1.c.rpc('save_answer', { p_session: st.data, p_q: 1, p_answer: 'A' });
  check('Öğrenci cevap kaydedebiliyor', !sv.error, sv.error?.message);
  const direct = await S1.c.from('exam_answers').insert({ session_id: st.data, question_no: 2, answer: 'B' }).select('session_id');
  check('Öğrenci cevap tablosuna doğrudan yazamıyor', !!direct.error);
  const deadl = await S1.c.from('exam_sessions').update({ deadline: new Date(Date.now() + 864e5).toISOString() }).eq('id', st.data).select('id');
  check('Öğrenci süresini uzatamıyor', !!deadl.error || deadl.data.length === 0);
  const s2save = await S2.c.rpc('save_answer', { p_session: st.data, p_q: 2, p_answer: 'B' });
  check('Başka öğrenci bu oturuma cevap yazamıyor', !!s2save.error);
  const mtx2 = await T2.c.rpc('exam_answer_matrix', { eid });
  check('Başka öğretmen deneme sonuçlarını okuyamıyor', !!mtx2.error);
  const paper2 = await T2.c.rpc('record_paper_answers', { eid, sid: S1.studentId, p_answers: 'ABC' });
  check('Başka öğretmen kâğıt cevabı giremiyor', !!paper2.error);
  await S1.c.rpc('submit_exam', { p_session: st.data });
  const late = await S1.c.rpc('save_answer', { p_session: st.data, p_q: 3, p_answer: 'C' });
  check('Teslimden sonra cevap değiştirilemiyor', !!late.error);
  const mtx1 = await T1.c.rpc('exam_answer_matrix', { eid });
  check('Öğretmen kendi denemesinin cevaplarını görüyor', !mtx1.error && mtx1.data?.[0]?.answers === 'A--', JSON.stringify(mtx1.data?.[0]?.answers ?? mtx1.error?.message));
  await T1.c.from('exams').update({ status: 'closed' }).eq('id', eid);
  const keyLate = await S1.c.from('exam_key').select('correct').eq('exam_id', eid);
  check('Deneme bitince öğrenci cevap anahtarını görüyor', !keyLate.error && keyLate.data.length === 3);
  const tr = await T1.c.rpc('transfer_exam_wrongs', { eid });
  check('Yanlış/boşlar soru bankasına aktarılıyor (2 soru)', !tr.error && tr.data === 2, tr.error?.message || String(tr.data));
  const paper1 = await T1.c.rpc('record_paper_answers', { eid, sid: S1.studentId, p_answers: 'AB-' });
  check('Öğretmen kendi öğrencisi için kâğıt cevabı girebiliyor', !paper1.error, paper1.error?.message);

  const doc = await T1.c.from('pdf_documents').insert({ teacher_id: T1.userId, title: tag, path: `${T1.userId}/${tag}.pdf`, file_name: 'x.pdf' }).select('id').single();
  check('Öğretmen PDF arşivine kayıt ekleyebiliyor', !doc.error, doc.error?.message);
  if (doc.data) made.docs.push(doc.data.id);
  const doc2 = await T2.c.from('pdf_documents').select('id').eq('id', doc.data?.id);
  check('Başka öğretmen PDF arşivini göremiyor', !doc2.error && doc2.data.length === 0);
  const doc3 = await S1.c.from('pdf_documents').select('id');
  check('Öğrenci PDF arşivini göremiyor', !doc3.error && doc3.data.length === 0);
  const up2 = await T2.c.storage.from('pdf-library').upload(`${T1.userId}/${tag}.pdf`, Buffer.from('%PDF-1.4'), { contentType: 'application/pdf' });
  check('Öğretmen başkasının PDF klasörüne dosya yükleyemiyor', !!up2.error);

  console.log('Müfredat: kazanımlar ve yardımcı konular…');
  const { data: anyTopic } = await admin.from('topics').select('id').limit(1).single();
  const outIns = await A.c.from('curriculum_outcomes').insert({ topic_id: anyTopic.id, code: tag, text: 'öğrenci yazamamalı' }).select('id');
  check('Öğrenci kazanım ekleyemiyor', !!outIns.error);
  const outRead = await A.c.from('curriculum_outcomes').select('id').limit(1);
  check('Öğrenci kazanımları okuyabiliyor', !outRead.error);
  const relOwn = await A.c.from('question_topic_relations').insert({ question_id: qid, topic_id: anyTopic.id }).select('question_id');
  check('Öğrenci kendi sorusuna yardımcı konu ekleyebiliyor', !relOwn.error, relOwn.error?.message);
  const relB = await B.c.from('question_topic_relations').insert({ question_id: qid, topic_id: anyTopic.id, role: 'secondary' }).select('question_id');
  check('Başka öğrenci bu soruya konu ekleyemiyor', !!relB.error);
  const relBRead = await B.c.from('question_topic_relations').select('question_id').eq('question_id', qid);
  check('Başka öğrenci bu sorunun konularını göremiyor', !relBRead.error && relBRead.data.length === 0);
  const relT2 = await T2.c.from('question_topic_relations').select('question_id').eq('question_id', qid);
  check('Başka öğretmen bu sorunun konularını göremiyor', !relT2.error && relT2.data.length === 0);

  console.log('Soru havuzu ve analiz işleri…');
  const pdoc = await T1.c.from('pdf_documents').insert({ teacher_id: T1.userId, title: tag + ' havuz', path: `${T1.userId}/${tag}-h.pdf`, file_name: 'h.pdf' }).select('id').single();
  if (pdoc.data) made.docs.push(pdoc.data.id);
  const job1 = await T1.c.from('pdf_analysis_jobs').insert({ pdf_id: pdoc.data?.id, teacher_id: T1.userId, status: 'processing' }).select('id').single();
  check('Öğretmen kendi PDF\'i için analiz işi başlatabiliyor', !job1.error, job1.error?.message);
  const job2 = await T1.c.from('pdf_analysis_jobs').insert({ pdf_id: pdoc.data?.id, teacher_id: T1.userId, status: 'processing' }).select('id');
  check('Aynı PDF için ikinci eşzamanlı analiz işi açılamıyor', !!job2.error);
  const jobT2 = await T2.c.from('pdf_analysis_jobs').insert({ pdf_id: pdoc.data?.id, teacher_id: T2.userId, status: 'processing' }).select('id');
  check('Başka öğretmen bu PDF için analiz işi açamıyor', !!jobT2.error);
  const pimg = `${T1.userId}/${tag}.jpg`;
  const pup = await T1.c.storage.from('question-pool').upload(pimg, PNG, { contentType: 'image/png' });
  check('Öğretmen havuz klasörüne görsel yükleyebiliyor', !pup.error, pup.error?.message);
  const pq = await T1.c.from('pool_questions').insert({ teacher_id: T1.userId, pdf_id: pdoc.data?.id, image_path: pimg, question_no: 1, page_no: 1 }).select('id').single();
  check('Öğretmen havuza soru ekleyebiliyor', !pq.error, pq.error?.message);
  const pqT2 = await T2.c.from('pool_questions').select('id').eq('id', pq.data?.id);
  check('Başka öğretmen havuz sorusunu göremiyor', !pqT2.error && pqT2.data.length === 0);
  const pqS = await S1.c.from('pool_questions').select('id');
  check('Öğrenci soru havuzunu göremiyor', !pqS.error && pqS.data.length === 0);
  const pqDup = await T1.c.from('pool_questions').insert({ teacher_id: T1.userId, pdf_id: pdoc.data?.id, image_path: pimg, question_no: 1, page_no: 1 }).select('id');
  check('Aynı PDF\'te aynı soru ikinci kez eklenemiyor', !!pqDup.error);
  const pimgT2 = await T2.c.storage.from('question-pool').download(pimg);
  check('Başka öğretmen havuz görselini indiremiyor', !!pimgT2.error);
  const pqtT2 = await T2.c.from('pool_question_topics').insert({ question_id: pq.data?.id, topic_id: anyTopic.id }).select('question_id');
  check('Başka öğretmen havuz sorusuna konu ekleyemiyor', !!pqtT2.error);
  await admin.storage.from('question-pool').remove([pimg]);
  if (pq.data) await admin.from('pool_questions').delete().eq('id', pq.data.id);

  console.log('Kişisel çalışma planları…');
  const simg = `${T1.userId}/${tag}-plan.png`;
  await T1.c.storage.from('question-pool').upload(simg, PNG, { contentType: 'image/png' });
  const mkPlan = async (studentId, status, mode, n) => {
    const p = await T1.c.from('study_plans').insert({ teacher_id: T1.userId, student_id: studentId, title: tag + ' plan', status, solution_mode: mode }).select('id').single();
    if (p.error) return { error: p.error };
    const qs = await T1.c.from('study_plan_questions').insert(Array.from({ length: n }, (_, i) => ({ plan_id: p.data.id, position: i + 1, image_path: simg, correct: 'B', topic_id: anyTopic.id, difficulty: 3 }))).select('id, position');
    return { id: p.data.id, qs: (qs.data || []).sort((a, b) => a.position - b.position), error: qs.error };
  };
  const pl = await mkPlan(S1.studentId, 'assigned', 'after_answer', 2);
  check('Öğretmen kendi öğrencisine çalışma planı atayabiliyor', !pl.error && pl.qs.length === 2, pl.error?.message);
  const plT2 = await T2.c.from('study_plans').insert({ teacher_id: T2.userId, student_id: S1.studentId, title: tag, status: 'assigned' }).select('id');
  check('Başka öğretmen bu öğrenciye plan atayamıyor', !!plT2.error);
  const plSee2 = await T2.c.from('study_plans').select('id').eq('id', pl.id);
  check('Başka öğretmen planı göremiyor', !plSee2.error && plSee2.data.length === 0);
  const plS1 = await S1.c.from('study_plans').select('id').eq('id', pl.id);
  check('Öğrenci kendisine atanan planı görüyor', !plS1.error && plS1.data.length === 1);
  const plS2 = await S2.c.from('study_plans').select('id').eq('id', pl.id);
  check('Başka öğrenci planı göremiyor', !plS2.error && plS2.data.length === 0);
  const raw = await S1.c.from('study_plan_questions').select('correct').eq('plan_id', pl.id);
  check('Öğrenci soru tablosunu (doğru cevap) doğrudan okuyamıyor', !raw.error && raw.data.length === 0);
  const items = await S1.c.rpc('study_plan_items', { pid: pl.id });
  check('Öğrenci soruları fonksiyonla alıyor ve doğru cevap görünmüyor', !items.error && items.data.length === 2 && items.data.every(x => x.cor === null), items.error?.message);
  const itemsS2 = await S2.c.rpc('study_plan_items', { pid: pl.id });
  check('Başka öğrenci bu planın sorularını alamıyor', !!itemsS2.error);
  const imgS1 = await S1.c.storage.from('question-pool').download(simg);
  check('Öğrenci atanan çalışmanın görselini indirebiliyor', !imgS1.error, imgS1.error?.message);
  const imgS2 = await S2.c.storage.from('question-pool').download(simg);
  check('Başka öğrenci bu görseli indiremiyor', !!imgS2.error);
  const s2ans = await S2.c.rpc('answer_study_question', { qid: pl.qs[0].id, ans: 'B', secs: 5 });
  check('Başka öğrenci bu plana cevap yazamıyor', !!s2ans.error);
  const wrong = await S1.c.rpc('answer_study_question', { qid: pl.qs[0].id, ans: 'A', secs: 12 });
  check('Yanlış cevap kaydediliyor, doğru şık (ayara göre) açılıyor', !wrong.error && wrong.data?.[0]?.res === 'incorrect' && wrong.data?.[0]?.cor === 'B', wrong.error?.message);
  const again = await S1.c.rpc('answer_study_question', { qid: pl.qs[0].id, ans: 'B', secs: 3 });
  check('Cevaplanan soru değiştirilemiyor', !!again.error);
  const bankQ = await S1.c.from('questions').select('id, initial_status, correct_answer, student_answer, question_images(path)').like('question_text', 'Çalışma:%');
  check('Yanlış soru öğrencinin soru bankasına eklendi', !bankQ.error && bankQ.data.length === 1 && bankQ.data[0].initial_status === 'wrong' && bankQ.data[0].question_images[0]?.path === 'question-pool:' + simg, JSON.stringify(bankQ.data ?? bankQ.error));
  const planMid = await S1.c.from('study_plans').select('status').eq('id', pl.id).single();
  check('Plan, soruların hepsi cevaplanmadan kapanmıyor', planMid.data?.status === 'assigned');
  const bad = await S1.c.rpc('answer_study_question', { qid: pl.qs[1].id, ans: 'E', secs: 1 });
  check('4 şıklı soruda E şıkkı geçersiz', !!bad.error);
  const ok2 = await S1.c.rpc('answer_study_question', { qid: pl.qs[1].id, ans: 'B', secs: 8 });
  check('Doğru cevap kaydediliyor', !ok2.error && ok2.data?.[0]?.res === 'correct', ok2.error?.message);
  const planEnd = await S1.c.from('study_plans').select('status, completed_at').eq('id', pl.id).single();
  check('Hepsi cevaplanınca plan tamamlandı', planEnd.data?.status === 'completed' && !!planEnd.data?.completed_at);
  const ev = await S1.c.rpc('my_study_evidence');
  check('Öğrenci kendi çalışma kanıtını alabiliyor (2 cevap)', !ev.error && ev.data.length === 2, ev.error?.message);
  const evS2 = await S2.c.rpc('my_study_evidence');
  check('Başka öğrencinin kanıtı karışmıyor', !evS2.error && evS2.data.length === 0);
  const draft = await mkPlan(S1.studentId, 'draft', 'after_answer', 1);
  const draftItems = await S1.c.rpc('study_plan_items', { pid: draft.id });
  const draftAns = await S1.c.rpc('answer_study_question', { qid: draft.qs[0].id, ans: 'B', secs: 1 });
  check('Taslak plan öğrenciye kapalı (soru alma ve cevaplama)', !!draftItems.error && !!draftAns.error);
  const never = await mkPlan(S1.studentId, 'assigned', 'never', 1);
  const nAns = await S1.c.rpc('answer_study_question', { qid: never.qs[0].id, ans: 'B', secs: 1 });
  check('"Çözümü gösterme" ayarında doğru şık hiç açılmıyor', !nAns.error && nAns.data?.[0]?.res === 'correct' && nAns.data?.[0]?.cor === null);
  const aft = await mkPlan(S1.studentId, 'assigned', 'after_complete', 2);
  const aAns = await S1.c.rpc('answer_study_question', { qid: aft.qs[0].id, ans: 'A', secs: 1 });
  const aItems = await S1.c.rpc('study_plan_items', { pid: aft.id });
  check('"Bitince göster" ayarında plan bitmeden doğru şık gizli', !aAns.error && aAns.data?.[0]?.cor === null && aItems.data.every(x => x.cor === null));
  const aAns2 = await S1.c.rpc('answer_study_question', { qid: aft.qs[1].id, ans: 'B', secs: 1 });
  check('"Bitince göster" ayarında plan bitince doğru şık açılıyor', aAns2.data?.[0]?.cor === 'B');
  const imgIns = await A.c.from('question_images').insert({ question_id: qid, path: 'question-pool:' + simg }).select('id');
  check('Öğrenci kendi sorusuna havuz görseli yolu bağlayamıyor', !!imgIns.error);
  const pubT2 = await T2.c.from('study_plan_questions').select('id').eq('plan_id', pl.id);
  check('Başka öğretmen plan sorularını göremiyor', !pubT2.error && pubT2.data.length === 0);
  await admin.storage.from('question-pool').remove([simg]);

  console.log('Pasifleştirme…');
  await admin.from('students').update({ is_active: false }).eq('id', A.studentId);
  const pas = await A.c.from('questions').select('id');
  check('Pasif öğrenci kendi sorularına da erişemiyor', !pas.error && pas.data.length === 0);
} catch (e) {
  check('Test çalıştırılamadı: ' + e.message, false);
} finally {
  console.log('Geçici veriler siliniyor…');
  if (made.files.length) await admin.storage.from('question-images').remove(made.files);
  if (made.exams.length) await admin.from('exams').delete().in('id', made.exams);
  if (made.docs.length) await admin.from('pdf_documents').delete().in('id', made.docs);
  if (made.students.length) await admin.from('questions').delete().in('student_id', made.students);
  if (made.students.length) await admin.from('students').delete().in('id', made.students);
  for (const u of made.users) await admin.auth.admin.deleteUser(u);
  const left = await admin.from('profiles').select('id').like('username', tag + '%');
  check('Geçici hesaplar ve veriler silindi', !left.error && left.data.length === 0);
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} kontrol geçti`);
  process.exit(failed ? 1 : 0);
}

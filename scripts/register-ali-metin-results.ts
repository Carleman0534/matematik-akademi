import { getDb, saveDb } from '../src/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Connecting to database...');
  const db = await getDb();
  db.run('PRAGMA foreign_keys=OFF;');

  // 1. Check or Insert Teacher
  const teacherId = '170c1e8f-52b4-440e-b605-ec974fa1d56b'; // Ahmet Öğretmen
  const studentUserId = 'user_ali_metin';
  const studentId = 'student_ali_metin';

  // 2. Insert User for Ali Metin if not exists
  db.run(`
    INSERT OR REPLACE INTO users (id, email, password, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'student', datetime('now'), datetime('now'))
  `, [studentUserId, 'ali.metin@test.com', '$2b$10$wT0lVqI0c6pU.X8mZkE/Oe67B/hYf0f9Q9zG4o8A5Y6I9rK9b7vNu', 'Ali Metin (Ali Tarlasüren)']);

  // 3. Insert Student Profile
  db.run(`
    INSERT OR REPLACE INTO students (id, user_id, teacher_id, grade, school, parent_name, parent_phone, status, notes, created_at)
    VALUES (?, ?, ?, 8, ?, ?, ?, 'active', ?, datetime('now'))
  `, [
    studentId,
    studentUserId,
    teacherId,
    'Özel Pozitif Kişisel Gelişim Kursu (Kocaeli / Darıca)',
    'Metin Bey',
    '0555 123 4567',
    '8. Sınıf LGS Hedef Öğrencisi. Sözel ve fen netleri yüksek, matematikte yeni nesil soru ve süre yönetimi desteği gerekmektedir.'
  ]);

  console.log('Ali Metin student record created/verified.');

  // 4. Create Exam 1: 8. Sınıf Enerji Serisi Deneme 1 (8E127)
  const exam1Id = 'exam_lgs_enerji_1';
  db.run(`
    INSERT OR REPLACE INTO exams (id, title, teacher_id, question_count, duration_minutes, penalty_divisor, status, created_at, updated_at)
    VALUES (?, ?, ?, 90, 155, 3, 'published', '2026-11-10 10:00:00', datetime('now'))
  `, [exam1Id, '8. Sınıf Enerji Serisi Deneme 1 (8E127)', teacherId]);

  // 5. Create Exam 2: Sinan Kuzucu 8. Sınıf LGS - 2
  const exam2Id = 'exam_lgs_sinan_kuzucu_2';
  db.run(`
    INSERT OR REPLACE INTO exams (id, title, teacher_id, question_count, duration_minutes, penalty_divisor, status, created_at, updated_at)
    VALUES (?, ?, ?, 90, 155, 3, 'published', '2026-11-18 10:00:00', datetime('now'))
  `, [exam2Id, 'Sinan Kuzucu 8. Sınıf LGS - 2', teacherId]);

  console.log('Exam templates created/verified.');

  // 6. Create post_exam_evaluations record 1: Enerji Serisi 1
  const eval1Id = 'eval_ali_enerji_1';
  const eval1Summary = {
    correct: 74,
    wrong: 8,
    empty: 8,
    net: 71.33,
    score: 425.580,
    timeSpentMinutes: 135,
    totalDuration: 155,
    rankInClass: '25 / 68',
    rankInInstitution: '45 / 115',
    rankInDistrict: '45 / 115',
    rankInCity: '55 / 185',
    rankInGeneral: '895 / 5734'
  };

  const eval1Topics = [
    { topic: 'Türkçe', total: 20, correct: 19, wrong: 1, empty: 0, net: 18.67, accuracy: 93 },
    { topic: 'Matematik', total: 20, correct: 11, wrong: 3, empty: 6, net: 10.00, accuracy: 50 },
    { topic: 'Fen Bilimleri', total: 20, correct: 16, wrong: 2, empty: 2, net: 15.33, accuracy: 77 },
    { topic: 'T.C. İnkılap Tarihi', total: 10, correct: 10, wrong: 0, empty: 0, net: 10.00, accuracy: 100 },
    { topic: 'Din Kültürü ve A.B.', total: 10, correct: 9, wrong: 1, empty: 0, net: 8.67, accuracy: 87 },
    { topic: 'İngilizce', total: 10, correct: 9, wrong: 1, empty: 0, net: 8.67, accuracy: 87 }
  ];

  const eval1Subtopics = [
    { subtopic: 'Tarih & Atatürkçülük (Tam Başarı)', mastery: 'Mükemmel (%100)' },
    { subtopic: 'Türkçe Paragraf ve Sözcükte Anlam', mastery: 'Üst Düzey (%93)' },
    { subtopic: 'Fen: Mevsimler, İklim ve DNA', mastery: 'İyi Düzey (%77)' },
    { subtopic: 'Matematik: Çarpanlar ve Katlar', mastery: 'Orta Düzey (%60)' },
    { subtopic: 'Matematik: Üslü ve Köklü İfadeler', mastery: 'Geliştirilmeli (%45)' },
    { subtopic: 'Matematik: Süreye Bağlı Yeni Nesil Boşlar', mastery: 'Destek Gerekli (6 Boş)' }
  ];

  const eval1Difficulty = {
    easy: { total: 30, correct: 29, accuracy: 97 },
    medium: { total: 35, correct: 30, accuracy: 86 },
    hard: { total: 25, correct: 15, accuracy: 60 },
    newGeneration: { total: 30, correct: 18, accuracy: 60 }
  };

  const eval1TimeManagement = {
    averageSecondsPerQuestion: 90,
    slowestQuestions: [14, 18, 20],
    rushedMistakes: [11, 15],
    timePressureZone: 'Sayısal Bölüm son 15 dakika (Matematikte 6 soru yetiştirilemedi)'
  };

  const eval1MistakeReasons = [
    { reason: 'Süre Yetişmediği İçin Boş Bırakma', count: 6 },
    { reason: 'Yeni Nesil Grafik / Problem Kurgusunu Kaçırma', count: 3 },
    { reason: 'İşlem ve Dikkatsizlik Hatası', count: 3 },
    { reason: 'Bilgi Eksikliği', count: 2 }
  ];

  const eval1PrevComparison = {
    previousNet: 64.50,
    currentNet: 71.33,
    netDelta: 6.83
  };

  const eval1Strengths = 'Sözel derslerde (Türkçe 18.67 net, Tarih 10.00 net, Din 8.67 net, İngilizce 8.67 net) toplam 47.34 / 50.00 net ile %94.7 gibi mükemmel bir başarı oranı yakalamıştır. Tarihi fullemiştir. Fen bilimlerinde 15.33 net ile kurum ortalamasının oldukça üzerindedir.';
  const eval1Priorities = 'Matematik dersinde 6 boş ve 3 yanlış ile 10.00 nette kalmıştır. Sayısal bölüme ayrılan sürenin fen bilimlerinde fazla harcanması nedeniyle matematikte son sorulara yeterli zaman kalamamıştır. Öncelik: Matematik yeni nesil soru hızlandırma ve süre stratejisi.';
  const eval1Recs = '1) Sayısal bölümde önce fen ve temel matematik sorularını 50 dakikada bitirip kalan 30 dakikayı zor yeni nesil sorulara ayırma taktiği uygulanmalı. 2) Çarpanlar-Katlar ve Üslü İfadelerden her gün 15 yeni nesil problem çözülmeli. 3) Boş bırakılan 6 matematik sorusu etüt saatinde öğretmenle adım adım çözülmeli.';
  const eval1AiText = 'Ali Metin bu sınavda 425.580 puan alarak 5734 öğrenci arasında 895. sıraya yerleşmiş ve üst %15 dilime girmiştir. Öğrencinin sözel anlama ve fen kavrama temeli çok sağlamdır. Matematik neti 10.00\'dan 15.00 bandına yükseltildiği takdirde puanı doğrudan 455-465 aralığına ve %2-3\'lük dilime taşınacaktır.';

  db.run(`
    INSERT OR REPLACE INTO post_exam_evaluations (
      id, exam_id, student_id, teacher_id,
      summary_json, topics_json, subtopics_json, difficulty_json,
      time_management_json, mistake_reasons_json, previous_comparison_json,
      strengths_text, priorities_text, study_recommendations,
      ai_evaluation_text, teacher_approved, approved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), '2026-11-10 13:30:00', datetime('now'))
  `, [
    eval1Id,
    exam1Id,
    studentId,
    teacherId,
    JSON.stringify(eval1Summary),
    JSON.stringify(eval1Topics),
    JSON.stringify(eval1Subtopics),
    JSON.stringify(eval1Difficulty),
    JSON.stringify(eval1TimeManagement),
    JSON.stringify(eval1MistakeReasons),
    JSON.stringify(eval1PrevComparison),
    eval1Strengths,
    eval1Priorities,
    eval1Recs,
    eval1AiText
  ]);

  // 7. Create post_exam_evaluations record 2: Sinan Kuzucu LGS - 2
  const eval2Id = 'eval_ali_sinan_kuzucu_2';
  const eval2Summary = {
    correct: 50,
    wrong: 28,
    empty: 12,
    net: 40.67,
    score: 299.817,
    timeSpentMinutes: 135,
    totalDuration: 155,
    rankInClass: '38 / 54',
    rankInInstitution: '69 / 95',
    rankInDistrict: '69 / 95',
    rankInCity: '69 / 95',
    rankInGeneral: '723 / 1331'
  };

  const eval2Topics = [
    { topic: 'Türkçe', total: 20, correct: 8, wrong: 10, empty: 2, net: 4.67, accuracy: 23 },
    { topic: 'Matematik', total: 20, correct: 4, wrong: 7, empty: 9, net: 1.67, accuracy: 8 },
    { topic: 'Fen Bilimleri', total: 20, correct: 11, wrong: 8, empty: 1, net: 8.33, accuracy: 42 },
    { topic: 'T.C. İnkılap Tarihi', total: 10, correct: 10, wrong: 0, empty: 0, net: 10.00, accuracy: 100 },
    { topic: 'Din Kültürü ve A.B.', total: 10, correct: 8, wrong: 2, empty: 0, net: 7.33, accuracy: 73 },
    { topic: 'İngilizce', total: 10, correct: 9, wrong: 1, empty: 0, net: 8.67, accuracy: 87 }
  ];

  const eval2Subtopics = [
    { subtopic: 'Tarih & Atatürkçülük (Tam Başarı)', mastery: 'Mükemmel (%100)' },
    { subtopic: 'İngilizce Kelime & Okuma', mastery: 'Çok İyi (%87)' },
    { subtopic: 'Din Kültürü Kavramlar', mastery: 'İyi Düzey (%73)' },
    { subtopic: 'Fen Bilimleri: Kalıtım ve Kavramlar', mastery: 'Destek Gerekir (%42)' },
    { subtopic: 'Türkçe: Çeldiricili Paragraf ve Yorumlama', mastery: 'Kritik Dikkat Eksikliği (%23)' },
    { subtopic: 'Matematik: Çarpanlar, Üslü Sayılar ve Yeni Nesil', mastery: 'Acil Müdahale Gerekir (%8)' }
  ];

  const eval2Difficulty = {
    easy: { total: 25, correct: 18, accuracy: 72 },
    medium: { total: 40, correct: 22, accuracy: 55 },
    hard: { total: 25, correct: 10, accuracy: 40 },
    newGeneration: { total: 35, correct: 12, accuracy: 34 }
  };

  const eval2TimeManagement = {
    averageSecondsPerQuestion: 105,
    slowestQuestions: [4, 8, 12, 17],
    rushedMistakes: [2, 6, 9, 14, 18],
    timePressureZone: 'Sözelde uzun paragraflarda panik, sayısalda 9 boş'
  };

  const eval2MistakeReasons = [
    { reason: 'Zaman Yetmediği İçin Boş Bırakma', count: 12 },
    { reason: 'Güçlü Çeldiriciye Takılma / Yanlış Yorumlama', count: 11 },
    { reason: 'Acele Edip Hatalı İşaretleme / Dikkatsizlik', count: 9 },
    { reason: 'Zor Soru Karşısında Stres / Odak Kaybı', count: 8 }
  ];

  const eval2PrevComparison = {
    previousNet: 71.33,
    currentNet: 40.67,
    netDelta: -30.66
  };

  const eval2Strengths = 'Tarih (10 net) ve İngilizce (8.67 net) branşlarında tam hakimiyetini zorluk seviyesi yüksek bu sınavda da korumuştur. Temel kavram hafızası güçlüdür.';
  const eval2Priorities = 'Sinan Kuzucu denemesinin aşırı çeldiricili ve uzun metinli yapısı öğrencide panik ve odak kaybına yol açmıştır. Türkçe 10 yanlış, Matematik 7 yanlış 9 boş ile acil kriz yönetimi gerektirmektedir.';
  const eval2Recs = '1) Bu sonucun moral bozucu bir kaza olduğu öğrenciye ve veliye anlatılmalı; asla cezalandırıcı dil kullanılmamalıdır. 2) Matematikteki 7 yanlış ve 9 boş için soru analizi fasikülü çıkarılmalı. 3) Süre baskısı altında turlama tekniği öğretilmeli; yapılamayan soruyla inatlaşılmamalıdır. 4) Haftalık 2 adet odaklanma denemesi yapılmalı.';
  const eval2AiText = 'Bu sınav Ali Metin\'in stres ve yüksek zorluk karşısındaki dip performansını (299.817) göstermiştir. Enerji 1 denemesindeki 425.580 puan öğrencinin gerçek bilişsel kapasitesinin kanıtıdır. Aradaki 30.66 netlik fark bir bilgi kaybı değil; sınav stratejisi ve süre yönetimi çöküşüdür. Turlama tekniği ve çeldirici eleme çalışmasıyla bir sonraki sınavda 65+ nete toparlanma öngörülmektedir.';

  db.run(`
    INSERT OR REPLACE INTO post_exam_evaluations (
      id, exam_id, student_id, teacher_id,
      summary_json, topics_json, subtopics_json, difficulty_json,
      time_management_json, mistake_reasons_json, previous_comparison_json,
      strengths_text, priorities_text, study_recommendations,
      ai_evaluation_text, teacher_approved, approved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), '2026-11-18 14:00:00', datetime('now'))
  `, [
    eval2Id,
    exam2Id,
    studentId,
    teacherId,
    JSON.stringify(eval2Summary),
    JSON.stringify(eval2Topics),
    JSON.stringify(eval2Subtopics),
    JSON.stringify(eval2Difficulty),
    JSON.stringify(eval2TimeManagement),
    JSON.stringify(eval2MistakeReasons),
    JSON.stringify(eval2PrevComparison),
    eval2Strengths,
    eval2Priorities,
    eval2Recs,
    eval2AiText
  ]);

  console.log('Post-exam evaluations created for both exams.');

  // 8. Update learning_profiles for Ali Metin
  db.run(`
    INSERT OR REPLACE INTO learning_profiles (
      student_id, overall_math_score, calculated_level, total_questions_solved,
      total_correct, total_wrong, total_blank, last_activity_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    studentId,
    58.5, // ortalama matematik yetkinlik puanı
    'orta',
    180,
    124,
    36,
    20
  ]);

  // 9. Update student_topic_performance for Ali Metin
  const topicsPerformance = [
    { topicId: 'top_carpanlar_katlar', score: 55.0, status: 'improving', solved: 40, correct: 25, wrong: 9, blank: 6 },
    { topicId: 'sub_ebob_ekok_problemleri', score: 42.0, status: 'critical_weak', solved: 25, correct: 11, wrong: 7, blank: 7 },
    { topicId: 'top_uslu_ifadeler', score: 50.0, status: 'improving', solved: 35, correct: 18, wrong: 10, blank: 7 },
    { topicId: 'top_koklu_ifadeler', score: 45.0, status: 'critical_weak', solved: 30, correct: 14, wrong: 9, blank: 7 },
    { topicId: 'top_veri_analizi', score: 85.0, status: 'good', solved: 25, correct: 22, wrong: 2, blank: 1 },
    { topicId: 'top_olasilik', score: 70.0, status: 'good', solved: 25, correct: 18, wrong: 4, blank: 3 }
  ];

  for (const tp of topicsPerformance) {
    db.run(`
      INSERT OR REPLACE INTO student_topic_performance (
        id, student_id, topic_id, mastery_score, status, confidence_level,
        solved_count, correct_count, wrong_count, blank_count, avg_duration_seconds
      ) VALUES (?, ?, ?, ?, ?, 0.75, ?, ?, ?, ?, 88)
    `, [
      `tp_${studentId}_${tp.topicId}`,
      studentId,
      tp.topicId,
      tp.score,
      tp.status,
      tp.solved,
      tp.correct,
      tp.wrong,
      tp.blank
    ]);
  }

  // 10. Also update exam_sessions so they show up in /ogretmen/deneme-analizleri
  db.run(`
    INSERT OR REPLACE INTO exam_sessions (
      id, exam_id, student_id, started_at, deadline, submitted_at, last_seen_at
    ) VALUES 
    (?, ?, ?, '2026-11-10 10:00:00', '2026-11-10 12:35:00', '2026-11-10 12:15:00', '2026-11-10 12:15:00'),
    (?, ?, ?, '2026-11-18 10:00:00', '2026-11-18 12:35:00', '2026-11-18 12:25:00', '2026-11-18 12:25:00')
  `, [
    'session_ali_enerji_1', exam1Id, studentId,
    'session_ali_sinan_kuzucu_2', exam2Id, studentId
  ]);

  saveDb(db);
  console.log('Database saved successfully!');

  // Sync to data/app.db if serverless
  const diskDbPath = path.join(process.cwd(), 'data', 'app.db');
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(diskDbPath, buffer);
    console.log(`Synced ${buffer.length} bytes to ${diskDbPath}`);
  } catch (e) {
    console.warn('Could not sync to disk:', e);
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

const { getDb, saveDb } = require('../src/lib/db/database.ts');

async function main() {
  const db = await getDb();

  // Ensure tables exist
  db.run(`
    CREATE TABLE IF NOT EXISTS question_quality_audits (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      math_accuracy INTEGER DEFAULT 1,
      single_correct_answer INTEGER DEFAULT 1,
      option_consistency INTEGER DEFAULT 1,
      root_clarity INTEGER DEFAULT 1,
      grammar_correctness INTEGER DEFAULT 1,
      curriculum_alignment INTEGER DEFAULT 1,
      difficulty_consistency INTEGER DEFAULT 1,
      svg_accuracy INTEGER DEFAULT 1,
      similarity_ratio REAL DEFAULT 0.05,
      solution_accuracy INTEGER DEFAULT 1,
      audit_verdict TEXT DEFAULT 'approved',
      audit_notes TEXT,
      audited_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parent_progress_reports (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'weekly',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      empty_count INTEGER DEFAULT 0,
      completed_homeworks INTEGER DEFAULT 0,
      total_homeworks INTEGER DEFAULT 0,
      attended_exams INTEGER DEFAULT 0,
      net_change REAL DEFAULT 0.0,
      topics_summary TEXT,
      next_week_goals TEXT,
      teacher_message TEXT,
      is_approved_by_teacher INTEGER DEFAULT 1,
      status TEXT DEFAULT 'published',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_exam_evaluations (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      teacher_id TEXT,
      summary_json TEXT,
      topics_json TEXT,
      subtopics_json TEXT,
      difficulty_json TEXT,
      time_management_json TEXT,
      mistake_reasons_json TEXT,
      previous_comparison_json TEXT,
      strengths_text TEXT,
      priorities_text TEXT,
      study_recommendations TEXT,
      ai_evaluation_text TEXT,
      teacher_approved INTEGER DEFAULT 0,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    db.run(`ALTER TABLE question_quality_audits ADD COLUMN solution_accuracy INTEGER DEFAULT 1;`);
  } catch (e) {
    // Column might already exist
  }

  // 1. Seed Sample Parent Reports (Weekly and Monthly)
  db.run(`
    INSERT OR REPLACE INTO parent_progress_reports (
      id, student_id, teacher_id, period_type, start_date, end_date,
      total_questions, correct_count, wrong_count, empty_count,
      completed_homeworks, total_homeworks, attended_exams, net_change,
      topics_summary, next_week_goals, teacher_message, is_approved_by_teacher, status, created_at
    ) VALUES (
      'prep-weekly-elif-01',
      '50fa22f6-1021-4dde-8278-2339fa65030d',
      '170c1e8f-52b4-440e-b605-ec974fa1d56b',
      'weekly',
      '2026-11-10',
      '2026-11-17',
      145, 118, 19, 8,
      3, 3, 2, 1.75,
      '[{"topic":"Çarpanlar ve Katlar","solved":65,"accuracy":82},{"topic":"Üslü İfadeler","solved":50,"accuracy":86},{"topic":"Kareköklü İfadeler","solved":30,"accuracy":73}]',
      'Haftaya Kareköklü İfadeler yaklaşık değer ve gerçek sayılar soru çözümüne ağırlık verilecek; günlük 25 soru hedefi korunacak.',
      'Elif bu hafta harika bir disiplin gösterdi. Özellikle EBOB-EKOK problemlerinde model kurma aşamasını çok iyi kavradı. Evdeki düzenli soru çözüm desteğiniz için teşekkür ederiz.',
      1,
      'published',
      '2026-11-17 18:00:00'
    ),
    (
      'prep-monthly-elif-01',
      '50fa22f6-1021-4dde-8278-2339fa65030d',
      '170c1e8f-52b4-440e-b605-ec974fa1d56b',
      'monthly',
      '2026-10-18',
      '2026-11-18',
      580, 482, 68, 30,
      12, 12, 5, 3.50,
      '[{"topic":"Çarpanlar ve Katlar","solved":210,"accuracy":85},{"topic":"Üslü İfadeler","solved":190,"accuracy":88},{"topic":"Kareköklü İfadeler","solved":180,"accuracy":76}]',
      'Aralık ayı boyunca Veri Analizi ve Basit Olayların Olma Olasılığı konuları tamamlanacak, ay sonunda genel LGS denemesi uygulanacak.',
      'Elif bir aylık periyotta matematik netlerini 13.50 seviyesinden 17.00 seviyesine yükselterek büyük bir gelişim kaydetti. Azmi ve ders katılımı takdire şayandır.',
      1,
      'published',
      '2026-11-18 10:00:00'
    ),
    (
      'prep-weekly-burak-01',
      'e1b4b127-18c7-43a9-8a21-9860b0ec8884',
      '170c1e8f-52b4-440e-b605-ec974fa1d56b',
      'weekly',
      '2026-11-10',
      '2026-11-17',
      110, 82, 21, 7,
      2, 2, 1, 1.25,
      '[{"topic":"Çarpanlar ve Katlar","solved":60,"accuracy":75},{"topic":"Üslü İfadeler","solved":50,"accuracy":74}]',
      'Haftaya üslü sayılarda çözümleme ve bilimsel gösterim pekiştirilecek.',
      'Burak bu hafta çalışma temposunu belirgin şekilde artırdı. Soruları sakin ve dikkatli okuduğunda işlem hatalarının azaldığını gözlemledik. Gayreti çok sevindirici.',
      1,
      'published',
      '2026-11-17 19:30:00'
    );
  `);

  // 2. Seed Sample Post-Exam 10-Section Evaluation
  db.run(`
    INSERT OR REPLACE INTO post_exam_evaluations (
      id, exam_id, student_id, teacher_id,
      summary_json, topics_json, subtopics_json, difficulty_json,
      time_management_json, mistake_reasons_json, previous_comparison_json,
      strengths_text, priorities_text, study_recommendations,
      ai_evaluation_text, teacher_approved, approved_at, created_at
    ) VALUES (
      'eval-post-exam-01',
      'exam-genel-lgs-01',
      '50fa22f6-1021-4dde-8278-2339fa65030d',
      '170c1e8f-52b4-440e-b605-ec974fa1d56b',
      '{"correct":16,"wrong":3,"empty":1,"net":15.0,"score":75.0,"timeSpentMinutes":38,"totalDuration":45}',
      '[{"topic":"Çarpanlar ve Katlar","total":6,"correct":5,"wrong":1,"empty":0,"net":4.67,"accuracy":83},{"topic":"Üslü İfadeler","total":7,"correct":6,"wrong":1,"empty":0,"net":5.67,"accuracy":86},{"topic":"Kareköklü İfadeler","total":7,"correct":5,"wrong":1,"empty":1,"net":4.67,"accuracy":71}]',
      '[{"subtopic":"EBOB-EKOK Problemleri","mastery":"Güçlü"},{"subtopic":"Üslü Sayılarda Çözümleme","mastery":"Mükemmel"},{"subtopic":"Kareköklü Sayılarda Tahmin","mastery":"Geliştirilmeli"}]',
      '{"easy":{"total":5,"correct":5,"wrong":0,"empty":0,"accuracy":100},"medium":{"total":9,"correct":8,"wrong":1,"empty":0,"accuracy":89},"hard":{"total":6,"correct":3,"wrong":2,"empty":1,"accuracy":50},"newGeneration":{"total":8,"correct":6,"wrong":2,"empty":0,"accuracy":75}}',
      '{"averageSecondsPerQuestion":114,"slowestQuestions":[7,14,19],"rushedMistakes":[19],"timePressureZone":"Son 5 dakika"}',
      '[{"reason":"İşlem hatası","count":1,"questions":[7]},{"reason":"Soruyu yanlış okuma","count":1,"questions":[14]},{"reason":"Matematiksel model kuramama","count":1,"questions":[19]}]',
      '{"previousNet":13.25,"currentNet":15.00,"netDelta":1.75,"topicProgress":{"Çarpanlar ve Katlar":"+1.00 Net","Üslü İfadeler":"+0.75 Net"}}',
      'Üslü ifadeler ve temel EBOB-EKOK kazanımlarında çok başarılı; kolay ve orta düzey soruların tamamına yakınını hatasız çözüyor.',
      'Kareköklü ifadelerde problem kurma ve yeni nesil uzun metinli sorularda soru kökünün altını çizerek okuma alışkanlığı.',
      'Önümüzdeki 5 gün boyunca Kareköklü İfadelerden her gün 15 yeni nesil soru çözülmesi ve 14. sorudaki soru kökü analizinin tekrar edilmesi önerilir.',
      'Elif sınav süresini 38 dakikada dengeli tamamladı. 15.00 net ile önceki sınavına kıyasla +1.75 netlik belirgin bir artış gösterdi. Zorlandığı 3 sorunun 1 tanesi basit işlem hatasından kaynaklandı. Genel motivasyonu ve odaklanması yüksek.',
      1,
      '2026-11-18 11:30:00',
      '2026-11-18 11:00:00'
    );
  `);

  // 3. Seed Sample Question Quality Audits (11 Criteria)
  db.run(`
    INSERT OR REPLACE INTO question_quality_audits (
      id, question_id, math_accuracy, single_correct_answer, option_consistency,
      root_clarity, grammar_correctness, curriculum_alignment, difficulty_consistency,
      svg_accuracy, similarity_ratio, solution_accuracy, audit_verdict, audit_notes, audited_at
    ) VALUES 
    (
      'qa-seed-01',
      'q-carpan-01',
      1, 1, 1, 1, 1, 1, 1, 1, 0.04, 1,
      'approved',
      'Soru LGS 2026/2027 kazanımlarına birebir uygundur. Çeldirici şıklar öğrencilerin yapabileceği yaygın EBOB hatalarına göre pedagojik olarak yapılandırılmıştır.',
      '2026-11-18 14:00:00'
    ),
    (
      'qa-seed-02',
      'q-uslu-01',
      1, 1, 1, 1, 1, 1, 1, 1, 0.02, 1,
      'approved',
      'Üs alma ve basamak hesabı hatasız, soru kökündeki koyu vurgu anlaşılır ve çözüm açıklaması adım adım verilmiştir.',
      '2026-11-18 14:10:00'
    ),
    (
      'qa-seed-03',
      'q-karekök-01',
      1, 1, 1, 1, 1, 1, 1, 1, 0.06, 1,
      'approved',
      'Sayı doğrusu SVG görseli ölçekli ve piksel hassasiyetinde üretilmiş; yaklaşık değer tahmin sorusu titizlikle kurgulanmıştır.',
      '2026-11-18 14:20:00'
    ),
    (
      'qa-seed-04',
      'q-sample-review-01',
      1, 1, 0, 1, 1, 1, 1, 1, 0.12, 1,
      'needs_review',
      'C ve D şıkları sayısal olarak birbirine çok yakın (18 ve 19); çeldiricilerin ayırt ediciliği artırılmalı.',
      '2026-11-18 15:00:00'
    );
  `);

  // 4. Seed Audit Logs (Section 19)
  db.run(`
    INSERT OR REPLACE INTO system_audit_logs (
      id, user_id, action, resource_type, resource_id, details, ip_address, created_at
    ) VALUES
    ('audit-01', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'APPROVE_REPORT', 'parent_progress_reports', 'prep-weekly-elif-01', '{"status":"published","student":"Elif Yılmaz"}', '127.0.0.1', '2026-11-17 18:05:00'),
    ('audit-02', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'APPROVE_EXAM_EVAL', 'post_exam_evaluations', 'eval-post-exam-01', '{"exam":"exam-genel-lgs-01","student":"Elif Yılmaz"}', '127.0.0.1', '2026-11-18 11:30:00'),
    ('audit-03', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'DATA_EXPORT', 'reports_export', 'csv_exam_results', '{"format":"CSV","records":42}', '127.0.0.1', '2026-11-18 12:00:00'),
    ('audit-04', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'QUALITY_AUDIT', 'question_quality_audits', 'qa-seed-01', '{"verdict":"approved"}', '127.0.0.1', '2026-11-18 14:05:00');
  `);

  saveDb(db);
  console.log('✅ Aşama 4 ve 5 veritabanı tohumlaması başarıyla tamamlandı.');
}

main().catch(console.error);

const fs = require('fs');
const initSqlJs = require('sql.js');

async function seedLgs() {
  const wasmBinary = fs.readFileSync('public/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  
  if (!fs.existsSync('data/app.db')) {
    console.error('data/app.db bulunamadı.');
    return;
  }

  const fileBuffer = fs.readFileSync('data/app.db');
  const db = new SQL.Database(fileBuffer);

  // 1. Create tables if not exists
  const tables = [
    `CREATE TABLE IF NOT EXISTS curriculum_topics (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      grade_level INTEGER DEFAULT 8,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS curriculum_outcomes (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      cognitive_level TEXT DEFAULT 'kavrama',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS pdf_analysis_jobs (
      id TEXT PRIMARY KEY,
      pdf_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','awaiting_approval','completed','error')),
      page_count INTEGER DEFAULT 1,
      detected_question_count INTEGER DEFAULT 0,
      summary_json TEXT DEFAULT '{}',
      confidence_score REAL DEFAULT 0.85,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS pdf_extracted_questions (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES pdf_analysis_jobs(id) ON DELETE CASCADE,
      pdf_id TEXT REFERENCES pdf_documents(id) ON DELETE CASCADE,
      question_no INTEGER NOT NULL,
      page_no INTEGER NOT NULL DEFAULT 1,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}',
      correct_answer TEXT,
      primary_topic_id TEXT REFERENCES curriculum_topics(id),
      secondary_topic_id TEXT REFERENCES curriculum_topics(id),
      outcome_id TEXT REFERENCES curriculum_outcomes(id),
      question_type TEXT DEFAULT 'yeni_nesil',
      difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
      crop_box_json TEXT DEFAULT '{"x":0,"y":0,"w":100,"h":100}',
      image_url TEXT,
      confidence REAL DEFAULT 0.90,
      approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','edited')),
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS question_topic_relations (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      relation_type TEXT DEFAULT 'primary' CHECK (relation_type IN ('primary','secondary','prerequisite')),
      weight REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS question_skill_tags (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS question_generation_jobs (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      primary_topic_id TEXT REFERENCES curriculum_topics(id),
      subtopic_id TEXT REFERENCES curriculum_topics(id),
      requested_count INTEGER DEFAULT 5,
      difficulty INTEGER DEFAULT 3,
      question_type TEXT DEFAULT 'yeni_nesil',
      visual_required INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','awaiting_approval','completed','error')),
      prompt_snapshot TEXT,
      model_name TEXT DEFAULT 'gemini-2.5-flash',
      cost_tokens INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS ai_generated_questions (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES question_generation_jobs(id) ON DELETE CASCADE,
      teacher_id TEXT NOT NULL,
      primary_topic_id TEXT REFERENCES curriculum_topics(id),
      secondary_topic_id TEXT REFERENCES curriculum_topics(id),
      outcome_id TEXT REFERENCES curriculum_outcomes(id),
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}',
      correct_answer TEXT NOT NULL,
      solution_explanation TEXT NOT NULL,
      difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
      question_type TEXT DEFAULT 'yeni_nesil',
      skill_category TEXT,
      svg_content TEXT,
      math_validation_status TEXT DEFAULT 'verified' CHECK (math_validation_status IN ('unverified','verified','warning','failed')),
      validation_details_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','generated','validation_pending','awaiting_teacher','approved','assigned','archived','rejected')),
      source_reference_type TEXT DEFAULT 'original_ai',
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS question_validation_results (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      is_mathematically_sound INTEGER DEFAULT 1,
      single_correct_answer INTEGER DEFAULT 1,
      options_valid INTEGER DEFAULT 1,
      similarity_score REAL DEFAULT 0.0,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS learning_profiles (
      student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      overall_math_score REAL DEFAULT 50.0,
      calculated_level TEXT DEFAULT 'orta',
      total_questions_solved INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_wrong INTEGER DEFAULT 0,
      total_blank INTEGER DEFAULT 0,
      last_activity_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS student_topic_performance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      mastery_score REAL DEFAULT 0.0,
      status TEXT DEFAULT 'needs_data' CHECK (status IN ('needs_data','critical_weak','improving','good','mastered')),
      confidence_level REAL DEFAULT 0.0,
      solved_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      blank_count INTEGER DEFAULT 0,
      avg_duration_seconds REAL DEFAULT 0,
      last_tested_at TEXT,
      trend TEXT DEFAULT 'stable',
      UNIQUE (student_id, topic_id)
    );`,
    `CREATE TABLE IF NOT EXISTS learning_recommendations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES curriculum_topics(id),
      reason TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      recommended_counts_json TEXT DEFAULT '{"easy":5,"medium":10,"hard":5}',
      is_approved_by_teacher INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','dismissed')),
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS personalized_study_plans (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      topic_ids_json TEXT DEFAULT '[]',
      total_questions INTEGER DEFAULT 10,
      estimated_duration_min INTEGER DEFAULT 30,
      difficulty_mix TEXT DEFAULT 'Orta Ağırlıklı',
      is_adaptive INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      due_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS study_plan_questions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES personalized_study_plans(id) ON DELETE CASCADE,
      question_source TEXT DEFAULT 'ai_generated' CHECK (question_source IN ('extracted_pdf','ai_generated','bank')),
      source_question_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}',
      correct_answer TEXT NOT NULL,
      solution_explanation TEXT,
      svg_content TEXT,
      topic_id TEXT REFERENCES curriculum_topics(id),
      difficulty INTEGER DEFAULT 3,
      question_type TEXT DEFAULT 'yeni_nesil',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS student_study_sessions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES personalized_study_plans(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','paused')),
      current_question_index INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      blank_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS student_learning_events (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      session_id TEXT,
      plan_id TEXT,
      question_id TEXT,
      topic_id TEXT,
      student_answer TEXT,
      is_correct INTEGER,
      duration_seconds INTEGER,
      cognitive_trigger TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS question_similarity_checks (
      id TEXT PRIMARY KEY,
      question_a_id TEXT NOT NULL,
      question_b_id TEXT NOT NULL,
      similarity_ratio REAL NOT NULL,
      is_duplicate INTEGER DEFAULT 0,
      checked_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS ai_generation_logs (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      provider TEXT DEFAULT 'google-gemini',
      model TEXT DEFAULT 'gemini-2.5-flash',
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0.0,
      purpose TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`
  ];

  for (const sql of tables) {
    db.run(sql);
  }

  // 2. Check and seed curriculum topics
  const countTopics = db.exec("SELECT count(*) as c FROM curriculum_topics");
  if (!countTopics.length || countTopics[0].values[0][0] === 0) {
    console.log('🌱 LGS Müfredat konuları ekleniyor...');

    const initialTopics = [
      { id: 'top_carpanlar_katlar', code: 'LGS_01', name: 'Çarpanlar ve Katlar', parent: null, order: 1 },
      { id: 'sub_pozitif_carpanlar', code: 'LGS_01_01', name: 'Pozitif tam sayıların çarpanları', parent: 'top_carpanlar_katlar', order: 1 },
      { id: 'sub_ebob', code: 'LGS_01_02', name: 'EBOB (En Büyük Ortak Bölen)', parent: 'top_carpanlar_katlar', order: 2 },
      { id: 'sub_ekok', code: 'LGS_01_03', name: 'EKOK (En Küçük Ortak Kat)', parent: 'top_carpanlar_katlar', order: 3 },
      { id: 'sub_aralarinda_asal', code: 'LGS_01_04', name: 'Aralarında asal sayılar', parent: 'top_carpanlar_katlar', order: 4 },
      { id: 'sub_ebob_ekok_problemleri', code: 'LGS_01_05', name: 'EBOB–EKOK problemleri', parent: 'top_carpanlar_katlar', order: 5 },

      { id: 'top_uslu_ifadeler', code: 'LGS_02', name: 'Üslü İfadeler', parent: null, order: 2 },
      { id: 'sub_tam_sayi_kuvvetleri', code: 'LGS_02_01', name: 'Tam sayıların tam sayı kuvvetleri', parent: 'top_uslu_ifadeler', order: 1 },
      { id: 'sub_uslu_ozellikler', code: 'LGS_02_02', name: 'Üslü ifadelerin özellikleri', parent: 'top_uslu_ifadeler', order: 2 },
      { id: 'sub_bilimsel_gosterim', code: 'LGS_02_03', name: 'Bilimsel gösterim', parent: 'top_uslu_ifadeler', order: 3 },
      { id: 'sub_uslu_islemler', code: 'LGS_02_04', name: 'Üslü ifadelerle işlemler', parent: 'top_uslu_ifadeler', order: 4 },
      { id: 'sub_uslu_problemler', code: 'LGS_02_05', name: 'Üslü ifadelerle problemler', parent: 'top_uslu_ifadeler', order: 5 },

      { id: 'top_karekoklu_ifadeler', code: 'LGS_03', name: 'Kareköklü İfadeler', parent: null, order: 3 },
      { id: 'sub_tam_kare_sayilar', code: 'LGS_03_01', name: 'Tam kare doğal sayılar', parent: 'top_karekoklu_ifadeler', order: 1 },
      { id: 'sub_karekok_ozellikler', code: 'LGS_03_02', name: 'Kareköklü ifadelerin özellikleri', parent: 'top_karekoklu_ifadeler', order: 2 },
      { id: 'sub_karekok_islemler', code: 'LGS_03_03', name: 'Kareköklü ifadelerle işlemler', parent: 'top_karekoklu_ifadeler', order: 3 },
      { id: 'sub_ondalik_karekok', code: 'LGS_03_04', name: 'Ondalık ifadelerin karekökü', parent: 'top_karekoklu_ifadeler', order: 4 },
      { id: 'sub_gercek_sayilar', code: 'LGS_03_05', name: 'Gerçek sayılar', parent: 'top_karekoklu_ifadeler', order: 5 },

      { id: 'top_veri_analizi', code: 'LGS_04', name: 'Veri Analizi', parent: null, order: 4 },
      { id: 'sub_cizgi_sutun_grafikleri', code: 'LGS_04_01', name: 'Çizgi ve sütun grafikleri', parent: 'top_veri_analizi', order: 1 },
      { id: 'sub_daire_grafikleri', code: 'LGS_04_02', name: 'Daire grafikleri', parent: 'top_veri_analizi', order: 2 },
      { id: 'sub_grafik_yorumlama', code: 'LGS_04_03', name: 'Grafik yorumlama', parent: 'top_veri_analizi', order: 3 },
      { id: 'sub_grafikler_arasi_donusum', code: 'LGS_04_04', name: 'Grafikler arası dönüşüm', parent: 'top_veri_analizi', order: 4 },

      { id: 'top_olasilik', code: 'LGS_05', name: 'Basit Olayların Olma Olasılığı', parent: null, order: 5 },
      { id: 'sub_olasi_durumlar', code: 'LGS_05_01', name: 'Olası durumlar', parent: 'top_olasilik', order: 1 },
      { id: 'sub_es_olasilikli_olaylar', code: 'LGS_05_02', name: 'Eş olasılıklı olaylar', parent: 'top_olasilik', order: 2 },
      { id: 'sub_olasilik_hesaplari', code: 'LGS_05_03', name: 'Olasılık hesaplamaları', parent: 'top_olasilik', order: 3 },

      { id: 'top_cebirsel_ifadeler', code: 'LGS_06', name: 'Cebirsel İfadeler ve Özdeşlikler', parent: null, order: 6 },
      { id: 'sub_cebirsel_ifadeler_temel', code: 'LGS_06_01', name: 'Cebirsel ifadeler', parent: 'top_cebirsel_ifadeler', order: 1 },
      { id: 'sub_ozdeslikler', code: 'LGS_06_02', name: 'Özdeşlikler', parent: 'top_cebirsel_ifadeler', order: 2 },
      { id: 'sub_carpanlara_ayirma', code: 'LGS_06_03', name: 'Çarpanlara ayırma', parent: 'top_cebirsel_ifadeler', order: 3 },
      { id: 'sub_cebirsel_islemler', code: 'LGS_06_04', name: 'Cebirsel ifadelerle işlemler', parent: 'top_cebirsel_ifadeler', order: 4 },

      { id: 'top_dogrusal_denklemler', code: 'LGS_07', name: 'Doğrusal Denklemler', parent: null, order: 7 },
      { id: 'sub_koordinat_sistemi', code: 'LGS_07_01', name: 'Koordinat sistemi', parent: 'top_dogrusal_denklemler', order: 1 },
      { id: 'sub_dogrusal_iliski', code: 'LGS_07_02', name: 'Doğrusal ilişki', parent: 'top_dogrusal_denklemler', order: 2 },
      { id: 'sub_dogrunun_egimi', code: 'LGS_07_03', name: 'Doğrunun eğimi', parent: 'top_dogrusal_denklemler', order: 3 },
      { id: 'sub_dogrusal_denklem_problemleri', code: 'LGS_07_04', name: 'Doğrusal denklem problemleri', parent: 'top_dogrusal_denklemler', order: 4 },

      { id: 'top_esitsizlikler', code: 'LGS_08', name: 'Eşitsizlikler', parent: null, order: 8 },
      { id: 'sub_birinci_derece_esitsizlik', code: 'LGS_08_01', name: 'Birinci dereceden bir bilinmeyenli eşitsizlikler', parent: 'top_esitsizlikler', order: 1 },
      { id: 'sub_sayi_dogrusunda_gosterim', code: 'LGS_08_02', name: 'Eşitsizliklerin sayı doğrusunda gösterimi', parent: 'top_esitsizlikler', order: 2 },
      { id: 'sub_esitsizlik_problemleri', code: 'LGS_08_03', name: 'Eşitsizlik problemleri', parent: 'top_esitsizlikler', order: 3 },

      { id: 'top_ucgenler', code: 'LGS_09', name: 'Üçgenler', parent: null, order: 9 },
      { id: 'sub_kenar_aci_iliskileri', code: 'LGS_09_01', name: 'Üçgende kenar ve açı ilişkileri', parent: 'top_ucgenler', order: 1 },
      { id: 'sub_ucgen_esitsizligi', code: 'LGS_09_02', name: 'Üçgen eşitsizliği', parent: 'top_ucgenler', order: 2 },
      { id: 'sub_pisagor_bagintisi', code: 'LGS_09_03', name: 'Pisagor bağıntısı', parent: 'top_ucgenler', order: 3 },
      { id: 'sub_ucgen_problemleri', code: 'LGS_09_04', name: 'Üçgen problemleri', parent: 'top_ucgenler', order: 4 },

      { id: 'top_eslik_benzerlik', code: 'LGS_10', name: 'Eşlik ve Benzerlik', parent: null, order: 10 },
      { id: 'sub_es_sekiller', code: 'LGS_10_01', name: 'Eş şekiller', parent: 'top_eslik_benzerlik', order: 1 },
      { id: 'sub_benzer_sekiller', code: 'LGS_10_02', name: 'Benzer şekiller', parent: 'top_eslik_benzerlik', order: 2 },
      { id: 'sub_benzerlik_orani', code: 'LGS_10_03', name: 'Benzerlik oranı', parent: 'top_eslik_benzerlik', order: 3 },
      { id: 'sub_benzerlik_problemleri', code: 'LGS_10_04', name: 'Benzerlik problemleri', parent: 'top_eslik_benzerlik', order: 4 },

      { id: 'top_donusum_geometrisi', code: 'LGS_11', name: 'Dönüşüm Geometrisi', parent: null, order: 11 },
      { id: 'sub_oteleme', code: 'LGS_11_01', name: 'Öteleme', parent: 'top_donusum_geometrisi', order: 1 },
      { id: 'sub_yansima', code: 'LGS_11_02', name: 'Yansıma', parent: 'top_donusum_geometrisi', order: 2 },
      { id: 'sub_geometrik_donusumler', code: 'LGS_11_03', name: 'Geometrik dönüşümler', parent: 'top_donusum_geometrisi', order: 3 },

      { id: 'top_geometrik_cisimler', code: 'LGS_12', name: 'Geometrik Cisimler', parent: null, order: 12 },
      { id: 'sub_prizmalar', code: 'LGS_12_01', name: 'Prizmalar', parent: 'top_geometrik_cisimler', order: 1 },
      { id: 'sub_dik_dairesel_silindir', code: 'LGS_12_02', name: 'Dik dairesel silindir', parent: 'top_geometrik_cisimler', order: 2 },
      { id: 'sub_silindirin_yuzey_alani_hacmi', code: 'LGS_12_03', name: 'Silindirin yüzey alanı ve hacmi', parent: 'top_geometrik_cisimler', order: 3 }
    ];

    const stmt = db.prepare("INSERT INTO curriculum_topics (id, code, name, parent_id, grade_level, sort_order, is_active) VALUES (?, ?, ?, ?, 8, ?, 1)");
    for (const t of initialTopics) {
      stmt.run([t.id, t.code, t.name, t.parent, t.order]);
    }
    stmt.free();

    // Outcomes
    const outcomes = [
      ['out_m8111', 'sub_pozitif_carpanlar', 'M.8.1.1.1', 'Verilen pozitif tam sayıların pozitif tam sayı çarpanlarını bulur, üslü biçimde yazar.'],
      ['out_m8112_ebob', 'sub_ebob', 'M.8.1.1.2', 'İki doğal sayının en büyük ortak bölenini (EBOB) hesaplar ve ilgili problemleri çözer.'],
      ['out_m8112_ekok', 'sub_ekok', 'M.8.1.1.2', 'İki doğal sayının en küçük ortak katını (EKOK) hesaplar ve periyodik durum problemlerinde kullanır.'],
      ['out_m8113', 'sub_aralarinda_asal', 'M.8.1.1.3', 'Verilen iki doğal sayının aralarında asal olup olmadığını belirler.'],
      ['out_m8112_prob', 'sub_ebob_ekok_problemleri', 'M.8.1.1.2', 'EBOB ve EKOK gerektiren yeni nesil hayat problemlerini modeller ve çözer.'],
      ['out_m8121', 'sub_tam_sayi_kuvvetleri', 'M.8.1.2.1', 'Tam sayıların tam sayı kuvvetlerini hesaplar; negatif üs kavramını açıklar.'],
      ['out_m8135', 'sub_karekok_islemler', 'M.8.1.3.5', 'Kareköklü ifadelerde toplama, çıkarma, çarpma ve bölme işlemlerini yapar.'],
      ['out_m8315', 'sub_pisagor_bagintisi', 'M.8.3.1.5', 'Pisagor bağıntısını oluşturur ve dik üçgende kenar problemlerini çözer.']
    ];

    const outStmt = db.prepare("INSERT INTO curriculum_outcomes (id, topic_id, code, description) VALUES (?, ?, ?, ?)");
    for (const o of outcomes) {
      outStmt.run(o);
    }
    outStmt.free();
  }

  // 3. Seed sample extracted questions for PDF-1 and PDF-2
  const countExtracted = db.exec("SELECT count(*) as c FROM pdf_extracted_questions");
  if (!countExtracted.length || countExtracted[0].values[0][0] === 0) {
    console.log('🌱 PDF analiz soruları (pdf_extracted_questions) ekleniyor...');
    const samples = [
      {
        id: 'ext_sample_1',
        pdf_id: 'pdf-1',
        qno: 1,
        page: 1,
        text: 'Ahmet Bey bahçesine dikdörtgen şeklinde bir çit çekecektir. Kenar uzunlukları 48 metre ve 72 metre olan bu bahçenin etrafına köşelere de dikilmek şartıyla eşit aralıklarla fidan dikilecektir.\n\nBuna göre en az kaç fidan gereklidir?',
        options: JSON.stringify({ A: '10', B: '12', C: '14', D: '20' }),
        correct: 'A',
        topic: 'sub_ebob_ekok_problemleri',
        diff: 3,
        type: 'problem_cozme',
        conf: 0.94
      },
      {
        id: 'ext_sample_2',
        pdf_id: 'pdf-1',
        qno: 2,
        page: 1,
        text: 'Bir kütüphanedeki kitapların 2^5 tanesi matematik, 2^7 tanesi ise fen bilimleri kitabıdır.\n\nBuna göre fen bilimleri kitaplarının sayısı, matematik kitaplarının sayısının kaç katıdır?',
        options: JSON.stringify({ A: '2', B: '4', C: '8', D: '16' }),
        correct: 'B',
        topic: 'sub_uslu_islemler',
        diff: 2,
        type: 'temel_islem',
        conf: 0.98
      },
      {
        id: 'ext_sample_3',
        pdf_id: 'pdf-1',
        qno: 3,
        page: 2,
        text: 'Bir dik üçgenin dik kenar uzunlukları 9 cm ve 12 cm dir. Bu üçgenin hipotenüs uzunluğuna eşit kenarı olan bir eşkenar üçgen çizilmek isteniyor.\n\nEşkenar üçgenin çevresi kaç santimetredir?',
        options: JSON.stringify({ A: '36', B: '45', C: '54', D: '60' }),
        correct: 'B',
        topic: 'sub_pisagor_bagintisi',
        diff: 3,
        type: 'yeni_nesil',
        conf: 0.91
      },
      {
        id: 'ext_sample_4',
        pdf_id: 'pdf-2',
        qno: 1,
        page: 1,
        text: 'Alanı 150 cm² olan kare şeklindeki bir kartonun bir kenar uzunluğu hangi iki ardışık doğal sayı arasındadır?',
        options: JSON.stringify({ A: '10 ile 11', B: '11 ile 12', C: '12 ile 13', D: '13 ile 14' }),
        correct: 'C',
        topic: 'sub_karekok_ozellikler',
        diff: 3,
        type: 'kavramsal',
        conf: 0.96
      },
      {
        id: 'ext_sample_5',
        pdf_id: 'pdf-2',
        qno: 2,
        page: 2,
        text: 'Aralarında asal iki pozitif tam sayının EKOK\'u 156 dır. Bu sayılardan biri 12 olduğuna göre diğer sayı kaçtır?',
        options: JSON.stringify({ A: '11', B: '13', C: '15', D: '17' }),
        correct: 'B',
        topic: 'sub_aralarinda_asal',
        diff: 2,
        type: 'problem_cozme',
        conf: 0.95
      }
    ];

    const extStmt = db.prepare(`
      INSERT INTO pdf_extracted_questions 
      (id, pdf_id, question_no, page_no, question_text, options_json, correct_answer, primary_topic_id, question_type, difficulty, confidence, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
    `);
    for (const s of samples) {
      extStmt.run([s.id, s.pdf_id, s.qno, s.page, s.text, s.options, s.correct, s.topic, s.type, s.diff, s.conf]);
    }
    extStmt.free();
  }

  // 4. Seed sample AI generated questions
  const countAi = db.exec("SELECT count(*) as c FROM ai_generated_questions");
  if (!countAi.length || countAi[0].values[0][0] === 0) {
    console.log('🌱 Yapay zekâ soruları (ai_generated_questions) ekleniyor...');
    const aiSamples = [
      {
        id: 'ai_sample_1',
        teacher_id: '170c1e8f-52b4-440e-b605-ec974fa1d56b',
        topic: 'sub_ebob_ekok_problemleri',
        text: 'Bir fabrikada üretilen zeytinyağları 180 litre ve 240 litrelik iki büyük depoda toplanmaktadır. Bu yağlar birbirine karıştırılmadan ve hiç artmayacak şekilde eşit hacimli en büyük bidonlara doldurulacaktır.\n\nBuna göre toplam kaç bidona ihtiyaç vardır?',
        options: JSON.stringify({ A: '5', B: '7', C: '9', D: '60' }),
        correct: 'B',
        solution: '1. Adım: EBOB(180, 240) = 60 litre (Her bidonun hacmi)\n2. Adım: 180 / 60 = 3 bidon\n3. Adım: 240 / 60 = 4 bidon\nToplam: 3 + 4 = 7 bidon gereklidir.',
        diff: 3,
        type: 'gunluk_yasam',
        skill: 'EBOB-EKOK Modelleme'
      },
      {
        id: 'ai_sample_2',
        teacher_id: '170c1e8f-52b4-440e-b605-ec974fa1d56b',
        topic: 'sub_pisagor_bagintisi',
        text: 'Bir parkta bulunan kaydırağın merdiven boyu dik kenar olarak 6 metre, merdivenin tabanı ile kaydırağın bitiş noktası arası 8 metre olduğuna göre, kaydırak rampasının uzunluğu (hipotenüs) kaç metredir?',
        options: JSON.stringify({ A: '9', B: '10', C: '12', D: '14' }),
        correct: 'B',
        solution: 'Pisagor teoremine göre: c² = a² + b² = 6² + 8² = 36 + 64 = 100. c = √100 = 10 metre bulunur (6-8-10 özel üçgeni).',
        diff: 2,
        type: 'geometrik_gorsel',
        skill: 'Pisagor Bağıntısı ve Modelleme'
      }
    ];

    const aiStmt = db.prepare(`
      INSERT INTO ai_generated_questions
      (id, teacher_id, primary_topic_id, question_text, options_json, correct_answer, solution_explanation, difficulty, question_type, skill_category, math_validation_status, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'approved')
    `);
    for (const a of aiSamples) {
      aiStmt.run([a.id, a.teacher_id, a.topic, a.text, a.options, a.correct, a.solution, a.diff, a.type, a.skill]);
    }
    aiStmt.free();
  }

  // 5. Seed student topic performance for active students
  const countPerf = db.exec("SELECT count(*) as c FROM student_topic_performance");
  if (!countPerf.length || countPerf[0].values[0][0] === 0) {
    console.log('🌱 Öğrenci konu başarı profilleri ekleniyor...');
    const students = ['50fa22f6-1021-4dde-8278-2339fa65030d', '4685e009-c47e-4747-b986-f3d83f8b7eef', '49b24d48-3a98-464f-bf94-46e01a52e2f2'];
    const perfStmt = db.prepare(`
      INSERT OR IGNORE INTO student_topic_performance
      (id, student_id, topic_id, mastery_score, status, confidence_level, solved_count, correct_count, wrong_count, blank_count, avg_duration_seconds, trend, last_tested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const sid of students) {
      // Elif Yılmaz: Çarpanlar ve Katlar zayıf (%40), Üslü güçlü (%85)
      perfStmt.run([`perf_${sid}_1`, sid, 'top_carpanlar_katlar', 40.0, 'critical_weak', 0.85, 15, 6, 7, 2, 85, 'down']);
      perfStmt.run([`perf_${sid}_2`, sid, 'top_uslu_ifadeler', 85.0, 'good', 0.90, 20, 17, 2, 1, 60, 'up']);
      perfStmt.run([`perf_${sid}_3`, sid, 'top_karekoklu_ifadeler', 60.0, 'improving', 0.75, 12, 7, 4, 1, 75, 'stable']);
      perfStmt.run([`perf_${sid}_4`, sid, 'top_ucgenler', 35.0, 'critical_weak', 0.80, 14, 5, 8, 1, 95, 'down']);
      perfStmt.run([`perf_${sid}_5`, sid, 'top_dogrusal_denklemler', 90.0, 'mastered', 0.95, 18, 16, 2, 0, 50, 'up']);
    }
    perfStmt.free();

    // Recommendations for Elif
    db.run(`
      INSERT OR IGNORE INTO learning_recommendations
      (id, student_id, topic_id, reason, recommended_action, recommended_counts_json, is_approved_by_teacher, status)
      VALUES
      ('rec_elif_1', '50fa22f6-1021-4dde-8278-2339fa65030d', 'top_carpanlar_katlar', 'Son 2 denemede EBOB-EKOK problemlerinde 7 yanlış yaptı. Başarı %40 seviyesinde.', 'Temel kavramları pekiştirmek için 5 kolay, 10 orta ve 5 yeni nesil problem içeren hedefli çalışma planı.', '{"easy":5,"medium":10,"hard":5}', 0, 'pending'),
      ('rec_elif_2', '50fa22f6-1021-4dde-8278-2339fa65030d', 'top_ucgenler', 'Pisagor ve üçgen eşitsizliği sorularında süresi ortalama 95 sn ve başarı %35.', 'Görsel destekli 4 kolay, 6 orta ve 4 yeni nesil üçgen sorusu ile özel çalışma seti.', '{"easy":4,"medium":6,"hard":4}', 1, 'assigned');
    `);
  }

  // Save to disk
  const data = db.export();
  fs.writeFileSync('data/app.db', Buffer.from(data));
  console.log('✅ LGS Müfredat ve Yapay Zekâ şeması app.db veritabanına başarıyla yazıldı!');
}

seedLgs().catch(console.error);

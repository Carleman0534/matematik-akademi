const fs = require('fs');
const initSqlJs = require('sql.js');

async function updateDb() {
  const fileBuffer = fs.readFileSync('data/app.db');
  const wasmBinary = fs.readFileSync('public/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database(fileBuffer);

  // 1. pdf_documents
  db.run(`
    CREATE TABLE IF NOT EXISTS pdf_documents (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT DEFAULT 'deneme' CHECK(file_type IN ('deneme','soru_bankasi','cevap_anahtari','cozum','calisma_foyu','diger')),
      subject TEXT DEFAULT 'Matematik',
      grade_level TEXT DEFAULT 'TYT',
      topic TEXT,
      publisher TEXT,
      file_size_mb REAL,
      page_count INTEGER DEFAULT 1,
      description TEXT,
      answer_key TEXT,
      question_count INTEGER DEFAULT 40,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 2. pdf_document_relations
  db.run(`
    CREATE TABLE IF NOT EXISTS pdf_document_relations (
      id TEXT PRIMARY KEY,
      pdf_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
      related_pdf_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
      relation_type TEXT DEFAULT 'answer_key' CHECK(relation_type IN ('answer_key','solution','worksheet','other')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 3. exam_assignments
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_assignments (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      starts_at TEXT,
      due_at TEXT,
      duration_min INTEGER DEFAULT 60,
      extra_time_min INTEGER DEFAULT 0,
      status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned','in_progress','completed','expired','cancelled')),
      UNIQUE(exam_id, student_id)
    );
  `);

  // 4. exam_events
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_events (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      session_id TEXT,
      student_id TEXT,
      performed_by TEXT,
      event_type TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 5. exam_key
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_key (
      exam_id TEXT NOT NULL,
      question_no INTEGER NOT NULL,
      correct TEXT,
      topic_id TEXT,
      page_no INTEGER,
      PRIMARY KEY (exam_id, question_no)
    );
  `);

  // 6. exam_sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      deadline TEXT NOT NULL,
      submitted_at TEXT,
      last_seen_at TEXT DEFAULT (datetime('now')),
      current_q INTEGER,
      transferred_at TEXT,
      UNIQUE (exam_id, student_id)
    );
  `);

  // 7. exam_answers
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_answers (
      session_id TEXT NOT NULL,
      question_no INTEGER NOT NULL,
      answer TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (session_id, question_no)
    );
  `);

  // Sample seed if empty
  const check = db.exec('SELECT count(*) as c FROM pdf_documents');
  if (check.length === 0 || check[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO pdf_documents (id, teacher_id, title, file_name, file_path, file_type, subject, grade_level, topic, publisher, file_size_mb, page_count, description, answer_key, question_count)
      VALUES 
      ('pdf-1', 'teacher-admin', '2026 AYT Matematik Türkiye Geneli Prova Denemesi', '2026-ayt-mat-tg.pdf', '/uploads/sample-exam.pdf', 'deneme', 'Matematik', 'AYT', 'Tüm AYT Müfredatı', 'Özdebir', 3.4, 16, 'ÖSYM tarzı yeni nesil 40 soruluk tam prova denemesi', '1.C 2.A 3.D 4.B 5.E 6.A 7.C 8.D 9.B 10.E 11.A 12.B 13.C 14.D 15.E', 40),
      ('pdf-2', 'teacher-admin', 'TYT Matematik İlk 12 Soru Özel Tarama Fasikülü', 'tyt-ilk-12-soru.pdf', '/uploads/sample-exam.pdf', 'calisma_foyu', 'Matematik', 'TYT', 'Temel Kavramlar & Sayılar', '3D Yayınları', 1.8, 8, 'Temel kavramlar, basamak kavramı, bölünebilme kuralları', '1.B 2.E 3.A 4.C 5.D 6.B 7.A 8.E 9.C 10.D', 24),
      ('pdf-3', 'teacher-admin', '2026 AYT Matematik Prova Denemesi Çözüm Kitapçığı', '2026-ayt-mat-tg-cozumler.pdf', '/uploads/sample-exam.pdf', 'cozum', 'Matematik', 'AYT', 'Ayrıntılı Çözümler', 'Özdebir', 4.1, 24, 'Her sorunun detaylı adım adım video/yazılı çözümleri', '', 40);
    `);
  }

  const data = db.export();
  fs.writeFileSync('data/app.db', Buffer.from(data));
  console.log('✅ SQLite Schema güncellendi ve hazırlandı!');
}

updateDb().catch(console.error);

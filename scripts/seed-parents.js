const fs = require('fs');
const initSqlJs = require('sql.js');

async function seedParents() {
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
    `CREATE TABLE IF NOT EXISTS student_guardians (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_type TEXT DEFAULT 'anne' CHECK (relationship_type IN ('anne', 'baba', 'vasi', 'diger')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passive', 'pending_invitation')),
      verified_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (student_id, guardian_user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS guardian_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL,
      notification_preferences TEXT DEFAULT '{"exam_completed":true,"report_shared":true,"study_assigned":true}',
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS guardian_report_permissions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      show_exam_results INTEGER DEFAULT 1,
      show_question_details INTEGER DEFAULT 1,
      show_topic_analytics INTEGER DEFAULT 1,
      show_assignments INTEGER DEFAULT 1,
      show_teacher_notes INTEGER DEFAULT 1,
      show_progress_reports INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (student_id, guardian_user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS guardian_notifications (
      id TEXT PRIMARY KEY,
      guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_type TEXT DEFAULT 'general' CHECK (notification_type IN ('exam_result', 'assignment_new', 'teacher_note', 'topic_update', 'general')),
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS guardian_messages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_from_teacher INTEGER DEFAULT 1,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`
  ];

  for (const sql of tables) {
    db.run(sql);
  }

  // 2. Insert parent users in users table
  const parents = [
    {
      id: 'parent_ayse',
      email: 'ayse.yilmaz@test.com',
      password: 'password123',
      name: 'Ayşe Yılmaz',
      phone: '05559998877'
    },
    {
      id: 'parent_kemal',
      email: 'kemal.demir@test.com',
      password: 'password123',
      name: 'Kemal Demir',
      phone: '05558887766'
    }
  ];

  for (const p of parents) {
    db.run(`
      INSERT OR REPLACE INTO users (id, email, password, name, role)
      VALUES ('${p.id}', '${p.email}', '${p.password}', '${p.name}', 'parent');
    `);

    db.run(`
      INSERT OR REPLACE INTO guardian_profiles (id, user_id, full_name, phone, email, last_login_at)
      VALUES ('gp_${p.id}', '${p.id}', '${p.name}', '${p.phone}', '${p.email}', datetime('now'));
    `);
  }

  // 3. Link student Elif Yılmaz (50fa22f6-1021-4dde-8278-2339fa65030d) to Ayşe Yılmaz (Anne)
  // And also link Burak Demir (4685e009-c47e-4747-b986-f3d83f8b7eef) to Ayşe Yılmaz (Vasi) to test multiple children!
  const links = [
    {
      id: 'sg_1',
      student_id: '50fa22f6-1021-4dde-8278-2339fa65030d',
      guardian_id: 'parent_ayse',
      rel: 'anne'
    },
    {
      id: 'sg_2',
      student_id: '4685e009-c47e-4747-b986-f3d83f8b7eef',
      guardian_id: 'parent_ayse',
      rel: 'vasi'
    },
    {
      id: 'sg_3',
      student_id: '4685e009-c47e-4747-b986-f3d83f8b7eef',
      guardian_id: 'parent_kemal',
      rel: 'baba'
    }
  ];

  for (const l of links) {
    db.run(`
      INSERT OR REPLACE INTO student_guardians (id, student_id, guardian_user_id, relationship_type, status)
      VALUES ('${l.id}', '${l.student_id}', '${l.guardian_id}', '${l.rel}', 'active');
    `);

    db.run(`
      INSERT OR REPLACE INTO guardian_report_permissions (id, student_id, guardian_user_id, show_exam_results, show_question_details, show_topic_analytics, show_assignments, show_teacher_notes, show_progress_reports)
      VALUES ('grp_${l.id}', '${l.student_id}', '${l.guardian_id}', 1, 1, 1, 1, 1, 1);
    `);
  }

  // 4. Seed sample teacher notes and notifications
  db.run(`
    INSERT OR REPLACE INTO guardian_messages (id, student_id, guardian_user_id, teacher_user_id, message, is_from_teacher)
    VALUES 
    ('gm_1', '50fa22f6-1021-4dde-8278-2339fa65030d', 'parent_ayse', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'Elif bu hafta Üslü İfadeler ve Doğrusal Denklemler konularında çok başarılı bir performans sergiledi. Çarpanlar ve Katlar konusundaki EBOB-EKOK problemleri için kendisine 15 soruluk özel bir pekiştirme çalışması atadım. Hafta sonu düzenli tekrar yapmasını desteklemenizi rica ederim.', 1),
    ('gm_2', '4685e009-c47e-4747-b986-f3d83f8b7eef', 'parent_ayse', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'Burak son denemede netini 2.75 puan artırarak güzel bir ivme yakaladı. Matematik soru çözüm süresi de 75 saniyeden 60 saniyeye düştü.', 1);
  `);

  db.run(`
    INSERT OR REPLACE INTO guardian_notifications (id, guardian_user_id, student_id, title, message, notification_type)
    VALUES 
    ('gn_1', 'parent_ayse', '50fa22f6-1021-4dde-8278-2339fa65030d', 'Yeni Deneme Sonucu Açıklandı', 'Elif, 2026 AYT/LGS Matematik Denemesini 14.25 net ile tamamladı (+2.75 net artış).', 'exam_result'),
    ('gn_2', 'parent_ayse', '50fa22f6-1021-4dde-8278-2339fa65030d', 'Öğretmeninizden Yeni Değerlendirme Notu', 'Matematik öğretmeniniz Elif hakkında haftalık gelişim ve çalışma notu paylaştı.', 'teacher_note'),
    ('gn_3', 'parent_ayse', '50fa22f6-1021-4dde-8278-2339fa65030d', 'Yeni Çalışma Atandı', 'Elif için Çarpanlar ve Katlar Pekiştirme Testi hazırlandı.', 'assignment_new');
  `);

  const data = db.export();
  fs.writeFileSync('data/app.db', Buffer.from(data));
  console.log('✅ Veli tabloları ve örnek veli verileri app.db veritabanına başarıyla yazıldı!');
}

seedParents().catch(console.error);

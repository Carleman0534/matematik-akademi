const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function cleanMockData() {
  const dbPath = path.join(__dirname, '..', 'data', 'app.db');
  if (!fs.existsSync(dbPath)) return;

  const wasmPath = path.join(__dirname, '..', 'public', 'sql-wasm.wasm');
  const wasm = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary: wasm.buffer });
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // 1. Silinecek sahte öğrenci ve kullanıcı ID'leri
  const fakeStudentIds = [
    '50fa22f6-1021-4dde-8278-2339fa65030d',
    '4685e009-c47e-4747-b986-f3d83f8b7eef',
    '49b24d48-3a98-464f-bf94-46e01a52e2f2'
  ];

  const fakeUserIds = [
    '7d07540f-3eb9-4dbb-9089-dd7d5e8cdb73',
    '1e2749ed-c63c-431e-a0cf-624a4b706ef7',
    'd49f2fe0-2b8e-4193-9aa3-42eb154c0892',
    'parent_ayse',
    'parent_kemal'
  ];

  // 2. Bağlantılı tabloları temizle
  for (const stId of fakeStudentIds) {
    db.run(`DELETE FROM student_diagnostic_results WHERE student_id = '${stId}'`);
    db.run(`DELETE FROM smart_mistake_analyses WHERE student_id = '${stId}'`);
    db.run(`DELETE FROM student_topic_performance WHERE student_id = '${stId}'`);
    db.run(`DELETE FROM student_homework_assignments WHERE student_id = '${stId}'`);
    db.run(`DELETE FROM student_guardians WHERE student_id = '${stId}'`);
    db.run(`DELETE FROM students WHERE id = '${stId}'`);
  }

  for (const uId of fakeUserIds) {
    db.run(`DELETE FROM guardian_profiles WHERE user_id = '${uId}'`);
    db.run(`DELETE FROM users WHERE id = '${uId}'`);
  }

  // 3. Dosyaya yaz
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Cleaned mock data from app.db successfully.');

  // 4. database_export.json varsa ordan da temizle
  const expPath = path.join(__dirname, '..', 'data', 'database_export.json');
  if (fs.existsSync(expPath)) {
    const exp = JSON.parse(fs.readFileSync(expPath, 'utf8'));
    if (exp.tables) {
      if (exp.tables.students) {
        exp.tables.students = exp.tables.students.filter(s => !fakeStudentIds.includes(s.id));
      }
      if (exp.tables.users) {
        exp.tables.users = exp.tables.users.filter(u => !fakeUserIds.includes(u.id));
      }
      if (exp.tables.student_diagnostic_results) {
        exp.tables.student_diagnostic_results = exp.tables.student_diagnostic_results.filter(r => !fakeStudentIds.includes(r.student_id));
      }
      if (exp.tables.smart_mistake_analyses) {
        exp.tables.smart_mistake_analyses = exp.tables.smart_mistake_analyses.filter(m => !fakeStudentIds.includes(m.student_id));
      }
    }
    fs.writeFileSync(expPath, JSON.stringify(exp, null, 2), 'utf8');
    console.log('Cleaned mock data from database_export.json successfully.');
  }
}

cleanMockData().catch(console.error);

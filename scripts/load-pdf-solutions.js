// Bir PDF denemesinin soru metinlerini ve adım adım çözümlerini veritabanına yazar.
// Öğrenci sınavı bitirince sonuç ekranında bu çözümleri görür.
// Kullanım (sunucu kapalıyken): node scripts/load-pdf-solutions.js <pdf_id> <cozumler.json>
// JSON biçimi: { "topic": "...", "questions": [ { "no": 1, "text": "...", "solution": "...", "topic"?: "..." } ] }
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'app.db');

async function main() {
  const [pdfId, jsonPath] = process.argv.slice(2);
  if (!pdfId || !jsonPath) {
    console.error('Kullanım: node scripts/load-pdf-solutions.js <pdf_id> <cozumler.json>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const doc = db.exec('SELECT title FROM pdf_documents WHERE id = ?', [pdfId]);
  if (!doc.length) {
    console.error(`PDF bulunamadı: ${pdfId}`);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS pdf_question_solutions (
      pdf_id TEXT NOT NULL,
      question_no INTEGER NOT NULL,
      question_text TEXT,
      solution_text TEXT,
      topic_name TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (pdf_id, question_no)
    );
  `);
  for (const q of data.questions) {
    db.run(
      `INSERT INTO pdf_question_solutions (pdf_id, question_no, question_text, solution_text, topic_name, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(pdf_id, question_no) DO UPDATE SET
         question_text = excluded.question_text,
         solution_text = excluded.solution_text,
         topic_name = excluded.topic_name,
         updated_at = excluded.updated_at`,
      [pdfId, Number(q.no), q.text || null, q.solution || null, q.topic || data.topic || null]
    );
  }
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log(`${data.questions.length} sorunun çözümü yüklendi: ${doc[0].values[0][0]}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

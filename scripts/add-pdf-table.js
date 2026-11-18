const fs = require('fs');
const initSqlJs = require('sql.js');

async function addPdfsTable() {
  const fileBuffer = fs.readFileSync('data/app.db');
  const wasmBinary = fs.readFileSync('public/sql-wasm.wasm');
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database(fileBuffer);

  db.run(`
    CREATE TABLE IF NOT EXISTS exam_pdfs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'AYT' CHECK(category IN ('TYT','AYT','LGS','Konu_Tarama','Diger')),
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size_mb REAL,
      question_count INTEGER DEFAULT 40,
      answer_key TEXT,
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const check = db.exec('SELECT count(*) as c FROM exam_pdfs');
  if (check[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO exam_pdfs (id, title, description, category, file_path, file_name, file_size_mb, question_count, answer_key, uploaded_by)
      VALUES (
        'pdf-demo-1',
        '2026 AYT Matematik Türkiye Geneli Prova Denemesi',
        'ÖSYM tarzı yeni nesil 40 soruluk tam kapsamlı AYT prova deneme sınavı.',
        'AYT',
        '/uploads/sample-exam.pdf',
        '2026-ayt-matematik-tg-deneme.pdf',
        3.4,
        40,
        '1.C, 2.A, 3.D, 4.B, 5.E, 6.A, 7.C, 8.D, 9.B, 10.E',
        'teacher-admin'
      ),
      (
        'pdf-demo-2',
        'TYT Matematik İlk 12 Soru Özel Tarama Fasikülü',
        'Temel kavramlar, basamak kavramı, bölme-bölünebilme ve rasyonel sayılar telafi testi.',
        'TYT',
        '/uploads/sample-exam.pdf',
        'tyt-ilk-12-soru-tarama.pdf',
        1.8,
        24,
        '1.B, 2.E, 3.A, 4.C, 5.D, 6.B',
        'teacher-admin'
      )
    `);
  }

  const data = db.export();
  fs.writeFileSync('data/app.db', Buffer.from(data));
  console.log('✅ exam_pdfs tablosu başarıyla oluşturuldu ve hazırlandı!');
}

addPdfsTable();

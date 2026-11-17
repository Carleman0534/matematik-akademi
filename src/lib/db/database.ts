import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher','student')),
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  teacher_id TEXT NOT NULL REFERENCES users(id),
  grade INTEGER,
  school TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','passive')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT,
  type TEXT CHECK(type IN ('book','exam','worksheet','other'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  subject_id TEXT REFERENCES subjects(id),
  topic_id TEXT REFERENCES topics(id),
  subtopic_id TEXT REFERENCES subtopics(id),
  source_id TEXT REFERENCES sources(id),
  grade INTEGER,
  page_number INTEGER,
  test_number INTEGER,
  question_number INTEGER,
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard','very_hard')),
  question_type TEXT NOT NULL CHECK(question_type IN ('wrong','blank')),
  correct_answer TEXT,
  student_answer TEXT,
  error_type TEXT,
  solution TEXT,
  teacher_note TEXT,
  student_note TEXT,
  learning_status TEXT DEFAULT 'new' CHECK(learning_status IN ('new','not_reviewed','needs_review','reviewed_wrong','reviewed_correct','learned','permanently_learned')),
  review_count INTEGER DEFAULT 0,
  correct_streak INTEGER DEFAULT 0,
  next_review_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_images (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  image_type TEXT DEFAULT 'question' CHECK(image_type IN ('question','solution','note')),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK(result IN ('correct','wrong','blank')),
  duration_seconds INTEGER,
  exam_result_id TEXT,
  notes TEXT,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  question_count INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','assigned','in_progress','completed','cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  blank_count INTEGER DEFAULT 0,
  net_score REAL DEFAULT 0,
  total_duration_seconds INTEGER,
  started_at TEXT,
  completed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id TEXT PRIMARY KEY,
  exam_result_id TEXT NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  exam_question_id TEXT NOT NULL REFERENCES exam_questions(id),
  student_answer TEXT,
  is_correct INTEGER,
  duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS review_schedules (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  interval_days INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','skipped')),
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL REFERENCES students(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('review','exam','topic_study','custom')),
  due_date TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

async function initDatabase(): Promise<Database> {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const wasmPath = path.join(process.cwd(), 'public', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);

  const SQL = await initSqlJs({ wasmBinary: wasmBinary.buffer as ArrayBuffer });

  let database: Database;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  // Enable foreign keys and create tables
  database.run('PRAGMA foreign_keys=ON;');
  database.run(CREATE_TABLES_SQL);
  saveDb(database);

  return database;
}

export function saveDb(database?: Database): void {
  const d = database || db;
  if (!d) return;
  const data = d.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!initPromise) {
    initPromise = initDatabase().then((database) => {
      db = database;
      return database;
    });
  }

  return initPromise;
}

export function closeDb(): void {
  if (db) {
    saveDb(db);
    db.close();
    db = null;
    initPromise = null;
  }
}

import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const IS_SERVERLESS = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const ORIGINAL_DB_PATH = path.join(process.cwd(), 'data', 'app.db');
const DB_PATH = IS_SERVERLESS ? path.join('/tmp', 'app.db') : ORIGINAL_DB_PATH;

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
  role TEXT NOT NULL CHECK(role IN ('teacher','student','parent')),
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
  teacher_id TEXT NOT NULL,
  student_id TEXT,
  class_id TEXT,
  instructions TEXT,
  question_count INTEGER DEFAULT 40,
  duration_minutes INTEGER DEFAULT 60,
  duration_min INTEGER DEFAULT 60,
  penalty_divisor REAL DEFAULT 4,
  option_count INTEGER DEFAULT 5,
  scoring_method TEXT DEFAULT 'net_osym',
  mode TEXT DEFAULT 'assignment',
  pdf_id TEXT,
  solution_pdf_id TEXT,
  is_template INTEGER DEFAULT 1,
  starts_at TEXT,
  due_at TEXT,
  opens_at TEXT,
  closes_at TEXT,
  results_mode TEXT DEFAULT 'after_submit',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pdf_documents (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'deneme',
  subject TEXT DEFAULT 'Matematik',
  grade_level TEXT DEFAULT 'TYT',
  topic TEXT,
  publisher TEXT,
  file_size_mb REAL,
  page_count INTEGER DEFAULT 1,
  description TEXT,
  answer_key TEXT,
  question_count INTEGER DEFAULT 40,
  file_data TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pdf_document_relations (
  id TEXT PRIMARY KEY,
  pdf_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  related_pdf_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'answer_key',
  created_at TEXT DEFAULT (datetime('now'))
);

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
  status TEXT DEFAULT 'assigned',
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  deadline TEXT NOT NULL,
  submitted_at TEXT,
  last_seen_at TEXT DEFAULT (datetime('now')),
  current_q INTEGER DEFAULT 1,
  transferred_at TEXT,
  device_info TEXT,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS exam_key (
  exam_id TEXT NOT NULL,
  question_no INTEGER NOT NULL,
  correct TEXT,
  topic_id TEXT,
  page_no INTEGER,
  PRIMARY KEY (exam_id, question_no)
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  exam_result_id TEXT,
  exam_question_id TEXT,
  question_no INTEGER,
  student_answer TEXT,
  answer TEXT,
  is_correct INTEGER,
  duration_seconds INTEGER,
  question_text TEXT,
  options_json TEXT,
  correct_answer TEXT,
  topic_name TEXT,
  solution_explanation TEXT,
  ai_analysis TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS exam_question_analytics (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  question_no INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  blank_count INTEGER DEFAULT 0,
  most_common_wrong TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(exam_id, question_no)
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

CREATE TABLE IF NOT EXISTS curriculum_topics (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  grade_level INTEGER DEFAULT 8,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curriculum_outcomes (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  cognitive_level TEXT DEFAULT 'kavrama',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pdf_analysis_jobs (
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
);

CREATE TABLE IF NOT EXISTS pdf_extracted_questions (
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
);

CREATE TABLE IF NOT EXISTS question_topic_relations (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'primary' CHECK (relation_type IN ('primary','secondary','prerequisite')),
  weight REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_skill_tags (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_generation_jobs (
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
);

CREATE TABLE IF NOT EXISTS ai_generated_questions (
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
);

CREATE TABLE IF NOT EXISTS question_validation_results (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  is_mathematically_sound INTEGER DEFAULT 1,
  single_correct_answer INTEGER DEFAULT 1,
  options_valid INTEGER DEFAULT 1,
  similarity_score REAL DEFAULT 0.0,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_profiles (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  overall_math_score REAL DEFAULT 50.0,
  calculated_level TEXT DEFAULT 'orta',
  total_questions_solved INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_wrong INTEGER DEFAULT 0,
  total_blank INTEGER DEFAULT 0,
  last_activity_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_topic_performance (
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
);

CREATE TABLE IF NOT EXISTS learning_recommendations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES curriculum_topics(id),
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  recommended_counts_json TEXT DEFAULT '{"easy":5,"medium":10,"hard":5}',
  is_approved_by_teacher INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','dismissed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personalized_study_plans (
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
);

CREATE TABLE IF NOT EXISTS study_plan_questions (
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
);

CREATE TABLE IF NOT EXISTS student_study_sessions (
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
);

CREATE TABLE IF NOT EXISTS student_learning_events (
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
);

CREATE TABLE IF NOT EXISTS question_similarity_checks (
  id TEXT PRIMARY KEY,
  question_a_id TEXT NOT NULL,
  question_b_id TEXT NOT NULL,
  similarity_ratio REAL NOT NULL,
  is_duplicate INTEGER DEFAULT 0,
  checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  provider TEXT DEFAULT 'google-gemini',
  model TEXT DEFAULT 'gemini-2.5-flash',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0.0,
  purpose TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_guardians (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'anne' CHECK (relationship_type IN ('anne', 'baba', 'vasi', 'diger')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passive', 'pending_invitation')),
  verified_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (student_id, guardian_user_id)
);

CREATE TABLE IF NOT EXISTS guardian_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  notification_preferences TEXT DEFAULT '{"exam_completed":true,"report_shared":true,"study_assigned":true}',
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guardian_report_permissions (
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
);

CREATE TABLE IF NOT EXISTS guardian_notifications (
  id TEXT PRIMARY KEY,
  guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'general' CHECK (notification_type IN ('exam_result', 'assignment_new', 'teacher_note', 'topic_update', 'general')),
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guardian_messages (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_teacher INTEGER DEFAULT 1,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 1. Hazırbulunuşluk ve Başlangıç Seviye Belirleme Testleri
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  grade_level INTEGER DEFAULT 8,
  total_questions INTEGER DEFAULT 20,
  duration_minutes INTEGER DEFAULT 45,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Öğrenci Hazırbulunuşluk Değerlendirme Sonuçları
CREATE TABLE IF NOT EXISTS student_diagnostic_results (
  id TEXT PRIMARY KEY,
  test_id TEXT,
  student_id TEXT NOT NULL,
  overall_score REAL DEFAULT 0.0,
  overall_level TEXT DEFAULT 'orta',
  is_provisional INTEGER DEFAULT 1,
  confidence_rating REAL DEFAULT 0.65,
  calc_skill_score REAL DEFAULT 50.0,
  problem_solving_score REAL DEFAULT 50.0,
  graphic_table_score REAL DEFAULT 50.0,
  math_reasoning_score REAL DEFAULT 50.0,
  new_gen_score REAL DEFAULT 50.0,
  time_management_score REAL DEFAULT 50.0,
  strong_topics_json TEXT DEFAULT '[]',
  weak_topics_json TEXT DEFAULT '[]',
  sub_outcome_deficits_json TEXT DEFAULT '[]',
  suggested_start_plan_json TEXT DEFAULT '{}',
  completed_at TEXT DEFAULT (datetime('now'))
);

-- 3. Akıllı Yanlış Analizi (10 Hata Türü)
CREATE TABLE IF NOT EXISTS smart_mistake_analyses (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  topic_id TEXT,
  subtopic_id TEXT,
  exam_id TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  primary_error_type TEXT NOT NULL,
  ai_probability REAL DEFAULT 0.85,
  ai_reasoning_explanation TEXT NOT NULL,
  verified_by_teacher INTEGER DEFAULT 0,
  verified_by_student INTEGER DEFAULT 0,
  teacher_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Aralıklı Tekrar ve Unutma Riski Takibi
CREATE TABLE IF NOT EXISTS spaced_repetition_items (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  source_type TEXT DEFAULT 'mistake',
  source_id TEXT,
  question_text TEXT,
  repetition_level INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  last_reviewed_at TEXT DEFAULT (datetime('now')),
  next_review_at TEXT NOT NULL,
  last_performance TEXT DEFAULT 'incorrect',
  forgetting_risk TEXT DEFAULT 'orta',
  is_mastered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Akıllı Günlük Hedefler ve Çalışma Planı
CREATE TABLE IF NOT EXISTS daily_student_goals (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  goal_date TEXT NOT NULL,
  title TEXT NOT NULL,
  items_json TEXT NOT NULL DEFAULT '[]',
  total_minutes INTEGER DEFAULT 45,
  total_questions INTEGER DEFAULT 35,
  completed_minutes INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,
  is_fully_completed INTEGER DEFAULT 0,
  rolled_over_to_next_day INTEGER DEFAULT 0,
  teacher_approved INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 6. Öğretmen Ders Takvimi ve Planlama
CREATE TABLE IF NOT EXISTS teacher_lesson_schedules (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  lesson_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled',
  topic_id TEXT,
  planned_goals TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Ders Geçmişi ve Öğretmen Ders Kayıtları
CREATE TABLE IF NOT EXISTS lesson_history_records (
  id TEXT PRIMARY KEY,
  schedule_id TEXT,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  lesson_date TEXT NOT NULL,
  topic_id TEXT,
  subtopics_covered TEXT,
  questions_solved_count INTEGER DEFAULT 0,
  student_performance_rating INTEGER DEFAULT 4,
  teacher_private_notes TEXT,
  teacher_parent_notes TEXT,
  assigned_homework TEXT,
  next_lesson_goals TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Ödev ve Görev Takip Sistemi
CREATE TABLE IF NOT EXISTS student_homework_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic_id TEXT,
  question_count INTEGER DEFAULT 15,
  difficulty_level INTEGER DEFAULT 3,
  source_type TEXT DEFAULT 'question_bank',
  start_date TEXT,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'assigned',
  completed_question_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  completion_percentage REAL DEFAULT 0.0,
  completed_at TEXT,
  share_with_parent INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 9. Matematik Konu Anlatımı ve Mini Dersler
CREATE TABLE IF NOT EXISTS mini_lesson_topics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  formulas_json TEXT DEFAULT '[]',
  solved_examples_json TEXT DEFAULT '[]',
  video_url TEXT,
  pdf_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 10. Öğrenci Başarı ve Motivasyon Rozetleri
CREATE TABLE IF NOT EXISTS student_achievement_badges (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  badge_code TEXT NOT NULL,
  badge_title TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  category TEXT DEFAULT 'general',
  earned_at TEXT DEFAULT (datetime('now'))
);

-- 11. Sınav Takvimi ve Hedef Yönetimi
CREATE TABLE IF NOT EXISTS exam_countdown_settings (
  id TEXT PRIMARY KEY,
  exam_title TEXT NOT NULL DEFAULT 'LGS 2027',
  target_date TEXT NOT NULL DEFAULT '2027-06-06',
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 12. Soru Kalitesi ve Yapay Zekâ Denetim Kayıtları
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

-- 13. Haftalık ve Aylık Veli Gelişim Raporları
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

-- 14. Akıllı Deneme Sonrası 10 Bölümlü Değerlendirme Raporları
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

-- 15. Sistem Denetim ve Güvenlik Günlüğü
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

-- 16. Büyük PDF Dosyaları İçin Parçalı Yükleme (Chunked Upload)
CREATE TABLE IF NOT EXISTS upload_chunks (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

// initialBytes verilirse (Blob'dan indirilen kopya) veritabanı ondan açılır ve /tmp'ye de yazılır.
async function initDatabase(initialBytes?: Uint8Array): Promise<Database> {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }

  const wasmPath = path.join(process.cwd(), 'public', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);

  const SQL = await initSqlJs({ wasmBinary: wasmBinary.buffer as ArrayBuffer });

  if (initialBytes) {
    try { fs.writeFileSync(DB_PATH, Buffer.from(initialBytes)); } catch {}
  } else if (IS_SERVERLESS && !fs.existsSync(DB_PATH) && fs.existsSync(ORIGINAL_DB_PATH)) {
    try {
      fs.copyFileSync(ORIGINAL_DB_PATH, DB_PATH);
    } catch {}
  }

  let database: Database;
  if (initialBytes) {
    database = new SQL.Database(initialBytes);
  } else if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else if (fs.existsSync(ORIGINAL_DB_PATH)) {
    const fileBuffer = fs.readFileSync(ORIGINAL_DB_PATH);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  // Enable foreign keys and create tables
  database.run('PRAGMA foreign_keys=ON;');
  database.run(CREATE_TABLES_SQL);

  // Bazı tablolar bir dışa aktarımdan kısıtsız yeniden oluşturulmuş (id birincil anahtar değil).
  // Bu durumda students/exams'e yabancı anahtarla bağlı tablolara (exam_results…) yazmak
  // "foreign key mismatch" ile, ON CONFLICT(id) ifadeleri de hata ile düşer. id'ye benzersiz
  // indeks bu ikisini de düzeltir; tekrar eden id varsa indeks oluşmaz ve uyarı yazılır.
  for (const table of ['users', 'students', 'exams', 'exam_questions', 'questions', 'question_attempts', 'question_images', 'sources', 'subjects', 'topics', 'subtopics']) {
    try {
      const cols = database.exec(`PRAGMA table_info("${table}")`);
      const hasId = cols.length > 0 && cols[0].values.some(c => c[1] === 'id');
      const hasPk = cols.length > 0 && cols[0].values.some(c => Number(c[5]) > 0);
      if (hasId && !hasPk) database.run(`CREATE UNIQUE INDEX IF NOT EXISTS ux_${table}_id ON "${table}"(id);`);
    } catch (e) {
      console.warn(`${table}.id için benzersiz indeks oluşturulamadı:`, e);
    }
  }

  // Eski "Deneme Ata" listesi var olmayan, sabit yazılmış denemeler sunuyordu; bunlar atanınca
  // hiçbir yerde görünmeyen, hiçbir denemeye bağlı olmayan kayıtlar oluşuyordu. Temizle.
  try {
    const missing = `exam_id NOT IN (SELECT id FROM exams) AND exam_id NOT IN (SELECT id FROM pdf_documents) AND exam_id NOT IN (SELECT id FROM personalized_study_plans)`;
    database.run(`DELETE FROM exam_assignments WHERE status = 'assigned' AND ${missing}`);
    database.run(`DELETE FROM exam_sessions WHERE submitted_at IS NULL AND ${missing}`);
  } catch {}

  // Safe migrations for file_data storage
  try {
    database.run('ALTER TABLE pdf_documents ADD COLUMN file_data TEXT;');
  } catch {}
  try {
    database.run('ALTER TABLE exam_pdfs ADD COLUMN file_data TEXT;');
  } catch {}
  // PDF dosyası Vercel Blob'da ayrı bir nesne olarak durur (veritabanı küçük kalsın diye); burada yolu tutulur
  try {
    database.run('ALTER TABLE pdf_documents ADD COLUMN blob_path TEXT;');
  } catch {}
  try {
    database.run('ALTER TABLE exam_pdfs ADD COLUMN blob_path TEXT;');
  } catch {}
  // Sınav sırasında sunucuya kaydedilen cevap taslağı (cihaz değişse/yerel kayıt silinse devam edilebilsin; Canlı Takip'te görünsün)
  try {
    database.run('ALTER TABLE exam_sessions ADD COLUMN progress_json TEXT;');
  } catch {}
  try {
    database.run('ALTER TABLE exam_sessions ADD COLUMN progress_count INTEGER DEFAULT 0;');
  } catch {}
  // Cevap anahtarı olmadan teslim edilen deneme: cevaplar burada bekler, anahtar eklenince otomatik puanlanır
  try {
    database.run('ALTER TABLE exam_sessions ADD COLUMN pending_answers TEXT;');
  } catch {}
  try {
    database.run('ALTER TABLE exam_sessions ADD COLUMN pending_duration INTEGER;');
  } catch {}

  // Safe migrations for exam answers & question breakdown
  try { database.run('ALTER TABLE exam_answers ADD COLUMN id TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN exam_result_id TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN student_answer TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN is_correct INTEGER;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN duration_seconds INTEGER;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN question_text TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN options_json TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN correct_answer TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN topic_name TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN solution_explanation TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_answers ADD COLUMN ai_analysis TEXT;'); } catch {}
  try { database.run('ALTER TABLE exam_results ADD COLUMN created_at TEXT DEFAULT (datetime(\'now\'));'); } catch {}
  try { database.run('ALTER TABLE exam_results ADD COLUMN completed_at TEXT;'); } catch {}
  // Uygulama ayarları (ör. öğrenci panelinde görünür bölümler)
  try {
    database.run(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')));`);
  } catch {}
  // Öğrenciye atanan denemelerdeki PDF soru görselleri
  try { database.run('ALTER TABLE study_plan_questions ADD COLUMN image_url TEXT;'); } catch {}
  // PDF denemelerinin soru metni ve adım adım çözümü: öğrenci sınavı bitirince sonuç ekranında görür
  try {
    database.run(`
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
  } catch {}

  // PDF'ten kırpılan soru görselleri. Diske değil veritabanına yazılır: Vercel gibi ortamlarda
  // proje klasörü salt okunurdur. Ayrı tablo, soru listelerinin bu büyük veriyi taşımasını önler.
  try {
    database.run(`
      CREATE TABLE IF NOT EXISTS pdf_question_images (
        question_id TEXT PRIMARY KEY REFERENCES pdf_extracted_questions(id) ON DELETE CASCADE,
        mime TEXT NOT NULL DEFAULT 'image/jpeg',
        data BLOB NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch (e) {
    console.warn('Could not create pdf_question_images:', e);
  }

  // Check and seed users/students if empty and database_export.json exists
  const exportPath = path.join(process.cwd(), 'data', 'database_export.json');
  if (fs.existsSync(exportPath)) {
    try {
      const checkUsers = database.exec("SELECT count(*) as c FROM users");
      if (!checkUsers.length || checkUsers[0].values[0][0] === 0) {
        const exp = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        if (exp.tables) {
          for (const tableName of Object.keys(exp.tables)) {
            const rows = exp.tables[tableName];
            if (rows && rows.length > 0) {
              const cols = Object.keys(rows[0]);
              const colDefs = cols.map(c => `"${c}" TEXT`).join(', ');
              database.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});`);
              const placeholders = cols.map(() => '?').join(', ');
              const insertStmt = database.prepare(`INSERT OR IGNORE INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`);
              for (const r of rows) {
                insertStmt.run(cols.map(c => r[c]));
              }
              insertStmt.free();
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not auto-seed database:', e);
    }
  }

  // Not: Eskiden burada seedLgsPdfQuestionsIfMissing() çalışıyordu. Dosyası olmayan "2024/2023 LGS"
  // PDF kayıtlarını ve uydurma soruları her açılışta geri ekliyordu; kapatıldı. Gerçek PDF'ler
  // öğretmen panelinden yüklenir.

  // Seed LGS curriculum topics if empty
  try {
    const checkCurriculum = database.exec("SELECT count(*) as c FROM curriculum_topics");
    if (!checkCurriculum.length || checkCurriculum[0].values[0][0] === 0) {
      database.run(`
        INSERT OR IGNORE INTO curriculum_topics (id, code, name, parent_id, grade_level, sort_order, is_active)
        VALUES 
        ('top_carpanlar_katlar', 'LGS_01', 'Çarpanlar ve Katlar', NULL, 8, 1, 1),
        ('sub_pozitif_carpanlar', 'LGS_01_01', 'Pozitif tam sayıların çarpanları', 'top_carpanlar_katlar', 8, 1, 1),
        ('sub_ebob', 'LGS_01_02', 'EBOB (En Büyük Ortak Bölen)', 'top_carpanlar_katlar', 8, 2, 1),
        ('sub_ekok', 'LGS_01_03', 'EKOK (En Küçük Ortak Kat)', 'top_carpanlar_katlar', 8, 3, 1),
        ('sub_aralarinda_asal', 'LGS_01_04', 'Aralarında asal sayılar', 'top_carpanlar_katlar', 8, 4, 1),
        ('sub_ebob_ekok_problemleri', 'LGS_01_05', 'EBOB–EKOK problemleri', 'top_carpanlar_katlar', 8, 5, 1),
        ('top_uslu_ifadeler', 'LGS_02', 'Üslü İfadeler', NULL, 8, 2, 1),
        ('sub_tam_sayi_kuvvetleri', 'LGS_02_01', 'Tam sayıların tam sayı kuvvetleri', 'top_uslu_ifadeler', 8, 1, 1),
        ('sub_uslu_ozellikler', 'LGS_02_02', 'Üslü ifadelerin özellikleri', 'top_uslu_ifadeler', 8, 2, 1),
        ('sub_bilimsel_gosterim', 'LGS_02_03', 'Bilimsel gösterim', 'top_uslu_ifadeler', 8, 3, 1),
        ('sub_uslu_islemler', 'LGS_02_04', 'Üslü ifadelerle işlemler', 'top_uslu_ifadeler', 8, 4, 1),
        ('sub_uslu_problemler', 'LGS_02_05', 'Üslü ifadelerle problemler', 'top_uslu_ifadeler', 8, 5, 1),
        ('top_karekoklu_ifadeler', 'LGS_03', 'Kareköklü İfadeler', NULL, 8, 3, 1),
        ('sub_tam_kare_sayilar', 'LGS_03_01', 'Tam kare doğal sayılar', 'top_karekoklu_ifadeler', 8, 1, 1),
        ('sub_karekok_ozellikler', 'LGS_03_02', 'Kareköklü ifadelerin özellikleri', 'top_karekoklu_ifadeler', 8, 2, 1),
        ('sub_karekok_islemler', 'LGS_03_03', 'Kareköklü ifadelerle işlemler', 'top_karekoklu_ifadeler', 8, 3, 1),
        ('sub_ondalik_karekok', 'LGS_03_04', 'Ondalık ifadelerin karekökü', 'top_karekoklu_ifadeler', 8, 4, 1),
        ('sub_gercek_sayilar', 'LGS_03_05', 'Gerçek sayılar', 'top_karekoklu_ifadeler', 8, 5, 1),
        ('top_veri_analizi', 'LGS_04', 'Veri Analizi', NULL, 8, 4, 1),
        ('sub_cizgi_sutun_grafikleri', 'LGS_04_01', 'Çizgi ve sütun grafikleri', 'top_veri_analizi', 8, 1, 1),
        ('sub_daire_grafikleri', 'LGS_04_02', 'Daire grafikleri', 'top_veri_analizi', 8, 2, 1),
        ('sub_grafik_yorumlama', 'LGS_04_03', 'Grafik yorumlama', 'top_veri_analizi', 8, 3, 1),
        ('sub_grafikler_arasi_donusum', 'LGS_04_04', 'Grafikler arası dönüşüm', 'top_veri_analizi', 8, 4, 1),
        ('top_olasilik', 'LGS_05', 'Basit Olayların Olma Olasılığı', NULL, 8, 5, 1),
        ('sub_olasi_durumlar', 'LGS_05_01', 'Olası durumlar', 'top_olasilik', 8, 1, 1),
        ('sub_es_olasilikli_olaylar', 'LGS_05_02', 'Eş olasılıklı olaylar', 'top_olasilik', 8, 2, 1),
        ('sub_olasilik_hesaplari', 'LGS_05_03', 'Olasılık hesaplamaları', 'top_olasilik', 8, 3, 1),
        ('top_cebirsel_ifadeler', 'LGS_06', 'Cebirsel İfadeler ve Özdeşlikler', NULL, 8, 6, 1),
        ('sub_cebirsel_ifadeler_temel', 'LGS_06_01', 'Cebirsel ifadeler', 'top_cebirsel_ifadeler', 8, 1, 1),
        ('sub_ozdeslikler', 'LGS_06_02', 'Özdeşlikler', 'top_cebirsel_ifadeler', 8, 2, 1),
        ('sub_carpanlara_ayirma', 'LGS_06_03', 'Çarpanlara ayırma', 'top_cebirsel_ifadeler', 8, 3, 1),
        ('sub_cebirsel_islemler', 'LGS_06_04', 'Cebirsel ifadelerle işlemler', 'top_cebirsel_ifadeler', 8, 4, 1),
        ('top_dogrusal_denklemler', 'LGS_07', 'Doğrusal Denklemler', NULL, 8, 7, 1),
        ('sub_koordinat_sistemi', 'LGS_07_01', 'Koordinat sistemi', 'top_dogrusal_denklemler', 8, 1, 1),
        ('sub_dogrusal_iliski', 'LGS_07_02', 'Doğrusal ilişki', 'top_dogrusal_denklemler', 8, 2, 1),
        ('sub_dogrunun_egimi', 'LGS_07_03', 'Doğrunun eğimi', 'top_dogrusal_denklemler', 8, 3, 1),
        ('sub_dogrusal_denklem_problemleri', 'LGS_07_04', 'Doğrusal denklem problemleri', 'top_dogrusal_denklemler', 8, 4, 1),
        ('top_esitsizlikler', 'LGS_08', 'Eşitsizlikler', NULL, 8, 8, 1),
        ('sub_birinci_derece_esitsizlik', 'LGS_08_01', 'Birinci dereceden bir bilinmeyenli eşitsizlikler', 'top_esitsizlikler', 8, 1, 1),
        ('sub_sayi_dogrusunda_gosterim', 'LGS_08_02', 'Eşitsizliklerin sayı doğrusunda gösterimi', 'top_esitsizlikler', 8, 2, 1),
        ('sub_esitsizlik_problemleri', 'LGS_08_03', 'Eşitsizlik problemleri', 'top_esitsizlikler', 8, 3, 1),
        ('top_ucgenler', 'LGS_09', 'Üçgenler', NULL, 8, 9, 1),
        ('sub_kenar_aci_iliskileri', 'LGS_09_01', 'Üçgende kenar ve açı ilişkileri', 'top_ucgenler', 8, 1, 1),
        ('sub_ucgen_esitsizligi', 'LGS_09_02', 'Üçgen eşitsizliği', 'top_ucgenler', 8, 2, 1),
        ('sub_pisagor_bagintisi', 'LGS_09_03', 'Pisagor bağıntısı', 'top_ucgenler', 8, 3, 1),
        ('sub_ucgen_problemleri', 'LGS_09_04', 'Üçgen problemleri', 'top_ucgenler', 8, 4, 1),
        ('top_eslik_benzerlik', 'LGS_10', 'Eşlik ve Benzerlik', NULL, 8, 10, 1),
        ('sub_es_sekiller', 'LGS_10_01', 'Eş şekiller', 'top_eslik_benzerlik', 8, 1, 1),
        ('sub_benzer_sekiller', 'LGS_10_02', 'Benzer şekiller', 'top_eslik_benzerlik', 8, 2, 1),
        ('sub_benzerlik_orani', 'LGS_10_03', 'Benzerlik oranı', 'top_eslik_benzerlik', 8, 3, 1),
        ('sub_benzerlik_problemleri', 'LGS_10_04', 'Benzerlik problemleri', 'top_eslik_benzerlik', 8, 4, 1),
        ('top_donusum_geometrisi', 'LGS_11', 'Dönüşüm Geometrisi', NULL, 8, 11, 1),
        ('sub_oteleme', 'LGS_11_01', 'Öteleme', 'top_donusum_geometrisi', 8, 1, 1),
        ('sub_yansima', 'LGS_11_02', 'Yansıma', 'top_donusum_geometrisi', 8, 2, 1),
        ('sub_geometrik_donusumler', 'LGS_11_03', 'Geometrik dönüşümler', 'top_donusum_geometrisi', 8, 3, 1),
        ('top_geometrik_cisimler', 'LGS_12', 'Geometrik Cisimler', NULL, 8, 12, 1),
        ('sub_prizmalar', 'LGS_12_01', 'Prizmalar', 'top_geometrik_cisimler', 8, 1, 1),
        ('sub_dik_dairesel_silindir', 'LGS_12_02', 'Dik dairesel silindir', 'top_geometrik_cisimler', 8, 2, 1),
        ('sub_silindirin_yuzey_alani_hacmi', 'LGS_12_03', 'Silindirin yüzey alanı ve hacmi', 'top_geometrik_cisimler', 8, 3, 1);
      `);
    }
  } catch (e) {
    console.warn('Could not seed initial curriculum_topics:', e);
  }

  return database;
}

// Next.js sayfaları ve API uç noktalarını aynı süreçte ayrı modül kopyalarında çalıştırabilir.
// Her kopyanın kendi bellek içi veritabanı olursa biri diğerinin yazdığını görmez ve eski
// kopyasını dosyaya geri yazabilir. Bağlantı bu yüzden süreç genelinde (globalThis) paylaşılır.
type JournalEntry = { sql: string; params?: unknown };

const shared = globalThis as unknown as {
  __appDb?: Database | null;
  __appDbInit?: Promise<Database> | null;
  // Vercel Blob eşitlemesi (yalnızca Vercel'de ve Blob deposu bağlıysa)
  __blobEtag?: string | null;
  __blobLastCheck?: number;
  __blobSynced?: boolean;          // Blob'daki kopya en az bir kez başarıyla okundu/oluşturuldu
  __blobDirty?: boolean;           // bellekte Blob'a henüz yazılmamış değişiklik var
  __blobFlushScheduled?: boolean;
  __blobRefresh?: Promise<void> | null;
  __blobLock?: Promise<unknown>;   // yükleme ve yenilemeyi sıraya sokar
  __blobJournal?: JournalEntry[];  // Blob'a henüz yazılmamış değişiklik komutları (SQL + parametreler)
  __blobHandle?: Database;
  __journalTotal?: number;         // bu örnekte günlüğe giren toplam değişiklik sayısı
  __journalFlushed?: number;       // bunlardan Blob'a yazıldığı doğrulananların sayısı
  __pdfMigrationAt?: number;       // satır içi PDF'leri Blob'a taşıma son deneme zamanı
  __pdfMigrationDone?: boolean;
};

const BLOB_REFRESH_INTERVAL_MS = 1000;
function blobSyncEnabled(): boolean {
  return IS_SERVERLESS && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// ── Değişiklik günlüğü ────────────────────────────────────────────────────────────────────────
// Veritabanı tek bir dosya olarak Blob'da durur. İki sunucu aynı anda yazarsa ikincisi çakışır.
// Eskiden çakışmada "son yazan kazanır" diye başkasının değişikliği ezilirdi. Artık her örnek,
// henüz buluta yazmadığı değişiklikleri (INSERT/UPDATE/DELETE...) bir günlükte tutar; çakışmada
// buluttaki en son kopyayı alır, günlüğü onun üstüne yeniden uygular ve yeniden yazar.
const WRITE_SQL = /^\s*(insert|update|delete|replace|create|alter|drop)\b/i;
let journalDepth = 0; // iç içe çağrılarda (run → prepare → step) aynı komut iki kez yazılmasın

function pendingJournal(): JournalEntry[] {
  return (shared.__blobJournal ??= []);
}
function journalPush(entry: JournalEntry): void {
  pendingJournal().push(entry);
  shared.__journalTotal = (shared.__journalTotal || 0) + 1;
}
function copyParams(p: unknown): unknown {
  if (Array.isArray(p)) return [...p];
  if (p && typeof p === 'object') return { ...(p as Record<string, unknown>) };
  return p;
}

function instrument(d: Database): Database {
  const tagged = d as unknown as { __journaled?: boolean };
  if (tagged.__journaled) return d;
  tagged.__journaled = true;

  const rawRun = d.run.bind(d);
  const rawExec = d.exec.bind(d);
  const rawPrepare = d.prepare.bind(d);

  d.run = ((sql: string, params?: any) => {
    journalDepth++;
    try { return rawRun(sql, params); } finally { journalDepth--; if (journalDepth === 0 && WRITE_SQL.test(sql)) journalPush({ sql, params: copyParams(params) }); }
  }) as Database['run'];

  d.exec = ((sql: string, params?: any) => {
    journalDepth++;
    try { return rawExec(sql, params); } finally { journalDepth--; if (journalDepth === 0 && WRITE_SQL.test(sql)) journalPush({ sql, params: copyParams(params) }); }
  }) as Database['exec'];

  d.prepare = ((sql: string, params?: any) => {
    const st = rawPrepare(sql, params);
    if (!WRITE_SQL.test(sql)) return st;
    // Hazırlanmış yazma komutları: her step() bağlı parametrelerle bir değişikliktir
    let bound: unknown = copyParams(params);
    const rawBind = st.bind.bind(st);
    const rawStep = st.step.bind(st);
    st.bind = ((p?: any) => { bound = copyParams(p); return rawBind(p); }) as typeof st.bind;
    st.step = (() => {
      const r = rawStep();
      if (journalDepth === 0) journalPush({ sql, params: bound });
      return r;
    }) as typeof st.step;
    return st;
  }) as Database['prepare'];

  return d;
}

function replayJournal(target: Database, entries: JournalEntry[]): void {
  for (const e of entries) {
    try {
      target.run(e.sql, e.params as any);
    } catch (err) {
      console.warn('Çakışma sonrası yeniden uygulanamayan değişiklik atlandı:', String(err).slice(0, 200));
    }
  }
}

// Bağlantıyı dışarı veren sabit bir "tutamaç": altındaki veritabanı nesnesi yenilenebilir (uzak kopya
// alınınca), ama istek içinde `const db = await getDb()` ile tutulan referans geçerli kalır.
function blobHandle(): Database {
  if (!shared.__blobHandle) {
    shared.__blobHandle = new Proxy({} as Database, {
      get(_t, prop) {
        const real = shared.__appDb as unknown as Record<string | symbol, unknown>;
        const v = real[prop];
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(real) : v;
      },
    });
  }
  return shared.__blobHandle;
}

function withBlobLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = shared.__blobLock ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  shared.__blobLock = next.catch(() => {});
  return next;
}

// Uzak kopyayı benimser: yeni veritabanı açılır, bu örneğin henüz yazılmamış değişiklikleri üstüne uygulanır.
async function adoptRemote(bytes: Uint8Array, etag: string): Promise<void> {
  const fresh = await initDatabase(bytes);
  replayJournal(fresh, pendingJournal());
  shared.__appDb = instrument(fresh);
  shared.__blobEtag = etag;
}

export function saveDb(database?: Database): void {
  const blob = blobSyncEnabled();
  const d = blob ? shared.__appDb : (database || db || shared.__appDb);
  if (!d) return;
  try {
    const data = d.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.warn('Could not save database file:', err);
  }
  if (blob) {
    shared.__blobDirty = true;
    void scheduleBlobFlush();
  }
}

// Yanıt dönmeden önce değişikliğin Blob'a yazılmasını bekler. Bir sonraki isteğin başka bir sunucu örneğine
// düşebileceği ve önceki adımın verisine ihtiyaç duyduğu akışlarda (ör. parçalı PDF yükleme) kullanılır.
export async function flushDbNow(): Promise<void> {
  if (blobSyncEnabled()) await flushToBlob();
}

// Değişikliği kaydeder ve kalıcı depoya (Vercel Blob) yazıldığı doğrulanana kadar bekler.
// Yazılamazsa hata fırlatır: kullanıcıya "kaydedildi" denip değişikliğin sessizce kaybolmasını önler.
// Yerel modda saveDb ile aynıdır. Atama, sınav cevabı/teslimi, hesap ve PDF işlemlerinde kullanılır.
export async function commitDb(): Promise<void> {
  saveDb();
  if (!blobSyncEnabled()) return;
  const target = shared.__journalTotal || 0;
  for (let i = 0; i < 2; i++) {
    await flushToBlob();
    if ((shared.__journalFlushed || 0) >= target && !shared.__blobDirty) return;
  }
  throw new Error('Değişiklik kalıcı olarak kaydedilemedi. Lütfen birkaç saniye sonra yeniden deneyin.');
}

// Eskiden PDF'ler veritabanının içinde base64 olarak saklanıyordu; her değişiklikte bunların tamamı Blob'a
// yeniden yüklendiği için yazmalar yavaşlıyor ve zaman aşımına uğruyordu. Bu geçiş her PDF'i Blob'da ayrı
// bir nesneye taşır, satırdaki veriyi siler ve veritabanını küçültür. Tekrar çalışması zararsızdır.

// Bir tur: süre bütçesi dolana kadar PDF taşır, sonra veritabanını küçültüp kaydeder. Daha fazla kaldıysa true döner.
// Tek seferde hepsini taşımak bir sunucu örneğini uzun süre meşgul ediyor ve zaman sınırına takılabiliyordu.
export async function migrateInlinePdfsToBlob(opts: { maxPdfs?: number; budgetMs?: number } = {}): Promise<{ moved: number; more: boolean }> {
  const maxPdfs = opts.maxPdfs ?? 3;
  const budgetMs = opts.budgetMs ?? 20000;
  const { putFileToBlob } = await import('./blobStore.ts');
  const h = blobHandle();
  const started = Date.now();
  let moved = 0;
  let more = false;
  outer: for (const table of ['pdf_documents', 'exam_pdfs']) {
    let ids: string[] = [];
    try {
      const r = h.exec(`SELECT id FROM ${table} WHERE file_data IS NOT NULL AND length(file_data) > 50`);
      ids = r.length ? r[0].values.map(v => String(v[0])) : [];
    } catch {
      continue;
    }
    for (const id of ids) {
      if (moved > 0 && (moved >= maxPdfs || Date.now() - started > budgetMs)) { more = true; break outer; }
      const st = h.prepare(`SELECT file_data FROM ${table} WHERE id = ?`);
      st.bind([id]);
      const data = st.step() ? (st.getAsObject() as { file_data: string | null }).file_data : null;
      st.free();
      if (!data) continue;
      const pathname = `pdfs/${id}.pdf`;
      await putFileToBlob(pathname, Buffer.from(String(data), 'base64'), 'application/pdf');
      h.run(`UPDATE ${table} SET blob_path = ?, file_data = NULL WHERE id = ? AND file_data IS NOT NULL`, [pathname, id]);
      moved++;
    }
  }
  let chunks = 0;
  try {
    const r = h.exec('SELECT COUNT(*) FROM upload_chunks');
    chunks = Number(r[0]?.values[0][0] || 0);
    if (chunks) h.run('DELETE FROM upload_chunks');
  } catch {}
  if (moved || chunks) {
    try { shared.__appDb?.run('VACUUM'); } catch {}
    await commitDb();
    console.log(`PDF taşıma turu: ${moved} PDF Blob'a taşındı, ${chunks} eski yükleme parçası silindi${more ? '; devam edecek' : '; tamamlandı'}.`);
  }
  if (!more) shared.__pdfMigrationDone = true;
  return { moved, more };
}

// Depolama durumu (öğretmen tanılama ekranı için): veritabanı boyutu, taşınmayı bekleyen PDF'ler, yazılmamış değişiklikler
export async function getStorageStatus(): Promise<Record<string, unknown>> {
  const h = await getDb();
  const one = (sql: string) => { try { const r = h.exec(sql); return r.length ? r[0].values[0][0] : null; } catch { return null; } };
  const pageCount = Number(one('PRAGMA page_count') || 0);
  const pageSize = Number(one('PRAGMA page_size') || 0);
  return {
    blobSync: blobSyncEnabled(),
    dbSizeMb: Number(((pageCount * pageSize) / 1048576).toFixed(2)),
    pdfsInline: Number(one("SELECT COUNT(*) FROM pdf_documents WHERE file_data IS NOT NULL AND length(file_data) > 50") || 0),
    pdfsInBlob: Number(one('SELECT COUNT(*) FROM pdf_documents WHERE blob_path IS NOT NULL') || 0),
    uploadChunkRows: Number(one('SELECT COUNT(*) FROM upload_chunks') || 0),
    pendingWrites: pendingJournal().length,
    unsavedChanges: Boolean(shared.__blobDirty),
    migrationDone: Boolean(shared.__pdfMigrationDone),
  };
}

// Değişikliği yanıt gönderildikten sonra Blob'a yazar (Vercel bu işi bitene kadar örneği açık tutar).
// Aynı istekteki birden çok saveDb() tek bir yüklemede birleşir.
async function scheduleBlobFlush(): Promise<void> {
  if (shared.__blobFlushScheduled) return;
  shared.__blobFlushScheduled = true;
  const run = async () => {
    shared.__blobFlushScheduled = false;
    await flushToBlob();
  };
  try {
    const { after } = await import('next/server');
    after(run);
  } catch {
    // İstek bağlamı dışında (ör. betik): hemen yaz
    await run();
  }
}

async function flushToBlob(): Promise<void> {
  await withBlobLock(async () => {
    if (!shared.__appDb || !(shared.__blobDirty || pendingJournal().length > 0)) return;
    if (!shared.__blobSynced) {
      // Blob'daki asıl kopya hiç okunamadıysa yerel (eski olabilecek) kopyayla üzerine yazma
      console.error('Veritabanı Blob ile eşitlenmediği için değişiklik buluta yazılmadı.');
      return;
    }
    const { pushDbToBlob, pullDbFromBlob } = await import('./blobStore.ts');

    let networkFailures = 0;
    for (let attempt = 1; attempt <= 6; attempt++) {
      const pending = pendingJournal().length;
      shared.__blobDirty = false;
      const bytes = shared.__appDb!.export();
      let res;
      try {
        res = await pushDbToBlob(bytes, shared.__blobEtag);
      } catch (err) {
        shared.__blobDirty = true;
        networkFailures++;
        console.error(`Veritabanı Blob'a yazılamadı (deneme ${networkFailures}):`, err);
        // Geçici ağ/hizmet hatalarında kısa bekleyip yeniden dene; ısrar ederse vazgeç (çağıran hatayı görür)
        if (networkFailures >= 3) return;
        await new Promise(r => setTimeout(r, 400 * networkFailures));
        continue;
      }
      if (res.status === 'ok') {
        pendingJournal().splice(0, pending);
        shared.__journalFlushed = (shared.__journalFlushed || 0) + pending;
        shared.__blobEtag = res.etag;
        shared.__blobLastCheck = Date.now();
        if (pendingJournal().length > 0) shared.__blobDirty = true; // yükleme sürerken gelen yeni değişiklikler
        // Günde bir kez otomatik yedek (hata ana yazmayı etkilemez)
        const day = new Date().toISOString().slice(0, 10);
        const sh = shared as unknown as { __backupDay?: string };
        if (sh.__backupDay !== day) {
          sh.__backupDay = day;
          try {
            const { backupDbToBlob } = await import('./blobStore.ts');
            if ((await backupDbToBlob(bytes, day)) === 'created') console.log('Günlük veritabanı yedeği alındı:', day);
          } catch (err) {
            console.error('Günlük yedek alınamadı:', err);
          }
        }
        return;
      }

      // Çakışma: başka bir örnek bu arada yazmış. Onunkini ezmeden, en son kopyayı alıp değişikliklerimizi üstüne uygula.
      console.warn(`Blob yazma çakışması (deneme ${attempt}): uzak kopya alınıp ${pendingJournal().length} değişiklik yeniden uygulanıyor.`);
      try {
        const remote = await pullDbFromBlob(null);
        if (remote.status === 'changed') await adoptRemote(remote.bytes, remote.etag);
        else shared.__blobEtag = null; // uzak kopya yok olmuş: koşulsuz yaz
      } catch (err) {
        shared.__blobDirty = true;
        console.error('Çakışma sonrası uzak kopya alınamadı:', err);
        return;
      }
    }
    shared.__blobDirty = true;
    console.error('Blob çakışması 6 denemede çözülemedi; değişiklikler sonraki yazmada yeniden denenecek.');
  });
}

// Blob'daki kopya değiştiyse indirip bellekteki veritabanını onunla değiştirir (yazılmamış değişiklikler korunur).
async function refreshFromBlob(): Promise<void> {
  await flushToBlob();
  await withBlobLock(async () => {
    const { pullDbFromBlob, pushDbToBlob } = await import('./blobStore.ts');
    try {
      const res = await pullDbFromBlob(shared.__appDb && shared.__blobSynced ? shared.__blobEtag : null);
      if (res.status === 'changed') {
        await adoptRemote(res.bytes, res.etag);
      } else if (res.status === 'unchanged') {
        shared.__blobEtag = res.etag;
      } else {
        // Blob'da henüz kopya yok: projeyle gelen data/app.db'den başlat ve buluta yükle
        if (!shared.__appDb) shared.__appDb = instrument(await initDatabase());
        const put = await pushDbToBlob(shared.__appDb.export(), null);
        if (put.status === 'ok') shared.__blobEtag = put.etag;
        console.log('Veritabanının ilk kopyası Vercel Blob\'a yüklendi.');
      }
      shared.__blobSynced = true;
    } catch (err) {
      console.error('Vercel Blob okunamadı; geçici yerel kopya kullanılıyor:', err);
      if (!shared.__appDb) shared.__appDb = instrument(await initDatabase());
    }
    shared.__blobLastCheck = Date.now();
  });
}

async function getDbFromBlobStore(): Promise<Database> {
  const fresh = shared.__appDb && shared.__blobSynced && Date.now() - (shared.__blobLastCheck || 0) < BLOB_REFRESH_INTERVAL_MS;
  if (!fresh) {
    if (!shared.__blobRefresh) {
      shared.__blobRefresh = refreshFromBlob().finally(() => {
        shared.__blobRefresh = null;
      });
    }
    await shared.__blobRefresh;
  }
  return blobHandle();
}

export async function getDb(): Promise<Database> {
  if (blobSyncEnabled()) return getDbFromBlobStore();
  if (db) return db;
  if (shared.__appDb) {
    db = shared.__appDb;
    return db;
  }

  if (!shared.__appDbInit) {
    shared.__appDbInit = initDatabase().then((database) => {
      shared.__appDb = database;
      return database;
    });
  }
  initPromise = shared.__appDbInit;
  db = await initPromise;
  return db;
}

export function closeDb(): void {
  if (db) {
    saveDb(db);
    db.close();
    db = null;
    initPromise = null;
    shared.__appDb = null;
    shared.__appDbInit = null;
  }
}

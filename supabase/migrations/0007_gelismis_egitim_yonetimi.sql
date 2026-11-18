-- Supabase Migration: 0007_gelismis_egitim_yonetimi.sql
-- Matematik Akademi - Gelişmiş Eğitim Yönetimi, Akıllı Öğrenme ve Seviye Belirleme Sistemi

-- 1. Hazırbulunuşluk ve Başlangıç Seviye Belirleme Testleri
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  grade_level INTEGER DEFAULT 8,
  total_questions INTEGER DEFAULT 20,
  duration_minutes INTEGER DEFAULT 45,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Öğrenci Hazırbulunuşluk Değerlendirme Sonuçları
CREATE TABLE IF NOT EXISTS student_diagnostic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) DEFAULT 0.0,
  overall_level TEXT DEFAULT 'orta' CHECK (overall_level IN ('temel', 'gelismekte', 'orta', 'ileri', 'ust_duzey')),
  is_provisional BOOLEAN DEFAULT true, -- Yeterli gözlem yapılana kadar geçici
  confidence_rating NUMERIC(3,2) DEFAULT 0.65,
  
  -- Beceriler (0-100)
  calc_skill_score NUMERIC(5,2) DEFAULT 50.0,       -- İşlem Becerisi
  problem_solving_score NUMERIC(5,2) DEFAULT 50.0,  -- Problem Çözme Becerisi
  graphic_table_score NUMERIC(5,2) DEFAULT 50.0,    -- Grafik ve Tablo Yorumlama
  math_reasoning_score NUMERIC(5,2) DEFAULT 50.0,   -- Matematiksel Akıl Yürütme
  new_gen_score NUMERIC(5,2) DEFAULT 50.0,          -- Yeni Nesil Soru Becerisi
  time_management_score NUMERIC(5,2) DEFAULT 50.0,  -- Süre Yönetimi
  
  strong_topics_json JSONB DEFAULT '[]'::jsonb,
  weak_topics_json JSONB DEFAULT '[]'::jsonb,
  sub_outcome_deficits_json JSONB DEFAULT '[]'::jsonb,
  suggested_start_plan_json JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Akıllı Yanlış Analizi (10 Hata Türü)
CREATE TABLE IF NOT EXISTS smart_mistake_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  topic_id UUID REFERENCES curriculum_topics(id),
  subtopic_id UUID REFERENCES curriculum_topics(id),
  exam_id UUID,
  student_answer TEXT,
  correct_answer TEXT,
  
  -- 10 Hata Kategorisi
  primary_error_type TEXT NOT NULL CHECK (primary_error_type IN (
    'konu_eksikligi',       -- 1. Konu bilgisinin eksik olması
    'kural_hatasi',         -- 2. Formül veya kuralı yanlış kullanma
    'islem_hatasi',         -- 3. İşlem hatası
    'yanlis_okuma',         -- 4. Soruyu yanlış okuma
    'yanlis_yorumlama',     -- 5. Verilen bilgileri yanlış yorumlama
    'grafik_hatasi',        -- 6. Grafik veya tablo okuma hatası
    'model_kuramama',       -- 7. Matematiksel model kuramama
    'dikkat_hatasi',        -- 8. Dikkat hatası
    'sure_yetersizligi',    -- 9. Süre yetersizliği
    'yontem_bilmeme'        -- 10. Sorunun çözüm yöntemini bilmemesi
  )),
  ai_probability NUMERIC(3,2) DEFAULT 0.85,
  ai_reasoning_explanation TEXT NOT NULL,
  verified_by_teacher BOOLEAN DEFAULT false,
  verified_by_student BOOLEAN DEFAULT false,
  teacher_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Aralıklı Tekrar ve Unutma Riski Takibi
CREATE TABLE IF NOT EXISTS spaced_repetition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  source_type TEXT DEFAULT 'mistake' CHECK (source_type IN ('mistake', 'outcome', 'question', 'diagnostic')),
  source_id TEXT,
  question_text TEXT,
  
  -- Ebbinghaus ve Süpermemo parametreleri
  repetition_level INTEGER DEFAULT 1, -- 1: 1 gün, 2: 3 gün, 3: 7 gün, 4: 14 gün, 5: 30 gün
  ease_factor NUMERIC(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ DEFAULT now(),
  next_review_at TIMESTAMPTZ NOT NULL,
  last_performance TEXT DEFAULT 'incorrect' CHECK (last_performance IN ('correct', 'incorrect', 'blank')),
  
  -- Unutma riski (düşük, orta, yüksek)
  forgetting_risk TEXT DEFAULT 'orta' CHECK (forgetting_risk IN ('dusuk', 'orta', 'yuksek')),
  is_mastered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Akıllı Günlük Hedefler ve Çalışma Planı
CREATE TABLE IF NOT EXISTS daily_student_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ id, type: 'topic_review'|'medium_questions'|'spaced_repetition'|'new_gen', title, durationMin, questionCount, completed: false }]
  total_minutes INTEGER DEFAULT 45,
  total_questions INTEGER DEFAULT 35,
  completed_minutes INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,
  is_fully_completed BOOLEAN DEFAULT false,
  rolled_over_to_next_day BOOLEAN DEFAULT false,
  teacher_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Öğretmen Ders Takvimi ve Planlama
CREATE TABLE IF NOT EXISTS teacher_lesson_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  start_time TEXT NOT NULL, -- ör: '16:30'
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  topic_id UUID REFERENCES curriculum_topics(id),
  planned_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Ders Geçmişi ve Öğretmen Ders Kayıtları
CREATE TABLE IF NOT EXISTS lesson_history_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES teacher_lesson_schedules(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  topic_id UUID REFERENCES curriculum_topics(id),
  subtopics_covered TEXT,
  questions_solved_count INTEGER DEFAULT 0,
  student_performance_rating INTEGER DEFAULT 4 CHECK (student_performance_rating BETWEEN 1 AND 5),
  teacher_private_notes TEXT,
  teacher_parent_notes TEXT, -- Veliye açık paylaşılan not
  assigned_homework TEXT,
  next_lesson_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Ödev ve Görev Takip Sistemi
CREATE TABLE IF NOT EXISTS student_homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES curriculum_topics(id),
  question_count INTEGER DEFAULT 15,
  difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  source_type TEXT DEFAULT 'question_bank',
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'overdue')),
  completed_question_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  completion_percentage NUMERIC(5,2) DEFAULT 0.0,
  completed_at TIMESTAMPTZ,
  share_with_parent BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Matematik Konu Anlatımı ve Mini Dersler
CREATE TABLE IF NOT EXISTS mini_lesson_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  formulas_json JSONB DEFAULT '[]'::jsonb,
  solved_examples_json JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  pdf_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Öğrenci Başarı ve Motivasyon Rozetleri
CREATE TABLE IF NOT EXISTS student_achievement_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  badge_title TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  category TEXT DEFAULT 'general',
  earned_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Sınav Takvimi ve Hedef Yönetimi
CREATE TABLE IF NOT EXISTS exam_countdown_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_title TEXT NOT NULL DEFAULT 'LGS 2027',
  target_date DATE NOT NULL DEFAULT '2027-06-06',
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Soru Kalitesi ve Yapay Zekâ Denetim Kayıtları
CREATE TABLE IF NOT EXISTS question_quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  math_accuracy BOOLEAN DEFAULT true,
  single_correct_answer BOOLEAN DEFAULT true,
  option_consistency BOOLEAN DEFAULT true,
  root_clarity BOOLEAN DEFAULT true,
  grammar_correctness BOOLEAN DEFAULT true,
  curriculum_alignment BOOLEAN DEFAULT true,
  difficulty_consistency BOOLEAN DEFAULT true,
  svg_accuracy BOOLEAN DEFAULT true,
  similarity_ratio NUMERIC(4,2) DEFAULT 0.05,
  solution_accuracy BOOLEAN DEFAULT true,
  audit_verdict TEXT DEFAULT 'approved' CHECK (audit_verdict IN ('approved', 'needs_review', 'rejected')),
  audit_notes TEXT,
  audited_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Haftalık ve Aylık Veli Gelişim Raporları
CREATE TABLE IF NOT EXISTS parent_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  empty_count INTEGER DEFAULT 0,
  completed_homeworks INTEGER DEFAULT 0,
  total_homeworks INTEGER DEFAULT 0,
  attended_exams INTEGER DEFAULT 0,
  net_change NUMERIC(5,2) DEFAULT 0.0,
  topics_summary JSONB DEFAULT '[]'::jsonb,
  next_week_goals TEXT,
  teacher_message TEXT,
  is_approved_by_teacher BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'approved', 'published')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Akıllı Deneme Sonrası 10 Bölümlü Değerlendirme Raporları
CREATE TABLE IF NOT EXISTS post_exam_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID,
  summary_json JSONB DEFAULT '{}'::jsonb,
  topics_json JSONB DEFAULT '[]'::jsonb,
  subtopics_json JSONB DEFAULT '[]'::jsonb,
  difficulty_json JSONB DEFAULT '{}'::jsonb,
  time_management_json JSONB DEFAULT '{}'::jsonb,
  mistake_reasons_json JSONB DEFAULT '[]'::jsonb,
  previous_comparison_json JSONB DEFAULT '{}'::jsonb,
  strengths_text TEXT,
  priorities_text TEXT,
  study_recommendations TEXT,
  ai_evaluation_text TEXT,
  teacher_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Sistem Denetim ve Güvenlik Günlüğü
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

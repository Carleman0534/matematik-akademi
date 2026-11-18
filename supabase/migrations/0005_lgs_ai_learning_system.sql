-- Supabase Migration: 0005_lgs_ai_learning_system.sql
-- LGS Matematik Müfredatı, Yapay Zekâ Soru Üretimi, Çoklu PDF Analizi ve Kişiselleştirilmiş Öğrenme Sistemi

-- 1. LGS Müfredat Konuları (Ağaç yapısı, sınırsız alt konu)
CREATE TABLE IF NOT EXISTS curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  grade_level INTEGER DEFAULT 8,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kazanımlar
CREATE TABLE IF NOT EXISTS curriculum_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  cognitive_level TEXT DEFAULT 'kavrama',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PDF Analiz Görevleri
CREATE TABLE IF NOT EXISTS pdf_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'awaiting_approval', 'completed', 'error')),
  page_count INTEGER DEFAULT 1,
  detected_question_count INTEGER DEFAULT 0,
  summary_json JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(4,2) DEFAULT 0.85,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4. PDF'ten Çıkarılan Sorular
CREATE TABLE IF NOT EXISTS pdf_extracted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES pdf_analysis_jobs(id) ON DELETE CASCADE,
  pdf_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,
  question_no INTEGER NOT NULL,
  page_no INTEGER NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}'::jsonb,
  correct_answer TEXT,
  primary_topic_id UUID REFERENCES curriculum_topics(id),
  secondary_topic_id UUID REFERENCES curriculum_topics(id),
  outcome_id UUID REFERENCES curriculum_outcomes(id),
  question_type TEXT DEFAULT 'yeni_nesil',
  difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  crop_box_json JSONB DEFAULT '{"x":0,"y":0,"w":100,"h":100}'::jsonb,
  image_url TEXT,
  confidence NUMERIC(4,2) DEFAULT 0.90,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'edited')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Çoklu Konu İlişkileri
CREATE TABLE IF NOT EXISTS question_topic_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'primary' CHECK (relation_type IN ('primary', 'secondary', 'prerequisite')),
  weight NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Soru Beceri Etiketleri
CREATE TABLE IF NOT EXISTS question_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Yapay Zekâ Soru Üretim Görevleri
CREATE TABLE IF NOT EXISTS question_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  primary_topic_id UUID REFERENCES curriculum_topics(id),
  subtopic_id UUID REFERENCES curriculum_topics(id),
  requested_count INTEGER DEFAULT 5,
  difficulty INTEGER DEFAULT 3,
  question_type TEXT DEFAULT 'yeni_nesil',
  visual_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'awaiting_approval', 'completed', 'error')),
  prompt_snapshot TEXT,
  model_name TEXT DEFAULT 'gemini-2.5-flash',
  cost_tokens INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Yapay Zekâ Tarafından Üretilen Sorular
CREATE TABLE IF NOT EXISTS ai_generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES question_generation_jobs(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  primary_topic_id UUID REFERENCES curriculum_topics(id),
  secondary_topic_id UUID REFERENCES curriculum_topics(id),
  outcome_id UUID REFERENCES curriculum_outcomes(id),
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}'::jsonb,
  correct_answer TEXT NOT NULL,
  solution_explanation TEXT NOT NULL,
  difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  question_type TEXT DEFAULT 'yeni_nesil',
  skill_category TEXT,
  svg_content TEXT,
  math_validation_status TEXT DEFAULT 'verified' CHECK (math_validation_status IN ('unverified', 'verified', 'warning', 'failed')),
  validation_details_json JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'validation_pending', 'awaiting_teacher', 'approved', 'assigned', 'archived', 'rejected')),
  source_reference_type TEXT DEFAULT 'original_ai',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Soru Matematiksel Doğrulama Sonuçları
CREATE TABLE IF NOT EXISTS question_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  is_mathematically_sound BOOLEAN DEFAULT true,
  single_correct_answer BOOLEAN DEFAULT true,
  options_valid BOOLEAN DEFAULT true,
  similarity_score NUMERIC(4,2) DEFAULT 0.0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Öğrenci Öğrenme Profili
CREATE TABLE IF NOT EXISTS learning_profiles (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  overall_math_score NUMERIC(5,2) DEFAULT 50.0,
  calculated_level TEXT DEFAULT 'orta',
  total_questions_solved INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_wrong INTEGER DEFAULT 0,
  total_blank INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Öğrenci Konu Bazlı Performansı
CREATE TABLE IF NOT EXISTS student_topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2) DEFAULT 0.0,
  status TEXT DEFAULT 'needs_data' CHECK (status IN ('needs_data', 'critical_weak', 'improving', 'good', 'mastered')),
  confidence_level NUMERIC(3,2) DEFAULT 0.0,
  solved_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  blank_count INTEGER DEFAULT 0,
  avg_duration_seconds NUMERIC(6,1) DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  trend TEXT DEFAULT 'stable',
  UNIQUE (student_id, topic_id)
);

-- 12. Kişiselleştirilmiş Öğrenme Önerileri
CREATE TABLE IF NOT EXISTS learning_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id),
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  recommended_counts_json JSONB DEFAULT '{"easy":5,"medium":10,"hard":5}'::jsonb,
  is_approved_by_teacher BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Kişiselleştirilmiş Çalışma Planları
CREATE TABLE IF NOT EXISTS personalized_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic_ids_json JSONB DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 10,
  estimated_duration_min INTEGER DEFAULT 30,
  difficulty_mix TEXT DEFAULT 'Orta Ağırlıklı',
  is_adaptive BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ
);

-- 14. Çalışma Planı Soruları
CREATE TABLE IF NOT EXISTS study_plan_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES personalized_study_plans(id) ON DELETE CASCADE,
  question_source TEXT DEFAULT 'ai_generated' CHECK (question_source IN ('extracted_pdf', 'ai_generated', 'bank')),
  source_question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}'::jsonb,
  correct_answer TEXT NOT NULL,
  solution_explanation TEXT,
  svg_content TEXT,
  topic_id UUID REFERENCES curriculum_topics(id),
  difficulty INTEGER DEFAULT 3,
  question_type TEXT DEFAULT 'yeni_nesil',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Öğrenci Çalışma Oturumları
CREATE TABLE IF NOT EXISTS student_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES personalized_study_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
  current_question_index INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  blank_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 16. Öğrenme Olayları
CREATE TABLE IF NOT EXISTS student_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID,
  plan_id UUID,
  question_id TEXT,
  topic_id UUID,
  student_answer TEXT,
  is_correct BOOLEAN,
  duration_seconds INTEGER,
  cognitive_trigger TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Soru Benzerlik Kontrolleri
CREATE TABLE IF NOT EXISTS question_similarity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_a_id TEXT NOT NULL,
  question_b_id TEXT NOT NULL,
  similarity_ratio NUMERIC(4,3) NOT NULL,
  is_duplicate BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Yapay Zekâ Üretim ve Maliyet Kayıtları
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  provider TEXT DEFAULT 'google-gemini',
  model TEXT DEFAULT 'gemini-2.5-flash',
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(8,5) DEFAULT 0.0,
  purpose TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_parent ON curriculum_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_outcomes_topic ON curriculum_outcomes(topic_id);
CREATE INDEX IF NOT EXISTS idx_pdf_extracted_topic ON pdf_extracted_questions(primary_topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_topic ON ai_generated_questions(primary_topic_id);
CREATE INDEX IF NOT EXISTS idx_student_topic_perf ON student_topic_performance(student_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_student ON personalized_study_plans(student_id);

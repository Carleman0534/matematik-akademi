-- Supabase Migration: 0006_veli_modulu.sql
-- Veli Hesabı, Öğrenci-Veli İlişkilendirmesi, Yetkilendirme ve Veli Takip Portalı

-- 1. Öğrenci - Veli İlişki Tablosu (Çoktan çoğa)
CREATE TABLE IF NOT EXISTS student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'anne' CHECK (relationship_type IN ('anne', 'baba', 'vasi', 'diger')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passive', 'pending_invitation')),
  verified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, guardian_user_id)
);

-- 2. Veli Profilleri Tablosu
CREATE TABLE IF NOT EXISTS guardian_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  notification_preferences JSONB DEFAULT '{"exam_completed":true,"report_shared":true,"study_assigned":true}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Veli Görünürlük ve Rapor İzinleri (Öğretmen Kontrollü)
CREATE TABLE IF NOT EXISTS guardian_report_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_exam_results BOOLEAN DEFAULT true,
  show_question_details BOOLEAN DEFAULT true,
  show_topic_analytics BOOLEAN DEFAULT true,
  show_assignments BOOLEAN DEFAULT true,
  show_teacher_notes BOOLEAN DEFAULT true,
  show_progress_reports BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, guardian_user_id)
);

-- 4. Veli Bildirimleri
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'general' CHECK (notification_type IN ('exam_result', 'assignment_new', 'teacher_note', 'topic_update', 'general')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Öğretmen - Veli İletişim / Notları
CREATE TABLE IF NOT EXISTS guardian_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_teacher BOOLEAN DEFAULT true,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON student_guardians(guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notif_guardian ON guardian_notifications(guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_messages_student ON guardian_messages(student_id);

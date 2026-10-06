-- ==============================================================================
-- Migration: Enable Row Level Security (RLS) on PostgreSQL Tables
-- Protects Supabase PostgREST endpoints from unauthorized anon/public access
-- ==============================================================================

-- Enable RLS on core user and group tables
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CenterGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserSession" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on courses, lessons, and content
ALTER TABLE IF EXISTS "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CourseEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "LessonQuiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VideoProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VideoUpload" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on assessments, exams, attempts, and questions
ALTER TABLE IF EXISTS "Assessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AssessmentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExternalExamAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TemporaryAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExamAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExamViolation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Homework" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "QuestionBank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "StudentRiskHistory" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on attendance, payments, notifications, chat, and AI solutions
ALTER TABLE IF EXISTS "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SavedMathSolution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "DailyPlatformStats" ENABLE ROW LEVEL SECURITY;

-- Ensure service_role and postgres superuser/backend connections retain full access
-- Supabase PostgREST anon role is denied all operations by default under RLS
DO $$
BEGIN
  -- Grant service_role full privileges if role exists (Supabase environment)
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
  END IF;
END $$;

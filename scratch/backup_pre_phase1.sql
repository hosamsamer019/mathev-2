--
-- PostgreSQL database dump
--

\restrict culu5UTIwVNf3dtzGuv5OfzUCRVpmk1WjZT33g03D4LryqBWLfXkWQYLBbkWD7n

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AcademicLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AcademicLevel" AS ENUM (
    'PREP_1',
    'PREP_2',
    'PREP_3',
    'SEC_1',
    'SEC_2',
    'SEC_3'
);


ALTER TYPE public."AcademicLevel" OWNER TO postgres;

--
-- Name: AssessmentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AssessmentType" AS ENUM (
    'ASSIGNMENT',
    'QUIZ',
    'EXAM'
);


ALTER TYPE public."AssessmentType" OWNER TO postgres;

--
-- Name: AttemptStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttemptStatus" AS ENUM (
    'STARTED',
    'IN_PROGRESS',
    'SUBMITTED',
    'TIME_EXPIRED',
    'GRADED',
    'CHEATING'
);


ALTER TYPE public."AttemptStatus" OWNER TO postgres;

--
-- Name: CountryCode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CountryCode" AS ENUM (
    'EG'
);


ALTER TYPE public."CountryCode" OWNER TO postgres;

--
-- Name: EducationLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EducationLevel" AS ENUM (
    'PRIMARY',
    'PREPARATORY',
    'SECONDARY',
    'UNIVERSITY',
    'OTHER'
);


ALTER TYPE public."EducationLevel" OWNER TO postgres;

--
-- Name: GradeLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GradeLevel" AS ENUM (
    'PRIMARY_1',
    'PRIMARY_2',
    'PRIMARY_3',
    'PRIMARY_4',
    'PRIMARY_5',
    'PRIMARY_6',
    'PREPARATORY_1',
    'PREPARATORY_2',
    'PREPARATORY_3',
    'SECONDARY_1',
    'SECONDARY_2',
    'SECONDARY_3',
    'OTHER'
);


ALTER TYPE public."GradeLevel" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'TEACHER',
    'ONLINE_STUDENT',
    'CENTER_STUDENT',
    'PARENT'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: UploadStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UploadStatus" AS ENUM (
    'PENDING',
    'UPLOADING',
    'UPLOAD_COMPLETED',
    'PROCESSING',
    'TRANSCODING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."UploadStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Assessment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Assessment" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    type public."AssessmentType" NOT NULL,
    "courseId" text NOT NULL,
    "lessonId" text,
    "teacherId" text NOT NULL,
    "openAt" timestamp(3) without time zone,
    "closeAt" timestamp(3) without time zone,
    "durationMinutes" integer,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "totalPoints" double precision DEFAULT 100 NOT NULL,
    questions jsonb,
    "passingScore" double precision,
    "showResult" boolean DEFAULT true NOT NULL,
    randomization boolean DEFAULT false NOT NULL,
    "requiresCamera" boolean DEFAULT false NOT NULL,
    "allowExternalStudents" boolean DEFAULT false NOT NULL,
    "examAccessCode" text,
    "allowedIps" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Assessment" OWNER TO postgres;

--
-- Name: AssessmentAttempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AssessmentAttempt" (
    id text NOT NULL,
    "assessmentId" text NOT NULL,
    "studentId" text NOT NULL,
    status public."AttemptStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "submittedAt" timestamp(3) without time zone,
    score double precision,
    "totalPoints" double precision,
    percentage double precision,
    answers jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "violationCount" integer DEFAULT 0 NOT NULL,
    "cheatingDetected" boolean DEFAULT false NOT NULL,
    "cheatingReason" text,
    "cheatingDetectedAt" timestamp(3) without time zone,
    violations jsonb,
    "ipAddress" text,
    "userAgent" text
);


ALTER TABLE public."AssessmentAttempt" OWNER TO postgres;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO postgres;

--
-- Name: CenterGroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CenterGroup" (
    id text NOT NULL,
    name text NOT NULL,
    schedule text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CenterGroup" OWNER TO postgres;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tokens integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO postgres;

--
-- Name: ChatSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChatSession" OWNER TO postgres;

--
-- Name: Course; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Course" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "teacherId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    category text,
    price double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'PUBLISHED'::text NOT NULL,
    "academicLevel" public."AcademicLevel",
    country public."CountryCode",
    "educationLevel" public."EducationLevel",
    "gradeLevel" public."GradeLevel"
);


ALTER TABLE public."Course" OWNER TO postgres;

--
-- Name: CourseEnrollment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CourseEnrollment" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "courseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CourseEnrollment" OWNER TO postgres;

--
-- Name: DailyPlatformStats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DailyPlatformStats" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "usersCount" integer DEFAULT 0 NOT NULL,
    "activeUsers" integer DEFAULT 0 NOT NULL,
    "videosWatched" integer DEFAULT 0 NOT NULL,
    "examsCompleted" integer DEFAULT 0 NOT NULL,
    revenue double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyPlatformStats" OWNER TO postgres;

--
-- Name: Exam; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Exam" (
    id text NOT NULL,
    title text NOT NULL,
    "courseId" text NOT NULL,
    duration integer DEFAULT 60 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    questions jsonb,
    "requiresCamera" boolean DEFAULT false NOT NULL,
    "endTime" timestamp(3) without time zone,
    "passingScore" double precision DEFAULT 50 NOT NULL,
    randomization boolean DEFAULT false NOT NULL,
    "startTime" timestamp(3) without time zone,
    "instantGrading" boolean DEFAULT true NOT NULL,
    "showResult" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Exam" OWNER TO postgres;

--
-- Name: ExamAttempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExamAttempt" (
    id text NOT NULL,
    "examId" text NOT NULL,
    score double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "studentId" text NOT NULL,
    answers jsonb
);


ALTER TABLE public."ExamAttempt" OWNER TO postgres;

--
-- Name: ExamViolation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExamViolation" (
    id text NOT NULL,
    "attemptId" text NOT NULL,
    type text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ExamViolation" OWNER TO postgres;

--
-- Name: ExternalExamAttempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExternalExamAttempt" (
    id text NOT NULL,
    "assessmentId" text NOT NULL,
    "studentName" text NOT NULL,
    phone text,
    "accessSessionId" text,
    "ipAddress" text,
    "userAgent" text,
    answers jsonb,
    score double precision,
    percentage double precision,
    status public."AttemptStatus" DEFAULT 'STARTED'::public."AttemptStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "violationCount" integer DEFAULT 0 NOT NULL,
    "cheatingDetected" boolean DEFAULT false NOT NULL,
    "cheatingReason" text,
    "cheatingDetectedAt" timestamp(3) without time zone,
    violations jsonb
);


ALTER TABLE public."ExternalExamAttempt" OWNER TO postgres;

--
-- Name: Homework; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Homework" (
    id text NOT NULL,
    title text NOT NULL,
    "courseId" text NOT NULL,
    deadline timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    questions jsonb,
    "lessonId" text,
    "closeAt" timestamp(3) without time zone,
    duration integer,
    "openAt" timestamp(3) without time zone,
    type text DEFAULT 'NORMAL'::text NOT NULL,
    "videoId" text
);


ALTER TABLE public."Homework" OWNER TO postgres;

--
-- Name: Lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Lesson" (
    id text NOT NULL,
    title text NOT NULL,
    "videoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "courseId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pdfUrl" text
);


ALTER TABLE public."Lesson" OWNER TO postgres;

--
-- Name: LessonQuiz; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LessonQuiz" (
    id text NOT NULL,
    "lessonId" text NOT NULL,
    "timestampSec" double precision NOT NULL,
    question text NOT NULL,
    options text[],
    "correctAnswer" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LessonQuiz" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "courseId" text,
    currency text DEFAULT 'EGP'::text NOT NULL,
    metadata jsonb,
    provider text,
    "providerOrderId" text,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: QuestionBank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."QuestionBank" (
    id text NOT NULL,
    text text NOT NULL,
    type text DEFAULT 'MCQ'::text NOT NULL,
    options jsonb NOT NULL,
    "correctAnswer" integer,
    explanation text,
    tag text,
    subject text,
    topic text,
    difficulty text,
    "academicLevel" public."AcademicLevel",
    country public."CountryCode",
    "educationLevel" public."EducationLevel",
    "gradeLevel" public."GradeLevel",
    "mathExpression" text,
    diagram jsonb,
    "solutionSteps" jsonb,
    given jsonb,
    required text,
    "generationLogic" jsonb,
    "solutionExplanation" text,
    "validationStatus" text,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    "creatorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."QuestionBank" OWNER TO postgres;

--
-- Name: SavedMathSolution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SavedMathSolution" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    problem text NOT NULL,
    solution jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SavedMathSolution" OWNER TO postgres;

--
-- Name: StudentRiskHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StudentRiskHistory" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "lessonId" text NOT NULL,
    "riskLevel" text NOT NULL,
    "riskCode" text NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolutionCode" text
);


ALTER TABLE public."StudentRiskHistory" OWNER TO postgres;

--
-- Name: Submission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Submission" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "homeworkId" text NOT NULL,
    grade double precision,
    url text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    answers jsonb
);


ALTER TABLE public."Submission" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "centerGroupId" text,
    "parentId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    role public."Role" NOT NULL,
    "academicLevel" public."AcademicLevel",
    country public."CountryCode",
    "educationLevel" public."EducationLevel",
    "gradeLevel" public."GradeLevel",
    language text DEFAULT 'ar'::text NOT NULL,
    phone text,
    "isGuest" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deviceName" text,
    "ipAddress" text,
    "refreshTokenHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


ALTER TABLE public."UserSession" OWNER TO postgres;

--
-- Name: VideoProgress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoProgress" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "lessonId" text NOT NULL,
    watched boolean DEFAULT false NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastTimestamp" double precision DEFAULT 0 NOT NULL,
    "answeredQuizzes" jsonb,
    status text DEFAULT 'NOT_STARTED'::text NOT NULL,
    "firstOpenedAt" timestamp(3) without time zone,
    "firstActivityAt" timestamp(3) without time zone,
    "lastActivityAt" timestamp(3) without time zone,
    "lastProgressUpdateAt" timestamp(3) without time zone,
    "totalWatchTimeSec" integer DEFAULT 0 NOT NULL,
    "watchSessionsCount" integer DEFAULT 0 NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "completionSource" text DEFAULT 'NONE'::text NOT NULL,
    "currentRiskLevel" text DEFAULT 'NONE'::text NOT NULL,
    "currentRiskCode" text,
    "riskDetectedAt" timestamp(3) without time zone
);


ALTER TABLE public."VideoProgress" OWNER TO postgres;

--
-- Name: VideoUpload; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VideoUpload" (
    id text NOT NULL,
    "userId" text NOT NULL,
    filename text NOT NULL,
    "storagePath" text NOT NULL,
    status public."UploadStatus" DEFAULT 'PENDING'::public."UploadStatus" NOT NULL,
    "fileSize" bigint,
    "mimeType" text,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."VideoUpload" OWNER TO postgres;

--
-- Data for Name: Assessment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Assessment" (id, title, description, type, "courseId", "lessonId", "teacherId", "openAt", "closeAt", "durationMinutes", status, "totalPoints", questions, "passingScore", "showResult", randomization, "requiresCamera", "allowExternalStudents", "examAccessCode", "allowedIps", "createdAt", "updatedAt") FROM stdin;
26db131c-b76c-4a5a-9220-cc99d1ee35ec	RegExam 1790347385980	\N	EXAM	04666bff-e94b-475c-8312-525429010b49	\N	c5320162-aa5b-4105-ae72-43e332b72c4a	\N	\N	60	PUBLISHED	100	[{"id": 1, "text": "2+2=?", "type": "mcq", "correct": 1, "options": ["3", "4", "5", "6"]}, {"id": 2, "text": "3+3=?", "type": "mcq", "correct": 1, "options": ["5", "6", "7", "8"]}]	50	t	f	f	f	\N	\N	2026-09-25 14:43:07.77	2026-09-25 14:43:07.77
f8a240bb-cf09-4422-955c-e2a497579dab	SpoofExam 1790347385980	\N	EXAM	04666bff-e94b-475c-8312-525429010b49	\N	c5320162-aa5b-4105-ae72-43e332b72c4a	\N	\N	60	PUBLISHED	100	[{"id": 1, "text": "1+1=?", "type": "mcq", "correct": 1, "options": ["1", "2", "3"]}]	50	t	f	f	f	\N	\N	2026-09-25 14:43:10.265	2026-09-25 14:43:10.265
020d884b-43ea-4016-ab41-3ac59d2ebe79	RegHW 1790347385980	\N	ASSIGNMENT	04666bff-e94b-475c-8312-525429010b49	\N	c5320162-aa5b-4105-ae72-43e332b72c4a	\N	\N	\N	PUBLISHED	100	[{"id": 1, "text": "5*5=?", "type": "mcq", "correct": 1, "options": ["20", "25", "30"]}]	\N	t	f	f	f	\N	\N	2026-09-25 14:43:10.392	2026-09-25 14:43:10.392
51f5b5f7-51f4-47f5-84b4-547ef106d5fe	Calculus Exam 1790347400231	\N	EXAM	09da54d5-7133-49b1-9366-142d63950e96	\N	4583a6af-f342-44a5-99a6-94818e1ac3b7	\N	\N	45	PUBLISHED	100	[{"id": "q1", "text": "ما هو ناتج $\\\\lim_{x \\\\to 0} \\\\frac{\\\\sin x}{x}$؟", "type": "multiple_choice", "points": 10, "correct": "1", "options": ["0", "1", "\\\\infty", "غير معرف"]}, {"id": "q2", "text": "مشتقة $f(x) = x^3$ هي $3x^2$", "type": "true_false", "points": 10, "correct": "صواب", "options": ["صواب", "خطأ"]}, {"id": "q3", "text": "أوجد قيمة $\\\\int 2x dx$", "type": "multiple_choice", "points": 10, "correct": "x^2 + C", "options": ["x^2 + C", "2x^2 + C", "x + C", "2 + C"]}]	60	t	f	f	t	RACE-K58Q-PBYU	\N	2026-09-25 14:43:20.656	2026-09-25 14:43:20.656
0759053e-3947-4ee2-a417-4b20e1a03182	Security Test Exam 1790347730291	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 12:48:50.214	2026-09-25 16:48:50.214	30	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	UE3R-6LTA-XVRH	\N	2026-09-25 14:48:50.307	2026-09-25 14:48:50.307
e435e3d9-b81b-47ba-b956-781fbf09fa22	Security Test Exam 1790347730334	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 16:48:50.214	2026-09-25 17:48:50.214	30	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	SLCB-9JWH-HN99	\N	2026-09-25 14:48:50.344	2026-09-25 14:48:50.344
04e817f9-b5bb-4c84-805b-58c2b4e39485	Security Test Exam 1790347730364	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 10:48:50.214	2026-09-25 13:48:50.214	30	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	UEMQ-UAML-YU4J	\N	2026-09-25 14:48:50.376	2026-09-25 14:48:50.376
572db76b-5737-4057-815f-0d79efb21504	Security Test Exam 1790347731033	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 13:48:51.021	2026-09-25 14:58:51.021	5	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	N58Y-5RTM-S2NH	\N	2026-09-25 14:48:51.044	2026-09-25 14:48:51.044
2d0c1a46-31bc-4b2d-9ac4-4a2cdffd1e11	Security Test Exam 1790347731126	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 13:48:51.115	2026-09-25 14:58:51.115	5	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	4BFJ-2J47-HQN7	\N	2026-09-25 14:48:51.138	2026-09-25 14:48:51.138
7ba5e33e-7ebc-482a-82f6-7e93870aeaa3	Security Test Exam 1790347731213	\N	EXAM	4ecad822-3591-4604-ab96-bc794de98af3	\N	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 13:48:51.201	2026-09-25 14:58:51.201	5	PUBLISHED	100	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	50	t	f	f	t	Z52K-8YET-NL48	\N	2026-09-25 14:48:51.23	2026-09-25 14:48:51.23
\.


--
-- Data for Name: AssessmentAttempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AssessmentAttempt" (id, "assessmentId", "studentId", status, "startedAt", "expiresAt", "submittedAt", score, "totalPoints", percentage, answers, "createdAt", "updatedAt", "violationCount", "cheatingDetected", "cheatingReason", "cheatingDetectedAt", violations, "ipAddress", "userAgent") FROM stdin;
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Attendance" (id, "studentId", date, status, "createdAt") FROM stdin;
05747b9b-9b6e-454c-a824-358e5893594b	b4099d5f-add1-425c-9a75-77ffcabfc31a	2026-09-25 14:43:10.526	PRESENT	2026-09-25 14:43:10.55
\.


--
-- Data for Name: CenterGroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CenterGroup" (id, name, schedule, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessage" (id, "sessionId", role, content, tokens, "createdAt") FROM stdin;
\.


--
-- Data for Name: ChatSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatSession" (id, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Course" (id, title, description, "createdAt", "teacherId", "updatedAt", category, price, status, "academicLevel", country, "educationLevel", "gradeLevel") FROM stdin;
d0e6aa8d-74a5-46f5-8316-3d48d1a8b900	Test Course	Test	2026-09-25 14:16:26.044	2f430041-6de8-46e2-954a-cc88b74a5f63	2026-09-25 14:16:26.044	\N	100	PUBLISHED	\N	\N	\N	\N
04666bff-e94b-475c-8312-525429010b49	RegCourse 1790347385980	\N	2026-09-25 14:43:07.247	c5320162-aa5b-4105-ae72-43e332b72c4a	2026-09-25 14:43:07.247	\N	0	PUBLISHED	\N	\N	\N	\N
09da54d5-7133-49b1-9366-142d63950e96	Math Course 1790347400231	Calculus and Geometry	2026-09-25 14:43:20.644	4583a6af-f342-44a5-99a6-94818e1ac3b7	2026-09-25 14:43:20.644	\N	0	PUBLISHED	\N	\N	\N	\N
a3d44ef5-440a-404b-8756-3dcd4a14f67b	Math 101	\N	2026-09-25 14:43:33.744	91e8f61d-c1b7-4f20-99f8-51af835357ac	2026-09-25 14:43:33.744	Algebra	0	PUBLISHED	\N	\N	\N	\N
66cf5115-3bd1-4418-8076-041d36e43aca	T2 Math	\N	2026-09-25 14:43:33.839	0116fa3c-1303-4259-9e29-041706c30aa2	2026-09-25 14:43:33.839	Geo	0	PUBLISHED	\N	\N	\N	\N
4ecad822-3591-4604-ab96-bc794de98af3	Security Test Course 1790347730266	\N	2026-09-25 14:48:50.275	241f4d56-16c7-4c60-8d9b-3a273159fcb1	2026-09-25 14:48:50.275	\N	0	PUBLISHED	\N	\N	\N	\N
\.


--
-- Data for Name: CourseEnrollment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CourseEnrollment" (id, "studentId", "courseId", "createdAt") FROM stdin;
b9469e2d-10a2-44cf-a607-4997afcb5314	879f0bfa-e3c7-4e3d-ba64-80e92a75874f	d0e6aa8d-74a5-46f5-8316-3d48d1a8b900	2026-09-25 14:16:26.1
577e8f2b-cad5-422a-9346-00c72d906df5	b4099d5f-add1-425c-9a75-77ffcabfc31a	04666bff-e94b-475c-8312-525429010b49	2026-09-25 14:43:07.312
2dc02543-b3ce-4476-9108-811b99bbb370	c88b244a-eb14-4c04-a7dc-3a0225ca4c26	a3d44ef5-440a-404b-8756-3dcd4a14f67b	2026-09-25 14:43:33.793
\.


--
-- Data for Name: DailyPlatformStats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DailyPlatformStats" (id, date, "usersCount", "activeUsers", "videosWatched", "examsCompleted", revenue, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Exam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Exam" (id, title, "courseId", duration, "createdAt", "updatedAt", questions, "requiresCamera", "endTime", "passingScore", randomization, "startTime", "instantGrading", "showResult") FROM stdin;
f8a240bb-cf09-4422-955c-e2a497579dab	SpoofExam 1790347385980	04666bff-e94b-475c-8312-525429010b49	60	2026-09-25 14:43:10.257	2026-09-25 14:43:10.257	[{"id": 1, "text": "1+1=?", "type": "mcq", "correct": 1, "options": ["1", "2", "3"]}]	f	\N	50	f	\N	t	t
572db76b-5737-4057-815f-0d79efb21504	Security Test Exam 1790347731033	4ecad822-3591-4604-ab96-bc794de98af3	5	2026-09-25 14:48:51.039	2026-09-25 14:48:51.039	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	f	2026-09-25 14:58:51.021	50	f	2026-09-25 13:48:51.021	t	t
2d0c1a46-31bc-4b2d-9ac4-4a2cdffd1e11	Security Test Exam 1790347731126	4ecad822-3591-4604-ab96-bc794de98af3	5	2026-09-25 14:48:51.133	2026-09-25 14:48:51.133	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	f	2026-09-25 14:58:51.115	50	f	2026-09-25 13:48:51.115	t	t
7ba5e33e-7ebc-482a-82f6-7e93870aeaa3	Security Test Exam 1790347731213	4ecad822-3591-4604-ab96-bc794de98af3	5	2026-09-25 14:48:51.219	2026-09-25 14:48:51.219	[{"id": "q1", "text": "ما هو 2 + 2؟", "type": "mcq", "correct": 1, "options": ["2", "4", "6", "8"]}, {"id": "q2", "text": "ما هو 5 × 3؟", "type": "mcq", "correct": 1, "options": ["12", "15", "18", "20"]}]	f	2026-09-25 14:58:51.201	50	f	2026-09-25 13:48:51.201	t	t
\.


--
-- Data for Name: ExamAttempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExamAttempt" (id, "examId", score, "createdAt", "studentId", answers) FROM stdin;
3187f548-c1e1-4a1b-b21e-5801da327bd8	f8a240bb-cf09-4422-955c-e2a497579dab	0	2026-09-25 14:43:10.308	b4099d5f-add1-425c-9a75-77ffcabfc31a	[{"questionId": 1, "selectedOption": 0}]
\.


--
-- Data for Name: ExamViolation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExamViolation" (id, "attemptId", type, "timestamp") FROM stdin;
\.


--
-- Data for Name: ExternalExamAttempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExternalExamAttempt" (id, "assessmentId", "studentName", phone, "accessSessionId", "ipAddress", "userAgent", answers, score, percentage, status, "startedAt", "submittedAt", "expiresAt", "createdAt", "updatedAt", "violationCount", "cheatingDetected", "cheatingReason", "cheatingDetectedAt", violations) FROM stdin;
63b8ffa1-e428-4229-bac9-a92451a0a35c	51f5b5f7-51f4-47f5-84b4-547ef106d5fe	Ahmed El-Sayed 1790347400231	01012345678	3ecfaefe-cee9-4340-9058-0c20cc7183ce	\N	\N	[{"answer": "1", "questionId": "q1"}, {"answer": "صواب", "questionId": "q2"}, {"answer": "x^2 + C", "questionId": "q3"}]	30	100	GRADED	2026-09-25 14:43:20.72	2026-09-25 14:43:20.857	2026-09-25 15:28:20.795	2026-09-25 14:43:20.72	2026-09-25 14:43:20.859	0	f	\N	\N	\N
7e38c0c3-60b2-4e38-94ac-484e2336e2b9	51f5b5f7-51f4-47f5-84b4-547ef106d5fe	Student From Any IP 1790347400231	01234567890	d98f6b69-a634-4ed9-aac6-1cf75052d333	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:43:20.959	\N	\N	2026-09-25 14:43:20.959	2026-09-25 14:43:20.959	0	f	\N	\N	\N
4301e1fa-2489-4e73-bc97-e29a445814a4	0759053e-3947-4ee2-a417-4b20e1a03182	طالب مخالفة 2 1790347730753	\N	88cbf9de-383f-4291-acf7-6c43ea0109db	\N	\N	[]	\N	\N	IN_PROGRESS	2026-09-25 14:48:50.766	\N	2026-09-25 15:18:50.775	2026-09-25 14:48:50.766	2026-09-25 14:48:50.803	2	f	\N	\N	[{"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:48:50.789Z"}, {"type": "WINDOW_BLUR", "timestamp": "2026-09-25T14:48:50.802Z"}]
0d722eba-7e69-43c2-9f7f-5a6f13aae30e	51f5b5f7-51f4-47f5-84b4-547ef106d5fe	Cheater Student 1790347400231	\N	97c007b0-9cf1-468b-b448-57bef3fabdd0	\N	\N	[{"answer": "1", "questionId": "q1"}]	\N	\N	IN_PROGRESS	2026-09-25 14:43:20.975	\N	2026-09-25 15:28:20.985	2026-09-25 14:43:20.975	2026-09-25 14:43:21.052	2	f	\N	\N	[{"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:43:21.003Z"}, {"type": "UNKNOWN", "timestamp": "2026-09-25T14:43:21.019Z"}, {"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:43:21.036Z"}]
9a5e34b9-e59b-4c4b-8882-8a189b3771ec	0759053e-3947-4ee2-a417-4b20e1a03182	طالب الأمان الأول	\N	994d8e5c-ae7a-48c2-a270-e33f33d7f6e5	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.401	\N	\N	2026-09-25 14:48:50.401	2026-09-25 14:48:50.401	0	f	\N	\N	\N
c84ecfc6-eafd-4186-9e46-de76e5e00f0e	0759053e-3947-4ee2-a417-4b20e1a03182	طالب_لا_حساب_1790347730409	\N	929ba1aa-d283-4457-8be4-caef1502c33c	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.419	\N	\N	2026-09-25 14:48:50.419	2026-09-25 14:48:50.419	0	f	\N	\N	\N
89abc48b-4958-46ea-9da7-88ad99a91a0c	0759053e-3947-4ee2-a417-4b20e1a03182	طالب بدون IP	\N	caa7f79f-2bdf-48e3-92b9-4813d3f2f518	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.469	\N	\N	2026-09-25 14:48:50.469	2026-09-25 14:48:50.469	0	f	\N	\N	\N
96514094-1302-4764-a700-512ce85adddc	0759053e-3947-4ee2-a417-4b20e1a03182	طالب فحص IP	\N	083b9e03-1ae7-40c5-b4bf-a66f8dca742d	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.49	\N	\N	2026-09-25 14:48:50.49	2026-09-25 14:48:50.49	0	f	\N	\N	\N
3f621207-ce92-4330-8330-2f31609f607d	0759053e-3947-4ee2-a417-4b20e1a03182	طالب بدون هاتف	\N	906bc539-397b-4ee6-9106-3d2870dbf268	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.522	\N	\N	2026-09-25 14:48:50.522	2026-09-25 14:48:50.522	0	f	\N	\N	\N
7135136e-0a15-4936-b5b9-223eed0b84f9	0759053e-3947-4ee2-a417-4b20e1a03182	طالب مع هاتف	01012345678	0eabf687-ae71-4faa-88ce-e04377882786	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.555	\N	\N	2026-09-25 14:48:50.555	2026-09-25 14:48:50.555	0	f	\N	\N	\N
a6f7ac8c-2ba6-4d9d-b309-f997bc994a0d	0759053e-3947-4ee2-a417-4b20e1a03182	طالب مفتوح	\N	6b409d6a-4a1b-4b37-88f7-38ef7187f963	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:50.614	\N	\N	2026-09-25 14:48:50.614	2026-09-25 14:48:50.614	0	f	\N	\N	\N
889e1b98-7292-4747-aa64-d0ad32c283e3	0759053e-3947-4ee2-a417-4b20e1a03182	طالب إعادة تعيين 1790347730911	\N	4dd7e74c-27f8-420c-8110-f0b82c843249	\N	\N	[]	\N	\N	IN_PROGRESS	2026-09-25 14:48:50.918	\N	2026-09-25 15:18:50.928	2026-09-25 14:48:50.918	2026-09-25 14:48:50.954	1	f	\N	\N	[{"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:48:50.944Z"}]
b327db21-40fb-4976-96b4-1505101788da	0759053e-3947-4ee2-a417-4b20e1a03182	طالب JWT	\N	bb9d25f2-a329-42f3-b01d-9bdd2b886015	\N	\N	[{"answer": "0", "questionId": "q1"}, {"answer": "0", "questionId": "q2"}]	0	0	GRADED	2026-09-25 14:48:50.629	2026-09-25 14:48:50.699	2026-09-25 15:18:50.65	2026-09-25 14:48:50.629	2026-09-25 14:48:50.7	0	f	\N	\N	\N
2295eaf4-3fad-4c1b-ad73-6a1ce2846ae7	0759053e-3947-4ee2-a417-4b20e1a03182	طالب مخالفة 1790347730707	\N	627ff911-fa49-442a-b2d6-1ff1d46131a2	\N	\N	[]	\N	\N	IN_PROGRESS	2026-09-25 14:48:50.716	\N	2026-09-25 15:18:50.725	2026-09-25 14:48:50.716	2026-09-25 14:48:50.742	1	f	\N	\N	[{"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:48:50.741Z"}]
5ccf1f6f-3967-4fe9-8ca5-71758c4b136f	0759053e-3947-4ee2-a417-4b20e1a03182	طالب مخالفة 3 1790347730808	\N	4577b23f-271b-4d2e-ab4b-470fb3a770ac	\N	\N	[]	0	0	CHEATING	2026-09-25 14:48:50.817	2026-09-25 14:48:50.865	2026-09-25 15:18:50.826	2026-09-25 14:48:50.817	2026-09-25 14:48:50.867	3	t	تم رصد مغادرة بيئة الامتحان أكثر من الحد المسموح به (VISIBILITY_HIDDEN)	2026-09-25 14:48:50.865	[{"type": "TAB_SWITCH", "timestamp": "2026-09-25T14:48:50.839Z"}, {"type": "WINDOW_BLUR", "timestamp": "2026-09-25T14:48:50.853Z"}, {"type": "VISIBILITY_HIDDEN", "timestamp": "2026-09-25T14:48:50.865Z"}]
14ca6dcd-11e0-4ae8-b62e-7b6e21d6a881	0759053e-3947-4ee2-a417-4b20e1a03182	طالب رؤية 1790347730872	\N	366ba290-6cd2-40f6-8f77-ce64c3683266	\N	\N	[]	\N	\N	IN_PROGRESS	2026-09-25 14:48:50.879	\N	2026-09-25 15:18:50.888	2026-09-25 14:48:50.879	2026-09-25 14:48:50.905	0	f	\N	\N	[{"type": "VISIBILITY_VISIBLE", "timestamp": "2026-09-25T14:48:50.904Z"}]
cf5239b6-f70e-4afd-bc8b-58162e03803c	0759053e-3947-4ee2-a417-4b20e1a03182	طالب تسليم مزدوج 1790347730967	\N	9bc1ddf8-eaac-4ced-9b54-c7c1930139b4	\N	\N	[{"answer": "1", "questionId": "q1"}]	1	50	GRADED	2026-09-25 14:48:50.975	2026-09-25 14:48:51.002	2026-09-25 15:18:50.983	2026-09-25 14:48:50.975	2026-09-25 14:48:51.003	0	f	\N	\N	\N
5c93bb5d-cb8b-4dda-a8a4-762ae73b8fa5	0759053e-3947-4ee2-a417-4b20e1a03182	طالب تبويبات 1790347731289	\N	88f2f0e3-f8dd-4cd7-b8cf-4f4de5c04bf8	\N	\N	[]	\N	\N	STARTED	2026-09-25 14:48:51.297	\N	\N	2026-09-25 14:48:51.297	2026-09-25 14:48:51.297	0	f	\N	\N	\N
dac0e2ae-a5ca-45ca-8e0a-c5c8405e136a	572db76b-5737-4057-815f-0d79efb21504	طالب منتهي وقت 1790347731052	\N	269d4e77-cd4c-4492-9677-a834be5cf37e	\N	\N	[]	\N	\N	TIME_EXPIRED	2026-09-25 14:48:51.059	2026-09-25 14:48:51.107	2026-09-25 14:48:46.076	2026-09-25 14:48:51.059	2026-09-25 14:48:51.108	0	f	\N	\N	\N
3801b808-bc73-4730-836c-f79e35a16b49	2d0c1a46-31bc-4b2d-9ac4-4a2cdffd1e11	طالب منتهي تسليم 1790347731146	\N	40ffade7-b1a6-4866-b459-1d9b3ee7014e	\N	\N	[]	\N	\N	TIME_EXPIRED	2026-09-25 14:48:51.154	2026-09-25 14:48:51.19	2026-09-25 14:48:46.176	2026-09-25 14:48:51.154	2026-09-25 14:48:51.192	0	f	AUTO_SUBMITTED_TIME_EXPIRED	\N	\N
e7795e0e-2bfd-4b6f-b166-82d429f54b64	7ba5e33e-7ebc-482a-82f6-7e93870aeaa3	طالب سبب 1790347731238	\N	50c3ad23-d99b-4671-b68a-22631fa9d007	\N	\N	[]	\N	\N	TIME_EXPIRED	2026-09-25 14:48:51.247	2026-09-25 14:48:51.278	2026-09-25 14:48:46.264	2026-09-25 14:48:51.247	2026-09-25 14:48:51.279	0	f	AUTO_SUBMITTED_TIME_EXPIRED	\N	\N
\.


--
-- Data for Name: Homework; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Homework" (id, title, "courseId", deadline, "createdAt", "updatedAt", questions, "lessonId", "closeAt", duration, "openAt", type, "videoId") FROM stdin;
020d884b-43ea-4016-ab41-3ac59d2ebe79	RegHW 1790347385980	04666bff-e94b-475c-8312-525429010b49	\N	2026-09-25 14:43:10.386	2026-09-25 14:43:10.386	[{"id": 1, "text": "5*5=?", "type": "mcq", "correct": 1, "options": ["20", "25", "30"]}]	\N	\N	\N	\N	NORMAL	\N
\.


--
-- Data for Name: Lesson; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Lesson" (id, title, "videoUrl", "createdAt", "publishedAt", "courseId", "updatedAt", "pdfUrl") FROM stdin;
2e04c8f7-4c44-4492-ad24-d74a78b5a3e7	Test Lesson	dQw4w9WgXcQ	2026-09-25 14:16:26.081	\N	d0e6aa8d-74a5-46f5-8316-3d48d1a8b900	2026-09-25 14:16:26.081	\N
5fa5e2c1-1bf1-401c-b143-891db27dd2d9	Lesson 1790347385980	https://example.com/v.mp4	2026-09-25 14:43:10.461	\N	04666bff-e94b-475c-8312-525429010b49	2026-09-25 14:43:10.461	\N
983418aa-14db-4e74-b5a1-c8b0f8d4b38b	Lesson 1	\N	2026-09-25 14:43:33.763	\N	a3d44ef5-440a-404b-8756-3dcd4a14f67b	2026-09-25 14:43:33.763	\N
\.


--
-- Data for Name: LessonQuiz; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LessonQuiz" (id, "lessonId", "timestampSec", question, options, "correctAnswer", "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", title, message, type, read, "createdAt") FROM stdin;
6d7f2872-c6bb-441f-9260-c140a4af23b8	b4099d5f-add1-425c-9a75-77ffcabfc31a	امتحان جديد	تم نشر امتحان جديد: RegExam 1790347385980	info	f	2026-09-25 14:43:10.138
d0633edf-d9a8-47f4-b93e-e0f9e61d6720	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	إشعار لولي الأمر: امتحان جديد	الطالب: تم نشر امتحان جديد: RegExam 1790347385980	info	f	2026-09-25 14:43:10.138
b05b62c8-eb85-4a40-a76d-a39ea96c8872	c5320162-aa5b-4105-ae72-43e332b72c4a	تسليم امتحان	قام الطالب بتسليم امتحان: RegExam 1790347385980	info	f	2026-09-25 14:43:10.241
571c6101-1a94-4ba7-9fa1-50436586a406	b4099d5f-add1-425c-9a75-77ffcabfc31a	امتحان جديد	تم نشر امتحان جديد: SpoofExam 1790347385980	info	f	2026-09-25 14:43:10.276
cb2b506b-d32b-4ac9-81fa-6bbbc63e8127	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	إشعار لولي الأمر: امتحان جديد	الطالب: تم نشر امتحان جديد: SpoofExam 1790347385980	info	f	2026-09-25 14:43:10.276
46e2aa98-4392-44c1-9ff1-0e28b5c3a332	c5320162-aa5b-4105-ae72-43e332b72c4a	تسليم امتحان	قام الطالب بتسليم امتحان: SpoofExam 1790347385980	info	f	2026-09-25 14:43:10.338
64fb0e2d-9db7-489a-b4ed-d919b9510f53	b4099d5f-add1-425c-9a75-77ffcabfc31a	واجب جديد	تم نشر واجب جديد: RegHW 1790347385980	info	f	2026-09-25 14:43:10.403
bf27a0be-61d1-4f69-b65a-efc5a8722b00	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	إشعار لولي الأمر: واجب جديد	الطالب: تم نشر واجب جديد: RegHW 1790347385980	info	f	2026-09-25 14:43:10.403
78223126-b8fc-42b9-92c1-f2214ed8d97a	c5320162-aa5b-4105-ae72-43e332b72c4a	تسليم واجب	قام الطالب بتسليم واجب: RegHW 1790347385980	info	f	2026-09-25 14:43:10.435
a0b69a14-7237-4d5c-aeac-1e1edd9bc58e	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	إشعار لولي الأمر: تم تصحيح الواجب	تم تقييم أداء طالبك في RegHW 1790347385980 وحصل على 100%	success	f	2026-09-25 14:43:10.441
4062bf9d-d067-45be-b723-8f8dddb0b182	b4099d5f-add1-425c-9a75-77ffcabfc31a	تم تصحيح الواجب	تم تقييم أدائك في RegHW 1790347385980 وحصلت على 100%	success	f	2026-09-25 14:43:10.45
6baaa59b-40d6-4f23-897f-25980ce8d3e6	b4099d5f-add1-425c-9a75-77ffcabfc31a	درس جديد	تمت إضافة درس جديد: Lesson 1790347385980	info	f	2026-09-25 14:43:10.471
cc721f81-9c63-4a93-a981-6b548b758752	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	إشعار لولي الأمر: درس جديد	الطالب: تمت إضافة درس جديد: Lesson 1790347385980	info	f	2026-09-25 14:43:10.471
acd92902-4389-46d2-895a-29f59344fa7e	b4099d5f-add1-425c-9a75-77ffcabfc31a	تسجيل الحضور	تم تسجيلك كـ "حاضر" في المحاضرة	info	t	2026-09-25 14:43:10.557
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "userId", amount, "createdAt", "updatedAt", date, "courseId", currency, metadata, provider, "providerOrderId", status) FROM stdin;
\.


--
-- Data for Name: QuestionBank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."QuestionBank" (id, text, type, options, "correctAnswer", explanation, tag, subject, topic, difficulty, "academicLevel", country, "educationLevel", "gradeLevel", "mathExpression", diagram, "solutionSteps", given, required, "generationLogic", "solutionExplanation", "validationStatus", source, "creatorId", "createdAt", "updatedAt") FROM stdin;
0696f3a0-726f-4a4f-8fa0-b19eb60d4827	ما هو حل المعادلة التربيعية التالية: x^2 - 5x + 6 = 0؟	MCQ	["x = 2 أو x = 3", "x = 1 أو x = 6", "x = -2 أو x = -3", "x = 0 أو x = 5"]	0	نحل المعادلة التربيعية باستخدام طريقة العوامل. نبحث عن عددين يجمعان إلى -5 ويضربان على 6. هذان العددان هما -2 و -3. لذا، المعادلة يمكن كتابتها على شكل (x - 2)(x - 3) = 0. من هنا، نحصل على الحلول x = 2 و x = 3.	\N	\N	المعادلة التربيعية	\N	SEC_1	\N	\N	\N	x^2 - 5x + 6 = 0	\N	["نكتب المعادلة على شكل (x - 2)(x - 3) = 0", "نحل المعادلة للحصول على x = 2 و x = 3"]	\N	\N	\N	\N	\N	MANUAL	6086f723-c840-4aa7-9925-f26d2ba8ecd2	2026-09-25 14:37:08.107	2026-09-25 14:37:08.107
2211c2d8-9bf0-49db-97ad-d783d0135ff4	ما هي قيمة x التي تساوي المعادلة التربيعية التالية: x^2 - 5x + 6 = 0؟	MCQ	["x = 2", "x = 3", "x = 1", "x = 4"]	1	نحل المعادلة التربيعية باستخدام طريقة العوامل. x^2 - 5x + 6 = (x - 2)(x - 3) = 0. لذلك، x = 2 أو x = 3. لكن الخيار B هو x = 3.	\N	\N	المعادلة التربيعية	\N	SEC_1	\N	\N	\N	x^2 - 5x + 6 = 0	\N	["نحل المعادلة باستخدام طريقة العوامل.", "نحصل على (x - 2)(x - 3) = 0. لذلك، x = 2 أو x = 3."]	\N	\N	\N	\N	\N	MANUAL	6086f723-c840-4aa7-9925-f26d2ba8ecd2	2026-09-25 14:37:08.107	2026-09-25 14:37:08.107
c380a72d-be00-4d79-ae8c-c2f3a8d31aa1	إذا كانت المعادلة التربيعية x^2 - 5x + 6 = 0، فما هي قيمة x؟	MCQ	["x = 2", "x = 3", "x = 1", "x = 4"]	1	لحل المعادلة التربيعية x^2 - 5x + 6 = 0، نستخدم طريقة العوامل. نبحث عن عوامل للعدد 6 الذي يجمعان إلى -5. العوامل هي -2 و -3. لذا، المعادلة يمكن كتابتها على شكل (x - 2)(x - 3) = 0. من هنا، نأخذ كل عامل إلى الصفر: x - 2 = 0 أو x - 3 = 0. لذا، x = 2 أو x = 3. لذلك، الإجابة الصحيحة هي x = 3.	\N	\N	المعادلة التربيعية	\N	SEC_1	\N	\N	\N	x^2 - 5x + 6 = 0	\N	["تحديد العوامل", "حل المعادلة"]	\N	\N	\N	\N	\N	MANUAL	6086f723-c840-4aa7-9925-f26d2ba8ecd2	2026-09-25 14:37:08.107	2026-09-25 14:37:08.107
345411ab-15e4-4e68-a88f-b66ae041a927	إذا كانت المعادلة التربيعية x^2 - 5x + 6 = 0، فما هي قيمة x؟	MCQ	["x = 2", "x = 3", "x = 1", "x = 4"]	1	نحل المعادلة التربيعية باستخدام طريقة التجزئة. نبحث عن عددين يجمعان إلى -5 ويضربان إلى 6. هذه الأعداد هي -2 و -3. لذلك، المعادلة تصبح (x - 2)(x - 3) = 0. من هنا، نجد أن x = 2 أو x = 3.	\N	\N	المعادلة التربيعية	\N	SEC_1	\N	\N	\N	x^2 - 5x + 6 = 0	\N	["تجزئة المعادلة إلى (x - 2)(x - 3) = 0", "إيجاد القيم التي تجعل كل عامل يساوي صفر، أي x = 2 أو x = 3"]	\N	\N	\N	\N	\N	MANUAL	6086f723-c840-4aa7-9925-f26d2ba8ecd2	2026-09-25 14:37:08.107	2026-09-25 14:37:08.107
3e58f5c1-5ccf-4646-b01a-37b673df8571	ما هي قيمة x التي ترضي المعادلة التربيعية التالية: x^2 - 5x + 6 = 0؟	MCQ	["x = 2", "x = 3", "x = 1", "x = 4"]	1	لحل المعادلة التربيعية x^2 - 5x + 6 = 0، نستخدم طريقة العوامل. نبحث عن زوجين من الأعداد التي عندما نضربها يعطي 6 و عندما نجمعها يعطي -5. هذه الأعداد هي -2 و -3. لذلك، المعادلة يمكن كتابتها على شكل (x - 2)(x - 3) = 0. من هنا، نأخذ كل عامل على حدة ونضعه يساوي صفر: x - 2 = 0 أو x - 3 = 0. من هنا، نحصل على x = 2 أو x = 3. لذلك، الإجابة الصحيحة هي x = 3.	\N	\N	المعادلة التربيعية	\N	SEC_1	\N	\N	\N	x^2 - 5x + 6 = 0	\N	["نكتب المعادلة على شكل (x - 2)(x - 3) = 0", "نحل كل عامل على حدة: x - 2 = 0 أو x - 3 = 0", "نحصل على x = 2 أو x = 3"]	\N	\N	\N	\N	\N	MANUAL	6086f723-c840-4aa7-9925-f26d2ba8ecd2	2026-09-25 14:37:08.107	2026-09-25 14:37:08.107
\.


--
-- Data for Name: SavedMathSolution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SavedMathSolution" (id, "studentId", problem, solution, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudentRiskHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StudentRiskHistory" (id, "studentId", "lessonId", "riskLevel", "riskCode", "detectedAt", "resolvedAt", "resolutionCode") FROM stdin;
\.


--
-- Data for Name: Submission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Submission" (id, "studentId", "homeworkId", grade, url, "createdAt", "updatedAt", answers) FROM stdin;
eb6da916-5157-49d2-b89c-0202838ce843	b4099d5f-add1-425c-9a75-77ffcabfc31a	020d884b-43ea-4016-ab41-3ac59d2ebe79	100	\N	2026-09-25 14:43:10.425	2026-09-25 14:43:10.425	[{"questionId": 1, "selectedOption": 1}]
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, name, "createdAt", "centerGroupId", "parentId", "updatedAt", role, "academicLevel", country, "educationLevel", "gradeLevel", language, phone, "isGuest") FROM stdin;
1f22332c-252c-4def-8ea3-9010bbeeb6ec	admin@edu.com	$2a$10$xtO7d.yD3J0hsu3KvnVZ9uUXaSBWDn0R2moNKw5Os4QmkivR2/9Bm	Admin	2026-09-25 14:16:10.15	\N	\N	2026-09-25 14:16:10.15	ADMIN	\N	\N	\N	\N	ar	\N	f
879f0bfa-e3c7-4e3d-ba64-80e92a75874f	student_test2@edu.com	$2a$10$GQIAMkVzMUWXn/cs5t2HeeAUso9qTVUzf.0j0IGuENyWwI8ql3sIu	Test Student	2026-09-25 14:16:25.999	\N	\N	2026-09-25 14:16:25.999	ONLINE_STUDENT	\N	\N	\N	\N	ar	\N	f
2f430041-6de8-46e2-954a-cc88b74a5f63	teacher_test2@edu.com	$2a$10$GQIAMkVzMUWXn/cs5t2HeeAUso9qTVUzf.0j0IGuENyWwI8ql3sIu	Test Teacher	2026-09-25 14:16:26.025	\N	\N	2026-09-25 14:16:26.025	TEACHER	\N	\N	\N	\N	ar	\N	f
6086f723-c840-4aa7-9925-f26d2ba8ecd2	teacher@gmail.com	$2a$10$vuk62OnLO/RAg0vzi/gA/uPs35BhC8dYc8LJAAPkzoprmzRSc1g9S	معلم حسام	2026-09-25 14:18:35.791	\N	\N	2026-09-25 14:18:35.791	TEACHER	\N	\N	\N	\N	ar	\N	f
815a45bb-8da7-4058-a468-0fb8c783ebd3	samer@gmail.com	$2a$10$39EFqPvB.pgfUfDL8CrjmeFUcIFw5MV6/8xjx17DuSu8uqH6ZQ81G	سمير عبدالله	2026-09-25 14:21:09.287	\N	\N	2026-09-25 14:21:09.287	PARENT	\N	\N	\N	\N	ar	01022750997	f
d289c409-6619-4e84-b8a3-2d3ee0141d57	hosam@gmail.com	$2a$10$GgvMVpNPQtlZeBiUSQ0PIeJBRe/d.iu9jXJ2CoEY5i/2ItDvbXBRi	طالب حسام سمير 	2026-09-25 14:19:54.853	\N	815a45bb-8da7-4058-a468-0fb8c783ebd3	2026-09-25 14:21:09.381	ONLINE_STUDENT	\N	EG	SECONDARY	SECONDARY_1	ar	\N	f
d629af05-8fd4-4955-b0ef-62e6104f5553	center@gmail.com	$2a$10$fRn52KdXucTn32IrevNo5.qL1TcDLDypBzI3d.5Ujsrd04c31w1LC	طالب سنتر حسام	2026-09-25 14:22:07.109	\N	815a45bb-8da7-4058-a468-0fb8c783ebd3	2026-09-25 14:22:45.523	CENTER_STUDENT	\N	EG	SECONDARY	SECONDARY_3	ar	\N	f
c5320162-aa5b-4105-ae72-43e332b72c4a	t1_1790347385980@edu.com	$2a$10$lfVCLHhibnY5YOhbtued/umgJ/E31z/o/5p/hy8KbmHJmo7Yj4Qxy	Teacher1	2026-09-25 14:43:06.397	\N	\N	2026-09-25 14:43:06.397	TEACHER	\N	\N	\N	\N	ar	\N	f
95254d1f-447f-40a7-af9d-f12e0a4e7d5a	t2_1790347385980@edu.com	$2a$10$76Hh8suPUS26UYj0n1JwYe/UbKI48N6itqpVmWzrbMUGIWHVe3e9S	Teacher2	2026-09-25 14:43:06.643	\N	\N	2026-09-25 14:43:06.643	TEACHER	\N	\N	\N	\N	ar	\N	f
c4508334-fe9b-4fc0-a5e5-889ba70b5eab	parent_1790347385980@edu.com	$2a$10$w6wpooyFCZDbgo14a8jNj..pAsbrbUwgX8gXpISW3kCpP7Ka.MGcW	TestParent	2026-09-25 14:43:06.854	\N	\N	2026-09-25 14:43:06.854	PARENT	\N	\N	\N	\N	ar	\N	f
5c75117f-d957-4f47-8bb0-08598fa1957e	new_1790347385980@edu.com	$2a$10$awBKNG360UP/2XVqAaeqZ.urLEEAOpfwIoi/DAbTt6dxwtnmOGcJq	NewUser	2026-09-25 14:43:10.905	\N	\N	2026-09-25 14:43:10.905	ONLINE_STUDENT	\N	EG	SECONDARY	SECONDARY_1	ar	\N	f
b4099d5f-add1-425c-9a75-77ffcabfc31a	student_1790347385980@edu.com	$2a$10$ZNn52.rQUAgpmTLOPh27I.vx7dE8KznxjOLDwe3zCh2.xC77cQ4FK	UpdatedName	2026-09-25 14:43:07.068	\N	c4508334-fe9b-4fc0-a5e5-889ba70b5eab	2026-09-25 14:43:11.028	ONLINE_STUDENT	\N	EG	SECONDARY	SECONDARY_1	ar	\N	f
4583a6af-f342-44a5-99a6-94818e1ac3b7	teacher_ext_1790347400231@edu.com	$2a$10$760jpI0TfNXL.KVpUwT8Yu3JuGlJDoA5sajyRjnAs/SoDmqRWDX/a	Teacher Ext 1790347400231	2026-09-25 14:43:20.525	\N	\N	2026-09-25 14:43:20.525	TEACHER	\N	\N	\N	\N	ar	\N	f
91e8f61d-c1b7-4f20-99f8-51af835357ac	t1_1790347413604@test.com	pwd	T1	2026-09-25 14:43:33.661	\N	\N	2026-09-25 14:43:33.661	TEACHER	\N	\N	\N	\N	ar	\N	f
0116fa3c-1303-4259-9e29-041706c30aa2	t2_1790347413670@test.com	pwd	T2	2026-09-25 14:43:33.672	\N	\N	2026-09-25 14:43:33.672	TEACHER	\N	\N	\N	\N	ar	\N	f
c88b244a-eb14-4c04-a7dc-3a0225ca4c26	s1_1790347413676@test.com	pwd	S1	2026-09-25 14:43:33.677	\N	\N	2026-09-25 14:43:33.677	ONLINE_STUDENT	\N	\N	\N	\N	ar	\N	f
d44c30c3-b795-465b-8a76-929a9121af2a	s2_1790347413680@test.com	pwd	S2	2026-09-25 14:43:33.682	\N	\N	2026-09-25 14:43:33.682	ONLINE_STUDENT	\N	\N	\N	\N	ar	\N	f
5226833a-5963-4b33-a715-de78b4e9675f	a1_1790347413685@test.com	pwd	A1	2026-09-25 14:43:33.687	\N	\N	2026-09-25 14:43:33.687	ADMIN	\N	\N	\N	\N	ar	\N	f
241f4d56-16c7-4c60-8d9b-3a273159fcb1	teacher_1790347729741@alsaden.com	$2a$10$Oki5MUpndIwlZX3TJ2pl1.Etji5vpl4KKhFmwbA1cS.QIXXAhCIU.	Security Test Teacher	2026-09-25 14:48:50.092	\N	\N	2026-09-25 14:48:50.092	TEACHER	\N	\N	\N	\N	ar	\N	f
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserSession" (id, "userId", "deviceName", "ipAddress", "refreshTokenHash", "createdAt", "lastActiveAt", "revokedAt") FROM stdin;
\.


--
-- Data for Name: VideoProgress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoProgress" (id, "studentId", "lessonId", watched, progress, "createdAt", "updatedAt", "lastTimestamp", "answeredQuizzes", status, "firstOpenedAt", "firstActivityAt", "lastActivityAt", "lastProgressUpdateAt", "totalWatchTimeSec", "watchSessionsCount", "completedAt", "completionSource", "currentRiskLevel", "currentRiskCode", "riskDetectedAt") FROM stdin;
89826776-095c-4f1c-9036-649046e93155	b4099d5f-add1-425c-9a75-77ffcabfc31a	5fa5e2c1-1bf1-401c-b143-891db27dd2d9	f	100	2026-09-25 14:43:10.51	2026-09-25 14:43:10.51	0	[]	NOT_STARTED	\N	\N	\N	\N	0	0	\N	NONE	NONE	\N	\N
\.


--
-- Data for Name: VideoUpload; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VideoUpload" (id, "userId", filename, "storagePath", status, "fileSize", "mimeType", "errorMessage", "createdAt", "completedAt") FROM stdin;
\.


--
-- Name: AssessmentAttempt AssessmentAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssessmentAttempt"
    ADD CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY (id);


--
-- Name: Assessment Assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: CenterGroup CenterGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CenterGroup"
    ADD CONSTRAINT "CenterGroup_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: ChatSession ChatSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_pkey" PRIMARY KEY (id);


--
-- Name: CourseEnrollment CourseEnrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY (id);


--
-- Name: Course Course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY (id);


--
-- Name: DailyPlatformStats DailyPlatformStats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyPlatformStats"
    ADD CONSTRAINT "DailyPlatformStats_pkey" PRIMARY KEY (id);


--
-- Name: ExamAttempt ExamAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamAttempt"
    ADD CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY (id);


--
-- Name: ExamViolation ExamViolation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamViolation"
    ADD CONSTRAINT "ExamViolation_pkey" PRIMARY KEY (id);


--
-- Name: Exam Exam_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT "Exam_pkey" PRIMARY KEY (id);


--
-- Name: ExternalExamAttempt ExternalExamAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExternalExamAttempt"
    ADD CONSTRAINT "ExternalExamAttempt_pkey" PRIMARY KEY (id);


--
-- Name: Homework Homework_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_pkey" PRIMARY KEY (id);


--
-- Name: LessonQuiz LessonQuiz_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LessonQuiz"
    ADD CONSTRAINT "LessonQuiz_pkey" PRIMARY KEY (id);


--
-- Name: Lesson Lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lesson"
    ADD CONSTRAINT "Lesson_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: QuestionBank QuestionBank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QuestionBank"
    ADD CONSTRAINT "QuestionBank_pkey" PRIMARY KEY (id);


--
-- Name: SavedMathSolution SavedMathSolution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SavedMathSolution"
    ADD CONSTRAINT "SavedMathSolution_pkey" PRIMARY KEY (id);


--
-- Name: StudentRiskHistory StudentRiskHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StudentRiskHistory"
    ADD CONSTRAINT "StudentRiskHistory_pkey" PRIMARY KEY (id);


--
-- Name: Submission Submission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_pkey" PRIMARY KEY (id);


--
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VideoProgress VideoProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoProgress"
    ADD CONSTRAINT "VideoProgress_pkey" PRIMARY KEY (id);


--
-- Name: VideoUpload VideoUpload_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoUpload"
    ADD CONSTRAINT "VideoUpload_pkey" PRIMARY KEY (id);


--
-- Name: AssessmentAttempt_assessmentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON public."AssessmentAttempt" USING btree ("assessmentId");


--
-- Name: AssessmentAttempt_studentId_assessmentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AssessmentAttempt_studentId_assessmentId_key" ON public."AssessmentAttempt" USING btree ("studentId", "assessmentId");


--
-- Name: Assessment_examAccessCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Assessment_examAccessCode_key" ON public."Assessment" USING btree ("examAccessCode");


--
-- Name: CourseEnrollment_courseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CourseEnrollment_courseId_idx" ON public."CourseEnrollment" USING btree ("courseId");


--
-- Name: CourseEnrollment_studentId_courseId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CourseEnrollment_studentId_courseId_key" ON public."CourseEnrollment" USING btree ("studentId", "courseId");


--
-- Name: CourseEnrollment_studentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CourseEnrollment_studentId_idx" ON public."CourseEnrollment" USING btree ("studentId");


--
-- Name: Course_teacherId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Course_teacherId_idx" ON public."Course" USING btree ("teacherId");


--
-- Name: DailyPlatformStats_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DailyPlatformStats_date_idx" ON public."DailyPlatformStats" USING btree (date);


--
-- Name: DailyPlatformStats_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DailyPlatformStats_date_key" ON public."DailyPlatformStats" USING btree (date);


--
-- Name: ExamAttempt_examId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExamAttempt_examId_idx" ON public."ExamAttempt" USING btree ("examId");


--
-- Name: ExamAttempt_studentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExamAttempt_studentId_idx" ON public."ExamAttempt" USING btree ("studentId");


--
-- Name: ExamViolation_attemptId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExamViolation_attemptId_idx" ON public."ExamViolation" USING btree ("attemptId");


--
-- Name: ExternalExamAttempt_accessSessionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ExternalExamAttempt_accessSessionId_key" ON public."ExternalExamAttempt" USING btree ("accessSessionId");


--
-- Name: ExternalExamAttempt_assessmentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExternalExamAttempt_assessmentId_idx" ON public."ExternalExamAttempt" USING btree ("assessmentId");


--
-- Name: ExternalExamAttempt_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExternalExamAttempt_createdAt_idx" ON public."ExternalExamAttempt" USING btree ("createdAt");


--
-- Name: ExternalExamAttempt_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExternalExamAttempt_status_idx" ON public."ExternalExamAttempt" USING btree (status);


--
-- Name: ExternalExamAttempt_studentName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExternalExamAttempt_studentName_idx" ON public."ExternalExamAttempt" USING btree ("studentName");


--
-- Name: Lesson_courseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Lesson_courseId_idx" ON public."Lesson" USING btree ("courseId");


--
-- Name: Payment_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");


--
-- Name: Payment_providerOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_providerOrderId_idx" ON public."Payment" USING btree ("providerOrderId");


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree ("userId");


--
-- Name: Submission_homeworkId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Submission_homeworkId_idx" ON public."Submission" USING btree ("homeworkId");


--
-- Name: Submission_studentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Submission_studentId_idx" ON public."Submission" USING btree ("studentId");


--
-- Name: UserSession_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserSession_userId_idx" ON public."UserSession" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VideoProgress_studentId_lessonId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VideoProgress_studentId_lessonId_key" ON public."VideoProgress" USING btree ("studentId", "lessonId");


--
-- Name: VideoUpload_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoUpload_createdAt_idx" ON public."VideoUpload" USING btree ("createdAt");


--
-- Name: VideoUpload_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "VideoUpload_userId_idx" ON public."VideoUpload" USING btree ("userId");


--
-- Name: AssessmentAttempt AssessmentAttempt_assessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssessmentAttempt"
    ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES public."Assessment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AssessmentAttempt AssessmentAttempt_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AssessmentAttempt"
    ADD CONSTRAINT "AssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Assessment Assessment_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Assessment Assessment_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Assessment Assessment_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Assessment"
    ADD CONSTRAINT "Assessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."ChatSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatSession ChatSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatSession"
    ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseEnrollment CourseEnrollment_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CourseEnrollment CourseEnrollment_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CourseEnrollment"
    ADD CONSTRAINT "CourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Course Course_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Course"
    ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamAttempt ExamAttempt_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamAttempt"
    ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES public."Exam"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamAttempt ExamAttempt_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamAttempt"
    ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamViolation ExamViolation_attemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExamViolation"
    ADD CONSTRAINT "ExamViolation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public."ExamAttempt"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Exam Exam_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT "Exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExternalExamAttempt ExternalExamAttempt_assessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExternalExamAttempt"
    ADD CONSTRAINT "ExternalExamAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES public."Assessment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Homework Homework_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Homework Homework_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Homework"
    ADD CONSTRAINT "Homework_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LessonQuiz LessonQuiz_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LessonQuiz"
    ADD CONSTRAINT "LessonQuiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lesson Lesson_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lesson"
    ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public."Course"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QuestionBank QuestionBank_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QuestionBank"
    ADD CONSTRAINT "QuestionBank_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SavedMathSolution SavedMathSolution_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SavedMathSolution"
    ADD CONSTRAINT "SavedMathSolution_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentRiskHistory StudentRiskHistory_studentId_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StudentRiskHistory"
    ADD CONSTRAINT "StudentRiskHistory_studentId_lessonId_fkey" FOREIGN KEY ("studentId", "lessonId") REFERENCES public."VideoProgress"("studentId", "lessonId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Submission Submission_homeworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES public."Homework"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Submission Submission_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Submission"
    ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSession UserSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_centerGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_centerGroupId_fkey" FOREIGN KEY ("centerGroupId") REFERENCES public."CenterGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VideoProgress VideoProgress_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoProgress"
    ADD CONSTRAINT "VideoProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public."Lesson"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VideoProgress VideoProgress_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoProgress"
    ADD CONSTRAINT "VideoProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VideoUpload VideoUpload_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VideoUpload"
    ADD CONSTRAINT "VideoUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict culu5UTIwVNf3dtzGuv5OfzUCRVpmk1WjZT33g03D4LryqBWLfXkWQYLBbkWD7n


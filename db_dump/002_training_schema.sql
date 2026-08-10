-- =============================================
-- NMU TRAINING MANAGEMENT SYSTEM — Schema Expansion
-- New tables for summer training management
-- =============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- T1: Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name_en       VARCHAR(255) NOT NULL,
  name_ar       VARCHAR(255) DEFAULT NULL,
  description_en TEXT DEFAULT NULL,
  description_ar TEXT DEFAULT NULL,
  start_date    DATE DEFAULT NULL,
  end_date      DATE DEFAULT NULL,
  status        ENUM('active','completed','archived') DEFAULT 'active',
  created_by    INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T2: Training Topics
CREATE TABLE IF NOT EXISTS training_topics (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  course_id     INT NOT NULL,
  title_en      VARCHAR(255) NOT NULL,
  title_ar      VARCHAR(255) DEFAULT NULL,
  description_en TEXT DEFAULT NULL,
  description_ar TEXT DEFAULT NULL,
  due_date      DATE DEFAULT NULL,
  order_index   INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tt_course (course_id),
  INDEX idx_tt_order (course_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T3: Trainer Assignments (course-level OR topic-level)
CREATE TABLE IF NOT EXISTS trainer_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id    INT NOT NULL,
  course_id     INT NOT NULL,
  topic_id      INT DEFAULT NULL,   -- NULL = whole-course; set = per-topic override
  assigned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ta_trainer (trainer_id),
  INDEX idx_ta_course (course_id),
  INDEX idx_ta_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T4: Trainee Enrollments
CREATE TABLE IF NOT EXISTS trainee_enrollments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainee_id    INT NOT NULL,
  course_id     INT NOT NULL,
  source        ENUM('import','manual','self') DEFAULT 'manual',
  enrolled_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_te_unique (trainee_id, course_id),
  INDEX idx_te_course (course_id),
  INDEX idx_te_trainee (trainee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T5: Topic Content (learning materials)
CREATE TABLE IF NOT EXISTS topic_content (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  topic_id      INT NOT NULL,
  uploaded_by   INT NOT NULL,
  type          ENUM('pdf','word','video','url','youtube') NOT NULL,
  title_en      VARCHAR(255) DEFAULT NULL,
  title_ar      VARCHAR(255) DEFAULT NULL,
  url           TEXT NOT NULL,
  file_size     INT DEFAULT NULL,   -- bytes, NULL for external URLs
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_content_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T6: Trainee Topic Progress
CREATE TABLE IF NOT EXISTS trainee_topic_progress (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainee_id    INT NOT NULL,
  topic_id      INT NOT NULL,
  viewed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_ttp_unique (trainee_id, topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T7: Training Ideas (one per trainee per course)
CREATE TABLE IF NOT EXISTS training_ideas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  course_id     INT NOT NULL,
  owner_id      INT NOT NULL,
  title_en      VARCHAR(255) NOT NULL,
  title_ar      VARCHAR(255) DEFAULT NULL,
  description_en TEXT DEFAULT NULL,
  description_ar TEXT DEFAULT NULL,
  tech_stack    TEXT DEFAULT NULL,
  problem_statement TEXT DEFAULT NULL,
  expected_output TEXT DEFAULT NULL,
  skills        JSON DEFAULT NULL,
  proposal_text LONGTEXT DEFAULT NULL,
  status        ENUM('draft','submitted','evaluated') DEFAULT 'draft',
  reviewed_by   INT DEFAULT NULL,
  reviewed_at   TIMESTAMP NULL DEFAULT NULL,
  feedback      TEXT DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_ti_owner_course (owner_id, course_id),
  INDEX idx_ti_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T8: Training Documents (final deliverables)
CREATE TABLE IF NOT EXISTS training_documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  idea_id       INT NOT NULL,
  uploaded_by   INT NOT NULL,
  type          ENUM('report','presentation','github_url') NOT NULL,
  title_en      VARCHAR(255) DEFAULT NULL,
  url           TEXT NOT NULL,
  file_size     INT DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_td_idea (idea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T9: Faculty Evaluation Votes
CREATE TABLE IF NOT EXISTS training_votes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  idea_id       INT NOT NULL,
  evaluator_id  INT NOT NULL,         -- trainer who voted
  rating        TINYINT NOT NULL,     -- 1-5
  notes         TEXT DEFAULT NULL,
  voted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_tv_unique (idea_id, evaluator_id),
  INDEX idx_tv_idea (idea_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- T10: Registration Approval Requests (self-registered trainees)
CREATE TABLE IF NOT EXISTS registration_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  course_id     INT DEFAULT NULL,     -- requested course (optional at registration)
  status        ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by   INT DEFAULT NULL,     -- trainer or admin who reviewed
  reviewed_at   TIMESTAMP DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rr_status (status),
  INDEX idx_rr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

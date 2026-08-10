-- =============================================
-- ERTH MATCHING — Performance Indexes
-- Run this once on your Hostinger database
-- =============================================

-- Users table (speeds up people search, session lookups, project joins)
CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_key);
CREATE INDEX IF NOT EXISTS idx_users_year ON users(academic_year);
CREATE INDEX IF NOT EXISTS idx_users_name_en ON users(full_name_en);

-- Projects (speeds up project listing and filtering)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_college ON projects(college_key);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- Team members (speeds up team count subqueries)
CREATE INDEX IF NOT EXISTS idx_team_project ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON team_members(user_id);

-- Applications (speeds up application counts)
CREATE INDEX IF NOT EXISTS idx_apps_project ON project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_apps_user ON project_applications(user_id);

-- Skills (speeds up skill lookups and heatmap)
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills(project_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

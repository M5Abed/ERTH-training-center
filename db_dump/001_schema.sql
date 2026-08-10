-- =============================================
-- NMU TRAINING MANAGEMENT SYSTEM — Core Database Schema
-- Simplified core tables (Users, Notifications, OTP)
-- =============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(50) DEFAULT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name_en    VARCHAR(255) DEFAULT NULL,
    student_id      VARCHAR(50) DEFAULT NULL,
    college_key     VARCHAR(50) DEFAULT NULL,
    academic_year   INT DEFAULT NULL,
    major           VARCHAR(255) DEFAULT NULL,
    bio             TEXT DEFAULT NULL,
    avatar_url      LONGTEXT DEFAULT NULL,
    availability    JSON DEFAULT NULL,
    enrolled_courses JSON DEFAULT NULL,
    role            VARCHAR(20) DEFAULT 'trainee',
    department      VARCHAR(255) DEFAULT NULL,
    approval_status ENUM('pending','approved','rejected') DEFAULT 'approved',
    is_admin        TINYINT(1) NOT NULL DEFAULT 0,
    email_verified  TINYINT(1) NOT NULL DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT NULL,
    total_reviews   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_college (college_key),
    INDEX idx_users_role (role),
    INDEX idx_users_approval (approval_status),
    INDEX idx_users_email_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    message_en  TEXT DEFAULT NULL,
    message_ar  TEXT DEFAULT NULL,
    project_id  INT DEFAULT NULL,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. OTP Codes (Email Verification)
CREATE TABLE IF NOT EXISTS otp_codes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    email       VARCHAR(255) NOT NULL,
    otp_code    VARCHAR(6) NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,
    purpose     ENUM('email_verify','password_reset') DEFAULT 'email_verify',
    expires_at  DATETIME NOT NULL,
    used_at     DATETIME DEFAULT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_user (user_id),
    INDEX idx_otp_email (email),
    INDEX idx_otp_expires (expires_at),
    INDEX idx_otp_purpose (purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. OTP Rate Limits
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    identifier   VARCHAR(255) NOT NULL,
    action       VARCHAR(50) NOT NULL DEFAULT 'resend_otp',
    attempts     INT NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_rate_ident_action (identifier, action),
    INDEX idx_rate_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

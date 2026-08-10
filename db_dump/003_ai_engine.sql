-- =============================================
-- NMU TRAINING — AI Engine Tables
-- Migration 003: ai_provider_keys, ai_cache, ai_user_usage
-- =============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ── 1. AI Provider Key Registry ──────────────────────────────────────────────
-- Stores metadata about each API key (NOT the key itself — key lives in .env).
-- env_var_name references the name of the environment variable holding the secret.
CREATE TABLE IF NOT EXISTS ai_provider_keys (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    provider            VARCHAR(20)  NOT NULL,           -- 'groq' | 'gemini' | 'openrouter'
    key_label           VARCHAR(100) NOT NULL,           -- human-readable name, e.g. 'GROQ_KEY_1'
    env_var_name        VARCHAR(100) NOT NULL UNIQUE,    -- name of the env var, e.g. 'GROQ_KEY_1'
    model               VARCHAR(100) NOT NULL DEFAULT 'llama-3.1-8b-instant',
    api_url             VARCHAR(255) NOT NULL DEFAULT 'https://api.groq.com/openai/v1/chat/completions',
    used_today_tokens   INT          NOT NULL DEFAULT 0,
    reset_date          DATE         NOT NULL DEFAULT (CURDATE()),
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    priority            INT          NOT NULL DEFAULT 10, -- lower = preferred
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_apk_provider  (provider),
    INDEX idx_apk_active    (is_active),
    INDEX idx_apk_priority  (priority, used_today_tokens)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. AI Response Cache ──────────────────────────────────────────────────────
-- sha256(taskType + JSON.stringify(payload)) deduplication.
CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key       VARCHAR(64)  NOT NULL PRIMARY KEY,  -- sha256 hex
    task_type       VARCHAR(50)  NOT NULL,
    result_json     MEDIUMTEXT   NOT NULL,
    hit_count       INT          NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME     NOT NULL,               -- default: +24h at insert time
    INDEX idx_cache_expires  (expires_at),
    INDEX idx_cache_task     (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. Per-User Daily Token Usage ────────────────────────────────────────────
-- One row per (user_id, UTC date). Incremented on every successful non-cached call.
CREATE TABLE IF NOT EXISTS ai_user_usage (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    usage_date      DATE         NOT NULL,               -- UTC date
    tokens_used     INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_date (user_id, usage_date),
    INDEX idx_auu_user   (user_id),
    INDEX idx_auu_date   (usage_date),
    CONSTRAINT fk_auu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

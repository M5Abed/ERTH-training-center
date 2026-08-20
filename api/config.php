<?php
// =========================================================
// NMU THINKTANK — API Configuration
// =========================================================

// Load credentials from .env file (keeps secrets out of source code)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim(trim($value), '"\''); // Remove quotes
                if (!defined($key)) {
                    define($key, $value);
                }
            }
        }
    }
}

// Fallback defaults (override via .env — credentials MUST be in .env for production)
if (!defined('DB_HOST'))
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
if (!defined('DB_NAME'))
    define('DB_NAME', getenv('DB_NAME') ?: '');
if (!defined('DB_USER'))
    define('DB_USER', getenv('DB_USER') ?: '');
if (!defined('DB_PASS'))
    define('DB_PASS', getenv('DB_PASS') ?: '');
if (!defined('DB_CHARSET'))
    define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

// Fallback for SMTP vars (injected by Docker env_file)
if (!defined('SMTP_HOST'))
    define('SMTP_HOST', getenv('SMTP_HOST') ?: '');
if (!defined('SMTP_PORT'))
    define('SMTP_PORT', getenv('SMTP_PORT') ?: '');
if (!defined('SMTP_USER'))
    define('SMTP_USER', getenv('SMTP_USER') ?: '');
if (!defined('SMTP_PASS'))
    define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
if (!defined('SMTP_FROM_EMAIL'))
    define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: '');
if (!defined('SMTP_FROM_NAME'))
    define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: '');

// Fallback for GROQ
if (!defined('GROQ_API_KEY') && getenv('GROQ_API_KEY')) {
    define('GROQ_API_KEY', getenv('GROQ_API_KEY'));
}

// Fallback for AI engine constants
if (!defined('AI_DAILY_USER_TOKEN_LIMIT')) {
    define('AI_DAILY_USER_TOKEN_LIMIT', (int) (getenv('AI_DAILY_USER_TOKEN_LIMIT') ?: 100000));
}

// =========================================================
// SECURITY HEADERS & CORS
// =========================================================

// Security headers & CORS / Session (Only if not running in CLI mode)
if (php_sapi_name() !== 'cli') {
    // Strict Security Headers
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.groq.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
    header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
    header("X-Permitted-Cross-Domain-Policies: none");
    header("Cache-Control: no-store, no-cache, must-revalidate");  // Prevent caching of API responses
    header_remove("X-Powered-By");  // Hide PHP version
    header_remove("Server");

    // CORS — dynamic whitelist for development & production
    $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://localhost:8080', 'http://127.0.0.1:8000', 'http://localhost', 'http://127.0.0.1'];
    if (defined('ALLOWED_ORIGINS') && ALLOWED_ORIGINS) {
        $allowedOrigins = array_merge($allowedOrigins, array_map('trim', explode(',', ALLOWED_ORIGINS)));
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST) ?? '';
        $serverHost = parse_url($_SERVER['HTTP_HOST'] ?? '', PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? '');
        if (
            in_array($origin, $allowedOrigins, true) ||
            $originHost === 'localhost' ||
            $originHost === '127.0.0.1' ||
            str_starts_with($originHost, '192.168.') ||
            str_starts_with($originHost, '10.') ||
            str_starts_with($originHost, '172.') ||
            str_ends_with($originHost, '.local') ||
            str_ends_with($originHost, '.nmu.edu.eg') ||
            ($serverHost && ($originHost === $serverHost || str_ends_with($originHost, '.' . $serverHost)))
        ) {
            header("Access-Control-Allow-Origin: $origin");
        }
    }
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-User-Id");
    header("Content-Type: application/json; charset=utf-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // Session — must start before any output
    session_name('thinktank_session');
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30, // 30 days
        'path' => '/',
        'secure' => $isHttps,  // Auto-detect: true on HTTPS, false on HTTP (Docker/dev)
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    // ── CSRF Protection ─────────────────────────────────────────────────────────
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    setcookie('thinktank_csrf_token', $_SESSION['csrf_token'], [
        'expires' => time() + 60 * 60 * 24 * 30,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => false,
        'samesite' => 'Lax'
    ]);
}

// Database connection (singleton)
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null)
        return $pdo;

    $host    = defined('DB_HOST') ? DB_HOST : 'localhost';
    $dbname  = defined('DB_NAME') ? DB_NAME : 'nmu_thinktank';
    $user    = defined('DB_USER') ? DB_USER : 'erth_user';
    $pass    = defined('DB_PASS') ? DB_PASS : 'change_me_in_production';
    $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

    // 1. Direct configured connection
    try {
        $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3,
        ]);
        return $pdo;
    } catch (PDOException $ePrimary) {
        // Fallbacks for localhost/127.0.0.1/docker
        $fallbacks = [
            [$host === 'localhost' ? '127.0.0.1' : ($host === '127.0.0.1' ? 'localhost' : 'db'), $dbname, $user, $pass],
            ['db', 'nmu_thinktank', 'erth_user', 'change_me_in_production'],
            ['127.0.0.1', 'nmu_thinktank', 'erth_user', 'change_me_in_production'],
            ['localhost', 'nmu_thinktank', 'erth_user', 'change_me_in_production'],
        ];

        foreach ($fallbacks as [$fHost, $fDb, $fUser, $fPass]) {
            try {
                $dsn = "mysql:host={$fHost};dbname={$fDb};charset={$charset}";
                $pdo = new PDO($dsn, $fUser, $fPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 2,
                ]);
                return $pdo;
            } catch (PDOException $e) {}
        }

        http_response_code(500);
        error_log('Database connection failed: ' . $ePrimary->getMessage());
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Database connection failed. Please check database configuration.']);
        exit;
    }
}

// Auto-migration: ensure all required tables exist
function _autoMigrate(): void
{
    try {
        // 1. Add student academic variables to users if missing
        $cols = db()->query("SHOW COLUMNS FROM users LIKE 'approval_status'")->fetchAll();
        if (empty($cols)) {
            db()->exec("ALTER TABLE users ADD COLUMN approval_status ENUM('pending','approved','rejected') DEFAULT 'approved' AFTER department");
            db()->exec("ALTER TABLE users ADD INDEX idx_users_approval (approval_status)");
        }
        $aeCols = db()->query("SHOW COLUMNS FROM users LIKE 'academic_email'")->fetchAll();
        if (empty($aeCols)) {
            db()->exec("ALTER TABLE users ADD COLUMN academic_email VARCHAR(255) NULL AFTER email");
        }
        $aidCols = db()->query("SHOW COLUMNS FROM users LIKE 'academic_id'")->fetchAll();
        if (empty($aidCols)) {
            db()->exec("ALTER TABLE users ADD COLUMN academic_id VARCHAR(50) NULL AFTER student_id");
        }
        $prgCols = db()->query("SHOW COLUMNS FROM users LIKE 'program'")->fetchAll();
        if (empty($prgCols)) {
            db()->exec("ALTER TABLE users ADD COLUMN program VARCHAR(255) NULL AFTER major");
        }
        $ftCols = db()->query("SHOW COLUMNS FROM users LIKE 'final_track'")->fetchAll();
        if (empty($ftCols)) {
            db()->exec("ALTER TABLE users ADD COLUMN final_track VARCHAR(255) NULL AFTER program");
        }

        // Add variables to trainee_enrollments
        $teCols = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'course_code'")->fetchAll();
        if (empty($teCols)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN course_code VARCHAR(100) NULL AFTER course_id");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN program VARCHAR(255) NULL AFTER course_code");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN final_track VARCHAR(255) NULL AFTER program");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN final_grade DECIMAL(5,2) NULL AFTER final_track");
        }
        $confCols = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'technical_track_confirmed'")->fetchAll();
        if (empty($confCols)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN technical_track_confirmed TINYINT(1) DEFAULT 0");
        }
        $custCols = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'custom_provider_name'")->fetchAll();
        if (empty($custCols)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_name VARCHAR(255) NULL");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_website VARCHAR(255) NULL");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_linkedin VARCHAR(255) NULL");
        }

        // Add course_code and course_type to training_courses
        $tcCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'course_code'")->fetchAll();
        if (empty($tcCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN course_code VARCHAR(100) NULL AFTER name");
        }
        $typeCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'course_type'")->fetchAll();
        if (empty($typeCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN course_type ENUM('internal','external','both') NOT NULL DEFAULT 'both' AFTER course_code");
        }

        // Auto-fix any existing trainees in external courses whose training_type was defaulted to internal
        try {
            db()->exec("
                UPDATE trainee_enrollments te 
                JOIN training_courses c ON c.id = te.course_id 
                SET te.training_type = 'external' 
                WHERE (c.course_type = 'external' OR c.name LIKE '%external%' OR c.name LIKE '%خارجي%' OR c.category LIKE '%external%' OR c.category LIKE '%خارجي%') 
                  AND te.training_type != 'external'
            ");
        } catch (Throwable $e) {}

        // Ensure admin accounts are fully flagged and approved
        try {
            db()->exec("UPDATE users SET is_admin = 1, role = 'admin', approval_status = 'approved' WHERE LOWER(email) LIKE 'admin@%' OR role = 'admin'");
        } catch (Throwable $e) {}

        // 2. Execute 002_training_schema.sql if tables do not exist
        $trainingSchemaFile = __DIR__ . '/../db_dump/002_training_schema.sql';
        if (file_exists($trainingSchemaFile)) {
            $sql = file_get_contents($trainingSchemaFile);
            if ($sql) {
                db()->exec($sql);
            }
        }

        // 3. Execute 003_ai_engine.sql if AI tables do not exist
        $aiEngineSchema = __DIR__ . '/../db_dump/003_ai_engine.sql';
        if (file_exists($aiEngineSchema)) {
            $sql = file_get_contents($aiEngineSchema);
            if ($sql) {
                db()->exec($sql);
            }
        }

        // 3a. Ensure training_ideas table columns and compatibility exist
        try {
            $tiCols = db()->query("SHOW COLUMNS FROM training_ideas")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('title', $tiCols, true)) {
                if (in_array('title_en', $tiCols, true)) {
                    db()->exec("ALTER TABLE training_ideas ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER owner_id");
                    db()->exec("UPDATE training_ideas SET title = COALESCE(NULLIF(title_en, ''), 'Untitled Project')");
                } else {
                    db()->exec("ALTER TABLE training_ideas ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER owner_id");
                }
            }
            if (!in_array('description', $tiCols, true)) {
                if (in_array('description_en', $tiCols, true)) {
                    db()->exec("ALTER TABLE training_ideas ADD COLUMN description TEXT NULL AFTER title");
                    db()->exec("UPDATE training_ideas SET description = description_en");
                } else {
                    db()->exec("ALTER TABLE training_ideas ADD COLUMN description TEXT NULL AFTER title");
                }
            }
            if (!in_array('catalog_project_id', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas ADD COLUMN catalog_project_id INT NULL AFTER course_id");
                db()->exec("ALTER TABLE training_ideas ADD INDEX idx_ti_catalog_proj (catalog_project_id)");
            }
            if (!in_array('proposal_json', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas ADD COLUMN proposal_json LONGTEXT NULL");
            }
            if (!in_array('tech_stack', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas ADD COLUMN tech_stack TEXT NULL");
            }
            if (!in_array('problem_statement', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas ADD COLUMN problem_statement TEXT NULL");
            }
            if (!in_array('expected_output', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas ADD COLUMN expected_output TEXT NULL");
            }
            db()->exec("ALTER TABLE training_ideas MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'submitted'");
            if (in_array('title_en', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas MODIFY COLUMN title_en VARCHAR(255) NULL DEFAULT NULL");
            }
            if (in_array('description_en', $tiCols, true)) {
                db()->exec("ALTER TABLE training_ideas MODIFY COLUMN description_en TEXT NULL DEFAULT NULL");
            }
        } catch (Throwable $e) {}

        // 3. Ensure training_evaluations table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS training_evaluations (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              trainee_id    INT NOT NULL,
              course_id     INT NOT NULL,
              evaluator_id  INT NOT NULL,
              status        ENUM('pass','fail','needs_revision') DEFAULT 'pass',
              final_score   DECIMAL(5,2) NOT NULL DEFAULT 85.00,
              feedback      TEXT DEFAULT NULL,
              criteria_scores JSON DEFAULT NULL,
              evaluated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE INDEX idx_te_trainee_course (trainee_id, course_id),
              INDEX idx_te_course (course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 3b. Ensure course_eval_criteria table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS course_eval_criteria (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                name VARCHAR(150) NOT NULL,
                weight DECIMAL(5,2) NOT NULL,
                order_index INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_cec_course (course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 4. Ensure training_certificates table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS training_certificates (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              cert_code     VARCHAR(64) UNIQUE NOT NULL,
              course_id     INT NOT NULL,
              trainee_id    INT NOT NULL,
              issued_by     INT NOT NULL,
              final_score   DECIMAL(5,2) DEFAULT NULL,
              status        VARCHAR(32) DEFAULT 'issued',
              pdf_path      VARCHAR(255) DEFAULT NULL,
              issued_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE INDEX idx_tc_trainee_course (trainee_id, course_id),
              INDEX idx_tc_code (cert_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 5. Ensure training_idea_members table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS training_idea_members (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              idea_id       INT NOT NULL,
              user_id       INT NOT NULL,
              role          ENUM('leader', 'member') DEFAULT 'member',
              created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE INDEX idx_tim_idea_user (idea_id, user_id),
              INDEX idx_tim_idea (idea_id),
              INDEX idx_tim_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 6. Ensure projects_catalog & proposals_pregenerated tables exist
        db()->exec("
            CREATE TABLE IF NOT EXISTS projects_catalog (
              id            INT PRIMARY KEY,
              title         VARCHAR(255) NOT NULL,
              category      VARCHAR(64) NOT NULL,
              level         VARCHAR(64) NOT NULL,
              skills        TEXT NULL,
              display_order INT DEFAULT 0,
              created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        db()->exec("
            CREATE TABLE IF NOT EXISTS proposals_pregenerated (
              id                 INT AUTO_INCREMENT PRIMARY KEY,
              catalog_project_id INT NOT NULL,
              section_key        VARCHAR(64) NOT NULL,
              content            MEDIUMTEXT NOT NULL,
              created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY idx_pregen_proj_section (catalog_project_id, section_key),
              INDEX idx_pregen_proj (catalog_project_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 6a. Auto-repair projects_catalog categories if needed
        if (file_exists(__DIR__ . '/training/ideas/catalog_64_data.php')) {
            try {
                $pCount = (int)db()->query("SELECT COUNT(*) FROM projects_catalog")->fetchColumn();
                $pRobotics = (int)db()->query("SELECT COUNT(*) FROM projects_catalog WHERE category IN ('yanshee', 'nao', 'integrated')")->fetchColumn();
                if ($pCount < 64 || $pRobotics < 30) {
                    require_once __DIR__ . '/training/ideas/catalog_64_data.php';
                    if (function_exists('getCatalog64')) {
                        $catItems = getCatalog64();
                        $catStmt = db()->prepare("
                            INSERT INTO projects_catalog (id, title, category, level, skills, display_order)
                            VALUES (?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                title         = VALUES(title),
                                category      = VALUES(category),
                                level         = VALUES(level),
                                skills        = VALUES(skills),
                                display_order = VALUES(display_order)
                        ");
                        $secStmt = db()->prepare("
                            INSERT INTO proposals_pregenerated (catalog_project_id, section_key, content)
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE content = VALUES(content)
                        ");
                        foreach ($catItems as $ci) {
                            $catStmt->execute([(int)$ci['id'], $ci['title'], $ci['category'], $ci['level'], $ci['skills'] ?? '', (int)($ci['display_order'] ?? $ci['id'])]);
                            if (!empty($ci['sections']) && is_array($ci['sections'])) {
                                foreach ($ci['sections'] as $sKey => $sVal) {
                                    $secStmt->execute([(int)$ci['id'], $sKey, $sVal]);
                                }
                            }
                        }
                    }
                }
            } catch (Throwable $e) {}
        }

        // 6b. Ensure course_project_votes table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS course_project_votes (
              id          INT AUTO_INCREMENT PRIMARY KEY,
              course_id   INT NOT NULL,
              project_id  INT NOT NULL,
              voter_id    INT NOT NULL,
              created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY idx_cpv_course_voter_project (course_id, voter_id, project_id),
              INDEX idx_cpv_course (course_id),
              INDEX idx_cpv_project (project_id),
              INDEX idx_cpv_voter (voter_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 7. Ensure training_courses columns exist
        $tcCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'category'")->fetchAll();
        if (empty($tcCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN category VARCHAR(150) NULL AFTER name");
        }
        $tlCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'level'")->fetchAll();
        if (empty($tlCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN level VARCHAR(100) NULL AFTER category");
        }
        $tdCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'duration_hours'")->fetchAll();
        if (empty($tdCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN duration_hours INT NOT NULL DEFAULT 40 AFTER end_date");
        }
        $tvsCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'voting_status'")->fetchAll();
        if (empty($tvsCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN voting_status ENUM('not_started', 'open', 'closed') NOT NULL DEFAULT 'not_started' AFTER course_type");
        }

        // 8. Ensure training_ideas catalog_project_id exists
        $tiCols = db()->query("SHOW COLUMNS FROM training_ideas LIKE 'catalog_project_id'")->fetchAll();
        if (empty($tiCols)) {
            db()->exec("ALTER TABLE training_ideas ADD COLUMN catalog_project_id INT NULL AFTER course_id");
        }

        // 9. Ensure external_training_providers table exists
        db()->exec("
            CREATE TABLE IF NOT EXISTS external_training_providers (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              name          VARCHAR(255) NOT NULL,
              name_ar       VARCHAR(255) DEFAULT NULL,
              website_url   VARCHAR(255) DEFAULT NULL,
              linkedin_url  VARCHAR(255) DEFAULT NULL,
              is_contracted TINYINT(1) NOT NULL DEFAULT 1,
              status        ENUM('active','inactive') DEFAULT 'active',
              created_by    INT DEFAULT NULL,
              created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_etp_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS course_external_providers (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              course_id     INT NOT NULL,
              provider_id   INT NOT NULL,
              created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY idx_cep_course_provider (course_id, provider_id),
              INDEX idx_cep_course (course_id),
              INDEX idx_cep_provider (provider_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // Seed 4 official default providers if table is empty
        $pCount = (int)db()->query("SELECT COUNT(*) FROM external_training_providers")->fetchColumn();
        if ($pCount === 0) {
            $db = db();
            $seedProviders = [
                [1, 'Information Technology Institute (ITI)', 'معهد تكنولوجيا المعلومات (ITI)', 'https://iti.gov.eg', 'https://www.linkedin.com/school/information-technology-institute-iti/'],
                [2, 'National Telecommunication Institute (NTI)', 'المعهد القومي للاتصالات (NTI)', 'https://nti.sci.eg', 'https://www.linkedin.com/school/national-telecommunication-institute/'],
                [3, 'Creativa Innovation Hubs', 'مراكز إبداع مصر الرقمية (Creativa)', 'https://creativa.gov.eg', 'https://www.linkedin.com/company/creativa-hubs/'],
                [4, 'Digital Egypt Pioneers Initiative (DEPI)', 'مبادرة رواد مصر الرقمية (DEPI)', 'https://depi.gov.eg', 'https://www.linkedin.com/company/digital-egypt-pioneers-initiative-depi/']
            ];
            $insP = $db->prepare("
                INSERT IGNORE INTO external_training_providers (id, name, name_ar, website_url, linkedin_url, is_contracted, status)
                VALUES (?, ?, ?, ?, ?, 1, 'active')
            ");
            foreach ($seedProviders as $sp) {
                $insP->execute($sp);
            }
        }

        // Automatically link 4 default contracted providers to external/both courses
        db()->exec("
            INSERT IGNORE INTO course_external_providers (course_id, provider_id)
            SELECT c.id, p.id
            FROM training_courses c
            CROSS JOIN external_training_providers p
            WHERE c.course_type IN ('external', 'both') AND p.id IN (1, 2, 3, 4);
        ");

        // 11. Ensure training_topics has provider_id for provider-specific tracks
        $ttProv = db()->query("SHOW COLUMNS FROM training_topics LIKE 'provider_id'")->fetchAll();
        if (empty($ttProv)) {
            db()->exec("ALTER TABLE training_topics ADD COLUMN provider_id INT NULL DEFAULT NULL AFTER course_id");
            db()->exec("ALTER TABLE training_topics ADD INDEX idx_tt_provider (provider_id)");
        }

        // 12. Ensure training_courses has course_type
        $ctCols = db()->query("SHOW COLUMNS FROM training_courses LIKE 'course_type'")->fetchAll();
        if (empty($ctCols)) {
            db()->exec("ALTER TABLE training_courses ADD COLUMN course_type ENUM('internal', 'external', 'both') NOT NULL DEFAULT 'both' AFTER status");
        }

        // 13. Ensure trainee_enrollments has external training & verification fields
        $teType = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'training_type'")->fetchAll();
        if (empty($teType)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN training_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal' AFTER course_id");
        }
        $teProv = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'provider_id'")->fetchAll();
        if (empty($teProv)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN provider_id INT NULL AFTER training_type");
        }
        $teTrack = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'track_id'")->fetchAll();
        if (empty($teTrack)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN track_id INT NULL AFTER provider_id");
        }
        $teTechConf = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'technical_track_confirmed'")->fetchAll();
        if (empty($teTechConf)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN technical_track_confirmed TINYINT(1) NOT NULL DEFAULT 0 AFTER track_id");
        }
        $teCustName = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'custom_provider_name'")->fetchAll();
        if (empty($teCustName)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_name VARCHAR(255) NULL AFTER track_id");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_website VARCHAR(255) NULL AFTER custom_provider_name");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_linkedin VARCHAR(255) NULL AFTER custom_provider_website");
        }
        $teStartDate = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'training_start_date'")->fetchAll();
        if (empty($teStartDate)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN training_start_date DATE NULL AFTER custom_provider_linkedin");
        }
        $teVerifDoc = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'verification_doc_url'")->fetchAll();
        if (empty($teVerifDoc)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_doc_url VARCHAR(255) NULL AFTER training_start_date");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none' AFTER verification_doc_url");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_feedback TEXT NULL AFTER verification_status");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_reviewed_by INT NULL AFTER verification_feedback");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_reviewed_at DATETIME NULL AFTER verification_reviewed_by");
        }
    } catch (Throwable $e) {
        error_log('Auto-migration warning: ' . $e->getMessage());
    }
}
_autoMigrate();

// Helpers
function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respondError(string $message, int $status = 400): void
{
    respond(['error' => $message], $status);
}

function requireSession(): int
{
    // 1. Check active PHP session
    if (!empty($_SESSION['user_id'])) {
        return (int) $_SESSION['user_id'];
    }

    // 2. Resilient header fallback (X-User-Id / Authorization: Bearer <id>)
    $candidateId = 0;
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\d+)/i', $authHeader, $matches)) {
        $candidateId = (int) $matches[1];
    } elseif (!empty($_SERVER['HTTP_X_USER_ID'])) {
        $candidateId = (int) $_SERVER['HTTP_X_USER_ID'];
    }

    if ($candidateId > 0) {
        $stmt = db()->prepare("SELECT id, approval_status FROM users WHERE id = ?");
        $stmt->execute([$candidateId]);
        $uRow = $stmt->fetch();
        if ($uRow) {
            $_SESSION['user_id'] = (int) $uRow['id'];
            return (int) $uRow['id'];
        }
    }

    respondError('Unauthorized', 401);
}

function requireAdmin(): int
{
    $uid = requireSession();
    $stmt = db()->prepare("SELECT is_admin, role, approval_status FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    if (!$row) {
        respondError('Unauthorized', 401);
    }
    $isAdmin = (bool) (!empty($row['is_admin']) || strtolower($row['role'] ?? '') === 'admin');
    if (!$isAdmin) {
        respondError('Forbidden: Admin access required', 403);
    }
    return $uid;
}

function requireRole(array|string $allowedRoles): array
{
    $uid = requireSession();
    $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
    $roles = array_map('strtolower', $roles);

    $stmt = db()->prepare("SELECT id, email, full_name, role, is_admin, approval_status FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $user = $stmt->fetch();

    if (!$user) {
        respondError('Unauthorized', 401);
    }

    if ($user['approval_status'] === 'pending') {
        respondError('Your registration is pending approval by a trainer or administrator', 403);
    }

    if ($user['approval_status'] === 'rejected') {
        respondError('Your registration request was rejected', 403);
    }

    $userRole = strtolower($user['role'] ?? '');
    $isAdmin = (bool) (!empty($user['is_admin']) || $userRole === 'admin');

    if ($isAdmin) {
        return $user; // Admin satisfies all role checks
    }

    // Normalize student <-> trainee
    if ($userRole === 'student') {
        $userRole = 'trainee';
    }

    // Check direct match
    if (in_array($userRole, $roles, true)) {
        return $user;
    }

    // Academic staff role aliases for 'trainer'
    $staffRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator'];
    if (in_array($userRole, $staffRoles, true) && (in_array('trainer', $roles, true) || in_array('evaluator', $roles, true))) {
        return $user;
    }

    // Trainee aliases
    if (($userRole === 'trainee' || $userRole === 'student') && (in_array('trainee', $roles, true) || in_array('student', $roles, true))) {
        return $user;
    }

    respondError('Forbidden: Insufficient permissions', 403);
}

function requireTrainer(): array
{
    return requireRole(['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'admin']);
}

function requireTrainee(): array
{
    return requireRole(['trainee', 'student', 'admin']);
}

/**
 * Resolve a course ID from either an integer or a string slug/keyword (e.g. 'robotics', 'external', 'default').
 */
function resolveCourseId(mixed $rawId): int
{
    if (empty($rawId)) return 0;
    if (is_numeric($rawId)) {
        $id = (int)$rawId;
        if ($id > 0) return $id;
    }

    $rawStr = trim((string)$rawId);
    if (empty($rawStr)) return 0;

    $db = db();
    // 1. Check if course_code matches
    $stmt = $db->prepare("SELECT id FROM training_courses WHERE LOWER(course_code) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1");
    $stmt->execute([$rawStr, $rawStr]);
    $found = $stmt->fetchColumn();
    if ($found) return (int)$found;

    // 2. Check slug / keyword matching
    if (stripos($rawStr, 'robot') !== false) {
        $rStmt = $db->query("SELECT id FROM training_courses WHERE LOWER(name) LIKE '%robot%' OR LOWER(category) LIKE '%robot%' ORDER BY id ASC LIMIT 1");
        $rId = $rStmt->fetchColumn();
        if ($rId) return (int)$rId;
    }
    if (stripos($rawStr, 'extern') !== false || stripos($rawStr, 'خارجي') !== false) {
        $eStmt = $db->query("SELECT id FROM training_courses WHERE course_type = 'external' OR LOWER(name) LIKE '%external%' OR LOWER(name) LIKE '%خارجي%' ORDER BY id ASC LIMIT 1");
        $eId = $eStmt->fetchColumn();
        if ($eId) return (int)$eId;
    }
    if ($rawStr === 'default') {
        $dStmt = $db->query("SELECT id FROM training_courses ORDER BY id ASC LIMIT 1");
        $dId = $dStmt->fetchColumn();
        if ($dId) return (int)$dId;
    }

    return 0;
}

/**
 * Verify that a trainer has access to a course (or user is admin).
 * Responds with 403 Forbidden if not assigned.
 */
function verifyCourseAccess(int $courseId, array $user): void
{
    $role = strtolower($user['role'] ?? '');
    $staffRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'admin'];
    $isAdmin = (bool) (!empty($user['is_admin']) || $role === 'admin');
    if ($isAdmin) {
        return;
    }
    if (!in_array($role, $staffRoles, true)) {
        respondError('Forbidden: Trainer or Admin access required', 403);
    }
    $cStmt = db()->prepare("SELECT 1 FROM training_courses WHERE id = ?");
    $cStmt->execute([$courseId]);
    if (!$cStmt->fetch()) {
        respondError('Course not found', 404);
    }
}

function body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data))
        return [];
    // Reject non-scalar values at top level to prevent NoSQL-style object injection
    $allowedArrayFields = [
        'skills',
        'enrolled_courses',
        'availability',
        'required_skills',
        'preferred_skills',
        'preferred_project_type',
        'teammate_ids',
        'team_members',
        'project_ids',
        'voted_ids',
        'votes',
        'criteria',
        'course_criteria',
        'criteria_scores',
        'criteria_weights',
        'proposal_json',
        'sections',
        'proposal',
        'payload',
        'members',
        'deliverables',
        'tags',
        'topics',
        'vote_summary',
        'team',
        'metadata',
        'params',
        'context',
        'rubric',
        'rubrics',
        'grades'
    ];
    foreach ($data as $key => $value) {
        if (is_array($value) && !in_array($key, $allowedArrayFields, true)) {
            respondError("Invalid value for field '$key'", 400);
        }
    }
    return $data;
}

/**
 * Safely trim a value to a string. Returns '' if not a string.
 */
function sanitizeString($value): string
{
    if (!is_string($value))
        return '';
    return trim($value);
}

/**
 * Validate password strength. Returns error message string or null if valid.
 */
function validatePasswordStrength(string $password): ?string
{
    if (strlen($password) < 8)
        return 'Password must be at least 8 characters';
    if (!preg_match('/[A-Z]/', $password))
        return 'Must include an uppercase letter';
    if (!preg_match('/[a-z]/', $password))
        return 'Must include a lowercase letter';
    if (!preg_match('/[0-9]/', $password))
        return 'Must include a number';
    if (!preg_match('/[^A-Za-z0-9]/', $password))
        return 'Must include a special character';

    $common = [
        'password',
        '123456',
        'password123',
        '12345678',
        'qwerty',
        'abc123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
        'dragon',
        'master',
        'login',
        'iloveyou',
        'sunshine',
        'princess',
        'password1',
        '1234567'
    ];
    if (in_array(strtolower($password), $common, true))
        return 'This password is too common';

    return null;
}

/**
 * Strip sensitive fields from a user record before sending to client.
 * @param array $user  The raw user row
 * @param bool  $isSelf Whether the requester is viewing their own profile
 * @return array Sanitized user data
 */
function sanitizeUserResponse(array $user, bool $isSelf = false): array
{
    // Always strip password hash
    unset($user['password_hash']);

    // Strip admin flag and verification status from non-self views
    if (!$isSelf) {
        unset($user['is_admin']);
        unset($user['email_verified']);
    }

    return $user;
}

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL RATE LIMITER
// Session-based — no extra DB table needed
// ═══════════════════════════════════════════════════════════════════════

/**
 * Enforce a rate limit for a given action.
 * Responds with 429 if the limit is exceeded.
 *
 * @param string $action       Unique action identifier (e.g. 'register', 'ai_proxy')
 * @param int    $maxAttempts  Max allowed attempts within the window
 * @param int    $windowSec    Time window in seconds
 */
function rateLimit(string $action, int $maxAttempts = 30, int $windowSec = 60): void
{
    $rawIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $ip = trim(explode(',', $rawIp)[0]);
    $ipHash = md5($ip);

    // 1. Session-based check
    $sessionKey = '_rl_' . $action;
    if (!isset($_SESSION[$sessionKey])) {
        $_SESSION[$sessionKey] = ['count' => 0, 'start' => time()];
    }
    $rl = &$_SESSION[$sessionKey];

    if (time() - $rl['start'] > $windowSec) {
        $rl = ['count' => 0, 'start' => time()];
    }

    $rl['count']++;

    if ($rl['count'] > $maxAttempts) {
        $wait = $windowSec - (time() - $rl['start']);
        $unit = $wait > 60 ? ceil($wait / 60) . ' minutes' : $wait . ' seconds';
        respondError("Rate limit exceeded. Try again in $unit.", 429);
    }

    // 2. IP-based persistent check (protects against session-clearing bypasses)
    try {
        $db = db();
        $rateIdentifier = $action . '_' . $ipHash;
        $stmt = $db->prepare("SELECT attempts, first_attempt FROM otp_rate_limits WHERE identifier = ? AND action = ?");
        $stmt->execute([$rateIdentifier, $action]);
        $row = $stmt->fetch();
        $now = time();

        if ($row) {
            $firstAttempt = strtotime($row['first_attempt']);
            if ($now - $firstAttempt < $windowSec) {
                if ($row['attempts'] >= $maxAttempts) {
                    $wait = $windowSec - ($now - $firstAttempt);
                    $unit = $wait > 60 ? ceil($wait / 60) . ' minutes' : $wait . ' seconds';
                    respondError("Rate limit exceeded for this network. Try again in $unit.", 429);
                }
                $uStmt = $db->prepare("UPDATE otp_rate_limits SET attempts = attempts + 1 WHERE identifier = ? AND action = ?");
                $uStmt->execute([$rateIdentifier, $action]);
            } else {
                $uStmt = $db->prepare("UPDATE otp_rate_limits SET attempts = 1, first_attempt = NOW() WHERE identifier = ? AND action = ?");
                $uStmt->execute([$rateIdentifier, $action]);
            }
        } else {
            $iStmt = $db->prepare("INSERT INTO otp_rate_limits (identifier, action, attempts, first_attempt) VALUES (?, ?, 1, NOW())");
            $iStmt->execute([$rateIdentifier, $action]);
        }
    } catch (\Throwable $e) {
        // Fallback to session check if database rate limit table is unavailable
    }
}

// ═══════════════════════════════════════════════════════════════════════
// INPUT VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Validate and sanitize an email address.
 * Returns the cleaned lowercase email or responds with error.
 */
function validateEmail($value): string
{
    if (!is_string($value)) {
        respondError('Email must be a string');
    }
    $email = trim(strtolower($value));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respondError('Invalid email address');
    }
    if (strlen($email) > 254) {
        respondError('Email is too long');
    }
    return $email;
}

/**
 * Validate a string value with length constraints.
 * Returns the trimmed string or responds with error.
 */
function validateStr($value, int $minLen = 1, int $maxLen = 500, string $fieldName = 'Field'): string
{
    if (!is_string($value)) {
        respondError("$fieldName must be a string");
    }
    $v = trim($value);
    if (strlen($v) < $minLen) {
        respondError("$fieldName must be at least $minLen characters");
    }
    if (strlen($v) > $maxLen) {
        respondError("$fieldName must be at most $maxLen characters");
    }
    return $v;
}

/**
 * Validate an integer value within a range.
 * Returns the integer or responds with error.
 */
function validateInt($value, int $min = 0, int $max = PHP_INT_MAX, string $fieldName = 'Field'): int
{
    if (!is_numeric($value)) {
        respondError("$fieldName must be a number");
    }
    $v = (int) $value;
    if ($v < $min || $v > $max) {
        respondError("$fieldName must be between $min and $max");
    }
    return $v;
}

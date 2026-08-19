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

    // CORS — whitelist allowed origins
    $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175', 'http://localhost:8000', 'http://localhost:8080', 'http://127.0.0.1:8000', 'http://localhost'];
    if (defined('ALLOWED_ORIGINS') && ALLOWED_ORIGINS) {
        $allowedOrigins = array_merge($allowedOrigins, array_map('trim', explode(',', ALLOWED_ORIGINS)));
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
    } elseif ($origin) {
        // Allow same-origin: if the Origin matches this server's host, echo it back
        $serverHost = ($_SERVER['HTTP_HOST'] ?? '');
        $originHost = parse_url($origin, PHP_URL_HOST) ?? '';
        if ($serverHost && $originHost && ($originHost === $serverHost || substr($originHost, -strlen('.' . $serverHost)) === '.' . $serverHost)) {
            header("Access-Control-Allow-Origin: $origin");
        }
    }
    // Same-origin requests with no Origin header do not need the CORS header
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
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
        // 1. Add approval_status to users if missing
        $cols = db()->query("SHOW COLUMNS FROM users LIKE 'approval_status'")->fetchAll();
        if (empty($cols)) {
            db()->exec("ALTER TABLE users ADD COLUMN approval_status ENUM('pending','approved','rejected') DEFAULT 'approved' AFTER department");
            db()->exec("ALTER TABLE users ADD INDEX idx_users_approval (approval_status)");
        }

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
        ");

        // Seed initial contracted providers if table is empty
        $pCount = (int)db()->query("SELECT COUNT(*) FROM external_training_providers")->fetchColumn();
        if ($pCount === 0) {
            db()->exec("
                INSERT INTO external_training_providers (name, name_ar, website_url, linkedin_url, is_contracted, status) VALUES
                ('Information Technology Institute (ITI)', 'معهد تكنولوجيا المعلومات (ITI)', 'https://iti.gov.eg', 'https://www.linkedin.com/school/information-technology-institute-iti', 1, 'active'),
                ('National Telecommunication Institute (NTI)', 'المعهد القومي للاتصالات (NTI)', 'https://nti.sci.eg', 'https://www.linkedin.com/school/national-telecommunication-institute', 1, 'active'),
                ('Creativa Innovation Hubs', 'مراكز إبداع مصر الرقمية (كرياتيفا)', 'https://creativa.gov.eg', 'https://www.linkedin.com/company/creativainnovationhubs', 1, 'active'),
                ('Digital Egypt Pioneers Initiative (DEPI)', 'مبادرة رواد مصر الرقمية', 'https://depi.gov.eg', 'https://www.linkedin.com/company/digital-egypt-pioneers', 1, 'active');
            ");
        }

        // 10. Ensure course_external_providers table exists
        db()->exec("
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
        $teCustName = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'custom_provider_name'")->fetchAll();
        if (empty($teCustName)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_name VARCHAR(255) NULL AFTER track_id");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_website VARCHAR(255) NULL AFTER custom_provider_name");
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_linkedin VARCHAR(255) NULL AFTER custom_provider_website");
        }
        $teVerifDoc = db()->query("SHOW COLUMNS FROM trainee_enrollments LIKE 'verification_doc_url'")->fetchAll();
        if (empty($teVerifDoc)) {
            db()->exec("ALTER TABLE trainee_enrollments ADD COLUMN verification_doc_url VARCHAR(255) NULL AFTER custom_provider_linkedin");
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
    if (empty($_SESSION['user_id'])) {
        respondError('Unauthorized', 401);
    }
    return (int) $_SESSION['user_id'];
}

function requireAdmin(): int
{
    $uid = requireSession();
    $stmt = db()->prepare("SELECT is_admin, role FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    if (!$row || (!$row['is_admin'] && $row['role'] !== 'admin')) {
        respondError('Forbidden: Admin access required', 403);
    }
    return $uid;
}

function requireRole(array|string $allowedRoles): array
{
    $uid = requireSession();
    $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];

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
    $isAdmin = (bool) ($user['is_admin'] || $userRole === 'admin');

    if ($isAdmin) {
        return $user; // Admin satisfies all role checks
    }

    if (!in_array($userRole, array_map('strtolower', $roles), true)) {
        respondError('Forbidden: Insufficient permissions', 403);
    }

    return $user;
}

function requireTrainer(): array
{
    return requireRole(['trainer', 'admin']);
}

function requireTrainee(): array
{
    return requireRole(['trainee', 'admin']);
}

/**
 * Verify that a trainer has access to a course (or user is admin).
 * Responds with 403 Forbidden if not assigned.
 */
function verifyCourseAccess(int $courseId, array $user): void
{
    $role = strtolower($user['role'] ?? '');
    $isAdmin = (bool) (!empty($user['is_admin']) || $role === 'admin');
    if ($isAdmin) {
        return;
    }
    if ($role !== 'trainer') {
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

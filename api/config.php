<?php
// =========================================================
// NMU THINKTANK — API Configuration
// =========================================================

// Load credentials from .env file (keeps secrets out of source code)
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $envVars = parse_ini_file($envFile);
    if ($envVars) {
        foreach ($envVars as $key => $value) {
            if (!defined($key))
                define($key, $value);
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
if (!defined('SMTP_HOST')) define('SMTP_HOST', getenv('SMTP_HOST') ?: '');
if (!defined('SMTP_PORT')) define('SMTP_PORT', getenv('SMTP_PORT') ?: '');
if (!defined('SMTP_USER')) define('SMTP_USER', getenv('SMTP_USER') ?: '');
if (!defined('SMTP_PASS')) define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
if (!defined('SMTP_FROM_EMAIL')) define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: '');
if (!defined('SMTP_FROM_NAME')) define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: '');

// Fallback for GROQ
if (!defined('GROQ_API_KEY') && getenv('GROQ_API_KEY')) {
    define('GROQ_API_KEY', getenv('GROQ_API_KEY'));
}

// =========================================================
// SECURITY HEADERS & CORS
// =========================================================

// Security headers & CORS / Session (Only if not running in CLI mode)
if (php_sapi_name() !== 'cli') {
    // Security headers
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains");  // HSTS
    header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
    header("X-Permitted-Cross-Domain-Policies: none");
    header("Cache-Control: no-store, no-cache, must-revalidate");  // Prevent caching of API responses
    header_remove("X-Powered-By");  // Hide PHP version

    // CORS — whitelist allowed origins
    $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8000', 'http://localhost:8080', 'http://127.0.0.1:8000', 'http://localhost'];
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
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    }
    catch (PDOException $e) {
        http_response_code(500);
        // Do not expose PDOException message to the client for security
        error_log('Database connection failed: ' . $e->getMessage());
        echo json_encode(['error' => 'Database connection failed. Please try again later.']);
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
    }
    catch (\Exception $e) {
        // silently skip if user lacks CREATE privileges
        error_log("Auto-migration failed: " . $e->getMessage());
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
    return (int)$_SESSION['user_id'];
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
    
    $stmt = db()->prepare("SELECT id, email, full_name_en, role, is_admin, approval_status FROM users WHERE id = ?");
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
    $isAdmin = (bool)($user['is_admin'] || $userRole === 'admin');

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

function body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) return [];
    // Reject non-scalar values at top level to prevent NoSQL-style object injection
    // Only whitelisted fields may be arrays/objects
    $allowedArrayFields = ['skills', 'enrolled_courses', 'availability',
                           'required_skills', 'preferred_skills',
                           'preferred_project_type'];
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
    if (!is_string($value)) return '';
    return trim($value);
}

/**
 * Validate password strength. Returns error message string or null if valid.
 */
function validatePasswordStrength(string $password): ?string
{
    if (strlen($password) < 8) return 'Password must be at least 8 characters';
    if (!preg_match('/[A-Z]/', $password)) return 'Must include an uppercase letter';
    if (!preg_match('/[a-z]/', $password)) return 'Must include a lowercase letter';
    if (!preg_match('/[0-9]/', $password)) return 'Must include a number';
    if (!preg_match('/[^A-Za-z0-9]/', $password)) return 'Must include a special character';

    $common = ['password','123456','password123','12345678','qwerty','abc123',
               'admin','letmein','welcome','monkey','dragon','master','login',
               'iloveyou','sunshine','princess','password1','1234567'];
    if (in_array(strtolower($password), $common, true)) return 'This password is too common';

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
    $key = '_rl_' . $action;
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['count' => 0, 'start' => time()];
    }
    $rl = &$_SESSION[$key];

    // Reset window if expired
    if (time() - $rl['start'] > $windowSec) {
        $rl = ['count' => 0, 'start' => time()];
    }

    $rl['count']++;

    if ($rl['count'] > $maxAttempts) {
        $wait = $windowSec - (time() - $rl['start']);
        $unit = $wait > 60 ? ceil($wait / 60) . ' minutes' : $wait . ' seconds';
        respondError("Rate limit exceeded. Try again in $unit.", 429);
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
    $v = (int)$value;
    if ($v < $min || $v > $max) {
        respondError("$fieldName must be between $min and $max");
    }
    return $v;
}

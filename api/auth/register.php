<?php
// =========================================================
// ERTH MATCHING — User Registration with Email Verification
// =========================================================
// This endpoint:
// 1. Validates user input
// 2. Creates the user account (email_verified = 0)
// 3. Generates a secure 6-digit OTP
// 4. Sends the OTP to the user's email via PHPMailer
// 5. Returns instructions to verify
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';
require_once __DIR__ . '/mail_config.php';

// ── Ensure verification tables exist ──
ensureVerificationTables();

// Auto-migrate role column (backwards compat)
try {
    db()->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'");
} catch (\Exception $e) {
    try {
        db()->exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'student'");
    } catch (\Exception $e2) {
        // Already exists or permission denied — safe to ignore
    }
}

// ── Only accept POST requests ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

// ── Rate Limiting ──
rateLimit('register', 3, 3600);

$data = body();

// =========================================================
// INPUT VALIDATION
// =========================================================

$email      = strtolower(sanitizeString($data['email'] ?? ''));
$username   = trim($data['username'] ?? '');
$password   = $data['password'] ?? '';
$nameEn     = sanitizeString($data['full_name'] ?? '');

// Type validation — reject non-string inputs
if (!is_string($data['email'] ?? null) || !is_string($data['password'] ?? null) || !is_string($data['username'] ?? null)) {
    respondError('Invalid input format');
}
$studentId  = trim($data['student_id'] ?? '');
$collegeKey = trim($data['college_key'] ?? '');
$year       = $data['academic_year'] ?? null;
$major      = trim($data['major'] ?? '');
$role       = 'trainee'; // Self-registration is always for trainees
$courseId   = isset($data['course_id']) ? (int)$data['course_id'] : null;

// Required fields check
if (!$email || !$password || !$nameEn || !$username) {
    respondError('Email, password, full name, and username are required');
}

// Username validation
if (strlen($username) < 3 || strlen($username) > 16) {
    respondError('Username must be between 3 and 16 characters');
}
if (!preg_match('/^[a-zA-Z0-9_\.]+$/', $username)) {
    respondError('Username can only contain letters, numbers, underscores, and dots');
}

// Email format validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('Invalid email address');
}

// Restrict to allowed domain (if configured)
$allowedDomain = defined('ALLOWED_EMAIL_DOMAIN') && ALLOWED_EMAIL_DOMAIN ? ALLOWED_EMAIL_DOMAIN : 'nmu.edu.eg';
$domainPattern = '/^.+@' . preg_quote($allowedDomain, '/') . '$/i';
if (!preg_match($domainPattern, $email)) {
    respondError("Only @{$allowedDomain} email addresses are allowed");
}

// Password strength requirements
if (strlen($password) < 8) {
    respondError('Password must be at least 8 characters');
}

// Sanitize name (prevent XSS in emails/views)
$nameEn = htmlspecialchars($nameEn, ENT_QUOTES, 'UTF-8');

// =========================================================
// CHECK FOR EXISTING USER
// =========================================================

$chk = db()->prepare("SELECT id, email_verified FROM users WHERE email = ?");
$chk->execute([$email]);
$existing = $chk->fetch();

if ($existing) {
    // If user exists but email not verified, allow re-registration
    // (delete old account so they can register fresh)
    if (!$existing['email_verified']) {
        $delReq = db()->prepare("DELETE FROM registration_requests WHERE user_id = ?");
        $delReq->execute([$existing['id']]);
        $del = db()->prepare("DELETE FROM users WHERE id = ?");
        $del->execute([$existing['id']]);
    } else {
        respondError('Email already registered', 409);
    }
}

// Check for existing username (case-insensitive)
$chkUser = db()->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
$chkUser->execute([$username]);
if ($chkUser->fetch()) {
    respondError('Username already taken', 400);
}

// =========================================================
// CREATE USER ACCOUNT (pending approval)
// =========================================================

// Hash password with bcrypt (PASSWORD_DEFAULT)
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = db()->prepare("
    INSERT INTO users (full_name, username, email, password_hash, student_id, college_key, academic_year, major, role, approval_status, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
");
$stmt->execute([
    $nameEn,
    $username,
    $email,
    $hash,
    $studentId ?: null,
    $collegeKey ?: null,
    $year ?: null,
    $major ?: null,
    $role,
]);
$userId = (int)db()->lastInsertId();

// Create pending registration request
$reqStmt = db()->prepare("
    INSERT INTO registration_requests (user_id, course_id, status)
    VALUES (?, ?, 'pending')
    ON DUPLICATE KEY UPDATE course_id = VALUES(course_id), status = 'pending'
");
$reqStmt->execute([$userId, $courseId]);

// =========================================================
// GENERATE & SEND OTP
// =========================================================

try {
    $otpCode = createOtp($userId, $email, 'email_verify');
    sendOtpEmail($email, $nameEn, $otpCode);
} catch (\Exception $e) {
    // Log the error but don't expose SMTP details to the client
    error_log("OTP email send failed for user $userId: " . $e->getMessage());

    // Still create the account — user can resend OTP later
    // Store user_id in session so they can request resend
    $_SESSION['pending_verification_user_id'] = $userId;
    $_SESSION['pending_verification_email']   = $email;

    respond([
        'message'            => 'Account created but email delivery failed. Please use the resend option.',
        'requires_verification' => true,
        'user_id'            => $userId,
        'email'              => $email,
    ], 201);
}

// ── Store pending verification in session ──
$_SESSION['pending_verification_user_id'] = $userId;
$_SESSION['pending_verification_email']   = $email;

// ── Do NOT set user_id in session yet (not logged in until verified) ──

respond([
    'message'               => 'Registration successful! Please check your email for the verification code.',
    'requires_verification' => true,
    'user_id'               => $userId,
    'email'                 => $email,
], 201);

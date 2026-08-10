<?php
// =========================================================
// ERTH MATCHING — User Login (with email verification check)
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';

// ── Ensure verification tables exist ──
ensureVerificationTables();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

// =========================================================
// RATE LIMITING — 5 attempts per 15 min per IP
// =========================================================

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateKey = 'login_attempts_' . md5($ip);
$rateCheck = checkRateLimit($rateKey, 'login', 5, 15);
if (!$rateCheck['allowed']) {
    respondError(
        "Too many login attempts. Please try again in " . ceil($rateCheck['wait_seconds'] / 60) . " minutes.",
        429
    );
}

// =========================================================
// INPUT VALIDATION
// =========================================================

$data  = body();
$email = trim($data['email'] ?? $data['username'] ?? $data['identifier'] ?? '');
$pass  = $data['password'] ?? '';

if (!$email || !$pass) {
    respondError('Email and password are required');
}

// =========================================================
// AUTHENTICATE
// =========================================================

$identifier = strtolower(trim($email));

$stmt = db()->prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password_hash'])) {
    respondError('Invalid email or password', 401);
}

// =========================================================
// CHECK EMAIL VERIFICATION STATUS
// =========================================================

if (isset($user['email_verified']) && !$user['email_verified']) {
    // Store pending verification info so they can verify/resend
    $_SESSION['pending_verification_user_id'] = $user['id'];
    $_SESSION['pending_verification_email']   = $user['email'];

    respond([
        'error'                 => 'Please verify your email before logging in.',
        'requires_verification' => true,
        'user_id'               => $user['id'],
        'email'                 => $user['email'],
    ], 403);
}

// Check trainer/admin approval status
$status = $user['approval_status'] ?? 'approved';
if ($status === 'pending') {
    respond([
        'error'             => 'Your registration is pending approval by a trainer or administrator.',
        'requires_approval' => true,
        'user_id'           => $user['id'],
        'email'             => $user['email'],
    ], 403);
}
if ($status === 'rejected') {
    respond([
        'error'    => 'Your registration request was rejected by a trainer or administrator.',
        'rejected' => true,
    ], 403);
}

// =========================================================
// SUCCESS — Create session
// =========================================================

// Reset rate limit on success
$clearStmt = db()->prepare("DELETE FROM otp_rate_limits WHERE identifier = ? AND action = 'login'");
$clearStmt->execute([$rateKey]);

// Prevent session fixation
session_regenerate_id(true);

$_SESSION['user_id'] = $user['id'];

// Return safe user object
$user = sanitizeUserResponse($user, true);
respond(['user' => $user]);

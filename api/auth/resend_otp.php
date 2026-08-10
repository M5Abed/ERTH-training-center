<?php
// =========================================================
// ERTH MATCHING — Resend OTP Verification Code
// =========================================================
// This endpoint:
// 1. Validates the user exists and is unverified
// 2. Checks rate limits (max 3 resends per 15 minutes)
// 3. Generates a new OTP (invalidates previous ones)
// 4. Sends a fresh email via PHPMailer
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';
require_once __DIR__ . '/mail_config.php';

// ── Ensure verification tables exist ──
ensureVerificationTables();

// ── Only accept POST requests ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();

// =========================================================
// INPUT VALIDATION
// =========================================================

$userId = (int)($data['user_id'] ?? $_SESSION['pending_verification_user_id'] ?? 0);
$email  = strtolower(trim($data['email'] ?? $_SESSION['pending_verification_email'] ?? ''));

if (!$userId && !$email) {
    respondError('Please provide your email address or user ID');
}

// =========================================================
// FIND THE USER
// =========================================================

if ($userId) {
    $stmt = db()->prepare("SELECT id, email, full_name_en, email_verified FROM users WHERE id = ?");
    $stmt->execute([$userId]);
} else {
    $stmt = db()->prepare("SELECT id, email, full_name_en, email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
}
$user = $stmt->fetch();

if (!$user) {
    // Don't reveal whether the email exists (security best practice)
    respond([
        'message' => 'If this email is registered, a new verification code has been sent.',
    ]);
}

// Already verified
if ($user['email_verified']) {
    respond([
        'message'  => 'This email is already verified. You can log in.',
        'verified' => true,
    ]);
}

// =========================================================
// RATE LIMITING — Max 3 resends per 15 minutes
// =========================================================

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Rate limit by IP (prevents abuse from a single source)
$ipLimit = checkRateLimit("resend_ip_{$ip}", 'resend_otp', 5, 15);
if (!$ipLimit['allowed']) {
    $waitMin = ceil($ipLimit['wait_seconds'] / 60);
    respondError(
        "Too many requests from your network. Please wait {$waitMin} minute(s).",
        429
    );
}

// Rate limit by user (prevents spamming a specific email)
$userLimit = checkRateLimit("resend_user_{$user['id']}", 'resend_otp', 3, 15);
if (!$userLimit['allowed']) {
    $waitMin = ceil($userLimit['wait_seconds'] / 60);
    respondError(
        "Too many resend requests. Please wait {$waitMin} minute(s) before requesting another code.",
        429
    );
}

// =========================================================
// GENERATE & SEND NEW OTP
// =========================================================

try {
    $otpCode = createOtp($user['id'], $user['email'], 'email_verify');
    sendOtpEmail($user['email'], $user['full_name_en'], $otpCode);
} catch (\Exception $e) {
    error_log("Resend OTP email failed for user {$user['id']}: " . $e->getMessage());
    respondError(
        'Failed to send verification email. Please try again later.',
        500
    );
}

// ── Update session with pending verification ──
$_SESSION['pending_verification_user_id'] = $user['id'];
$_SESSION['pending_verification_email']   = $user['email'];

respond([
    'message'        => 'A new verification code has been sent to your email.',
    'attempts_left'  => $userLimit['attempts_left'],
    'user_id'        => $user['id'],
    'email'          => $user['email'],
]);

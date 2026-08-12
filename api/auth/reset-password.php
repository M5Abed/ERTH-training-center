<?php
// =========================================================
// ERTH MATCHING — Password Reset Request (Step 1 of 3)
// =========================================================
// Sends an OTP to the user's email for password recovery.
// Always returns success to prevent email enumeration.
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';
require_once __DIR__ . '/mail_config.php';

ensureVerificationTables();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();

// Type validation
if (!is_string($data['email'] ?? null)) {
    respondError('Invalid input format');
}

$email = strtolower(sanitizeString($data['email'] ?? ''));

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('Please enter a valid email address');
}

// ── Rate limit: 3 requests per 15 minutes per IP ──
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateCheck = checkRateLimit("reset_request_{$ip}", 'reset_request', 3, 15);

if (!$rateCheck['allowed']) {
    $waitMin = ceil($rateCheck['wait_seconds'] / 60);
    respondError(
        "Too many reset requests. Please wait {$waitMin} minute(s).",
        429
    );
}

// ── Look up user ──
$stmt = db()->prepare("SELECT id, email, full_name, email_verified FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always respond with success to prevent email enumeration
// But only actually send the OTP if the user exists and is verified
if ($user && $user['email_verified']) {
    try {
        $otpCode = createOtp((int)$user['id'], $user['email'], 'password_reset');
        sendOtpEmail($user['email'], $user['full_name'] ?: 'User', $otpCode);

        // Store in session for the next step
        $_SESSION['reset_user_id'] = $user['id'];
        $_SESSION['reset_email']   = $user['email'];
    } catch (\Exception $e) {
        error_log("Password reset OTP failed for {$email}: " . $e->getMessage());
    }
}

respond([
    'message' => 'If an account exists with that email, a verification code has been sent.',
    'ok'      => true,
]);

<?php
// =========================================================
// ERTH MATCHING — Password Reset Verify OTP (Step 2 of 3)
// =========================================================
// Verifies the OTP sent during password reset.
// On success, issues a short-lived reset token stored in session.
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';

ensureVerificationTables();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();

// Type validation
if (!is_string($data['email'] ?? null) || !is_string($data['otp'] ?? null)) {
    respondError('Invalid input format');
}

$email    = strtolower(sanitizeString($data['email'] ?? ''));
$otpInput = sanitizeString($data['otp'] ?? '');

if (!$email || !preg_match('/^\d{6}$/', $otpInput)) {
    respondError('Please enter a valid 6-digit code');
}

// ── Rate limit: 10 attempts per 15 min per IP ──
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateCheck = checkRateLimit("reset_verify_{$ip}", 'reset_verify', 10, 15);

if (!$rateCheck['allowed']) {
    $waitMin = ceil($rateCheck['wait_seconds'] / 60);
    respondError(
        "Too many attempts. Please wait {$waitMin} minute(s).",
        429
    );
}

// ── Look up user ──
$stmt = db()->prepare("SELECT id, email FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    respondError('Invalid email or code', 400);
}

$userId = (int)$user['id'];

// ── Verify OTP ──
$result = verifyOtp($userId, $otpInput, 'password_reset');

if (!$result['success']) {
    respondError($result['error'], 400);
}

// ── Success: create a short-lived reset token ──
$resetToken = bin2hex(random_bytes(32));

$_SESSION['reset_token']       = $resetToken;
$_SESSION['reset_token_uid']   = $userId;
$_SESSION['reset_token_email'] = $email;
$_SESSION['reset_token_exp']   = time() + 300; // 5 minutes

respond([
    'message'     => 'Code verified. You can now set a new password.',
    'can_reset'   => true,
    'reset_token' => $resetToken,
]);

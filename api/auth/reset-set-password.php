<?php
// =========================================================
// ERTH MATCHING — Password Reset Set New Password (Step 3 of 3)
// =========================================================
// Sets the new password after OTP verification.
// Requires the reset_token from Step 2.
// Does NOT log the user in — forces a fresh login.
// =========================================================

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();

// Type validation
if (!is_string($data['reset_token'] ?? null) || !is_string($data['password'] ?? null)) {
    respondError('Invalid input format');
}

$resetToken = sanitizeString($data['reset_token'] ?? '');
$email      = strtolower(sanitizeString($data['email'] ?? ''));
$newPw      = $data['password'] ?? '';

// ── Validate reset token from session ──
$sessionToken = $_SESSION['reset_token'] ?? '';
$sessionUid   = $_SESSION['reset_token_uid'] ?? 0;
$sessionEmail = $_SESSION['reset_token_email'] ?? '';
$sessionExp   = $_SESSION['reset_token_exp'] ?? 0;

if (!$resetToken || !hash_equals($sessionToken, $resetToken)) {
    respondError('Invalid or expired reset token. Please start over.', 403);
}

if (time() > $sessionExp) {
    // Clean up expired token
    unset($_SESSION['reset_token'], $_SESSION['reset_token_uid'],
          $_SESSION['reset_token_email'], $_SESSION['reset_token_exp']);
    respondError('Reset token has expired. Please start over.', 403);
}

if ($email && $email !== $sessionEmail) {
    respondError('Email mismatch', 400);
}

// ── Enforce password strength ──
$strengthError = validatePasswordStrength($newPw);
if ($strengthError) {
    respondError($strengthError);
}

// ── Update password ──
$hash = password_hash($newPw, PASSWORD_DEFAULT);
db()->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $sessionUid]);

// ── Clean up session ──
unset($_SESSION['reset_token'], $_SESSION['reset_token_uid'],
      $_SESSION['reset_token_email'], $_SESSION['reset_token_exp']);

// Do NOT log the user in — force fresh login for security
respond([
    'ok'      => true,
    'message' => 'Password has been reset successfully. Please log in with your new password.',
]);

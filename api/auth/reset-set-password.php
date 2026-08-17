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

$newPw = (string) ($data['password'] ?? $data['new_password'] ?? '');
$resetToken = (string) ($data['reset_token'] ?? $data['resetToken'] ?? '');
$email = strtolower(trim((string) ($data['email'] ?? '')));

if (empty($newPw)) {
    respondError('Please enter a new password', 400);
}

// ── Validate reset token from session ──
$sessionToken = $_SESSION['reset_token'] ?? '';
$sessionUid = (int) ($_SESSION['reset_token_uid'] ?? 0);
$sessionEmail = $_SESSION['reset_token_email'] ?? '';
$sessionExp = (int) ($_SESSION['reset_token_exp'] ?? 0);

// If token wasn't passed in body but session has a valid token, use session token
if (!$resetToken && $sessionToken) {
    $resetToken = $sessionToken;
}

if (!$resetToken || !$sessionToken || !hash_equals($sessionToken, $resetToken)) {
    respondError('Invalid or expired reset token. Please start over.', 403);
}

if ($sessionExp && time() > $sessionExp) {
    // Clean up expired token
    unset(
        $_SESSION['reset_token'],
        $_SESSION['reset_token_uid'],
        $_SESSION['reset_token_email'],
        $_SESSION['reset_token_exp']
    );
    respondError('Reset token has expired. Please start over.', 403);
}

if ($email && $sessionEmail && $email !== $sessionEmail) {
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
unset(
    $_SESSION['reset_token'],
    $_SESSION['reset_token_uid'],
    $_SESSION['reset_token_email'],
    $_SESSION['reset_token_exp']
);

// Do NOT log the user in — force fresh login for security
respond([
    'ok' => true,
    'message' => 'Password has been reset successfully. Please log in with your new password.',
]);

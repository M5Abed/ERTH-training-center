<?php
// =========================================================
// ERTH MATCHING — Change Password (Secured)
// =========================================================
// Requires current password verification + strength rules.
// =========================================================

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { respondError('POST required', 405); }

$uid  = requireSession();
$data = body();

$currentPw = $data['current_password'] ?? '';
$newPw     = $data['password'] ?? '';

// ── Require current password ──
if (!$currentPw) {
    respondError('Current password is required');
}

if (!is_string($newPw) || !$newPw) {
    respondError('New password is required');
}

// ── Verify current password ──
$stmt = db()->prepare("SELECT password_hash FROM users WHERE id = ?");
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user || !password_verify($currentPw, $user['password_hash'])) {
    respondError('Current password is incorrect', 403);
}

// ── Enforce password strength (same rules as registration) ──
$strengthError = validatePasswordStrength($newPw);
if ($strengthError) {
    respondError($strengthError);
}

// ── Prevent reuse of same password ──
if (password_verify($newPw, $user['password_hash'])) {
    respondError('New password must be different from your current password');
}

$hash = password_hash($newPw, PASSWORD_DEFAULT);
db()->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $uid]);

respond(['ok' => true, 'message' => 'Password changed successfully']);

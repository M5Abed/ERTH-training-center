<?php
// =========================================================
// ERTH MATCHING — Delete Account (Secured)
// =========================================================
// Requires password confirmation for destructive action.
// Does not leak database error details.
// =========================================================

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

$uid = requireSession();
$data = body();

$password = $data['password'] ?? '';

// ── Require password confirmation for destructive action ──
if (!is_string($password) || !$password) {
    respondError('Password confirmation is required to delete your account');
}

$stmt = db()->prepare("SELECT password_hash FROM users WHERE id = ?");
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    respondError('Incorrect password', 403);
}

try {
    $stmt = db()->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$uid]);

    session_destroy();

    respond(['success' => true]);
} catch (PDOException $e) {
    error_log("Delete account error for uid=$uid: " . $e->getMessage());
    respondError('An error occurred. Please try again.', 500);
}

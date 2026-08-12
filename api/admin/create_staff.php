<?php
/**
 * POST /api/admin/create_staff.php
 * Admin-only: Creates a supervisor / teaching member account.
 */
require_once __DIR__ . '/../config.php';

$uid = requireSession();

// Verify admin
$adm = db()->prepare("SELECT is_admin FROM users WHERE id = ?");
$adm->execute([$uid]);
$row = $adm->fetch();
if (!$row || !$row['is_admin']) {
    respondError('Forbidden — admin only', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

$data = body();
$email    = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');
$name     = trim($data['full_name'] ?? '');
$role     = trim($data['role'] ?? 'ta');
$college  = trim($data['college_key'] ?? '');

// Validate
if (!$email || !$password || !$name) {
    respondError('Email, password, and name are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('Invalid email address');
}
if (strlen($password) < 8) {
    respondError('Password must be at least 8 characters');
}

$allowedRoles = ['ta', 'lecturer', 'professor', 'supervisor'];
if (!in_array($role, $allowedRoles)) {
    respondError('Invalid role. Allowed: ta, lecturer, professor, supervisor');
}

// Check if email already exists
$chk = db()->prepare("SELECT id FROM users WHERE email = ?");
$chk->execute([$email]);
if ($chk->fetch()) {
    respondError('A user with this email already exists');
}

// Create the account
$hash = password_hash($password, PASSWORD_DEFAULT);
$ins = db()->prepare("
    INSERT INTO users (email, password_hash, full_name, role, college_key, email_verified, created_at)
    VALUES (?, ?, ?, ?, ?, 1, NOW())
");
$ins->execute([$email, $hash, $name, $role, $college ?: null]);
$newId = db()->lastInsertId();

respond(['ok' => true, 'user_id' => $newId], 201);

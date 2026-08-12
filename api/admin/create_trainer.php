<?php
/**
 * POST /api/admin/create_trainer.php
 * Admin-only: Creates a trainer account (auto-approved, verified).
 */
require_once __DIR__ . '/../config.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

$data = body();
$email      = trim(strtolower($data['email'] ?? ''));
$username   = trim($data['username'] ?? '');
$password   = $data['password'] ?? '';
$name       = trim($data['full_name'] ?? '');
$college    = trim($data['college_key'] ?? '');
$department = trim($data['department'] ?? '');

// Validate
if (!$email || !$password || !$name) {
    respondError('Email, password, and full name are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respondError('Invalid email address');
}
if (strlen($password) < 8) {
    respondError('Password must be at least 8 characters');
}

// Generate username if not provided
if (!$username) {
    $parts = explode('@', $email);
    $username = preg_replace('/[^a-zA-Z0-9_]/', '', $parts[0]);
    if (strlen($username) < 3) $username = 'trainer_' . rand(100, 999);
}

// Check email
$chk = db()->prepare("SELECT id FROM users WHERE email = ?");
$chk->execute([$email]);
if ($chk->fetch()) {
    respondError('A user with this email already exists', 409);
}

// Create account with role='trainer', approval_status='approved', email_verified=1
$hash = password_hash($password, PASSWORD_DEFAULT);
$ins = db()->prepare("
    INSERT INTO users (email, username, password_hash, full_name, role, college_key, department, approval_status, email_verified, created_at)
    VALUES (?, ?, ?, ?, 'trainer', ?, ?, 'approved', 1, NOW())
");
$ins->execute([$email, $username, $hash, $name, $college ?: null, $department ?: null]);
$newId = db()->lastInsertId();

respond(['success' => true, 'user_id' => $newId, 'message' => 'Trainer account created successfully'], 201);

<?php
/**
 * POST /api/admin/create_trainer.php
 * Admin-only: Creates a trainer account (auto-approved, verified).
 */
require_once __DIR__ . '/../config.php';

$currentUser = requireRole(['admin', 'trainer', 'professor', 'supervisor', 'staff', 'faculty', 'doctor']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

$data = body();
$email      = trim(strtolower($data['email'] ?? ''));
$password   = $data['password'] ?? '';
$name       = trim($data['full_name'] ?? '');
$department = trim($data['department'] ?? '');
$role       = trim(strtolower($data['role'] ?? 'trainer'));

$allowedRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'admin'];
if (!in_array($role, $allowedRoles, true)) {
    $role = 'trainer';
}
$isAdmin = ($role === 'admin' || !empty($data['is_admin'])) ? 1 : 0;

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



// Check email
$chk = db()->prepare("SELECT id FROM users WHERE email = ?");
$chk->execute([$email]);
if ($chk->fetch()) {
    respondError('A user with this email already exists', 409);
}

// Create account with selected role, approval_status='approved', email_verified=1
$hash = password_hash($password, PASSWORD_DEFAULT);
$userUuid = generateUuidV4();
$ins = db()->prepare("
    INSERT INTO users (uuid, email, password_hash, full_name, role, is_admin, department, approval_status, email_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW())
");
$ins->execute([$userUuid, $email, $hash, $name, $role, $isAdmin, $department ?: null]);

respond(['success' => true, 'user_id' => $userUuid, 'id' => $userUuid, 'uuid' => $userUuid, 'role' => $role, 'message' => 'Trainer account created successfully'], 201);


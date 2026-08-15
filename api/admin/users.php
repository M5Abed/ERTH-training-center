<?php
// =========================================================
// NMU TRAINING — Admin Users List
// Access: Admins and Trainers
// =========================================================

require_once __DIR__ . '/../config.php';

$user = requireRole(['admin', 'trainer']);
$db = db();

$stmt = $db->query("
    SELECT id, email, username, full_name, role, is_admin, department, student_id, academic_year, major, approval_status, created_at
    FROM users
    ORDER BY id ASC
");
$users = $stmt->fetchAll();

respond(['users' => $users]);

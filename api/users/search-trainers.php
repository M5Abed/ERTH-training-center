<?php
/**
 * GET /api/users/search-trainers.php
 * Searches for registered users with trainer/admin roles.
 */
require_once __DIR__ . '/../config.php';

requireAdmin();

$q = trim($_GET['q'] ?? '');

$stmt = db()->prepare("
    SELECT id, email, full_name, role, department
    FROM users
    WHERE role IN ('trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'admin')
      AND (full_name LIKE ? OR email LIKE ?)
    LIMIT 20
");
$searchMatch = "%{$q}%";
$stmt->execute([$searchMatch, $searchMatch]);

respond($stmt->fetchAll());

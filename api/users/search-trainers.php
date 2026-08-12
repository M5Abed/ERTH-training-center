<?php
/**
 * GET /api/users/search-trainers.php
 * Searches for registered users with the 'trainer' or 'admin' role.
 */
require_once __DIR__ . '/../config.php';

requireAdmin(); // Only admins should search trainers for assignment

$q = trim($_GET['q'] ?? '');
if (!$q) {
  respond([]);
}

$stmt = db()->prepare("
    SELECT id, email, full_name, role, avatar_url, department
    FROM users 
    WHERE role IN ('trainer', 'admin') 
      AND full_name LIKE ? 
    LIMIT 10
");
$searchMatch = "%{$q}%";
$stmt->execute([$searchMatch]);
$results = $stmt->fetchAll();

respond($results);

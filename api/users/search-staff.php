<?php
/**
 * GET /api/users/search-staff.php
 * Searches for registered academic staff (professors, lecturers, TAs).
 */
require_once __DIR__ . '/../config.php';

requireSession(); // Must be logged in

$q = trim($_GET['q'] ?? '');
if (!$q) {
  respond([]);
}

$stmt = db()->prepare("
    SELECT id, email, full_name_en, role, avatar_url 
    FROM users 
    WHERE role IN ('ta', 'lecturer', 'professor') 
      AND full_name_en LIKE ? 
    LIMIT 10
");
$searchMatch = "%{$q}%";
$stmt->execute([$searchMatch]);
$results = $stmt->fetchAll();

respond($results);

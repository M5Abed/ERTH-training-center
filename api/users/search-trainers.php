<?php
/**
 * GET /api/users/search-trainers.php
 * Searches for registered users with trainer/admin roles.
 */
require_once __DIR__ . '/../config.php';

requireRole(['admin', 'trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator']);

$q = trim($_GET['q'] ?? '');

$stmt = db()->prepare("
    SELECT id, email, full_name, role, department
    FROM users
    WHERE (
        TRIM(LOWER(COALESCE(role, ''))) IN ('trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'doctor', 'faculty', 'teacher', 'admin', 'staff')
        OR is_admin = 1
        OR (TRIM(LOWER(COALESCE(role, ''))) NOT IN ('trainee', 'student') AND role IS NOT NULL AND role != '')
    )
    AND (approval_status != 'rejected' OR approval_status IS NULL)
    AND (full_name LIKE ? OR email LIKE ?)
    LIMIT 50
");
$searchMatch = "%{$q}%";
$stmt->execute([$searchMatch, $searchMatch]);

$results = $stmt->fetchAll();
foreach ($results as &$u) {
    if (!empty($u['id']) && is_numeric($u['id'])) {
        $u['uuid'] = getUserUuid((int)$u['id']);
        $u['id'] = $u['uuid'];
    }
}
unset($u);

respond($results);


<?php
/**
 * GET /api/users/search.php?q=...&academic_year=...&offset=...
 * Search users by name or student_id.
 * Requires an active session.
 */
require_once __DIR__ . '/../config.php';

requireSession();

$q          = trim($_GET['q'] ?? '');
$yearFilter = (int)($_GET['academic_year'] ?? 0);
$offset     = max(0, (int)($_GET['offset'] ?? 0));
$limit      = 30;

if (strlen($q) < 2) { respond([]); }

$like = '%' . $q . '%';

$where  = "(student_id LIKE ? OR full_name LIKE ? OR email LIKE ? OR CAST(id AS CHAR) = ?)";
$params = [$like, $like, $like, $q];

if ($yearFilter > 0) {
    $where   .= " AND academic_year = ?";
    $params[] = $yearFilter;
}

$stmt = db()->prepare("
    SELECT id, full_name, student_id AS academic_id,
           academic_year, major
    FROM users
    WHERE $where
    ORDER BY
        CASE
            WHEN student_id = ? THEN 1
            WHEN full_name LIKE ? THEN 2
            ELSE 3
        END ASC,
        full_name ASC
    LIMIT $limit OFFSET $offset
");
$stmt->execute(array_merge($params, [$q, $like]));
respond($stmt->fetchAll());

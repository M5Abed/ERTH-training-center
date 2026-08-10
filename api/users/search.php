<?php
/**
 * GET /api/users/search.php?q=...&college_key=...&academic_year=...&offset=...
 * Search users by name (EN/AR) or student_id.
 * Supports optional college and year filters, plus pagination.
 * Requires an active session.
 */
require_once __DIR__ . '/../config.php';

requireSession();

$q           = trim($_GET['q'] ?? '');
$collegeKey  = trim($_GET['college_key'] ?? '');
$yearFilter  = (int)($_GET['academic_year'] ?? 0);
$offset      = max(0, (int)($_GET['offset'] ?? 0));
$limit       = 30;

if (strlen($q) < 2) { respond([]); }

$like = '%' . $q . '%';
$start = $q . '%';

$where  = "(username LIKE ? OR student_id LIKE ? OR full_name_en LIKE ? OR CAST(id AS CHAR) = ?)";
$params = [$like, $like, $like, $q];

if ($collegeKey !== '') {
    $where   .= " AND college_key = ?";
    $params[] = $collegeKey;
}
if ($yearFilter > 0) {
    $where   .= " AND academic_year = ?";
    $params[] = $yearFilter;
}

$orderParams = [$q, $start, $q, $like];

$stmt = db()->prepare("
    SELECT id, username, full_name_en, student_id AS academic_id, college_key,
           academic_year, major, avatar_url
    FROM users
    WHERE $where
    ORDER BY 
        CASE 
            WHEN username = ? THEN 1
            WHEN username LIKE ? THEN 2
            WHEN student_id = ? THEN 3
            WHEN full_name_en LIKE ? THEN 4
            ELSE 5
        END ASC,
        username ASC,
        full_name_en ASC
    LIMIT $limit OFFSET $offset
");
$stmt->execute(array_merge($params, $orderParams));
respond($stmt->fetchAll());

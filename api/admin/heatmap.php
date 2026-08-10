<?php
require_once __DIR__ . '/../config.php';
requireAdmin();
$college = $_GET['college_key'] ?? null;

$where = $college ? 'WHERE u.college_key = ?' : '';
$vals  = $college ? [$college] : [];

$stmt = db()->prepare("
    SELECT us.skill_id,
           COUNT(DISTINCT us.user_id) AS user_count,
           AVG(us.proficiency) AS avg_proficiency,
           u.college_key
    FROM user_skills us
    JOIN users u ON u.id = us.user_id
    $where
    GROUP BY us.skill_id, u.college_key
    ORDER BY user_count DESC
");
$stmt->execute($vals);
respond($stmt->fetchAll());

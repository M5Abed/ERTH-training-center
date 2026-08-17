<?php
require_once __DIR__ . '/../config.php';

$db = db();

$totalTrainees = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'trainee'")->fetchColumn();
if ($totalTrainees === 0) {
    $totalTrainees = (int)$db->query("SELECT COUNT(DISTINCT trainee_id) FROM trainee_enrollments")->fetchColumn();
}
if ($totalTrainees === 0) {
    $totalTrainees = (int)$db->query("SELECT COUNT(*) FROM users WHERE (role IS NULL OR role = '' OR role = 'trainee') AND (is_admin = 0 OR is_admin IS NULL)")->fetchColumn();
}

$totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$totalProjects = (int)$db->query("SELECT COUNT(*) FROM training_ideas WHERE status != 'draft'")->fetchColumn();
$completedProjects = (int)$db->query("SELECT COUNT(*) FROM training_ideas WHERE status = 'approved'")->fetchColumn();

respond([
    'totalUsers'        => $totalUsers,
    'total_students'    => $totalTrainees,
    'totalTrainees'     => $totalTrainees,
    'total_projects'    => $totalProjects,
    'totalProjects'     => $totalProjects,
    'completedProjects' => $completedProjects
]);

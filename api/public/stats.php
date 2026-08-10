<?php
require_once __DIR__ . '/../config.php';

$db = db();

$totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$totalProjects = (int)$db->query("SELECT COUNT(*) FROM projects")->fetchColumn();
$completedProjects = (int)$db->query("SELECT COUNT(*) FROM projects WHERE status = 'completed'")->fetchColumn();

respond([
    'totalUsers' => $totalUsers,
    'totalProjects' => $totalProjects,
    'completedProjects' => $completedProjects
]);

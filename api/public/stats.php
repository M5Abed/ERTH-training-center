<?php
require_once __DIR__ . '/../config.php';

$db = db();

$totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$totalProjects = (int)$db->query("SELECT COUNT(*) FROM training_ideas")->fetchColumn();
$completedProjects = (int)$db->query("SELECT COUNT(*) FROM training_ideas WHERE status = 'approved'")->fetchColumn();

respond([
    'totalUsers' => $totalUsers,
    'totalProjects' => $totalProjects,
    'completedProjects' => $completedProjects
]);

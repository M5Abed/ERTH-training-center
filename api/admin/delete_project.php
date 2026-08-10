<?php
/**
 * POST /api/admin/delete_project.php
 * Admin-only: permanently delete a project and all related data.
 * Body: { project_id }
 */
require_once __DIR__ . '/../config.php';

$uid = requireSession();
$data = body();

// Verify caller is admin
$adminCheck = db()->prepare("SELECT is_admin FROM users WHERE id = ?");
$adminCheck->execute([$uid]);
$caller = $adminCheck->fetch();
if (!$caller || !$caller['is_admin']) {
    respondError('Forbidden — admin only', 403);
}

$projectId = (int)($data['project_id'] ?? 0);
if (!$projectId)
    respondError('project_id required');

$db = db();

// Cascade delete
$db->prepare("DELETE FROM project_skills WHERE project_id = ?")->execute([$projectId]);
$db->prepare("DELETE FROM project_applications WHERE project_id = ?")->execute([$projectId]);
$db->prepare("DELETE FROM team_members WHERE project_id = ?")->execute([$projectId]);
$db->prepare("DELETE FROM notifications WHERE project_id = ?")->execute([$projectId]);
$db->prepare("DELETE FROM reviews WHERE project_id = ?")->execute([$projectId]);
$db->prepare("DELETE FROM projects WHERE id = ?")->execute([$projectId]);

respond(['ok' => true, 'deleted_project_id' => $projectId]);

<?php
/**
 * POST /api/admin/delete_user.php
 * Admin-only: permanently delete a user and all their data.
 * Body: { user_id }
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

$targetId = (int)($data['user_id'] ?? 0);
if (!$targetId)
    respondError('user_id required');
if ($targetId === $uid)
    respondError('Cannot delete your own account');

// Cascade-delete in the right order (FK constraints)
$db = db();

// 1. Notifications to user
$db->prepare("DELETE FROM notifications WHERE user_id = ?")->execute([$targetId]);

// 2. Reviews by or about user
$db->prepare("DELETE FROM reviews WHERE reviewer_id = ? OR reviewee_id = ?")->execute([$targetId, $targetId]);

// 3. Applications
$db->prepare("DELETE FROM project_applications WHERE applicant_id = ?")->execute([$targetId]);

// 4. Team memberships
$db->prepare("DELETE FROM team_members WHERE user_id = ?")->execute([$targetId]);

// 5. Project skills + applications for projects owned by this user
$ownedProjects = $db->prepare("SELECT id FROM projects WHERE owner_id = ?");
$ownedProjects->execute([$targetId]);
foreach ($ownedProjects->fetchAll() as $p) {
    $pid = $p['id'];
    $db->prepare("DELETE FROM project_skills WHERE project_id = ?")->execute([$pid]);
    $db->prepare("DELETE FROM project_applications WHERE project_id = ?")->execute([$pid]);
    $db->prepare("DELETE FROM team_members WHERE project_id = ?")->execute([$pid]);
    $db->prepare("DELETE FROM notifications WHERE project_id = ?")->execute([$pid]);
}

// 6. Projects owned by user
$db->prepare("DELETE FROM projects WHERE owner_id = ?")->execute([$targetId]);

// 7. User skills & preferences
$db->prepare("DELETE FROM user_skills WHERE user_id = ?")->execute([$targetId]);
$db->prepare("DELETE FROM user_preferences WHERE user_id = ?")->execute([$targetId]);

// 8. Finally, delete the user
$db->prepare("DELETE FROM users WHERE id = ?")->execute([$targetId]);

respond(['ok' => true, 'deleted_user_id' => $targetId]);

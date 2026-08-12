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

// 2. Trainee Enrollments & Topic Progress
$db->prepare("DELETE FROM trainee_enrollments WHERE trainee_id = ?")->execute([$targetId]);
$db->prepare("DELETE FROM trainee_topic_progress WHERE trainee_id = ?")->execute([$targetId]);

// 3. Training Ideas owned by user
$ownedIdeas = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ?");
$ownedIdeas->execute([$targetId]);
foreach ($ownedIdeas->fetchAll() as $idea) {
    $ideaId = $idea['id'];
    $db->prepare("DELETE FROM training_documents WHERE idea_id = ?")->execute([$ideaId]);
    $db->prepare("DELETE FROM training_votes WHERE idea_id = ?")->execute([$ideaId]);
    $db->prepare("DELETE FROM training_ideas WHERE id = ?")->execute([$ideaId]);
}

// 4. Trainer Assignments
$db->prepare("DELETE FROM trainer_assignments WHERE trainer_id = ?")->execute([$targetId]);

// 5. Registration Requests
$db->prepare("DELETE FROM registration_requests WHERE user_id = ?")->execute([$targetId]);

// 6. Finally, delete the user
$db->prepare("DELETE FROM users WHERE id = ?")->execute([$targetId]);

respond(['ok' => true, 'deleted_user_id' => $targetId]);

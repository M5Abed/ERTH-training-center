<?php
/**
 * POST /api/admin/delete_user.php
 * Admin-only: permanently delete a user and all their data.
 * Body: { user_id }
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../users/delete_helper.php';

$uid = requireAdmin();
$data = body();

$targetId = (int)($data['user_id'] ?? 0);
if (!$targetId)
    respondError('user_id required');
if ($targetId === $uid)
    respondError('Cannot delete your own account');

try {
    cascadeDeleteUser(db(), $targetId);
    respond(['success' => true]);
} catch (Throwable $e) {
    error_log("Admin delete user error: " . $e->getMessage());
    respondError('Failed to delete user');
}

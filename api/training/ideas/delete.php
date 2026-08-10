<?php
// =========================================================
// NMU TRAINING — Delete Trainee Idea
// Access: Idea Owner, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int)($user['id'] ?? 0);
    $role = strtolower($user['role'] ?? '');
    $isAdmin = (!empty($user['is_admin']) || $role === 'admin');
    $isTrainer = ($role === 'trainer');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $ideaId = (int)($data['idea_id'] ?? $_POST['idea_id'] ?? $_GET['idea_id'] ?? 0);

    if (!$ideaId) {
        respondError('Idea ID is required', 400);
    }

    $db = db();

    // Verify idea exists & check authorization
    $stmt = $db->prepare("SELECT id, trainee_id, owner_id FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();

    if (!$idea) {
        respondError('Idea not found or already deleted', 404);
    }

    $ideaTraineeId = (int)($idea['trainee_id'] ?? 0);
    $ideaOwnerId = (int)($idea['owner_id'] ?? 0);
    $isOwner = ($uid > 0 && ($uid === $ideaTraineeId || $uid === $ideaOwnerId));

    if (!$isOwner && !$isAdmin && !$isTrainer) {
        respondError('Unauthorized: You can only delete your own project ideas', 403);
    }

    // Delete associated votes if table exists
    try {
        $db->prepare("DELETE FROM training_votes WHERE idea_id = ?")->execute([$ideaId]);
    } catch (Throwable $e) {
        // Table might not exist yet
    }

    // Delete associated documents if table exists
    try {
        $db->prepare("DELETE FROM training_documents WHERE idea_id = ?")->execute([$ideaId]);
    } catch (Throwable $e) {
        // Table might not exist yet
    }

    // Delete the idea itself
    $del = $db->prepare("DELETE FROM training_ideas WHERE id = ?");
    $del->execute([$ideaId]);

    respond([
        'success' => true,
        'message' => 'Project idea deleted successfully'
    ]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}

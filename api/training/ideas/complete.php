<?php
// =========================================================
// NMU TRAINING — Mark Trainee Project / Idea as Completed
// Access: Trainee (owner of approved project), Trainer, Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int)$user['id'];

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $ideaId = (int)($data['idea_id'] ?? 0);

    if (!$ideaId) {
        respondError('Idea ID is required');
    }

    $db = db();

    // Fetch idea
    $stmt = $db->prepare("SELECT id, trainee_id, owner_id, course_id, title_en, status, reviewed_by FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();

    if (!$idea) {
        respondError('Project idea not found', 404);
    }

    $ownerId = (int)($idea['trainee_id'] ?: $idea['owner_id']);
    $isOwner = ($ownerId === $uid);
    $isAdminOrTrainer = in_array(strtolower($user['role']), ['trainer', 'admin'], true) || $user['is_admin'];

    if (!$isOwner && !$isAdminOrTrainer) {
        respondError('Unauthorized to modify this project status', 403);
    }

    // Update status to 'completed'
    $upd = $db->prepare("UPDATE training_ideas SET status = 'completed', updated_at = NOW() WHERE id = ?");
    $upd->execute([$ideaId]);

    // Send notification to reviewer/trainers if updated by trainee
    if ($isOwner) {
        $reviewerId = (int)($idea['reviewed_by'] ?? 0);
        if ($reviewerId) {
            try {
                $nStmt = $db->prepare("
                    INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar)
                    VALUES (?, 'project_completed', 'Project Completed', 'تم إكمال المشروع', ?, ?)
                ");
                $msgEn = "Trainee has marked project '{$idea['title_en']}' as completed.";
                $msgAr = "قام المتدرب بتحديد المشروع '{$idea['title_en']}' كـ مكتمل.";
                $nStmt->execute([$reviewerId, $msgEn, $msgAr]);
            } catch (Exception $e) {
                // Ignore if notifications table doesn't support
            }
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Project marked as completed successfully',
        'status' => 'completed'
    ]);

} catch (Exception $e) {
    respondError($e->getMessage(), 500);
}

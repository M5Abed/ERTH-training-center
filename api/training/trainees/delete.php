<?php
// =========================================================
// NMU TRAINING — Delete Trainee Record
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    respondError('Method not allowed', 405);
}

$data = body();
$traineeId = (int)($data['trainee_id'] ?? $data['id'] ?? ($_GET['id'] ?? 0));

if (!$traineeId) {
    respondError('Trainee ID is required');
}

$db = db();

// Ensure the user exists and is a trainee
$chk = $db->prepare("SELECT id, role, full_name, email FROM users WHERE id = ?");
$chk->execute([$traineeId]);
$target = $chk->fetch();

if (!$target) {
    respondError('Trainee not found', 404);
}

if ($target['role'] !== 'trainee') {
    respondError('Only trainee accounts can be deleted through this endpoint', 403);
}

// If caller is trainer (not admin), check if they share a course
$isAdmin = !empty($caller['is_admin']) || ($caller['role'] ?? '') === 'admin';
if (!$isAdmin) {
    $cChk = $db->prepare("
        SELECT 1 FROM trainee_enrollments te
        JOIN trainer_assignments ta ON te.course_id = ta.course_id
        WHERE te.trainee_id = ? AND ta.trainer_id = ?
        LIMIT 1
    ");
    $cChk->execute([$traineeId, $caller['id']]);
    if (!$cChk->fetch()) {
        respondError('You can only delete trainees enrolled in your assigned courses', 403);
    }
}

try {
    $db->beginTransaction();

    // 1. Remove from trainee progress and docs
    $db->prepare("DELETE FROM trainee_topic_progress WHERE trainee_id = ?")->execute([$traineeId]);
    $db->prepare("DELETE FROM trainee_documentation WHERE trainee_id = ?")->execute([$traineeId]);
    $db->prepare("DELETE FROM trainee_enrollments WHERE trainee_id = ?")->execute([$traineeId]);
    $db->prepare("DELETE FROM training_evaluations WHERE trainee_id = ?")->execute([$traineeId]);
    $db->prepare("DELETE FROM training_certificates WHERE trainee_id = ?")->execute([$traineeId]);
    $db->prepare("DELETE FROM training_idea_members WHERE user_id = ?")->execute([$traineeId]);

    // 2. Remove auxiliary user records
    try { $db->prepare("DELETE FROM notifications WHERE user_id = ?")->execute([$traineeId]); } catch (Throwable $e) {}
    try { $db->prepare("DELETE FROM otp_codes WHERE user_id = ?")->execute([$traineeId]); } catch (Throwable $e) {}
    try { $db->prepare("DELETE FROM ai_user_usage WHERE user_id = ?")->execute([$traineeId]); } catch (Throwable $e) {}
    try { $db->prepare("DELETE FROM registration_requests WHERE user_id = ?")->execute([$traineeId]); } catch (Throwable $e) {}

    // 3. Remove ideas owned by this trainee if any
    $myIdeas = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ?");
    $myIdeas->execute([$traineeId]);
    $ideaIds = $myIdeas->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ideaIds as $iid) {
        try { $db->prepare("DELETE FROM training_idea_members WHERE idea_id = ?")->execute([$iid]); } catch (Throwable $e) {}
        try { $db->prepare("DELETE FROM training_votes WHERE idea_id = ?")->execute([$iid]); } catch (Throwable $e) {}
        try { $db->prepare("DELETE FROM trainee_documentation WHERE idea_id = ?")->execute([$iid]); } catch (Throwable $e) {}
        try { $db->prepare("DELETE FROM training_documents WHERE idea_id = ?")->execute([$iid]); } catch (Throwable $e) {}
        $db->prepare("DELETE FROM training_ideas WHERE id = ?")->execute([$iid]);
    }

    // 4. Remove user account
    $db->prepare("DELETE FROM users WHERE id = ? AND role = 'trainee'")->execute([$traineeId]);

    $db->commit();

    respond([
        'success' => true,
        'message' => 'Trainee deleted successfully'
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    respondError('Failed to delete trainee: ' . $e->getMessage(), 500);
}

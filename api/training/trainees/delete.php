<?php
// =========================================================
// NMU TRAINING — Delete Trainee Record
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../users/delete_helper.php';

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

if ($target['role'] !== 'trainee' && $target['role'] !== 'student') {
    respondError('Only trainee accounts can be deleted through this endpoint', 403);
}

// Trainer/Admin can delete any trainee in the system
try {
    $ok = cascadeDeleteUser($db, $traineeId, 'trainee');
    if (!$ok) {
        respondError('Failed to verify trainee during delete', 500);
    }

    respond([
        'success' => true,
        'message' => 'Trainee deleted successfully'
    ]);
} catch (Throwable $e) {
    error_log("Delete trainee error: " . $e->getMessage());
    respondError('Failed to delete trainee: ' . $e->getMessage(), 500);
}

<?php
// =========================================================
// NMU TRAINING — Delete All Trainees
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../users/delete_helper.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    respondError('Method not allowed', 405);
}

$db = db();

try {
    // 1. Get all trainee IDs (both trainee and student roles, excluding admins/trainers)
    $stmt = $db->query("
        SELECT id FROM users 
        WHERE (LOWER(COALESCE(role, '')) IN ('trainee', 'student', '') OR role IS NULL)
          AND (is_admin = 0 OR is_admin IS NULL)
          AND LOWER(COALESCE(role, '')) NOT IN ('admin', 'trainer', 'professor', 'ta', 'supervisor', 'evaluator')
    ");
    $traineeIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($traineeIds)) {
        respond([
            'success' => true,
            'message' => 'No trainees to delete',
            'deleted_count' => 0
        ]);
        exit;
    }

    $deletedCount = 0;
    foreach ($traineeIds as $tid) {
        try {
            $ok = cascadeDeleteUser($db, (int)$tid, null);
            if ($ok) {
                $deletedCount++;
            }
        } catch (Throwable $innerErr) {
            error_log("Error deleting trainee $tid: " . $innerErr->getMessage());
        }
    }

    respond([
        'success' => true,
        'message' => "Successfully deleted $deletedCount trainees",
        'deleted_count' => $deletedCount
    ]);
} catch (Throwable $e) {
    error_log("Failed to delete all trainees: " . $e->getMessage());
    respondError('An error occurred while deleting trainees: ' . $e->getMessage(), 500);
}

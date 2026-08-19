<?php
// =========================================================
// NMU TRAINING — Associate/Disassociate Provider with Course
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$adminId = requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = (int)($data['course_id'] ?? 0);
$providerId = (int)($data['provider_id'] ?? 0);
$action = strtolower(trim($data['action'] ?? 'add')); // 'add' or 'remove'

if (!$courseId || !$providerId) {
    respondError('Course ID and Provider ID are required', 400);
}

$db = db();

try {
    // Check course existence
    $cStmt = $db->prepare("SELECT id FROM training_courses WHERE id = ?");
    $cStmt->execute([$courseId]);
    if (!$cStmt->fetch()) {
        respondError('Course not found', 404);
    }

    // Check provider existence
    $pStmt = $db->prepare("SELECT id FROM external_training_providers WHERE id = ?");
    $pStmt->execute([$providerId]);
    if (!$pStmt->fetch()) {
        respondError('Provider not found', 404);
    }

    if ($action === 'remove') {
        // Prevent removal if students are already assigned
        $stCheck = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ? AND provider_id = ?");
        $stCheck->execute([$courseId, $providerId]);
        if ((int)$stCheck->fetchColumn() > 0) {
            respondError('Cannot remove provider from this course because students are currently enrolled under it.', 400);
        }

        $del = $db->prepare("DELETE FROM course_external_providers WHERE course_id = ? AND provider_id = ?");
        $del->execute([$courseId, $providerId]);

        respond([
            'success' => true,
            'message' => 'Provider removed from course successfully'
        ]);
    } else {
        $ins = $db->prepare("INSERT IGNORE INTO course_external_providers (course_id, provider_id) VALUES (?, ?)");
        $ins->execute([$courseId, $providerId]);

        respond([
            'success' => true,
            'message' => 'Provider associated with course successfully'
        ]);
    }
} catch (Throwable $e) {
    respondError('Database error: ' . $e->getMessage(), 500);
}

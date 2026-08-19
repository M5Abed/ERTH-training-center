<?php
// =========================================================
// NMU TRAINING — Delete or Deactivate External Provider
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$adminId = requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    respondError('Method not allowed', 405);
}

$data = body();
$providerId = (int)($data['id'] ?? $data['provider_id'] ?? $_GET['id'] ?? 0);

if (!$providerId) {
    respondError('Provider ID is required', 400);
}

$db = db();

try {
    // Check references
    $enrCheck = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE provider_id = ?");
    $enrCheck->execute([$providerId]);
    $studentCount = (int)$enrCheck->fetchColumn();

    $trackCheck = $db->prepare("SELECT COUNT(*) FROM training_topics WHERE provider_id = ?");
    $trackCheck->execute([$providerId]);
    $trackCount = (int)$trackCheck->fetchColumn();

    if ($studentCount > 0 || $trackCount > 0) {
        // Soft deactivate to preserve student & historical records
        $stmt = $db->prepare("UPDATE external_training_providers SET status = 'inactive', updated_at = NOW() WHERE id = ?");
        $stmt->execute([$providerId]);
        respond([
            'success' => true,
            'deactivated' => true,
            'message' => 'Provider was deactivated instead of deleted because active students or tracks are associated with it.'
        ]);
    } else {
        // Safe to hard delete associations and provider
        $db->prepare("DELETE FROM course_external_providers WHERE provider_id = ?")->execute([$providerId]);
        $db->prepare("DELETE FROM external_training_providers WHERE id = ?")->execute([$providerId]);
        respond([
            'success' => true,
            'message' => 'Provider deleted successfully'
        ]);
    }
} catch (Throwable $e) {
    respondError('Failed to delete provider: ' . $e->getMessage(), 500);
}

<?php
// =========================================================
// NMU TRAINING — List External Training Providers
// Access: All authenticated users (Admin / Trainer / Trainee)
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$role = strtolower($user['role'] ?? '');
$isAdmin = (!empty($user['is_admin']) || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
$includeAll = isset($_GET['all']) && $isAdmin;

$db = db();

try {
    if ($courseId > 0) {
        // Return providers associated with this specific course
        $stmt = $db->prepare("
            SELECT p.*,
                   cep.id AS course_provider_id,
                   (SELECT COUNT(*) FROM training_topics tt WHERE tt.course_id = ? AND tt.provider_id = p.id) AS track_count,
                   (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.course_id = ? AND te.provider_id = p.id) AS trainee_count
            FROM external_training_providers p
            JOIN course_external_providers cep ON cep.provider_id = p.id
            WHERE cep.course_id = ? AND (p.status = 'active' OR ? = 1)
            ORDER BY p.is_contracted DESC, p.name ASC
        ");
        $stmt->execute([$courseId, $courseId, $courseId, $isAdmin ? 1 : 0]);
        $providers = $stmt->fetchAll();
    } else {
        // Return all providers
        $stmt = $db->prepare("
            SELECT p.*,
                   (SELECT COUNT(*) FROM course_external_providers cep WHERE cep.provider_id = p.id) AS course_count,
                   (SELECT COUNT(*) FROM training_topics tt WHERE tt.provider_id = p.id) AS track_count,
                   (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.provider_id = p.id) AS trainee_count
            FROM external_training_providers p
            WHERE (p.status = 'active' OR ? = 1)
            ORDER BY p.is_contracted DESC, p.name ASC
        ");
        $stmt->execute([$isAdmin ? 1 : 0]);
        $providers = $stmt->fetchAll();
    }

    respond([
        'success' => true,
        'providers' => $providers
    ]);
} catch (Throwable $e) {
    respondError('Failed to fetch providers: ' . $e->getMessage(), 500);
}

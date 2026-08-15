<?php
// =========================================================
// NMU TRAINING — Delete Topic Material
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$contentId = (int)($data['id'] ?? 0);

if (!$contentId) {
    respondError('Content ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT tc.id, tc.url, tt.course_id 
    FROM topic_content tc
    JOIN training_topics tt ON tc.topic_id = tt.id
    WHERE tc.id = ?
");
$stmt->execute([$contentId]);
$content = $stmt->fetch();

if (!$content) {
    respondError('Material not found', 404);
}

verifyCourseAccess((int)$content['course_id'], $user);

// Clean up local file if stored locally
if (!empty($content['url']) && str_starts_with($content['url'], '/uploads/')) {
    $filePath = realpath(__DIR__ . '/../../../' . ltrim($content['url'], '/'));
    $uploadsBase = realpath(__DIR__ . '/../../../uploads');
    if ($filePath && $uploadsBase && str_starts_with($filePath, $uploadsBase) && file_exists($filePath)) {
        @unlink($filePath);
    }
}

$del = $db->prepare("DELETE FROM topic_content WHERE id = ?");
$del->execute([$contentId]);

respond([
    'success' => true,
    'message' => 'Material deleted successfully'
]);

<?php
// =========================================================
// NMU TRAINING — List Topics for Course
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT tt.*,
           (SELECT COUNT(*) FROM topic_content WHERE topic_id = tt.id) AS material_count,
           (SELECT COUNT(*) FROM trainee_topic_progress WHERE topic_id = tt.id AND trainee_id = ?) AS is_completed
    FROM training_topics tt
    WHERE tt.course_id = ?
    ORDER BY tt.order_index ASC, tt.id ASC
");
$stmt->execute([$uid, $courseId]);
$topics = $stmt->fetchAll();

respond(['topics' => $topics]);

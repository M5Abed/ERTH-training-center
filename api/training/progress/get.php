<?php
// =========================================================
// NMU TRAINING — Get Trainee Course Progress
// Access: Trainee, Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$targetTraineeId = isset($_GET['trainee_id']) ? (int)$_GET['trainee_id'] : $uid;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();

// Total topics
$totStmt = $db->prepare("SELECT COUNT(*) FROM training_topics WHERE course_id = ?");
$totStmt->execute([$courseId]);
$totalTopics = (int)$totStmt->fetchColumn();

// Viewed topics
$vwStmt = $db->prepare("
    SELECT ttp.topic_id 
    FROM trainee_topic_progress ttp
    JOIN training_topics tt ON ttp.topic_id = tt.id
    WHERE tt.course_id = ? AND ttp.trainee_id = ?
");
$vwStmt->execute([$courseId, $targetTraineeId]);
$viewedTopicIds = $vwStmt->fetchAll(PDO::FETCH_COLUMN);

$percentage = $totalTopics > 0 ? round((count($viewedTopicIds) / $totalTopics) * 100, 1) : 0;

respond([
    'total_topics' => $totalTopics,
    'completed_topics_count' => count($viewedTopicIds),
    'completed_topic_ids' => $viewedTopicIds,
    'completion_percentage' => $percentage
]);

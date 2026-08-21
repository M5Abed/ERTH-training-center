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

$courseId = resolveCourseId($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$providerIdParam = isset($_GET['provider_id']) ? $_GET['provider_id'] : null;

$db = db();

$query = "
    SELECT tt.*,
           p.name AS provider_name,
           (SELECT COUNT(*) FROM topic_content WHERE topic_id = tt.id) AS material_count,
           (SELECT COUNT(*) FROM trainee_topic_progress WHERE topic_id = tt.id AND trainee_id = ?) AS is_completed,
           (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.track_id = tt.id AND te.course_id = tt.course_id) AS trainee_count
    FROM training_topics tt
    LEFT JOIN external_training_providers p ON tt.provider_id = p.id
    WHERE tt.course_id = ?
";
$params = [$uid, $courseId];

if ($providerIdParam !== null) {
    if ($providerIdParam === 'internal' || $providerIdParam === '0' || $providerIdParam === '') {
        $query .= " AND tt.provider_id IS NULL";
    } else {
        $query .= " AND tt.provider_id = ?";
        $params[] = (int)$providerIdParam;
    }
}

$query .= " ORDER BY tt.provider_id ASC, tt.order_index ASC, tt.id ASC";

$stmt = $db->prepare($query);
$stmt->execute($params);
$topics = $stmt->fetchAll();

foreach ($topics as &$tp) {
    if (!empty($tp['course_id']) && is_numeric($tp['course_id'])) {
        $tp['course_id'] = getCourseUuid((int)$tp['course_id']);
    }
}
unset($tp);

respond(['topics' => $topics]);

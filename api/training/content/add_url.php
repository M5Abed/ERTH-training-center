<?php
// =========================================================
// NMU TRAINING — Add External Material Link (URL/YouTube)
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$topicId = (int)($data['topic_id'] ?? 0);
$titleEn = sanitizeString($data['title'] ?? '');
$titleAr = sanitizeString($data['title'] ?? '');
$url     = trim($data['url'] ?? '');
$type    = trim(strtolower($data['type'] ?? 'url')); // url, youtube

if (!$topicId || !$url) {
    respondError('Topic ID and URL are required');
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    respondError('Invalid URL provided');
}

$db = db();
$topicRow = $db->prepare("SELECT tt.course_id, tt.title FROM training_topics tt WHERE tt.id = ?");
$topicRow->execute([$topicId]);
$topic = $topicRow->fetch();
if (!$topic) {
    respondError('Topic not found', 404);
}

verifyCourseAccess((int)$topic['course_id'], $user);

$stmt = $db->prepare("
    INSERT INTO topic_content (topic_id, uploaded_by, type, title, url)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->execute([
    $topicId,
    $user['id'],
    $type === 'youtube' ? 'youtube' : 'url',
    $titleEn ?: $url,
    $url
]);
$contentId = (int)$db->lastInsertId();
if ($topic) {
    $enrolledStmt = $db->prepare("SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?");
    $enrolledStmt->execute([$topic['course_id']]);
    $enrolled = $enrolledStmt->fetchAll(PDO::FETCH_COLUMN);
    if ($enrolled) {
        $matTitle = $titleEn ?: $url;
        $nStmt = $db->prepare("INSERT INTO notifications (user_id, type, message_en, message_ar) VALUES (?, 'new_content', ?, ?)");
        foreach ($enrolled as $tid) {
            $msgEn = "New link added to topic \"{$topic['title']}\": $matTitle";
            $msgAr = "تم إضافة رابط جديد إلى الموضوع \"{$topic['title']}\": $matTitle";
            $nStmt->execute([(int)$tid, $msgEn, $msgAr]);
        }
    }
}

respond([
    'success'    => true,
    'message'    => 'Link added successfully',
    'content_id' => $contentId
], 201);

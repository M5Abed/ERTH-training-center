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
$titleEn = sanitizeString($data['title_en'] ?? '');
$titleAr = sanitizeString($data['title_ar'] ?? '');
$url     = trim($data['url'] ?? '');
$type    = trim(strtolower($data['type'] ?? 'url')); // url, youtube

if (!$topicId || !$url) {
    respondError('Topic ID and URL are required');
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    respondError('Invalid URL provided');
}

$db = db();
$stmt = $db->prepare("
    INSERT INTO topic_content (topic_id, uploaded_by, type, title_en, title_ar, url)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $topicId,
    $user['id'],
    $type === 'youtube' ? 'youtube' : 'url',
    $titleEn ?: $url,
    $titleAr ?: null,
    $url
]);
$contentId = (int)$db->lastInsertId();

// Notify enrolled trainees
$topicRow = $db->prepare("SELECT tt.course_id, tt.title_en FROM training_topics tt WHERE tt.id = ?");
$topicRow->execute([$topicId]);
$topic = $topicRow->fetch();
if ($topic) {
    $enrolledStmt = $db->prepare("SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?");
    $enrolledStmt->execute([$topic['course_id']]);
    $enrolled = $enrolledStmt->fetchAll(PDO::FETCH_COLUMN);
    if ($enrolled) {
        $matTitle = $titleEn ?: $url;
        $nStmt = $db->prepare("INSERT INTO notifications (user_id, type, message_en, message_ar) VALUES (?, 'new_content', ?, ?)");
        foreach ($enrolled as $tid) {
            $msgEn = "New link added to topic \"{$topic['title_en']}\": $matTitle";
            $msgAr = "تم إضافة رابط جديد إلى الموضوع \"{$topic['title_en']}\": $matTitle";
            $nStmt->execute([(int)$tid, $msgEn, $msgAr]);
        }
    }
}

respond([
    'success'    => true,
    'message'    => 'Link added successfully',
    'content_id' => $contentId
], 201);

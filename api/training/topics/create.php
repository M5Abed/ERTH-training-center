<?php
// =========================================================
// NMU TRAINING — Create Topic
// Access: Admin or Assigned Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId      = (int)($data['course_id'] ?? 0);
$providerId    = isset($data['provider_id']) && (int)$data['provider_id'] > 0 ? (int)$data['provider_id'] : null;
$titleEn       = sanitizeString($data['title_en'] ?? $data['title'] ?? '');
$titleAr       = sanitizeString($data['title_ar'] ?? '') ?: null;
$descriptionEn = sanitizeString($data['description_en'] ?? $data['description'] ?? '');
$descriptionAr = sanitizeString($data['description_ar'] ?? '') ?: null;
$dueDate       = trim($data['due_date'] ?? '');

if (!$courseId || !$titleEn) {
    respondError('Course ID and Track title are required');
}

// Verify trainer assignment / admin permissions
verifyCourseAccess($courseId, $user);

$db = db();

try {
    if ($providerId !== null) {
        // Validate provider belongs to course or is active
        $provCheck = $db->prepare("
            SELECT 1 FROM course_external_providers cep
            JOIN external_training_providers p ON cep.provider_id = p.id
            WHERE cep.course_id = ? AND cep.provider_id = ?
        ");
        $provCheck->execute([$courseId, $providerId]);
        if (!$provCheck->fetch()) {
            // Auto-associate provider with course if admin created track
            $db->prepare("INSERT IGNORE INTO course_external_providers (course_id, provider_id) VALUES (?, ?)")->execute([$courseId, $providerId]);
        }
    }

    // Get max order_index for this course
    $ordStmt = $db->prepare("SELECT COALESCE(MAX(order_index), 0) + 1 FROM training_topics WHERE course_id = ?");
    $ordStmt->execute([$courseId]);
    $nextOrder = (int)$ordStmt->fetchColumn();

    $stmt = $db->prepare("
        INSERT INTO training_topics (course_id, provider_id, title_en, title_ar, description_en, description_ar, due_date, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $courseId,
        $providerId,
        $titleEn,
        $titleAr,
        $descriptionEn ?: null,
        $descriptionAr,
        $dueDate ?: null,
        $nextOrder
    ]);
    $topicId = (int)$db->lastInsertId();

    respond([
        'success' => true,
        'message' => 'Track created successfully',
        'topic_id' => $topicId
    ], 201);
} catch (Throwable $e) {
    error_log('Failed to create topic/track: ' . $e->getMessage());
    respondError('Failed to create track: ' . $e->getMessage(), 500);
}

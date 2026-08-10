<?php
// =========================================================
// NMU TRAINING — Edit Course
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId      = (int)($data['id'] ?? 0);
$name          = sanitizeString($data['name'] ?? $data['name_en'] ?? '');
$nameEn        = sanitizeString($data['name_en'] ?? $name);
$nameAr        = sanitizeString($data['name_ar'] ?? $name);
$description   = sanitizeString($data['description'] ?? $data['description_en'] ?? '');
$descriptionEn = sanitizeString($data['description_en'] ?? $description);
$descriptionAr = sanitizeString($data['description_ar'] ?? $description);
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');
$status        = trim($data['status'] ?? 'active');

if (!$courseId || !$name) {
    respondError('Course ID and Course name are required');
}

$db = db();
$stmt = $db->prepare("
    UPDATE training_courses 
    SET name_en = ?, name_ar = ?, description_en = ?, description_ar = ?, 
        start_date = ?, end_date = ?, status = ?
    WHERE id = ?
");
$stmt->execute([
    $nameEn,
    $nameAr ?: null,
    $descriptionEn ?: null,
    $descriptionAr ?: null,
    $startDate ?: null,
    $endDate ?: null,
    $status,
    $courseId
]);

respond([
    'success' => true,
    'message' => 'Course updated successfully',
    'course_id' => $courseId
]);

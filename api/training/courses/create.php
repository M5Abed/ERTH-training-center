<?php
// =========================================================
// NMU TRAINING — Create Course
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$admin = requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$name          = sanitizeString($data['name'] ?? $data['name_en'] ?? '');
$nameEn        = sanitizeString($data['name_en'] ?? $name);
$nameAr        = sanitizeString($data['name_ar'] ?? $name);
$description   = sanitizeString($data['description'] ?? $data['description_en'] ?? '');
$descriptionEn = sanitizeString($data['description_en'] ?? $description);
$descriptionAr = sanitizeString($data['description_ar'] ?? $description);
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');

if (!$name) {
    respondError('Course name is required');
}

$db = db();
$stmt = $db->prepare("
    INSERT INTO training_courses (name_en, name_ar, description_en, description_ar, start_date, end_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
");
$stmt->execute([
    $nameEn,
    $nameAr ?: null,
    $descriptionEn ?: null,
    $descriptionAr ?: null,
    $startDate ?: null,
    $endDate ?: null,
    $admin['id']
]);
$courseId = (int)$db->lastInsertId();

respond([
    'success' => true,
    'message' => 'Course created successfully',
    'course_id' => $courseId
], 201);

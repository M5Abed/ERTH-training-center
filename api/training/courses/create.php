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
$durationHours = (int)($data['duration_hours'] ?? $data['duration'] ?? 40);
if ($durationHours <= 0) $durationHours = 40;

if (!$name) {
    respondError('Course name is required');
}

$db = db();

try {
    $cols = $db->query("SHOW COLUMNS FROM training_courses LIKE 'duration_hours'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE training_courses ADD COLUMN duration_hours INT NOT NULL DEFAULT 40 AFTER end_date");
    }
} catch (Throwable $e) {}

$stmt = $db->prepare("
    INSERT INTO training_courses (name_en, name_ar, description_en, description_ar, start_date, end_date, duration_hours, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
");
$stmt->execute([
    $nameEn,
    $nameAr ?: null,
    $descriptionEn ?: null,
    $descriptionAr ?: null,
    $startDate ?: null,
    $endDate ?: null,
    $durationHours,
    $admin['id']
]);
$courseId = (int)$db->lastInsertId();

respond([
    'success' => true,
    'message' => 'Course created successfully',
    'course_id' => $courseId
], 201);

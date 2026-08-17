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
$name          = sanitizeString($data['name'] ?? $data['name_en'] ?? $data['title'] ?? '');
$description   = sanitizeString($data['description'] ?? $data['description_en'] ?? '');
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');
$durationHours = (int)($data['duration_hours'] ?? $data['duration'] ?? 40);
if ($durationHours <= 0) $durationHours = 40;
$category      = sanitizeString($data['category'] ?? '') ?: 'Software / AI';
$level         = sanitizeString($data['level'] ?? '') ?: 'All Levels';

if (!$name) {
    respondError('Course name is required');
}

$db = db();

try {
    $cols = $db->query("SHOW COLUMNS FROM training_courses LIKE 'duration_hours'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE training_courses ADD COLUMN duration_hours INT NOT NULL DEFAULT 40 AFTER end_date");
    }
    $catCols = $db->query("SHOW COLUMNS FROM training_courses LIKE 'category'")->fetchAll();
    if (empty($catCols)) {
        $db->exec("ALTER TABLE training_courses ADD COLUMN category VARCHAR(150) NULL AFTER name_en, ADD COLUMN level VARCHAR(100) NULL AFTER category");
    }
    $nameCols = $db->query("SHOW COLUMNS FROM training_courses LIKE 'name'")->fetchAll();
    if (empty($nameCols)) {
        $db->exec("ALTER TABLE training_courses ADD COLUMN name VARCHAR(255) NULL AFTER name_en");
    }
    $descCols = $db->query("SHOW COLUMNS FROM training_courses LIKE 'description'")->fetchAll();
    if (empty($descCols)) {
        $db->exec("ALTER TABLE training_courses ADD COLUMN description TEXT NULL AFTER description_en");
    }
} catch (Throwable $e) {}

$stmt = $db->prepare("
    INSERT INTO training_courses (name, name_en, category, level, description, description_en, start_date, end_date, duration_hours, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
");
$stmt->execute([
    $name,
    $name,
    $category,
    $level,
    $description ?: null,
    $description ?: null,
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


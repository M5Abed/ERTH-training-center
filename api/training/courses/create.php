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
    $stmt = $db->prepare("
        INSERT INTO training_courses (name, category, level, description, start_date, end_date, duration_hours, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    ");
    $stmt->execute([
        $name,
        $category,
        $level,
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
} catch (Throwable $e) {
    error_log('Failed to create course: ' . $e->getMessage());
    respondError('Failed to create course: ' . $e->getMessage(), 500);
}


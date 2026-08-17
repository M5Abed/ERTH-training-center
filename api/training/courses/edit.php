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
$courseId      = (int)($data['id'] ?? $data['course_id'] ?? 0);
$name          = sanitizeString($data['name'] ?? $data['name_en'] ?? '');
$description   = sanitizeString($data['description'] ?? $data['description_en'] ?? '');
$category      = sanitizeString($data['category'] ?? '');
$level         = sanitizeString($data['level'] ?? '');
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');
$durationHours = isset($data['duration_hours']) ? (int)$data['duration_hours'] : (isset($data['duration']) ? (int)$data['duration'] : null);
$status        = trim($data['status'] ?? 'active');

if (!$courseId || !$name) {
    respondError('Course ID and Course name are required');
}

$db = db();

try {
    if ($durationHours !== null && $durationHours > 0) {
        $stmt = $db->prepare("
            UPDATE training_courses 
            SET name = ?, category = ?, level = ?, description = ?, 
                start_date = ?, end_date = ?, duration_hours = ?, status = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $name,
            $category ?: null,
            $level ?: null,
            $description ?: null,
            $startDate ?: null,
            $endDate ?: null,
            $durationHours,
            $status,
            $courseId
        ]);
    } else {
        $stmt = $db->prepare("
            UPDATE training_courses 
            SET name = ?, category = ?, level = ?, description = ?, 
                start_date = ?, end_date = ?, status = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $name,
            $category ?: null,
            $level ?: null,
            $description ?: null,
            $startDate ?: null,
            $endDate ?: null,
            $status,
            $courseId
        ]);
    }

    respond([
        'success' => true,
        'message' => 'Course updated successfully',
        'course_id' => $courseId
    ]);
} catch (Throwable $e) {
    error_log('Failed to edit course: ' . $e->getMessage());
    respondError('Failed to edit course: ' . $e->getMessage(), 500);
}

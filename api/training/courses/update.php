<?php
// =========================================================
// NMU TRAINING — Update Course
// Access: Admin and Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['admin', 'trainer']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId      = (int)($data['course_id'] ?? $data['id'] ?? 0);
$name        = sanitizeString($data['name_en'] ?? $data['name'] ?? '');
$description = sanitizeString($data['description_en'] ?? $data['description'] ?? '');
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');
$durationHours = (int)($data['duration_hours'] ?? 40);
if ($durationHours <= 0) $durationHours = 40;
$category      = sanitizeString($data['category'] ?? '');
$level         = sanitizeString($data['level'] ?? '');
$courseType    = sanitizeString($data['course_type'] ?? '');

if (!$courseId || empty($name)) {
    respondError('Course ID and name are required');
}
if (!$category) {
    respondError('Track / Category is required');
}
if (!$level) {
    respondError('Skill Level is required');
}

$db = db();

// Ensure the course exists
$stmt = $db->prepare("SELECT id FROM training_courses WHERE id = ?");
$stmt->execute([$courseId]);
if (!$stmt->fetch()) {
    respondError('Course not found', 404);
}

// Verify trainer assignment / admin permissions
verifyCourseAccess($courseId, $user);

// Update the course
try {
    $updateStmt = $db->prepare("
        UPDATE training_courses 
        SET name = ?, 
            category = ?, 
            level = ?, 
            description = ?, 
            start_date = ?, 
            end_date = ?, 
            duration_hours = ?,
            course_type = CASE WHEN ? != '' THEN ? ELSE course_type END
        WHERE id = ?
    ");
    $updateStmt->execute([
        $name,
        $category,
        $level,
        $description ?: null,
        $startDate ?: null,
        $endDate ?: null,
        $durationHours,
        $courseType,
        $courseType,
        $courseId
    ]);

    respond([
        'success' => true,
        'message' => 'Course updated successfully'
    ], 200);
} catch (Throwable $e) {
    error_log('Failed to update course: ' . $e->getMessage());
    respondError('Failed to update course: ' . $e->getMessage(), 500);
}

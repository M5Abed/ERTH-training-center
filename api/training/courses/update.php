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
$nameEn        = sanitizeString($data['name_en'] ?? $data['name'] ?? '');
$nameAr        = sanitizeString($data['name_ar'] ?? '');
$descriptionEn = sanitizeString($data['description_en'] ?? $data['description'] ?? '');
$descriptionAr = sanitizeString($data['description_ar'] ?? '');
$startDate     = trim($data['start_date'] ?? '');
$endDate       = trim($data['end_date'] ?? '');
$durationHours = (int)($data['duration_hours'] ?? 40);
if ($durationHours <= 0) $durationHours = 40;
$category      = sanitizeString($data['category'] ?? '');
$level         = sanitizeString($data['level'] ?? '');
$courseType    = sanitizeString($data['course_type'] ?? '');

if (!$courseId) {
    respondError('Course ID is required');
}
if (!$nameEn) {
    respondError('Course name is required');
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
        SET name_en = ?, 
            name_ar = CASE WHEN ? != '' THEN ? ELSE name_ar END, 
            category = ?, 
            level = ?, 
            description_en = ?, 
            description_ar = CASE WHEN ? != '' THEN ? ELSE description_ar END, 
            start_date = ?, 
            end_date = ?, 
            duration_hours = ?,
            course_type = CASE WHEN ? != '' THEN ? ELSE course_type END
        WHERE id = ?
    ");
    $updateStmt->execute([
        $nameEn,
        $nameAr,
        $nameAr,
        $category,
        $level,
        $descriptionEn ?: null,
        $descriptionAr,
        $descriptionAr,
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

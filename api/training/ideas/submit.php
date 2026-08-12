<?php
// =========================================================
// NMU TRAINING — Submit or Update Trainee Idea
// Access: Trainee
// Enforces: Enrolled trainees only & single idea per course
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'admin']);
$uid = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId      = (int)($data['course_id'] ?? 0);
$titleEn       = sanitizeString($data['title'] ?? '');
$titleAr       = sanitizeString($data['title'] ?? '');
$descriptionEn = sanitizeString($data['description'] ?? '');
$descriptionAr = sanitizeString($data['description'] ?? '');
$techStack     = sanitizeString($data['tech_stack'] ?? '');
$problemStmt   = sanitizeString($data['problem_statement'] ?? '');
$expectedOutput= sanitizeString($data['expected_output'] ?? '');

if (!$courseId || !$titleEn || !$descriptionEn) {
    respondError('Course ID, English title, and description are required');
}

$db = db();

// Verify course exists
$cStmt = $db->prepare("SELECT id FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
if (!$cStmt->fetch()) {
    respondError('Invalid or non-existent course selected');
}

// Require trainee to be enrolled in the course (unless admin)
$role = strtolower($user['role'] ?? '');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if (!$isAdmin) {
    $enr = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enr->execute([$uid, $courseId]);
    if (!$enr->fetch()) {
        respondError('You are not enrolled in this course. You can only submit project ideas for courses you are enrolled in.');
    }
}

// Upsert single idea per course for this trainee (setting both trainee_id and owner_id)
$stmt = $db->prepare("
    INSERT INTO training_ideas 
        (owner_id, course_id, title, title, description, description, tech_stack, problem_statement, expected_output, status)
    VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    ON DUPLICATE KEY UPDATE
        owner_id = VALUES(owner_id),
        title = VALUES(title),
        title = VALUES(title),
        description = VALUES(description),
        description = VALUES(description),
        tech_stack = VALUES(tech_stack),
        problem_statement = VALUES(problem_statement),
        expected_output = VALUES(expected_output),
        updated_at = NOW()
");
$stmt->execute([
    $uid,
    $courseId,
    $titleEn,
    $titleAr ?: null,
    $descriptionEn,
    $descriptionAr ?: null,
    $techStack ?: null,
    $problemStmt ?: null,
    $expectedOutput ?: null
]);

$ideaId = (int)($db->lastInsertId() ?: 0);
if (!$ideaId) {
    // If updated existing row, fetch the idea id
    $fStmt = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ? AND course_id = ?");
    $fStmt->execute([$uid, $courseId]);
    $ideaId = (int)$fStmt->fetchColumn();
}

respond([
    'success' => true,
    'message' => 'Idea submitted successfully',
    'idea_id' => $ideaId
]);

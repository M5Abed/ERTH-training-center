<?php
// =========================================================
// NMU TRAINING — Single Trainee Enrollment
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = (int)($data['course_id'] ?? 0);
$email    = trim(strtolower($data['email'] ?? ''));

if (!$courseId || !$email) {
    respondError('Course ID and Trainee Email are required');
}

$db = db();

// Find user by email
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    respondError("No user found with email '$email'. Please ensure they are registered.", 404);
}

$traineeId = (int)$user['id'];

// Insert enrollment
$eStmt = $db->prepare("
    INSERT INTO trainee_enrollments (trainee_id, course_id, source)
    VALUES (?, ?, 'manual')
    ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)
");
$eStmt->execute([$traineeId, $courseId]);

respond([
    'success' => true,
    'message' => 'Trainee enrolled successfully',
    'trainee_id' => $traineeId
]);

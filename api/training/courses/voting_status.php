<?php
// =========================================================
// NMU TRAINING — Update Course Voting Status
// POST /api/training/courses/voting_status.php
// Body: { course_id: int, voting_status: 'not_started' | 'open' | 'closed' }
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer(); // trainer or admin

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data         = body();
$courseId     = (int)($data['course_id'] ?? 0);
$votingStatus = trim($data['voting_status'] ?? '');

$allowedStatuses = ['not_started', 'open', 'closed'];

if (!$courseId) {
    respondError('course_id is required', 400);
}

if (!in_array($votingStatus, $allowedStatuses, true)) {
    respondError("Invalid voting_status. Allowed values: 'not_started', 'open', 'closed'", 422);
}

$db = db();

// Check if course exists
$stmt = $db->prepare("SELECT id, name FROM training_courses WHERE id = ?");
$stmt->execute([$courseId]);
$course = $stmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}

// Enforce course-level authorization for trainers
verifyCourseAccess($courseId, $user);

// Update status
$upd = $db->prepare("UPDATE training_courses SET voting_status = ?, updated_at = NOW() WHERE id = ?");
$upd->execute([$votingStatus, $courseId]);

respond([
    'success'       => true,
    'message'       => 'Course voting status updated successfully',
    'course_id'     => $courseId,
    'voting_status' => $votingStatus
]);

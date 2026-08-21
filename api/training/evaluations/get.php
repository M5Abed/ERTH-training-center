<?php
// =========================================================
// NMU TRAINING — Get Trainee Evaluation Detail
// Access: Trainee (own), Trainer, Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin', 'professor', 'ta', 'supervisor', 'evaluator', 'student', 'staff']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
if ($role === 'student') {
    $role = 'trainee';
}
$isStaff = (bool)($user['is_admin'] || in_array($role, ['admin', 'trainer', 'professor', 'ta', 'supervisor', 'evaluator', 'staff'], true));

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();
$courseId  = resolveCourseId($_GET['course_id'] ?? 0);
$traineeId = isset($_GET['trainee_id']) ? resolveUserId($_GET['trainee_id']) : $uid;

if (!$isStaff && $traineeId !== $uid) {
    respondError('Forbidden: You can only view your own evaluation', 403);
}

// If course_id wasn't passed, attempt to find the trainee's active course
if (!$courseId) {
    $cStmt = $db->prepare("
        SELECT course_id FROM training_evaluations WHERE trainee_id = ? 
        UNION 
        SELECT course_id FROM trainee_enrollments WHERE trainee_id = ? 
        UNION
        SELECT course_id FROM training_ideas WHERE owner_id = ?
        LIMIT 1
    ");
    $cStmt->execute([$traineeId, $traineeId, $traineeId]);
    $courseId = (int)$cStmt->fetchColumn();
}

if (!$courseId) {
    $courseId = (int)$db->query("SELECT id FROM training_courses WHERE status != 'archived' ORDER BY id ASC LIMIT 1")->fetchColumn();
}

if (!$courseId) {
    respond(['evaluation' => null]);
    exit;
}

$stmt = $db->prepare("
    SELECT te.*, 
           u.full_name AS trainee_name, u.email AS trainee_email, COALESCE(u.student_id, u.academic_id) AS student_id,
           ev.full_name AS evaluator_name,
           tc.cert_code, tc.status AS cert_status, tc.issued_at AS cert_issued_at
    FROM training_evaluations te
    LEFT JOIN users u ON te.trainee_id = u.id
    LEFT JOIN users ev ON te.evaluator_id = ev.id
    LEFT JOIN training_certificates tc ON (tc.course_id = te.course_id AND tc.trainee_id = te.trainee_id)
    WHERE te.course_id = ? AND te.trainee_id = ?
");
$stmt->execute([$courseId, $traineeId]);
$evaluation = $stmt->fetch();

// 1. Fallback: Search any evaluation for this trainee regardless of course_id
if (!$evaluation) {
    $stmtAny = $db->prepare("
        SELECT te.*, 
               u.full_name AS trainee_name, u.email AS trainee_email, COALESCE(u.student_id, u.academic_id) AS student_id,
               ev.full_name AS evaluator_name,
               tc.cert_code, tc.status AS cert_status, tc.issued_at AS cert_issued_at
        FROM training_evaluations te
        LEFT JOIN users u ON te.trainee_id = u.id
        LEFT JOIN users ev ON te.evaluator_id = ev.id
        LEFT JOIN training_certificates tc ON (tc.course_id = te.course_id AND tc.trainee_id = te.trainee_id)
        WHERE te.trainee_id = ?
        ORDER BY te.id DESC LIMIT 1
    ");
    $stmtAny->execute([$traineeId]);
    $evaluation = $stmtAny->fetch();
}

// 2. Fallback: Check if grade was saved on trainee_enrollments
if (!$evaluation) {
    try {
        $enrStmt = $db->prepare("
            SELECT te.final_grade AS final_score, te.course_id, te.trainee_id,
                   u.full_name AS trainee_name, u.email AS trainee_email, COALESCE(u.student_id, u.academic_id) AS student_id
            FROM trainee_enrollments te
            JOIN users u ON te.trainee_id = u.id
            WHERE te.trainee_id = ? AND te.final_grade IS NOT NULL
            ORDER BY te.id DESC LIMIT 1
        ");
        $enrStmt->execute([$traineeId]);
        $enrRow = $enrStmt->fetch();
        if ($enrRow) {
            $evaluation = [
                'id' => 0,
                'course_id' => $enrRow['course_id'],
                'trainee_id' => $enrRow['trainee_id'],
                'final_score' => $enrRow['final_score'],
                'status' => ((float)$enrRow['final_score'] >= 60) ? 'pass' : 'fail',
                'feedback' => 'Final grade recorded in course enrollment',
                'trainee_name' => $enrRow['trainee_name'],
                'trainee_email' => $enrRow['trainee_email'],
                'student_id' => $enrRow['student_id']
            ];
        }
    } catch (Throwable $e) {}
}

if ($evaluation) {
    if (!empty($evaluation['trainee_id']) && is_numeric($evaluation['trainee_id'])) {
        $evaluation['trainee_id'] = getUserUuid((int)$evaluation['trainee_id']);
    }
    if (!empty($evaluation['course_id']) && is_numeric($evaluation['course_id'])) {
        $evaluation['course_id'] = getCourseUuid((int)$evaluation['course_id']);
    }
}

respond(['evaluation' => $evaluation ?: null]);

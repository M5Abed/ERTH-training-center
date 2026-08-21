<?php
// =========================================================
// NMU TRAINING — Get Course Detail
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'student', 'staff', 'doctor', 'faculty']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$rawId = $_GET['id'] ?? '0';
if (!$rawId) {
    respondError('Course ID is required');
}

$db = db();

if ($rawId === 'default') {
    if ($role === 'trainee') {
        $enr = $db->prepare("SELECT course_id FROM trainee_enrollments WHERE trainee_id = ? LIMIT 1");
        $enr->execute([$uid]);
        $enrollment = $enr->fetch();
        if ($enrollment) {
            $rawId = $enrollment['course_id'];
        } else {
            $rawId = 'robotics';
        }
    } else {
        $rawId = 'robotics';
    }
}

$courseId = resolveCourseId($rawId);
$course = null;

if ($courseId > 0) {
    $stmt = $db->prepare("
        SELECT tc.*, tc.name AS name, tc.description AS description, u.full_name AS creator_name,
               (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
        FROM training_courses tc
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.id = ?
    ");
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
}

if (!$course && is_string($rawId) && !is_numeric($rawId)) {
    $stmt = $db->prepare("
        SELECT tc.*, tc.name AS name, tc.description AS description, u.full_name AS creator_name,
               (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
        FROM training_courses tc
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.uuid = ? OR tc.name LIKE ?
        LIMIT 1
    ");
    $stmt->execute([$rawId, '%' . $rawId . '%']);
    $course = $stmt->fetch();
    if ($course) {
        $courseId = (int)$course['id'];
    }
}

// Default fallback for Robotics course if not in database yet
if (!$course && strtolower($rawId) === 'robotics') {
    $course = [
        'id' => 'robotics',
        'name' => 'Robotics & Autonomous Systems Engineering',
        'description' => 'Comprehensive hands-on course covering microcontrollers, ROS2 nodes, motor PWM control, IMU sensor fusion, computer vision, and capstone autonomous navigation.',
        'track' => 'robotics',
        'duration_hours' => 60,
        'status' => 'active',
        'created_at' => date('Y-m-d H:i:s')
    ];
}

if (!$course) {
    respondError('Course not found', 404);
}

// Check trainee enrollment status
$isEnrolled = true;
if ($role === 'trainee' && !$isAdmin) {
    $enr = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enr->execute([$uid, $courseId]);
    $isEnrolled = (bool)$enr->fetch();
}

// Fetch topics ordered by order_index
$topStmt = $db->prepare("
    SELECT tt.*,
           (SELECT COUNT(*) FROM topic_content WHERE topic_id = tt.id) AS total_materials,
           (SELECT COUNT(*) FROM trainee_topic_progress WHERE topic_id = tt.id AND trainee_id = ?) AS is_completed
    FROM training_topics tt
    WHERE tt.course_id = ?
    ORDER BY tt.order_index ASC, tt.id ASC
");
$topStmt->execute([$uid, $courseId]);
$topics = $topStmt->fetchAll();

// Fetch assigned trainers
$trStmt = $db->prepare("
    SELECT ta.id AS assignment_id, ta.topic_id, u.id AS trainer_id, u.full_name, u.email, u.department
    FROM trainer_assignments ta
    JOIN users u ON ta.trainer_id = u.id
    WHERE ta.course_id = ?
");
$trStmt->execute([$courseId]);
$trainers = $trStmt->fetchAll();

if (empty($trainers)) {
    if (!empty($course['created_by'])) {
        $creatorStmt = $db->prepare("
            SELECT NULL AS assignment_id, NULL AS topic_id, u.id AS trainer_id, u.full_name, u.email, u.department
            FROM users u
            WHERE u.id = ?
        ");
        $creatorStmt->execute([$course['created_by']]);
        $trainers = $creatorStmt->fetchAll();
    }

    if (empty($trainers)) {
        try {
            $allTrStmt = $db->query("
                SELECT NULL AS assignment_id, NULL AS topic_id, u.id AS trainer_id, u.full_name, u.email, u.department
                FROM users u
                WHERE (
                    TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'faculty', 'doctor', 'staff')
                    OR u.is_admin = 1
                )
                AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
                ORDER BY u.full_name ASC
                LIMIT 5
            ");
            $trainers = $allTrStmt ? $allTrStmt->fetchAll() : [];
        } catch (Throwable $e) {}
    }
}

// Fetch summary metrics
$traineeCount = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ?");
$traineeCount->execute([$courseId]);
$totalTrainees = (int)$traineeCount->fetchColumn();

$internalCount = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ? AND training_type = 'internal'");
$internalCount->execute([$courseId]);
$totalInternal = (int)$internalCount->fetchColumn();

$externalCount = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ? AND training_type = 'external'");
$externalCount->execute([$courseId]);
$totalExternal = (int)$externalCount->fetchColumn();

// Fetch course external providers
$pStmt = $db->prepare("
    SELECT p.*,
           (SELECT COUNT(*) FROM training_topics tt WHERE tt.course_id = ? AND tt.provider_id = p.id) AS track_count,
           (SELECT COUNT(*) FROM trainee_enrollments te WHERE te.course_id = ? AND te.provider_id = p.id) AS student_count
    FROM external_training_providers p
    JOIN course_external_providers cep ON cep.provider_id = p.id
    WHERE cep.course_id = ? AND (p.status = 'active' OR ? = 1)
    ORDER BY p.is_contracted DESC, p.name ASC
");
$pStmt->execute([$courseId, $courseId, $courseId, $isAdmin ? 1 : 0]);
$externalProviders = $pStmt->fetchAll();

// Fetch my enrollment if trainee
$myEnrollment = null;
if ($role === 'trainee') {
    $meStmt = $db->prepare("
        SELECT te.*,
               p.name AS provider_name, p.is_contracted AS provider_is_contracted,
               p.website_url AS provider_website_url, p.linkedin_url AS provider_linkedin_url,
               tt.title AS track_name
        FROM trainee_enrollments te
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        WHERE te.trainee_id = ? AND te.course_id = ?
    ");
    $meStmt->execute([$uid, $courseId]);
    $myEnrollment = $meStmt->fetch() ?: null;
}

// Mask real database IDs with UUIDs
if ($course) {
    $course['uuid'] = !empty($course['uuid']) ? $course['uuid'] : getCourseUuid((int)$course['id']);
    $course['id'] = $course['uuid'];
}

foreach ($trainers as &$tr) {
    if (!empty($tr['trainer_id']) && is_numeric($tr['trainer_id'])) {
        $tr['trainer_uuid'] = getUserUuid((int)$tr['trainer_id']);
        $tr['trainer_id'] = $tr['trainer_uuid'];
        $tr['id'] = $tr['trainer_uuid'];
    }
}
unset($tr);

foreach ($topics as &$tp) {
    if (!empty($tp['course_id']) && is_numeric($tp['course_id']) && $course) {
        $tp['course_id'] = $course['uuid'];
    }
}
unset($tp);

if ($myEnrollment && !empty($myEnrollment['course_id']) && is_numeric($myEnrollment['course_id']) && $course) {
    $myEnrollment['course_id'] = $course['uuid'];
}

respond([
    'course' => $course,
    'topics' => $topics,
    'trainers' => $trainers,
    'external_providers' => $externalProviders,
    'total_trainees' => $totalTrainees,
    'total_internal' => $totalInternal,
    'total_external' => $totalExternal,
    'is_enrolled' => $isEnrolled,
    'my_enrollment' => $myEnrollment
]);


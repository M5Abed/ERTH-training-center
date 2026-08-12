<?php
// =========================================================
// NMU TRAINING — Get Course Detail
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
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
$course = null;
$courseId = 0;

if (is_numeric($rawId)) {
    $courseId = (int)$rawId;
    $stmt = $db->prepare("
        SELECT tc.*, tc.name AS name, tc.description AS description, u.full_name AS creator_name
        FROM training_courses tc
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.id = ?
    ");
    $stmt->execute([$courseId]);
    $course = $stmt->fetch();
} else {
    // String slug lookup e.g. 'robotics'
    $stmt = $db->prepare("
        SELECT tc.*, tc.name AS name, tc.description AS description, u.full_name AS creator_name
        FROM training_courses tc
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.name LIKE ? OR tc.name LIKE ?
        LIMIT 1
    ");
    $stmt->execute(['%' . $rawId . '%', '%' . $rawId . '%']);
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
        'name' => 'هندسة الروبوتات والأنظمة الذاتية',
        'description' => 'Comprehensive hands-on course covering microcontrollers, ROS2 nodes, motor PWM control, IMU sensor fusion, computer vision, and capstone autonomous navigation.',
        'description' => 'كورس تطبيقي شامل يغطي المتحكمات المدمجة، العقد المدمجة بروس 2، تحكم المحركات، دمج الحساسات، الرؤية الحاسوبية، والتحكم الذاتي.',
        'track' => 'robotics',
        'duration_hours' => 60,
        'status' => 'active',
        'created_at' => date('Y-m-d H:i:s')
    ];
}

if (!$course) {
    respondError('Course not found', 404);
}

// Access check for trainees: must be enrolled
if ($role === 'trainee' && !$isAdmin) {
    $enr = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enr->execute([$uid, $courseId]);
    if (!$enr->fetch()) {
        respondError('Forbidden: Not enrolled in this course', 403);
    }
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

// Fetch summary metrics
$traineeCount = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ?");
$traineeCount->execute([$courseId]);

respond([
    'course' => $course,
    'topics' => $topics,
    'trainers' => $trainers,
    'total_trainees' => (int)$traineeCount->fetchColumn()
]);

<?php
// =========================================================
// NMU TRAINING — Export Course Student Grades Report
// GET /api/training/evaluations/export.php?course_id=X&format=csv|json
// Columns: [NO., Academic ID, Name, Academic Email, CourseCode, Program, Final Track, Training Platform Email, final grade]
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
$format   = strtolower(trim($_GET['format'] ?? 'csv'));

if (!$courseId) {
    respondError('course_id is required', 400);
}

$db = db();

// Check if course exists
$cStmt = $db->prepare("SELECT id, name, category FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}

// Enforce course-level authorization
verifyCourseAccess($courseId, $user);

// Fetch students with their academic information, track, emails, and evaluation grades
$stmt = $db->prepare("
    SELECT 
        te.id AS enrollment_id,
        u.id AS user_id,
        COALESCE(NULLIF(TRIM(u.academic_id), ''), NULLIF(TRIM(u.student_id), ''), '-') AS academic_id,
        COALESCE(NULLIF(TRIM(u.full_name), ''), 'Trainee') AS name,
        u.email AS academic_email,
        COALESCE(NULLIF(TRIM(te.course_code), ''), NULLIF(TRIM(c.course_code), ''), NULLIF(TRIM(c.category), ''), NULLIF(TRIM(c.name), ''), CONCAT('COURSE-', c.id)) AS course_code,
        COALESCE(NULLIF(TRIM(te.program), ''), NULLIF(TRIM(u.major), ''), NULLIF(TRIM(u.department), ''), 'General') AS program,
        COALESCE(
            NULLIF(TRIM(te.final_track), ''),
            NULLIF(TRIM(tt.title), ''),
            NULLIF(TRIM(te.custom_provider_name), ''),
            NULLIF(TRIM(p.name), ''),
            NULLIF(TRIM(u.final_track), ''),
            NULLIF(TRIM(c.category), ''),
            c.name
        ) AS final_track,
        u.email AS platform_email,
        COALESCE((SELECT final_score FROM training_evaluations WHERE trainee_id = u.id AND course_id = c.id), te.final_grade) AS final_score,
        (SELECT status FROM training_evaluations WHERE trainee_id = u.id AND course_id = c.id) AS eval_status
    FROM trainee_enrollments te
    JOIN users u ON u.id = te.trainee_id
    JOIN training_courses c ON c.id = te.course_id
    LEFT JOIN external_training_providers p ON te.provider_id = p.id
    LEFT JOIN training_topics tt ON te.track_id = tt.id
    WHERE te.course_id = ?
    ORDER BY u.full_name ASC, u.id ASC
");
$stmt->execute([$courseId]);
$trainees = $stmt->fetchAll();

$reportRows = [];
$no = 1;

foreach ($trainees as $t) {
    $finalGradeStr = ($t['final_score'] !== null) ? number_format((float)$t['final_score'], 2, '.', '') : 'Not Graded';
    
    $reportRows[] = [
        'no'                      => $no++,
        'academic_id'             => $t['academic_id'],
        'name'                    => $t['name'],
        'academic_email'          => $t['academic_email'],
        'course_code'             => $t['course_code'],
        'program'                 => $t['program'],
        'final_track'             => $t['final_track'],
        'training_platform_email' => $t['platform_email'],
        'final_grade'             => $finalGradeStr,
        'eval_status'             => $t['eval_status'] ?? 'pending'
    ];
}

if ($format === 'json') {
    respond([
        'success'     => true,
        'course_id'   => $courseId,
        'course_name' => $course['name'],
        'total'       => count($reportRows),
        'columns'     => ['NO.', 'Academic ID', 'Name', 'Academic Email', 'CourseCode', 'Program', 'Final Track', 'Training Platform Email', 'final grade'],
        'data'        => $reportRows
    ]);
}

// Clean output buffer before streaming CSV
if (ob_get_level()) {
    ob_end_clean();
}

$safeCourseName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $course['name'] ?: 'Course');
$filename = "Grades_Report_{$safeCourseName}_" . date('Y-m-d') . ".csv";

header('Content-Type: text/csv; charset=UTF-8');
header("Content-Disposition: attachment; filename=\"{$filename}\"");
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

// Write UTF-8 BOM for full Arabic / English Excel compatibility
fwrite($output, "\xEF\xBB\xBF");

// Exact columns specified by user
fputcsv($output, [
    'NO.',
    'Academic ID',
    'Name',
    'Academic Email',
    'CourseCode',
    'Program',
    'Final Track',
    'Training Platform Email',
    'final grade'
]);

foreach ($reportRows as $row) {
    fputcsv($output, [
        $row['no'],
        $row['academic_id'],
        $row['name'],
        $row['academic_email'],
        $row['course_code'],
        $row['program'],
        $row['final_track'],
        $row['training_platform_email'],
        $row['final_grade']
    ]);
}

fclose($output);
exit;

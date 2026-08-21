<?php
// Debug: Run the EXACT trainers/list.php logic — REMOVE AFTER DEBUGGING
require_once __DIR__ . '/config.php';

// Force JSON output even on errors
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");

$report = ['step' => 'start'];

try {
    $report['step'] = 'requireSession';
    $uid = requireSession();
    $report['uid'] = $uid;
    
    $report['step'] = 'requireRole';
    $user = requireRole(['admin','trainer','professor','ta','lecturer','supervisor','instructor','evaluator','trainee','student','staff','faculty']);
    $report['user'] = ['id'=>$user['id'],'role'=>$user['role'],'is_admin'=>$user['is_admin']];
    
    $report['step'] = 'db query';
    $db = db();
    
    // Exact query from trainers/list.php
    $stmt = $db->query("
        SELECT DISTINCT
               u.id, u.id AS trainer_id, u.full_name, u.username, u.email, u.department, u.role, u.is_admin,
               (SELECT COUNT(*) FROM trainer_assignments WHERE trainer_id = u.id) AS assigned_courses_count,
               (
                   SELECT GROUP_CONCAT(CONCAT(tc.id, ':::', tc.name, ':::', ta.id) SEPARATOR '|||')
                   FROM trainer_assignments ta
                   JOIN training_courses tc ON ta.course_id = tc.id
                   WHERE ta.trainer_id = u.id
               ) AS assigned_courses_raw
        FROM users u
        WHERE (
            TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'doctor', 'faculty', 'staff')
            OR u.is_admin = 1
            OR u.id IN (SELECT trainer_id FROM trainer_assignments)
            OR (
                TRIM(LOWER(COALESCE(u.role, ''))) NOT IN ('trainee', 'student')
                AND u.role IS NOT NULL
                AND u.role != ''
            )
        )
        AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
        ORDER BY u.full_name ASC, u.id ASC
    ");
    
    $report['step'] = 'fetchAll';
    $trainers = $stmt ? $stmt->fetchAll() : [];
    $report['raw_count'] = count($trainers);
    $report['raw_first'] = $trainers[0] ?? null;
    
    $report['step'] = 'getUserUuid loop';
    foreach ($trainers as &$tr) {
        $uuidVal = getUserUuid((int)$tr['id']);
        $tr['uuid'] = $uuidVal;
        $tr['id']   = $uuidVal;
        $tr['trainer_id'] = $uuidVal;
        $tr['assigned_courses'] = [];
        if (!empty($tr['assigned_courses_raw'])) {
            $items = explode('|||', $tr['assigned_courses_raw']);
            foreach ($items as $item) {
                $parts = explode(':::', $item);
                if (count($parts) >= 3) {
                    $cInternalId = (int)$parts[0];
                    $tr['assigned_courses'][] = [
                        'course_id'    => getCourseUuid($cInternalId),
                        'course_title' => $parts[1],
                        'assignment_id'=> (int)$parts[2]
                    ];
                }
            }
        }
        unset($tr['assigned_courses_raw']);
    }
    unset($tr);
    
    $report['step'] = 'json_encode';
    $report['final_count'] = count($trainers);
    $report['trainers_sample'] = array_slice($trainers, 0, 3);
    
    // Try json_encode to catch any encoding issues
    $encoded = json_encode(['trainers' => $trainers]);
    $report['json_encode_ok'] = ($encoded !== false);
    $report['json_error'] = json_last_error_msg();
    $report['json_length'] = strlen($encoded ?: '');
    
} catch (Throwable $e) {
    $report['error'] = $e->getMessage();
    $report['trace'] = $e->getTraceAsString();
}

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
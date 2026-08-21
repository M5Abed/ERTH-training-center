<?php
// =========================================================
// NMU TRAINING â€” Public Certificate Verification API
// Access: Public (No Auth Required)
// =========================================================

require_once __DIR__ . '/../../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$code      = trim($_GET['code'] ?? '');
$courseId  = (int)($_GET['course_id'] ?? 0);
$traineeId = (int)($_GET['trainee_id'] ?? 0);

$placeholders = ['VERIFY-BEFORE-ISSUE', 'NMU-CERT-2026-PENDING', 'NMU-VERIFY-PREVIEW'];
if (in_array(strtoupper($code), $placeholders)) {
    $code = '';
}

$db = db();
$cert = false;

try {
    if ($code) {
        $stmt = $db->prepare("
            SELECT tc.*,
                   u.full_name AS trainee_name, u.student_id, u.email AS trainee_email,
                   c.id AS course_id, c.name AS course_title,
                   c.start_date, c.end_date,
                   c.description,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
            FROM training_certificates tc
            JOIN users u ON tc.trainee_id = u.id
            JOIN training_courses c ON tc.course_id = c.id
            LEFT JOIN users issuer ON tc.issued_by = issuer.id
            WHERE tc.cert_code = ?
        ");
        $stmt->execute([$code]);
        $cert = $stmt->fetch();
    }

    if (!$cert && $courseId && $traineeId) {
        $stmt = $db->prepare("
            SELECT tc.*,
                   u.full_name AS trainee_name, u.student_id, u.email AS trainee_email,
                   c.id AS course_id, c.name AS course_title,
                   c.start_date, c.end_date,
                   c.description,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
            FROM training_certificates tc
            JOIN users u ON tc.trainee_id = u.id
            JOIN training_courses c ON tc.course_id = c.id
            LEFT JOIN users issuer ON tc.issued_by = issuer.id
            WHERE tc.course_id = ? AND tc.trainee_id = ?
        ");
        $stmt->execute([$courseId, $traineeId]);
        $cert = $stmt->fetch();
    }

    if (!$cert) {
        if ($courseId && $traineeId) {
            $chk = $db->prepare("
                SELECT u.id AS trainee_id, u.full_name AS trainee_name, u.student_id, u.email AS trainee_email,
                       c.id AS course_id, c.name AS course_title, c.name AS course_title,
                       c.start_date, c.end_date,
                       c.description, c.description
                FROM users u, training_courses c
                WHERE u.id = ? AND c.id = ?
            ");
            $chk->execute([$traineeId, $courseId]);
            $info = $chk->fetch();
            if ($info) {
                $cert = [
                    'cert_code'        => 'NMU-VERIFY-PREVIEW',
                    'issued_at'        => date('Y-m-d H:i:s'),
                    'trainee_name'  => $info['trainee_name'],
                    'student_id'       => $info['student_id'],
                    'trainee_email'    => $info['trainee_email'],
                    'course_id'        => $info['course_id'],
                    'course_title'  => $info['course_title'],
                    'course_title'  => $info['course_title'],
                    'start_date'       => $info['start_date'],
                    'end_date'         => $info['end_date'],
                    'description'   => $info['description'],
                    'description'   => $info['description'],
                    'issuer_name'      => 'Prof. Khaled Fouad (Dean of Faculty)'
                ];
            } else {
                respondError('Certificate not found or invalid credential code', 404);
            }
        } else {
            respondError('Certificate not found or invalid credential code', 404);
        }
    }
} catch (Exception $e) {
    respondError('Database query error: ' . $e->getMessage(), 500);
}

$cId = (int)$cert['course_id'];

// Fetch course topics and calculate total duration dynamically
$topics = [];
$topicsDurationSum = 0;
try {
    $topStmt = $db->prepare("
        SELECT id, title, title, description, duration_hours, order_index
        FROM training_topics
        WHERE course_id = ?
        ORDER BY order_index ASC, id ASC
    ");
    $topStmt->execute([$cId]);
    $topics = $topStmt->fetchAll() ?: [];
    foreach ($topics as $tp) {
        $topicsDurationSum += (int)($tp['duration_hours'] ?? 0);
    }
} catch (Exception $e) {
    $topics = [];
}

// Determine total course duration dynamically
$courseTitleLower = strtolower($cert['course_title'] ?? '');
$courseDurationHours = 0;
if (isset($cert['duration_hours']) && (int)$cert['duration_hours'] > 0) {
    $courseDurationHours = (int)$cert['duration_hours'];
} elseif ($topicsDurationSum > 0) {
    $courseDurationHours = $topicsDurationSum;
} elseif (strpos($courseTitleLower, 'robotics') !== false) {
    $courseDurationHours = 63;
} else {
    $courseDurationHours = 40;
}

// Fetch assigned trainers
$trainers = [];
try {
    $trStmt = $db->prepare("
        SELECT u.full_name AS trainer_name, u.email AS trainer_email, u.department
        FROM trainer_assignments ta
        JOIN users u ON ta.trainer_id = u.id
        WHERE ta.course_id = ?
    ");
    $trStmt->execute([$cId]);
    $trainers = $trStmt->fetchAll() ?: [];
} catch (Exception $e) {
    $trainers = [];
}

respond([
    'valid' => true,
    'certificate' => [
        'cert_code'   => $cert['cert_code'],
        'issued_at'   => $cert['issued_at'],
        'issued_date' => date('d F Y', strtotime($cert['issued_at'])),
        'issuer_name' => $cert['issuer_name'] ?: 'Prof. Khaled Fouad (Dean)'
    ],
    'trainee' => [
        'full_name' => $cert['trainee_name'],
        'student_id'   => $cert['student_id'] ?: 'N/A',
        'email'        => $cert['trainee_email']
    ],
    'course' => [
        'id'             => $cert['course_id'],
        'name'        => $cert['course_title'],
        'name'        => $cert['course_title'],
        'category'       => $cert['category'] ?? 'Faculty Training Program',
        'level'          => $cert['level'] ?? 'Professional Level',
        'duration_hours' => $courseDurationHours,
        'start_date'     => $cert['start_date'],
        'end_date'       => $cert['end_date'],
        'description' => $cert['description'],
        'description' => $cert['description']
    ],
    'topics'   => $topics,
    'trainers' => $trainers
]);


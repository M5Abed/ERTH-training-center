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
                   u.full_name AS trainee_name, u.student_id, u.academic_id, u.email AS trainee_email,
                   u.major AS trainee_major, u.department AS trainee_department,
                   c.id AS course_id, c.name AS course_title,
                   c.category, c.level, c.duration_hours, c.course_code, c.course_type,
                   c.start_date, c.end_date, c.description,
                   te.final_track, te.program, te.custom_provider_name,
                   p.name AS provider_name,
                   tt.title AS track_name,
                   COALESCE(tc.final_score, teval.final_score) AS evaluation_score,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
            FROM training_certificates tc
            JOIN users u ON tc.trainee_id = u.id
            JOIN training_courses c ON tc.course_id = c.id
            LEFT JOIN trainee_enrollments te ON (te.trainee_id = tc.trainee_id AND te.course_id = tc.course_id)
            LEFT JOIN external_training_providers p ON te.provider_id = p.id
            LEFT JOIN training_topics tt ON te.track_id = tt.id
            LEFT JOIN training_evaluations teval ON (teval.trainee_id = tc.trainee_id AND teval.course_id = tc.course_id)
            LEFT JOIN users issuer ON tc.issued_by = issuer.id
            WHERE tc.cert_code = ?
        ");
        $stmt->execute([$code]);
        $cert = $stmt->fetch();
    }

    if (!$cert && $courseId && $traineeId) {
        $stmt = $db->prepare("
            SELECT tc.*,
                   u.full_name AS trainee_name, u.student_id, u.academic_id, u.email AS trainee_email,
                   u.major AS trainee_major, u.department AS trainee_department,
                   c.id AS course_id, c.name AS course_title,
                   c.category, c.level, c.duration_hours, c.course_code, c.course_type,
                   c.start_date, c.end_date, c.description,
                   te.final_track, te.program, te.custom_provider_name,
                   p.name AS provider_name,
                   tt.title AS track_name,
                   COALESCE(tc.final_score, teval.final_score) AS evaluation_score,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
            FROM training_certificates tc
            JOIN users u ON tc.trainee_id = u.id
            JOIN training_courses c ON tc.course_id = c.id
            LEFT JOIN trainee_enrollments te ON (te.trainee_id = tc.trainee_id AND te.course_id = tc.course_id)
            LEFT JOIN external_training_providers p ON te.provider_id = p.id
            LEFT JOIN training_topics tt ON te.track_id = tt.id
            LEFT JOIN training_evaluations teval ON (teval.trainee_id = tc.trainee_id AND teval.course_id = tc.course_id)
            LEFT JOIN users issuer ON tc.issued_by = issuer.id
            WHERE tc.course_id = ? AND tc.trainee_id = ?
        ");
        $stmt->execute([$courseId, $traineeId]);
        $cert = $stmt->fetch();
    }

    if (!$cert) {
        if ($courseId && $traineeId) {
            $chk = $db->prepare("
                SELECT u.id AS trainee_id, u.full_name AS trainee_name, u.student_id, u.academic_id, u.email AS trainee_email,
                       u.major AS trainee_major, u.department AS trainee_department,
                       c.id AS course_id, c.name AS course_title,
                       c.category, c.level, c.duration_hours, c.course_code, c.course_type,
                       c.start_date, c.end_date, c.description,
                       te.final_track, te.program, te.custom_provider_name,
                       p.name AS provider_name,
                       tt.title AS track_name,
                       teval.final_score AS evaluation_score
                FROM users u
                JOIN training_courses c ON c.id = ?
                LEFT JOIN trainee_enrollments te ON (te.trainee_id = u.id AND te.course_id = c.id)
                LEFT JOIN external_training_providers p ON te.provider_id = p.id
                LEFT JOIN training_topics tt ON te.track_id = tt.id
                LEFT JOIN training_evaluations teval ON (teval.trainee_id = u.id AND teval.course_id = c.id)
                WHERE u.id = ?
            ");
            $chk->execute([$courseId, $traineeId]);
            $info = $chk->fetch();
            if ($info) {
                $cert = [
                    'cert_code'        => 'NMU-VERIFY-PREVIEW',
                    'issued_at'        => date('Y-m-d H:i:s'),
                    'trainee_name'     => $info['trainee_name'],
                    'student_id'       => $info['student_id'],
                    'academic_id'      => $info['academic_id'] ?? null,
                    'trainee_email'    => $info['trainee_email'],
                    'trainee_major'    => $info['trainee_major'] ?? null,
                    'trainee_department' => $info['trainee_department'] ?? null,
                    'course_id'        => $info['course_id'],
                    'course_title'     => $info['course_title'],
                    'category'         => $info['category'] ?? null,
                    'level'            => $info['level'] ?? null,
                    'duration_hours'   => $info['duration_hours'] ?? null,
                    'course_code'      => $info['course_code'] ?? null,
                    'course_type'      => $info['course_type'] ?? null,
                    'start_date'       => $info['start_date'],
                    'end_date'         => $info['end_date'],
                    'description'      => $info['description'],
                    'final_track'      => $info['final_track'] ?? null,
                    'track_name'       => $info['track_name'] ?? null,
                    'provider_name'    => $info['provider_name'] ?? null,
                    'evaluation_score' => $info['evaluation_score'] ?? null,
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
        'cert_code'        => $cert['cert_code'],
        'issued_at'        => $cert['issued_at'],
        'issued_date'      => date('d F Y', strtotime($cert['issued_at'])),
        'final_score'      => $cert['evaluation_score'] !== null ? round((float)$cert['evaluation_score'], 2) : null,
        'issuer_name'      => $cert['issuer_name'] ?: 'Prof. Khaled Fouad (Dean)'
    ],
    'trainee' => [
        'full_name'        => $cert['trainee_name'],
        'student_id'       => $cert['student_id'] ?: ($cert['academic_id'] ?: 'N/A'),
        'academic_id'      => $cert['academic_id'] ?: $cert['student_id'],
        'email'            => $cert['trainee_email'],
        'major'            => $cert['trainee_major'] ?? null,
        'department'       => $cert['trainee_department'] ?? null
    ],
    'course' => [
        'id'               => $cert['course_id'],
        'name'             => $cert['course_title'],
        'course_code'      => $cert['course_code'] ?? null,
        'course_type'      => $cert['course_type'] ?? 'internal',
        'category'         => $cert['category'] ?: 'Faculty Training Program',
        'level'            => $cert['level'] ?: 'Professional Level',
        'track_name'       => $cert['track_name'] ?: ($cert['final_track'] ?: null),
        'provider_name'    => $cert['provider_name'] ?: ($cert['custom_provider_name'] ?: null),
        'duration_hours'   => $courseDurationHours,
        'start_date'       => $cert['start_date'],
        'end_date'         => $cert['end_date'],
        'description'      => $cert['description']
    ],
    'topics'   => $topics,
    'trainers' => $trainers
]);


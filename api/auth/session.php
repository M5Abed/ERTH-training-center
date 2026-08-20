<?php
require_once __DIR__ . '/../config.php';

$uid = (int) ($_SESSION['user_id'] ?? 0);
if (!$uid) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\d+)/i', $authHeader, $matches)) {
        $uid = (int) $matches[1];
    } elseif (!empty($_SERVER['HTTP_X_USER_ID'])) {
        $uid = (int) $_SERVER['HTTP_X_USER_ID'];
    }
}

if (!$uid) {
    respond(['user' => null, 'session' => null]);
}
$_SESSION['user_id'] = $uid;
$stmt = db()->prepare("
    SELECT id, email, full_name, student_id, academic_id,
           academic_year, major, department, final_track,
           is_admin, role, approval_status, email_verified, created_at
    FROM users WHERE id = ?
");
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    respond(['user' => null, 'session' => null]);
}


$user = sanitizeUserResponse($user, true); // own session = isSelf

$user['needs_track_selection'] = false;
$user['pending_external_course'] = null;

if (($user['role'] ?? '') === 'trainee') {
    try {
        $eStmt = db()->prepare("
            SELECT te.id as enrollment_id, te.course_id, te.training_type, te.provider_id, te.track_id, te.technical_track_confirmed, 
                   te.custom_provider_name, te.custom_provider_website, te.custom_provider_linkedin, te.final_track, te.training_start_date,
                   c.name as course_name, c.course_type,
                   p.name as provider_name, p.name_ar as provider_name_ar, p.website_url as provider_website, p.linkedin_url as provider_linkedin
            FROM trainee_enrollments te
            JOIN training_courses c ON c.id = te.course_id
            LEFT JOIN external_training_providers p ON p.id = te.provider_id
            WHERE te.trainee_id = ? AND (te.training_type = 'external' OR c.course_type = 'external')
            ORDER BY te.id DESC
        ");
        $eStmt->execute([$uid]);
        $externalEnrollments = $eStmt->fetchAll();

        foreach ($externalEnrollments as $enr) {
            // Student needs to select technical track, provider/links, and started date
            $isConfirmed = !empty($enr['technical_track_confirmed']) && !empty($enr['final_track']) && !empty($enr['training_start_date']);
            if (!$isConfirmed) {
                $user['needs_track_selection'] = true;
                $user['pending_external_course'] = $enr;
                break;
            }
        }
    } catch (Throwable $e) {
        error_log("Session check external track error: " . $e->getMessage());
    }
}

respond(['user' => $user, 'session' => ['user' => $user]]);

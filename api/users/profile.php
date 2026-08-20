<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $reqId = isset($_GET['id']) ? trim($_GET['id']) : null;
    if ($reqId === 'undefined' || $reqId === 'null' || $reqId === '') {
        $reqId = null;
    }
    $uid = empty($_SESSION['user_id']) ? null : (int)$_SESSION['user_id'];

    if (!$reqId && !$uid) { respondError('No user specified', 400); }

    $stmt = db()->prepare("
        SELECT u.id, u.email, u.full_name, u.student_id, u.academic_id,
               u.academic_year, u.major, u.department, u.final_track,
               u.role, u.is_admin, u.approval_status, u.email_verified, u.created_at
        FROM users u
        WHERE " . ($reqId ? "(u.student_id = ? OR u.id = ?)" : "u.id = ?") . "
    ");
    if ($reqId) {
        $stmt->execute([$reqId, $reqId]);
    } else {
        $stmt->execute([$uid]);
    }
    $user = $stmt->fetch();

    if (!$user) { respondError('User not found', 404); }

    $isSelf = ($uid === (int)$user['id']);
    $user = sanitizeUserResponse($user, $isSelf);

    if (!$isSelf) {
        unset($user['student_id']);
    }

    respond($user);

} elseif ($method === 'POST') {
    $uid  = requireSession();
    $data = body();

    $allowed = ['full_name', 'academic_year', 'major', 'department', 'final_track'];
    $set  = [];
    $vals = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $data)) {
            $set[]  = "`$col` = ?";
            $vals[] = $data[$col];
        }
    }
    if (empty($set)) { respondError('Nothing to update'); }
    $vals[] = $uid;
    db()->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
    respond(['ok' => true]);
}

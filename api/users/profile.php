<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get profile — defaults to own, or by ?id=
    // In public URLs, ?id= is the student_id (string), not the internal database ID
    $reqId = isset($_GET['id']) ? trim($_GET['id']) : null;
    if ($reqId === 'undefined' || $reqId === 'null' || $reqId === '') {
        $reqId = null;
    }
    $uid   = empty($_SESSION['user_id']) ? null : (int)$_SESSION['user_id'];

    if (!$reqId && !$uid) { respondError('No user specified', 400); }

    $stmt = db()->prepare("
        SELECT u.*
        FROM users u
        WHERE " . ($reqId ? "(u.student_id = ? OR u.username = ? OR u.id = ?)" : "u.id = ?") . "
    ");
    if ($reqId) {
        $stmt->execute([$reqId, $reqId, $reqId]);
    } else {
        $stmt->execute([$uid]);
    }
    $user = $stmt->fetch();

    if (!$user) { respondError('User not found', 404); }

    // Decode JSON fields
    $user['user_skills']      = json_decode($user['user_skills'] ?? 'null', true) ?? [];
    $user['user_preferences'] = json_decode($user['user_preferences'] ?? 'null', true);
    $user['enrolled_courses'] = json_decode($user['enrolled_courses'] ?? 'null', true) ?? [];
    $user['availability']     = json_decode($user['availability'] ?? 'null', true);

    $isSelf = ($uid === (int)$user['id']);
    $user = sanitizeUserResponse($user, $isSelf);

    // Redact sensitive contact data for non-self requests
    if (!$isSelf) {
        unset($user['student_id']);
    }

    respond($user);

} elseif ($method === 'POST') {
    $uid  = requireSession();
    $data = body();

    // Username validation if supplied
    if (array_key_exists('username', $data) && $data['username'] !== null) {
        $username = trim($data['username']);
        if (strlen($username) < 3 || strlen($username) > 16) {
            respondError('Username must be between 3 and 16 characters');
        }
        if (!preg_match('/^[a-zA-Z0-9_\.]+$/', $username)) {
            respondError('Username can only contain letters, numbers, underscores, and dots');
        }
        // Check uniqueness excluding current user
        $chk = db()->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?");
        $chk->execute([$username, $uid]);
        if ($chk->fetch()) {
            respondError('Username already taken');
        }
        $data['username'] = $username;
    }

    $allowed = ['full_name','username','college_key','academic_year','major',
                'semester','enrolled_courses','bio','avatar_url','availability'];
    $set  = [];
    $vals = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $data)) {
            $val = $data[$col];
            if (($col === 'enrolled_courses' || $col === 'availability') && is_array($val)) {
                $val = json_encode($val, JSON_UNESCAPED_UNICODE);
            }
            $set[]  = "`$col` = ?";
            $vals[] = $val;
        }
    }
    if (empty($set)) { respondError('Nothing to update'); }
    $vals[] = $uid;
    db()->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
    respond(['ok' => true]);
}

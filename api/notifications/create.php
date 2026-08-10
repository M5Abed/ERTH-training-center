<?php
require_once __DIR__ . '/../config.php';

$uid = requireSession(); // must be logged in to send notifications

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$b = body();
$targetUserId = (int)($b['user_id'] ?? 0);
$type = $b['type'] ?? 'info';
$messageEn = $b['message_en'] ?? '';
$messageAr = $b['message_ar'] ?? '';
$projId = (int)($b['project_id'] ?? 0);

if ($type === 'invite') {
    // Ensure the sender is the owner of the project they are inviting to
    $check = db()->prepare("SELECT 1 FROM projects WHERE id = ? AND owner_id = ?");
    $check->execute([$projId, $uid]);
    if (!$check->fetch()) {
        respondError('Forbidden: You can only invite users to your own projects', 403);
    }
} else {
    // Only admins can send arbitrary notifications
    $adm = db()->prepare("SELECT is_admin FROM users WHERE id = ?");
    $adm->execute([$uid]);
    $row = $adm->fetch();
    if (!$row || !$row['is_admin']) {
        respondError('Forbidden: Only admins can send arbitrary notifications', 403);
    }
}

if (!$targetUserId || !$messageEn) {
    respondError('user_id and message_en required');
}

try {
    if ($projId > 0) {
        $stmt = db()->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar, is_read, project_id, created_at)
            VALUES (?, ?, ?, ?, 0, ?, NOW())
        ");
        $stmt->execute([$targetUserId, $type, $messageEn, $messageAr, $projId]);
    }
    else {
        $stmt = db()->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar, is_read, created_at)
            VALUES (?, ?, ?, ?, 0, NOW())
        ");
        $stmt->execute([$targetUserId, $type, $messageEn, $messageAr]);
    }
}
catch (\Exception $e) {
    // Fallback if project_id column does not exist or another error occurs
    $stmt = db()->prepare("
        INSERT INTO notifications (user_id, type, message_en, message_ar, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, NOW())
    ");
    $stmt->execute([$targetUserId, $type, $messageEn, $messageAr]);
}

respond(['ok' => true]);

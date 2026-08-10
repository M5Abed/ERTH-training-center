<?php
require_once __DIR__ . '/../config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { respondError('POST required', 405); }
$uid = requireSession();
db()->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")->execute([$uid]);
respond(['ok' => true]);

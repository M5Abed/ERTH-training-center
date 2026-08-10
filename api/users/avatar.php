<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}
$uid = requireSession();

if (empty($_FILES['avatar'])) {
    respondError('No file uploaded');
}
$file = $_FILES['avatar'];

$allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowed)) {
    respondError('Invalid file type. Use JPEG, PNG, GIF or WebP.');
}
if ($file['size'] > 2 * 1024 * 1024) {
    respondError('File too large (max 2MB)');
}

// Read the file and encode to Base64
$type = $file['type'];
$data = file_get_contents($file['tmp_name']);
$base64 = 'data:' . $type . ';base64,' . base64_encode($data);

// Save Base64 string directly to DB
$stmt = db()->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
$stmt->execute([$base64, $uid]);

respond(['url' => $base64]);

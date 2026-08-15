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

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($detectedMime, $allowed, true)) {
    respondError('Invalid file format. Only JPEG, PNG, GIF, and WebP images are allowed.');
}

// Extra security check: verify image dimensions
$imageInfo = @getimagesize($file['tmp_name']);
if ($imageInfo === false) {
    respondError('Uploaded file is not a valid image.');
}

if ($file['size'] > 2 * 1024 * 1024) {
    respondError('File too large (max 2MB)');
}

// Read the file and encode to Base64
$type = $detectedMime;
$data = file_get_contents($file['tmp_name']);
$base64 = 'data:' . $type . ';base64,' . base64_encode($data);

// Save Base64 string directly to DB
$stmt = db()->prepare("UPDATE users SET avatar_url = ? WHERE id = ?");
$stmt->execute([$base64, $uid]);

respond(['url' => $base64]);

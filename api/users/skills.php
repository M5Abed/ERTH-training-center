<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uid    = requireSession();

if ($method === 'GET') {
    respond([]);
} elseif ($method === 'POST') {
    // user_skills table has been dropped in migration 3.
    // Legacy endpoint, return success.
    respond(['ok' => true]);
}

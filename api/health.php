<?php
require_once __DIR__ . '/config.php';

header("Content-Type: application/json; charset=utf-8");

try {
    // Check Database connection
    $stmt = db()->query("SELECT 1");
    if (!$stmt) {
        throw new Exception("Database query failed");
    }

    echo json_encode([
        'status' => 'ok',
        'db' => 'connected',
        'time' => date('c'),
        'version' => '2.2.0'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'db' => 'disconnected',
        'time' => date('c'),
        'version' => '2.2.0'
    ]);
}

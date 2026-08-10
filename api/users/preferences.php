<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uid    = requireSession();

if ($method === 'GET') {
    $stmt = db()->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    if ($row) {
        $row['preferred_project_type'] = json_decode($row['preferred_project_type'] ?? 'null', true) ?? [];
    }
    respond($row ?: []);
} elseif ($method === 'POST') {
    $d    = body();
    $cols = ['works_under_pressure','enjoys_leadership','enjoys_execution',
             'pressure_score','leadership_score','execution_score',
             'available_hours_per_week','preferred_project_type'];
    $set  = [];
    $vals = [];
    foreach ($cols as $col) {
        if (array_key_exists($col, $d)) {
            $val = $col === 'preferred_project_type' ? json_encode($d[$col]) : $d[$col];
            $set[]  = "`$col` = ?";
            $vals[] = $val;
        }
    }
    $vals[] = $uid;
    if (empty($set)) { respond(['ok' => true]); }
    db()->prepare("INSERT INTO user_preferences (user_id) VALUES (?)
                   ON DUPLICATE KEY UPDATE user_id = user_id")->execute([$uid]);
    db()->prepare("UPDATE user_preferences SET " . implode(', ', $set) . " WHERE user_id = ?")->execute($vals);
    respond(['ok' => true]);
}

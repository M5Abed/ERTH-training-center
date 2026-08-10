<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uid    = requireSession();

if ($method === 'GET') {
    $stmt = db()->prepare("SELECT skill_id, proficiency FROM user_skills WHERE user_id = ?");
    $stmt->execute([$uid]);
    respond($stmt->fetchAll());
} elseif ($method === 'POST') {
    $skills = body()['skills'] ?? []; // [{skill_id, proficiency}]

    db()->prepare("DELETE FROM user_skills WHERE user_id = ?")->execute([$uid]);

    if (!empty($skills)) {
        $stmt = db()->prepare("INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)");
        foreach ($skills as $s) {
            $stmt->execute([$uid, $s['skill_id'], (int)($s['proficiency'] ?? 1)]);
        }
    }
    respond(['ok' => true]);
}

<?php
// =========================================================
// NMU ERTH — Catalog List
// Access: Public / Authenticated
// Returns all 64 catalog projects sorted by display_order.
// No hidden categories — every idea is always visible.
// =========================================================

require_once __DIR__ . '/../../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();

$stmt = $db->query("
    SELECT id, title, category, level, skills, display_order
    FROM projects_catalog
    ORDER BY
        CASE category
            WHEN 'software'    THEN 1
            WHEN 'yanshee'     THEN 2
            WHEN 'nao'         THEN 3
            WHEN 'integrated'  THEN 4
            ELSE 5
        END,
        display_order ASC,
        id ASC
");

$projects = $stmt->fetchAll();

// Group by category for convenient frontend rendering
$grouped = [
    'software'   => [],
    'yanshee'    => [],
    'nao'        => [],
    'integrated' => [],
];

foreach ($projects as $p) {
    $cat = $p['category'];
    if (isset($grouped[$cat])) {
        $grouped[$cat][] = $p;
    }
}

respond([
    'projects' => $projects,         // flat sorted list (software first)
    'grouped'  => $grouped,          // organized by category
    'total'    => count($projects),
]);

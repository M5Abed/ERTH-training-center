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

try {
    $count = (int)$db->query("SELECT COUNT(*) FROM projects_catalog")->fetchColumn();
} catch (Throwable $e) {
    $count = 0;
}

if ($count === 0) {
    try {
        require_once __DIR__ . '/catalog_64_data.php';
        $db->exec("
            CREATE TABLE IF NOT EXISTS projects_catalog (
                id INT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(64) NOT NULL,
                level VARCHAR(64) NOT NULL,
                skills TEXT NULL,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS proposals_pregenerated (
                id INT AUTO_INCREMENT PRIMARY KEY,
                catalog_project_id INT NOT NULL,
                section_key VARCHAR(64) NOT NULL,
                content MEDIUMTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_pregen_proj_section (catalog_project_id, section_key),
                INDEX idx_pregen_proj (catalog_project_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        $catalog = getCatalog64();
        foreach ($catalog as $p) {
            $id = (int)$p['id'];
            $stmt = $db->prepare("
                INSERT INTO projects_catalog (id, title, category, level, skills, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title         = VALUES(title),
                    category      = VALUES(category),
                    level         = VALUES(level),
                    skills        = VALUES(skills),
                    display_order = VALUES(display_order)
            ");
            $stmt->execute([$id, $p['title'], $p['category'], $p['level'], $p['skills'] ?? '', $p['display_order'] ?? $id]);

            $sectionStmt = $db->prepare("
                INSERT INTO proposals_pregenerated (catalog_project_id, section_key, content)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE content = VALUES(content)
            ");
            foreach ($p['sections'] as $key => $content) {
                $sectionStmt->execute([$id, $key, $content]);
            }
        }
    } catch (Throwable $e) {
        error_log("Failed to auto-seed catalog: " . $e->getMessage());
    }
}

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

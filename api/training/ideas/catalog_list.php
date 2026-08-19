<?php
// =========================================================
// NMU ERTH — Catalog List (with Team Reservation Status)
// Access: Public / Authenticated
// Returns all 64 catalog projects with `is_taken` flag so that
// when a team selects a project, it is grayed out for other teams.
// =========================================================

require_once __DIR__ . '/../../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();

// Ensure catalog_project_id column exists on training_ideas
try {
    $cols = $db->query("SHOW COLUMNS FROM training_ideas LIKE 'catalog_project_id'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN catalog_project_id INT NULL AFTER course_id");
        $db->exec("ALTER TABLE training_ideas ADD INDEX idx_ti_catalog_proj (catalog_project_id)");
    }
} catch (Throwable $e) {}

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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $db->exec("
            CREATE TABLE IF NOT EXISTS proposals_pregenerated (
                id INT AUTO_INCREMENT PRIMARY KEY,
                catalog_project_id INT NOT NULL,
                section_key VARCHAR(64) NOT NULL,
                content MEDIUMTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_pregen_proj_section (catalog_project_id, section_key),
                INDEX idx_pregen_proj (catalog_project_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
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

$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int)$_GET['course_id'] : 0;
$uid      = (int)($_SESSION['user_id'] ?? 0);

// Resolve ideas that the current user belongs to (as owner or team member)
$myIdeaIds = [];
if ($uid) {
    $myOwnerIdeas = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ?");
    $myOwnerIdeas->execute([$uid]);
    $myIdeaIds = array_map('intval', $myOwnerIdeas->fetchAll(PDO::FETCH_COLUMN));

    $myMemberIdeas = $db->prepare("SELECT idea_id FROM training_idea_members WHERE user_id = ?");
    $myMemberIdeas->execute([$uid]);
    $myMemberIds = array_map('intval', $myMemberIdeas->fetchAll(PDO::FETCH_COLUMN));

    $myIdeaIds = array_unique(array_merge($myIdeaIds, $myMemberIds));
}

// ── Query all taken ideas in training_ideas ───────────────────────────────────
$takenSql = "
    SELECT 
        ti.id AS idea_id,
        ti.catalog_project_id,
        ti.title_en AS idea_title,
        ti.owner_id,
        ti.course_id,
        ti.status,
        u.full_name AS leader_name
    FROM training_ideas ti
    JOIN users u ON u.id = ti.owner_id
    WHERE ti.status != 'rejected'
";
$takenParams = [];
if ($courseId) {
    $takenSql .= " AND ti.course_id = ?";
    $takenParams[] = $courseId;
}

$takenStmt = $db->prepare($takenSql);
$takenStmt->execute($takenParams);
$takenRows = $takenStmt->fetchAll(PDO::FETCH_ASSOC);

$takenById    = [];
$takenByTitle = [];

foreach ($takenRows as $tr) {
    if (!empty($tr['catalog_project_id'])) {
        $takenById[(int)$tr['catalog_project_id']] = $tr;
    }
    if (!empty($tr['idea_title'])) {
        $normTitle = mb_strtolower(trim($tr['idea_title']), 'UTF-8');
        $takenByTitle[$normTitle] = $tr;
    }
}

// ── Fetch all 64 projects from catalog ────────────────────────────────────────
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

$rawProjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
$projects = [];

// Group by category for convenient frontend rendering
$grouped = [
    'software'   => [],
    'yanshee'    => [],
    'nao'        => [],
    'integrated' => [],
];

foreach ($rawProjects as $p) {
    $pId = (int)$p['id'];
    $pTitleNorm = mb_strtolower(trim($p['title']), 'UTF-8');

    $takenInfo = $takenById[$pId] ?? ($takenByTitle[$pTitleNorm] ?? null);

    if ($takenInfo) {
        $isTakenByMe = ($uid && ($takenInfo['owner_id'] == $uid || in_array((int)$takenInfo['idea_id'], $myIdeaIds)));
        $p['is_taken']       = true;
        $p['taken_by_team']   = $takenInfo['leader_name'] ?: 'Team';
        $p['taken_by_me']     = (bool)$isTakenByMe;
        $p['taken_idea_id']   = (int)$takenInfo['idea_id'];
    } else {
        $p['is_taken']       = false;
        $p['taken_by_team']   = null;
        $p['taken_by_me']     = false;
        $p['taken_idea_id']   = null;
    }

    $projects[] = $p;

    $cat = $p['category'];
    if (isset($grouped[$cat])) {
        $grouped[$cat][] = $p;
    }
}

respond([
    'projects' => $projects,
    'grouped'  => $grouped,
    'total'    => count($projects),
]);

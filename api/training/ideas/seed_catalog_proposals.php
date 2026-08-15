<?php
// =========================================================
// NMU ERTH — Catalog Proposal Seeder (ZERO AI CALLS)
// Usage: php api/training/ideas/seed_catalog_proposals.php [--dry-run]
//        Or trigger via GET as admin: /api/training/ideas/seed_catalog_proposals.php
//
// Populates projects_catalog (64 rows) and proposals_pregenerated
// (448 rows = 64 × 7 sections) from the static catalog_64_data.php.
// Re-running is fully idempotent — uses INSERT ... ON DUPLICATE KEY UPDATE.
// =========================================================

define('_RUNNING_CLI', php_sapi_name() === 'cli');

if (!_RUNNING_CLI) {
    require_once __DIR__ . '/../../config.php';
    requireRole(['admin']);
} else {
    require_once __DIR__ . '/../../config.php';
}

// IMPORTANT: NO ai_engine.php require — zero AI calls in this script.
require_once __DIR__ . '/catalog_64_data.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);
$log    = function(string $msg, string $level = 'INFO') {
    $ts = date('H:i:s');
    echo "[$ts][$level] $msg\n";
};

$catalog   = getCatalog64();
$total     = count($catalog);
$seeded    = 0;
$skipped   = 0;
$failed    = 0;

$log("Starting catalog seeder (ZERO AI). Projects: $total. Dry-run: " . ($dryRun ? 'YES' : 'NO'));
$log(str_repeat('-', 60));

if ($dryRun) {
    foreach ($catalog as $p) {
        $log("  DRY-RUN: would seed #{$p['id']} {$p['title']} [{$p['category']}] — " . count($p['sections']) . " sections", 'DRY');
    }
    $log(str_repeat('-', 60));
    $log("Dry-run complete. $total projects would be seeded.");
    if (!_RUNNING_CLI) respond(['success' => true, 'dry_run' => true, 'total' => $total]);
    exit(0);
}

$db = db();

foreach ($catalog as $p) {
    $id    = (int)$p['id'];
    $title = $p['title'];
    $log("Seeding #{$id} {$title} [{$p['category']}]");

    try {
        $db->beginTransaction();

        // 1. Upsert into projects_catalog
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
        $stmt->execute([$id, $title, $p['category'], $p['level'], $p['skills'], $p['display_order']]);

        // 2. Upsert 7 section rows into proposals_pregenerated
        $sectionStmt = $db->prepare("
            INSERT INTO proposals_pregenerated (catalog_project_id, section_key, content)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE content = VALUES(content)
        ");

        $sectionCount = 0;
        foreach ($p['sections'] as $key => $content) {
            if (empty(trim($content))) {
                $log("    WARN: empty content for section '$key'", 'WARN');
            }
            $sectionStmt->execute([$id, $key, $content]);
            $sectionCount++;
        }

        $db->commit();
        $log("    ✓ OK — $sectionCount sections inserted/updated", 'OK');
        $seeded++;

    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        $log("    ✗ FAILED: " . $e->getMessage(), 'ERROR');
        $failed++;
    }
}

$log(str_repeat('-', 60));
$log("Done. Seeded: $seeded | Failed: $failed | Total: $total");

// Verify row counts
$pcCount   = (int)$db->query("SELECT COUNT(*) FROM projects_catalog")->fetchColumn();
$pgCount   = (int)$db->query("SELECT COUNT(*) FROM proposals_pregenerated")->fetchColumn();
$log("DB verification: projects_catalog={$pcCount} rows, proposals_pregenerated={$pgCount} rows");
if ($pcCount === 64 && $pgCount === 448) {
    $log("✓ All counts correct (64 × 7 = 448)", 'OK');
} else {
    $log("⚠ Unexpected row counts! Expected 64 and 448.", 'WARN');
}

if (!_RUNNING_CLI) {
    respond([
        'success'       => true,
        'seeded'        => $seeded,
        'failed'        => $failed,
        'total'         => $total,
        'catalog_rows'  => $pcCount,
        'section_rows'  => $pgCount,
    ]);
}

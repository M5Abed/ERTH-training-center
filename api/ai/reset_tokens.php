<?php
// =========================================================
// NMU TRAINING — Daily AI Token Reset
// CLI-only script. Run via cron or docker exec:
//   php /var/www/html/api/ai/reset_tokens.php
//
// Actions:
//   1. Reset used_today_tokens = 0, is_active = 1 for all keys
//      where reset_date < today (catches keys that weren't reset by lazy-reset)
//   2. Purge expired ai_cache rows (expires_at < NOW())
//   3. Output a JSON summary for log capture
// =========================================================

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['error' => 'This script must be run from the command line.']);
    exit(1);
}

require_once __DIR__ . '/../config.php';

$today  = gmdate('Y-m-d');
$report = [
    'run_at'           => gmdate('Y-m-d H:i:s') . ' UTC',
    'keys_reset'       => 0,
    'cache_purged'     => 0,
    'errors'           => [],
];

// ── 1. Reset provider key token counters ────────────────────────────────────
try {
    $stmt = db()->prepare(
        'UPDATE ai_provider_keys
         SET used_today_tokens = 0,
             is_active         = 1,
             reset_date        = ?
         WHERE reset_date < ?'
    );
    $stmt->execute([$today, $today]);
    $report['keys_reset'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $report['errors'][] = 'Key reset failed: ' . $e->getMessage();
    error_log('[reset_tokens] Key reset failed: ' . $e->getMessage());
}

// ── 2. Purge expired cache entries ──────────────────────────────────────────
try {
    $stmt = db()->prepare('DELETE FROM ai_cache WHERE expires_at < NOW()');
    $stmt->execute();
    $report['cache_purged'] = $stmt->rowCount();
} catch (\Throwable $e) {
    $report['errors'][] = 'Cache purge failed: ' . $e->getMessage();
    error_log('[reset_tokens] Cache purge failed: ' . $e->getMessage());
}

// ── 3. Output summary ────────────────────────────────────────────────────────
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
exit(empty($report['errors']) ? 0 : 1);

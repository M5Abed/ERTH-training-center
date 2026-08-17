<?php
// =========================================================
// NMU TRAINING — AI Provider Key Seeder
// Seeds the ai_provider_keys table with env var names.
// The actual secret values live in .env, NEVER in the DB.
//
// Run once (safe to re-run — uses INSERT IGNORE):
//   docker exec -it erth_training_php php /var/www/html/api/seed_ai_keys.php
// =========================================================

if (php_sapi_name() !== 'cli') {
    require_once __DIR__ . '/config.php';
    requireRole('admin');
} else {
    require_once __DIR__ . '/config.php';
}

$today = gmdate('Y-m-d');

// ─────────────────────────────────────────────────────────────────────────────
// Key definitions
// Each row: [provider, key_label, env_var_name, model, api_url, priority]
// is_active defaults to 1; only keys with a non-empty env var are inserted as active.
// ─────────────────────────────────────────────────────────────────────────────
$keys = [
    // ── Groq — fast, free tier, primary ──────────────────────────────────────
    [
        'provider'     => 'groq',
        'key_label'    => 'Groq Key 1',
        'env_var_name' => 'GROQ_KEY_1',
        'model'        => 'groq/compound-mini',
        'api_url'      => 'https://api.groq.com/openai/v1/chat/completions',
        'priority'     => 10,
    ],
    [
        'provider'     => 'groq',
        'key_label'    => 'Groq Key 2',
        'env_var_name' => 'GROQ_KEY_2',
        'model'        => 'groq/compound-mini',
        'api_url'      => 'https://api.groq.com/openai/v1/chat/completions',
        'priority'     => 11,
    ],
    [
        'provider'     => 'groq',
        'key_label'    => 'Groq Key 3',
        'env_var_name' => 'GROQ_KEY_3',
        'model'        => 'groq/compound-mini',
        'api_url'      => 'https://api.groq.com/openai/v1/chat/completions',
        'priority'     => 12,
    ],
    [
        'provider'     => 'groq',
        'key_label'    => 'Groq Key 4',
        'env_var_name' => 'GROQ_KEY_4',
        'model'        => 'groq/compound-mini',
        'api_url'      => 'https://api.groq.com/openai/v1/chat/completions',
        'priority'     => 13,
    ],
    [
        'provider'     => 'groq',
        'key_label'    => 'Groq Key 5',
        'env_var_name' => 'GROQ_KEY_5',
        'model'        => 'groq/compound-mini',
        'api_url'      => 'https://api.groq.com/openai/v1/chat/completions',
        'priority'     => 14,
    ],

    // ── Gemini — secondary ───────────────────────────────────────────────────
    [
        'provider'     => 'gemini',
        'key_label'    => 'Gemini Key 1',
        'env_var_name' => 'GEMINI_KEY_1',
        'model'        => 'gemini-2.0-flash',
        'api_url'      => 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        'priority'     => 20,
    ],

    // ── OpenRouter — tertiary fallback ───────────────────────────────────────
    [
        'provider'     => 'openrouter',
        'key_label'    => 'OpenRouter Key 1',
        'env_var_name' => 'OPENROUTER_KEY_1',
        'model'        => 'meta-llama/llama-3.1-8b-instruct:free',
        'api_url'      => 'https://openrouter.ai/api/v1/chat/completions',
        'priority'     => 30,
    ],
];

$inserted  = 0;
$skipped   = 0;
$errors    = [];

$stmt = db()->prepare(
    'INSERT INTO ai_provider_keys
        (provider, key_label, env_var_name, model, api_url, priority,
         used_today_tokens, reset_date, is_active)
     VALUES
        (:provider, :key_label, :env_var_name, :model, :api_url, :priority,
         0, :reset_date, :is_active)
     ON DUPLICATE KEY UPDATE
        model = VALUES(model),
        api_url = VALUES(api_url),
        is_active = VALUES(is_active)'
);

foreach ($keys as $key) {
    // Detect whether the secret is actually set
    $secret   = defined($key['env_var_name'])
              ? constant($key['env_var_name'])
              : (getenv($key['env_var_name']) ?: '');
    $isActive = (!empty($secret) && $secret !== 'your_groq_key_here') ? 1 : 0;

    try {
        $ok = $stmt->execute([
            ':provider'     => $key['provider'],
            ':key_label'    => $key['key_label'],
            ':env_var_name' => $key['env_var_name'],
            ':model'        => $key['model'],
            ':api_url'      => $key['api_url'],
            ':priority'     => $key['priority'],
            ':reset_date'   => $today,
            ':is_active'    => $isActive,
        ]);

        if ($stmt->rowCount() > 0) {
            $inserted++;
            $status = $isActive ? '✓ active' : '○ inactive (env var not set)';
            echo "  [{$key['provider']}] {$key['key_label']} — inserted ($status)\n";
        } else {
            $skipped++;
            echo "  [{$key['provider']}] {$key['key_label']} — already exists, skipped\n";
        }
    } catch (\Throwable $e) {
        $errors[] = $e->getMessage();
        echo "  ERROR seeding {$key['key_label']}: " . $e->getMessage() . "\n";
    }
}

echo "\n";
echo "Done: $inserted inserted, $skipped skipped, " . count($errors) . " errors.\n";

if ($inserted > 0 || $skipped > 0) {
    // Show current table state
    echo "\nCurrent ai_provider_keys:\n";
    $rows = db()->query(
        'SELECT id, provider, key_label, env_var_name, model, priority, is_active, used_today_tokens
         FROM ai_provider_keys ORDER BY priority'
    )->fetchAll();
    foreach ($rows as $r) {
        $active = $r['is_active'] ? '✓' : '○';
        printf(
            "  #%d  %-12s  %-20s  %-25s  pri=%-3d  tokens=%-6d  %s\n",
            $r['id'], $r['provider'], $r['key_label'], $r['env_var_name'],
            $r['priority'], $r['used_today_tokens'], $active
        );
    }
}

exit(empty($errors) ? 0 : 1);

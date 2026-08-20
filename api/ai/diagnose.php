<?php
// =========================================================
// NMU TRAINING — AI Engine Diagnostics & Health Check
// =========================================================
// Run via browser (Admin / Trainer / Token) or CLI:
//   Browser: https://yourdomain.com/api/ai/diagnose.php?token=erth_ai_diag_2026
//   CLI:     php api/ai/diagnose.php
// =========================================================

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/ai_engine.php';

$isCli = (php_sapi_name() === 'cli');
$token = $_GET['token'] ?? '';
$format = $_GET['format'] ?? '';
$wantsJson = $isCli || $format === 'json' || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

// ── Security Check ────────────────────────────────────────────────────────────
$isAuthorized = false;
if ($isCli) {
    $isAuthorized = true;
} elseif ($token === 'erth_ai_diag_2026') {
    $isAuthorized = true;
} elseif (!empty($_SESSION['user_id'])) {
    $isAuthorized = true;
}

if (!$isAuthorized) {
    if ($wantsJson) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status'  => 'UNAUTHORIZED',
            'message' => 'Please append ?token=erth_ai_diag_2026 to the URL or log in first.',
            'url'     => (isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '') . '?token=erth_ai_diag_2026',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(401);
        echo '<!DOCTYPE html><html><head><title>AI Diagnostics — Unauthorized</title><style>body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;padding:40px;text-align:center;}a{color:#58a6ff;text-decoration:none;}a:hover{text-decoration:underline;}.box{max-width:500px;margin:50px auto;background:#161b22;border:1px solid #30363d;padding:30px;border-radius:8px;}</style></head><body><div class="box"><h2>🔒 AI Diagnostics Protection</h2><p>Please use the diagnostic access link below:</p><p><a href="?token=erth_ai_diag_2026">👉 Open AI Diagnostics with Token</a></p></div></body></html>';
    }
    exit;
}

// ── Collect Diagnostics ───────────────────────────────────────────────────────
$results = [
    'timestamp'    => gmdate('Y-m-d H:i:s') . ' UTC',
    'environment'  => [
        'php_version' => PHP_VERSION,
        'sapi'        => php_sapi_name(),
        'os'          => PHP_OS,
        'curl'        => extension_loaded('curl'),
        'openssl'     => extension_loaded('openssl'),
        'json'        => extension_loaded('json'),
        'pdo_mysql'   => extension_loaded('pdo_mysql'),
    ],
    'env_candidates' => [],
    'env_found'      => null,
    'detected_keys'  => [],
    'database'       => [
        'connected'   => false,
        'tables'      => [],
        'keys_rows'   => 0,
        'active_keys' => 0,
        'keys_list'   => [],
        'error'       => null,
    ],
    'endpoints_ping' => [],
    'live_ai_test'   => [
        'attempted'   => false,
        'ok'          => false,
        'result'      => null,
        'latency_ms'  => 0,
        'tokens'      => 0,
        'cached'      => false,
        'error'       => null,
        'code'        => null,
    ],
    'overall_status' => 'PENDING',
];

// Check .env candidates
$candidatePaths = [
    __DIR__ . '/../../.env',
    __DIR__ . '/../.env',
    __DIR__ . '/.env',
    (isset($_SERVER['DOCUMENT_ROOT']) && $_SERVER['DOCUMENT_ROOT'] ? $_SERVER['DOCUMENT_ROOT'] . '/.env' : ''),
];

foreach ($candidatePaths as $p) {
    if (!$p) continue;
    $exists = file_exists($p);
    $results['env_candidates'][] = ['path' => $p, 'exists' => $exists];
    if ($exists && !$results['env_found']) {
        $results['env_found'] = $p;
    }
}

// Check Detected Keys
$checkKeys = [
    'GROQ_API_KEY', 'GROQ_KEY_1', 'GROQ_KEY_2', 'GROQ_KEY',
    'GEMINI_API_KEY', 'GEMINI_KEY_1', 'GOOGLE_API_KEY',
    'OPENROUTER_API_KEY', 'OPENROUTER_KEY_1',
    'OPENAI_API_KEY', 'OPENAI_KEY_1',
];

$hasAnyKey = false;
foreach ($checkKeys as $k) {
    $secret = _readSecret($k);
    if (!empty($secret)) {
        $len = strlen($secret);
        $masked = ($len > 8)
            ? substr($secret, 0, 4) . str_repeat('•', min(14, $len - 8)) . substr($secret, -4)
            : '••••••••';
        $results['detected_keys'][$k] = [
            'status' => 'SET',
            'length' => $len,
            'masked' => $masked,
        ];
        $hasAnyKey = true;
    } else {
        $results['detected_keys'][$k] = [
            'status' => 'NOT_SET',
        ];
    }
}

// Check Database
try {
    $db = db();
    $results['database']['connected'] = true;

    $tables = ['ai_provider_keys', 'ai_cache', 'ai_user_usage'];
    foreach ($tables as $t) {
        try {
            $count = (int)$db->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
            $results['database']['tables'][$t] = ['exists' => true, 'rows' => $count];
        } catch (\Throwable $e) {
            $results['database']['tables'][$t] = ['exists' => false, 'error' => $e->getMessage()];
        }
    }

    if (!empty($results['database']['tables']['ai_provider_keys']['exists'])) {
        $results['database']['keys_rows'] = $results['database']['tables']['ai_provider_keys']['rows'];
        $activeCount = (int)$db->query("SELECT COUNT(*) FROM ai_provider_keys WHERE is_active = 1")->fetchColumn();
        $results['database']['active_keys'] = $activeCount;

        $stmt = $db->query("SELECT id, provider, key_label, env_var_name, model, is_active, used_today_tokens, priority FROM ai_provider_keys ORDER BY priority ASC");
        $results['database']['keys_list'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
} catch (\Throwable $e) {
    $results['database']['connected'] = false;
    $results['database']['error'] = $e->getMessage();
}

// Check Outbound Connectivity
$testEndpoints = [
    'Groq API'     => 'https://api.groq.com/openai/v1/chat/completions',
    'Google Gemini' => 'https://generativelanguage.googleapis.com',
    'OpenRouter'   => 'https://openrouter.ai/api/v1/chat/completions',
];

foreach ($testEndpoints as $name => $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT      => 'NMU-Training-Center-Diagnostic/2.0',
    ]);
    curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err       = curl_error($ch);
    $curlErrNo = curl_errno($ch);
    curl_close($ch);

    // SSL fallback test if initial cert failed
    $sslFallback = false;
    if ($err && ($curlErrNo === 60 || $curlErrNo === 77)) {
        $ch2 = curl_init($url);
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_USERAGENT      => 'NMU-Training-Center-Diagnostic/2.0',
        ]);
        curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        $err2      = curl_error($ch2);
        curl_close($ch2);
        if (empty($err2) && $httpCode2 > 0) {
            $sslFallback = true;
            $httpCode = $httpCode2;
            $err = null;
        }
    }

    $results['endpoints_ping'][$name] = [
        'url'          => $url,
        'http_code'    => $httpCode,
        'reachable'    => empty($err) && $httpCode > 0,
        'ssl_fallback' => $sslFallback,
        'error'        => $err ?: null,
    ];
}

// Run Live AI Test
if ($hasAnyKey) {
    $results['live_ai_test']['attempted'] = true;
    $startTime = microtime(true);

    $testPayload = [
        'keywords' => 'Smart Attendance System with Face Recognition',
        'domain'   => 'Artificial Intelligence & IoT',
    ];

    $aiRes = callAI(1, 'proposal', $testPayload);
    $endTime = microtime(true);

    $results['live_ai_test']['latency_ms'] = round(($endTime - $startTime) * 1000, 2);
    $results['live_ai_test']['ok']         = $aiRes['ok'] ?? false;
    $results['live_ai_test']['cached']     = $aiRes['cached'] ?? false;
    $results['live_ai_test']['tokens']     = $aiRes['tokens'] ?? 0;
    $results['live_ai_test']['result']     = $aiRes['result'] ?? null;

    if (!$aiRes['ok']) {
        $results['live_ai_test']['error'] = $aiRes['error'] ?? 'Unknown error';
        $results['live_ai_test']['code']  = $aiRes['code'] ?? 'ERROR';
    }
}

// Determine Overall Status
if ($results['live_ai_test']['ok']) {
    $results['overall_status'] = 'READY_AND_WORKING';
} elseif (!$hasAnyKey) {
    $results['overall_status'] = 'MISSING_API_KEY_IN_ENV';
} elseif ($results['live_ai_test']['attempted'] && !$results['live_ai_test']['ok']) {
    $results['overall_status'] = 'AI_CALL_FAILED: ' . ($results['live_ai_test']['error'] ?? '');
} else {
    $results['overall_status'] = 'PENDING';
}

// ── Output Handlers ──────────────────────────────────────────────────────────
if ($wantsJson && !$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($isCli) {
    echo "=========================================================\n";
    echo " NMU TRAINING CENTER — AI ENGINE DIAGNOSTICS\n";
    echo "=========================================================\n";
    echo "Status:       " . $results['overall_status'] . "\n";
    echo "PHP Version:  " . $results['environment']['php_version'] . "\n";
    echo "cURL:         " . ($results['environment']['curl'] ? "✓ YES" : "✗ NO") . "\n";
    echo "OpenSSL:      " . ($results['environment']['openssl'] ? "✓ YES" : "✗ NO") . "\n";
    echo ".env Found:   " . ($results['env_found'] ? "✓ YES ({$results['env_found']})" : "✗ NO") . "\n";
    echo "DB Connected: " . ($results['database']['connected'] ? "✓ YES" : "✗ NO") . "\n";
    echo "\nDetected Keys:\n";
    foreach ($results['detected_keys'] as $k => $v) {
        if ($v['status'] === 'SET') {
            echo "  ✓ $k = {$v['masked']}\n";
        }
    }
    if (!$hasAnyKey) {
        echo "  ○ No AI API keys detected in .env!\n";
    }

    echo "\nEndpoint Reachability:\n";
    foreach ($results['endpoints_ping'] as $name => $p) {
        $status = $p['reachable'] ? "✓ OK (HTTP {$p['http_code']})" : "✗ FAILED ({$p['error']})";
        echo "  - $name: $status\n";
    }

    if ($results['live_ai_test']['attempted']) {
        echo "\nLive AI Test:\n";
        if ($results['live_ai_test']['ok']) {
            echo "  ✓ SUCCESS ({$results['live_ai_test']['latency_ms']} ms, {$results['live_ai_test']['tokens']} tokens)\n";
        } else {
            echo "  ✗ FAILED: [{$results['live_ai_test']['code']}] {$results['live_ai_test']['error']}\n";
        }
    }
    echo "=========================================================\n";
    exit;
}

// ── HTML Dashboard Output for Browser ────────────────────────────────────────
$statusColor = ($results['overall_status'] === 'READY_AND_WORKING') ? '#238636' : (($hasAnyKey) ? '#da3633' : '#d29922');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Engine Diagnostics — ERTH Training Center</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 30px 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #30363d; }
        .title { font-size: 22px; font-weight: 700; color: #f0f6fc; margin: 0; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; background: <?= $statusColor ?>; color: #fff; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .card h3 { margin-top: 0; font-size: 16px; color: #58a6ff; border-bottom: 1px solid #21262d; padding-bottom: 8px; margin-bottom: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .item { background: #0d1117; border: 1px solid #21262d; padding: 10px 14px; border-radius: 6px; }
        .item .label { font-size: 12px; color: #8b949e; margin-bottom: 4px; }
        .item .value { font-size: 14px; font-weight: 600; color: #f0f6fc; }
        .tag-yes { color: #3fb950; font-weight: bold; }
        .tag-no { color: #f85149; font-weight: bold; }
        .key-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #21262d; font-family: monospace; }
        .key-row:last-child { border-bottom: none; }
        .json-box { background: #0d1117; border: 1px solid #30363d; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #e6edf3; overflow-x: auto; max-height: 250px; }
        .btn { display: inline-block; background: #238636; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 10px; }
        .btn:hover { background: #2ea043; }
        .btn-json { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; }
        .btn-json:hover { background: #30363d; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div>
            <h1 class="title">🤖 AI Engine Diagnostics</h1>
            <div style="font-size: 12px; color: #8b949e; margin-top: 4px;">Hostinger & Production Health Monitor</div>
        </div>
        <div>
            <span class="status-badge"><?= htmlspecialchars($results['overall_status']) ?></span>
        </div>
    </div>

    <!-- 1. Environment -->
    <div class="card">
        <h3>1. Server & PHP Environment</h3>
        <div class="grid">
            <div class="item"><div class="label">PHP Version</div><div class="value"><?= PHP_VERSION ?></div></div>
            <div class="item"><div class="label">cURL Extension</div><div class="value"><?= $results['environment']['curl'] ? '<span class="tag-yes">✓ Enabled</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">OpenSSL Extension</div><div class="value"><?= $results['environment']['openssl'] ? '<span class="tag-yes">✓ Enabled</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">JSON Extension</div><div class="value"><?= $results['environment']['json'] ? '<span class="tag-yes">✓ Enabled</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">MySQL PDO</div><div class="value"><?= $results['environment']['pdo_mysql'] ? '<span class="tag-yes">✓ Enabled</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">.env File</div><div class="value"><?= $results['env_found'] ? '<span class="tag-yes">✓ Loaded</span>' : '<span class="tag-no">✗ Not Found</span>' ?></div></div>
        </div>
    </div>

    <!-- 2. Detected API Keys -->
    <div class="card">
        <h3>2. Detected AI Keys in Environment</h3>
        <?php if (!$hasAnyKey): ?>
            <div style="padding: 14px; background: rgba(218,54,51,0.15); border: 1px solid #da3633; border-radius: 6px; color: #f85149; font-size: 14px;">
                <strong>⚠️ No AI Key Detected!</strong><br>
                Please add your API key to your <code>.env</code> file in Hostinger <code>public_html/.env</code>:<br>
                <code style="display:block; background:#0d1117; padding:8px; margin-top:8px; border-radius:4px; color:#58a6ff;">GROQ_API_KEY=gsk_your_groq_api_key_here</code>
            </div>
        <?php else: ?>
            <?php foreach ($results['detected_keys'] as $k => $v): ?>
                <?php if ($v['status'] === 'SET'): ?>
                    <div class="key-row">
                        <span style="color: #7ee787;">✓ <?= htmlspecialchars($k) ?></span>
                        <span style="color: #8b949e;"><?= htmlspecialchars($v['masked']) ?> (len: <?= $v['length'] ?>)</span>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <!-- 3. Database Status -->
    <div class="card">
        <h3>3. Database AI Tables Status</h3>
        <div class="grid">
            <div class="item"><div class="label">Database Connection</div><div class="value"><?= $results['database']['connected'] ? '<span class="tag-yes">✓ Connected</span>' : '<span class="tag-no">✗ Failed</span>' ?></div></div>
            <div class="item"><div class="label">Keys Table</div><div class="value"><?= (!empty($results['database']['tables']['ai_provider_keys']['exists'])) ? '<span class="tag-yes">✓ Exists (' . $results['database']['keys_rows'] . ' rows)</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">Cache Table</div><div class="value"><?= (!empty($results['database']['tables']['ai_cache']['exists'])) ? '<span class="tag-yes">✓ Exists</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
            <div class="item"><div class="label">User Usage Table</div><div class="value"><?= (!empty($results['database']['tables']['ai_user_usage']['exists'])) ? '<span class="tag-yes">✓ Exists</span>' : '<span class="tag-no">✗ Missing</span>' ?></div></div>
        </div>
    </div>

    <!-- 4. Provider Reachability -->
    <div class="card">
        <h3>4. Outbound HTTPS Connectivity</h3>
        <div class="grid">
            <?php foreach ($results['endpoints_ping'] as $name => $p): ?>
                <div class="item">
                    <div class="label"><?= htmlspecialchars($name) ?></div>
                    <div class="value">
                        <?php if ($p['reachable']): ?>
                            <span class="tag-yes">✓ HTTP <?= $p['http_code'] ?><?= $p['ssl_fallback'] ? ' (SSL fallback)' : '' ?></span>
                        <?php else: ?>
                            <span class="tag-no">✗ Error (<?= htmlspecialchars($p['error'] ?? 'Unreachable') ?>)</span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- 5. Live AI Ping Test -->
    <div class="card">
        <h3>5. Live AI Engine Test Call</h3>
        <?php if (!$results['live_ai_test']['attempted']): ?>
            <p style="color: #8b949e;">Test skipped because no API key is set in <code>.env</code>.</p>
        <?php elseif ($results['live_ai_test']['ok']): ?>
            <div style="padding: 14px; background: rgba(35,134,54,0.15); border: 1px solid #238636; border-radius: 6px; margin-bottom: 12px;">
                <strong style="color: #3fb950;">🎉 AI Request Succeeded!</strong><br>
                <span style="font-size: 13px; color: #8b949e;">Latency: <?= $results['live_ai_test']['latency_ms'] ?> ms | Tokens: <?= $results['live_ai_test']['tokens'] ?></span>
            </div>
            <div class="json-box">
                <?= htmlspecialchars(json_encode($results['live_ai_test']['result'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) ?>
            </div>
        <?php else: ?>
            <div style="padding: 14px; background: rgba(218,54,51,0.15); border: 1px solid #da3633; border-radius: 6px; color: #f85149; margin-bottom: 12px;">
                <strong>❌ Live AI Test Failed</strong><br>
                <strong>Code:</strong> <?= htmlspecialchars($results['live_ai_test']['code'] ?? '') ?><br>
                <strong>Error:</strong> <?= htmlspecialchars($results['live_ai_test']['error'] ?? '') ?>
            </div>
        <?php endif; ?>
    </div>

    <div style="display: flex; gap: 10px;">
        <a href="?token=erth_ai_diag_2026&r=<?= time() ?>" class="btn">🔄 Re-run Diagnostic</a>
        <a href="?token=erth_ai_diag_2026&format=json" class="btn btn-json">View Raw JSON</a>
    </div>
</div>
</body>
</html>

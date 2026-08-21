<?php
// =========================================================
// NMU TRAINING CENTER — Groq API Keys Health Check Utility
// =========================================================
// Endpoint to test and monitor all 5 Groq API keys individually.
//
// Usage:
//   Browser (HTML): https://yourdomain.com/api/ai/health_check.php?token=erth_ai_diag_2026
//   Browser (JSON): https://yourdomain.com/api/ai/health_check.php?token=erth_ai_diag_2026&format=json
//   CLI:            php api/ai/health_check.php
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
            'message' => 'Unauthorized. Please append ?token=erth_ai_diag_2026 to the URL or log in first.',
            'url'     => (isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '') . '?token=erth_ai_diag_2026',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    } else {
        http_response_code(401);
        echo '<!DOCTYPE html><html><head><title>Groq Health Check — Unauthorized</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0b0f19;color:#e2e8f0;padding:40px;text-align:center;}a{color:#38bdf8;text-decoration:none;font-weight:700;}a:hover{text-decoration:underline;}.box{max-width:480px;margin:60px auto;background:#111827;border:1px solid #1f2937;padding:32px;border-radius:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}</style></head><body><div class="box"><h2 style="margin-top:0;color:#f87171;">🔒 Access Restricted</h2><p style="color:#9ca3af;font-size:0.95rem;">Please use the secure diagnostic access token below:</p><p style="margin-top:20px;"><a href="?token=erth_ai_diag_2026">👉 Open Groq API Health Check</a></p></div></body></html>';
    }
    exit;
}

// ── Retrieve and Test All Keys ────────────────────────────────────────────────
$availableKeys = _getAllAvailableGroqKeys();
$keyResults = [];
$activeCount = 0;
$rateLimitedCount = 0;
$failedCount = 0;
$totalLatency = 0;
$primaryActiveKey = null;

foreach ($availableKeys as $index => $keyRow) {
    $secret = $keyRow['secret'] ?? '';
    $label  = $keyRow['key_label'] ?? ('Key ' . ($index + 1));
    $source = $keyRow['source'] ?? $keyRow['env_var_name'] ?? 'ENV';
    $model  = $keyRow['model'] ?? 'openai/gpt-oss-120b';

    $maskedSecret = 'gsk_' . str_repeat('•', 12) . substr($secret, -4);
    if (strlen($secret) > 12) {
        $maskedSecret = substr($secret, 0, 8) . str_repeat('•', 10) . substr($secret, -4);
    }

    $t0 = microtime(true);
    $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $secret,
        ],
        CURLOPT_POSTFIELDS     => json_encode([
            'model'       => $model,
            'messages'    => [
                ['role' => 'user', 'content' => 'Respond with the single word: OK']
            ],
            'max_tokens'  => 5,
            'temperature' => 0.1,
        ]),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ]);

    $rawResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($ch);
    $elapsedMs   = round((microtime(true) - $t0) * 1000, 2);
    curl_close($ch);

    $status       = 'FAILED';
    $statusText   = 'Failed';
    $details      = '';
    $isHealthy    = false;

    if ($curlError) {
        $status     = 'NETWORK_ERROR';
        $statusText = 'Network Error';
        $details    = 'cURL: ' . $curlError;
        $failedCount++;
    } elseif ($httpCode === 200) {
        $decoded = json_decode($rawResponse, true);
        $content = trim($decoded['choices'][0]['message']['content'] ?? ($decoded['choices'][0]['message']['reasoning'] ?? 'OK'));
        $status     = 'ACTIVE';
        $statusText = 'Active (200 OK)';
        $details    = 'Response: "' . substr($content, 0, 40) . '"';
        $isHealthy  = true;
        $activeCount++;
        $totalLatency += $elapsedMs;

        if ($primaryActiveKey === null) {
            $primaryActiveKey = $label;
        }
    } elseif ($httpCode === 429) {
        $decoded = json_decode($rawResponse, true);
        $status     = 'RATE_LIMITED';
        $statusText = 'Rate Limited (429)';
        $details    = $decoded['error']['message'] ?? 'Quota / Rate limit exceeded';
        $rateLimitedCount++;
    } elseif ($httpCode === 401 || $httpCode === 403) {
        $decoded = json_decode($rawResponse, true);
        $status     = 'AUTH_ERROR';
        $statusText = 'Invalid Key (401/403)';
        $details    = $decoded['error']['message'] ?? 'API key was rejected';
        $failedCount++;
    } elseif ($httpCode >= 500) {
        $decoded = json_decode($rawResponse, true);
        $status     = 'SERVICE_ERROR';
        $statusText = 'Service Error (' . $httpCode . ')';
        $details    = $decoded['error']['message'] ?? 'Groq service error';
        $failedCount++;
    } else {
        $decoded = json_decode($rawResponse, true);
        $status     = 'HTTP_' . $httpCode;
        $statusText = 'HTTP ' . $httpCode;
        $details    = $decoded['error']['message'] ?? ('HTTP ' . $httpCode . ' response');
        $failedCount++;
    }

    $keyResults[] = [
        'index'         => $index + 1,
        'label'         => $label,
        'source'        => $source,
        'masked_key'    => $maskedSecret,
        'model'         => $model,
        'status'        => $status,
        'status_text'   => $statusText,
        'is_healthy'    => $isHealthy,
        'http_code'     => $httpCode,
        'latency_ms'    => $elapsedMs,
        'details'       => $details,
    ];
}

$totalKeys = count($keyResults);
$avgLatency = $activeCount > 0 ? round($totalLatency / $activeCount, 1) : 0;
$systemStatus = ($activeCount === $totalKeys && $totalKeys > 0) ? 'FULLY_OPERATIONAL'
    : ($activeCount > 0 ? 'DEGRADED_ROTATION_ACTIVE' : 'ALL_KEYS_OFFLINE');

$responsePayload = [
    'timestamp'          => gmdate('Y-m-d H:i:s') . ' UTC',
    'system_status'      => $systemStatus,
    'rotation_ready'     => ($activeCount > 0),
    'primary_active_key' => $primaryActiveKey ?: 'None (All failed)',
    'summary'            => [
        'total_keys'          => $totalKeys,
        'active_keys'         => $activeCount,
        'rate_limited_keys'   => $rateLimitedCount,
        'failed_keys'         => $failedCount,
        'avg_latency_ms'      => $avgLatency,
    ],
    'keys'               => $keyResults,
];

// ── JSON Output ──────────────────────────────────────────────────────────────
if ($wantsJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($responsePayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// ── HTML Dashboard Output ────────────────────────────────────────────────────
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Groq API Keys Health Check & Rotation Status — ERTH Training</title>
    <style>
        :root {
            --bg-body: #0a0e17;
            --bg-card: #111827;
            --bg-card-alt: #1a2234;
            --border: #1f293d;
            --border-highlight: #2e3d5b;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
            --accent-blue: #38bdf8;
            --accent-green: #10b981;
            --accent-yellow: #f59e0b;
            --accent-red: #ef4444;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            font-family: var(--font-family);
            line-height: 1.5;
            padding: 30px 20px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .header-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }

        .header-title h1 {
            font-size: 1.55rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-title p {
            font-size: 0.88rem;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .header-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            border: 1px solid transparent;
        }

        .btn-primary {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #fff;
        }
        .btn-primary:hover {
            opacity: 0.92;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: var(--bg-card-alt);
            color: var(--text-main);
            border-color: var(--border);
        }
        .btn-secondary:hover {
            background: #243048;
        }

        /* KPI Cards Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px 20px;
            position: relative;
            overflow: hidden;
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--accent-blue);
        }

        .kpi-card.green::before { background: var(--accent-green); }
        .kpi-card.yellow::before { background: var(--accent-yellow); }
        .kpi-card.red::before { background: var(--accent-red); }

        .kpi-label {
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            margin-bottom: 6px;
        }

        .kpi-value {
            font-size: 1.7rem;
            font-weight: 900;
            color: #fff;
        }

        .kpi-subtext {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 4px;
        }

        /* Status Banner */
        .status-banner {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 800;
        }

        .badge-active { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            background: currentColor;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }

        /* Keys Table */
        .table-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            margin-bottom: 25px;
        }

        .table-header {
            padding: 16px 20px;
            background: var(--bg-card-alt);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .table-header h3 {
            font-size: 0.98rem;
            font-weight: 800;
            color: #fff;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.88rem;
        }

        th {
            background: rgba(0,0,0,0.15);
            color: var(--text-muted);
            font-weight: 700;
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 18px;
            border-bottom: 1px solid var(--border);
        }

        td {
            padding: 14px 18px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255,255,255,0.015);
        }

        .key-tag {
            font-family: monospace;
            font-size: 0.82rem;
            background: #0d1117;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid #30363d;
            color: #58a6ff;
        }

        .model-tag {
            font-size: 0.75rem;
            color: #a78bfa;
            background: rgba(167, 139, 250, 0.1);
            padding: 2px 7px;
            border-radius: 5px;
        }

        .info-box {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 18px 20px;
            font-size: 0.84rem;
            color: var(--text-muted);
            line-height: 1.6;
        }

        .info-box strong {
            color: #fff;
        }

        code {
            background: #0d1117;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            color: #38bdf8;
            font-size: 0.82rem;
        }
    </style>
</head>
<body>

<div class="container">
    <!-- Header -->
    <div class="header-section">
        <div class="header-title">
            <h1>⚡ Groq API Keys Health Check & Rotation Status</h1>
            <p>Monitors all 5 Groq keys individually, verifies latency, and displays current rotation order.</p>
        </div>
        <div class="header-actions">
            <a href="?token=<?= htmlspecialchars($token) ?>" class="btn btn-primary">🔄 Re-Test All Keys</a>
            <a href="?token=<?= htmlspecialchars($token) ?>&format=json" target="_blank" class="btn btn-secondary">{ } Raw JSON</a>
            <a href="diagnose.php?token=<?= htmlspecialchars($token) ?>" class="btn btn-secondary">🔍 Full Diagnostics</a>
        </div>
    </div>

    <!-- Status Banner -->
    <div class="status-banner">
        <div>
            <span style="font-size:0.8rem; color:var(--text-muted);">Current Rotation State:</span>
            <div style="font-size:1.05rem; font-weight:800; color:#fff; margin-top:2px;">
                Primary Key in Service: <span style="color:var(--accent-blue);"><?= htmlspecialchars($primaryActiveKey ?: 'None') ?></span>
            </div>
        </div>
        <div>
            <?php if ($systemStatus === 'FULLY_OPERATIONAL'): ?>
                <span class="status-badge badge-active"><span class="pulse-dot"></span> 100% Operational (<?= $activeCount ?>/<?= $totalKeys ?> Keys Active)</span>
            <?php elseif ($systemStatus === 'DEGRADED_ROTATION_ACTIVE'): ?>
                <span class="status-badge badge-warning"><span class="pulse-dot"></span> Failover Active (<?= $activeCount ?>/<?= $totalKeys ?> Keys Healthy)</span>
            <?php else: ?>
                <span class="status-badge badge-danger"><span class="pulse-dot"></span> All Keys Offline (0/<?= $totalKeys ?>)</span>
            <?php endif; ?>
        </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
        <div class="kpi-card green">
            <div class="kpi-label">Active & Healthy</div>
            <div class="kpi-value" style="color:#34d399;"><?= $activeCount ?> <span style="font-size:1rem; font-weight:500; color:var(--text-muted);">/ <?= $totalKeys ?></span></div>
            <div class="kpi-subtext">Ready to handle immediate requests</div>
        </div>

        <div class="kpi-card yellow">
            <div class="kpi-label">Rate Limited</div>
            <div class="kpi-value" style="color:#fbbf24;"><?= $rateLimitedCount ?></div>
            <div class="kpi-subtext">HTTP 429 quota exhaustion</div>
        </div>

        <div class="kpi-card red">
            <div class="kpi-label">Failed / Offline</div>
            <div class="kpi-value" style="color:#f87171;"><?= $failedCount ?></div>
            <div class="kpi-subtext">Auth errors or service offline</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">Average Latency</div>
            <div class="kpi-value"><?= $avgLatency ?> <span style="font-size:1rem; font-weight:500; color:var(--text-muted);">ms</span></div>
            <div class="kpi-subtext">Ping completion round-trip time</div>
        </div>
    </div>

    <!-- Table of Tested Keys -->
    <div class="table-card">
        <div class="table-header">
            <h3>Individual Key Diagnostics (5-Key Failover Pool)</h3>
            <span style="font-size:0.78rem; color:var(--text-muted);">Tested at <?= gmdate('H:i:s') ?> UTC</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Key Identifier</th>
                    <th>Masked Secret</th>
                    <th>Model</th>
                    <th>Health Status</th>
                    <th>Latency</th>
                    <th>Test Details</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($keyResults as $k): ?>
                <tr>
                    <td style="font-weight:700; color:var(--text-muted);"><?= $k['index'] ?></td>
                    <td>
                        <strong style="color:#fff;"><?= htmlspecialchars($k['label']) ?></strong>
                        <?php if ($primaryActiveKey === $k['label']): ?>
                            <span style="font-size:0.7rem; font-weight:800; background:#0284c7; color:#fff; padding:1px 6px; border-radius:4px; margin-left:4px;">1ST IN LINE</span>
                        <?php endif; ?>
                    </td>
                    <td><span class="key-tag"><?= htmlspecialchars($k['masked_key']) ?></span></td>
                    <td><span class="model-tag"><?= htmlspecialchars($k['model']) ?></span></td>
                    <td>
                        <?php if ($k['status'] === 'ACTIVE'): ?>
                            <span class="status-badge badge-active"><span class="pulse-dot"></span> Active (200 OK)</span>
                        <?php elseif ($k['status'] === 'RATE_LIMITED'): ?>
                            <span class="status-badge badge-warning">Rate Limited (429)</span>
                        <?php else: ?>
                            <span class="status-badge badge-danger"><?= htmlspecialchars($k['status_text']) ?></span>
                        <?php endif; ?>
                    </td>
                    <td style="font-family:monospace;"><?= $k['latency_ms'] ?> ms</td>
                    <td style="color:var(--text-muted); font-size:0.8rem; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="<?= htmlspecialchars($k['details']) ?>">
                        <?= htmlspecialchars($k['details']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Info Box -->
    <div class="info-box">
        <strong>How the Automatic 5-Key Rotation Engine Works:</strong><br>
        1. When any AI request is submitted (e.g. <em>Create My Own Idea</em>, <em>Wording Assistant</em>, <em>Custom Proposal Generation</em>), the engine attempts <strong>Key 1</strong> first.<br>
        2. If <strong>Key 1</strong> returns a rate limit (HTTP 429), quota issue, or service error, the engine <strong>silently and automatically shifts to Key 2</strong> within milliseconds.<br>
        3. The process continues through Key 3, Key 4, and Key 5 until a valid response is generated. The user only receives an error if all 5 keys are simultaneously exhausted.
    </div>
</div>

</body>
</html>

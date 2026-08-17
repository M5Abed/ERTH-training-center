<?php
// =========================================================
// NMU TRAINING — Centralized AI Engine
// =========================================================
// callAI(int $userId, string $taskType, array $payload): array
//
// This is the ONLY function in the codebase allowed to make
// HTTP requests to an AI provider.
//
// Flow:
//   1. Check daily user token quota
//   2. Cache lookup (sha256 of taskType + payload)
//   3. Pick the best active provider key (lowest used_today_tokens)
//   4. Read secret from env var — never from the DB directly
//   5. Call provider endpoint (up to 3 key-rotation attempts)
//   6. On success: cache result, increment usage counters
//   7. Return structured result object
// =========================================================

if (!function_exists('db')) {
    require_once __DIR__ . '/../config.php';
}

// ── Daily quota (tokens per user per UTC day) ───────────────────────────────
if (!defined('AI_DAILY_USER_TOKEN_LIMIT')) {
    define('AI_DAILY_USER_TOKEN_LIMIT', (int)(getenv('AI_DAILY_USER_TOKEN_LIMIT') ?: 100000));
}

// ── Task-type prompt definitions ────────────────────────────────────────────
// Each entry: [system, userTemplate, temperature, maxTokens]
// Placeholders in userTemplate are replaced from $payload keys: {key}
// ─────────────────────────────────────────────────────────────────────────────
const TASK_PROMPTS = [

    // 6.1 — Expand / rewrite a draft project description
    'expand' => [
        'system'       => 'You are an expert project description writer for university students. '
            . 'Rewrite the given draft into 2 professional paragraphs. '
            . 'CRITICAL RULES: '
            . '1) Use ONLY the topics, technologies, and goals the student mentioned. '
            . '2) Do NOT force or suggest specific frameworks, libraries, or implementation methods the student did not mention. '
            . '   If they said "website" do NOT add "using React and Node.js". '
            . '   If they said "mobile app" do NOT add "using Flutter". '
            . '3) Do NOT invent new features. '
            . '4) Keep the same scope and intent. '
            . '5) Output ONLY the 2 paragraphs, nothing else.',
        'userTemplate' => 'Project description draft: {draft}',
        'temperature'  => 0.7,
        'maxTokens'    => 800,
    ],

    // 6.2 — Extract required skill IDs from a project description
    'skills' => [
        'system'       => 'You are a skill extraction engine for a university project matching platform.

Your job: Read the project description carefully, understand what the project actually needs, then select ONLY the relevant skill IDs from the catalog below.

SKILL CATALOG (id => name):
python => Python, javascript => JavaScript, java => Java, cpp => C++, csharp => C#,
r_lang => R, matlab => MATLAB, sql => SQL, typescript => TypeScript, go => Go,
php => PHP, swift => Swift, kotlin => Kotlin, html_css => HTML/CSS,
react => React, vuejs => Vue.js, angular => Angular, nodejs => Node.js,
django => Django, flask => Flask, rest_api => REST APIs, graphql => GraphQL,
nextjs => Next.js, ml => Machine Learning, deep_learning => Deep Learning,
nlp => NLP, cv => Computer Vision, data_mining => Data Mining, big_data => Big Data,
tensorflow => TensorFlow, pytorch => PyTorch, sklearn => Scikit-learn,
data_analysis => Data Analysis, acad_writing => Academic Writing,
lit_review => Literature Review, data_collect => Data Collection,
stat_analysis => Statistical Analysis, res_method => Research Methodology,
latex => LaTeX, spss => SPSS, ui_ux => UI/UX Design, figma => Figma,
graphic => Graphic Design, prototype => Prototyping, user_res => User Research,
leadership => Leadership, comm => Communication, prob_solving => Problem Solving,
teamwork => Teamwork, time_mgmt => Time Management, crit_think => Critical Thinking,
presentation => Presentation, mysql => MySQL, postgres => PostgreSQL, mongodb => MongoDB,
oracle => Oracle, sqlserver => SQL Server, redis => Redis, git => Git, docker => Docker,
aws => AWS, azure => Azure, linux => Linux, cicd => CI/CD, kubernetes => Kubernetes,
android => Android Development, ios => iOS Development, flutter => Flutter,
react_native => React Native, cybersec => Cybersecurity, net_sec => Network Security,
pen_test => Penetration Testing, crypto => Cryptography, bioinf => Bioinformatics,
med_imaging => Medical Imaging, clin_data => Clinical Data, genomics => Genomics,
biostat => Biostatistics, statistics => Statistics, lin_alg => Linear Algebra,
calculus => Calculus, probability => Probability, num_methods => Numerical Methods,
discrete => Discrete Math

STRICT RULES:
1. READ the project description THOROUGHLY before picking skills.
2. ONLY pick skills that are DIRECTLY needed based on what the description says.
3. If the description says "website" or "web app" => html_css + a relevant framework + backend.
4. If "mobile app" => android or ios or flutter or react_native.
5. If "machine learning" or "AI model" => ml + python + relevant libs.
6. Do NOT add skills the project does NOT need. Do NOT guess or pad the list.
7. Pick 3-7 skills maximum, only the most relevant ones.
8. Output ONLY the skill IDs separated by commas. Example: python,react,nodejs,mysql
9. NO explanations, NO names, NO extra text. JUST comma-separated IDs.',
        'userTemplate' => 'Project description: {description}',
        'temperature'  => 0.1,
        'maxTokens'    => 200,
    ],

    // 6.3 — Generate a full project proposal (STRICTLY English only)
    'proposal' => [
        'system'       => 'You are an expert academic project proposal writer for university training programs. '
            . 'Generate a full project proposal in JSON format based on the given keywords and domain. '
            . 'CRITICAL REQUIREMENT: The proposal MUST be generated exclusively in the ENGLISH language. NEVER generate in Arabic or any language other than English under any circumstances. If the input keywords or domain are in Arabic or another language, translate and adapt the concepts entirely into professional English. '
            . 'The JSON must have exactly these fields: '
            . 'title, description, problem_statement, tech_stack, expected_output. '
            . 'RULES: '
            . '1) All fields (title, description, problem_statement, tech_stack, expected_output) MUST be 100% in English. '
            . '2) Keep descriptions realistic and professional for a university training project. '
            . '3) tech_stack should be a comma-separated string of technologies. '
            . '4) expected_output should list 3-5 deliverables numbered in English. '
            . '5) Output ONLY valid JSON, no markdown fences, no extra text.',
        'userTemplate' => 'Keywords: {keywords}. Domain: {domain}. Language requirement: English only.',
        'temperature'  => 0.7,
        'maxTokens'    => 1200,
    ],

    // 6.3b — Generate official 7-section proposal for custom idea (Case B)
    'custom_proposal_7_sections' => [
        'system'       => 'You are an expert academic project proposal writer for university engineering training programs. '
            . 'Generate a comprehensive project proposal following the exact 7 official template sections. '
            . 'CRITICAL REQUIREMENT: Output MUST be exclusively in the ENGLISH language. '
            . 'Return a JSON object with exactly these fields: '
            . 'title (string), tech_stack (comma-separated string), abstract (string, 150-250 words), '
            . 'introduction_background (string, 2-3 paragraphs), problem_definition (string, 1-2 paragraphs), '
            . 'objectives_scope (string with clear in-scope/out-of-scope details), '
            . 'related_work (string comparing prior approaches), methodology (string describing technical approach and pipeline), '
            . 'expected_system_design (string describing system architecture and data flow). '
            . 'Output ONLY valid JSON, no markdown fences, no extra text.',
        'userTemplate' => 'Project Concept: {keywords}. Context / Student Notes: {context}. Target Track: {domain}. Language: English only.',
        'temperature'  => 0.7,
        'maxTokens'    => 2500,
    ],

    // 6.4 — Evaluate a project idea and return structured JSON scores
    'evaluate_idea' => [
        'system'       => 'You are a university project evaluation expert. '
            . 'Evaluate the given project idea and return a JSON object with exactly these fields: '
            . 'innovation_score (0-10), feasibility_score (0-10), impact_score (0-10), '
            . 'overall_score (0-10), strengths (array of 2-3 strings), '
            . 'weaknesses (array of 1-2 strings), recommendation (string, max 100 words). '
            . 'Be concise, fair, and constructive. '
            . 'Output ONLY valid JSON, no markdown fences, no extra text.',
        'userTemplate' => 'Project title: {title}. Description: {description}.',
        'temperature'  => 0.3,
        'maxTokens'    => 600,
    ],

    // 6.5 — Generate constructive feedback for a trainee submission
    'feedback' => [
        'system'       => 'You are a supportive university trainer providing constructive feedback '
            . 'on trainee project submissions. Write 2-3 paragraphs of professional, '
            . 'encouraging, and actionable feedback. Focus on: '
            . '1) What was done well. '
            . '2) Areas for improvement with specific suggestions. '
            . '3) Next steps. '
            . 'Keep the tone positive and professional. Output ONLY the feedback paragraphs.',
        'userTemplate' => 'Trainee submission: {submission}',
        'temperature'  => 0.7,
        'maxTokens'    => 800,
    ],

    // 6.6 — Generate quiz questions from course content
    'quiz_generate' => [
        'system'       => 'You are an expert quiz designer for university training courses. '
            . 'Generate multiple-choice quiz questions based on the given content. '
            . 'Return a JSON array where each item has: '
            . 'question (string), options (array of 4 strings), correct_index (0-3), explanation (string). '
            . 'RULES: '
            . '1) Questions must be directly based on the provided content. '
            . '2) Options must be plausible but only one correct. '
            . '3) Explanations must be brief (1-2 sentences). '
            . '4) Output ONLY valid JSON array, no markdown fences.',
        'userTemplate' => 'Number of questions: {count}. Course content: {content}.',
        'temperature'  => 0.4,
        'maxTokens'    => 2000,
    ],

    // 6.7 — Summarize course content into key takeaways
    'summarize' => [
        'system'       => 'You are an academic content summarizer. '
            . 'Create a concise, well-structured summary of the given course material. '
            . 'Format as: one overview paragraph, then a bullet list of 5-8 key takeaways. '
            . 'Keep language clear and suitable for university students. '
            . 'Output ONLY the summary, no extra text.',
        'userTemplate' => 'Course content to summarize: {content}.',
        'temperature'  => 0.4,
        'maxTokens'    => 800,
    ],

    // 6.8 — Match a trainee profile to suitable projects
    'match_projects' => [
        'system'       => 'You are a university project matching assistant. '
            . 'Given a trainee\'s skills and interests, analyze the provided project list '
            . 'and return a JSON array of the top matching project IDs, ordered by best fit first. '
            . 'Each item: { project_id: int, match_score: 0-100, reason: string (max 30 words) }. '
            . 'Return at most 5 matches. '
            . 'Output ONLY valid JSON array, no markdown fences.',
        'userTemplate' => 'Trainee skills: {skills}. Interests: {interests}. Projects: {projects}.',
        'temperature'  => 0.2,
        'maxTokens'    => 800,
    ],

    // 6.9 — Automated Project Report Generation (Section Writer)
    'report_section_writer' => [
        'system'       => 'You are an academic ghostwriter for university engineering students. '
            . 'Your task is to transform raw student notes, bullet points, or Q&A answers '
            . 'into formal, professional, third-person academic text for a specific section of a project report. '
            . 'RULES: '
            . '1) Use formal academic tone (e.g., "The system was designed...", not "We made..."). '
            . '2) Adhere strictly to the section guidelines provided. '
            . '3) Do not invent technical features or data not present in the raw input. '
            . '4) Output ONLY the final text. Do not include markdown headings, greetings, or explanations. '
            . '5) Format output in clean paragraphs.',
        'userTemplate' => 'Section: {section_title}\nSection Guidelines: {guidelines}\nRaw Student Input: {raw_input}',
        'temperature'  => 0.4,
        'maxTokens'    => 1500,
    ],

    // 6.10 — Complete 30-Page Template Fill — Batch A (13 sections: pages 03–16)
    'fill_proposal_a' => [
        'system'       => 'You are a senior AI professor writing an undergraduate field training project report at New Mansoura University. '
            . 'CRITICAL: Output ONLY raw JSON — no markdown, no backticks, no explanation before or after. '
            . 'The JSON object must have EXACTLY these 13 string keys tailored to the project (values are detailed academic paragraphs or formatted tables): '
            . 'declaration, acknowledgment, abstract, figures_tables, abbreviations, introduction_background, '
            . 'technical_background, objectives_scope, related_work, comparative_analysis, design_gap, problem_definition, requirements. '
            . 'Start your response with { and end with }. No other characters outside the JSON object.',
        'userTemplate' => "Project Title: {title}\nTrack: {domain}\nDescription: {description}\nTech Stack: {tech_stack}\nProblem: {problem_statement}\nExpected Output: {expected_output}\nCourse: {course_name}\n\nWrite all 13 sections now as a JSON object:",
        'temperature'  => 0.45,
        'maxTokens'    => 3500,
    ],

    // 6.11 — Complete 30-Page Template Fill — Batch B (14 sections: pages 17–30)
    'fill_proposal_b' => [
        'system'       => 'You are a senior AI professor writing an undergraduate field training project report at New Mansoura University. '
            . 'CRITICAL: Output ONLY raw JSON — no markdown, no backticks, no explanation before or after. '
            . 'The JSON object must have EXACTLY these 14 string keys tailored to the project (values are detailed academic paragraphs, test suites, or tables): '
            . 'project_plan, methodology, platform_description, expected_system_design, algorithm_workflow, implementation, '
            . 'programming, application_scenario, test_plan, results, discussion, conclusion, references, appendices. '
            . 'Start your response with { and end with }. No other characters outside the JSON object.',
        'userTemplate' => "Project Title: {title}\nTrack: {domain}\nDescription: {description}\nTech Stack: {tech_stack}\nProblem: {problem_statement}\nExpected Output: {expected_output}\nCourse: {course_name}\n\nWrite all 14 sections now as a JSON object:",
        'temperature'  => 0.45,
        'maxTokens'    => 3500,
    ],
];

// ── Provider URL map ─────────────────────────────────────────────────────────
const PROVIDER_URLS = [
    'groq'        => 'https://api.groq.com/openai/v1/chat/completions',
    'gemini'      => 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    'openrouter'  => 'https://openrouter.ai/api/v1/chat/completions',
];

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * callAI — centralized AI request handler.
 *
 * @param  int    $userId   Authenticated user's ID (for quota tracking)
 * @param  string $taskType One of the TASK_PROMPTS keys (expand, skills, proposal, …)
 * @param  array  $payload  Key-value data interpolated into the userTemplate
 * @return array  On success: ['ok' => true, 'result' => <string|array>, 'cached' => bool, 'tokens' => int]
 *                On error:   ['ok' => false, 'error' => string, 'code' => string]
 */
function callAI(int $userId, string $taskType, array $payload): array
{
    // ── 0. Validate task type ────────────────────────────────────────────────
    if (!isset(TASK_PROMPTS[$taskType])) {
        return _aiError("Unknown task type: '$taskType'", 'INVALID_TASK');
    }

    // ── 1. Daily user quota check ────────────────────────────────────────────
    $quotaCheck = _checkUserQuota($userId);
    if ($quotaCheck !== null) {
        return $quotaCheck;   // ['ok'=>false,'error'=>'Daily limit reached...','code'=>'DAILY_LIMIT']
    }

    // ── 2. Cache lookup ──────────────────────────────────────────────────────
    $cacheKey = hash('sha256', $taskType . json_encode($payload, JSON_UNESCAPED_UNICODE));
    $cached   = _cacheGet($cacheKey);
    if ($cached !== null) {
        return ['ok' => true, 'result' => $cached, 'cached' => true, 'tokens' => 0];
    }

    // ── 3. Build prompt messages ─────────────────────────────────────────────
    $taskDef     = TASK_PROMPTS[$taskType];
    $userContent = _interpolate($taskDef['userTemplate'], $payload);
    $messages    = [
        ['role' => 'system', 'content' => $taskDef['system']],
        ['role' => 'user',   'content' => $userContent],
    ];

    // ── 4. Pick active key(s) and call provider — up to 3 rotation attempts ─
    $maxAttempts = 3;
    $lastError   = 'No active AI provider keys found';
    $lastCode    = 'NO_KEYS';

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $keyRow = _pickKey();
        if ($keyRow === null) {
            break;  // No active keys left at all
        }

        $secret = _readSecret($keyRow['env_var_name']);
        if (!$secret) {
            // Key is registered but env var is missing/empty — disable it
            _disableKey($keyRow['id'], 'env_var_missing');
            continue;
        }

        // ── 5. HTTP request ──────────────────────────────────────────────────
        $response = _callProvider(
            url:         $keyRow['api_url'],
            apiKey:      $secret,
            model:       $keyRow['model'],
            messages:    $messages,
            temperature: (float)$taskDef['temperature'],
            maxTokens:   (int)$taskDef['maxTokens']
        );

        if ($response['ok']) {
            // ── 6. Success: cache + update counters ──────────────────────────
            $tokenCount = $response['tokens'];
            $rawResult  = $response['content'];

            _cacheSet($cacheKey, $taskType, $rawResult);
            _incrementKeyTokens($keyRow['id'], $tokenCount);
            _incrementUserUsage($userId, $tokenCount);

            // Parse JSON task types automatically with markdown cleanup
            $parsedResult = $rawResult;
            if (in_array($taskType, ['proposal', 'custom_proposal_7_sections', 'evaluate_idea', 'quiz_generate', 'match_projects', 'fill_proposal_pages', 'fill_proposal_a', 'fill_proposal_b'], true)) {
                $cleanText = trim($rawResult);
                if (preg_match('/^```(?:json)?\s*([\s\S]*?)\s*```$/i', $cleanText, $matches)) {
                    $cleanText = trim($matches[1]);
                } elseif (preg_match('/\{[\s\S]*\}/', $cleanText, $matches)) {
                    $cleanText = trim($matches[0]);
                }
                $decoded = json_decode($cleanText, true);
                if (json_last_error() === JSON_ERROR_NONE && (is_array($decoded) || is_object($decoded))) {
                    $parsedResult = $decoded;
                }
            }

            return ['ok' => true, 'result' => $parsedResult, 'cached' => false, 'tokens' => $tokenCount];
        }

        // ── Handle provider errors ───────────────────────────────────────────
        $lastError = $response['error'];
        $lastCode  = $response['code'];

        if ($response['code'] === 'RATE_LIMITED') {
            // Disable this key for the rest of the day and try the next
            _disableKey($keyRow['id'], 'rate_limited');
            continue;
        }

        // For other errors (auth failure, bad request) — stop rotating
        break;
    }

    return _aiError($lastError, $lastCode);
}


// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether the user has hit their daily token quota.
 * Returns null if under limit, or an error array if exceeded.
 */
function _checkUserQuota(int $userId): ?array
{
    try {
        $today = gmdate('Y-m-d');
        $stmt  = db()->prepare(
            'SELECT tokens_used FROM ai_user_usage WHERE user_id = ? AND usage_date = ?'
        );
        $stmt->execute([$userId, $today]);
        $row = $stmt->fetch();
        $used = (int)($row['tokens_used'] ?? 0);
        if ($used >= AI_DAILY_USER_TOKEN_LIMIT) {
            return _aiError('Daily AI limit reached. Your quota resets at midnight UTC.', 'DAILY_LIMIT');
        }
    } catch (\Throwable $e) {
        error_log('[callAI] quota check failed: ' . $e->getMessage());
        // Fail open — do not block the user if the usage table query fails
    }
    return null;
}

/**
 * Look up a non-expired cache entry. Returns decoded result or null on miss.
 */
function _cacheGet(string $cacheKey): mixed
{
    try {
        $stmt = db()->prepare(
            'SELECT result_json FROM ai_cache WHERE cache_key = ? AND expires_at > NOW()'
        );
        $stmt->execute([$cacheKey]);
        $row = $stmt->fetch();
        if ($row) {
            // Bump hit_count asynchronously (best-effort)
            db()->prepare('UPDATE ai_cache SET hit_count = hit_count + 1 WHERE cache_key = ?')
               ->execute([$cacheKey]);

            $decoded = json_decode($row['result_json'], true);
            return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $row['result_json'];
        }
    } catch (\Throwable $e) {
        error_log('[callAI] cache get failed: ' . $e->getMessage());
    }
    return null;
}

/**
 * Store a result in the cache with a 24-hour TTL.
 */
function _cacheSet(string $cacheKey, string $taskType, string $rawResult): void
{
    try {
        $json = json_encode($rawResult, JSON_UNESCAPED_UNICODE);  // store as JSON string
        $stmt = db()->prepare(
            'INSERT INTO ai_cache (cache_key, task_type, result_json, hit_count, expires_at)
             VALUES (?, ?, ?, 1, DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE result_json = VALUES(result_json),
                                     hit_count   = hit_count + 1,
                                     expires_at  = DATE_ADD(NOW(), INTERVAL 24 HOUR)'
        );
        $stmt->execute([$cacheKey, $taskType, $json]);
    } catch (\Throwable $e) {
        error_log('[callAI] cache set failed: ' . $e->getMessage());
    }
}

/**
 * Select the best active key: lowest used_today_tokens, ordered by priority.
 * Auto-resets a key's token count if reset_date < today (lazy reset).
 */
function _pickKey(): ?array
{
    try {
        $today = gmdate('Y-m-d');
        // Lazy daily reset: if a key's reset_date is before today, zero out its tokens
        db()->prepare(
            'UPDATE ai_provider_keys
             SET used_today_tokens = 0, is_active = 1, reset_date = ?
             WHERE reset_date < ? AND is_active = 0 AND used_today_tokens > 0'
        )->execute([$today, $today]);

        $stmt = db()->prepare(
            'SELECT * FROM ai_provider_keys
             WHERE is_active = 1
             ORDER BY priority ASC, used_today_tokens ASC
             LIMIT 1'
        );
        $stmt->execute();
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (\Throwable $e) {
        error_log('[callAI] key pick failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * Read the actual API secret from the environment — never from the DB.
 */
function _readSecret(string $envVarName): string
{
    // Check PHP constants first (loaded by config.php via parse_ini_file)
    if (defined($envVarName) && constant($envVarName) !== '') {
        return constant($envVarName);
    }
    if (getenv($envVarName)) {
        return (string)getenv($envVarName);
    }
    if (!empty($_ENV[$envVarName])) {
        return (string)$_ENV[$envVarName];
    }
    if (!empty($_SERVER[$envVarName])) {
        return (string)$_SERVER[$envVarName];
    }
    return '';
}

/**
 * Mark a key as inactive (rate-limited or env var missing).
 */
function _disableKey(int $keyId, string $reason = ''): void
{
    try {
        db()->prepare('UPDATE ai_provider_keys SET is_active = 0 WHERE id = ?')
           ->execute([$keyId]);
        error_log("[callAI] disabled key #$keyId: $reason");
    } catch (\Throwable $e) {
        error_log('[callAI] disable key failed: ' . $e->getMessage());
    }
}

/**
 * Increment a key's used_today_tokens counter.
 */
function _incrementKeyTokens(int $keyId, int $tokens): void
{
    if ($tokens <= 0) return;
    try {
        db()->prepare(
            'UPDATE ai_provider_keys SET used_today_tokens = used_today_tokens + ? WHERE id = ?'
        )->execute([$tokens, $keyId]);
    } catch (\Throwable $e) {
        error_log('[callAI] increment key tokens failed: ' . $e->getMessage());
    }
}

/**
 * Upsert the per-user daily usage counter.
 */
function _incrementUserUsage(int $userId, int $tokens): void
{
    if ($tokens <= 0) return;
    try {
        $today = gmdate('Y-m-d');
        db()->prepare(
            'INSERT INTO ai_user_usage (user_id, usage_date, tokens_used)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE tokens_used = tokens_used + ?'
        )->execute([$userId, $today, $tokens, $tokens]);
    } catch (\Throwable $e) {
        error_log('[callAI] increment user usage failed: ' . $e->getMessage());
    }
}

/**
 * Interpolate {placeholder} tokens in a template string.
 */
function _interpolate(string $template, array $values): string
{
    foreach ($values as $key => $val) {
        $template = str_replace('{' . $key . '}', (string)$val, $template);
    }
    return $template;
}

/**
 * Make the HTTP call to the provider's chat completions endpoint.
 *
 * Returns:
 *   ['ok'=>true,  'content'=>string, 'tokens'=>int]
 *   ['ok'=>false, 'error'=>string,   'code'=>string]
 */
function _callProvider(
    string $url,
    string $apiKey,
    string $model,
    array  $messages,
    float  $temperature,
    int    $maxTokens
): array {
    $body = json_encode([
        'model'       => $model,
        'messages'    => $messages,
        'max_tokens'  => $maxTokens,
        'temperature' => $temperature,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 45,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => $body,
    ]);

    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return _aiError('Network error: ' . $curlErr, 'NETWORK_ERROR');
    }

    $decoded = json_decode($raw, true);

    if ($httpCode === 429) {
        $msg = $decoded['error']['message'] ?? 'Rate limit exceeded';
        return _aiError($msg, 'RATE_LIMITED');
    }

    if ($httpCode === 401 || $httpCode === 403) {
        return _aiError('API key rejected (HTTP ' . $httpCode . ')', 'AUTH_ERROR');
    }

    if ($httpCode !== 200) {
        $msg = $decoded['error']['message'] ?? "Provider error (HTTP $httpCode)";
        return _aiError($msg, 'PROVIDER_ERROR');
    }

    $content = $decoded['choices'][0]['message']['content'] ?? null;
    if ($content === null) {
        return _aiError('Empty response from provider', 'EMPTY_RESPONSE');
    }

    $tokens = (int)($decoded['usage']['total_tokens'] ?? 0);

    return ['ok' => true, 'content' => trim($content), 'tokens' => $tokens];
}

/**
 * Build a standardized error array (never throws, never exits).
 */
function _aiError(string $message, string $code = 'ERROR'): array
{
    return ['ok' => false, 'error' => $message, 'code' => $code];
}

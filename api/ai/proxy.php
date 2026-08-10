<?php
/**
 * ai-proxy.php — Server-side proxy for Groq Cloud AI API
 * Keeps the API key hidden from the browser.
 * 
 * Groq Cloud: Free tier, no credit card required.
 * Get your key at: https://console.groq.com/keys
 */
require_once __DIR__ . '/../config.php';

// ── Groq settings ──
// API key loaded from .env (GROQ_API_KEY).
if (!defined('GROQ_API_KEY')) {
    define('GROQ_API_KEY', getenv('GROQ_API_KEY') ?: '');
}
define('GROQ_API_URL', 'https://api.groq.com/openai/v1/chat/completions');
define('GROQ_MODEL', 'llama-3.1-8b-instant'); // Fast, free, very capable

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

if (!GROQ_API_KEY) {
    respondError('Groq API key is not configured. Please set GROQ_API_KEY in your .env file.', 500);
}

// ── Rate Limiting ──
rateLimit('ai_proxy', 10, 60);

$data = body();
$userPrompt = trim($data['prompt'] ?? '');
$action = trim($data['action'] ?? 'expand'); // 'expand' or 'skills'

if (!$userPrompt) {
    respondError('No prompt provided');
}

// Build system instruction based on the action
if ($action === 'skills') {
    // Use temperature=0.1 for deterministic extraction
    $temperature = 0.1;
    $systemMsg = 'You are a skill extraction engine for a university project matching platform.

Your job: Read the project description carefully, understand what the project actually needs, then select ONLY the relevant skill IDs from the catalog below.

SKILL CATALOG (id => name):
python => Python
javascript => JavaScript
java => Java
cpp => C++
csharp => C#
r_lang => R
matlab => MATLAB
sql => SQL
typescript => TypeScript
go => Go
php => PHP
swift => Swift
kotlin => Kotlin
html_css => HTML/CSS
react => React
vuejs => Vue.js
angular => Angular
nodejs => Node.js
django => Django
flask => Flask
rest_api => REST APIs
graphql => GraphQL
nextjs => Next.js
ml => Machine Learning
deep_learning => Deep Learning
nlp => NLP
cv => Computer Vision
data_mining => Data Mining
big_data => Big Data
tensorflow => TensorFlow
pytorch => PyTorch
sklearn => Scikit-learn
data_analysis => Data Analysis
acad_writing => Academic Writing
lit_review => Literature Review
data_collect => Data Collection
stat_analysis => Statistical Analysis
res_method => Research Methodology
latex => LaTeX
spss => SPSS
ui_ux => UI/UX Design
figma => Figma
graphic => Graphic Design
prototype => Prototyping
user_res => User Research
leadership => Leadership
comm => Communication
prob_solving => Problem Solving
teamwork => Teamwork
time_mgmt => Time Management
crit_think => Critical Thinking
presentation => Presentation
mysql => MySQL
postgres => PostgreSQL
mongodb => MongoDB
oracle => Oracle
sqlserver => SQL Server
redis => Redis
git => Git
docker => Docker
aws => AWS
azure => Azure
linux => Linux
cicd => CI/CD
kubernetes => Kubernetes
android => Android Development
ios => iOS Development
flutter => Flutter
react_native => React Native
cybersec => Cybersecurity
net_sec => Network Security
pen_test => Penetration Testing
crypto => Cryptography
bioinf => Bioinformatics
med_imaging => Medical Imaging
clin_data => Clinical Data
genomics => Genomics
biostat => Biostatistics
statistics => Statistics
lin_alg => Linear Algebra
calculus => Calculus
probability => Probability
num_methods => Numerical Methods
discrete => Discrete Math

STRICT RULES:
1. READ the project description THOROUGHLY before picking skills.
2. ONLY pick skills that are DIRECTLY needed based on what the description says.
3. If the description says "website" or "web app" => html_css + a relevant framework (react, vuejs, angular, etc.) + nodejs or django/flask for backend.
4. If the description says "mobile app" => android or ios or flutter or react_native.
5. If "machine learning" or "AI model" is mentioned => ml + python + relevant libs.
6. Do NOT add skills the project does NOT need. Do NOT guess or pad the list.
7. Pick 3-7 skills maximum, only the most relevant ones.
8. Output ONLY the skill IDs separated by commas. Example: python,react,nodejs,mysql
9. NO explanations, NO names, NO extra text. JUST comma-separated IDs.';
}
else {
    $temperature = 0.7;
    $systemMsg = 'You are an expert project description writer for university students. Rewrite the given draft into 2 professional paragraphs. CRITICAL RULES: 1) Use ONLY the topics, technologies, and goals the student mentioned. 2) Do NOT force or suggest specific frameworks, libraries, or implementation methods the student did not mention. If they said "website" do NOT add "using React and Node.js". If they said "mobile app" do NOT add "using Flutter". 3) Do NOT invent new features. 4) Keep the same scope and intent. 5) Output ONLY the 2 paragraphs, nothing else.';
}

// Call Groq
$ch = curl_init(GROQ_API_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . GROQ_API_KEY,
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => GROQ_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => $systemMsg],
            ['role' => 'user', 'content' => 'Project description: ' . $userPrompt],
        ],
        'max_tokens' => 800,
        'temperature' => $temperature,
    ]),
]);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    respondError('AI service unavailable: ' . $error, 503);
}

if ($httpCode !== 200) {
    $decoded = json_decode($result, true);
    $msg = $decoded['error']['message'] ?? "Groq API error (HTTP $httpCode)";
    respondError($msg, $httpCode);
}

$json = json_decode($result, true);
$text = $json['choices'][0]['message']['content'] ?? '';

respond(['text' => trim($text)]);

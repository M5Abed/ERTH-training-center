<?php
// =========================================================
// NMU TRAINING — Catalog Proposal Seeder
// Usage: php api/training/ideas/seed_catalog_proposals.php [--dry-run]
//
// Seeds the ai_cache table with pre-computed proposals for all
// 25 predefined catalog projects.  Re-running is safe (idempotent).
// =========================================================

define('_RUNNING_CLI', php_sapi_name() === 'cli');

if (!_RUNNING_CLI) {
    // Allow admin web trigger too
    require_once __DIR__ . '/../../config.php';
    requireRole(['admin']);
} else {
    require_once __DIR__ . '/../../config.php';
}

require_once __DIR__ . '/../../ai/ai_engine.php';

$dryRun = in_array('--dry-run', $argv ?? [], true);
$log    = function(string $msg, string $level = 'INFO') {
    $ts = date('H:i:s');
    echo "[$ts][$level] $msg\n";
};

$catalog = [
    // Beginner
    'face_detection_system'           => ['name' => 'Face Detection System',             'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, Haar Cascade, Computer Vision'],
    'face_recognition_attendance'     => ['name' => 'Face Recognition Attendance',       'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, face_recognition, SQLite, Deep Learning'],
    'object_detection'                => ['name' => 'Object Detection',                  'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, YOLOv8, Computer Vision, NumPy'],
    'color_recognition'               => ['name' => 'Color Recognition',                 'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, HSV Color Space, Image Processing'],
    'qr_barcode_scanner'              => ['name' => 'QR & Barcode Scanner',              'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, pyzbar, zxing, Image Processing'],
    'ocr_document_reader'             => ['name' => 'OCR Document Reader',               'difficulty' => 'Beginner',     'skills' => 'Python, Tesseract-OCR, OpenCV, PIL, pytesseract'],
    'hand_gesture_recognition'        => ['name' => 'Hand Gesture Recognition',          'difficulty' => 'Beginner',     'skills' => 'Python, MediaPipe, OpenCV, Landmark Detection'],
    'ai_calculator_hand_gestures'     => ['name' => 'AI Calculator Using Hand Gestures', 'difficulty' => 'Beginner',     'skills' => 'Python, MediaPipe, OpenCV, Gesture Classification, Computer Vision'],
    'emotion_detection'               => ['name' => 'Emotion Detection',                 'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, DeepFace, FER, Deep Learning'],
    'age_gender_detection'            => ['name' => 'Age & Gender Detection',            'difficulty' => 'Beginner',     'skills' => 'Python, OpenCV, Deep Learning, Pre-trained CNN, face_recognition'],
    // Intermediate
    'smart_parking_detection'         => ['name' => 'Smart Parking Detection',           'difficulty' => 'Intermediate', 'skills' => 'Python, OpenCV, YOLOv8, Background Subtraction, SQLite'],
    'fire_smoke_detection'            => ['name' => 'Fire & Smoke Detection',            'difficulty' => 'Intermediate', 'skills' => 'Python, OpenCV, CNN, TensorFlow/Keras, Transfer Learning'],
    'helmet_detection'                => ['name' => 'Helmet Detection',                  'difficulty' => 'Intermediate', 'skills' => 'Python, YOLOv8, OpenCV, Object Detection, Custom Dataset'],
    'vehicle_counter'                 => ['name' => 'Vehicle Counter',                   'difficulty' => 'Intermediate', 'skills' => 'Python, OpenCV, YOLOv8, SORT Tracking, ByteTrack'],
    'people_counter'                  => ['name' => 'People Counter',                    'difficulty' => 'Intermediate', 'skills' => 'Python, OpenCV, SORT/DeepSORT, YOLO, Computer Vision'],
    'smart_security_camera'           => ['name' => 'Smart Security Camera',             'difficulty' => 'Intermediate', 'skills' => 'Python, OpenCV, Motion Detection, YOLO, Email/SMS Alerts'],
    'smart_classroom_attendance'      => ['name' => 'Smart Classroom Attendance',        'difficulty' => 'Intermediate', 'skills' => 'Python, Face Recognition, OpenCV, SQLite, Flask, Multi-face'],
    'waste_classification'            => ['name' => 'Waste Classification',              'difficulty' => 'Intermediate', 'skills' => 'Python, CNN, TensorFlow/Keras, Transfer Learning, EfficientNet'],
    'plant_disease_detection'         => ['name' => 'Plant Disease Detection',           'difficulty' => 'Intermediate', 'skills' => 'Python, CNN, TensorFlow/Keras, OpenCV, Transfer Learning, ResNet'],
    // Advanced
    'ai_chat_assistant'               => ['name' => 'AI Chat Assistant',                 'difficulty' => 'Advanced',     'skills' => 'Python, NLP, Transformers, LangChain, Groq API, FastAPI'],
    'voice_assistant'                 => ['name' => 'Voice Assistant',                   'difficulty' => 'Advanced',     'skills' => 'Python, SpeechRecognition, pyttsx3, Whisper, NLP, PyAudio'],
    'smart_ocr_translator'            => ['name' => 'Smart OCR Translator',              'difficulty' => 'Advanced',     'skills' => 'Python, Tesseract-OCR, OpenCV, NLP, argostranslate, Deep Translator'],
    'ai_sign_language_recognition'    => ['name' => 'AI Sign Language Recognition',      'difficulty' => 'Advanced',     'skills' => 'Python, MediaPipe, LSTM, TensorFlow, OpenCV, Sequence Classification'],
    'smart_retail_recognition_system' => ['name' => 'Smart Retail Recognition System',   'difficulty' => 'Advanced',     'skills' => 'Python, YOLO, OpenCV, Face Recognition, SQLite, Flask, REST API'],
];

// Use a fixed admin-level user ID for quota tracking during seeding
// (Admin user typically has ID 1 — adjust if needed)
$seedUserId = 1;

$total   = count($catalog);
$seeded  = 0;
$cached  = 0;
$failed  = 0;

$log("Starting catalog proposal seeder. Projects: $total. Dry-run: " . ($dryRun ? 'YES' : 'NO'));
$log(str_repeat('-', 60));

foreach ($catalog as $catalogKey => $row) {
    $log("Processing: [{$row['difficulty']}] {$row['name']}");

    if ($dryRun) {
        $log("  → DRY-RUN: would call callAI('full_proposal', ...) for $catalogKey", 'DRY');
        $seeded++;
        continue;
    }

    $aiPayload = [
        'project_name' => $row['name'],
        'difficulty'   => $row['difficulty'],
        'core_skills'  => $row['skills'],
        'version'      => '2.0', // forces cache invalidation for the new Erth AI schema
        'context'      => 'This is a predefined training project from the NMU AI & Computer Vision training program catalog. '
                        . 'Generate a fully tailored, domain-specific enterprise proposal with deep technical rigor. '
                        . 'Target audience: university trainees implementing this on a laptop using Python and open-source libraries only.',
    ];

    $result = callAI($seedUserId, 'full_proposal', $aiPayload);

    if ($result['ok']) {
        if ($result['cached'] ?? false) {
            $log("  ✓ Already cached — skipped API call", 'CACHE');
            $cached++;
        } else {
            $log("  ✓ Generated & cached successfully (tokens: {$result['tokens']})", 'OK');
            $seeded++;
        }
    } else {
        $errCode = $result['code'] ?? 'ERROR';
        $errMsg  = $result['error'] ?? 'Unknown error';
        $log("  ✗ FAILED [$errCode]: $errMsg", 'ERROR');
        $failed++;

        // Back off on rate limit
        if ($errCode === 'RATE_LIMITED') {
            $log("  → Rate limited. Sleeping 10s before next attempt...", 'WARN');
            sleep(10);
        }
    }

    // Polite delay between requests to avoid rate limiting
    if (!($result['cached'] ?? false)) {
        sleep(2);
    }
}

$log(str_repeat('-', 60));
$log("Done. Generated: $seeded | Already cached: $cached | Failed: $failed");

if (!_RUNNING_CLI) {
    respond([
        'success' => true,
        'total'   => $total,
        'seeded'  => $seeded,
        'cached'  => $cached,
        'failed'  => $failed,
    ]);
}

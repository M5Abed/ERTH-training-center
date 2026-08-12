<?php
// =========================================================
// ERTH MATCHING — OTP Email Verification Endpoint
// =========================================================
// This endpoint:
// 1. Accepts the 6-digit OTP from the user
// 2. Validates it against the stored hash
// 3. Marks the email as verified on success
// 4. Logs the user in (creates session)
// 5. Invalidates the OTP after use
// =========================================================

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/otp_helpers.php';

// ── Ensure verification tables exist ──
ensureVerificationTables();

// ── Only accept POST requests ──
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();

// =========================================================
// INPUT VALIDATION
// =========================================================

$otpInput = trim($data['otp'] ?? '');
$userId   = (int)($data['user_id'] ?? $_SESSION['pending_verification_user_id'] ?? 0);
$email    = strtolower(trim($data['email'] ?? $_SESSION['pending_verification_email'] ?? ''));

// Validate OTP format (must be exactly 6 digits)
if (!preg_match('/^\d{6}$/', $otpInput)) {
    respondError('Please enter a valid 6-digit verification code');
}

// Ensure we have a user to verify
if (!$userId) {
    respondError('User identification missing. Please register again.', 400);
}

// =========================================================
// VERIFY USER EXISTS AND IS UNVERIFIED
// =========================================================

$stmt = db()->prepare("SELECT id, email, full_name, email_verified FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    respondError('User not found. Please register again.', 404);
}

if ($user['email_verified']) {
    respond([
        'message' => 'Email is already verified. You can log in.',
        'verified' => true,
    ]);
}

// Verify email matches (security check)
if ($email && strtolower($user['email']) !== $email) {
    respondError('Email mismatch. Please try again.', 400);
}

// =========================================================
// RATE LIMITING — Prevent OTP brute-force at endpoint level
// =========================================================

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateCheck = checkRateLimit("verify_{$ip}_{$userId}", 'verify_otp', 10, 15);

if (!$rateCheck['allowed']) {
    $waitMin = ceil($rateCheck['wait_seconds'] / 60);
    respondError(
        "Too many verification attempts. Please wait {$waitMin} minute(s) before trying again.",
        429
    );
}

// =========================================================
// VERIFY OTP
// =========================================================

$result = verifyOtp($userId, $otpInput, 'email_verify');

if (!$result['success']) {
    respondError($result['error'], 400);
}

// =========================================================
// SUCCESS — Mark email as verified & log user in
// =========================================================

markEmailVerified($userId);

// Create authenticated session
$_SESSION['user_id'] = $userId;

// Clean up pending verification session data
unset($_SESSION['pending_verification_user_id']);
unset($_SESSION['pending_verification_email']);

// Fetch full user profile for the response
$stmt = db()->prepare("
    SELECT id, email, full_name, student_id, college_key,
           academic_year, major, bio, avatar_url, is_admin, role,
           avg_rating, email_verified, created_at
    FROM users WHERE id = ?
");
$stmt->execute([$userId]);
$fullUser = $stmt->fetch();
unset($fullUser['password_hash']); // Safety: never expose hash

respond([
    'message'  => 'Email verified successfully! You are now logged in.',
    'verified' => true,
    'user'     => $fullUser,
]);

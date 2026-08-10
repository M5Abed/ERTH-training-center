<?php
// =========================================================
// ERTH MATCHING — OTP Helper Functions
// =========================================================
// Reusable functions for OTP generation, storage, validation,
// and rate-limiting. Used by register.php, verify.php, and
// resend_otp.php.
// =========================================================

require_once __DIR__ . '/../config.php';

/**
 * Generate a cryptographically secure 6-digit OTP code.
 * Uses random_int() which is CSPRNG-backed (not mt_rand).
 *
 * @return string 6-digit OTP code (zero-padded)
 */
function generateOtp(): string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

/**
 * Create and store a new OTP for a user.
 *
 * - Invalidates any previous unused OTPs for the same purpose
 * - Hashes the OTP before storing (defense-in-depth)
 * - Sets a 10-minute expiration window
 *
 * @param int    $userId  The user's ID
 * @param string $email   The user's email address
 * @param string $purpose 'email_verify' or 'password_reset'
 * @return string The plain-text OTP code (send this to the user)
 */
function createOtp(int $userId, string $email, string $purpose = 'email_verify'): string
{
    $otp     = generateOtp();
    $otpHash = password_hash($otp, PASSWORD_DEFAULT);
    $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

    // ── Invalidate any previous unused OTPs for this user/purpose ──
    $stmt = db()->prepare("
        UPDATE otp_codes 
        SET used_at = NOW() 
        WHERE user_id = ? AND purpose = ? AND used_at IS NULL
    ");
    $stmt->execute([$userId, $purpose]);

    // ── Insert new OTP ──
    $stmt = db()->prepare("
        INSERT INTO otp_codes (user_id, email, otp_code, otp_hash, purpose, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    // Store a masked version of OTP for admin reference (not the actual code)
    $maskedOtp = '******';
    $stmt->execute([$userId, $email, $maskedOtp, $otpHash, $purpose, $expiresAt]);

    // Save plain text OTP to a local file in the project root for local testing
    try {
        $logFile = __DIR__ . '/../../otp.txt';
        $logMessage = "[" . date('Y-m-d H:i:s') . "] Email: $email | OTP: $otp | Purpose: $purpose | User ID: $userId\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND);
    } catch (\Exception $e) {
        // Safe to ignore logging errors
    }

    return $otp;
}

/**
 * Verify an OTP code against the stored hash.
 *
 * Checks:
 * 1. OTP exists for the user and purpose
 * 2. OTP has not already been used
 * 3. OTP has not expired
 * 4. Brute-force limit not exceeded (max 5 wrong attempts)
 * 5. OTP hash matches
 *
 * @param int    $userId     The user's ID
 * @param string $otpInput   The OTP code the user entered
 * @param string $purpose    'email_verify' or 'password_reset'
 * @return array ['success' => bool, 'error' => string|null]
 */
function verifyOtp(int $userId, string $otpInput, string $purpose = 'email_verify'): array
{
    // ── Fetch the latest unused OTP for this user/purpose ──
    $stmt = db()->prepare("
        SELECT id, otp_hash, expires_at, attempts
        FROM otp_codes
        WHERE user_id = ? AND purpose = ? AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$userId, $purpose]);
    $otpRecord = $stmt->fetch();

    // No OTP found
    if (!$otpRecord) {
        return [
            'success' => false,
            'error'   => 'No verification code found. Please request a new one.'
        ];
    }

    // Check brute-force limit (max 5 wrong attempts per OTP)
    if ($otpRecord['attempts'] >= 5) {
        // Invalidate this OTP
        $update = db()->prepare("UPDATE otp_codes SET used_at = NOW() WHERE id = ?");
        $update->execute([$otpRecord['id']]);

        return [
            'success' => false,
            'error'   => 'Too many incorrect attempts. This code has been invalidated. Please request a new one.'
        ];
    }

    // Check expiration
    if (strtotime($otpRecord['expires_at']) < time()) {
        return [
            'success' => false,
            'error'   => 'Verification code has expired. Please request a new one.'
        ];
    }

    // Verify the OTP hash
    if (!password_verify($otpInput, $otpRecord['otp_hash'])) {
        // Increment wrong-attempt counter
        $update = db()->prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?");
        $update->execute([$otpRecord['id']]);

        $remaining = 4 - $otpRecord['attempts']; // 5 max, 0-indexed
        return [
            'success' => false,
            'error'   => "Invalid verification code. $remaining attempt(s) remaining."
        ];
    }

    // ── Success! Mark OTP as used ──
    $update = db()->prepare("UPDATE otp_codes SET used_at = NOW() WHERE id = ?");
    $update->execute([$otpRecord['id']]);

    return ['success' => true, 'error' => null];
}

/**
 * Check rate-limiting for OTP resend requests.
 *
 * Allows a maximum of $maxAttempts resend requests within $windowMinutes.
 * Uses the database for persistence (works across servers/sessions).
 *
 * @param string $identifier The identifier (e.g., IP address or user email)
 * @param string $action     The action being rate-limited
 * @param int    $maxAttempts Maximum attempts allowed in the window
 * @param int    $windowMinutes Time window in minutes
 * @return array ['allowed' => bool, 'wait_seconds' => int, 'attempts_left' => int]
 */
function checkRateLimit(
    string $identifier,
    string $action = 'resend_otp',
    int $maxAttempts = 3,
    int $windowMinutes = 15
): array {
    $windowStart = date('Y-m-d H:i:s', time() - ($windowMinutes * 60));

    // ── Check existing rate limit record ──
    $stmt = db()->prepare("
        SELECT attempts, window_start 
        FROM otp_rate_limits 
        WHERE identifier = ? AND action = ?
    ");
    $stmt->execute([$identifier, $action]);
    $record = $stmt->fetch();

    if (!$record || strtotime($record['window_start']) < strtotime($windowStart)) {
        // No record or window expired — reset
        $stmt = db()->prepare("
            INSERT INTO otp_rate_limits (identifier, action, attempts, window_start)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE attempts = 1, window_start = NOW()
        ");
        $stmt->execute([$identifier, $action]);

        return [
            'allowed'       => true,
            'wait_seconds'  => 0,
            'attempts_left' => $maxAttempts - 1,
        ];
    }

    // Window is still active
    if ($record['attempts'] >= $maxAttempts) {
        $windowEnd = strtotime($record['window_start']) + ($windowMinutes * 60);
        $waitSeconds = max(0, $windowEnd - time());

        return [
            'allowed'       => false,
            'wait_seconds'  => $waitSeconds,
            'attempts_left' => 0,
        ];
    }

    // Increment attempts
    $stmt = db()->prepare("
        UPDATE otp_rate_limits 
        SET attempts = attempts + 1 
        WHERE identifier = ? AND action = ?
    ");
    $stmt->execute([$identifier, $action]);

    return [
        'allowed'       => true,
        'wait_seconds'  => 0,
        'attempts_left' => $maxAttempts - $record['attempts'] - 1,
    ];
}

/**
 * Mark a user's email as verified in the database.
 *
 * @param int $userId The user's ID
 * @return void
 */
function markEmailVerified(int $userId): void
{
    $stmt = db()->prepare("UPDATE users SET email_verified = 1 WHERE id = ?");
    $stmt->execute([$userId]);
}

/**
 * Check if a user's email is already verified.
 *
 * @param int $userId The user's ID
 * @return bool
 */
function isEmailVerified(int $userId): bool
{
    $stmt = db()->prepare("SELECT email_verified FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row && (bool)$row['email_verified'];
}

/**
 * Auto-migrate: ensure the email verification tables exist.
 * Called once per session to avoid overhead.
 */
function ensureVerificationTables(): void
{
    if (!empty($_SESSION['_otp_tables_ready'])) {
        return;
    }

    try {
        // Add email_verified column if missing
        $cols = db()->query("SHOW COLUMNS FROM users LIKE 'email_verified'")->fetchAll();
        if (empty($cols)) {
            db()->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0");
        }

        // Create OTP codes table
        db()->exec("
            CREATE TABLE IF NOT EXISTS otp_codes (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                email       VARCHAR(255) NOT NULL,
                otp_code    VARCHAR(6) NOT NULL,
                otp_hash    VARCHAR(255) NOT NULL,
                purpose     ENUM('email_verify', 'password_reset') DEFAULT 'email_verify',
                expires_at  DATETIME NOT NULL,
                used_at     DATETIME DEFAULT NULL,
                attempts    INT NOT NULL DEFAULT 0,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_otp_user    (user_id),
                INDEX idx_otp_email   (email),
                INDEX idx_otp_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        // Create rate limits table
        db()->exec("
            CREATE TABLE IF NOT EXISTS otp_rate_limits (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                identifier    VARCHAR(255) NOT NULL,
                action        VARCHAR(50)  NOT NULL DEFAULT 'resend_otp',
                attempts      INT NOT NULL DEFAULT 1,
                window_start  DATETIME NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE INDEX idx_rate_ident_action (identifier, action)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        $_SESSION['_otp_tables_ready'] = true;
    } catch (\Exception $e) {
        error_log("OTP table migration failed: " . $e->getMessage());
    }
}

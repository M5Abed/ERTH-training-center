<?php
// =========================================================
// ERTH MATCHING — PHPMailer SMTP Configuration
// =========================================================
// This file configures PHPMailer to send transactional emails
// via Hostinger Mail SMTP.
//
// SETUP INSTRUCTIONS:
// 1. Go to Hostinger hPanel → Emails → Manage
// 2. Create an email account (e.g. noreply@erth.dev)
// 3. Note the email address and password you set
// 4. Add credentials to your .env file (see .env.example)
//
// Hostinger SMTP Settings:
//   Host: smtp.hostinger.com
//   Port: 465 (SSL)
//   Auth: Your Hostinger email + password
// =========================================================

require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

/**
 * Create and return a pre-configured PHPMailer instance.
 *
 * @return PHPMailer Configured mailer ready to send
 * @throws Exception If SMTP credentials are missing
 */
function createMailer(): PHPMailer
{
    // ── Load credentials from .env constants ──
    $smtpHost = defined('SMTP_HOST') ? SMTP_HOST : 'smtp.hostinger.com';
    $smtpPort = defined('SMTP_PORT') ? (int)SMTP_PORT : 465;
    $smtpUser = defined('SMTP_USER') ? SMTP_USER : '';
    $smtpPass = defined('SMTP_PASS') ? SMTP_PASS : '';
    $smtpFrom = defined('SMTP_FROM_EMAIL') ? SMTP_FROM_EMAIL : $smtpUser;
    $smtpName = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : 'THINK TANK';

    if (empty($smtpUser) || empty($smtpPass)) {
        throw new Exception(
            'SMTP credentials not configured. '
            . 'Please add SMTP_USER and SMTP_PASS to your .env file.'
        );
    }

    $mail = new PHPMailer(true); // Enable exceptions

    // ── SMTP Configuration ──
    $mail->isSMTP();
    $mail->Host       = $smtpHost;
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtpUser;
    $mail->Password   = $smtpPass;
    // Hostinger uses SSL on port 465 (not STARTTLS on 587)
    $smtpEncryption = ($smtpPort === 465)
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPSecure = $smtpEncryption;
    $mail->Port       = $smtpPort;
    $mail->CharSet    = 'UTF-8';

    // ── Sender Info ──
    $mail->setFrom($smtpFrom, $smtpName);
    $mail->addReplyTo($smtpFrom, $smtpName);

    // ── Anti-Spam Best Practices ──
    // Set proper Message-ID to avoid spam filters
    $fromDomain = explode('@', $smtpFrom)[1] ?? 'erth.dev';
    $mail->MessageID = sprintf(
        '<%s@%s>',
        bin2hex(random_bytes(16)),
        $fromDomain
    );

    // Additional headers to reduce spam score
    $mail->addCustomHeader('Precedence', 'bulk');
    $mail->addCustomHeader('X-Mailer', 'ERTH-Matching/1.0');
    $mail->addCustomHeader('X-Auto-Response-Suppress', 'OOF, AutoReply');
    $mail->addCustomHeader('List-Unsubscribe', "<mailto:{$smtpFrom}?subject=unsubscribe>");

    // Timeout settings
    $mail->Timeout    = 30;  // seconds
    $mail->SMTPDebug  = SMTP::DEBUG_OFF; // Set to DEBUG_SERVER for debugging

    return $mail;
}

/**
 * Send an OTP verification email with a beautiful HTML template.
 *
 * @param string $recipientEmail The recipient email address
 * @param string $recipientName  The recipient's display name
 * @param string $otpCode        The 6-digit OTP code
 * @return bool True if sent successfully
 * @throws Exception On send failure
 */
function sendOtpEmail(string $recipientEmail, string $recipientName, string $otpCode): bool
{
    $mail = createMailer();

    // ── Recipient ──
    $mail->addAddress($recipientEmail, $recipientName);

    // ── Email Content ──
    $mail->isHTML(true);
    $mail->Subject = "Your THINK TANK Verification Code: $otpCode";
    $mail->Body    = buildOtpEmailTemplate($otpCode, $recipientName);
    $mail->AltBody = buildOtpEmailPlainText($otpCode, $recipientName);

    return $mail->send();
}

/**
 * Build the HTML email template for OTP verification.
 *
 * @param string $otpCode The 6-digit OTP code
 * @param string $name    The recipient's name
 * @return string HTML email body
 */
function buildOtpEmailTemplate(string $otpCode, string $name): string
{
    // Split OTP into individual digits for the styled boxes
    $digits = str_split($otpCode);
    $digitBoxes = '';
    foreach ($digits as $digit) {
        $digitBoxes .= "
            <td style=\"
                width: 48px;
                height: 56px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                text-align: center;
                vertical-align: middle;
                font-size: 28px;
                font-weight: 700;
                color: #ffffff;
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
                letter-spacing: 0;
                padding: 0;
            \">$digit</td>
        ";
    }

    $year = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="
    margin: 0;
    padding: 0;
    background-color: #0f0f23;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f23;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                    max-width: 520px;
                    background: linear-gradient(145deg, #1a1a3e 0%, #16162e 100%);
                    border-radius: 20px;
                    border: 1px solid rgba(102, 126, 234, 0.2);
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
                    overflow: hidden;
                ">
                    <!-- Header Gradient Bar -->
                    <tr>
                        <td style="
                            height: 4px;
                            background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #667eea);
                        "></td>
                    </tr>

                    <!-- Logo & Title -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 24px 40px;">
                            <!-- Icon placeholder removed to avoid spam triggers -->

                            <h1 style="
                                margin: 0 0 8px 0;
                                font-size: 24px;
                                font-weight: 700;
                                color: #ffffff;
                                letter-spacing: -0.02em;
                            ">Verify Your Email</h1>

                            <p style="
                                margin: 0;
                                font-size: 15px;
                                color: #8b8baf;
                                line-height: 1.5;
                            ">
                                Hi <strong style="color: #c4c4e0;">{$name}</strong>, use the code below to complete your registration on <strong style="color: #667eea;">THINK TANK</strong>.
                            </p>
                        </td>
                    </tr>

                    <!-- OTP Code Boxes -->
                    <tr>
                        <td align="center" style="padding: 0 40px 32px 40px;">
                            <table role="presentation" cellpadding="0" cellspacing="6" style="margin: 0 auto;">
                                <tr>
                                    {$digitBoxes}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Expiry Notice -->
                    <tr>
                        <td align="center" style="padding: 0 40px 32px 40px;">
                            <div style="
                                display: inline-block;
                                background: rgba(251, 191, 36, 0.08);
                                border: 1px solid rgba(251, 191, 36, 0.2);
                                border-radius: 10px;
                                padding: 12px 20px;
                            ">
                                <p style="
                                    margin: 0;
                                    font-size: 13px;
                                    color: #fbbf24;
                                    font-weight: 500;
                                ">This code expires in <strong>10 minutes</strong></p>
                            </div>
                        </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 0 40px 36px 40px;">
                            <div style="
                                background: rgba(99, 102, 241, 0.06);
                                border-radius: 12px;
                                padding: 16px 20px;
                                border-left: 3px solid #667eea;
                            ">
                                <p style="
                                    margin: 0 0 4px 0;
                                    font-size: 13px;
                                    font-weight: 600;
                                    color: #a5a5cc;
                                ">Security Notice</p>
                                <p style="
                                    margin: 0;
                                    font-size: 12px;
                                    color: #6b6b8d;
                                    line-height: 1.6;
                                ">
                                    If you didn't request this code, you can safely ignore this email. Never share your verification code with anyone.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="
                            background: rgba(0, 0, 0, 0.2);
                            padding: 20px 40px;
                            border-top: 1px solid rgba(102, 126, 234, 0.1);
                        ">
                            <p style="
                                margin: 0;
                                font-size: 12px;
                                color: #4a4a6a;
                                text-align: center;
                                line-height: 1.6;
                            ">
                                &copy; {$year} THINK TANK &middot; New Mansoura University<br>
                                This is an automated message. Please do not reply.<br>
                                <span style="font-size: 10px; color: #3a3a5a;">123 University Drive, New Mansoura</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
}

/**
 * Build plain-text fallback for email clients that don't render HTML.
 *
 * @param string $otpCode The 6-digit OTP
 * @param string $name    The recipient's name
 * @return string Plain text email body
 */
function buildOtpEmailPlainText(string $otpCode, string $name): string
{
    return <<<TEXT
THINK TANK — Email Verification
====================================

Hi {$name},

Your verification code is: {$otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

— THINK TANK Team
TEXT;
}

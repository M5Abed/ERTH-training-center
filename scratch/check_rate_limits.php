<?php
require_once __DIR__ . '/../api/config.php';

// Check rate limits
$stmt = db()->query("SELECT * FROM otp_rate_limits");
$rate_limits = $stmt->fetchAll();
echo "Rate Limits:\n";
print_r($rate_limits);

// Clear rate limits for login
$stmt = db()->query("DELETE FROM otp_rate_limits WHERE action = 'login'");
echo "Cleared login rate limits.\n";

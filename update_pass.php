<?php
require 'api/config.php';
$hash = password_hash('password123', PASSWORD_DEFAULT);
db()->query("UPDATE users SET password_hash = '$hash' WHERE email = 'trainee@nmu.edu.eg'");
echo "Password updated\n";

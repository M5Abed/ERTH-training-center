<?php
require 'config.php';
$stmt = db()->query("SHOW CREATE TABLE project_applications");
print_r($stmt->fetch());

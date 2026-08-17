<?php
$paths = [
    '/var/www/html/api/templates/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    '/var/www/html/dev/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    '/var/www/html/NMU_AI_Robotics_Field_Training_Project_Template.docx',
];
foreach ($paths as $p) {
    echo (file_exists($p) ? 'FOUND' : 'MISSING') . ': ' . $p . PHP_EOL;
}

// Also check what SC_ counting would give us
require_once '/var/www/html/vendor/autoload.php';
$templateFile = null;
foreach ($paths as $p) {
    if (file_exists($p)) { $templateFile = $p; break; }
}
if (!$templateFile) { echo "NO TEMPLATE FOUND\n"; exit(1); }

$zip = new ZipArchive();
$zip->open($templateFile);
$xml = $zip->getFromName('word/document.xml');
$zip->close();

$count = substr_count($xml, '>Student content<');
echo "Student content occurrences: $count\n";

// Also show first SC replacement
$c = 0;
$processed = preg_replace_callback(
    '/>Student content</',
    function($m) use (&$c) { $c++; return '>{{SC_' . str_pad($c, 2, '0', STR_PAD_LEFT) . '}}<'; },
    $xml
);
echo "Replacements made: $c\n";
echo "Verification: " . (strpos($processed, '{{SC_01}}') !== false ? 'SC_01 found' : 'SC_01 NOT found') . "\n";
echo "Verification: " . (strpos($processed, '{{SC_29}}') !== false ? 'SC_29 found' : 'SC_29 NOT found') . "\n";

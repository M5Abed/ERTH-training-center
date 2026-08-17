<?php
// Check exact keyword variable name in template
chdir('/var/www/html');
require_once 'vendor/autoload.php';
use PhpOffice\PhpWord\TemplateProcessor;

$templateFile = 'api/templates/NMU_AI_Robotics_Field_Training_Project_Template.docx';

// Pre-process
$zip = new ZipArchive();
$zip->open($templateFile);
$docXml = $zip->getFromName('word/document.xml');
$zip->close();

// Find all [variable] patterns
preg_match_all('/\[([^\[\]]+)\]/', $docXml, $matches);
$vars = array_unique($matches[1]);
sort($vars);
echo "All template [variables]:\n";
foreach ($vars as $v) {
    echo "  hex=[" . bin2hex($v) . "] text=[" . $v . "]\n";
}
echo "\nTotal: " . count($vars) . " unique variables\n";

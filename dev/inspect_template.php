<?php
require_once __DIR__ . '/../vendor/autoload.php';
use PhpOffice\PhpWord\TemplateProcessor;

$tp = new TemplateProcessor(__DIR__ . '/NMU_AI_Robotics_Field_Training_Project_Template.docx');
$tp->setMacroChars('[', ']');
$vars = $tp->getVariables();
sort($vars);
echo "=== TEMPLATE VARIABLES ===\n";
foreach ($vars as $v) {
    echo "  [" . $v . "]\n";
}
echo "\nTotal: " . count($vars) . " variables\n";

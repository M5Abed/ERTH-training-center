<?php
// Simulate what proposal_docx.php does — test the XML pre-processing + TemplateProcessor pipeline
chdir('/var/www/html');
require_once 'vendor/autoload.php';
use PhpOffice\PhpWord\TemplateProcessor;

$templateFile = 'api/templates/NMU_AI_Robotics_Field_Training_Project_Template.docx';
$tmpDocx = tempnam(sys_get_temp_dir(), 'test_tpl_') . '.docx';
copy($templateFile, $tmpDocx);

// Step 1: Pre-process — number all "Student content" occurrences
$zip = new ZipArchive();
$zip->open($tmpDocx);
$docXml = $zip->getFromName('word/document.xml');
$zip->close();

$counter = 0;
$processedXml = preg_replace_callback(
    '/>Student content</',
    function($match) use (&$counter) {
        $counter++;
        return '>{{SC_' . str_pad($counter, 2, '0', STR_PAD_LEFT) . '}}<';
    },
    $docXml
);

echo "Numbered tokens created: $counter\n";

$zip->open($tmpDocx);
$zip->addFromString('word/document.xml', $processedXml);
$zip->close();

// Step 2: TemplateProcessor hydrate
$tp = new TemplateProcessor($tmpDocx);
$tp->setMacroChars('{{', '}}');

// Fill numbered sections with sample content
for ($i = 1; $i <= $counter; $i++) {
    $key = 'SC_' . str_pad($i, 2, '0', STR_PAD_LEFT);
    $tp->setValue($key, "Section $i content — fully auto-populated from catalog data.");
}

// Fill scalar vars
$tp->setMacroChars('[', ']');
$tp->setValue('Enter the full project title', 'Face Detection System');
$tp->setValue('Student 1', 'Ahmed Mohamed Ali');
$tp->setValue('Student 2', 'Sara Hassan');
$tp->setValue('Student 3', '');
$tp->setValue('Student 4', '');
$tp->setValue('Student 5', '');
$tp->setValue('ID 1', '2021001234');
$tp->setValue('ID 2', '2021005678');
$tp->setValue('ID 3', '');
$tp->setValue('Yanshee / NAO / Robot Arm / AI Box / LIMO / Other', 'Python / OpenCV / Deep Learning on Laptop');
$tp->setValue('Name and title', 'Dr. Mohamed Trainer');
$tp->setValue('Start date', '14 July 2026');
$tp->setValue('End date', '18 August 2026');
$tp->setValue('Day / Month / Year', date('d / m / Y'));
$tp->setValue('Project title', 'Face Detection System');
$tp->setValue('Names and IDs', 'Ahmed Mohamed Ali (2021001234), Sara Hassan (2021005678)');
$tp->setValue('3-6 keywords, e.g., robotics, computer vision, NAO, object detection', 'Python, OpenCV, Computer Vision, Face Detection');
$tp->setValue('Enter problem statement here', 'Small-scale systems need reliable face detection as a first step.');
$tp->setValue('Expected deliverables', '1. Working system demo, 2. Source code, 3. Final report');
$tp->setValue('Name', 'OpenCV Baseline');
$tp->setValue('Robot', 'Laptop');
$tp->setValue('Feature', 'Haar cascade face detection');
$tp->setValue('Limitation', 'Sensitive to lighting changes');
$tp->setValue('Citation', '[1]');
$tp->setValue('Risk', 'Hardware unavailability');
$tp->setValue('Action', 'Use simulation fallback');
$tp->setValue('Test', 'Normal case');
$tp->setValue('Condition', 'Standard lighting');
$tp->setValue('Expected', 'Face detected within 2s');
$tp->setValue('Actual', 'Pass');
$tp->setValue('Add project-specific abbreviation', 'CV');
$tp->setValue('Add', 'Computer Vision');
$tp->setValue('Title', '');

$outFile = sys_get_temp_dir() . '/erth_test_output.docx';
$tp->saveAs($outFile);

@unlink($tmpDocx);

echo "Output file size: " . filesize($outFile) . " bytes\n";
echo "Template file size: " . filesize($templateFile) . " bytes\n";
echo "SUCCESS: Generated $outFile\n";
@unlink($outFile);

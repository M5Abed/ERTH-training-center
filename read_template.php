<?php
require __DIR__ . '/vendor/autoload.php';
$phpWord = \PhpOffice\PhpWord\IOFactory::load(__DIR__ . '/NMU_AI_Robotics_Field_Training_Project_Template.docx');
foreach ($phpWord->getSections() as $section) {
    foreach ($section->getElements() as $el) {
        $class = get_class($el);
        if ($el instanceof \PhpOffice\PhpWord\Element\Title) {
            echo 'HEADING[' . $el->getDepth() . ']: ' . $el->getText() . PHP_EOL;
        } elseif ($el instanceof \PhpOffice\PhpWord\Element\TextRun) {
            $text = '';
            foreach ($el->getElements() as $child) {
                if (method_exists($child, 'getText')) $text .= $child->getText();
            }
            if (trim($text)) echo 'TEXTRUN: ' . trim($text) . PHP_EOL;
        } elseif ($el instanceof \PhpOffice\PhpWord\Element\Table) {
            echo 'TABLE:' . PHP_EOL;
            foreach ($el->getRows() as $row) {
                $rowText = [];
                foreach ($row->getCells() as $cell) {
                    $cellText = '';
                    foreach ($cell->getElements() as $cEl) {
                        if ($cEl instanceof \PhpOffice\PhpWord\Element\TextRun) {
                            foreach ($cEl->getElements() as $t) {
                                if (method_exists($t, 'getText')) $cellText .= $t->getText();
                            }
                        } elseif (method_exists($cEl, 'getText')) {
                            $cellText .= $cEl->getText();
                        }
                    }
                    $rowText[] = trim($cellText);
                }
                echo '  ROW: [' . implode(' | ', $rowText) . ']' . PHP_EOL;
            }
        } else {
            echo $class . PHP_EOL;
        }
    }
}

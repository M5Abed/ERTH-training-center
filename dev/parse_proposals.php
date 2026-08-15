<?php
// Parse the extracted text to build catalog_64_data.php
// The text has been extracted from ERTH_64_Full_Proposals.docx

$text = file_get_contents('/var/www/html/dev/extracted_proposals.txt');

// Decode HTML entities that came from XML
$text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

// Split by project markers: #1, #2, ... #64
// Pattern: # followed by number, space, then title
$projects = [];
// Split on "#N " markers
preg_match_all('/#(\d+)\s+([^\[]+?)\s+\[([^\]]+)\](.*?)(?=#\d+\s+|$)/s', $text, $matches, PREG_SET_ORDER);

echo "Found " . count($matches) . " project(s)\n";

$sectionKeys = [
    'abstract'                => 'Abstract:',
    'introduction_background' => 'Introduction & Background:',
    'problem_definition'      => 'Problem Definition:',
    'objectives_scope'        => 'Objectives & Scope:',
    'related_work'            => 'Related Work:',
    'methodology'             => 'Proposed Methodology:',
    'expected_system_design'  => 'Expected System Design:',
];

$catalog = [];

foreach ($matches as $m) {
    $id       = (int)$m[1];
    $title    = trim($m[2]);
    $meta     = trim($m[3]); // e.g. "Software · Beginner · Python, OpenCV"
    $body     = trim($m[4]);

    // Parse meta: category · level · skills
    $parts    = array_map('trim', explode('·', $meta));
    $cat_raw  = strtolower($parts[0] ?? 'software');
    // Normalize category
    if (strpos($cat_raw, 'software') !== false || strpos($cat_raw, 'ai') !== false) {
        $category = 'software';
    } elseif (strpos($cat_raw, 'yanshee') !== false) {
        $category = 'yanshee';
    } elseif (strpos($cat_raw, 'nao') !== false) {
        $category = 'nao';
    } elseif (strpos($cat_raw, 'integrated') !== false || strpos($cat_raw, 'capstone') !== false) {
        $category = 'integrated';
    } else {
        $category = 'software';
    }
    $level    = $parts[1] ?? 'Beginner';
    $skills   = $parts[2] ?? '';

    // display_order: software/ai 1-24 first, then others by id
    $display_order = ($category === 'software') ? $id : $id;

    // Parse sections
    $sections = [];
    $prevKey = null;
    $prevStart = 0;
    $bodyParts = [];

    // Find all section labels
    $sectionPositions = [];
    foreach ($sectionKeys as $key => $label) {
        // Some labels may appear with slightly different spacing
        $pos = strpos($body, $label);
        if ($pos !== false) {
            $sectionPositions[$pos] = [$key, $label, strlen($label)];
        }
    }
    ksort($sectionPositions);

    // Extract content between section labels
    $positions = array_keys($sectionPositions);
    for ($i = 0; $i < count($positions); $i++) {
        $start = $positions[$i];
        $end   = isset($positions[$i + 1]) ? $positions[$i + 1] : strlen($body);
        [$key, $label, $labelLen] = $sectionPositions[$start];
        $content = trim(substr($body, $start + $labelLen, $end - $start - $labelLen));
        $sections[$key] = $content;
    }

    $catalog[] = [
        'id'            => $id,
        'title'         => $title,
        'category'      => $category,
        'level'         => trim($level),
        'skills'        => trim($skills),
        'display_order' => $display_order,
        'sections'      => $sections,
    ];
}

// Sort by display_order then id
usort($catalog, fn($a, $b) => $a['id'] <=> $b['id']);

// Generate PHP output
$out = "<?php\n";
$out .= "// =========================================================\n";
$out .= "// NMU ERTH — 64-Idea Project Catalog Data\n";
$out .= "// SOURCE: ERTH_64_Full_Proposals.docx (human-authored, zero AI)\n";
$out .= "// DO NOT EDIT manually — regenerate from docx if source changes.\n";
$out .= "// =========================================================\n\n";
$out .= "function getCatalog64(): array {\n";
$out .= "    return [\n";

foreach ($catalog as $p) {
    $out .= "    [\n";
    $out .= "        'id'            => " . $p['id'] . ",\n";
    $out .= "        'title'         => " . var_export($p['title'], true) . ",\n";
    $out .= "        'category'      => " . var_export($p['category'], true) . ",\n";
    $out .= "        'level'         => " . var_export($p['level'], true) . ",\n";
    $out .= "        'skills'        => " . var_export($p['skills'], true) . ",\n";
    $out .= "        'display_order' => " . $p['display_order'] . ",\n";
    $out .= "        'sections'      => [\n";
    foreach ($p['sections'] as $k => $v) {
        $out .= "            " . var_export($k, true) . " => " . var_export($v, true) . ",\n";
    }
    $out .= "        ],\n";
    $out .= "    ],\n";
}

$out .= "    ];\n}\n";

file_put_contents('/var/www/html/api/training/ideas/catalog_64_data.php', $out);
echo "Written: " . strlen($out) . " bytes\n";
echo "Projects found: " . count($catalog) . "\n";

// Print section key summary per first few projects
foreach (array_slice($catalog, 0, 3) as $p) {
    echo "  #{$p['id']} {$p['title']} [{$p['category']}] sections: " . implode(', ', array_keys($p['sections'])) . "\n";
}

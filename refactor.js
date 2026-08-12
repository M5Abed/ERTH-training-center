const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'frontend/src'),
    path.join(__dirname, 'api')
];

function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.js', '.jsx', '.php'].includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // FRONTEND SPECIFIC (JS/JSX)
    if (['.js', '.jsx'].includes(ext)) {
        // Remove complex conditional rendering for languages:
        // {lang === 'ar' && obj.name_ar ? obj.name_ar : obj.name_en} -> {obj.name}
        content = content.replace(/\{lang === 'ar' && ([a-zA-Z0-9_\.\?]+)\.(name|title|description|course_title|course_name|owner_name|full_name)_ar \? \1\.\2_ar : ([a-zA-Z0-9_\.\?]+)\.\2_en\}/g, '{$3.$2}');
        
        // Similar patterns with parentheses or fallback strings
        content = content.replace(/\(lang === 'ar' && ([a-zA-Z0-9_\.\?]+)\.(name|title|description|course_title|course_name|owner_name|full_name)_ar \? \1\.\2_ar : ([a-zA-Z0-9_\.\?]+)\.\2_en\)/g, '($3.$2)');
        
        // {lang === 'ar' ? obj.name_ar : obj.name_en}
        content = content.replace(/\{lang === 'ar' \? ([a-zA-Z0-9_\.\?]+)\.(name|title|description|course_title|course_name|owner_name|full_name)_ar : ([a-zA-Z0-9_\.\?]+)\.\2_en\}/g, '{$3.$2}');

        // Rename properties
        content = content.replace(/\.name_en/g, '.name');
        content = content.replace(/\.title_en/g, '.title');
        content = content.replace(/\.description_en/g, '.description');
        content = content.replace(/\.full_name_en/g, '.full_name');
        content = content.replace(/\.course_name_en/g, '.course_name');
        content = content.replace(/\.course_title_en/g, '.course_title');
        content = content.replace(/\.trainee_name_en/g, '.trainee_name');
        content = content.replace(/\.owner_name_en/g, '.owner_name');

        // Form state objects: remove _ar, rename _en
        content = content.replace(/name_en:/g, 'name:');
        content = content.replace(/name_ar:\s*['"`].*?['"`]\s*,?/g, '');
        content = content.replace(/description_en:/g, 'description:');
        content = content.replace(/description_ar:\s*['"`].*?['"`]\s*,?/g, '');
        content = content.replace(/title_en:/g, 'title:');
        content = content.replace(/title_ar:\s*['"`].*?['"`]\s*,?/g, '');
        content = content.replace(/full_name_en:/g, 'full_name:');
        content = content.replace(/full_name_ar:\s*['"`].*?['"`]\s*,?/g, '');

        // Remove Arabic UI labels for dual inputs, assuming English label now acts as unified
        // e.g. <label>{lang === 'ar' ? 'اسم الدورة (انجليزي) *' : 'Course Name (English) *'}</label> -> <label>{lang === 'ar' ? 'اسم الدورة *' : 'Course Name *'}</label>
        content = content.replace(/\(انجليزي\)/g, '');
        content = content.replace(/\(English\)/g, '');

        // Remove entire form groups that represent the Arabic input
        // This is tricky via regex, so we'll just handle the properties and let the Arabic inputs be non-functional or we can try to wipe them.
        // Actually, let's leave the UI cleanup of specific forms to manual fix since regexing JSX trees is dangerous.
    }

    // BACKEND SPECIFIC (PHP)
    if (ext === '.php') {
        // Rename keys
        content = content.replace(/name_en/g, 'name');
        content = content.replace(/name_ar/g, 'name'); // Just in case it's in SQL
        content = content.replace(/title_en/g, 'title');
        content = content.replace(/title_ar/g, 'title');
        content = content.replace(/description_en/g, 'description');
        content = content.replace(/description_ar/g, 'description');
        content = content.replace(/full_name_en/g, 'full_name');
        content = content.replace(/full_name_ar/g, 'full_name');
        content = content.replace(/course_name_en/g, 'course_name');
        content = content.replace(/course_title_en/g, 'course_title');
        content = content.replace(/trainee_name_en/g, 'trainee_name');
        content = content.replace(/owner_name_en/g, 'owner_name');

        // Fix payload parsing: $data['name_en'] ?? $data['name'] -> $data['name']
        // We will just do manual fixes for the API endpoints since there are only a few.
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

targetDirs.forEach(walkDir);
console.log("Done");

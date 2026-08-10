import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';

// To run in Node we import the legacy build
const pdfjsFilePath = 'node_modules/pdfjs-dist/legacy/build/pdf.js';
if (fs.existsSync(pdfjsFilePath)) {
    console.log('Legacy build found. We can test standard document parsing API.');
} else {
    console.log('Legacy build missing.');
}

async function testPDF() {
    try {
        // Just checking if getDocument is callable without throwing immediate reference errors
        console.log('PDFJS Version:', pdfjsLib.version);
        console.log('typeof getDocument:', typeof pdfjsLib.getDocument);

        // Let's create a tiny dummy PDF header to see what the specific error is
        // (A real PDF is needed to successfully parse, but a bad one will throw a known error, validating the library works)
        const dummyData = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10]); // %PDF-1.4\n
        const loadingTask = pdfjsLib.getDocument({ data: dummyData });

        await loadingTask.promise;
    } catch (e) {
        console.error('Expected Error (Or actual issue):', e.name, e.message);
    }
}

testPDF();

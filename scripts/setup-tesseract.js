#!/usr/bin/env node

/**
 * Script to download Tesseract.js language data files
 * This sets up the required English language data for OCR functionality
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESSDATA_URL = 'https://github.com/naptha/tessdata/raw/main/eng.traineddata';
const TESSDATA_DIR = path.join(__dirname, '..', 'public', 'tessdata');
const OUTPUT_FILE = path.join(TESSDATA_DIR, 'eng.traineddata');

console.log('Setting up Tesseract.js language data...');
console.log(`Target directory: ${TESSDATA_DIR}`);

// Create tessdata directory if it doesn't exist
if (!fs.existsSync(TESSDATA_DIR)) {
  fs.mkdirSync(TESSDATA_DIR, { recursive: true });
  console.log('Created tessdata directory');
}

// Check if file already exists
if (fs.existsSync(OUTPUT_FILE)) {
  console.log('English language data already exists, skipping download');
  process.exit(0);
}

console.log('Downloading English language data for Tesseract.js...');

// Download the file
const file = fs.createWriteStream(OUTPUT_FILE);
https.get(TESSDATA_URL, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('✅ Successfully downloaded English language data');
      console.log(`File saved to: ${OUTPUT_FILE}`);
      console.log('Tesseract.js OCR should now work correctly');
    });
  } else {
    console.error(`❌ Failed to download: HTTP ${response.statusCode}`);
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('❌ Download error:', err.message);
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE); // Clean up partial file
  }
  process.exit(1);
});
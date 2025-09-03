#!/usr/bin/env node

/**
 * U²-Net Model Setup Script
 * Downloads and validates the U²-Net model for background removal
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://github.com/xuebinqin/U-2-Net/releases/download/v0.0.1/u2net.onnx';
const MODEL_PATH = path.join(__dirname, '..', 'models', 'u2net.onnx');
const MODEL_DIR = path.dirname(MODEL_PATH);

async function downloadModel() {
    console.log('🔍 Setting up U²-Net model...');
    
    // Ensure models directory exists
    if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
        console.log('📁 Created models directory');
    }

    // Check if model already exists
    if (fs.existsSync(MODEL_PATH)) {
        const stats = fs.statSync(MODEL_PATH);
        console.log(`✅ Model already exists (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
        return true;
    }

    console.log('📥 Downloading U²-Net model (5MB)...');
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(MODEL_PATH);
        
        https.get(MODEL_URL, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                https.get(response.headers.location, (redirectResponse) => {
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('✅ Model downloaded successfully');
                        resolve(true);
                    });
                }).on('error', reject);
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('✅ Model downloaded successfully');
                    resolve(true);
                });
            }
        }).on('error', (err) => {
            fs.unlink(MODEL_PATH, () => {}); // Clean up on error
            reject(err);
        });
    });
}

async function validateModel() {
    console.log('🔍 Validating model...');
    
    if (!fs.existsSync(MODEL_PATH)) {
        throw new Error('Model file not found');
    }

    const stats = fs.statSync(MODEL_PATH);
    const expectedSize = 5 * 1024 * 1024; // ~5MB
    
    if (Math.abs(stats.size - expectedSize) > 1024 * 1024) {
        console.warn(`⚠️  Model size unexpected: ${(stats.size / 1024 / 1024).toFixed(1)}MB (expected ~5MB)`);
    } else {
        console.log(`✅ Model size valid: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
    }

    return true;
}

async function setupFallbackModel() {
    console.log('🛠️  Setting up fallback model...');
    
    // Create a simple fallback model for testing
    const fallbackPath = path.join(MODEL_DIR, 'u2net-fallback.onnx');
    
    // For now, just create a placeholder
    if (!fs.existsSync(fallbackPath)) {
        console.log('⚠️  Fallback model not implemented - will use edge detection');
    }
}

async function main() {
    try {
        console.log('🚀 U²-Net Model Setup Starting...\n');
        
        await downloadModel();
        await validateModel();
        await setupFallbackModel();
        
        console.log('\n✅ Setup complete!');
        console.log(`📍 Model location: ${MODEL_PATH}`);
        console.log('\nNext steps:');
        console.log('1. Run: npm run test:u2net');
        console.log('2. Open: src/__tests__/test-inversion-fix.html');
        console.log('3. Check: Browser console for debug output');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Alternative download URLs in case primary fails
const ALTERNATIVE_URLS = [
    'https://github.com/onnx/models/raw/main/vision/body_analysis/u2net/model/u2net.onnx',
    'https://huggingface.co/lllyasviel/ControlNet/resolve/main/models/u2net.onnx',
    'https://cdn.jsdelivr.net/npm/@xenova/u2net@latest/model.onnx'
];

async function downloadWithFallback() {
    for (const url of [MODEL_URL, ...ALTERNATIVE_URLS]) {
        try {
            console.log(`Trying: ${url}`);
            // Implementation would try each URL
            break;
        } catch (error) {
            console.log(`Failed: ${error.message}`);
        }
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { downloadModel, validateModel };
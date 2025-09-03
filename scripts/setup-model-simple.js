#!/usr/bin/env node

/**
 * Simple U²-Net Model Setup Script
 * Handles model download with proper error handling
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const MODEL_URL = 'https://github.com/xuebinqin/U-2-Net/releases/download/v0.0.1/u2net.onnx';
const MODEL_PATH = path.join(__dirname, '..', 'models', 'u2net.onnx');
const MODEL_DIR = path.dirname(MODEL_PATH);

console.log('🚀 U²-Net Model Setup');
console.log('===================');

async function ensureDirectory() {
    if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
        console.log('📁 Created models directory');
    }
}

async function checkExistingModel() {
    if (fs.existsSync(MODEL_PATH)) {
        const stats = fs.statSync(MODEL_PATH);
        console.log(`✅ Model already exists: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
        return true;
    }
    return false;
}

async function downloadWithFetch() {
    console.log('📥 Downloading U²-Net model...');
    
    try {
        // Use fetch if available (Node 18+)
        if (typeof fetch !== 'undefined') {
            const response = await fetch(MODEL_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(MODEL_PATH, Buffer.from(buffer));
            console.log('✅ Downloaded via fetch');
            return true;
        }
    } catch (error) {
        console.log('❌ Fetch failed, trying https...');
    }
    
    return downloadWithHttps();
}

async function downloadWithHttps() {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(MODEL_PATH);
        
        https.get(MODEL_URL, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                const redirectUrl = response.headers.location;
                console.log(`🔄 Following redirect to: ${redirectUrl}`);
                
                https.get(redirectUrl, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`HTTP ${redirectResponse.statusCode}`));
                        return;
                    }
                    
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('✅ Downloaded via https');
                        resolve(true);
                    });
                }).on('error', reject);
            } else if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('✅ Downloaded via https');
                    resolve(true);
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            if (fs.existsSync(MODEL_PATH)) {
                fs.unlinkSync(MODEL_PATH);
            }
            reject(err);
        });
    });
}

async function validateDownload() {
    if (!fs.existsSync(MODEL_PATH)) {
        throw new Error('Model file not found after download');
    }
    
    const stats = fs.statSync(MODEL_PATH);
    const sizeMB = stats.size / 1024 / 1024;
    
    if (sizeMB < 4 || sizeMB > 6) {
        console.warn(`⚠️  Unexpected size: ${sizeMB.toFixed(1)}MB (expected ~5MB)`);
    } else {
        console.log(`✅ Model size valid: ${sizeMB.toFixed(1)}MB`);
    }
    
    return true;
}

async function createPlaceholder() {
    // Create a simple placeholder for testing
    const placeholderPath = path.join(MODEL_DIR, 'README.md');
    const content = `# U²-Net Model

This directory should contain the U²-Net model file: u2net.onnx

## Download Instructions

### Option 1: Automated Setup
\`\`\`bash
node scripts/setup-model-simple.js
\`\`\`

### Option 2: Manual Download
1. Visit: https://github.com/xuebinqin/U-2-Net/releases
2. Download: u2net.onnx (5MB)
3. Place in: models/u2net.onnx

### Option 3: Alternative Sources
- https://huggingface.co/lllyasviel/ControlNet/resolve/main/models/u2net.onnx
- https://cdn.jsdelivr.net/npm/@xenova/u2net@latest/model.onnx

## Verification
After setup, test with:
\`\`\`bash
node -e "console.log(require('fs').existsSync('models/u2net.onnx') ? '✅ Model ready' : '❌ Model missing')"
\`\`\`
`;
    
    fs.writeFileSync(placeholderPath, content);
    console.log('📄 Created README with instructions');
}

async function main() {
    try {
        console.log('🚀 Starting U²-Net model setup...\n');
        
        await ensureDirectory();
        
        if (await checkExistingModel()) {
            console.log('\n✅ Setup complete - model already exists');
            return;
        }
        
        await downloadWithFetch();
        await validateDownload();
        await createPlaceholder();
        
        console.log('\n🎉 Setup complete!');
        console.log(`📍 Model location: ${MODEL_PATH}`);
        console.log('\n🔧 Next steps:');
        console.log('1. Test: node -e "console.log(require(\'fs\').existsSync(\'models/u2net.onnx\'))"');
        console.log('2. Debug: open src/debug/model-debug.html');
        console.log('3. Validate: npm run test:u2net');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.log('\n💡 Try manual download:');
        console.log('   1. Visit: https://github.com/xuebinqin/U-2-Net/releases');
        console.log('   2. Download: u2net.onnx');
        console.log('   3. Move to: models/u2net.onnx');
        process.exit(1);
    }
}

// Handle different Node.js versions
if (typeof globalThis.fetch === 'undefined') {
    console.log('⚠️  Node.js <18 detected, using https module');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
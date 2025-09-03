/**
 * Minimal reproduction script for U²-Net inversion testing
 * Based on the feedback approach - simple and direct
 */

import { u2NetService } from '../services/U2NetService.js';

/**
 * Quick triage test for U²-Net inversion
 * Tests the raw saliency map without any advanced processing
 */
export async function testInversionQuick(imageData) {
    console.log('=== Quick Inversion Test ===');
    
    try {
        // Initialize U²-Net
        await u2NetService.initialize();
        
        // Preprocess image
        const inputTensor = await u2NetService.preprocessImage(imageData);
        
        // Run inference
        const results = await u2NetService.session.run({ 'input': inputTensor });
        const mask = results.output.data;
        
        // --- DEBUG: Check raw saliency map ---
        const stats = mask.reduce(
            (acc, v) => {
                acc.min = Math.min(acc.min, v);
                acc.max = Math.max(acc.max, v);
                acc.sum += v;
                acc.count++;
                return acc;
            },
            { min: +Infinity, max: -Infinity, sum: 0, count: 0 }
        );
        
        const centerIdx = (320 * 320) >> 1;
        const debugInfo = {
            min: stats.min,
            max: stats.max,
            mean: stats.sum / stats.count,
            centerPixel: mask[centerIdx],
            isInverted: stats.max < 0.5
        };
        
        console.table(debugInfo);
        
        // Apply inversion fix if needed
        let correctedMask = mask;
        if (debugInfo.isInverted) {
            console.warn('Applying inversion fix: mask = 1.0 - mask');
            correctedMask = new Float32Array(mask.length);
            for (let i = 0; i < mask.length; i++) {
                correctedMask[i] = 1.0 - mask[i];
            }
        }
        
        // Simple upscale and composite
        return createSimpleComposite(imageData, correctedMask);
        
    } catch (error) {
        console.error('Inversion test failed:', error);
        throw error;
    }
}

/**
 * Create simple composite without advanced processing
 */
function createSimpleComposite(imageData, mask) {
    const { width, height } = imageData;
    
    // Upscale mask to original size
    const scaleX = width / 320;
    const scaleY = height / 320;
    const fullMask = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcX = Math.floor(x / scaleX);
            const srcY = Math.floor(y / scaleY);
            const srcIndex = srcY * 320 + srcX;
            fullMask[y * width + x] = mask[srcIndex];
        }
    }
    
    // Create result with alpha
    const result = new ImageData(width, height);
    for (let i = 0; i < width * height; i++) {
        const srcIndex = i * 4;
        const dstIndex = i * 4;
        
        // Copy RGB
        result.data[dstIndex] = imageData.data[srcIndex];
        result.data[dstIndex + 1] = imageData.data[srcIndex + 1];
        result.data[dstIndex + 2] = imageData.data[srcIndex + 2];
        
        // Set alpha from mask
        result.data[dstIndex + 3] = Math.round(Math.min(255, Math.max(0, fullMask[i] * 255)));
    }
    
    return result;
}

/**
 * Create synthetic test image for verification
 */
export function createTestImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    
    // Background (should be removed)
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, 320, 320);
    
    // Foreground subject (should be kept)
    ctx.fillStyle = '#8B4513'; // Brown (person)
    ctx.fillRect(100, 80, 120, 160);
    
    // Head
    ctx.fillStyle = '#DEB887'; // Skin tone
    ctx.beginPath();
    ctx.arc(160, 70, 30, 0, Math.PI * 2);
    ctx.fill();
    
    return ctx.getImageData(0, 0, 320, 320);
}

/**
 * Run complete inversion test suite
 */
export async function runInversionTestSuite() {
    console.log('=== Running Inversion Test Suite ===');
    
    // Test 1: Synthetic image
    console.log('Test 1: Synthetic portrait');
    const testImage = createTestImage();
    const result1 = await testInversionQuick(testImage);
    
    // Test 2: Check histogram
    const alphaValues = [];
    for (let i = 3; i < result1.data.length; i += 4) {
        alphaValues.push(result1.data[i]);
    }
    
    const histogram = new Array(256).fill(0);
    alphaValues.forEach(val => histogram[val]++);
    
    const fgPixels = alphaValues.filter(a => a > 200).length;
    const bgPixels = alphaValues.filter(a => a < 50).length;
    const totalPixels = alphaValues.length;
    
    console.log('Histogram analysis:', {
        foregroundRatio: fgPixels / totalPixels,
        backgroundRatio: bgPixels / totalPixels,
        bimodal: histogram[0] > 0 && histogram[255] > 0
    });
    
    // Test 3: Visual verification
    console.log('Test complete - check visual results');
    
    return {
        testImage,
        result: result1,
        histogram,
        fgRatio: fgPixels / totalPixels,
        bgRatio: bgPixels / totalPixels
    };
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.runInversionTest = runInversionTestSuite;
    window.testInversionQuick = testInversionQuick;
    window.createTestImage = createTestImage;
}
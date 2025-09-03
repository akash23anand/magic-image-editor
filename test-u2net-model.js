#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { U2NetService } = require('./src/services/U2NetService.js');

async function testModel() {
    console.log('🚀 Testing U²-Net model...');
    
    try {
        const service = new U2NetService();
        await service.initialize();
        console.log('✅ Model loaded successfully');
        
        // Create synthetic test image
        const canvas = createCanvas(320, 320);
        const ctx = canvas.getContext('2d');
        
        // Test pattern: white circle on black background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 320, 320);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(160, 160, 80, 0, Math.PI * 2);
        ctx.fill();
        
        const imageData = ctx.getImageData(0, 0, 320, 320);
        console.log('✅ Test image created');
        
        // Test background removal
        const result = await service.removeBackground(imageData, {
            sensitivity: 0.5,
            edgeFeather: 2,
            preserveEdges: true
        });
        
        console.log('✅ Background removal completed');
        console.log('📊 Result dimensions:', result.imageData.width, 'x', result.imageData.height);
        
        // Analyze alpha values
        const alphaValues = [];
        for (let i = 3; i < result.imageData.data.length; i += 4) {
            alphaValues.push(result.imageData.data[i]);
        }
        
        const avgAlpha = alphaValues.reduce((a, b) => a + b, 0) / alphaValues.length;
        const fgPixels = alphaValues.filter(a => a > 200).length;
        const bgPixels = alphaValues.filter(a => a < 50).length;
        
        console.log('📈 Alpha analysis:');
        console.log('  Average alpha:', avgAlpha.toFixed(2));
        console.log('  Foreground pixels:', (fgPixels/alphaValues.length*100).toFixed(1) + '%');
        console.log('  Background pixels:', (bgPixels/alphaValues.length*100).toFixed(1) + '%');
        
        // Test center vs edge
        const centerAlpha = result.imageData.data[((160*320+160)*4)+3];
        const edgeAlpha = result.imageData.data[((50*320+50)*4)+3];
        
        console.log('🎯 Validation:');
        console.log('  Center alpha (should be 255):', centerAlpha);
        console.log('  Edge alpha (should be 0):', edgeAlpha);
        
        if (centerAlpha > 200 && edgeAlpha < 50) {
            console.log('🎉 Model working correctly!');
        } else {
            console.log('⚠️ Model may need adjustment');
        }
        
        // Test sensitivity variations
        console.log('\n🔍 Testing sensitivity variations...');
        for (const sensitivity of [0.1, 0.5, 0.9]) {
            const result = await service.removeBackground(imageData, { sensitivity });
            const alphas = [];
            for (let i = 3; i < result.imageData.data.length; i += 4) {
                alphas.push(result.imageData.data[i]);
            }
            const avg = alphas.reduce((a, b) => a + b, 0) / alphas.length;
            console.log(`  Sensitivity ${sensitivity}: avg alpha = ${avg.toFixed(2)}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testModel();
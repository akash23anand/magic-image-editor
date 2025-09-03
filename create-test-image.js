const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas
const canvas = createCanvas(600, 400);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, 600, 400);

// Draw some objects to test magic grab
// Red circle
ctx.fillStyle = '#ff6b6b';
ctx.beginPath();
ctx.arc(200, 200, 80, 0, Math.PI * 2);
ctx.fill();

// Blue rectangle
ctx.fillStyle = '#4ecdc4';
ctx.fillRect(350, 150, 100, 100);

// Yellow triangle
ctx.fillStyle = '#ffe66d';
ctx.beginPath();
ctx.moveTo(150, 350);
ctx.lineTo(250, 350);
ctx.lineTo(200, 280);
ctx.closePath();
ctx.fill();

// Green ellipse
ctx.fillStyle = '#a8e6cf';
ctx.beginPath();
ctx.ellipse(450, 300, 60, 40, 0, 0, Math.PI * 2);
ctx.fill();

// Add text
ctx.fillStyle = '#333';
ctx.font = '24px Arial';
ctx.textAlign = 'center';
ctx.fillText('Test Objects for Magic Grab', 300, 50);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/test-objects.png', buffer);

console.log('Test image created: public/test-objects.png');
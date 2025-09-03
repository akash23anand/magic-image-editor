import { u2NetService } from '../services/U2NetService';
import { tesseractService } from '../services/TesseractService';
import { samService } from '../services/SAMService';

describe('AI Services', () => {
  // Create a simple test image
  const createTestImageData = (width: number = 100, height: number = 100): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Create a simple pattern with text
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Add some black text
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('TEST', 20, 50);
    
    // Add a colored rectangle
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 30, 30);
    
    return ctx.getImageData(0, 0, width, height);
  };

  test('U2NetService should process image', async () => {
    const imageData = createTestImageData();
    const result = await u2NetService.removeBackground(imageData);
    
    expect(result.imageData).toBeDefined();
    expect(result.imageData.width).toBe(imageData.width);
    expect(result.imageData.height).toBe(imageData.height);
    expect(result.metadata).toBeDefined();
  });

  test('TesseractService should extract text', async () => {
    const imageData = createTestImageData();
    const result = await tesseractService.extractText(imageData);
    
    expect(result.imageData).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  test('SAMService should segment object', async () => {
    const imageData = createTestImageData();
    const result = await samService.segmentObject(imageData, { x: 50, y: 50 });
    
    expect(result.imageData).toBeDefined();
    expect(result.mask).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});
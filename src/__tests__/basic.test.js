/**
 * Basic test to verify Jest setup
 */

describe('Basic Test Suite', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

describe('Layer Anything Core Concepts', () => {
  test('should validate layer metadata structure', () => {
    const layerMeta = {
      id: 'layer-1',
      type: 'text',
      bbox: { x: 0, y: 0, width: 100, height: 50 },
      confidence: 0.95,
      timestamp: Date.now()
    };

    expect(layerMeta).toHaveProperty('id');
    expect(layerMeta).toHaveProperty('type');
    expect(layerMeta).toHaveProperty('bbox');
    expect(layerMeta.confidence).toBeGreaterThan(0);
    expect(layerMeta.confidence).toBeLessThanOrEqual(1);
  });

  test('should validate coordinate transformation', () => {
    const canvasCoords = { x: 100, y: 200 };
    const scale = 0.5;
    const offset = { x: 10, y: 20 };

    const imageCoords = {
      x: (canvasCoords.x - offset.x) / scale,
      y: (canvasCoords.y - offset.y) / scale
    };

    expect(imageCoords.x).toBe(180);
    expect(imageCoords.y).toBe(360);
  });

  test('should validate RLE mask encoding concept', () => {
    const mask = [1, 1, 0, 0, 1, 1, 1, 0];
    const rle = [];
    
    let current = mask[0];
    let count = 1;
    
    for (let i = 1; i < mask.length; i++) {
      if (mask[i] === current) {
        count++;
      } else {
        rle.push(count);
        current = mask[i];
        count = 1;
      }
    }
    rle.push(count);

    expect(rle).toEqual([2, 2, 3, 1]);
  });
});
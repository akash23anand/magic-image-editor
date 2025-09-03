import { 
  calculateTransform, 
  canvasToImage, 
  imageToCanvas,
  c2i,
  i2c,
  canvasRectToImage,
  imageRectToCanvas
} from '../utils/CoordinateHelpers';

describe('CoordinateHelpers', () => {
  describe('round-trip coordinate transformation', () => {
    it('should have less than 1px error for point transformations', () => {
      const transform = calculateTransform(
        { width: 1920, height: 1080 },
        { width: 800, height: 600 }
      );

      // Test various points
      const testPoints = [
        { x: 130, y: 738 }, // User's reported coordinates
        { x: 0, y: 0 },
        { x: 400, y: 300 },
        { x: 800, y: 600 },
        { x: transform.offsetX, y: transform.offsetY },
        { x: transform.offsetX + 100, y: transform.offsetY + 100 }
      ];

      testPoints.forEach(canvasPoint => {
        // Canvas -> Image -> Canvas
        const imagePoint = c2i(canvasPoint, transform);
        const backToCanvas = i2c(imagePoint, transform);

        const errorX = Math.abs(backToCanvas.x - canvasPoint.x);
        const errorY = Math.abs(backToCanvas.y - canvasPoint.y);

        expect(errorX).toBeLessThan(1);
        expect(errorY).toBeLessThan(1);
      });
    });

    it('should have less than 1px error for rectangle transformations', () => {
      const transform = calculateTransform(
        { width: 1920, height: 1080 },
        { width: 800, height: 600 }
      );

      const canvasRect = { x: 130, y: 738, width: 200, height: 50 };
      
      // Canvas -> Image -> Canvas
      const imageRect = canvasRectToImage(canvasRect, transform);
      const backToCanvas = imageRectToCanvas(imageRect, transform);

      expect(Math.abs(backToCanvas.x - canvasRect.x)).toBeLessThan(1);
      expect(Math.abs(backToCanvas.y - canvasRect.y)).toBeLessThan(1);
      expect(Math.abs(backToCanvas.width - canvasRect.width)).toBeLessThan(1);
      expect(Math.abs(backToCanvas.height - canvasRect.height)).toBeLessThan(1);
    });

    it('should correctly handle tweet screenshot dimensions', () => {
      // Typical tweet screenshot dimensions
      const transform = calculateTransform(
        { width: 1170, height: 2532 }, // iPhone screenshot
        { width: 800, height: 600 }
      );

      // Third paragraph selection at y ≈ 730
      const canvasSelection = { x: 130, y: 730, width: 540, height: 60 };
      const imageSelection = canvasRectToImage(canvasSelection, transform);

      // The image coordinates should be scaled up
      expect(imageSelection.width).toBeGreaterThan(canvasSelection.width);
      expect(imageSelection.height).toBeGreaterThan(canvasSelection.height);

      // Round trip should be accurate
      const backToCanvas = imageRectToCanvas(imageSelection, transform);
      expect(Math.abs(backToCanvas.y - canvasSelection.y)).toBeLessThan(1);
    });
  });

  describe('transform calculation', () => {
    it('should center image in canvas', () => {
      const transform = calculateTransform(
        { width: 1000, height: 1000 },
        { width: 800, height: 600 }
      );

      // Image should be scaled to fit height (600/1000 = 0.6)
      expect(transform.scale).toBe(0.6);
      
      // Width after scaling: 1000 * 0.6 = 600
      // Horizontal offset: (800 - 600) / 2 = 100
      expect(transform.offsetX).toBe(100);
      
      // Height fills canvas, so no vertical offset
      expect(transform.offsetY).toBe(0);
    });
  });

  describe('fuzz test for various canvas heights', () => {
    it('should have round-trip error ≤ 1px for random points at different canvas heights', () => {
      // Test canvas heights from 450 to 900
      for (let canvasHeight = 450; canvasHeight <= 900; canvasHeight += 50) {
        const canvasWidth = Math.round(canvasHeight * 1.33); // 4:3 aspect ratio
        
        const transform = calculateTransform(
          { width: 1920, height: 1080 },
          { width: canvasWidth, height: canvasHeight }
        );

        // Test 10 random points for each canvas size
        for (let i = 0; i < 10; i++) {
          const randomCanvasPoint = {
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight
          };

          // Canvas -> Image -> Canvas
          const imagePoint = c2i(randomCanvasPoint, transform);
          const backToCanvas = i2c(imagePoint, transform);

          const errorX = Math.abs(backToCanvas.x - randomCanvasPoint.x);
          const errorY = Math.abs(backToCanvas.y - randomCanvasPoint.y);

          expect(errorX).toBeLessThanOrEqual(1);
          expect(errorY).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
/**
 * Simple compositing utilities for background removal
 */

/**
 * Compose RGBA image using source-over compositing
 * @param rgba - Original RGBA data (Uint8ClampedArray)
 * @param alpha - Alpha mask (Float32Array 0..1)
 * @param width - Image width
 * @param height - Image height
 * @returns Composited RGBA data
 */
export function composeWithSourceOver(
  rgba: Uint8ClampedArray,
  alpha: Float32Array,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  
  for (let i = 0; i < width * height; i++) {
    const a = Math.max(0, Math.min(1, alpha[i]));
    const j = i * 4;
    
    // Copy RGB values unchanged
    out[j + 0] = rgba[j + 0];
    out[j + 1] = rgba[j + 1];
    out[j + 2] = rgba[j + 2];
    
    // Set alpha only
    out[j + 3] = Math.round(a * 255);
  }
  
  return out;
}

/**
 * Apply alpha mask to canvas using source-over compositing
 * @param ctx - Canvas 2D context
 * @param imageData - Original image data
 * @param alpha - Alpha mask (Float32Array 0..1)
 */
export function applyAlphaToCanvas(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  alpha: Float32Array
): void {
  const width = imageData.width;
  const height = imageData.height;
  
  // Create composited image data
  const composited = composeWithSourceOver(
    imageData.data,
    alpha,
    width,
    height
  );
  
  // Apply using source-over compositing
  ctx.globalCompositeOperation = 'source-over';
  ctx.putImageData(new ImageData(composited, width, height), 0, 0);
}
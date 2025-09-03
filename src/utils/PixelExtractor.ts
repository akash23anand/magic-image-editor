/**
 * PixelExtractor
 * Utilities for extracting pixels into independent canvases and filling background holes
 * used by Layer Anything flows.
 */

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedLayer {
  imageData: ImageData;
  bbox: BBox;
  mask?: ImageData;
}

type FillMethod = 'transparent' | 'blur' | 'color';

/**
 * Create a crude text mask by thresholding alpha or high-contrast pixels within the bbox region.
 * This is a heuristic placeholder until better OCR-guided masks are available.
 */
export function createTextMask(regionImageData: ImageData, bbox: BBox): ImageData {
  const { width, height, data } = regionImageData;
  const mask = new ImageData(width, height);

  // Simple luminance/contrast threshold
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    // Compute luminance
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Heuristic: mark stronger strokes as mask
    // Rule: visible alpha and dark-ish or bright-ish compared to mid
    const isInk = a > 16 && (y < 90 || y > 200);
    mask.data[i] = 255;
    mask.data[i + 1] = 255;
    mask.data[i + 2] = 255;
    mask.data[i + 3] = isInk ? 255 : 0;
  }

  return mask;
}

/**
 * Convert a simple RLE mask format to ImageData. Expected format is an array of runs:
 * [{start: number, length: number}] over a width*height raster. If your segmentation service
 * uses a different structure, adapt this converter accordingly.
 */
export function rleMaskToImageData(rle: any): ImageData {
  // Support multiple RLE shapes:
  //  A) { width, height, runs: [{start, length}] | [start,len,...] }
  //  B) { counts: number[], size: [width, height] }  // our SAM-style RLE

  // Form B: counts + size (toggle runs)
  if (Array.isArray(rle?.size) && Array.isArray(rle?.counts)) {
    const [width, height] = rle.size as [number, number];
    const counts: number[] = rle.counts as number[];
    const imageData = new ImageData(width, height);
    const { data } = imageData;

    let pixelIndex = 0;
    let value = 0; // start with zeros
    for (let i = 0; i < counts.length; i++) {
      const run = counts[i] | 0;
      const alpha = value ? 255 : 0;
      for (let j = 0; j < run; j++) {
        if (pixelIndex >= width * height) break;
        const di = pixelIndex * 4;
        data[di] = 255;
        data[di + 1] = 255;
        data[di + 2] = 255;
        data[di + 3] = alpha;
        pixelIndex++;
      }
      value = 1 - value; // toggle
    }
    return imageData;
  }

  // Form A and fallbacks
  const width = rle?.width ?? rle?.w ?? rle?.cols;
  const height = rle?.height ?? rle?.h ?? rle?.rows;
  const runs = rle?.runs ?? rle?.data ?? rle;

  if (!width || !height || !Array.isArray(runs)) {
    return new ImageData(1, 1);
  }

  const mask = new ImageData(width, height);
  for (let i = 0; i < mask.data.length; i += 4) {
    mask.data[i] = 255;
    mask.data[i + 1] = 255;
    mask.data[i + 2] = 255;
    mask.data[i + 3] = 0;
  }

  if (runs.length && typeof runs[0] === 'object' && runs[0] !== null && 'start' in runs[0]) {
    for (const run of runs) {
      const start = run.start | 0;
      const len = run.length | 0;
      for (let i = start; i < start + len; i++) {
        const idx = i * 4;
        if (idx + 3 < mask.data.length) mask.data[idx + 3] = 255;
      }
    }
  } else {
    for (let k = 0; k + 1 < runs.length; k += 2) {
      const start = runs[k] | 0;
      const len = runs[k + 1] | 0;
      for (let i = start; i < start + len; i++) {
        const idx = i * 4;
        if (idx + 3 < mask.data.length) mask.data[idx + 3] = 255;
      }
    }
  }

  return mask;
}

/**
 * Crop an ImageData (typically a mask) to the given bbox region.
 * Returns a new ImageData with width=bbox.width and height=bbox.height.
 */
export function cropImageData(src: ImageData, bbox: BBox): ImageData {
  const { x, y, width, height } = bbox;
  const dst = new ImageData(width, height);
  const srcW = src.width;
  const srcH = src.height;

  for (let j = 0; j < height; j++) {
    const sy = y + j;
    if (sy < 0 || sy >= srcH) continue;
    for (let i = 0; i < width; i++) {
      const sx = x + i;
      if (sx < 0 || sx >= srcW) continue;
      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (j * width + i) * 4;
      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  return dst;
}

/**
 * Scale an ImageData by a scalar factor using canvas drawImage.
 * Returns a new ImageData with rounded dimensions.
 */
export function scaleImageData(src: ImageData, scale: number): ImageData {
  const sw = src.width;
  const sh = src.height;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  // Put source into a temp canvas
  const temp = document.createElement('canvas');
  temp.width = sw;
  temp.height = sh;
  const tctx = temp.getContext('2d');
  if (!tctx) return src;
  tctx.putImageData(src, 0, 0);

  // Draw scaled onto destination
  const out = document.createElement('canvas');
  out.width = dw;
  out.height = dh;
  const octx = out.getContext('2d');
  if (!octx) return src;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(temp, 0, 0, sw, sh, 0, 0, dw, dh);
  return octx.getImageData(0, 0, dw, dh);
}

/**
 * Extract a region from the source canvas into a new ImageData, optionally applying a mask.
 * Returns the extracted ImageData with its bbox. The sourceCanvas is not modified here.
 */
export function extractLayer(
  sourceCanvas: HTMLCanvasElement,
  bbox: BBox,
  mask?: ImageData
): ExtractedLayer {
  const { x, y, width, height } = bbox;
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) throw new Error('extractLayer: 2D context not available');

  // Clamp bbox to canvas
  const clamped = clampBBoxToCanvas(bbox, sourceCanvas.width, sourceCanvas.height);
  if (clamped.width <= 0 || clamped.height <= 0) {
    return {
      imageData: new ImageData(1, 1),
      bbox: { x: x, y: y, width: 0, height: 0 },
      mask
    };
  }

  const region = ctx.getImageData(clamped.x, clamped.y, clamped.width, clamped.height);

  if (mask && (mask.width !== clamped.width || mask.height !== clamped.height)) {
    // Resize mask to region size if necessary using nearest-neighbor
    mask = resizeMaskNearest(mask, clamped.width, clamped.height);
  }

  if (mask) {
    // Apply mask: zero alpha where mask alpha is 0
    for (let i = 0; i < region.data.length; i += 4) {
      const aMask = mask.data[i + 3];
      if (aMask === 0) {
        region.data[i + 3] = 0;
      }
    }
  }

  return {
    imageData: region,
    bbox: clamped,
    mask
  };
}

/**
 * Fill the extracted region area in the source canvas to avoid duplicates underneath the new layer.
 * Supports 'transparent' and 'blur'. Color fill can be added as needed.
 */
export function fillExtractedRegion(
  sourceCanvas: HTMLCanvasElement,
  bbox: BBox,
  method: FillMethod = 'transparent',
  options?: { blurRadius?: number; color?: string }
): void {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return;

  const { x, y, width, height } = clampBBoxToCanvas(bbox, sourceCanvas.width, sourceCanvas.height);
  if (width <= 0 || height <= 0) return;

  switch (method) {
    case 'transparent': {
      ctx.clearRect(x, y, width, height);
      break;
    }
    case 'blur': {
      // Extract the region, blur it on an offscreen, and put back to soften the hole
      const region = ctx.getImageData(x, y, width, height);
      const blurred = blurImageData(region, options?.blurRadius ?? 6);
      ctx.putImageData(blurred, x, y);
      break;
    }
    case 'color': {
      ctx.save();
      ctx.fillStyle = options?.color ?? 'rgba(0,0,0,0)';
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      break;
    }
  }
}

/**
 * Helpers
 */

function clampBBoxToCanvas(b: BBox, W: number, H: number): BBox {
  const x = Math.max(0, Math.min(W, b.x | 0));
  const y = Math.max(0, Math.min(H, b.y | 0));
  const width = Math.max(0, Math.min(W - x, b.width | 0));
  const height = Math.max(0, Math.min(H - y, b.height | 0));
  return { x, y, width, height };
}

function resizeMaskNearest(src: ImageData, dstW: number, dstH: number): ImageData {
  const dst = new ImageData(dstW, dstH);
  const sx = src.width / dstW;
  const sy = src.height / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(src.width - 1, Math.max(0, Math.round(x * sx)));
      const srcY = Math.min(src.height - 1, Math.max(0, Math.round(y * sy)));
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;
      dst.data[dstIdx] = 255;
      dst.data[dstIdx + 1] = 255;
      dst.data[dstIdx + 2] = 255;
      dst.data[dstIdx + 3] = src.data[srcIdx + 3] > 127 ? 255 : 0;
    }
  }
  return dst;
}

function blurImageData(src: ImageData, radius: number): ImageData {
  // Simple separable box blur; adequate as a visual fill to avoid harsh holes
  const r = Math.max(1, Math.min(32, Math.floor(radius)));
  if (r === 0) return src;

  const { width, height, data } = src;
  const tmp = new Uint8ClampedArray(data.length);
  const out = new ImageData(width, height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let rs = 0, gs = 0, bs = 0, as = 0, count = 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.max(0, Math.min(width - 1, x + k));
        const idx = ((row + xx) * 4);
        rs += data[idx];
        gs += data[idx + 1];
        bs += data[idx + 2];
        as += data[idx + 3];
        count++;
      }
      const di = ((row + x) * 4);
      tmp[di] = rs / count;
      tmp[di + 1] = gs / count;
      tmp[di + 2] = bs / count;
      tmp[di + 3] = as / count;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rs = 0, gs = 0, bs = 0, as = 0, count = 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.max(0, Math.min(height - 1, y + k));
        const idx = ((yy * width + x) * 4);
        rs += tmp[idx];
        gs += tmp[idx + 1];
        bs += tmp[idx + 2];
        as += tmp[idx + 3];
        count++;
      }
      const di = ((y * width + x) * 4);
      out.data[di] = rs / count;
      out.data[di + 1] = gs / count;
      out.data[di + 2] = bs / count;
      out.data[di + 3] = as / count;
    }
  }

  return out;
}

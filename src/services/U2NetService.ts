/**
 * U²-Net Background Removal Service
 * Lightweight saliency-segmentation model (5MB) for high-quality alpha masks
 * Based on: https://github.com/xuebinqin/U-2-Net
 */

import { ProcessingResult } from './AIService';
import { e2eLogger } from '../utils/E2ELogger';
import { ort } from '../ort-env'; // Import from our configured ort-env

export class U2NetService {
  private session: any = null;
  private modelPath: string;

  constructor(modelPath: string = '/models/u2net.onnx') {
    this.modelPath = modelPath;
  }

  async initialize() {
    if (this.session) return;

    try {
      console.log('[U2Net] Initializing with WASM execution provider...');
      console.log('[U2Net] Model path:', this.modelPath);
      
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['wasm'], // Force WASM for debugging
      });
      
      console.log('[U2Net] Model loaded successfully');
      console.log('[U2Net] Execution providers:', (this.session as any).executionProvider);
      console.log('[U2Net] Input names:', this.session.inputNames);
      console.log('[U2Net] Output names:', this.session.outputNames);
      
      e2eLogger.info('U2NetService', 'initialize_complete', {
        modelPath: this.modelPath,
        executionProviders: (this.session as any).executionProvider,
        inputNames: this.session.inputNames,
        outputNames: this.session.outputNames
      });
    } catch (error) {
      console.error('[U2Net] Failed to load model:', error);
      e2eLogger.error('U2NetService', 'initialize_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`U²-Net model initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async removeBackground(
    imageData: ImageData,
    options: { sensitivity?: number; edgeFeather?: number; preserveEdges?: boolean } = {}
  ): Promise<ProcessingResult> {
    const {
      sensitivity = 0.5,
      edgeFeather = 2,
      preserveEdges = true
    } = options;

    console.log('=== U2NetService.removeBackground() ===');
    console.log('INPUT DETAILS:', {
      imageSize: `${imageData.width}x${imageData.height}`,
      dataLength: imageData.data.length
    });
    console.log('PARAMETERS:', { sensitivity, edgeFeather, preserveEdges });

    e2eLogger.info('U2NetService', 'removeBackground_start', {
      width: imageData.width,
      height: imageData.height,
      sensitivity,
      edgeFeather,
      preserveEdges
    });
    
    try {
      await this.initialize();
      
      // Preprocess image for U²-Net
      const inputTensor = await this.preprocessImage(imageData);
      
      console.group('🤖 U2Net Model Execution');
      console.log('Model inputs:', {
        inputNames: this.session.inputNames,
        outputNames: this.session.outputNames,
        executionProviders: (this.session as any).executionProvider
      });
      
      // Run inference
      const startTime = performance.now();
      const results = await this.session.run({ [this.session.inputNames[0]]: inputTensor });
      const inferenceTime = performance.now() - startTime;
      
      console.log('Raw outputs:', Object.keys(results));
      
      // Select 'd0' explicitly
      const outName = (results as any)['d0'] ? 'd0'
                   : (results as any)['output'] ? 'output'
                   : this.session.outputNames.find((n: string) => /d0/i.test(n)) || this.session.outputNames[0];
      const sal = results[outName] as any;
      
      console.log('Selected output:', {
        name: outName,
        dims: sal.dims,
        type: sal.type,
        dataLength: sal.data.length,
        inferenceTime: `${inferenceTime.toFixed(2)}ms`
      });
      
      // Detailed analysis of output
      const arr = sal.data as Float32Array;
      const stats = {
        min: Math.min(...arr),
        max: Math.max(...arr),
        mean: arr.reduce((a, b) => a + b, 0) / arr.length
      };
      
      console.table({
        'Saliency Stats': stats,
        'Foreground Check': stats.max > 0.5 ? '✅ Likely correct' : '⚠️ May be inverted'
      });
      
      console.groupEnd();
      
      const mask = arr;

      // Post-process mask
      const alphaMask = this.createAlphaMask(
        mask,
        imageData.width,
        imageData.height,
        sensitivity,
        edgeFeather,
        preserveEdges
      );
      
      // Apply mask to original image
      const processedImage = this.applyAlphaMask(imageData, alphaMask);

      e2eLogger.info('U2NetService', 'removeBackground_complete', {
        model: 'U²-Net',
        sensitivity,
        edgeFeather,
        preserveEdges,
        inferenceTime: Date.now()
      });

      const output = {
        imageData: processedImage,
        metadata: {
          model: 'U²-Net',
          sensitivity,
          edgeFeather,
          preserveEdges,
          inferenceTime: Date.now()
        }
      };
      
      console.log('OUTPUT DETAILS:', {
        resultSize: `${output.imageData.width}x${output.imageData.height}`
      });
      
      return output;
    } catch (error) {
      e2eLogger.warn('U2NetService', 'removeBackground_fallback', {
        error: error instanceof Error ? error.message : String(error)
      });
      console.warn('U²-Net failed, using fallback background removal:', error);
      
      // Fallback: simple background removal
      return this.fallbackBackgroundRemoval(imageData);
    }
  }

  private async preprocessImage(imageData: ImageData): Promise<any> {
    const { width, height, data } = imageData;
    
    console.log('Preprocessing image:', { width, height });
    
    // Resize to 320x320 (U²-Net input size)
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, 320, 320);
    const resizedData = ctx.getImageData(0, 0, 320, 320);
    
    // Use CHW packing
    const chwData = this.packToCHW(resizedData);
    const input = new ort.Tensor('float32', chwData, [1, 3, 320, 320]);
    
    return input;
  }

  private packToCHW(imgData: ImageData): Float32Array {
    const { data, width: W, height: H } = imgData;
    const out = new Float32Array(3 * H * W);
    let p = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++, p += 4) {
        const i = y * W + x;
        out[0 * H * W + i] = data[p] / 255;
        out[1 * H * W + i] = data[p + 1] / 255;
        out[2 * H * W + i] = data[p + 2] / 255;
      }
    }
    return out;
  }

  private createAlphaMask(
    maskData: Float32Array,
    width: number,
    height: number,
    sensitivity: number,
    edgeFeather: number,
    preserveEdges: boolean
  ): Uint8ClampedArray {
    // Resize mask to original dimensions
    const scaleX = width / 320;
    const scaleY = height / 320;
    const fullMask = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x / scaleX);
        const srcY = Math.floor(y / scaleY);
        const srcIndex = srcY * 320 + srcX;
        fullMask[y * width + x] = maskData[srcIndex];
      }
    }
    
    // Check for inversion
    const stats = fullMask.reduce(
      (acc, v) => {
        acc.min = Math.min(acc.min, v);
        acc.max = Math.max(acc.max, v);
        acc.sum += v;
        acc.count++;
        return acc;
      },
      { min: +Infinity, max: -Infinity, sum: 0, count: 0 }
    );
    
    console.table({
      min: stats.min,
      max: stats.max,
      mean: stats.sum / stats.count,
      isInverted: stats.max < 0.5
    });
    
    // Fix inversion if detected
    let correctedMask = fullMask;
    if (stats.max < 0.5) {
      console.warn('Detected inverted saliency map - applying inversion fix');
      correctedMask = new Float32Array(fullMask.length);
      for (let i = 0; i < fullMask.length; i++) {
        correctedMask[i] = 1.0 - fullMask[i];
      }
    }
    
    // Apply sensitivity-based thresholding with proper range mapping
    const threshold = 1.0 - sensitivity; // sensitivity 0.0 = strict, 1.0 = lenient
    const alpha = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < correctedMask.length; i++) {
      // Apply threshold based on sensitivity
      const maskValue = correctedMask[i];
      let alphaValue = 0;
      
      if (sensitivity <= 0.1) {
        // Very strict - only high confidence foreground
        alphaValue = maskValue > 0.8 ? 255 : 0;
      } else if (sensitivity >= 0.9) {
        // Very lenient - include more as foreground
        alphaValue = maskValue > 0.2 ? 255 : 0;
      } else {
        // Linear interpolation between 0.2 and 0.8
        const thresholdValue = 0.8 - (sensitivity * 0.6);
        alphaValue = maskValue > thresholdValue ? 255 : 0;
      }
      
      // Apply feathering for smoother edges
      if (edgeFeather > 0 && preserveEdges) {
        alpha[i] = Math.round(Math.min(255, Math.max(0, maskValue * 255)));
      } else {
        alpha[i] = alphaValue;
      }
    }
    
    return alpha;
  }

  private applyAlphaMask(imageData: ImageData, alphaMask: Uint8ClampedArray): ImageData {
    const { width, height, data } = imageData;
    const result = new ImageData(width, height);
    
    for (let i = 0; i < width * height; i++) {
      const srcIndex = i * 4;
      const dstIndex = i * 4;
      
      // Copy RGB values
      result.data[dstIndex] = data[srcIndex];
      result.data[dstIndex + 1] = data[srcIndex + 1];
      result.data[dstIndex + 2] = data[srcIndex + 2];
      
      // Apply alpha from mask
      result.data[dstIndex + 3] = alphaMask[i];
    }
    
    return result;
  }

  private async fallbackBackgroundRemoval(imageData: ImageData): Promise<ProcessingResult> {
    const { width, height, data } = imageData;
    const result = new ImageData(width, height);
    
    // Simple edge-based background removal
    const threshold = 30;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxUp = ((y - 1) * width + x) * 4;
        const idxDown = ((y + 1) * width + x) * 4;
        const idxLeft = (y * width + (x - 1)) * 4;
        const idxRight = (y * width + (x + 1)) * 4;
        
        // Calculate edge strength
        const rDiff = Math.abs(data[idx] - data[idxUp]) + Math.abs(data[idx] - data[idxDown]) +
                     Math.abs(data[idx] - data[idxLeft]) + Math.abs(data[idx] - data[idxRight]);
        
        const gDiff = Math.abs(data[idx + 1] - data[idxUp + 1]) + Math.abs(data[idx + 1] - data[idxDown + 1]) +
                     Math.abs(data[idx + 1] - data[idxLeft + 1]) + Math.abs(data[idx + 1] - data[idxRight + 1]);
        
        const bDiff = Math.abs(data[idx + 2] - data[idxUp + 2]) + Math.abs(data[idx + 2] - data[idxDown + 2]) +
                     Math.abs(data[idx + 2] - data[idxLeft + 2]) + Math.abs(data[idx + 2] - data[idxRight + 2]);
        
        const edgeStrength = (rDiff + gDiff + bDiff) / 3;
        
        // Copy RGB values
        result.data[idx] = data[idx];
        result.data[idx + 1] = data[idx + 1];
        result.data[idx + 2] = data[idx + 2];
        
        // Set alpha based on edge strength
        result.data[idx + 3] = edgeStrength < threshold ? 0 : 255;
      }
    }
    
    return {
      imageData: result,
      metadata: {
        model: 'U²-Net (fallback)',
        method: 'edge-based segmentation',
        inferenceTime: Date.now()
      }
    };
  }
}

// Export singleton
export const u2NetService = new U2NetService();
/**
 * Enhanced Segmentation Service for Layer Anything
 * Integrates SAM, Grounding DINO, and advanced segmentation techniques
 */

import { e2eLogger } from '../utils/E2ELogger';
import { BBox, RLE, SegmentationResult, DetectionResult } from './LayerAnythingEngine';
import { samService } from './SAMService';

export interface SegmentPrompt {
  type: 'point' | 'box' | 'mask';
  data: Point[] | BBox | RLE;
  label?: 1 | 0; // Positive/negative for points
}

export interface Point {
  x: number;
  y: number;
}

export interface SegmentationOptions {
  multimask?: boolean;
  returnLogits?: boolean;
  sensitivity?: number;
  edgeRefinement?: boolean;
  featherAmount?: number;
  morphologicalClose?: number;
}

export interface DetectionConfig {
  labels: string[];
  threshold?: number;
  maxDetections?: number;
}

export class SegmentationService {
  private isInitialized = false;
  private serverEndpoint = 'http://localhost:7860/api/segment';

  constructor() {
    e2eLogger.info('SegmentationService', 'constructor');
  }

  /**
   * Initialize the segmentation service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      e2eLogger.info('SegmentationService', 'initialize_start');

      // Initialize SAM service
      await samService.initialize();

      this.isInitialized = true;
      e2eLogger.info('SegmentationService', 'initialize_complete');
    } catch (error) {
      e2eLogger.error('SegmentationService', 'initialize_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Segmentation service initialization failed: ${error}`);
    }
  }

  /**
   * Interactive segmentation using SAM
   */
  async segment(
    image: ImageBitmap | ImageData,
    prompt: SegmentPrompt,
    options: SegmentationOptions = {}
  ): Promise<SegmentationResult> {
    await this.initialize();

    const startTime = performance.now();
    e2eLogger.info('SegmentationService', 'segment_start', {
      promptType: prompt.type,
      options
    });

    try {
      // Convert ImageBitmap to ImageData if needed
      const imageData = await this.ensureImageData(image);

      // Use existing SAM service for segmentation
      let samPrompt: any;
      
      if (prompt.type === 'point') {
        const points = prompt.data as Point[];
        samPrompt = points[0]; // Use first point for now
      } else if (prompt.type === 'box') {
        samPrompt = prompt.data as BBox;
      } else {
        throw new Error('Mask prompts not yet supported');
      }

      const samResult = await samService.segmentObject(imageData, samPrompt, {
        sensitivity: options.sensitivity,
        edgeRefinement: options.edgeRefinement,
        featherAmount: options.featherAmount
      });

      // Convert result to our format
      const mask = this.imageDataToRLE(samResult.mask);
      const bbox = this.calculateBoundingBox(samResult.mask);
      const area = this.calculateMaskArea(samResult.mask);

      const processingTime = performance.now() - startTime;

      const result: SegmentationResult = {
        masks: [{
          mask,
          bbox,
          area,
          confidence: 0.8 // Default confidence from SAM
        }],
        metadata: {
          model: 'SAM',
          version: '1.0.0',
          processingTime,
          promptType: prompt.type
        }
      };

      e2eLogger.info('SegmentationService', 'segment_complete', {
        masksGenerated: result.masks.length,
        processingTime,
        area
      });

      return result;
    } catch (error) {
      e2eLogger.error('SegmentationService', 'segment_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Auto-detection using Grounding DINO (server-side)
   */
  async detect(
    image: ImageBitmap | ImageData,
    config: DetectionConfig
  ): Promise<DetectionResult> {
    const startTime = performance.now();
    e2eLogger.info('SegmentationService', 'detect_start', config);

    try {
      // Convert image to blob for server request
      const blob = await this.imageToBlob(image);
      
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('labels', JSON.stringify(config.labels));
      formData.append('threshold', String(config.threshold || 0.3));
      formData.append('maxDetections', String(config.maxDetections || 10));

      const response = await fetch(`${this.serverEndpoint}/detect`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Detection API failed: ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = performance.now() - startTime;

      const result: DetectionResult = {
        detections: data.detections || [],
        metadata: {
          model: 'Grounding DINO',
          version: '1.0.0',
          processingTime
        }
      };

      e2eLogger.info('SegmentationService', 'detect_complete', {
        detectionsFound: result.detections.length,
        processingTime
      });

      return result;
    } catch (error) {
      e2eLogger.warn('SegmentationService', 'detect_fallback', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to simple detection based on common objects
      return this.createFallbackDetection(image, config);
    }
  }

  /**
   * Batch segmentation for multiple prompts
   */
  async batchSegment(
    image: ImageBitmap | ImageData,
    prompts: SegmentPrompt[]
  ): Promise<SegmentationResult[]> {
    e2eLogger.info('SegmentationService', 'batch_segment_start', {
      promptCount: prompts.length
    });

    const results: SegmentationResult[] = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await this.segment(image, prompts[i]);
        results.push(result);
      } catch (error) {
        e2eLogger.warn('SegmentationService', 'batch_segment_item_failed', {
          promptIndex: i,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    e2eLogger.info('SegmentationService', 'batch_segment_complete', {
      successfulResults: results.length,
      totalPrompts: prompts.length
    });

    return results;
  }

  /**
   * Refine mask with morphological operations
   */
  async refineMask(
    mask: RLE,
    operation: {
      type: 'grow' | 'shrink' | 'smooth' | 'feather';
      amount: number;
    }
  ): Promise<RLE> {
    e2eLogger.info('SegmentationService', 'refine_mask_start', operation);

    try {
      // Convert RLE to ImageData for processing
      const imageData = this.rleToImageData(mask);
      const { width, height, data } = imageData;

      let refinedData: Uint8ClampedArray;

      switch (operation.type) {
        case 'grow':
          refinedData = this.dilate(data, width, height, operation.amount);
          break;
        case 'shrink':
          refinedData = this.erode(data, width, height, operation.amount);
          break;
        case 'smooth':
          refinedData = this.morphologicalClose(data, width, height, operation.amount);
          break;
        case 'feather':
          refinedData = this.feather(data, width, height, operation.amount);
          break;
        default:
          refinedData = data;
      }

      const refinedImageData = new ImageData(refinedData, width, height);
      const refinedMask = this.imageDataToRLE(refinedImageData);

      e2eLogger.info('SegmentationService', 'refine_mask_complete', {
        operation: operation.type,
        amount: operation.amount
      });

      return refinedMask;
    } catch (error) {
      e2eLogger.error('SegmentationService', 'refine_mask_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return mask; // Return original mask on error
    }
  }

  // Private helper methods
  private async ensureImageData(image: ImageBitmap | ImageData): Promise<ImageData> {
    if (image instanceof ImageData) {
      return image;
    }

    // Convert ImageBitmap to ImageData
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
  }

  private async imageToBlob(image: ImageBitmap | ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (image instanceof ImageData) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.putImageData(image, 0, 0);
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  }

  private imageDataToRLE(imageData: ImageData): RLE {
    const { width, height, data } = imageData;
    const counts: number[] = [];
    let currentValue = data[3] > 128 ? 1 : 0; // Use alpha channel
    let currentCount = 0;

    for (let i = 0; i < width * height; i++) {
      const alpha = data[i * 4 + 3];
      const value = alpha > 128 ? 1 : 0;

      if (value === currentValue) {
        currentCount++;
      } else {
        counts.push(currentCount);
        currentValue = value;
        currentCount = 1;
      }
    }

    if (currentCount > 0) {
      counts.push(currentCount);
    }

    return {
      counts,
      size: [width, height]
    };
  }

  private rleToImageData(rle: RLE): ImageData {
    const [width, height] = rle.size;
    const imageData = new ImageData(width, height);
    const { data } = imageData;

    let pixelIndex = 0;
    let currentValue = 0;

    for (let i = 0; i < rle.counts.length; i++) {
      const count = rle.counts[i];
      const value = currentValue === 0 ? 0 : 255;

      for (let j = 0; j < count; j++) {
        if (pixelIndex < width * height) {
          const dataIndex = pixelIndex * 4;
          data[dataIndex] = value;     // R
          data[dataIndex + 1] = value; // G
          data[dataIndex + 2] = value; // B
          data[dataIndex + 3] = value; // A
          pixelIndex++;
        }
      }

      currentValue = 1 - currentValue; // Toggle between 0 and 1
    }

    return imageData;
  }

  private calculateBoundingBox(imageData: ImageData): BBox {
    const { width, height, data } = imageData;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 128) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX + 1),
      height: Math.max(0, maxY - minY + 1)
    };
  }

  private calculateMaskArea(imageData: ImageData): number {
    const { data } = imageData;
    let area = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 128) {
        area++;
      }
    }

    return area;
  }

  private dilate(data: Uint8ClampedArray, width: number, height: number, iterations: number): Uint8ClampedArray {
    let result = new Uint8ClampedArray(data);

    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8ClampedArray(result);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // Check 3x3 neighborhood
          let maxValue = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              maxValue = Math.max(maxValue, temp[nIdx + 3]);
            }
          }

          result[idx + 3] = maxValue;
        }
      }
    }

    return result;
  }

  private erode(data: Uint8ClampedArray, width: number, height: number, iterations: number): Uint8ClampedArray {
    let result = new Uint8ClampedArray(data);

    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8ClampedArray(result);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // Check 3x3 neighborhood
          let minValue = 255;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              minValue = Math.min(minValue, temp[nIdx + 3]);
            }
          }

          result[idx + 3] = minValue;
        }
      }
    }

    return result;
  }

  private morphologicalClose(data: Uint8ClampedArray, width: number, height: number, iterations: number): Uint8ClampedArray {
    // Close = Dilate then Erode
    const dilated = this.dilate(data, width, height, iterations);
    return this.erode(dilated, width, height, iterations);
  }

  private feather(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        if (data[idx + 3] > 128) {
          // Find distance to nearest edge
          let minDist = radius + 1;
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                const nIdx = (ny * width + nx) * 4;
                if (data[nIdx + 3] <= 128) {
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  minDist = Math.min(minDist, dist);
                }
              }
            }
          }
          
          if (minDist <= radius) {
            const alpha = Math.round(255 * (minDist / radius));
            result[idx + 3] = alpha;
          }
        }
      }
    }

    return result;
  }

  private async createFallbackDetection(
    image: ImageBitmap | ImageData,
    config: DetectionConfig
  ): Promise<DetectionResult> {
    // Simple fallback detection based on image analysis
    const imageData = await this.ensureImageData(image);
    const detections: DetectionResult['detections'] = [];

    // Basic heuristics for common objects
    const { width, height } = imageData;
    
    // Create a simple detection based on image regions
    if (config.labels.includes('person') || config.labels.includes('object')) {
      // Add a generic detection covering the center region
      detections.push({
        bbox: {
          x: Math.floor(width * 0.2),
          y: Math.floor(height * 0.2),
          width: Math.floor(width * 0.6),
          height: Math.floor(height * 0.6)
        },
        category: 'object',
        confidence: 0.5,
        attributes: {
          method: 'fallback'
        }
      });
    }

    return {
      detections,
      metadata: {
        model: 'Fallback Detection',
        version: '1.0.0',
        processingTime: 10
      }
    };
  }
}

// Export singleton
export const segmentationService = new SegmentationService();
/**
 * OCR Service for Layer Anything
 * Integrates Tesseract.js with server fallback for high-accuracy text detection
 */

import { createWorker, Worker, PSM } from 'tesseract.js';
import { e2eLogger } from '../utils/E2ELogger';
import { BBox, OCRResult } from './LayerAnythingEngine';

export interface OCROptions {
  region?: BBox;
  level?: 'word' | 'line' | 'paragraph' | 'block';
  preprocessor?: 'adaptive' | 'otsu' | 'none';
  confidence?: number;
  languages?: string[];
}

export interface OCRBlock {
  text: string;
  bbox: BBox;
  confidence: number;
  type: 'word' | 'line' | 'paragraph' | 'block';
  language?: string;
  baseline?: number;
  fontInfo?: {
    family?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
  };
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private serverEndpoint = 'http://localhost:7860/api/ocr';

  constructor() {
    e2eLogger.info('OCRService', 'constructor');
  }

  /**
   * Initialize Tesseract.js worker
   */
  async initialize(config: {
    languages?: string[];
    workerPath?: string;
    corePath?: string;
    tessdataPath?: string;
  } = {}): Promise<void> {
    if (this.isInitialized) return;

    try {
      e2eLogger.info('OCRService', 'initialize_start', config);

      this.worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            e2eLogger.debug('OCRService', 'tesseract_progress', {
              progress: m.progress,
              status: m.status
            });
          }
        }
      });

      // Configure for better accuracy
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: '', // Allow all characters
        preserve_interword_spaces: '1'
      });

      this.isInitialized = true;
      const languages = config.languages || ['eng'];
      e2eLogger.info('OCRService', 'initialize_complete', {
        languages,
        isInitialized: this.isInitialized
      });
    } catch (error) {
      e2eLogger.error('OCRService', 'initialize_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  /**
   * Recognize text in image using Tesseract.js
   */
  async recognize(
    image: ImageBitmap | HTMLCanvasElement | ImageData,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    const startTime = performance.now();
    e2eLogger.info('OCRService', 'recognize_start', {
      imageType: image.constructor.name,
      options
    });

    try {
      // Preprocess image if needed
      const processedImage = await this.preprocessImage(image, options.preprocessor);

      // Configure recognition parameters based on level
      const psm = this.getPSMForLevel(options.level || 'block');
      await this.worker.setParameters({
        tessedit_pageseg_mode: psm
      });

      // Perform OCR
      const { data } = await this.worker.recognize(processedImage, {
        rectangle: options.region ? {
          left: options.region.x,
          top: options.region.y,
          width: options.region.width,
          height: options.region.height
        } : undefined
      });

      // Process results based on requested level
      const blocks = this.processOCRData(data, options.level || 'block', options.confidence || 0.5);
      
      const processingTime = performance.now() - startTime;
      
      const result: OCRResult = {
        blocks,
        metadata: {
          model: 'Tesseract.js',
          version: '5.1.1',
          processingTime
        }
      };

      e2eLogger.info('OCRService', 'recognize_complete', {
        blocksFound: blocks.length,
        processingTime,
        avgConfidence: blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
      });

      return result;
    } catch (error) {
      e2eLogger.error('OCRService', 'recognize_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Advanced OCR using server fallback (PaddleOCR)
   */
  async recognizeAdvanced(
    image: Blob,
    options: {
      curved?: boolean;
      languages?: string[];
    } = {}
  ): Promise<OCRResult> {
    const startTime = performance.now();
    e2eLogger.info('OCRService', 'recognize_advanced_start', options);

    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('curved', String(options.curved || false));
      formData.append('languages', JSON.stringify(options.languages || ['en']));

      const response = await fetch(this.serverEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server OCR failed: ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = performance.now() - startTime;

      const result: OCRResult = {
        blocks: data.blocks || [],
        metadata: {
          model: 'PaddleOCR',
          version: '2.7.0',
          processingTime
        }
      };

      e2eLogger.info('OCRService', 'recognize_advanced_complete', {
        blocksFound: result.blocks.length,
        processingTime
      });

      return result;
    } catch (error) {
      e2eLogger.warn('OCRService', 'recognize_advanced_fallback', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to local OCR
      const imageData = await this.blobToImageData(image);
      return this.recognize(imageData, { level: 'block' });
    }
  }

  /**
   * Detect text regions without full OCR
   */
  async detectTextRegions(
    image: ImageBitmap | HTMLCanvasElement | ImageData
  ): Promise<BBox[]> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // Use layout analysis mode
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD
      });

      // Convert image to canvas for Tesseract
      const canvas = this.imageToCanvas(image);
      const { data } = await this.worker.recognize(canvas);
      
      // Extract bounding boxes from all text elements
      const regions: BBox[] = [];
      
      if (data.blocks) {
        for (const block of data.blocks) {
          if (block.confidence > 30) { // Lower threshold for detection
            regions.push({
              x: block.bbox.x0,
              y: block.bbox.y0,
              width: block.bbox.x1 - block.bbox.x0,
              height: block.bbox.y1 - block.bbox.y0
            });
          }
        }
      }

      e2eLogger.info('OCRService', 'detect_text_regions_complete', {
        regionsFound: regions.length
      });

      return regions;
    } catch (error) {
      e2eLogger.error('OCRService', 'detect_text_regions_failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      e2eLogger.info('OCRService', 'terminated');
    }
  }

  // Private helper methods
  private async preprocessImage(
    image: ImageBitmap | HTMLCanvasElement | ImageData,
    preprocessor: OCROptions['preprocessor'] = 'adaptive'
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Convert input to canvas
    if (image instanceof ImageData) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.putImageData(image, 0, 0);
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image as any, 0, 0);
    }

    if (preprocessor === 'none') {
      return canvas;
    }

    // Apply preprocessing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (preprocessor === 'adaptive') {
      // Adaptive thresholding for better text recognition
      this.applyAdaptiveThreshold(data, canvas.width, canvas.height);
    } else if (preprocessor === 'otsu') {
      // Otsu's method for automatic threshold selection
      this.applyOtsuThreshold(data);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private applyAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number): void {
    const blockSize = 15;
    const C = 10;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Calculate local mean
        let sum = 0;
        let count = 0;
        
        for (let dy = -blockSize; dy <= blockSize; dy++) {
          for (let dx = -blockSize; dx <= blockSize; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nidx = (ny * width + nx) * 4;
              const gray = (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3;
              sum += gray;
              count++;
            }
          }
        }
        
        const mean = sum / count;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const threshold = mean - C;
        
        const value = gray > threshold ? 255 : 0;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
      }
    }
  }

  private applyOtsuThreshold(data: Uint8ClampedArray): void {
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    const totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }
    
    // Find optimal threshold using Otsu's method
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = totalPixels - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }
    
    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = gray > threshold ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  private getPSMForLevel(level: string): PSM {
    switch (level) {
      case 'word': return PSM.SINGLE_WORD;
      case 'line': return PSM.SINGLE_LINE;
      case 'paragraph': return PSM.SINGLE_BLOCK;
      case 'block': return PSM.AUTO;
      default: return PSM.SINGLE_BLOCK;
    }
  }

  private processOCRData(
    data: any,
    level: string,
    minConfidence: number
  ): OCRBlock[] {
    const blocks: OCRBlock[] = [];

    if (level === 'word' && data.words) {
      for (const word of data.words) {
        if (word.confidence >= minConfidence) {
          blocks.push({
            text: word.text,
            bbox: {
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0
            },
            confidence: word.confidence / 100,
            type: 'word',
            baseline: word.baseline?.y0,
            fontInfo: {
              family: word.font_name,
              size: word.font_size,
              bold: word.is_bold,
              italic: word.is_italic
            }
          });
        }
      }
    } else if (level === 'line' && data.lines) {
      for (const line of data.lines) {
        if (line.confidence >= minConfidence) {
          blocks.push({
            text: line.text,
            bbox: {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0
            },
            confidence: line.confidence / 100,
            type: 'line',
            baseline: line.baseline?.y0
          });
        }
      }
    } else if (data.paragraphs) {
      for (const paragraph of data.paragraphs) {
        if (paragraph.confidence >= minConfidence) {
          blocks.push({
            text: paragraph.text,
            bbox: {
              x: paragraph.bbox.x0,
              y: paragraph.bbox.y0,
              width: paragraph.bbox.x1 - paragraph.bbox.x0,
              height: paragraph.bbox.y1 - paragraph.bbox.y0
            },
            confidence: paragraph.confidence / 100,
            type: level === 'paragraph' ? 'paragraph' : 'block'
          });
        }
      }
    }

    return blocks;
  }

  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  private imageToCanvas(image: ImageBitmap | HTMLCanvasElement | ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (image instanceof ImageData) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.putImageData(image, 0, 0);
    } else {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image as any, 0, 0);
    }

    return canvas;
  }
}

// Export singleton
export const ocrService = new OCRService();
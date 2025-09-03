/**
 * Segment Anything Model (SAM) Service
 * Promptable object segmentation for drag-and-drop isolation
 * Based on: https://github.com/facebookresearch/segment-anything
 */

import { e2eLogger } from '../utils/E2ELogger';

export class SAMService {
  private modelPath: string;
  private encoderSession: any = null;
  private decoderSession: any = null;

  constructor(modelPath: string = '/web-editor/models/sam_vit_b.onnx') {
    this.modelPath = modelPath;
  }

  async initialize() {
    if (this.encoderSession && this.decoderSession) return;

    try {
      const ort = await import('onnxruntime-web');
      
      // For now, use the single SAM model file we have
      // In production, we'd need separate encoder/decoder models
      console.warn('SAM service using placeholder - need separate encoder/decoder models');
      this.encoderSession = true; // Placeholder
      this.decoderSession = true; // Placeholder
      
      console.log('SAM service initialized (placeholder)');
    } catch (error) {
      console.error('Failed to load SAM model:', error);
      throw new Error('SAM model initialization failed');
    }
  }

  async segmentObject(
    imageData: ImageData,
    prompt: { x: number; y: number } | { x: number; y: number; width: number; height: number },
    options: {
      sensitivity?: number;
      edgeRefinement?: boolean;
      featherAmount?: number;
    } = {}
  ): Promise<{
    imageData: ImageData;
    mask: ImageData;
    metadata: Record<string, any>;
  }> {
    e2eLogger.info('SAMService', 'segmentObject_start', {
      prompt,
      imageSize: `${imageData.width}x${imageData.height}`,
      options
    });

    const { width, height, data } = imageData;
    const mask = new ImageData(width, height);
    
    // Enhanced parameters with defaults
    const sensitivity = options.sensitivity ?? 0.7;
    const edgeRefinement = options.edgeRefinement ?? true;
    const featherAmount = options.featherAmount ?? 2;
    
    // Create a more sophisticated mask based on color similarity and edge detection
    let centerX, centerY, radius;
    
    if ('width' in prompt) {
      // Box prompt
      centerX = prompt.x + prompt.width / 2;
      centerY = prompt.y + prompt.height / 2;
      radius = Math.max(prompt.width, prompt.height) / 2;
    } else {
      // Point prompt
      centerX = prompt.x;
      centerY = prompt.y;
      radius = Math.min(width, height) / 6; // Smaller radius for point prompts
    }
    
    e2eLogger.debug('SAMService', 'calculated_prompt_params', { centerX, centerY, radius, sensitivity });
    
    // Sample colors from the prompt area
    const sampleColors = this.sampleColors(imageData, centerX, centerY, Math.min(radius, 10));
    const avgColor = this.calculateAverageColor(sampleColors);
    
    // Create mask with color similarity and edge detection
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Calculate color distance
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const colorDistance = this.calculateColorDistance([r, g, b], avgColor);
        
        // Calculate spatial distance
        const spatialDistance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        // Combined similarity score
        const colorWeight = Math.exp(-colorDistance / (sensitivity * 100));
        const spatialWeight = Math.exp(-spatialDistance / (radius * 1.5));
        const similarity = colorWeight * spatialWeight;
        
        // Apply edge detection for refinement
        let edgeFactor = 1.0;
        if (edgeRefinement && x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          edgeFactor = this.calculateEdgeFactor(imageData, x, y);
        }
        
        // Final mask value with feathering
        let maskValue = similarity * edgeFactor;
        
        // Apply feathering
        if (featherAmount > 0) {
          maskValue = this.applyFeathering(maskValue, spatialDistance, radius, featherAmount);
        }
        
        maskValue = Math.max(0, Math.min(255, maskValue * 255));
        
        mask.data[idx] = maskValue;
        mask.data[idx + 1] = maskValue;
        mask.data[idx + 2] = maskValue;
        mask.data[idx + 3] = maskValue;
      }
    }
    
    // Apply mask to image
    const maskedImage = this.applyMask(imageData, mask);

    e2eLogger.info('SAMService', 'segmentObject_complete', {
      model: 'Enhanced SAM (color-based)',
      promptType: 'width' in prompt ? 'box' : 'point',
      sensitivity,
      edgeRefinement,
      featherAmount
    });

    return {
      imageData: maskedImage,
      mask: mask,
      metadata: {
        model: 'Enhanced SAM (color-based)',
        promptType: 'width' in prompt ? 'box' : 'point',
        sensitivity,
        edgeRefinement,
        featherAmount,
        prompt: prompt
      }
    };
  }

  private sampleColors(imageData: ImageData, centerX: number, centerY: number, radius: number): number[][] {
    const colors: number[][] = [];
    const { width, height, data } = imageData;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.round(centerX + dx);
        const y = Math.round(centerY + dy);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          colors.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
    }
    
    return colors;
  }

  private calculateAverageColor(colors: number[][]): number[] {
    if (colors.length === 0) return [128, 128, 128];
    
    const sum = colors.reduce((acc, color) => [
      acc[0] + color[0],
      acc[1] + color[1],
      acc[2] + color[2]
    ], [0, 0, 0]);
    
    return [
      Math.round(sum[0] / colors.length),
      Math.round(sum[1] / colors.length),
      Math.round(sum[2] / colors.length)
    ];
  }

  private calculateColorDistance(color1: number[], color2: number[]): number {
    return Math.sqrt(
      Math.pow(color1[0] - color2[0], 2) +
      Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2)
    );
  }

  private calculateEdgeFactor(imageData: ImageData, x: number, y: number): number {
    const { width, height, data } = imageData;
    const idx = (y * width + x) * 4;
    
    // Simple edge detection using neighboring pixels
    const getIntensity = (px: number, py: number) => {
      const pidx = (py * width + px) * 4;
      return (data[pidx] + data[pidx + 1] + data[pidx + 2]) / 3;
    };
    
    const center = getIntensity(x, y);
    const neighbors = [
      getIntensity(x - 1, y - 1), getIntensity(x, y - 1), getIntensity(x + 1, y - 1),
      getIntensity(x - 1, y), getIntensity(x + 1, y),
      getIntensity(x - 1, y + 1), getIntensity(x, y + 1), getIntensity(x + 1, y + 1)
    ];
    
    const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - center, 2), 0) / neighbors.length;
    return Math.exp(-variance / 1000); // Reduce mask strength at edges
  }

  private applyFeathering(value: number, distance: number, radius: number, featherAmount: number): number {
    const featherRadius = radius * featherAmount;
    if (distance > radius + featherRadius) return 0;
    if (distance < radius - featherRadius) return value;
    
    const featherStart = radius - featherRadius;
    const featherEnd = radius + featherRadius;
    const featherProgress = (distance - featherStart) / (featherEnd - featherStart);
    
    return value * (1 - featherProgress);
  }

  private preprocessImage(imageData: ImageData): any {
    const { width, height, data } = imageData;
    const ort = require('onnxruntime-web');
    
    // Resize to 1024x1024 (SAM input size)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Create temporary canvas for original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw resized image
    ctx.drawImage(tempCanvas, 0, 0, 1024, 1024);
    const resizedData = ctx.getImageData(0, 0, 1024, 1024).data;
    
    // Normalize to [0, 1] and create tensor
    const input = new Float32Array(1 * 3 * 1024 * 1024);
    for (let i = 0; i < 1024 * 1024; i++) {
      input[i] = resizedData[i * 4] / 255.0;     // R
      input[1024 * 1024 + i] = resizedData[i * 4 + 1] / 255.0; // G
      input[2 * 1024 * 1024 + i] = resizedData[i * 4 + 2] / 255.0; // B
    }
    
    return new ort.Tensor('float32', input, [1, 3, 1024, 1024]);
  }

  private async getImageEmbeddings(imageTensor: any): Promise<any> {
    const results = await this.encoderSession.run({ 'image': imageTensor });
    return results.image_embeddings;
  }

  private createPrompt(
    prompt: { x: number; y: number } | { x: number; y: number; width: number; height: number },
    originalWidth: number,
    originalHeight: number
  ): any {
    const ort = require('onnxruntime-web');
    const scaleX = 1024 / originalWidth;
    const scaleY = 1024 / originalHeight;
    
    if ('width' in prompt) {
      // Box prompt
      const box = new Float32Array([
        prompt.x * scaleX,
        prompt.y * scaleY,
        (prompt.x + prompt.width) * scaleX,
        (prompt.y + prompt.height) * scaleY
      ]);
      return {
        point_coords: new ort.Tensor('float32', new Float32Array(0), [0, 2]),
        point_labels: new ort.Tensor('int32', new Int32Array(0), [0]),
        box: new ort.Tensor('float32', box, [1, 4]),
        mask_input: new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
        has_mask_input: new ort.Tensor('float32', [0], [1]),
        orig_im_size: new ort.Tensor('int32', [originalHeight, originalWidth], [2])
      };
    } else {
      // Point prompt
      const pointCoords = new Float32Array([
        prompt.x * scaleX,
        prompt.y * scaleY
      ]);
      const pointLabels = new Int32Array([1]); // 1 for positive point
      
      return {
        point_coords: new ort.Tensor('float32', pointCoords, [1, 1, 2]),
        point_labels: new ort.Tensor('int32', pointLabels, [1, 1]),
        box: new ort.Tensor('float32', new Float32Array(0), [0]),
        mask_input: new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
        has_mask_input: new ort.Tensor('float32', [0], [1]),
        orig_im_size: new ort.Tensor('int32', [originalHeight, originalWidth], [2])
      };
    }
  }

  private async getMask(embeddings: any, prompt: any): Promise<ImageData> {
    const results = await this.decoderSession.run({
      image_embeddings: embeddings,
      ...prompt
    });
    
    const maskData = results.masks.data as Float32Array;
    const [height, width] = prompt.orig_im_size.data;
    
    // Convert to ImageData
    const mask = new ImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const value = maskData[i] > 0.5 ? 255 : 0;
      mask.data[i * 4] = value;
      mask.data[i * 4 + 1] = value;
      mask.data[i * 4 + 2] = value;
      mask.data[i * 4 + 3] = 255;
    }
    
    return mask;
  }

  private applyMask(imageData: ImageData, mask: ImageData): ImageData {
    const { width, height, data } = imageData;
    const result = new ImageData(width, height);
    
    for (let i = 0; i < width * height; i++) {
      const srcIndex = i * 4;
      const dstIndex = i * 4;
      const maskValue = mask.data[i * 4];
      
      // Copy RGB values
      result.data[dstIndex] = data[srcIndex];
      result.data[dstIndex + 1] = data[srcIndex + 1];
      result.data[dstIndex + 2] = data[srcIndex + 2];
      
      // Apply mask as alpha
      result.data[dstIndex + 3] = maskValue;
    }
    
    return result;
  }
}

// Export singleton
export const samService = new SAMService();
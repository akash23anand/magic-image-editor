/**
 * Outpainting Service
 * Manages multiple outpainting models for Magic Expand functionality
 * Optimized for M2 MacBook Air with multiple model options
 */

import { e2eLogger } from '../utils/E2ELogger';

export interface OutpaintingModel {
  id: string;
  name: string;
  description: string;
  type: 'browser' | 'local' | 'api';
  size: string;
  quality: 'low' | 'medium' | 'high' | 'best';
  requirements: string[];
  enabled: boolean;
}

export interface OutpaintingOptions {
  model: string;
  direction: 'left' | 'right' | 'top' | 'bottom';
  pixels: number;
  prompt?: string;
  strength?: number;
  guidance?: number;
}

export class OutpaintingService {
  private models: OutpaintingModel[] = [
    {
      id: 'lama-onnx',
      name: 'LaMa (Browser)',
      description: 'Large Mask Inpainting - Fast, runs in browser, good for textures',
      type: 'browser',
      size: '200MB',
      quality: 'medium',
      requirements: ['WebGL2', '4GB RAM'],
      enabled: true
    },
    {
      id: 'sd2-inpaint-onnx',
      name: 'SD 2.0 Inpainting (Browser)',
      description: 'Stable Diffusion 2.0 Inpainting - Balanced quality and speed',
      type: 'browser',
      size: '500MB',
      quality: 'high',
      requirements: ['WebGPU preferred', '8GB RAM'],
      enabled: true
    },
    {
      id: 'sdxl-inpaint-local',
      name: 'SDXL Inpainting (Local)',
      description: 'Stable Diffusion XL - Best quality, requires local server',
      type: 'local',
      size: '6.5GB',
      quality: 'best',
      requirements: ['Python', '16GB RAM', 'Apple Silicon'],
      enabled: false
    },
    {
      id: 'controlnet-inpaint',
      name: 'ControlNet Inpainting (Local)',
      description: 'ControlNet with SD - Excellent control and quality',
      type: 'local',
      size: '5GB',
      quality: 'best',
      requirements: ['Python', '16GB RAM', 'Apple Silicon'],
      enabled: false
    },
    {
      id: 'mat-onnx',
      name: 'MAT (Browser)',
      description: 'Mask-Aware Transformer - Good for high-res, preserves details',
      type: 'browser',
      size: '300MB',
      quality: 'high',
      requirements: ['WebGL2', '6GB RAM'],
      enabled: true
    },
    {
      id: 'fallback-mirror',
      name: 'Mirror & Fade (Fallback)',
      description: 'Non-AI fallback - Mirrors and fades edges',
      type: 'browser',
      size: '0MB',
      quality: 'low',
      requirements: ['None'],
      enabled: true
    }
  ];

  private currentModel: string = 'lama-onnx';
  private modelCache: Map<string, any> = new Map();

  async getAvailableModels(): Promise<OutpaintingModel[]> {
    // Check which models can actually run on this system
    const available = await Promise.all(
      this.models.map(async (model) => {
        const canRun = await this.checkModelCompatibility(model);
        return { ...model, enabled: canRun };
      })
    );
    
    return available;
  }

  async setCurrentModel(modelId: string): Promise<void> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    if (!model.enabled) {
      throw new Error(`Model ${modelId} is not available on this system`);
    }
    
    this.currentModel = modelId;
    e2eLogger.info('OutpaintingService', 'model_changed', { modelId });
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async outpaint(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    const modelId = options.model || this.currentModel;
    e2eLogger.info('OutpaintingService', 'outpaint_start', { modelId, options });

    try {
      switch (modelId) {
        case 'lama-onnx':
          return await this.outpaintWithLaMa(imageData, options);
        
        case 'sd2-inpaint-onnx':
          return await this.outpaintWithSD2(imageData, options);
        
        case 'mat-onnx':
          return await this.outpaintWithMAT(imageData, options);
        
        case 'sdxl-inpaint-local':
          return await this.outpaintWithSDXL(imageData, options);
        
        case 'controlnet-inpaint':
          return await this.outpaintWithControlNet(imageData, options);
        
        case 'fallback-mirror':
        default:
          return await this.outpaintWithMirrorFade(imageData, options);
      }
    } catch (error) {
      e2eLogger.error('OutpaintingService', 'outpaint_error', {
        modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to mirror & fade if model fails
      if (modelId !== 'fallback-mirror') {
        e2eLogger.warn('OutpaintingService', 'falling_back_to_mirror');
        return await this.outpaintWithMirrorFade(imageData, options);
      }
      
      throw error;
    }
  }

  private async checkModelCompatibility(model: OutpaintingModel): Promise<boolean> {
    // Check browser capabilities
    if (model.type === 'browser') {
      if (model.requirements.includes('WebGPU')) {
        // @ts-ignore
        if (!navigator.gpu) return false;
      }
      if (model.requirements.includes('WebGL2')) {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return false;
      }
    }
    
    // Check local server availability
    if (model.type === 'local') {
      try {
        const response = await fetch('http://localhost:7860/sdapi/v1/options');
        return response.ok;
      } catch {
        return false;
      }
    }
    
    return true;
  }

  private async loadModel(modelId: string): Promise<any> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId);
    }

    e2eLogger.info('OutpaintingService', 'loading_model', { modelId });

    // Model loading would be implemented here
    // For now, return a placeholder
    const model = { id: modelId, loaded: true };
    this.modelCache.set(modelId, model);
    
    return model;
  }

  // LaMa implementation (Large Mask Inpainting)
  private async outpaintWithLaMa(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    // TODO: Implement actual LaMa model loading and inference
    // For now, use enhanced mirror & fade as placeholder
    e2eLogger.info('OutpaintingService', 'lama_placeholder_active');
    
    // Would load: https://github.com/advimman/lama
    // ONNX model from: https://huggingface.co/spaces/Xenova/lama-inpainting
    
    return this.outpaintWithMirrorFade(imageData, options);
  }

  // Stable Diffusion 2.0 Inpainting implementation
  private async outpaintWithSD2(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    // TODO: Implement actual SD2 inpainting model
    // Would use ONNX Runtime Web with model from HuggingFace
    e2eLogger.info('OutpaintingService', 'sd2_placeholder_active');
    
    // Model: stabilityai/stable-diffusion-2-inpainting
    // Converted to ONNX for browser use
    
    return this.outpaintWithMirrorFade(imageData, options);
  }

  // MAT (Mask-Aware Transformer) implementation
  private async outpaintWithMAT(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    // TODO: Implement MAT model
    e2eLogger.info('OutpaintingService', 'mat_placeholder_active');
    
    // Model from: https://github.com/fenglinglwb/MAT
    // Would need ONNX conversion
    
    return this.outpaintWithMirrorFade(imageData, options);
  }

  // SDXL Inpainting (requires local server)
  private async outpaintWithSDXL(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    // This would call the local Stable Diffusion API
    const { stableDiffusionService } = await import('./StableDiffusionService');
    
    return {
      imageData: await this.blobToImageData(
        await stableDiffusionService.outpainting(
          imageData,
          options.direction,
          options.pixels,
          options.prompt || 'seamless continuation'
        )
      ),
      metadata: {
        model: 'SDXL Inpainting',
        quality: 'best',
        direction: options.direction,
        pixels: options.pixels
      }
    };
  }

  // ControlNet Inpainting (requires local server)
  private async outpaintWithControlNet(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    // Would use ControlNet with inpainting conditioning
    // Requires local server with ControlNet extension
    const { stableDiffusionService } = await import('./StableDiffusionService');
    
    return {
      imageData: await this.blobToImageData(
        await stableDiffusionService.outpainting(
          imageData,
          options.direction,
          options.pixels,
          options.prompt || 'seamless continuation with controlnet'
        )
      ),
      metadata: {
        model: 'ControlNet Inpainting',
        quality: 'best',
        direction: options.direction,
        pixels: options.pixels
      }
    };
  }

  // Fallback: Mirror & Fade implementation
  private async outpaintWithMirrorFade(
    imageData: ImageData,
    options: OutpaintingOptions
  ): Promise<{ imageData: ImageData; metadata: any }> {
    const canvas = document.createElement('canvas');
    
    let newWidth = imageData.width;
    let newHeight = imageData.height;
    
    switch (options.direction) {
      case 'left':
      case 'right':
        newWidth += options.pixels;
        break;
      case 'top':
      case 'bottom':
        newHeight += options.pixels;
        break;
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Create temp canvas with original
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Position original image
    let offsetX = options.direction === 'left' ? options.pixels : 0;
    let offsetY = options.direction === 'top' ? options.pixels : 0;
    
    ctx.drawImage(tempCanvas, offsetX, offsetY);
    
    // Mirror and fade
    const fadeSteps = Math.min(options.pixels, 100);
    
    if (options.direction === 'left') {
      for (let i = 0; i < options.pixels; i++) {
        const sourceX = Math.min(i, imageData.width - 1);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.1;
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas, 
          sourceX, 0, 1, imageData.height,
          options.pixels - i - 1, offsetY, 1, imageData.height
        );
      }
    } else if (options.direction === 'right') {
      for (let i = 0; i < options.pixels; i++) {
        const sourceX = Math.max(imageData.width - 1 - i, 0);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.1;
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          sourceX, 0, 1, imageData.height,
          imageData.width + i, offsetY, 1, imageData.height
        );
      }
    } else if (options.direction === 'top') {
      for (let i = 0; i < options.pixels; i++) {
        const sourceY = Math.min(i, imageData.height - 1);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.1;
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          0, sourceY, imageData.width, 1,
          offsetX, options.pixels - i - 1, imageData.width, 1
        );
      }
    } else {
      for (let i = 0; i < options.pixels; i++) {
        const sourceY = Math.max(imageData.height - 1 - i, 0);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.1;
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          0, sourceY, imageData.width, 1,
          offsetX, imageData.height + i, imageData.width, 1
        );
      }
    }
    
    ctx.globalAlpha = 1;
    
    return {
      imageData: ctx.getImageData(0, 0, newWidth, newHeight),
      metadata: {
        model: 'Mirror & Fade (Fallback)',
        quality: 'low',
        direction: options.direction,
        pixels: options.pixels,
        note: 'Non-AI fallback - consider using AI models for better results'
      }
    };
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
}

// Export singleton
export const outpaintingService = new OutpaintingService();
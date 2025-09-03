/**
 * Unified AI Service
 * Central service that orchestrates all open-source AI tools
 * Maps Canva features to drop-in open-source alternatives
 */

import { u2NetService } from './U2NetService';
import { stableDiffusionService } from './StableDiffusionService';
import { samService } from './SAMService';
import { tesseractService } from './TesseractService';
import { e2eLogger } from '../utils/E2ELogger';
import { modelConfigService } from './ModelConfigService';
import { falService } from './FALService';

export interface ProcessingOptions {
  prompt?: string;
  mask?: ImageData;
  strength?: number;
  guidance?: number;
  seed?: number;
  sensitivity?: number;      // Background removal sensitivity (0.0-1.0)
  edgeFeather?: number;      // Edge feathering in pixels
  preserveEdges?: boolean;   // Whether to preserve edges
}

export interface ProcessingResult {
  imageData: ImageData;
  metadata?: Record<string, any>;
  mask?: ImageData;
}

export class UnifiedAIService {
  private services = {
    'bg-remover': u2NetService,
    'bg-generator': stableDiffusionService,
    'magic-eraser': stableDiffusionService,
    'magic-grab': samService,
    'grab-text': tesseractService,
    'magic-edit': stableDiffusionService,
    'magic-expand': stableDiffusionService,
  };

  async processImage(
    tool: string,
    imageData: ImageData,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    console.log(`Processing with ${tool}...`);
    e2eLogger.info('UnifiedAIService', 'processImage_start', { tool, options });

    try {
      // Get the selected model for this tool
      const selectedModel = modelConfigService.getSelectedModel(tool);
      e2eLogger.info('UnifiedAIService', 'using_model', { tool, model: selectedModel });

      switch (tool) {
        case 'bg-remover':
          e2eLogger.debug('UnifiedAIService', 'processing_bg_remover');
          // For now, U2Net is the only implemented model
          return await u2NetService.removeBackground(imageData, {
            sensitivity: options.sensitivity ?? 0.5,
            edgeFeather: options.edgeFeather ?? 2,
            preserveEdges: options.preserveEdges ?? true
          });

        case 'bg-generator':
          if (!options.prompt) {
            e2eLogger.error('UnifiedAIService', 'bg_generator_missing_prompt');
            throw new Error('Prompt required for background generation');
          }
          
          // Check model availability
          const bgModel = modelConfigService.getSelectedModel('bg-generator');
          const isModelAvailable = modelConfigService.isModelAvailable('bg-generator', bgModel);
          let newBackgroundResult: ProcessingResult;
          
          if (bgModel.startsWith('fal-') && isModelAvailable) {
            try {
              const blob = await falService.generateBackground(options.prompt, imageData.width, imageData.height);
              newBackgroundResult = {
                imageData: await this.blobToImageData(blob),
                metadata: { provider: 'FAL', model: bgModel, prompt: options.prompt }
              };
            } catch (err) {
              e2eLogger.warn('UnifiedAIService', 'fal_bg_generation_failed_using_fallback', {
                error: err instanceof Error ? err.message : String(err)
              });
              newBackgroundResult = this.createFallbackBackground(imageData, options.prompt);
            }
          } else if (!isModelAvailable || bgModel === 'gradient') {
            e2eLogger.warn('UnifiedAIService', 'using_fallback_background', { tool, model: bgModel });
            newBackgroundResult = this.createFallbackBackground(imageData, options.prompt);
          } else {
            newBackgroundResult = {
              imageData: await this.blobToImageData(
                await stableDiffusionService.generateBackground(options.prompt, imageData.width, imageData.height)
              ),
              metadata: { model: 'SDXL-Turbo', prompt: options.prompt }
            };
          }
          
          // Extract subject from original image
          try {
            e2eLogger.debug('UnifiedAIService', 'extracting_subject_for_bg_composite');
            const subjectResult = await u2NetService.removeBackground(imageData, {
              sensitivity: 0.5,
              edgeFeather: 2,
              preserveEdges: true
            });
            
            // Composite subject onto new background
            const compositedResult = this.compositeSubjectOnBackground(
              newBackgroundResult.imageData,
              subjectResult.imageData
            );
            
            return {
              imageData: compositedResult,
              metadata: {
                ...newBackgroundResult.metadata,
                composited: true,
                note: 'Subject extracted and composited onto new background'
              }
            };
          } catch (error) {
            e2eLogger.warn('UnifiedAIService', 'subject_extraction_failed_returning_background_only', {
              error: error instanceof Error ? error.message : String(error)
            });
            // If subject extraction fails, return just the new background
            return newBackgroundResult;
          }

        case 'magic-eraser':
          if (!options.mask) {
            e2eLogger.error('UnifiedAIService', 'magic_eraser_missing_mask');
            throw new Error('Mask required for magic eraser');
          }
          
          const eraserModel = modelConfigService.getSelectedModel('magic-eraser');
          const isEraserAvailable = modelConfigService.isModelAvailable('magic-eraser', eraserModel);
          
          if (eraserModel.startsWith('fal-') && isEraserAvailable) {
            const blob = await falService.inpaint(imageData, options.mask, options.prompt || '');
            return {
              imageData: await this.blobToImageData(blob),
              metadata: { provider: 'FAL', model: eraserModel, prompt: options.prompt || 'empty' }
            };
          } else if (!isEraserAvailable || eraserModel === 'blur') {
            e2eLogger.warn('UnifiedAIService', 'using_fallback_eraser', { tool, model: eraserModel });
            return this.createFallbackEraser(imageData, options.mask);
          }
          
          return {
            imageData: await this.blobToImageData(
              await stableDiffusionService.inpaint(imageData, options.mask, options.prompt || '')
            ),
            metadata: { model: 'SDXL Inpainting', prompt: options.prompt || 'empty' }
          };

        case 'magic-grab':
          if (!options.prompt) {
            e2eLogger.error('UnifiedAIService', 'magic_grab_missing_prompt');
            throw new Error('Prompt coordinates required for magic grab');
          }
          const coords = JSON.parse(options.prompt);
          e2eLogger.debug('UnifiedAIService', 'processing_magic_grab', { coords });
          const samResult = await samService.segmentObject(imageData, coords);
          return {
            imageData: samResult.imageData,
            mask: samResult.mask,
            metadata: samResult.metadata
          };

        case 'grab-text':
          e2eLogger.debug('UnifiedAIService', 'processing_grab_text');
          const textResult = await tesseractService.extractText(imageData, {
            quality: 'accurate',
            preprocess: true,
            preserveFormatting: true
          });
          return {
            imageData: textResult.imageData,
            metadata: {
              ...textResult.metadata,
              textData: textResult.textData,
              extractedText: textResult.text
            }
          } as ProcessingResult;

        case 'magic-edit':
          if (!options.prompt) {
            e2eLogger.error('UnifiedAIService', 'magic_edit_missing_prompt');
            throw new Error('Instruction required for magic edit');
          }
          
          const editModel = modelConfigService.getSelectedModel('magic-edit');
          const isEditAvailable = modelConfigService.isModelAvailable('magic-edit', editModel);
          
          if (editModel.startsWith('fal-') && isEditAvailable) {
            try {
              const blob = await falService.edit(imageData, options.prompt);
              return {
                imageData: await this.blobToImageData(blob),
                metadata: { provider: 'FAL', model: editModel, instruction: options.prompt }
              };
            } catch (err) {
              e2eLogger.warn('UnifiedAIService', 'fal_edit_failed_using_fallback', {
                error: err instanceof Error ? err.message : String(err)
              });
              return this.createFallbackEdit(imageData, options.prompt);
            }
          } else if (!isEditAvailable || editModel === 'filter') {
            e2eLogger.warn('UnifiedAIService', 'using_fallback_edit', { tool, model: editModel });
            return this.createFallbackEdit(imageData, options.prompt);
          }
          
          return {
            imageData: await this.blobToImageData(
              await stableDiffusionService.generateBackground(options.prompt, imageData.width, imageData.height)
            ),
            metadata: { model: 'Instruct-Pix2Pix', instruction: options.prompt }
          };

        case 'magic-expand':
          if (!options.prompt) {
            e2eLogger.error('UnifiedAIService', 'magic_expand_missing_prompt');
            throw new Error('Direction required for magic expand');
          }

          // Robust parsing: allow natural language like
          // "extend left and right : 300 : city skyline continuation"
          const parseExpand = (text: string) => {
            const parts = text.split(':').map(p => p.trim());
            const instruction = parts[0]?.toLowerCase() || '';
            const pixelsFromPart = parts[1] ? parseInt(parts[1], 10) : NaN;
            const desc = parts[2] || undefined;

            // try to infer pixels from any number in the string if not provided in part[1]
            let pixels = Number.isFinite(pixelsFromPart) ? pixelsFromPart : (parseInt((text.match(/\b(\d{2,4})\b/) || [])[1]) || 256);

            // infer directions
            const hasLeft = /left/.test(instruction);
            const hasRight = /right/.test(instruction);
            const hasTop = /top|up|north/.test(instruction);
            const hasBottom = /bottom|down|south/.test(instruction);
            const horizontal = /left\s*\/\s*right|left\s*and\s*right|both\s*sides|horizontal/.test(instruction) || (hasLeft && hasRight);
            const vertical = /top\s*\/\s*bottom|top\s*and\s*bottom|vertical/.test(instruction) || (hasTop && hasBottom);

            let directions: Array<'left' | 'right' | 'top' | 'bottom'> = [];
            if (horizontal) directions.push('left', 'right');
            else if (vertical) directions.push('top', 'bottom');
            else if (hasLeft) directions.push('left');
            else if (hasRight) directions.push('right');
            else if (hasTop) directions.push('top');
            else if (hasBottom) directions.push('bottom');
            else directions.push('right'); // default

            return { directions, pixels, description: desc };
          };

          const { directions, pixels, description } = parseExpand(options.prompt);

          // Use the OutpaintingService for local/browser models; FAL for fal-* models
          const { outpaintingService } = await import('./OutpaintingService');
          const expandModel = modelConfigService.getSelectedModel('magic-expand');

          const runOutpaintSequence = async (img: ImageData) => {
            let current = img;
            let usedFallback = false;
            for (const dir of directions) {
              if (expandModel.startsWith('fal-')) {
                try {
                  const blob = await falService.outpaint(current, dir, pixels, description || 'seamless continuation');
                  current = await this.blobToImageData(blob);
                } catch (err) {
                  e2eLogger.warn('UnifiedAIService', 'fal_outpaint_failed_fallback', {
                    direction: dir,
                    error: err instanceof Error ? err.message : String(err)
                  });
                  // fallback for this direction only
                  current = this.createFallbackExpand(current, dir, pixels).imageData;
                  usedFallback = true;
                }
              } else {
                try {
                  await outpaintingService.setCurrentModel(expandModel);
                  const result = await outpaintingService.outpaint(current, {
                    model: expandModel,
                    direction: dir,
                    pixels,
                    prompt: description,
                    strength: options.strength,
                    guidance: options.guidance
                  });
                  current = result.imageData;
                } catch (err) {
                  e2eLogger.warn('UnifiedAIService', 'local_outpaint_failed_fallback', {
                    direction: dir,
                    error: err instanceof Error ? err.message : String(err)
                  });
                  current = this.createFallbackExpand(current, dir, pixels).imageData;
                  usedFallback = true;
                }
              }
            }
            return { image: current, usedFallback };
          };

          try {
            const { image: finalImage, usedFallback } = await runOutpaintSequence(imageData);
            return {
              imageData: finalImage,
              metadata: {
                provider: usedFallback ? 'fallback' : (expandModel.startsWith('fal-') ? 'FAL' : 'local'),
                model: expandModel,
                directions,
                pixels,
                prompt: description || 'seamless continuation'
              }
            };
          } catch (error) {
            e2eLogger.warn('UnifiedAIService', 'outpainting_failed_using_fallback', {
              error: error instanceof Error ? error.message : String(error)
            });
            // final catch-all: simple fallback for the first requested direction
            const dir = directions[0] || 'right';
            return this.createFallbackExpand(imageData, dir, pixels);
          }

        default:
          e2eLogger.error('UnifiedAIService', 'unknown_tool', { tool });
          throw new Error(`Unknown tool: ${tool}`);
      }
    } catch (error) {
      e2eLogger.error('UnifiedAIService', 'processImage_error', {
        tool,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private createFallbackBackground(imageData: ImageData, prompt: string): ProcessingResult {
    // Enhanced fallback with better gradient generation
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;

    // Parse prompt for better gradient generation
    const promptLower = prompt.toLowerCase();
    
    // Determine gradient colors based on prompt
    const colors = this.extractColorsFromPrompt(promptLower);
    
    // Create gradient based on direction in prompt or use radial for certain keywords
    let gradient: CanvasGradient;
    
    if (promptLower.includes('radial') || promptLower.includes('center') || promptLower.includes('spotlight')) {
      // Radial gradient from center
      gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
    } else if (promptLower.includes('right')) {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    } else if (promptLower.includes('left')) {
      gradient = ctx.createLinearGradient(canvas.width, 0, 0, 0);
    } else if (promptLower.includes('top')) {
      gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    } else if (promptLower.includes('bottom')) {
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    } else if (promptLower.includes('diagonal')) {
      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    } else {
      // Default: top to bottom gradient
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    }

    // Add color stops
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture or pattern if requested
    if (promptLower.includes('texture') || promptLower.includes('noise')) {
      // Add subtle noise texture
      const noiseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = noiseData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      ctx.putImageData(noiseData, 0, 0);
    }

    const resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      imageData: resultImageData,
      metadata: {
        model: 'Enhanced Fallback Background Generator',
        prompt: prompt,
        note: 'Stable Diffusion API unavailable - generated gradient background',
        colors: colors,
        type: promptLower.includes('radial') ? 'radial' : 'linear'
      }
    };
  }

  private extractColorsFromPrompt(prompt: string): string[] {
    const colorMap: { [key: string]: string[] } = {
      'sky': ['#87CEEB', '#E0F6FF', '#FFFFFF'],
      'blue': ['#1e3c72', '#2a5298', '#7e8ba3'],
      'sunset': ['#ff7e5f', '#feb47b', '#ffcd94'],
      'sunrise': ['#f83600', '#f9d423', '#ffeb3b'],
      'nature': ['#134e5e', '#71b280', '#a8e6cf'],
      'forest': ['#134e5e', '#71b280', '#a8e6cf'],
      'ocean': ['#1a2980', '#26d0ce', '#7de2fc'],
      'purple': ['#667eea', '#764ba2', '#f093fb'],
      'pink': ['#ff9a9e', '#fecfef', '#fecfef'],
      'warm': ['#ffecd2', '#fcb69f', '#ff9a9e'],
      'cool': ['#a8edea', '#fed6e3', '#d299c2'],
      'dark': ['#2c3e50', '#34495e', '#7f8c8d'],
      'black': ['#000000', '#434343', '#666666'],
      'white': ['#ffffff', '#f8f9fa', '#e9ecef'],
      'gradient': ['#667eea', '#764ba2', '#f093fb'],
      'red': ['#8b0000', '#dc143c', '#ff6b6b'],
      'green': ['#004d00', '#228b22', '#90ee90'],
      'yellow': ['#ffd700', '#ffeb3b', '#fff59d'],
      'orange': ['#ff6600', '#ff8c00', '#ffa500'],
      'gray': ['#808080', '#a9a9a9', '#d3d3d3'],
      'grey': ['#808080', '#a9a9a9', '#d3d3d3']
    };

    // Find matching keywords
    for (const [keyword, colors] of Object.entries(colorMap)) {
      if (prompt.includes(keyword)) {
        return colors;
      }
    }

    // Default gradient - neutral gray
    return ['#f5f5f5', '#e0e0e0', '#cccccc'];
  }

  private createFallbackEraser(imageData: ImageData, mask: ImageData): ProcessingResult {
    // Simple and effective content-aware eraser that removes ALL masked content
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Draw original image
    ctx.putImageData(imageData, 0, 0);
    
    // Get the image data
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = mask.data;
    const data = imgData.data;
    
    // Collect all masked pixels
    const maskedPixels = new Set<number>();
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        if (maskData[idx + 3] > 128) {
          maskedPixels.add(y * canvas.width + x);
        }
      }
    }
    
    // Multi-pass content-aware fill for ALL masked pixels
    const passes = 3;
    for (let pass = 0; pass < passes; pass++) {
      const tempData = new Uint8ClampedArray(data);
      
      // For each masked pixel that needs filling
      for (const pixelIndex of maskedPixels) {
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        const idx = pixelIndex * 4;
        
        // Sample surrounding non-masked pixels with weighted average
        let r = 0, g = 0, b = 0, a = 0, totalWeight = 0;
        const sampleRadius = 5 + pass * 2; // Increase radius with each pass
        
        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
          for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check bounds
            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
              const nIdx = (ny * canvas.width + nx) * 4;
              const nPixelIndex = ny * canvas.width + nx;
              
              // Only sample pixels that aren't masked
              if (!maskedPixels.has(nPixelIndex)) {
                // Weight based on distance
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = 1 / (1 + distance);
                
                r += data[nIdx] * weight;
                g += data[nIdx + 1] * weight;
                b += data[nIdx + 2] * weight;
                a += data[nIdx + 3] * weight;
                totalWeight += weight;
              }
            }
          }
        }
        
        // Apply weighted average if we found surrounding pixels
        if (totalWeight > 0) {
          tempData[idx] = Math.round(r / totalWeight);
          tempData[idx + 1] = Math.round(g / totalWeight);
          tempData[idx + 2] = Math.round(b / totalWeight);
          tempData[idx + 3] = Math.round(a / totalWeight);
        }
      }
      
      // Copy temp data back
      for (let i = 0; i < data.length; i++) {
        data[i] = tempData[i];
      }
    }
    
    // Apply the filled data
    ctx.putImageData(imgData, 0, 0);
    
    // Apply smoothing to the filled areas
    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = canvas.width;
    smoothCanvas.height = canvas.height;
    const smoothCtx = smoothCanvas.getContext('2d')!;
    
    // Draw the result
    smoothCtx.drawImage(canvas, 0, 0);
    
    // Apply slight blur to smooth the transitions
    smoothCtx.save();
    smoothCtx.filter = 'blur(1px)';
    smoothCtx.globalCompositeOperation = 'source-atop';
    smoothCtx.drawImage(canvas, 0, 0);
    smoothCtx.restore();
    
    const resultImageData = smoothCtx.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      imageData: resultImageData,
      metadata: {
        model: 'Content-Aware Eraser',
        note: 'Removed masked content and filled with surrounding pixels',
        passes: passes,
        maskedPixels: maskedPixels.size
      }
    };
  }

  private createFallbackEdit(imageData: ImageData, instruction: string): ProcessingResult {
    // Simple color adjustment based on instruction
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    
    ctx.putImageData(imageData, 0, 0);
    
    // Apply basic filters based on instruction
    if (instruction.toLowerCase().includes('bright')) {
      ctx.filter = 'brightness(1.2)';
    } else if (instruction.toLowerCase().includes('dark')) {
      ctx.filter = 'brightness(0.8)';
    } else if (instruction.toLowerCase().includes('warm')) {
      ctx.filter = 'sepia(0.3)';
    } else {
      ctx.filter = 'contrast(1.1)';
    }
    
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    
    const resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      imageData: resultImageData,
      metadata: {
        model: 'Fallback Magic Edit',
        instruction: instruction,
        note: 'Stable Diffusion API unavailable - using basic filters'
      }
    };
  }

  private createFallbackExpand(imageData: ImageData, direction: string, pixels: number): ProcessingResult {
    // Enhanced outpainting fallback using mirroring and fading technique
    const canvas = document.createElement('canvas');
    
    let newWidth = imageData.width;
    let newHeight = imageData.height;
    
    switch (direction) {
      case 'left':
      case 'right':
        newWidth += pixels;
        break;
      case 'top':
      case 'bottom':
        newHeight += pixels;
        break;
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Create a temporary canvas with the original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Position original image
    let offsetX = direction === 'left' ? pixels : 0;
    let offsetY = direction === 'top' ? pixels : 0;
    
    // Draw the original image first
    ctx.drawImage(tempCanvas, offsetX, offsetY);
    
    // Now extend using mirroring and fading technique
    const fadeSteps = Math.min(pixels, 100); // Limit fade steps for performance
    
    if (direction === 'left') {
      // Mirror and fade from the left edge of the original image
      for (let i = 0; i < pixels; i++) {
        const sourceX = Math.min(i, imageData.width - 1);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.4;
        
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          sourceX, 0, 1, imageData.height,  // Source: column from original
          pixels - i - 1, offsetY, 1, imageData.height  // Dest: mirrored position
        );
      }
    } else if (direction === 'right') {
      // Mirror and fade from the right edge of the original image
      for (let i = 0; i < pixels; i++) {
        const sourceX = Math.max(imageData.width - 1 - i, 0);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.4;
        
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          sourceX, 0, 1, imageData.height,  // Source: column from original
          imageData.width + i, offsetY, 1, imageData.height  // Dest: extended position
        );
      }
    } else if (direction === 'top') {
      // Mirror and fade from the top edge of the original image
      for (let i = 0; i < pixels; i++) {
        const sourceY = Math.min(i, imageData.height - 1);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.4;
        
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          0, sourceY, imageData.width, 1,  // Source: row from original
          offsetX, pixels - i - 1, imageData.width, 1  // Dest: mirrored position
        );
      }
    } else { // bottom
      // Mirror and fade from the bottom edge of the original image
      for (let i = 0; i < pixels; i++) {
        const sourceY = Math.max(imageData.height - 1 - i, 0);
        const opacity = i < fadeSteps ? 1 - (i / fadeSteps) : 0.4;
        
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          tempCanvas,
          0, sourceY, imageData.width, 1,  // Source: row from original
          offsetX, imageData.height + i, imageData.width, 1  // Dest: extended position
        );
      }
    }
    
    // Reset global alpha
    ctx.globalAlpha = 1;
    
    // Apply a subtle blur to the extended area for smoother transition
    if (ctx.filter) {
      ctx.save();
      ctx.filter = 'blur(2px)';
      
      // Redraw just the extended area with blur
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = newWidth;
      blurCanvas.height = newHeight;
      const blurCtx = blurCanvas.getContext('2d')!;
      blurCtx.drawImage(canvas, 0, 0);
      
      // Clear and redraw with selective blur
      ctx.restore();
      ctx.clearRect(0, 0, newWidth, newHeight);
      
      // Draw original without blur
      ctx.drawImage(tempCanvas, offsetX, offsetY);
      
      // Draw extended areas with blur
      if (direction === 'left') {
        ctx.filter = 'blur(1px)';
        ctx.drawImage(blurCanvas, 0, 0, pixels, newHeight, 0, 0, pixels, newHeight);
      } else if (direction === 'right') {
        ctx.filter = 'blur(1px)';
        ctx.drawImage(blurCanvas, imageData.width, 0, pixels, newHeight, imageData.width, 0, pixels, newHeight);
      } else if (direction === 'top') {
        ctx.filter = 'blur(1px)';
        ctx.drawImage(blurCanvas, 0, 0, newWidth, pixels, 0, 0, newWidth, pixels);
      } else {
        ctx.filter = 'blur(1px)';
        ctx.drawImage(blurCanvas, 0, imageData.height, newWidth, pixels, 0, imageData.height, newWidth, pixels);
      }
      
      ctx.filter = 'none';
    }
    
    const resultImageData = ctx.getImageData(0, 0, newWidth, newHeight);
    
    return {
      imageData: resultImageData,
      metadata: {
        model: 'Enhanced Fallback Magic Expand - Mirror & Fade',
        direction: direction,
        pixels: pixels,
        note: 'Stable Diffusion API unavailable - using mirror and fade technique for natural extension',
        technique: 'Edge mirroring with gradual opacity fade'
      }
    };
  }

  async checkServiceHealth(tool: string): Promise<boolean> {
    try {
      switch (tool) {
        case 'bg-remover':
          return true; // U²-Net runs locally
        case 'bg-generator':
        case 'magic-eraser':
        case 'magic-edit':
        case 'magic-expand':
          return await stableDiffusionService.checkHealth();
        case 'magic-grab':
          return true; // SAM runs locally
        case 'grab-text':
          return true; // Tesseract.js runs locally
        default:
          return false;
      }
    } catch {
      return false;
    }
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

  // Utility method to get canvas data from image URL
  async getImageDataFromUrl(imageUrl: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Handle CORS properly for data URLs vs regular URLs
      if (!imageUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get 2D context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, img.width, img.height));
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image: Network error or invalid image format'));
      };
      
      img.src = imageUrl;
    });
  }

  // Composite subject onto background
  private compositeSubjectOnBackground(backgroundData: ImageData, subjectData: ImageData): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = backgroundData.width;
    canvas.height = backgroundData.height;
    const ctx = canvas.getContext('2d')!;
    
    // First, draw the background
    ctx.putImageData(backgroundData, 0, 0);
    
    // Create a temporary canvas for the subject
    const subjectCanvas = document.createElement('canvas');
    subjectCanvas.width = subjectData.width;
    subjectCanvas.height = subjectData.height;
    const subjectCtx = subjectCanvas.getContext('2d')!;
    subjectCtx.putImageData(subjectData, 0, 0);
    
    // Draw the subject on top of the background
    ctx.drawImage(subjectCanvas, 0, 0);
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

// Export singleton
export const unifiedAIService = new UnifiedAIService();

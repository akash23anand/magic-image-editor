/**
 * Stable Diffusion Services
 * SDXL-Turbo for background generation and inpainting
 * Based on: https://huggingface.co/stabilityai/sdxl-turbo
 */

import { e2eLogger } from '../utils/E2ELogger';

export class StableDiffusionService {
  private apiEndpoint: string;
  private apiKey?: string;

  constructor(apiEndpoint: string = 'http://localhost:7860', apiKey?: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }

  /**
   * BG Generator - Generate new backgrounds with SDXL-Turbo
   */
  async generateBackground(
    prompt: string,
    width: number = 512,
    height: number = 512,
    options: {
      negativePrompt?: string;
      steps?: number;
      guidance?: number;
      seed?: number;
      quality?: 'fast' | 'balanced' | 'high';
    } = {}
  ): Promise<Blob> {
    const qualitySettings = {
      fast: { steps: 4, guidance: 0.0, width: 512, height: 512 },
      balanced: { steps: 8, guidance: 3.0, width: 768, height: 768 },
      high: { steps: 20, guidance: 7.5, width: 1024, height: 1024 }
    };
    
    const quality = options.quality || 'balanced';
    const settings = qualitySettings[quality];
    
    const payload = {
      prompt: `professional background, ${prompt}, high quality, detailed, seamless, photorealistic, 4k`,
      negative_prompt: options.negativePrompt || 'low quality, blurry, distorted, artifacts, watermark, text, logo, signature, person, face, body, hands, feet',
      width: width || settings.width,
      height: height || settings.height,
      num_inference_steps: options.steps || settings.steps,
      guidance_scale: options.guidance || settings.guidance,
      seed: options.seed || -1,
      sampler_name: 'DPM++ 2M Karras',
      cfg_scale: options.guidance || settings.guidance,
    };

    return this.callStableDiffusionAPI('/sdapi/v1/txt2img', payload);
  }

  /**
   * Magic Eraser - SDXL Inpainting for object removal
   */
  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    prompt: string = '',
    options: {
      negativePrompt?: string;
      steps?: number;
      guidance?: number;
      denoising?: number;
      quality?: 'fast' | 'balanced' | 'high';
    } = {}
  ): Promise<Blob> {
    const qualitySettings = {
      fast: { steps: 10, guidance: 5.0, denoising: 0.6 },
      balanced: { steps: 20, guidance: 7.5, denoising: 0.75 },
      high: { steps: 30, guidance: 10.0, denoising: 0.85 }
    };
    
    const quality = options.quality || 'balanced';
    const settings = qualitySettings[quality];

    // Convert ImageData to base64
    const imageBase64 = this.imageDataToBase64(imageData);
    const maskBase64 = this.imageDataToBase64(maskData);

    const payload = {
      init_images: [imageBase64],
      mask: maskBase64,
      prompt: prompt || 'seamless background, clean, empty space, natural continuation, high quality',
      negative_prompt: options.negativePrompt || 'object, artifact, distortion, watermark, text, logo, signature, person, face, body, hands, feet, blur, low quality',
      inpainting_fill: 1,
      inpaint_full_res: true,
      inpaint_full_res_padding: 32,
      steps: options.steps || settings.steps,
      guidance_scale: options.guidance || settings.guidance,
      denoising_strength: options.denoising || settings.denoising,
      sampler_name: 'DPM++ 2M Karras',
      cfg_scale: options.guidance || settings.guidance,
    };

    return this.callStableDiffusionAPI('/sdapi/v1/img2img', payload);
  }

  /**
   * Outpainting - Extend image borders
   */
  async outpainting(
    imageData: ImageData,
    direction: 'left' | 'right' | 'top' | 'bottom',
    pixels: number,
    prompt: string = 'seamless continuation',
    options: {
      quality?: 'fast' | 'balanced' | 'high';
    } = {}
  ): Promise<Blob> {
    const qualitySettings = {
      fast: { steps: 10, guidance: 5.0, denoising: 0.6 },
      balanced: { steps: 20, guidance: 7.5, denoising: 0.75 },
      high: { steps: 30, guidance: 10.0, denoising: 0.85 }
    };
    
    const quality = options.quality || 'balanced';
    const settings = qualitySettings[quality];

    // Calculate new dimensions based on direction
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

    const imageBase64 = this.imageDataToBase64(imageData);

    const payload = {
      init_images: [imageBase64],
      prompt: `professional outpainting, ${prompt}, seamless continuation, natural extension, high quality, photorealistic, 4k`,
      negative_prompt: 'distortion, artifacts, seam, discontinuity, low quality, blur, watermark, text, logo',
      width: newWidth,
      height: newHeight,
      steps: settings.steps,
      guidance_scale: settings.guidance,
      denoising_strength: settings.denoising,
      sampler_name: 'DPM++ 2M Karras',
      cfg_scale: settings.guidance,
    };

    return this.callStableDiffusionAPI('/sdapi/v1/img2img', payload);
  }

  private async callStableDiffusionAPI(endpoint: string, payload: any): Promise<Blob> {
    const response = await fetch(`${this.apiEndpoint}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Stable Diffusion API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert base64 to blob
    const base64Data = data.images[0].split(',')[1] || data.images[0];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  }

  private imageDataToBase64(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/sdapi/v1/sd-models`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const stableDiffusionService = new StableDiffusionService();
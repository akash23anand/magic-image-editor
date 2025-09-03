/**
 * Background Generator Tool Models Configuration
 * Defines all available models and their parameters for background generation
 */

import { BaseModelConfig } from './index';

export interface BgGeneratorModelConfig extends BaseModelConfig {
  parameters: {
    prompt: {
      default: string;
      maxLength: number;
      description: string;
    };
    negativePrompt: {
      default: string;
      maxLength: number;
      description: string;
    };
    width: {
      default: number;
      options: number[];
      description: string;
    };
    height: {
      default: number;
      options: number[];
      description: string;
    };
    steps: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    guidance: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    seed: {
      default: number;
      min: number;
      max: number;
      description: string;
    };
    computeUnit?: {
      default: 'CPU_AND_GPU' | 'CPU_ONLY' | 'ALL';
      options: ('CPU_ONLY' | 'CPU_AND_GPU' | 'ALL')[];
      description: string;
    };
    attentionImpl?: {
      default: 'ORIGINAL' | 'SPLIT_EINSUM' | 'SPLIT_EINSUM_V2';
      options: ('ORIGINAL' | 'SPLIT_EINSUM' | 'SPLIT_EINSUM_V2')[];
      description: string;
    };
  };
}

export const bgGeneratorModels: BgGeneratorModelConfig[] = [
  {
    id: 'sdxl-turbo',
    name: 'SDXL Turbo',
    type: 'api',
    quality: 5,
    speed: 3,
    requirements: 'Local API required',
    recommended: true,
    apiEndpoint: 'http://localhost:7860/sdapi/v1/txt2img',
    parameters: {
      prompt: {
        default: 'professional background, high quality, detailed, seamless, photorealistic, 4k',
        maxLength: 500,
        description: 'Describe the background you want to generate'
      },
      negativePrompt: {
        default: 'low quality, blurry, distorted, artifacts, watermark, text, logo, signature, person, face, body, hands, feet',
        maxLength: 300,
        description: 'What to avoid in the generated background'
      },
      width: {
        default: 1024,
        options: [512, 768, 1024, 1280, 1536],
        description: 'Output image width in pixels'
      },
      height: {
        default: 1024,
        options: [512, 768, 1024, 1280, 1536],
        description: 'Output image height in pixels'
      },
      steps: {
        default: 4,
        min: 1,
        max: 10,
        step: 1,
        description: 'Number of denoising steps (SDXL Turbo optimized for 1-4 steps)'
      },
      guidance: {
        default: 0.0,
        min: 0.0,
        max: 3.0,
        step: 0.5,
        description: 'How closely to follow the prompt (Turbo works best with low guidance)'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Random seed for reproducible results (-1 for random)'
      }
    }
  },
  {
    id: 'sd2',
    name: 'Stable Diffusion 2.1',
    type: 'api',
    quality: 4,
    speed: 2,
    requirements: 'Local API required',
    apiEndpoint: 'http://localhost:7860/sdapi/v1/txt2img',
    parameters: {
      prompt: {
        default: 'beautiful background, high resolution, detailed, professional photography',
        maxLength: 400,
        description: 'Background description for SD 2.1'
      },
      negativePrompt: {
        default: 'low quality, blur, artifacts, watermark, text, people, faces',
        maxLength: 250,
        description: 'Elements to exclude from generation'
      },
      width: {
        default: 768,
        options: [512, 768, 1024],
        description: 'Image width (768x768 optimal for SD 2.1)'
      },
      height: {
        default: 768,
        options: [512, 768, 1024],
        description: 'Image height'
      },
      steps: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Denoising steps (more steps = higher quality, slower)'
      },
      guidance: {
        default: 7.5,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Seed for reproducible generation'
      }
    }
  },
  {
    id: 'dalle-mini',
    name: 'DALL-E Mini',
    type: 'browser',
    quality: 3,
    speed: 3,
    size: '1.5GB',
    parameters: {
      prompt: {
        default: 'simple background',
        maxLength: 200,
        description: 'Simple prompt for DALL-E Mini (works best with short descriptions)'
      },
      negativePrompt: {
        default: '',
        maxLength: 100,
        description: 'Limited negative prompting support'
      },
      width: {
        default: 512,
        options: [256, 512],
        description: 'Limited resolution options'
      },
      height: {
        default: 512,
        options: [256, 512],
        description: 'Square images work best'
      },
      steps: {
        default: 16,
        min: 8,
        max: 32,
        step: 4,
        description: 'Generation steps'
      },
      guidance: {
        default: 5.0,
        min: 1.0,
        max: 10.0,
        step: 1.0,
        description: 'Prompt adherence'
      },
      seed: {
        default: -1,
        min: -1,
        max: 65535,
        description: 'Random seed'
      }
    }
  },
  {
    id: 'gradient',
    name: 'Gradient Fallback',
    type: 'fallback',
    quality: 1,
    speed: 5,
    parameters: {
      prompt: {
        default: 'blue to white gradient',
        maxLength: 100,
        description: 'Simple color description (e.g., "blue to white", "sunset colors")'
      },
      negativePrompt: {
        default: '',
        maxLength: 0,
        description: 'Not applicable for gradient generation'
      },
      width: {
        default: 1024,
        options: [512, 768, 1024, 1280, 1536, 1920],
        description: 'Any resolution supported'
      },
      height: {
        default: 1024,
        options: [512, 768, 1024, 1280, 1536, 1080],
        description: 'Any resolution supported'
      },
      steps: {
        default: 1,
        min: 1,
        max: 1,
        step: 1,
        description: 'Instant generation'
      },
      guidance: {
        default: 1.0,
        min: 1.0,
        max: 1.0,
        step: 1.0,
        description: 'Not applicable'
      },
      seed: {
        default: -1,
        min: -1,
        max: 255,
        description: 'Affects gradient variation'
      }
    }
  },
  {
    id: 'sd15-coreml',
    name: 'Stable Diffusion 1.5 (CoreML)',
    type: 'local',
    quality: 4,
    speed: 3,
    size: '2.1GB',
    hardware: 'coreml',
    precision: 'fp16',
    memoryFootprint: '3.2 GB VRAM',
    requirements: 'Converted CoreML models from apple/ml-stable-diffusion',
    modelPath: '~/MagicImageEditorModels/coreml/sd15/',
    recommended: true,
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/coreml/sd15/');
        return fs.existsSync(path.join(modelPath, 'TextEncoder.mlmodelc')) &&
               fs.existsSync(path.join(modelPath, 'Unet.mlmodelc')) &&
               fs.existsSync(path.join(modelPath, 'VAEDecoder.mlmodelc'));
      } catch {
        return false;
      }
    },
    parameters: {
      prompt: {
        default: 'professional background, high quality, detailed, seamless, photorealistic, 4k',
        maxLength: 500,
        description: 'Describe the background you want to generate'
      },
      negativePrompt: {
        default: 'low quality, blurry, distorted, artifacts, watermark, text, logo, signature, person, face, body, hands, feet',
        maxLength: 300,
        description: 'What to avoid in the generated background'
      },
      width: {
        default: 512,
        options: [512, 768],
        description: 'Output image width (CoreML optimized for 512x512)'
      },
      height: {
        default: 512,
        options: [512, 768],
        description: 'Output image height'
      },
      steps: {
        default: 20,
        min: 6,
        max: 30,
        step: 2,
        description: 'Number of denoising steps'
      },
      guidance: {
        default: 7.0,
        min: 2.0,
        max: 12.0,
        step: 0.5,
        description: 'How closely to follow the prompt'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Random seed for reproducible results (-1 for random)'
      },
      computeUnit: {
        default: 'CPU_AND_GPU',
        options: ['CPU_ONLY', 'CPU_AND_GPU', 'ALL'],
        description: 'CoreML compute unit selection for performance optimization'
      },
      attentionImpl: {
        default: 'ORIGINAL',
        options: ['ORIGINAL', 'SPLIT_EINSUM', 'SPLIT_EINSUM_V2'],
        description: 'Attention implementation for memory optimization'
      }
    }
  },
  {
    id: 'sd-turbo-mps',
    name: 'Stable Diffusion Turbo (MPS)',
    type: 'local',
    quality: 3,
    speed: 5,
    size: '1.8GB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '2.8 GB VRAM',
    requirements: 'diffusers + PyTorch-MPS',
    modelPath: '~/MagicImageEditorModels/sd-turbo/',
    availabilityCheck: async () => {
      try {
        // Check if PyTorch MPS is available and model exists
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/sd-turbo/');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      prompt: {
        default: 'professional background, high quality, detailed',
        maxLength: 300,
        description: 'Background description for SD-Turbo'
      },
      negativePrompt: {
        default: 'low quality, blurry, artifacts',
        maxLength: 200,
        description: 'What to avoid in generation'
      },
      width: {
        default: 512,
        options: [512, 768],
        description: 'Image width (512x512 optimal for Turbo)'
      },
      height: {
        default: 512,
        options: [512, 768],
        description: 'Image height'
      },
      steps: {
        default: 4,
        min: 1,
        max: 8,
        step: 1,
        description: 'Turbo optimized for 1-4 steps'
      },
      guidance: {
        default: 0.0,
        min: 0.0,
        max: 2.0,
        step: 0.5,
        description: 'Turbo works best with low or no guidance'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Random seed for reproducible results'
      }
    }
  }
];

export const defaultBgGeneratorModel = 'sd15-coreml';
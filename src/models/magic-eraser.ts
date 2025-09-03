/**
 * Magic Eraser Tool Models Configuration
 * Defines all available models and their parameters for object removal/inpainting
 */

import { BaseModelConfig } from './index';

export interface MagicEraserModelConfig extends BaseModelConfig {
  parameters: {
    maskDilation: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    contextRadius: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    blendStrength: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    preserveStructure: {
      default: boolean;
      description: string;
    };
    steps?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    guidance?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
  };
  modelPath?: string;
  apiEndpoint?: string;
}

export const magicEraserModels: MagicEraserModelConfig[] = [
  {
    id: 'lama-mps',
    name: 'LaMa (MPS)',
    type: 'local',
    quality: 4,
    speed: 4,
    size: '500MB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '1.2 GB VRAM',
    requirements: 'PyTorch-MPS, lama-cleaner',
    recommended: true,
    modelPath: '~/MagicImageEditorModels/lama/',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/lama/');
        return fs.existsSync(path.join(modelPath, 'config.yaml')) &&
               fs.existsSync(path.join(modelPath, 'models'));
      } catch {
        return false;
      }
    },
    parameters: {
      maskDilation: {
        default: 3,
        min: 0,
        max: 10,
        step: 1,
        description: 'Expands the mask area to ensure complete object removal'
      },
      contextRadius: {
        default: 32,
        min: 16,
        max: 128,
        step: 16,
        description: 'Size of surrounding area used for context understanding'
      },
      blendStrength: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1,
        description: 'How strongly to blend the inpainted area with surroundings'
      },
      preserveStructure: {
        default: true,
        description: 'Maintains structural coherence of the background'
      }
    }
  },
  {
    id: 'sd15-inpaint-mps',
    name: 'SD 1.5 Inpainting (MPS)',
    type: 'local',
    quality: 5,
    speed: 3,
    size: '1.7GB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '2.8 GB VRAM',
    requirements: 'diffusers + PyTorch-MPS',
    modelPath: '~/MagicImageEditorModels/sd15-inpaint/',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/sd15-inpaint/');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      maskDilation: {
        default: 5,
        min: 0,
        max: 20,
        step: 1,
        description: 'Mask expansion for better inpainting coverage'
      },
      contextRadius: {
        default: 64,
        min: 32,
        max: 256,
        step: 32,
        description: 'Context window for AI understanding'
      },
      blendStrength: {
        default: 0.75,
        min: 0.4,
        max: 1.0,
        step: 0.05,
        description: 'Denoising strength for inpainting'
      },
      preserveStructure: {
        default: true,
        description: 'Uses structural guidance for coherent results'
      },
      steps: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Number of diffusion steps'
      },
      guidance: {
        default: 7.5,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      }
    }
  },
  {
    id: 'lama',
    name: 'LaMa (Browser)',
    type: 'browser',
    quality: 4,
    speed: 4,
    size: '500MB',
    modelPath: '/models/lama.onnx',
    parameters: {
      maskDilation: {
        default: 3,
        min: 0,
        max: 10,
        step: 1,
        description: 'Expands the mask area to ensure complete object removal'
      },
      contextRadius: {
        default: 32,
        min: 16,
        max: 128,
        step: 16,
        description: 'Size of surrounding area used for context understanding'
      },
      blendStrength: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1,
        description: 'How strongly to blend the inpainted area with surroundings'
      },
      preserveStructure: {
        default: true,
        description: 'Maintains structural coherence of the background'
      }
    }
  },
  {
    id: 'sdxl-inpaint',
    name: 'SDXL Inpainting',
    type: 'api',
    quality: 5,
    speed: 2,
    requirements: 'Local API required',
    apiEndpoint: 'http://localhost:7860/sdapi/v1/img2img',
    parameters: {
      maskDilation: {
        default: 5,
        min: 0,
        max: 20,
        step: 1,
        description: 'Mask expansion for better inpainting coverage'
      },
      contextRadius: {
        default: 64,
        min: 32,
        max: 256,
        step: 32,
        description: 'Context window for AI understanding'
      },
      blendStrength: {
        default: 0.75,
        min: 0.4,
        max: 1.0,
        step: 0.05,
        description: 'Denoising strength for inpainting'
      },
      preserveStructure: {
        default: true,
        description: 'Uses structural guidance for coherent results'
      },
      steps: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Number of diffusion steps'
      },
      guidance: {
        default: 7.5,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      }
    }
  },
  {
    id: 'mat',
    name: 'MAT (Mask-Aware Transformer)',
    type: 'browser',
    quality: 4,
    speed: 3,
    size: '800MB',
    modelPath: '/models/mat.onnx',
    parameters: {
      maskDilation: {
        default: 2,
        min: 0,
        max: 8,
        step: 1,
        description: 'Minimal dilation for precise transformer attention'
      },
      contextRadius: {
        default: 48,
        min: 24,
        max: 96,
        step: 12,
        description: 'Transformer attention radius'
      },
      blendStrength: {
        default: 0.9,
        min: 0.5,
        max: 1.0,
        step: 0.05,
        description: 'Attention-based blending strength'
      },
      preserveStructure: {
        default: true,
        description: 'Transformer inherently preserves structural relationships'
      }
    }
  },
  {
    id: 'edge-connect',
    name: 'EdgeConnect',
    type: 'browser',
    quality: 3,
    speed: 4,
    size: '300MB',
    modelPath: '/models/edge_connect.onnx',
    parameters: {
      maskDilation: {
        default: 4,
        min: 1,
        max: 12,
        step: 1,
        description: 'Edge-aware mask expansion'
      },
      contextRadius: {
        default: 40,
        min: 20,
        max: 80,
        step: 10,
        description: 'Edge detection context window'
      },
      blendStrength: {
        default: 0.7,
        min: 0.4,
        max: 1.0,
        step: 0.1,
        description: 'Edge-guided blending intensity'
      },
      preserveStructure: {
        default: true,
        description: 'Uses edge maps to preserve structural boundaries'
      }
    }
  },
  {
    id: 'blur',
    name: 'Blur Fallback',
    type: 'fallback',
    quality: 1,
    speed: 5,
    parameters: {
      maskDilation: {
        default: 8,
        min: 2,
        max: 20,
        step: 2,
        description: 'Large dilation to ensure complete coverage'
      },
      contextRadius: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Blur sampling radius'
      },
      blendStrength: {
        default: 0.6,
        min: 0.3,
        max: 1.0,
        step: 0.1,
        description: 'Gaussian blur blending strength'
      },
      preserveStructure: {
        default: false,
        description: 'Simple blur cannot preserve complex structures'
      }
    }
  }
];

export const defaultMagicEraserModel = 'lama-mps';
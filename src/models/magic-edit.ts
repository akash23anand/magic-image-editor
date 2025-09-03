/**
 * Magic Edit Tool Models Configuration
 * Defines all available models and their parameters for AI-powered image editing
 */

import { BaseModelConfig } from './index';

export interface MagicEditModelConfig extends BaseModelConfig {
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
    strength: {
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
    steps: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    preserveOriginal: {
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
  };
  apiEndpoint?: string;
  modelPath?: string;
}

export const magicEditModels: MagicEditModelConfig[] = [
  {
    id: 'instruct-pix2pix-mps',
    name: 'InstructPix2Pix (MPS)',
    type: 'local',
    quality: 5,
    speed: 3,
    size: '1.8GB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '2.5 GB VRAM',
    requirements: 'diffusers + PyTorch-MPS',
    recommended: true,
    modelPath: '~/MagicImageEditorModels/instruct-pix2pix/',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/instruct-pix2pix/');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      prompt: {
        default: 'make it more colorful and vibrant',
        maxLength: 500,
        description: 'Instruction for how to edit the image (e.g., "make it sunny", "add flowers")'
      },
      negativePrompt: {
        default: 'blurry, low quality, distorted, artifacts',
        maxLength: 300,
        description: 'What to avoid in the edited result'
      },
      strength: {
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'How much to change the original image (higher = more dramatic changes)'
      },
      guidance: {
        default: 7.5,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        description: 'How closely to follow the instruction prompt'
      },
      steps: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Number of diffusion steps (more = higher quality, slower)'
      },
      preserveOriginal: {
        default: 0.3,
        min: 0.0,
        max: 0.8,
        step: 0.05,
        description: 'How much of the original image structure to preserve'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Random seed for reproducible edits'
      }
    }
  },
  {
    id: 'controlnet-edit-mps',
    name: 'ControlNet Edit (MPS)',
    type: 'local',
    quality: 5,
    speed: 2,
    size: '2.3GB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '3.1 GB VRAM',
    requirements: 'diffusers + controlnet + PyTorch-MPS',
    modelPath: '~/MagicImageEditorModels/controlnet/',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/controlnet/');
        return fs.existsSync(path.join(modelPath, 'canny')) &&
               fs.existsSync(path.join(modelPath, 'depth'));
      } catch {
        return false;
      }
    },
    parameters: {
      prompt: {
        default: 'enhance the image with better lighting and colors',
        maxLength: 400,
        description: 'Editing instruction with ControlNet guidance'
      },
      negativePrompt: {
        default: 'ugly, deformed, blurry, bad anatomy, wrong proportions',
        maxLength: 250,
        description: 'Negative prompts for ControlNet'
      },
      strength: {
        default: 0.6,
        min: 0.2,
        max: 0.9,
        step: 0.05,
        description: 'ControlNet influence strength'
      },
      guidance: {
        default: 9.0,
        min: 3.0,
        max: 15.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      },
      steps: {
        default: 25,
        min: 15,
        max: 40,
        step: 5,
        description: 'Diffusion sampling steps'
      },
      preserveOriginal: {
        default: 0.5,
        min: 0.2,
        max: 0.8,
        step: 0.05,
        description: 'Structure preservation with ControlNet'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Seed for consistent results'
      }
    }
  },
  {
    id: 'instruct-pix2pix',
    name: 'InstructPix2Pix (API)',
    type: 'api',
    quality: 5,
    speed: 2,
    requirements: 'Local API required',
    apiEndpoint: 'http://localhost:7860/sdapi/v1/img2img',
    parameters: {
      prompt: {
        default: 'make it more colorful and vibrant',
        maxLength: 500,
        description: 'Instruction for how to edit the image (e.g., "make it sunny", "add flowers")'
      },
      negativePrompt: {
        default: 'blurry, low quality, distorted, artifacts',
        maxLength: 300,
        description: 'What to avoid in the edited result'
      },
      strength: {
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'How much to change the original image (higher = more dramatic changes)'
      },
      guidance: {
        default: 7.5,
        min: 1.0,
        max: 20.0,
        step: 0.5,
        description: 'How closely to follow the instruction prompt'
      },
      steps: {
        default: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Number of diffusion steps (more = higher quality, slower)'
      },
      preserveOriginal: {
        default: 0.3,
        min: 0.0,
        max: 0.8,
        step: 0.05,
        description: 'How much of the original image structure to preserve'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Random seed for reproducible edits'
      }
    }
  },
  {
    id: 'controlnet-edit',
    name: 'ControlNet Edit',
    type: 'api',
    quality: 5,
    speed: 2,
    requirements: 'Local API required',
    apiEndpoint: 'http://localhost:7860/controlnet/img2img',
    parameters: {
      prompt: {
        default: 'enhance the image with better lighting and colors',
        maxLength: 400,
        description: 'Editing instruction with ControlNet guidance'
      },
      negativePrompt: {
        default: 'ugly, deformed, blurry, bad anatomy, wrong proportions',
        maxLength: 250,
        description: 'Negative prompts for ControlNet'
      },
      strength: {
        default: 0.6,
        min: 0.2,
        max: 0.9,
        step: 0.05,
        description: 'ControlNet influence strength'
      },
      guidance: {
        default: 9.0,
        min: 3.0,
        max: 15.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      },
      steps: {
        default: 25,
        min: 15,
        max: 40,
        step: 5,
        description: 'Diffusion sampling steps'
      },
      preserveOriginal: {
        default: 0.5,
        min: 0.2,
        max: 0.8,
        step: 0.05,
        description: 'Structure preservation with ControlNet'
      },
      seed: {
        default: -1,
        min: -1,
        max: 2147483647,
        description: 'Seed for consistent results'
      }
    }
  },
  {
    id: 'pix2pix',
    name: 'Pix2Pix',
    type: 'browser',
    quality: 3,
    speed: 4,
    size: '200MB',
    modelPath: '/models/pix2pix.onnx',
    parameters: {
      prompt: {
        default: 'improve the image',
        maxLength: 200,
        description: 'Simple editing instruction for Pix2Pix'
      },
      negativePrompt: {
        default: 'low quality',
        maxLength: 100,
        description: 'Limited negative prompting'
      },
      strength: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.1,
        description: 'Translation strength'
      },
      guidance: {
        default: 1.0,
        min: 1.0,
        max: 3.0,
        step: 0.5,
        description: 'Limited guidance control'
      },
      steps: {
        default: 1,
        min: 1,
        max: 5,
        step: 1,
        description: 'Single-step or few-step generation'
      },
      preserveOriginal: {
        default: 0.2,
        min: 0.0,
        max: 0.5,
        step: 0.1,
        description: 'Minimal preservation for style transfer'
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
    id: 'filter',
    name: 'Filter Fallback',
    type: 'fallback',
    quality: 1,
    speed: 5,
    parameters: {
      prompt: {
        default: 'brighten',
        maxLength: 50,
        description: 'Simple filter name (brighten, darken, contrast, saturation, blur, sharpen)'
      },
      negativePrompt: {
        default: '',
        maxLength: 0,
        description: 'Not applicable for filters'
      },
      strength: {
        default: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        description: 'Filter intensity multiplier'
      },
      guidance: {
        default: 1.0,
        min: 1.0,
        max: 1.0,
        step: 1.0,
        description: 'Not applicable'
      },
      steps: {
        default: 1,
        min: 1,
        max: 1,
        step: 1,
        description: 'Instant filter application'
      },
      preserveOriginal: {
        default: 0.8,
        min: 0.5,
        max: 1.0,
        step: 0.1,
        description: 'High preservation for subtle filter effects'
      },
      seed: {
        default: 0,
        min: 0,
        max: 0,
        description: 'Deterministic filter application'
      }
    }
  }
];

export const defaultMagicEditModel = 'instruct-pix2pix-mps';
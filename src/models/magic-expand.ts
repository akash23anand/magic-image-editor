/**
 * Magic Expand Tool Models Configuration
 * Defines all available models and their parameters for image outpainting/expansion
 */

import { BaseModelConfig } from './index';

export interface MagicExpandModelConfig extends BaseModelConfig {
  parameters: {
    direction: {
      default: 'right' | 'left' | 'top' | 'bottom' | 'all';
      options: ('right' | 'left' | 'top' | 'bottom' | 'all')[];
      description: string;
    };
    pixels: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
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
    seamBlending: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    contextPreservation: {
      default: number;
      min: number;
      max: number;
      step: number;
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

export const magicExpandModels: MagicExpandModelConfig[] = [
  {
    id: 'lama-expand-mps',
    name: 'LaMa Expand (MPS)',
    type: 'local',
    quality: 4,
    speed: 4,
    size: '500MB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '1.4 GB VRAM',
    requirements: 'lama-cleaner + PyTorch-MPS',
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
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom', 'all'],
        description: 'Direction to expand the image'
      },
      pixels: {
        default: 256,
        min: 64,
        max: 512,
        step: 64,
        description: 'Number of pixels to expand in the chosen direction'
      },
      prompt: {
        default: 'seamless continuation of the background',
        maxLength: 200,
        description: 'Description of what should appear in the expanded area'
      },
      negativePrompt: {
        default: 'seam, discontinuity, artifacts, distortion',
        maxLength: 150,
        description: 'What to avoid in the expansion'
      },
      seamBlending: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.05,
        description: 'How smoothly to blend the expansion with the original'
      },
      contextPreservation: {
        default: 0.7,
        min: 0.4,
        max: 0.9,
        step: 0.05,
        description: 'How much to preserve the original image context'
      }
    }
  },
  {
    id: 'sd-outpaint-mps',
    name: 'SD Outpainting (MPS)',
    type: 'local',
    quality: 5,
    speed: 3,
    size: '1.7GB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '2.9 GB VRAM',
    requirements: 'diffusers + PyTorch-MPS',
    modelPath: '~/MagicImageEditorModels/sd-outpaint/',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/sd-outpaint/');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom', 'all'],
        description: 'Expansion direction (supports all directions in single pass)'
      },
      pixels: {
        default: 512,
        min: 256,
        max: 1024,
        step: 128,
        description: 'High-resolution expansion capability'
      },
      prompt: {
        default: 'photorealistic continuation, natural extension, seamless background',
        maxLength: 500,
        description: 'Detailed prompt for high-quality expansion'
      },
      negativePrompt: {
        default: 'seam, artifacts, low quality, blurry, distorted, discontinuous',
        maxLength: 300,
        description: 'Comprehensive negative prompting'
      },
      seamBlending: {
        default: 0.85,
        min: 0.5,
        max: 1.0,
        step: 0.05,
        description: 'SD advanced blending capabilities'
      },
      contextPreservation: {
        default: 0.7,
        min: 0.4,
        max: 0.9,
        step: 0.05,
        description: 'Context understanding with SD'
      },
      steps: {
        default: 30,
        min: 20,
        max: 50,
        step: 5,
        description: 'High-quality sampling steps'
      },
      guidance: {
        default: 8.0,
        min: 5.0,
        max: 15.0,
        step: 0.5,
        description: 'SD guidance scale'
      }
    }
  },
  {
    id: 'lama',
    name: 'LaMa (Browser)',
    type: 'browser',
    quality: 3,
    speed: 4,
    size: '500MB',
    modelPath: '/models/lama.onnx',
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom', 'all'],
        description: 'Direction to expand the image'
      },
      pixels: {
        default: 256,
        min: 64,
        max: 512,
        step: 64,
        description: 'Number of pixels to expand in the chosen direction'
      },
      prompt: {
        default: 'seamless continuation of the background',
        maxLength: 200,
        description: 'Description of what should appear in the expanded area'
      },
      negativePrompt: {
        default: 'seam, discontinuity, artifacts, distortion',
        maxLength: 150,
        description: 'What to avoid in the expansion'
      },
      seamBlending: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.05,
        description: 'How smoothly to blend the expansion with the original'
      },
      contextPreservation: {
        default: 0.7,
        min: 0.4,
        max: 0.9,
        step: 0.05,
        description: 'How much to preserve the original image context'
      }
    }
  },
  {
    id: 'sd2-inpaint',
    name: 'SD 2.0 Inpainting',
    type: 'browser',
    quality: 4,
    speed: 3,
    size: '1.5GB',
    modelPath: '/models/sd2_inpainting.onnx',
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom'],
        description: 'Expansion direction (all directions require multiple passes)'
      },
      pixels: {
        default: 256,
        min: 128,
        max: 768,
        step: 64,
        description: 'Expansion size in pixels'
      },
      prompt: {
        default: 'natural continuation, seamless background extension',
        maxLength: 300,
        description: 'Detailed prompt for the expanded content'
      },
      negativePrompt: {
        default: 'seam, border, edge, discontinuity, low quality, blurry',
        maxLength: 200,
        description: 'Negative prompt to avoid artifacts'
      },
      seamBlending: {
        default: 0.75,
        min: 0.4,
        max: 1.0,
        step: 0.05,
        description: 'Diffusion-based blending strength'
      },
      contextPreservation: {
        default: 0.6,
        min: 0.3,
        max: 0.8,
        step: 0.05,
        description: 'Original image influence on generation'
      },
      steps: {
        default: 20,
        min: 10,
        max: 40,
        step: 5,
        description: 'Diffusion sampling steps'
      },
      guidance: {
        default: 7.5,
        min: 3.0,
        max: 15.0,
        step: 0.5,
        description: 'Classifier-free guidance scale'
      }
    }
  },
  {
    id: 'sdxl-inpaint',
    name: 'SDXL Inpainting',
    type: 'local',
    quality: 5,
    speed: 2,
    requirements: 'Local server, 6GB+',
    apiEndpoint: 'http://localhost:7860/sdapi/v1/img2img',
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom', 'all'],
        description: 'Expansion direction (supports all directions in single pass)'
      },
      pixels: {
        default: 512,
        min: 256,
        max: 1024,
        step: 128,
        description: 'High-resolution expansion capability'
      },
      prompt: {
        default: 'photorealistic continuation, natural extension, seamless background',
        maxLength: 500,
        description: 'Detailed prompt for high-quality expansion'
      },
      negativePrompt: {
        default: 'seam, artifacts, low quality, blurry, distorted, discontinuous',
        maxLength: 300,
        description: 'Comprehensive negative prompting'
      },
      seamBlending: {
        default: 0.85,
        min: 0.5,
        max: 1.0,
        step: 0.05,
        description: 'SDXL advanced blending capabilities'
      },
      contextPreservation: {
        default: 0.7,
        min: 0.4,
        max: 0.9,
        step: 0.05,
        description: 'Context understanding with SDXL'
      },
      steps: {
        default: 30,
        min: 20,
        max: 50,
        step: 5,
        description: 'High-quality sampling steps'
      },
      guidance: {
        default: 8.0,
        min: 5.0,
        max: 15.0,
        step: 0.5,
        description: 'SDXL guidance scale'
      }
    }
  },
  {
    id: 'controlnet',
    name: 'ControlNet Inpainting',
    type: 'local',
    quality: 5,
    speed: 2,
    requirements: 'Local server, 4GB+',
    apiEndpoint: 'http://localhost:7860/controlnet/img2img',
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom'],
        description: 'ControlNet guided expansion direction'
      },
      pixels: {
        default: 384,
        min: 192,
        max: 768,
        step: 96,
        description: 'ControlNet optimal expansion sizes'
      },
      prompt: {
        default: 'natural extension with structural consistency',
        maxLength: 400,
        description: 'ControlNet structure-aware prompting'
      },
      negativePrompt: {
        default: 'structural inconsistency, seam, artifacts, distortion',
        maxLength: 250,
        description: 'Structure-focused negative prompts'
      },
      seamBlending: {
        default: 0.9,
        min: 0.6,
        max: 1.0,
        step: 0.05,
        description: 'ControlNet structure-aware blending'
      },
      contextPreservation: {
        default: 0.8,
        min: 0.5,
        max: 0.95,
        step: 0.05,
        description: 'High structural preservation'
      },
      steps: {
        default: 25,
        min: 15,
        max: 40,
        step: 5,
        description: 'ControlNet sampling steps'
      },
      guidance: {
        default: 9.0,
        min: 6.0,
        max: 15.0,
        step: 0.5,
        description: 'ControlNet guidance strength'
      }
    }
  },
  {
    id: 'mat',
    name: 'MAT',
    type: 'browser',
    quality: 4,
    speed: 3,
    size: '800MB',
    modelPath: '/models/mat.onnx',
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom'],
        description: 'MAT transformer-based expansion'
      },
      pixels: {
        default: 256,
        min: 128,
        max: 512,
        step: 64,
        description: 'Transformer attention-based expansion'
      },
      prompt: {
        default: 'coherent background extension',
        maxLength: 250,
        description: 'Semantic guidance for transformer'
      },
      negativePrompt: {
        default: 'incoherent, artifacts, seam',
        maxLength: 150,
        description: 'Semantic negative guidance'
      },
      seamBlending: {
        default: 0.85,
        min: 0.5,
        max: 1.0,
        step: 0.05,
        description: 'Attention-based seamless blending'
      },
      contextPreservation: {
        default: 0.75,
        min: 0.5,
        max: 0.9,
        step: 0.05,
        description: 'Transformer context understanding'
      }
    }
  },
  {
    id: 'fallback',
    name: 'Mirror & Fade',
    type: 'fallback',
    quality: 1,
    speed: 5,
    parameters: {
      direction: {
        default: 'right',
        options: ['right', 'left', 'top', 'bottom'],
        description: 'Simple mirroring direction'
      },
      pixels: {
        default: 128,
        min: 32,
        max: 256,
        step: 32,
        description: 'Mirror and fade distance'
      },
      prompt: {
        default: 'mirror edge',
        maxLength: 50,
        description: 'Simple instruction (mirror, fade, stretch, repeat)'
      },
      negativePrompt: {
        default: '',
        maxLength: 0,
        description: 'Not applicable for simple algorithms'
      },
      seamBlending: {
        default: 0.6,
        min: 0.2,
        max: 1.0,
        step: 0.1,
        description: 'Fade blending strength'
      },
      contextPreservation: {
        default: 1.0,
        min: 0.8,
        max: 1.0,
        step: 0.1,
        description: 'Full preservation of original content'
      }
    }
  }
];

export const defaultMagicExpandModel = 'lama-expand-mps';
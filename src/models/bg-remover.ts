/**
 * Background Remover Tool Models Configuration
 * Defines all available models and their parameters for background removal
 */

import { BaseModelConfig } from './index';

export interface BgRemoverModelConfig extends BaseModelConfig {
  parameters: {
    sensitivity: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    edgeFeather: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    preserveEdges: {
      default: boolean;
      description: string;
    };
  };
}

export const bgRemoverModels: BgRemoverModelConfig[] = [
  {
    id: 'u2net',
    name: 'U²-Net',
    type: 'browser',
    quality: 4,
    speed: 4,
    size: '5MB',
    recommended: true,
    modelPath: '/models/u2net.onnx',
    parameters: {
      sensitivity: {
        default: 0.5,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        description: 'Controls how strict the background detection is. Lower values are more selective.'
      },
      edgeFeather: {
        default: 2,
        min: 0,
        max: 10,
        step: 1,
        description: 'Softens the edges of the cutout. Higher values create smoother transitions.'
      },
      preserveEdges: {
        default: true,
        description: 'Maintains fine details and sharp edges in the foreground object.'
      }
    }
  },
  {
    id: 'u2net-human',
    name: 'U²-Net Human Seg',
    type: 'browser',
    quality: 5,
    speed: 4,
    size: '5MB',
    requirements: 'Best for portraits',
    modelPath: '/models/u2net_human_seg.onnx',
    parameters: {
      sensitivity: {
        default: 0.6,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        description: 'Optimized for human subjects. Higher default sensitivity for better person detection.'
      },
      edgeFeather: {
        default: 1,
        min: 0,
        max: 8,
        step: 1,
        description: 'Minimal feathering to preserve hair and clothing details.'
      },
      preserveEdges: {
        default: true,
        description: 'Essential for maintaining hair strands and fabric textures.'
      }
    }
  },
  {
    id: 'rembg',
    name: 'RemBG (API)',
    type: 'api',
    quality: 5,
    speed: 3,
    requirements: 'API key required',
    apiEndpoint: 'https://api.remove.bg/v1.0/removebg',
    parameters: {
      sensitivity: {
        default: 0.7,
        min: 0.3,
        max: 1.0,
        step: 0.1,
        description: 'API confidence threshold for background detection.'
      },
      edgeFeather: {
        default: 0,
        min: 0,
        max: 5,
        step: 1,
        description: 'Post-processing edge smoothing applied after API response.'
      },
      preserveEdges: {
        default: true,
        description: 'Maintains original API quality without additional processing.'
      }
    }
  },
  {
    id: 'simple-threshold',
    name: 'Simple Threshold',
    type: 'fallback',
    quality: 2,
    speed: 5,
    parameters: {
      sensitivity: {
        default: 0.3,
        min: 0.1,
        max: 0.8,
        step: 0.05,
        description: 'Color difference threshold for simple background removal.'
      },
      edgeFeather: {
        default: 3,
        min: 1,
        max: 10,
        step: 1,
        description: 'Blur radius to soften harsh edges from thresholding.'
      },
      preserveEdges: {
        default: false,
        description: 'Simple algorithm cannot preserve fine edge details.'
      }
    }
  },
  {
    id: 'modnet',
    name: 'MODNet (portrait matting)',
    type: 'local',
    quality: 4,
    speed: 4,
    size: '25MB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '1.5 GB VRAM',
    requirements: 'PyTorch 2.x + MPS',
    modelPath: '~/MagicImageEditorModels/modnet/modnet_photographic_portrait_matting.ckpt',
    recommended: true,
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/modnet/modnet_photographic_portrait_matting.ckpt');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      sensitivity: {
        default: 0.6,
        min: 0.2,
        max: 0.9,
        step: 0.05,
        description: 'Portrait matting sensitivity - optimized for people and hair details'
      },
      edgeFeather: {
        default: 2,
        min: 0,
        max: 10,
        step: 1,
        description: 'Edge softening for natural hair and clothing boundaries'
      },
      preserveEdges: {
        default: true,
        description: 'Essential for maintaining hair strands and fabric textures'
      }
    }
  },
  {
    id: 'isnet-rmbg',
    name: 'ISNet (RMBG general)',
    type: 'browser',
    quality: 4,
    speed: 4,
    size: '90MB',
    hardware: 'wasm',
    precision: 'fp32',
    memoryFootprint: '800 MB RAM',
    modelPath: '/models/isnet/general_use.onnx',
    availabilityCheck: async () => {
      try {
        // Check if ONNX model file exists
        const response = await fetch('/models/isnet/general_use.onnx', { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
    parameters: {
      sensitivity: {
        default: 0.5,
        min: 0.2,
        max: 0.8,
        step: 0.05,
        description: 'General-purpose background removal sensitivity'
      },
      edgeFeather: {
        default: 2,
        min: 0,
        max: 8,
        step: 1,
        description: 'Edge smoothing for clean cutouts'
      },
      preserveEdges: {
        default: true,
        description: 'Maintains object boundary details'
      }
    }
  }
];

export const defaultBgRemoverModel = 'modnet';
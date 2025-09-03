/**
 * Magic Grab Tool Models Configuration
 * Defines all available models and their parameters for object segmentation
 */

import { BaseModelConfig, HardwareType, PrecisionType } from './index';

export interface MagicGrabModelConfig extends BaseModelConfig {
  parameters: {
    sensitivity?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    edgeRefinement?: {
      default: boolean;
      description: string;
    };
    featherAmount?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    promptType: {
      default: 'point' | 'box';
      options: ('point' | 'box')[];
      description: string;
    };
    predIouThresh?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    stabilityScoreThresh?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    maskExpand?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    multimask?: {
      default: boolean;
      description: string;
    };
    conf?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    iou?: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
  };
  encoderPath?: string;
  decoderPath?: string;
}

export const magicGrabModels: MagicGrabModelConfig[] = [
  {
    id: 'sam-vit-h',
    name: 'SAM ViT-H',
    type: 'browser',
    quality: 5,
    speed: 3,
    size: '2.4GB',
    recommended: true,
    encoderPath: '/models/sam_vit_h_encoder.onnx',
    decoderPath: '/models/sam_vit_h_decoder.onnx',
    parameters: {
      sensitivity: {
        default: 0.7,
        min: 0.3,
        max: 0.95,
        step: 0.05,
        description: 'Controls how precisely the model segments objects. Higher values are more inclusive.'
      },
      edgeRefinement: {
        default: true,
        description: 'Uses advanced edge detection to refine segmentation boundaries.'
      },
      featherAmount: {
        default: 2,
        min: 0,
        max: 8,
        step: 1,
        description: 'Softens the edges of the segmented object for natural blending.'
      },
      promptType: {
        default: 'point',
        options: ['point', 'box'],
        description: 'Point prompts for single clicks, box prompts for drag selections.'
      }
    }
  },
  {
    id: 'sam-vit-l',
    name: 'SAM ViT-L',
    type: 'browser',
    quality: 4,
    speed: 4,
    size: '1.2GB',
    encoderPath: '/models/sam_vit_l_encoder.onnx',
    decoderPath: '/models/sam_vit_l_decoder.onnx',
    parameters: {
      sensitivity: {
        default: 0.65,
        min: 0.3,
        max: 0.9,
        step: 0.05,
        description: 'Balanced sensitivity for most use cases with good performance.'
      },
      edgeRefinement: {
        default: true,
        description: 'Maintains good edge quality while being faster than ViT-H.'
      },
      featherAmount: {
        default: 2,
        min: 0,
        max: 6,
        step: 1,
        description: 'Moderate feathering for smooth object extraction.'
      },
      promptType: {
        default: 'point',
        options: ['point', 'box'],
        description: 'Supports both point and box prompting methods.'
      }
    }
  },
  {
    id: 'sam-vit-b',
    name: 'SAM ViT-B',
    type: 'browser',
    quality: 3,
    speed: 5,
    size: '350MB',
    encoderPath: '/models/sam_vit_b_encoder.onnx',
    decoderPath: '/models/sam_vit_b_decoder.onnx',
    parameters: {
      sensitivity: {
        default: 0.6,
        min: 0.3,
        max: 0.85,
        step: 0.05,
        description: 'Fast segmentation with reasonable quality for quick edits.'
      },
      edgeRefinement: {
        default: false,
        description: 'Disabled by default for speed, can be enabled for better quality.'
      },
      featherAmount: {
        default: 3,
        min: 0,
        max: 8,
        step: 1,
        description: 'Higher default feathering to compensate for lower precision.'
      },
      promptType: {
        default: 'box',
        options: ['point', 'box'],
        description: 'Box prompts work better with the smaller model.'
      }
    }
  },
  {
    id: 'color-based',
    name: 'Color-Based Segmentation',
    type: 'fallback',
    quality: 2,
    speed: 5,
    parameters: {
      sensitivity: {
        default: 0.4,
        min: 0.1,
        max: 0.8,
        step: 0.05,
        description: 'Color similarity threshold for region growing segmentation.'
      },
      edgeRefinement: {
        default: true,
        description: 'Uses simple edge detection to improve color-based segmentation.'
      },
      featherAmount: {
        default: 4,
        min: 1,
        max: 10,
        step: 1,
        description: 'Heavy feathering to smooth rough color-based edges.'
      },
      promptType: {
        default: 'point',
        options: ['point'],
        description: 'Only supports point-based color sampling.'
      }
    }
  },
  {
    id: 'mobile-sam',
    name: 'MobileSAM (light)',
    type: 'local',
    quality: 3,
    speed: 5,
    size: '77MB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '1.2 GB VRAM',
    requirements: 'PyTorch 2.x + MPS (Apple GPU) or ONNX Runtime Web',
    modelPath: '~/MagicImageEditorModels/mobile_sam/mobile_sam.pt',
    recommended: true,
    availabilityCheck: async () => {
      try {
        // Check if model file exists and PyTorch MPS is available
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/mobile_sam/mobile_sam.pt');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      promptType: {
        default: 'box',
        options: ['box', 'point'],
        description: 'Point prompts for single clicks, box prompts for drag selections'
      },
      predIouThresh: {
        default: 0.86,
        min: 0.5,
        max: 0.95,
        step: 0.05,
        description: 'IoU threshold for mask prediction confidence'
      },
      stabilityScoreThresh: {
        default: 0.92,
        min: 0.5,
        max: 0.99,
        step: 0.01,
        description: 'Stability score threshold for mask quality'
      },
      maskExpand: {
        default: 3,
        min: 0,
        max: 20,
        step: 1,
        description: 'Pixel dilation for mask expansion'
      },
      multimask: {
        default: true,
        description: 'Generate multiple mask candidates and select best'
      }
    }
  },
  {
    id: 'fast-sam',
    name: 'FastSAM',
    type: 'local',
    quality: 3,
    speed: 4,
    size: '140MB',
    hardware: 'mps',
    precision: 'fp16',
    memoryFootprint: '1.8 GB VRAM',
    requirements: 'PyTorch 2.x + MPS',
    modelPath: '~/MagicImageEditorModels/fastsam/FastSAM-x.pt',
    availabilityCheck: async () => {
      try {
        const fs = await import('fs');
        const path = require('path');
        const modelPath = path.expanduser('~/MagicImageEditorModels/fastsam/FastSAM-x.pt');
        return fs.existsSync(modelPath) && typeof window !== 'undefined' && 'torch' in window;
      } catch {
        return false;
      }
    },
    parameters: {
      promptType: {
        default: 'box',
        options: ['box', 'point'],
        description: 'FastSAM works best with box prompts'
      },
      conf: {
        default: 0.4,
        min: 0.1,
        max: 0.8,
        step: 0.05,
        description: 'Confidence threshold for object detection'
      },
      iou: {
        default: 0.9,
        min: 0.5,
        max: 0.95,
        step: 0.05,
        description: 'IoU threshold for non-maximum suppression'
      },
      maskExpand: {
        default: 3,
        min: 0,
        max: 15,
        step: 1,
        description: 'Pixel expansion for mask boundaries'
      }
    }
  }
];

export const defaultMagicGrabModel = 'mobile-sam';
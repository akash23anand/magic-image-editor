/**
 * Grab Text Tool Models Configuration
 * Defines all available models and their parameters for OCR text extraction
 */

import { BaseModelConfig } from './index';

export interface GrabTextModelConfig extends BaseModelConfig {
  parameters: {
    language: {
      default: string;
      options: string[];
      description: string;
    };
    psm: {
      default: number;
      options: number[];
      description: string;
    };
    oem: {
      default: number;
      options: number[];
      description: string;
    };
    dpi: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
    preprocessImage: {
      default: boolean;
      description: string;
    };
    confidenceThreshold: {
      default: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
  };
  modelPath?: string;
  apiEndpoint?: string;
  languagePacks?: string[];
}

export const grabTextModels: GrabTextModelConfig[] = [
  {
    id: 'easyocr-mps',
    name: 'EasyOCR (MPS)',
    type: 'local',
    quality: 5,
    speed: 4,
    size: '47MB',
    hardware: 'mps',
    precision: 'fp32',
    memoryFootprint: '800 MB VRAM',
    requirements: 'easyocr + PyTorch-MPS',
    recommended: true,
    availabilityCheck: async () => {
      try {
        // Check if EasyOCR is installed and MPS is available
        const { execSync } = require('child_process');
        execSync('python3 -c "import easyocr; import torch; assert torch.backends.mps.is_available()"', {
          stdio: 'ignore',
          timeout: 5000
        });
        return true;
      } catch {
        return false;
      }
    },
    parameters: {
      language: {
        default: 'en',
        options: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
        description: 'Language codes for EasyOCR recognition'
      },
      psm: {
        default: 0,
        options: [0],
        description: 'EasyOCR uses automatic text detection (no PSM needed)'
      },
      oem: {
        default: 0,
        options: [0],
        description: 'EasyOCR uses deep learning models (no OEM selection)'
      },
      dpi: {
        default: 300,
        min: 200,
        max: 600,
        step: 50,
        description: 'Image resolution for processing'
      },
      preprocessImage: {
        default: false,
        description: 'EasyOCR handles preprocessing internally'
      },
      confidenceThreshold: {
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'Confidence threshold (0.0-1.0 scale)'
      }
    }
  },
  {
    id: 'paddleocr-local',
    name: 'PaddleOCR (Local)',
    type: 'local',
    quality: 5,
    speed: 5,
    size: '8.1MB',
    hardware: 'cpu',
    precision: 'fp32',
    memoryFootprint: '512 MB RAM',
    requirements: 'paddlepaddle + paddleocr',
    modelPath: '~/MagicImageEditorModels/paddleocr/',
    availabilityCheck: async () => {
      try {
        const { execSync } = require('child_process');
        execSync('python3 -c "from paddleocr import PaddleOCR"', {
          stdio: 'ignore',
          timeout: 5000
        });
        return true;
      } catch {
        return false;
      }
    },
    parameters: {
      language: {
        default: 'en',
        options: ['en', 'ch', 'ta', 'te', 'ka', 'latin', 'arabic', 'cyrillic', 'devanagari'],
        description: 'PaddleOCR language models'
      },
      psm: {
        default: 0,
        options: [0],
        description: 'PaddleOCR uses automatic text detection and recognition'
      },
      oem: {
        default: 0,
        options: [0],
        description: 'Uses PaddlePaddle deep learning framework'
      },
      dpi: {
        default: 300,
        min: 150,
        max: 600,
        step: 50,
        description: 'Input image resolution'
      },
      preprocessImage: {
        default: true,
        description: 'Apply PaddleOCR preprocessing pipeline'
      },
      confidenceThreshold: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.05,
        description: 'Text detection confidence threshold'
      }
    }
  },
  {
    id: 'tesseract',
    name: 'Tesseract.js',
    type: 'browser',
    quality: 4,
    speed: 4,
    size: '15MB',
    languagePacks: ['/tessdata/eng.traineddata', '/tessdata/spa.traineddata', '/tessdata/fra.traineddata'],
    parameters: {
      language: {
        default: 'eng',
        options: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor'],
        description: 'OCR language for text recognition'
      },
      psm: {
        default: 6,
        options: [3, 4, 6, 7, 8, 9, 10, 11, 12, 13],
        description: 'Page Segmentation Mode (6=uniform block, 8=single word, 13=raw line)'
      },
      oem: {
        default: 3,
        options: [0, 1, 2, 3],
        description: 'OCR Engine Mode (3=default, 1=neural nets LSTM, 0=legacy)'
      },
      dpi: {
        default: 300,
        min: 150,
        max: 600,
        step: 50,
        description: 'Image DPI for OCR processing (higher = better quality, slower)'
      },
      preprocessImage: {
        default: true,
        description: 'Apply image preprocessing (contrast, sharpening, noise reduction)'
      },
      confidenceThreshold: {
        default: 60,
        min: 0,
        max: 100,
        step: 5,
        description: 'Minimum confidence score to accept recognized text'
      }
    }
  },
  {
    id: 'easyocr',
    name: 'EasyOCR',
    type: 'api',
    quality: 5,
    speed: 3,
    requirements: 'Python backend',
    apiEndpoint: 'http://localhost:8000/api/ocr',
    parameters: {
      language: {
        default: 'en',
        options: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
        description: 'Language codes for EasyOCR recognition'
      },
      psm: {
        default: 0,
        options: [0],
        description: 'EasyOCR uses automatic text detection (no PSM needed)'
      },
      oem: {
        default: 0,
        options: [0],
        description: 'EasyOCR uses deep learning models (no OEM selection)'
      },
      dpi: {
        default: 300,
        min: 200,
        max: 600,
        step: 50,
        description: 'Image resolution for processing'
      },
      preprocessImage: {
        default: false,
        description: 'EasyOCR handles preprocessing internally'
      },
      confidenceThreshold: {
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'Confidence threshold (0.0-1.0 scale)'
      }
    }
  },
  {
    id: 'paddleocr',
    name: 'PaddleOCR',
    type: 'api',
    quality: 5,
    speed: 4,
    requirements: 'Python backend',
    apiEndpoint: 'http://localhost:8000/api/paddle-ocr',
    parameters: {
      language: {
        default: 'en',
        options: ['en', 'ch', 'ta', 'te', 'ka', 'latin', 'arabic', 'cyrillic', 'devanagari'],
        description: 'PaddleOCR language models'
      },
      psm: {
        default: 0,
        options: [0],
        description: 'PaddleOCR uses automatic text detection and recognition'
      },
      oem: {
        default: 0,
        options: [0],
        description: 'Uses PaddlePaddle deep learning framework'
      },
      dpi: {
        default: 300,
        min: 150,
        max: 600,
        step: 50,
        description: 'Input image resolution'
      },
      preprocessImage: {
        default: true,
        description: 'Apply PaddleOCR preprocessing pipeline'
      },
      confidenceThreshold: {
        default: 0.8,
        min: 0.3,
        max: 1.0,
        step: 0.05,
        description: 'Text detection confidence threshold'
      }
    }
  },
  {
    id: 'simple-ocr',
    name: 'Simple Pattern OCR',
    type: 'fallback',
    quality: 2,
    speed: 5,
    parameters: {
      language: {
        default: 'eng',
        options: ['eng'],
        description: 'Basic English character recognition only'
      },
      psm: {
        default: 1,
        options: [1],
        description: 'Simple character-by-character recognition'
      },
      oem: {
        default: 0,
        options: [0],
        description: 'Template matching algorithm'
      },
      dpi: {
        default: 150,
        min: 100,
        max: 300,
        step: 50,
        description: 'Lower DPI for faster processing'
      },
      preprocessImage: {
        default: true,
        description: 'Heavy preprocessing required for simple OCR'
      },
      confidenceThreshold: {
        default: 30,
        min: 10,
        max: 80,
        step: 10,
        description: 'Lower threshold due to simple algorithm limitations'
      }
    }
  }
];

export const defaultGrabTextModel = 'easyocr-mps';
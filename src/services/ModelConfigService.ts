/**
 * Model Configuration Service
 * Manages model selection across all AI tools
 */

import { e2eLogger } from '../utils/E2ELogger';

export interface ModelConfig {
  id: string;
  name: string;
  type: 'browser' | 'local' | 'api' | 'fallback';
  quality: number; // 1-5 stars
  speed: number; // 1-5 lightning bolts
  size?: string;
  requirements?: string;
  recommended?: boolean;
}

export interface ToolModels {
  toolId: string;
  toolName: string;
  models: ModelConfig[];
  defaultModel: string;
}

class ModelConfigService {
  private toolModels: Map<string, ToolModels> = new Map();
  private selectedModels: Map<string, string> = new Map();

  constructor() {
    this.initializeModels();
    this.loadSavedSelections();
  }

  private initializeModels() {
    // Background Remover models
    this.toolModels.set('bg-remover', {
      toolId: 'bg-remover',
      toolName: 'Background Remover',
      models: [
        {
          id: 'u2net',
          name: 'U²-Net',
          type: 'browser',
          quality: 4,
          speed: 4,
          size: '5MB',
          recommended: true
        },
        {
          id: 'u2net-human',
          name: 'U²-Net Human Seg',
          type: 'browser',
          quality: 5,
          speed: 4,
          size: '5MB',
          requirements: 'Best for portraits'
        },
        {
          id: 'rembg',
          name: 'RemBG (API)',
          type: 'api',
          quality: 5,
          speed: 3,
          requirements: 'API key required'
        }
      ],
      defaultModel: 'u2net'
    });

    // Background Generator models
    this.toolModels.set('bg-generator', {
      toolId: 'bg-generator',
      toolName: 'Background Generator',
      models: [
        {
          id: 'fal-flux-pro',
          name: 'FAL: FLUX Pro',
          type: 'api',
          quality: 5,
          speed: 4,
          requirements: 'FAL_Key in .env',
          recommended: true
        },
        {
          id: 'sdxl-turbo',
          name: 'SDXL Turbo',
          type: 'api',
          quality: 5,
          speed: 3,
          requirements: 'Local API required',
          recommended: true
        },
        {
          id: 'sd2',
          name: 'Stable Diffusion 2.1',
          type: 'api',
          quality: 4,
          speed: 2,
          requirements: 'Local API required'
        },
        {
          id: 'dalle-mini',
          name: 'DALL-E Mini',
          type: 'browser',
          quality: 3,
          speed: 3,
          size: '1.5GB'
        },
        {
          id: 'gradient',
          name: 'Gradient Fallback',
          type: 'fallback',
          quality: 1,
          speed: 5,
          recommended: false
        }
      ],
      defaultModel: 'fal-flux-pro'
    });

    // Magic Eraser models
    this.toolModels.set('magic-eraser', {
      toolId: 'magic-eraser',
      toolName: 'Magic Eraser',
      models: [
        {
          id: 'fal-inpaint',
          name: 'FAL: Inpainting',
          type: 'api',
          quality: 5,
          speed: 4,
          requirements: 'FAL_Key in .env',
          recommended: true
        },
        {
          id: 'lama',
          name: 'LaMa',
          type: 'browser',
          quality: 4,
          speed: 4,
          size: '500MB',
          recommended: true
        },
        {
          id: 'sdxl-inpaint',
          name: 'SDXL Inpainting',
          type: 'api',
          quality: 5,
          speed: 2,
          requirements: 'Local API required'
        },
        {
          id: 'mat',
          name: 'MAT',
          type: 'browser',
          quality: 4,
          speed: 3,
          size: '800MB'
        },
        {
          id: 'blur',
          name: 'Blur Fallback',
          type: 'fallback',
          quality: 1,
          speed: 5
        }
      ],
      defaultModel: 'fal-inpaint'
    });

    // Magic Grab models
    this.toolModels.set('magic-grab', {
      toolId: 'magic-grab',
      toolName: 'Magic Grab',
      models: [
        {
          id: 'sam-vit-h',
          name: 'SAM ViT-H',
          type: 'browser',
          quality: 5,
          speed: 3,
          size: '2.4GB',
          recommended: true
        },
        {
          id: 'sam-vit-l',
          name: 'SAM ViT-L',
          type: 'browser',
          quality: 4,
          speed: 4,
          size: '1.2GB'
        },
        {
          id: 'sam-vit-b',
          name: 'SAM ViT-B',
          type: 'browser',
          quality: 3,
          speed: 5,
          size: '350MB'
        }
      ],
      defaultModel: 'sam-vit-b'
    });

    // Grab Text models
    this.toolModels.set('grab-text', {
      toolId: 'grab-text',
      toolName: 'Grab Text',
      models: [
        {
          id: 'tesseract',
          name: 'Tesseract.js',
          type: 'browser',
          quality: 4,
          speed: 4,
          size: '15MB',
          recommended: true
        },
        {
          id: 'easyocr',
          name: 'EasyOCR',
          type: 'api',
          quality: 5,
          speed: 3,
          requirements: 'Python backend'
        }
      ],
      defaultModel: 'tesseract'
    });

    // Magic Edit models
    this.toolModels.set('magic-edit', {
      toolId: 'magic-edit',
      toolName: 'Magic Edit',
      models: [
        {
          id: 'fal-edit',
          name: 'FAL: Image Edit',
          type: 'api',
          quality: 5,
          speed: 3,
          requirements: 'FAL_Key in .env',
          recommended: true
        },
        {
          id: 'instruct-pix2pix',
          name: 'InstructPix2Pix',
          type: 'api',
          quality: 5,
          speed: 2,
          requirements: 'Local API required',
          recommended: true
        },
        {
          id: 'controlnet-edit',
          name: 'ControlNet Edit',
          type: 'api',
          quality: 5,
          speed: 2,
          requirements: 'Local API required'
        },
        {
          id: 'filter',
          name: 'Filter Fallback',
          type: 'fallback',
          quality: 1,
          speed: 5
        }
      ],
      defaultModel: 'fal-edit'
    });

    // Magic Expand models
    this.toolModels.set('magic-expand', {
      toolId: 'magic-expand',
      toolName: 'Magic Expand',
      models: [
        {
          id: 'fal-outpaint',
          name: 'FAL: Outpainting',
          type: 'api',
          quality: 5,
          speed: 3,
          requirements: 'FAL_Key in .env',
          recommended: true
        },
        {
          id: 'lama',
          name: 'LaMa',
          type: 'browser',
          quality: 3,
          speed: 4,
          size: '500MB',
          recommended: true
        },
        {
          id: 'sd2-inpaint',
          name: 'SD 2.0 Inpainting',
          type: 'browser',
          quality: 4,
          speed: 3,
          size: '1.5GB'
        },
        {
          id: 'sdxl-inpaint',
          name: 'SDXL Inpainting',
          type: 'local',
          quality: 5,
          speed: 2,
          requirements: 'Local server, 6GB+'
        },
        {
          id: 'controlnet',
          name: 'ControlNet Inpainting',
          type: 'local',
          quality: 5,
          speed: 2,
          requirements: 'Local server, 4GB+'
        },
        {
          id: 'mat',
          name: 'MAT',
          type: 'browser',
          quality: 4,
          speed: 3,
          size: '800MB'
        },
        {
          id: 'fallback',
          name: 'Mirror & Fade',
          type: 'fallback',
          quality: 1,
          speed: 5
        }
      ],
      defaultModel: 'fal-outpaint'
    });
  }

  private loadSavedSelections() {
    try {
      const saved = localStorage.getItem('modelSelections');
      if (saved) {
        const selections = JSON.parse(saved);
        Object.entries(selections).forEach(([tool, model]) => {
          this.selectedModels.set(tool, model as string);
        });
      }
    } catch (error) {
      e2eLogger.warn('ModelConfigService', 'failed_to_load_saved_selections', { error });
    }
  }

  private saveSelections() {
    try {
      const selections: Record<string, string> = {};
      this.selectedModels.forEach((model, tool) => {
        selections[tool] = model;
      });
      localStorage.setItem('modelSelections', JSON.stringify(selections));
    } catch (error) {
      e2eLogger.warn('ModelConfigService', 'failed_to_save_selections', { error });
    }
  }

  getToolModels(toolId: string): ToolModels | undefined {
    return this.toolModels.get(toolId);
  }

  getAllTools(): ToolModels[] {
    return Array.from(this.toolModels.values());
  }

  getSelectedModel(toolId: string): string {
    const selected = this.selectedModels.get(toolId);
    if (selected) return selected;

    const toolConfig = this.toolModels.get(toolId);
    return toolConfig?.defaultModel || '';
  }

  setSelectedModel(toolId: string, modelId: string) {
    const toolConfig = this.toolModels.get(toolId);
    if (!toolConfig) {
      e2eLogger.error('ModelConfigService', 'unknown_tool', { toolId });
      return;
    }

    const model = toolConfig.models.find(m => m.id === modelId);
    if (!model) {
      e2eLogger.error('ModelConfigService', 'unknown_model', { toolId, modelId });
      return;
    }

    this.selectedModels.set(toolId, modelId);
    this.saveSelections();
    e2eLogger.info('ModelConfigService', 'model_selected', { toolId, modelId });
  }

  getModelConfig(toolId: string, modelId: string): ModelConfig | undefined {
    const toolConfig = this.toolModels.get(toolId);
    if (!toolConfig) return undefined;

    return toolConfig.models.find(m => m.id === modelId);
  }

  getRecommendedModel(toolId: string): ModelConfig | undefined {
    const toolConfig = this.toolModels.get(toolId);
    if (!toolConfig) return undefined;

    return toolConfig.models.find(m => m.recommended) || toolConfig.models[0];
  }

  isModelAvailable(toolId: string, modelId: string): boolean {
    const model = this.getModelConfig(toolId, modelId);
    if (!model) return false;

    // Check model availability based on type
    switch (model.type) {
      case 'fallback':
        return true; // Always available
      
      case 'browser':
        // Check if model is downloaded/cached
        // For now, return true for demo
        return true;
      
      case 'api':
        // FAL models: ensure FAL_Key and specific model slug exist
        if (modelId.startsWith('fal-')) {
          try {
            // @ts-ignore
            const env = (import.meta as any).env || {};
            const hasKey = Boolean(env.FAL_Key);
            let hasModelSlug = true;
            if (toolId === 'bg-generator' && modelId === 'fal-flux-pro') {
              hasModelSlug = Boolean(env.FAL_BG_MODEL);
            } else if (toolId === 'magic-eraser' && modelId === 'fal-inpaint') {
              hasModelSlug = Boolean(env.FAL_INPAINT_MODEL);
            } else if (toolId === 'magic-edit' && modelId === 'fal-edit') {
              hasModelSlug = Boolean(env.FAL_EDIT_MODEL);
            } else if (toolId === 'magic-expand' && modelId === 'fal-outpaint') {
              hasModelSlug = Boolean(env.FAL_OUTPAINT_MODEL);
            }
            return hasKey && hasModelSlug;
          } catch {
            return false;
          }
        }
        // Non-FAL API models: check configured API URL presence
        return !!localStorage.getItem('sdApiUrl');
      case 'local':
        // Local models depend on local server availability; use sdApiUrl flag
        return !!localStorage.getItem('sdApiUrl');
      
      default:
        return false;
    }
  }
}

// Export singleton
export const modelConfigService = new ModelConfigService();

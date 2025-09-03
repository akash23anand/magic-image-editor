/**
 * Model Configurations Index
 * Central export point for all tool model configurations
 * Enhanced with Apple Silicon optimization and local model support
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import all model configurations
export * from './bg-remover';
export * from './magic-grab';
export * from './bg-generator';
export * from './magic-eraser';
export * from './grab-text';
export * from './magic-edit';
export * from './magic-expand';

// Import specific types and defaults
import { bgRemoverModels, defaultBgRemoverModel, type BgRemoverModelConfig } from './bg-remover';
import { magicGrabModels, defaultMagicGrabModel, type MagicGrabModelConfig } from './magic-grab';
import { bgGeneratorModels, defaultBgGeneratorModel, type BgGeneratorModelConfig } from './bg-generator';
import { magicEraserModels, defaultMagicEraserModel, type MagicEraserModelConfig } from './magic-eraser';
import { grabTextModels, defaultGrabTextModel, type GrabTextModelConfig } from './grab-text';
import { magicEditModels, defaultMagicEditModel, type MagicEditModelConfig } from './magic-edit';
import { magicExpandModels, defaultMagicExpandModel, type MagicExpandModelConfig } from './magic-expand';

// Hardware acceleration types
export type HardwareType = 'mps' | 'coreml' | 'cpu' | 'webgpu' | 'wasm';
export type PrecisionType = 'fp32' | 'fp16' | 'int8' | 'palettized';

// Base model configuration interface
export interface BaseModelConfig {
  id: string;
  name: string;
  type: 'browser' | 'local' | 'api' | 'fallback';
  quality: number; // 1-5 stars
  speed: number; // 1-5 lightning bolts
  size?: string;
  requirements?: string;
  recommended?: boolean;
  hardware?: HardwareType;
  precision?: PrecisionType;
  memoryFootprint?: string; // e.g., "2.1 GB VRAM"
  availabilityCheck?: () => Promise<boolean>;
  modelPath?: string;
  apiEndpoint?: string;
}

// Union type for all model configurations
export type ModelConfig =
  | BgRemoverModelConfig
  | MagicGrabModelConfig
  | BgGeneratorModelConfig
  | MagicEraserModelConfig
  | GrabTextModelConfig
  | MagicEditModelConfig
  | MagicExpandModelConfig;

// Tool to models mapping
export const toolModelsMap = {
  'bg-remover': bgRemoverModels,
  'magic-grab': magicGrabModels,
  'bg-generator': bgGeneratorModels,
  'magic-eraser': magicEraserModels,
  'grab-text': grabTextModels,
  'magic-edit': magicEditModels,
  'magic-expand': magicExpandModels,
} as const;

// Default models mapping
export const defaultModelsMap = {
  'bg-remover': defaultBgRemoverModel,
  'magic-grab': defaultMagicGrabModel,
  'bg-generator': defaultBgGeneratorModel,
  'magic-eraser': defaultMagicEraserModel,
  'grab-text': defaultGrabTextModel,
  'magic-edit': defaultMagicEditModel,
  'magic-expand': defaultMagicExpandModel,
} as const;

// Tool names type
export type ToolName = keyof typeof toolModelsMap;

// Utility functions
export function getModelsForTool(toolName: ToolName): ModelConfig[] {
  return toolModelsMap[toolName] || [];
}

export function getDefaultModelForTool(toolName: ToolName): string {
  return defaultModelsMap[toolName] || '';
}

export function getModelById(toolName: ToolName, modelId: string): ModelConfig | undefined {
  const models = getModelsForTool(toolName);
  return models.find(model => model.id === modelId);
}

export function getRecommendedModelForTool(toolName: ToolName): ModelConfig | undefined {
  const models = getModelsForTool(toolName);
  return models.find(model => model.recommended) || models[0];
}

export async function getAvailableModelsForTool(toolName: ToolName): Promise<ModelConfig[]> {
  const models = getModelsForTool(toolName);
  const availableModels: ModelConfig[] = [];
  
  for (const model of models) {
    let isAvailable = false;
    
    switch (model.type) {
      case 'browser':
      case 'fallback':
        isAvailable = true;
        break;
      case 'api':
        // Check if API endpoint is configured
        isAvailable = !!localStorage.getItem('apiEndpoint') || !!model.apiEndpoint;
        break;
      case 'local':
        // Use custom availability check if provided, otherwise check file existence
        if (model.availabilityCheck) {
          try {
            isAvailable = await model.availabilityCheck();
          } catch (error) {
            console.warn(`Availability check failed for ${model.id}:`, error);
            isAvailable = false;
          }
        } else if (model.modelPath) {
          isAvailable = fs.existsSync(model.modelPath);
        } else {
          isAvailable = false;
        }
        break;
      default:
        isAvailable = false;
    }
    
    if (isAvailable) {
      availableModels.push(model);
    }
  }
  
  return availableModels;
}

// Model statistics
export function getModelStats() {
  const stats = {
    totalModels: 0,
    modelsByType: {
      browser: 0,
      local: 0,
      api: 0,
      fallback: 0,
    },
    modelsByTool: {} as Record<ToolName, number>,
    averageQuality: 0,
    averageSpeed: 0,
  };

  let totalQuality = 0;
  let totalSpeed = 0;

  Object.entries(toolModelsMap).forEach(([toolName, models]) => {
    stats.modelsByTool[toolName as ToolName] = models.length;
    stats.totalModels += models.length;

    models.forEach(model => {
      stats.modelsByType[model.type]++;
      totalQuality += model.quality;
      totalSpeed += model.speed;
    });
  });

  stats.averageQuality = totalQuality / stats.totalModels;
  stats.averageSpeed = totalSpeed / stats.totalModels;

  return stats;
}

// Apple Silicon optimization utilities
export function isAppleSilicon(): boolean {
  return process.arch === 'arm64' && process.platform === 'darwin';
}

export function getOptimalHardwareForModel(model: ModelConfig): HardwareType {
  if (!isAppleSilicon()) {
    return 'cpu';
  }
  
  // Prefer hardware acceleration on Apple Silicon
  if (model.hardware) {
    return model.hardware;
  }
  
  // Default preferences for Apple Silicon
  switch (model.type) {
    case 'local':
      return 'mps'; // Metal Performance Shaders for PyTorch
    case 'browser':
      return 'webgpu'; // WebGPU when available
    default:
      return 'cpu';
  }
}

export function getOptimalPrecisionForModel(model: ModelConfig): PrecisionType {
  if (model.precision) {
    return model.precision;
  }
  
  // Default precision based on hardware and memory constraints
  if (isAppleSilicon()) {
    const memoryGB = os.totalmem() / (1024 ** 3);
    
    if (memoryGB >= 32) {
      return 'fp32'; // High precision for high-memory systems
    } else if (memoryGB >= 16) {
      return 'fp16'; // Balanced precision for 16GB systems
    } else {
      return 'int8'; // Quantized for lower memory systems
    }
  }
  
  return 'fp32'; // Default for non-Apple Silicon
}

// Local model management utilities
export const MODELS_BASE_DIR = path.join(os.homedir(), 'MagicImageEditorModels');

export function getModelPath(modelId: string, subPath?: string): string {
  const basePath = path.join(MODELS_BASE_DIR, modelId);
  return subPath ? path.join(basePath, subPath) : basePath;
}

export function ensureModelDirectory(modelId: string): void {
  const modelDir = getModelPath(modelId);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
}

export async function checkModelAvailability(model: ModelConfig): Promise<{
  available: boolean;
  reason?: string;
  setupRequired?: boolean;
}> {
  if (model.type === 'browser' || model.type === 'fallback') {
    return { available: true };
  }
  
  if (model.type === 'api') {
    const hasEndpoint = !!localStorage.getItem('apiEndpoint') || !!model.apiEndpoint;
    return {
      available: hasEndpoint,
      reason: hasEndpoint ? undefined : 'API endpoint not configured',
      setupRequired: !hasEndpoint
    };
  }
  
  if (model.type === 'local') {
    if (model.availabilityCheck) {
      try {
        const available = await model.availabilityCheck();
        return {
          available,
          reason: available ? undefined : 'Custom availability check failed',
          setupRequired: !available
        };
      } catch (error) {
        return {
          available: false,
          reason: `Availability check error: ${error}`,
          setupRequired: true
        };
      }
    }
    
    if (model.modelPath) {
      const available = fs.existsSync(model.modelPath);
      return {
        available,
        reason: available ? undefined : `Model file not found: ${model.modelPath}`,
        setupRequired: !available
      };
    }
    
    return {
      available: false,
      reason: 'No availability check or model path specified',
      setupRequired: true
    };
  }
  
  return {
    available: false,
    reason: 'Unknown model type',
    setupRequired: true
  };
}

// Model filtering utilities
export function getLocalModelsForTool(toolName: ToolName): ModelConfig[] {
  return getModelsForTool(toolName).filter(model => model.type === 'local');
}

export function getAppleSiliconOptimizedModels(toolName: ToolName): ModelConfig[] {
  return getModelsForTool(toolName).filter(model =>
    model.hardware === 'mps' ||
    model.hardware === 'coreml' ||
    (model.type === 'local' && isAppleSilicon())
  );
}

export function getBestModelForHardware(toolName: ToolName, hardware: HardwareType): ModelConfig | undefined {
  const models = getModelsForTool(toolName);
  
  // First, try to find a model specifically optimized for this hardware
  const optimizedModel = models.find(model => model.hardware === hardware);
  if (optimizedModel) {
    return optimizedModel;
  }
  
  // Fallback to compatible models
  const compatibleModels = models.filter(model => {
    if (hardware === 'mps' || hardware === 'coreml') {
      return model.type === 'local' || model.type === 'browser';
    }
    if (hardware === 'webgpu') {
      return model.type === 'browser';
    }
    return true; // CPU can run anything
  });
  
  // Return the highest quality compatible model
  return compatibleModels.sort((a, b) => b.quality - a.quality)[0];
}

// Performance estimation utilities
export function estimateModelPerformance(model: ModelConfig): {
  estimatedLatency: string;
  memoryUsage: string;
  powerEfficiency: 'high' | 'medium' | 'low';
} {
  const hardware = getOptimalHardwareForModel(model);
  const precision = getOptimalPrecisionForModel(model);
  
  let latencyMultiplier = 1;
  let memoryMultiplier = 1;
  let powerEfficiency: 'high' | 'medium' | 'low' = 'medium';
  
  // Hardware impact
  switch (hardware) {
    case 'mps':
      latencyMultiplier = 0.3; // 3x faster
      powerEfficiency = 'high';
      break;
    case 'coreml':
      latencyMultiplier = 0.2; // 5x faster
      powerEfficiency = 'high';
      break;
    case 'webgpu':
      latencyMultiplier = 0.6; // 1.7x faster
      powerEfficiency = 'medium';
      break;
    case 'wasm':
      latencyMultiplier = 0.8; // 1.25x faster
      powerEfficiency = 'medium';
      break;
    case 'cpu':
      latencyMultiplier = 1.0;
      powerEfficiency = 'low';
      break;
  }
  
  // Precision impact
  switch (precision) {
    case 'int8':
      latencyMultiplier *= 0.5; // 2x faster
      memoryMultiplier = 0.25; // 4x less memory
      break;
    case 'fp16':
      latencyMultiplier *= 0.7; // 1.4x faster
      memoryMultiplier = 0.5; // 2x less memory
      break;
    case 'fp32':
      // baseline
      break;
    case 'palettized':
      latencyMultiplier *= 0.4; // 2.5x faster
      memoryMultiplier = 0.125; // 8x less memory
      break;
  }
  
  // Base estimates (rough approximations)
  const baseLatency = model.speed >= 4 ? 500 : model.speed >= 3 ? 1000 : 2000; // ms
  const baseMemory = model.size ? parseFloat(model.size) || 1000 : 1000; // MB
  
  const estimatedLatency = Math.round(baseLatency * latencyMultiplier);
  const estimatedMemory = Math.round(baseMemory * memoryMultiplier);
  
  return {
    estimatedLatency: estimatedLatency < 1000 ? `${estimatedLatency}ms` : `${(estimatedLatency/1000).toFixed(1)}s`,
    memoryUsage: estimatedMemory < 1024 ? `${estimatedMemory}MB` : `${(estimatedMemory/1024).toFixed(1)}GB`,
    powerEfficiency
  };
}

// Export tool names for convenience
export const TOOL_NAMES = Object.keys(toolModelsMap) as ToolName[];

// Export constants
export const MODEL_TYPES = ['browser', 'local', 'api', 'fallback'] as const;
export const HARDWARE_TYPES = ['mps', 'coreml', 'cpu', 'webgpu', 'wasm'] as const;
export const PRECISION_TYPES = ['fp32', 'fp16', 'int8', 'palettized'] as const;
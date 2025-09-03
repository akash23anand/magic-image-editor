/**
 * Layer Anything Engine - Core service for advanced layering functionality
 * Implements the comprehensive layering system from the PRP
 */

import { e2eLogger } from '../utils/E2ELogger';

// Core data types from PRP
export type LayerType = 'text' | 'object' | 'background';

export interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface RLE {
  counts: number[];
  size: [width: number, height: number];
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseLayerMeta {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: string;
  zIndex: number;
  
  // Geometry
  bbox: BBox;
  mask?: RLE | { pngBase64: string };
  areaPct: number; // Percentage of image area
  
  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string;
  
  // Transform when created
  originalTransform: Transform;
  currentTransform: Transform;
  
  // Model attribution
  source: {
    model: string;
    version: string;
    params?: Record<string, any>;
  };
  
  // Confidence scores
  scores?: {
    confidence?: number;
    ocr?: number;
    detection?: number;
    segmentation?: number;
  };
  
  // User-defined tags
  tags?: string[];
  
  // Operation history
  history: Array<{
    operation: string;
    params: any;
    timestamp: string;
    previousState?: any;
  }>;
}

export interface TextLayerMeta extends BaseLayerMeta {
  type: 'text';
  text: string;
  language?: string;
  granularity: 'word' | 'line' | 'paragraph' | 'block';
  
  fontEstimate?: {
    family: string;
    size: number;
    weight: number;
    style: 'normal' | 'italic';
    color: string;
    backgroundColor?: string;
    lineHeight: number;
  };
  
  textGeometry?: {
    baseline: number;
    ascent: number;
    descent: number;
    angle: number; // Rotation in degrees
  };
}

export interface ObjectLayerMeta extends BaseLayerMeta {
  type: 'object';
  category?: string; // e.g., 'person', 'dog', 'car'
  subcategory?: string; // e.g., 'face', 'hand' for person
  
  prompts?: Array<{
    type: 'box' | 'point' | 'text' | 'mask';
    value: any;
    timestamp: string;
  }>;
  
  attributes?: {
    pose?: string; // For people
    expression?: string; // For faces
    color?: string; // Dominant color
    texture?: string;
  };
}

export interface BackgroundLayerMeta extends BaseLayerMeta {
  type: 'background';
  originalImageHash: string; // SHA-256 of source
  excludedLayers: string[]; // IDs of layers cut out
  
  fillMethod?: 'inpaint' | 'blur' | 'color' | 'transparent';
  fillParams?: any;
}

export interface LayerGraph {
  id: string;
  name: string;
  sourceImage: {
    url: string;
    width: number;
    height: number;
    hash: string;
  };
  
  layers: Map<string, BaseLayerMeta>;
  rootLayerId: string; // Background layer
  
  // Hierarchical relationships
  children: Map<string, string[]>; // parentId -> childIds
  
  // Global settings
  canvasTransform: Transform;
  exportSettings: {
    format: 'psd' | 'svg' | 'json';
    quality: number;
    includeMetadata: boolean;
  };
}

export interface OCRResult {
  blocks: Array<{
    text: string;
    bbox: BBox;
    confidence: number;
    type: 'word' | 'line' | 'paragraph' | 'block';
    language?: string;
  }>;
  metadata: {
    model: string;
    version: string;
    processingTime: number;
  };
}

export interface SegmentationResult {
  masks: Array<{
    mask: RLE;
    bbox: BBox;
    area: number;
    confidence: number;
  }>;
  metadata: {
    model: string;
    version: string;
    processingTime: number;
    promptType: string;
  };
}

export interface DetectionResult {
  detections: Array<{
    bbox: BBox;
    category: string;
    confidence: number;
    attributes?: Record<string, any>;
  }>;
  metadata: {
    model: string;
    version: string;
    processingTime: number;
  };
}

export class LayerAnythingEngine {
  private layerGraph: LayerGraph | null = null;
  private nextLayerId = 1;

  constructor() {
    e2eLogger.info('LayerAnythingEngine', 'initialized');
  }

  /**
   * Initialize a new layer graph from an image
   */
  async initializeFromImage(
    imageUrl: string,
    imageDimensions: { width: number; height: number }
  ): Promise<string> {
    const graphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate image hash for integrity
    const imageHash = await this.calculateImageHash(imageUrl);
    
    // Create background layer
    const backgroundLayer: BackgroundLayerMeta = {
      id: this.generateLayerId(),
      type: 'background',
      name: 'Background',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      zIndex: 0,
      bbox: { x: 0, y: 0, width: imageDimensions.width, height: imageDimensions.height },
      areaPct: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      currentTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      source: {
        model: 'LayerAnythingEngine',
        version: '1.0.0'
      },
      history: [],
      originalImageHash: imageHash,
      excludedLayers: []
    };

    this.layerGraph = {
      id: graphId,
      name: 'Layer Graph',
      sourceImage: {
        url: imageUrl,
        width: imageDimensions.width,
        height: imageDimensions.height,
        hash: imageHash
      },
      layers: new Map([[backgroundLayer.id, backgroundLayer]]),
      rootLayerId: backgroundLayer.id,
      children: new Map(),
      canvasTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      exportSettings: {
        format: 'json',
        quality: 1,
        includeMetadata: true
      }
    };

    e2eLogger.info('LayerAnythingEngine', 'graph_initialized', {
      graphId,
      imageHash,
      imageDimensions
    });

    return graphId;
  }

  /**
   * Create a text layer from OCR results
   */
  async createTextLayer(
    ocrResult: OCRResult['blocks'][0],
    options: {
      refineWithServer?: boolean;
      preserveFormatting?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.layerGraph) {
      throw new Error('Layer graph not initialized');
    }

    const layerId = this.generateLayerId();
    const now = new Date().toISOString();

    const textLayer: TextLayerMeta = {
      id: layerId,
      type: 'text',
      name: `Text: ${ocrResult.text.substring(0, 20)}...`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      zIndex: this.getNextZIndex(),
      bbox: ocrResult.bbox,
      areaPct: this.calculateAreaPercentage(ocrResult.bbox),
      createdAt: now,
      updatedAt: now,
      originalTransform: { ...this.layerGraph.canvasTransform },
      currentTransform: { ...this.layerGraph.canvasTransform },
      source: {
        model: 'Tesseract.js',
        version: '5.1.1',
        params: options
      },
      scores: {
        ocr: ocrResult.confidence,
        confidence: ocrResult.confidence
      },
      tags: ['text', 'ocr'],
      history: [{
        operation: 'create_text_layer',
        params: { ocrResult, options },
        timestamp: now
      }],
      text: ocrResult.text,
      language: ocrResult.language,
      granularity: ocrResult.type,
      fontEstimate: this.estimateFont(ocrResult),
      textGeometry: this.calculateTextGeometry(ocrResult)
    };

    this.layerGraph.layers.set(layerId, textLayer);

    e2eLogger.info('LayerAnythingEngine', 'text_layer_created', {
      layerId,
      text: ocrResult.text,
      confidence: ocrResult.confidence
    });

    return layerId;
  }

  /**
   * Create an object layer from segmentation results
   */
  async createObjectLayer(
    mask: RLE,
    bbox: BBox,
    options: {
      category?: string;
      refineEdges?: boolean;
      featherRadius?: number;
    } = {}
  ): Promise<string> {
    if (!this.layerGraph) {
      throw new Error('Layer graph not initialized');
    }

    const layerId = this.generateLayerId();
    const now = new Date().toISOString();

    const objectLayer: ObjectLayerMeta = {
      id: layerId,
      type: 'object',
      name: options.category ? `${options.category}` : 'Object',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      zIndex: this.getNextZIndex(),
      bbox,
      mask,
      areaPct: this.calculateAreaPercentage(bbox),
      createdAt: now,
      updatedAt: now,
      originalTransform: { ...this.layerGraph.canvasTransform },
      currentTransform: { ...this.layerGraph.canvasTransform },
      source: {
        model: 'SAM',
        version: '1.0.0',
        params: options
      },
      scores: {
        segmentation: 0.8, // Default confidence
        confidence: 0.8
      },
      tags: ['object', 'segmentation'],
      history: [{
        operation: 'create_object_layer',
        params: { bbox, options },
        timestamp: now
      }],
      category: options.category,
      prompts: [{
        type: 'mask',
        value: mask,
        timestamp: now
      }]
    };

    this.layerGraph.layers.set(layerId, objectLayer);

    e2eLogger.info('LayerAnythingEngine', 'object_layer_created', {
      layerId,
      category: options.category,
      bbox
    });

    return layerId;
  }

  /**
   * Update background layer to exclude foreground layers
   */
  async updateBackgroundLayer(excludedLayerIds: string[]): Promise<void> {
    if (!this.layerGraph) {
      throw new Error('Layer graph not initialized');
    }

    const backgroundLayer = this.layerGraph.layers.get(this.layerGraph.rootLayerId) as BackgroundLayerMeta;
    if (!backgroundLayer) {
      throw new Error('Background layer not found');
    }

    backgroundLayer.excludedLayers = [...excludedLayerIds];
    backgroundLayer.updatedAt = new Date().toISOString();
    backgroundLayer.history.push({
      operation: 'update_excluded_layers',
      params: { excludedLayerIds },
      timestamp: backgroundLayer.updatedAt
    });

    e2eLogger.info('LayerAnythingEngine', 'background_updated', {
      excludedLayerIds
    });
  }

  /**
   * Move a layer to a new position
   */
  moveLayer(layerId: string, delta: { x: number; y: number }): boolean {
    if (!this.layerGraph) return false;

    const layer = this.layerGraph.layers.get(layerId);
    if (!layer || layer.locked) return false;

    const now = new Date().toISOString();
    layer.currentTransform.offsetX += delta.x;
    layer.currentTransform.offsetY += delta.y;
    layer.updatedAt = now;
    layer.history.push({
      operation: 'move_layer',
      params: { delta },
      timestamp: now
    });

    e2eLogger.debug('LayerAnythingEngine', 'layer_moved', {
      layerId,
      delta,
      newTransform: layer.currentTransform
    });

    return true;
  }

  /**
   * Resize a layer
   */
  resizeLayer(layerId: string, scale: number): boolean {
    if (!this.layerGraph) return false;

    const layer = this.layerGraph.layers.get(layerId);
    if (!layer || layer.locked) return false;

    const now = new Date().toISOString();
    layer.currentTransform.scale *= scale;
    layer.updatedAt = now;
    layer.history.push({
      operation: 'resize_layer',
      params: { scale },
      timestamp: now
    });

    e2eLogger.debug('LayerAnythingEngine', 'layer_resized', {
      layerId,
      scale,
      newScale: layer.currentTransform.scale
    });

    return true;
  }

  /**
   * Get all layers sorted by z-index
   */
  getLayers(): BaseLayerMeta[] {
    if (!this.layerGraph) return [];

    return Array.from(this.layerGraph.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get layer by ID
   */
  getLayer(layerId: string): BaseLayerMeta | null {
    if (!this.layerGraph) return null;
    return this.layerGraph.layers.get(layerId) || null;
  }

  /**
   * Export layer graph to JSON
   */
  exportToJSON(): string {
    if (!this.layerGraph) {
      throw new Error('No layer graph to export');
    }

    const exportData = {
      ...this.layerGraph,
      layers: Array.from(this.layerGraph.layers.entries()),
      children: Array.from(this.layerGraph.children.entries()),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Private helper methods
  private generateLayerId(): string {
    return `layer_${Date.now()}_${this.nextLayerId++}`;
  }

  private getNextZIndex(): number {
    if (!this.layerGraph) return 1;
    
    const maxZ = Math.max(...Array.from(this.layerGraph.layers.values()).map(l => l.zIndex));
    return maxZ + 1;
  }

  private calculateAreaPercentage(bbox: BBox): number {
    if (!this.layerGraph) return 0;
    
    const imageArea = this.layerGraph.sourceImage.width * this.layerGraph.sourceImage.height;
    const layerArea = bbox.width * bbox.height;
    return (layerArea / imageArea) * 100;
  }

  private async calculateImageHash(imageUrl: string): Promise<string> {
    // Simple hash based on URL and timestamp for now
    // In production, this would calculate actual image content hash
    const encoder = new TextEncoder();
    const data = encoder.encode(imageUrl + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private estimateFont(ocrResult: OCRResult['blocks'][0]): TextLayerMeta['fontEstimate'] {
    // Basic font estimation based on bbox dimensions
    const estimatedSize = Math.max(12, Math.min(72, ocrResult.bbox.height * 0.8));
    
    return {
      family: 'Arial, sans-serif',
      size: estimatedSize,
      weight: 400,
      style: 'normal',
      color: '#000000',
      lineHeight: ocrResult.bbox.height
    };
  }

  private calculateTextGeometry(ocrResult: OCRResult['blocks'][0]): TextLayerMeta['textGeometry'] {
    return {
      baseline: ocrResult.bbox.y + ocrResult.bbox.height * 0.8,
      ascent: ocrResult.bbox.height * 0.8,
      descent: ocrResult.bbox.height * 0.2,
      angle: 0 // Assume horizontal text for now
    };
  }
}

// Export singleton
export const layerAnythingEngine = new LayerAnythingEngine();
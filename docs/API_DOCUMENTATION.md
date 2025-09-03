# Layer Anything - API Documentation

## Overview

Layer Anything is an advanced on-canvas layering system that provides OCR text extraction, object detection, segmentation, and rich metadata attribution for images. This documentation covers the complete API for integrating Layer Anything into your applications.

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Getting Started](#getting-started)
3. [LayerAnythingEngine API](#layeranythingengine-api)
4. [Data Types](#data-types)
5. [Services](#services)
6. [Components](#components)
7. [Integration Examples](#integration-examples)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling](#error-handling)
10. [Export Formats](#export-formats)

## Core Architecture

Layer Anything follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer Anything System                    │
├─────────────────────────────────────────────────────────────┤
│  Components Layer                                           │
│  ├── LayerAnythingEditor (Main Integration)                 │
│  ├── LayerAnythingCanvas (WebGL Rendering)                  │
│  ├── LayersPanel (Layer Management UI)                      │
│  ├── ToolPalette (Tool Selection)                           │
│  └── SettingsPanel (Configuration)                          │
├─────────────────────────────────────────────────────────────┤
│  Engine Layer                                               │
│  └── LayerAnythingEngine (Core Logic & State Management)    │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                             │
│  ├── OCRService (Tesseract.js + Server Fallback)           │
│  ├── SegmentationService (SAM + Grounding DINO)             │
│  ├── U2NetService (Background Removal)                      │
│  └── StableDiffusionService (AI Enhancement)                │
├─────────────────────────────────────────────────────────────┤
│  Utilities Layer                                            │
│  ├── CoordinateHelpers (Transform Math)                     │
│  ├── E2ELogger (Comprehensive Logging)                      │
│  └── WorkerManager (Parallel Processing)                    │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Installation

```bash
npm install layer-anything
```

### Basic Usage

```typescript
import { LayerAnythingEditor } from 'layer-anything';

function MyApp() {
  return (
    <LayerAnythingEditor
      imageUrl="/path/to/image.jpg"
      onLayerChange={(layers) => console.log('Layers updated:', layers)}
      onExport={(data, format) => console.log('Export:', format, data)}
    />
  );
}
```

### Advanced Integration

```typescript
import { 
  LayerAnythingEngine, 
  layerAnythingEngine,
  ocrService,
  segmentationService 
} from 'layer-anything';

// Initialize engine
const engine = new LayerAnythingEngine();
await engine.initializeFromImage('/path/to/image.jpg', {
  width: 800,
  height: 600
});

// Extract text layers
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

const ocrResult = await ocrService.recognize(imageData, {
  level: 'paragraph',
  confidence: 0.7
});

for (const block of ocrResult.blocks) {
  await engine.createTextLayer(block);
}

// Get all layers
const layers = engine.getLayers();
console.log('Created layers:', layers);
```

## LayerAnythingEngine API

### Constructor

```typescript
const engine = new LayerAnythingEngine();
```

### Core Methods

#### `initializeFromImage(imageUrl: string, dimensions: { width: number; height: number }): Promise<string>`

Initializes a new layer graph from an image.

**Parameters:**
- `imageUrl`: URL or path to the source image
- `dimensions`: Image dimensions in pixels

**Returns:** Promise resolving to the graph ID

**Example:**
```typescript
const graphId = await engine.initializeFromImage('/image.jpg', {
  width: 1024,
  height: 768
});
```

#### `createTextLayer(ocrResult: OCRBlock, options?: TextLayerOptions): Promise<string>`

Creates a text layer from OCR results.

**Parameters:**
- `ocrResult`: OCR block data with text, bbox, and confidence
- `options`: Optional configuration for text processing

**Returns:** Promise resolving to the layer ID

**Example:**
```typescript
const layerId = await engine.createTextLayer({
  text: 'Sample text',
  bbox: { x: 100, y: 50, width: 200, height: 30 },
  confidence: 0.95,
  type: 'paragraph',
  language: 'en'
});
```

#### `createObjectLayer(mask: RLE, bbox: BBox, options?: ObjectLayerOptions): Promise<string>`

Creates an object layer from segmentation results.

**Parameters:**
- `mask`: Run-length encoded mask data
- `bbox`: Bounding box of the object
- `options`: Optional object categorization and refinement

**Returns:** Promise resolving to the layer ID

**Example:**
```typescript
const layerId = await engine.createObjectLayer(
  { counts: [100, 50, 100], size: [200, 150] },
  { x: 100, y: 100, width: 200, height: 150 },
  { category: 'person', refineEdges: true }
);
```

#### `updateBackgroundLayer(excludedLayerIds: string[]): Promise<void>`

Updates the background layer to exclude specified foreground layers.

**Parameters:**
- `excludedLayerIds`: Array of layer IDs to exclude from background

**Example:**
```typescript
await engine.updateBackgroundLayer(['layer_1', 'layer_2']);
```

#### `getLayers(): BaseLayerMeta[]`

Returns all layers sorted by z-index.

**Returns:** Array of layer metadata objects

#### `getLayer(layerId: string): BaseLayerMeta | null`

Gets a specific layer by ID.

**Parameters:**
- `layerId`: The layer identifier

**Returns:** Layer metadata or null if not found

#### `moveLayer(layerId: string, delta: { x: number; y: number }): boolean`

Moves a layer by the specified offset.

**Parameters:**
- `layerId`: The layer to move
- `delta`: X and Y offset in pixels

**Returns:** Success boolean

#### `resizeLayer(layerId: string, scale: number): boolean`

Resizes a layer by the specified scale factor.

**Parameters:**
- `layerId`: The layer to resize
- `scale`: Scale multiplier (1.0 = no change)

**Returns:** Success boolean

#### `exportToJSON(): string`

Exports the complete layer graph as JSON.

**Returns:** JSON string representation of the layer graph

## Data Types

### Core Interfaces

#### `BaseLayerMeta`

Base interface for all layer types:

```typescript
interface BaseLayerMeta {
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
  areaPct: number;
  
  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string;
  
  // Transform information
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
```

#### `TextLayerMeta`

Extended interface for text layers:

```typescript
interface TextLayerMeta extends BaseLayerMeta {
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
```

#### `ObjectLayerMeta`

Extended interface for object layers:

```typescript
interface ObjectLayerMeta extends BaseLayerMeta {
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
```

#### `BackgroundLayerMeta`

Extended interface for background layers:

```typescript
interface BackgroundLayerMeta extends BaseLayerMeta {
  type: 'background';
  originalImageHash: string; // SHA-256 of source
  excludedLayers: string[]; // IDs of layers cut out
  
  fillMethod?: 'inpaint' | 'blur' | 'color' | 'transparent';
  fillParams?: any;
}
```

### Utility Types

#### `BBox`

Bounding box representation:

```typescript
interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### `RLE`

Run-length encoded mask:

```typescript
interface RLE {
  counts: number[];
  size: [width: number, height: number];
}
```

#### `Transform`

Coordinate transformation:

```typescript
interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}
```

## Services

### OCRService

Handles text recognition with Tesseract.js and server fallbacks.

#### `recognize(imageData: ImageData, options: OCROptions): Promise<OCRResult>`

**Options:**
```typescript
interface OCROptions {
  level?: 'word' | 'line' | 'paragraph' | 'block';
  confidence?: number; // 0-1, minimum confidence threshold
  language?: string; // ISO language code
  useServer?: boolean; // Fallback to server OCR
}
```

### SegmentationService

Handles object segmentation using SAM and detection models.

#### `segment(imageData: ImageData, prompt: SegmentationPrompt): Promise<SegmentationResult>`

**Prompt Types:**
```typescript
type SegmentationPrompt = 
  | { type: 'point'; data: { x: number; y: number }[] }
  | { type: 'box'; data: BBox }
  | { type: 'mask'; data: RLE }
  | { type: 'text'; data: string };
```

#### `detect(imageData: ImageData, options: DetectionOptions): Promise<DetectionResult>`

**Options:**
```typescript
interface DetectionOptions {
  labels?: string[]; // Object categories to detect
  threshold?: number; // Confidence threshold
  maxDetections?: number; // Maximum number of objects
}
```

### U2NetService

Handles background removal and matting.

#### `removeBackground(imageData: ImageData, options?: MattingOptions): Promise<ImageData>`

**Options:**
```typescript
interface MattingOptions {
  refinement?: boolean; // Edge refinement
  featherRadius?: number; // Edge softening
  qualityMode?: 'fast' | 'balanced' | 'high';
}
```

## Components

### LayerAnythingEditor

Main integration component that provides the complete Layer Anything interface.

#### Props

```typescript
interface LayerAnythingEditorProps {
  imageUrl?: string;
  onLayerChange?: (layers: BaseLayerMeta[]) => void;
  onExport?: (data: string, format: string) => void;
}
```

#### Usage

```typescript
<LayerAnythingEditor
  imageUrl="/path/to/image.jpg"
  onLayerChange={(layers) => {
    console.log('Layers updated:', layers.length);
    // Handle layer changes
  }}
  onExport={(data, format) => {
    // Handle export
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    // Save or process blob
  }}
/>
```

### LayerAnythingCanvas

WebGL-accelerated canvas component with coordinate transformation.

#### Props

```typescript
interface LayerAnythingCanvasProps {
  imageUrl: string;
  onTransformChange?: (transform: Transform) => void;
}
```

#### Ref Methods

```typescript
interface LayerAnythingCanvasRef {
  getCanvas(): HTMLCanvasElement | null;
  canvasToImage(point: { x: number; y: number }): { x: number; y: number };
  imageToCanvas(point: { x: number; y: number }): { x: number; y: number };
  addHighlight(region: HighlightRegion): void;
  clearHighlights(): void;
}
```

### LayersPanel

Figma-style layer management interface.

#### Props

```typescript
interface LayersPanelProps {
  layers: BaseLayerMeta[];
  selectedLayerId?: string;
  onLayerSelect: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerRename: (layerId: string, newName: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerReorder: (layerId: string, newIndex: number) => void;
  onLayerGroup: (layerIds: string[]) => void;
  onLayerUngroup: (groupId: string) => void;
}
```

## Integration Examples

### React Integration

```typescript
import React, { useState, useCallback } from 'react';
import { LayerAnythingEditor, BaseLayerMeta } from 'layer-anything';

function ImageEditor() {
  const [layers, setLayers] = useState<BaseLayerMeta[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');

  const handleLayerChange = useCallback((newLayers: BaseLayerMeta[]) => {
    setLayers(newLayers);
    // Sync with your application state
  }, []);

  const handleExport = useCallback((data: string, format: string) => {
    // Handle export based on format
    switch (format) {
      case 'json':
        downloadJSON(data, 'layers.json');
        break;
      case 'psd':
        // Convert to PSD format
        break;
      case 'svg':
        // Convert to SVG format
        break;
    }
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      <LayerAnythingEditor
        imageUrl={selectedImage}
        onLayerChange={handleLayerChange}
        onExport={handleExport}
      />
    </div>
  );
}
```

### Headless Usage

```typescript
import { 
  LayerAnythingEngine, 
  ocrService, 
  segmentationService 
} from 'layer-anything';

async function processImageHeadless(imageUrl: string) {
  // Initialize engine
  const engine = new LayerAnythingEngine();
  
  // Load image
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  // Initialize layer graph
  await engine.initializeFromImage(imageUrl, {
    width: img.width,
    height: img.height
  });

  // Create canvas for processing
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Extract text
  const ocrResult = await ocrService.recognize(imageData, {
    level: 'paragraph',
    confidence: 0.6
  });

  for (const block of ocrResult.blocks) {
    await engine.createTextLayer(block);
  }

  // Detect and segment objects
  const detectionResult = await segmentationService.detect(imageData, {
    labels: ['person', 'object'],
    threshold: 0.5
  });

  for (const detection of detectionResult.detections) {
    const segResult = await segmentationService.segment(imageData, {
      type: 'box',
      data: detection.bbox
    });

    if (segResult.masks.length > 0) {
      await engine.createObjectLayer(
        segResult.masks[0].mask,
        detection.bbox,
        { category: detection.category }
      );
    }
  }

  // Export results
  const exportData = engine.exportToJSON();
  return JSON.parse(exportData);
}
```

### Custom Tool Integration

```typescript
import { LayerAnythingEngine, segmentationService } from 'layer-anything';

class CustomSegmentationTool {
  constructor(private engine: LayerAnythingEngine) {}

  async segmentByColor(
    imageData: ImageData, 
    targetColor: { r: number; g: number; b: number },
    tolerance: number = 10
  ) {
    // Custom color-based segmentation
    const mask = this.createColorMask(imageData, targetColor, tolerance);
    const bbox = this.calculateBoundingBox(mask);
    
    // Convert to RLE format
    const rleMask = this.convertToRLE(mask);
    
    // Create layer
    const layerId = await this.engine.createObjectLayer(rleMask, bbox, {
      category: 'color-segment',
      attributes: { 
        color: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})` 
      }
    });

    return layerId;
  }

  private createColorMask(
    imageData: ImageData, 
    targetColor: { r: number; g: number; b: number }, 
    tolerance: number
  ): boolean[] {
    const mask: boolean[] = [];
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - targetColor.r, 2) +
        Math.pow(g - targetColor.g, 2) +
        Math.pow(b - targetColor.b, 2)
      );

      mask.push(distance <= tolerance);
    }

    return mask;
  }

  private calculateBoundingBox(mask: boolean[]): BBox {
    // Implementation to find bounding box of mask
    // ... implementation details
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  private convertToRLE(mask: boolean[]): RLE {
    // Implementation to convert boolean mask to RLE
    // ... implementation details
    return { counts: [100, 50, 100], size: [200, 150] };
  }
}
```

## Performance Optimization

### WebGL Acceleration

Layer Anything uses WebGL for rendering when available:

```typescript
// Check WebGL support
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (gl) {
  console.log('WebGL acceleration available');
}
```

### Worker-based Processing

Heavy operations run in Web Workers:

```typescript
import { WorkerManager } from 'layer-anything/utils';

const workerManager = new WorkerManager();

// OCR processing in worker
const ocrResult = await workerManager.runOCR(imageData, options);

// Segmentation in worker
const segResult = await workerManager.runSegmentation(imageData, prompt);
```

### Memory Management

```typescript
// Dispose of large objects when done
engine.dispose(); // Cleans up WebGL contexts and large buffers

// Use progressive loading for large images
const progressiveLoader = new ProgressiveImageLoader();
await progressiveLoader.load(imageUrl, {
  onProgress: (percent) => console.log(`Loading: ${percent}%`),
  maxSize: { width: 2048, height: 2048 } // Limit size for performance
});
```

### Caching Strategies

```typescript
// Enable result caching
const engine = new LayerAnythingEngine({
  enableCache: true,
  cacheSize: 100, // Number of results to cache
  cacheTTL: 3600000 // 1 hour in milliseconds
});

// Preload models for faster processing
await ocrService.preloadModels();
await segmentationService.preloadModels();
```

## Error Handling

### Error Types

```typescript
// Custom error types
class LayerAnythingError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'LayerAnythingError';
  }
}

class OCRError extends LayerAnythingError {
  constructor(message: string, context?: any) {
    super(message, 'OCR_ERROR', context);
  }
}

class SegmentationError extends LayerAnythingError {
  constructor(message: string, context?: any) {
    super(message, 'SEGMENTATION_ERROR', context);
  }
}
```

### Error Handling Patterns

```typescript
try {
  const layerId = await engine.createTextLayer(ocrBlock);
} catch (error) {
  if (error instanceof OCRError) {
    console.error('OCR failed:', error.message, error.context);
    // Handle OCR-specific error
  } else if (error instanceof LayerAnythingError) {
    console.error('Layer Anything error:', error.code, error.message);
    // Handle general Layer Anything error
  } else {
    console.error('Unexpected error:', error);
    // Handle unexpected error
  }
}
```

### Graceful Degradation

```typescript
// Fallback strategies
const engine = new LayerAnythingEngine({
  fallbackStrategies: {
    ocr: 'server', // Fall back to server OCR if client fails
    segmentation: 'simple', // Use simple segmentation if SAM fails
    rendering: 'canvas2d' // Fall back to Canvas 2D if WebGL fails
  }
});
```

## Export Formats

### JSON Export

Complete layer graph with metadata:

```json
{
  "id": "graph_1234567890",
  "name": "Layer Graph",
  "sourceImage": {
    "url": "/path/to/image.jpg",
    "width": 1024,
    "height": 768,
    "hash": "sha256_hash"
  },
  "layers": [
    {
      "id": "layer_1",
      "type": "text",
      "name": "Sample Text",
      "visible": true,
      "locked": false,
      "opacity": 1,
      "blendMode": "normal",
      "zIndex": 1,
      "bbox": { "x": 100, "y": 50, "width": 200, "height": 30 },
      "areaPct": 2.5,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "originalTransform": { "scale": 1, "offsetX": 0, "offsetY": 0 },
      "currentTransform": { "scale": 1, "offsetX": 0, "offsetY": 0 },
      "source": {
        "model": "Tesseract.js",
        "version": "5.1.1"
      },
      "scores": {
        "ocr": 0.95,
        "confidence": 0.95
      },
      "tags": ["text", "ocr"],
      "history": [
        {
          "operation": "create_text_layer",
          "params": {},
          "timestamp": "2024-01-01T12:00:00.000Z"
        }
      ],
      "text": "Sample text content",
      "language": "en",
      "granularity": "paragraph"
    }
  ],
  "exportedAt": "2024-01-01T12:00:00.000Z"
}
```

### PSD Export (Planned)

```typescript
// Future PSD export capability
const psdData = await engine.exportToPSD({
  includeMetadata: true,
  preserveBlendModes: true,
  compression: 'zip'
});
```

### SVG Export (Planned)

```typescript
// Future SVG export capability
const svgData = await engine.exportToSVG({
  includeText: true,
  vectorizeShapes: true,
  embedImages: false
});
```

## Logging and Debugging

### E2E Logger

Comprehensive logging system:

```typescript
import { e2eLogger } from 'layer-anything/utils';

// Configure logging
e2eLogger.configure({
  level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
  enableConsole: true,
  enableStorage: true,
  maxStorageSize: 1000 // Maximum log entries
});

// Custom logging
e2eLogger.info('MyComponent', 'operation_complete', {
  layerId: 'layer_1',
  processingTime: 1500
});
```

### Performance Monitoring

```typescript
// Built-in performance monitoring
const performanceMonitor = engine.getPerformanceMonitor();

performanceMonitor.on('operation_complete', (event) => {
  console.log(`${event.operation} took ${event.duration}ms`);
});

// Get performance metrics
const metrics = performanceMonitor.getMetrics();
console.log('Average OCR time:', metrics.ocr.averageTime);
console.log('Memory usage:', metrics.memory.current);
```

## Browser Compatibility

### Minimum Requirements

- **Chrome/Edge**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Mobile Safari**: 14+
- **Chrome Mobile**: 88+

### Feature Detection

```typescript
import { FeatureDetector } from 'layer-anything/utils';

const features = new FeatureDetector();

if (features.hasWebGL()) {
  console.log('WebGL acceleration available');
}

if (features.hasWebWorkers()) {
  console.log('Web Workers available for parallel processing');
}

if (features.hasOffscreenCanvas()) {
  console.log('OffscreenCanvas available for background processing');
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

For more examples and advanced usage patterns, see the [examples directory](./examples/) and the [demo application](../src/demo/).
# Layer Anything - Technical Specification for Proper Layer Extraction

## Overview

This document provides detailed technical specifications for implementing proper in-place layer extraction in the Layer Anything feature. The core requirement is that content must be extracted from its original position in the image, not overlaid on top.

## Core Concepts

### 1. In-Place Extraction

**Definition**: Removing pixels from their original location in the source image and placing them in a separate, movable layer while filling the vacated space with appropriate content.

```
Original Image → Extract Content → Layer + Filled Background
```

### 2. Layer Types and Extraction Methods

#### Text Layer Extraction

**Input**: OCR bounding box and confidence data
**Output**: Extracted text pixels + filled background

```typescript
interface TextExtractionSpec {
  // Step 1: Detect text pixels within OCR bbox
  detectTextPixels(
    imageData: ImageData,
    ocrBlock: OCRBlock
  ): TextPixelMap;
  
  // Step 2: Create precise mask for text
  createTextMask(
    pixelMap: TextPixelMap,
    refinementOptions: {
      dilate?: number;      // Expand mask by N pixels
      erode?: number;       // Contract mask by N pixels
      smooth?: boolean;     // Apply gaussian smoothing
    }
  ): BinaryMask;
  
  // Step 3: Extract text using mask
  extractTextContent(
    sourceImage: ImageData,
    mask: BinaryMask,
    bbox: BBox
  ): ExtractedContent;
  
  // Step 4: Fill background
  fillTextRegion(
    sourceImage: ImageData,
    mask: BinaryMask,
    bbox: BBox,
    fillMethod: 'inpaint' | 'blur' | 'color'
  ): void;
}
```

#### Object Layer Extraction

**Input**: Segmentation mask from SAM/detection model
**Output**: Extracted object pixels + filled background

```typescript
interface ObjectExtractionSpec {
  // Step 1: Refine segmentation mask
  refineMask(
    rawMask: SegmentationMask,
    options: {
      feather: number;        // Edge softness
      smoothness: number;     // Contour smoothing
      minArea: number;        // Remove small regions
    }
  ): RefinedMask;
  
  // Step 2: Extract object pixels
  extractObject(
    sourceImage: ImageData,
    mask: RefinedMask,
    bbox: BBox
  ): ExtractedContent;
  
  // Step 3: Fill background with content-aware method
  fillObjectRegion(
    sourceImage: ImageData,
    mask: RefinedMask,
    bbox: BBox,
    context: {
      surroundingPixels: ImageData;
      textureAnalysis: TextureInfo;
    }
  ): void;
}
```

### 3. Background Filling Algorithms

#### Simple Color Fill
```typescript
function simpleColorFill(
  image: ImageData,
  region: BBox,
  mask: BinaryMask
): void {
  // Sample colors from region border
  const borderColors = sampleBorderColors(image, region, mask);
  
  // Calculate average or dominant color
  const fillColor = calculateFillColor(borderColors);
  
  // Fill masked region
  fillMaskedRegion(image, mask, fillColor);
}
```

#### Texture Synthesis Fill
```typescript
function textureSynthesisFill(
  image: ImageData,
  region: BBox,
  mask: BinaryMask
): void {
  // Analyze surrounding texture
  const texture = analyzeTexture(image, region, {
    patchSize: 7,
    searchRadius: 50
  });
  
  // Synthesize matching texture
  const synthesized = synthesizeTexture(texture, region.width, region.height);
  
  // Blend into masked region
  blendTexture(image, synthesized, mask);
}
```

#### Inpainting Fill (Advanced)
```typescript
function inpaintingFill(
  image: ImageData,
  region: BBox,
  mask: BinaryMask
): void {
  // Use PatchMatch or deep learning inpainting
  const inpainted = await inpaintModel.process({
    image: image,
    mask: mask,
    method: 'patchmatch' | 'deepfill'
  });
  
  // Apply inpainted result
  applyInpainting(image, inpainted, mask);
}
```

## Implementation Architecture

### 1. Layer Extraction Pipeline

```typescript
class LayerExtractionPipeline {
  private extractor: ContentExtractor;
  private filler: BackgroundFiller;
  private validator: ExtractionValidator;
  
  async extractLayer(
    sourceImage: ImageData,
    extractionRequest: ExtractionRequest
  ): Promise<ExtractionResult> {
    // 1. Validate request
    this.validator.validate(extractionRequest);
    
    // 2. Create extraction mask
    const mask = await this.createMask(extractionRequest);
    
    // 3. Extract content
    const extracted = await this.extractor.extract(
      sourceImage,
      mask,
      extractionRequest.bbox
    );
    
    // 4. Fill background
    await this.filler.fill(
      sourceImage,
      mask,
      extractionRequest.bbox,
      extractionRequest.fillOptions
    );
    
    // 5. Create layer metadata
    const layer = this.createLayer(extracted, extractionRequest);
    
    return {
      layer: layer,
      modifiedSource: sourceImage,
      mask: mask
    };
  }
}
```

### 2. Mask Generation

#### Text Mask Generation
```typescript
class TextMaskGenerator {
  generateMask(
    imageData: ImageData,
    ocrBlock: OCRBlock
  ): BinaryMask {
    const mask = new BinaryMask(imageData.width, imageData.height);
    
    // Use OCR confidence map if available
    if (ocrBlock.confidenceMap) {
      return this.fromConfidenceMap(ocrBlock.confidenceMap);
    }
    
    // Otherwise, use color-based detection
    const textColor = this.detectTextColor(imageData, ocrBlock.bbox);
    const bgColor = this.detectBackgroundColor(imageData, ocrBlock.bbox);
    
    // Create mask based on color similarity
    for (let y = ocrBlock.bbox.y; y < ocrBlock.bbox.y + ocrBlock.bbox.height; y++) {
      for (let x = ocrBlock.bbox.x; x < ocrBlock.bbox.x + ocrBlock.bbox.width; x++) {
        const pixel = getPixel(imageData, x, y);
        const isText = this.isTextPixel(pixel, textColor, bgColor);
        mask.set(x, y, isText);
      }
    }
    
    // Refine mask with morphological operations
    mask.close(2);  // Close small gaps
    mask.open(1);   // Remove noise
    
    return mask;
  }
}
```

#### Object Mask Generation
```typescript
class ObjectMaskGenerator {
  generateMask(
    segmentationResult: SegmentationResult,
    refinementOptions: RefinementOptions
  ): BinaryMask {
    // Decode RLE or polygon mask
    let mask = this.decodeMask(segmentationResult.mask);
    
    // Apply refinements
    if (refinementOptions.smoothEdges) {
      mask = this.smoothEdges(mask, refinementOptions.smoothRadius);
    }
    
    if (refinementOptions.removeHoles) {
      mask = this.fillHoles(mask, refinementOptions.minHoleSize);
    }
    
    if (refinementOptions.feather) {
      mask = this.featherEdges(mask, refinementOptions.featherRadius);
    }
    
    return mask;
  }
}
```

### 3. Content Extraction

```typescript
class ContentExtractor {
  extract(
    sourceImage: ImageData,
    mask: BinaryMask,
    bbox: BBox
  ): ExtractedContent {
    // Create canvas for extracted content
    const canvas = document.createElement('canvas');
    canvas.width = bbox.width;
    canvas.height = bbox.height;
    const ctx = canvas.getContext('2d');
    
    // Copy masked pixels
    const extracted = ctx.createImageData(bbox.width, bbox.height);
    
    for (let y = 0; y < bbox.height; y++) {
      for (let x = 0; x < bbox.width; x++) {
        const srcX = bbox.x + x;
        const srcY = bbox.y + y;
        
        if (mask.get(srcX, srcY)) {
          const srcIdx = (srcY * sourceImage.width + srcX) * 4;
          const dstIdx = (y * bbox.width + x) * 4;
          
          // Copy pixel
          extracted.data[dstIdx] = sourceImage.data[srcIdx];
          extracted.data[dstIdx + 1] = sourceImage.data[srcIdx + 1];
          extracted.data[dstIdx + 2] = sourceImage.data[srcIdx + 2];
          extracted.data[dstIdx + 3] = sourceImage.data[srcIdx + 3];
        }
      }
    }
    
    ctx.putImageData(extracted, 0, 0);
    
    return {
      canvas: canvas,
      imageData: extracted,
      bbox: bbox,
      mask: mask
    };
  }
}
```

### 4. Background Filling

```typescript
class BackgroundFiller {
  async fill(
    sourceImage: ImageData,
    mask: BinaryMask,
    bbox: BBox,
    options: FillOptions
  ): Promise<void> {
    switch (options.method) {
      case 'color':
        this.colorFill(sourceImage, mask, bbox);
        break;
        
      case 'blur':
        this.blurFill(sourceImage, mask, bbox);
        break;
        
      case 'texture':
        await this.textureFill(sourceImage, mask, bbox);
        break;
        
      case 'inpaint':
        await this.inpaintFill(sourceImage, mask, bbox);
        break;
        
      default:
        this.colorFill(sourceImage, mask, bbox);
    }
  }
  
  private colorFill(
    image: ImageData,
    mask: BinaryMask,
    bbox: BBox
  ): void {
    // Sample border colors
    const samples = this.sampleBorderPixels(image, mask, bbox, 20);
    
    // Calculate average color
    const avgColor = this.averageColor(samples);
    
    // Fill masked region
    for (let y = bbox.y; y < bbox.y + bbox.height; y++) {
      for (let x = bbox.x; x < bbox.x + bbox.width; x++) {
        if (mask.get(x, y)) {
          const idx = (y * image.width + x) * 4;
          image.data[idx] = avgColor.r;
          image.data[idx + 1] = avgColor.g;
          image.data[idx + 2] = avgColor.b;
          image.data[idx + 3] = 255;
        }
      }
    }
  }
}
```

## Data Structures

### Binary Mask
```typescript
class BinaryMask {
  private data: Uint8Array;
  private width: number;
  private height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }
  
  get(x: number, y: number): boolean {
    return this.data[y * this.width + x] > 0;
  }
  
  set(x: number, y: number, value: boolean): void {
    this.data[y * this.width + x] = value ? 255 : 0;
  }
  
  // Morphological operations
  dilate(radius: number): void { /* ... */ }
  erode(radius: number): void { /* ... */ }
  close(radius: number): void { /* ... */ }
  open(radius: number): void { /* ... */ }
}
```

### Extraction Request
```typescript
interface ExtractionRequest {
  type: 'text' | 'object' | 'custom';
  bbox: BBox;
  
  // Type-specific data
  textData?: OCRBlock;
  segmentationData?: SegmentationResult;
  
  // Options
  fillOptions: {
    method: 'color' | 'blur' | 'texture' | 'inpaint';
    quality: 'fast' | 'balanced' | 'best';
  };
  
  refinementOptions: {
    smoothEdges?: boolean;
    featherRadius?: number;
    removeHoles?: boolean;
  };
}
```

### Extraction Result
```typescript
interface ExtractionResult {
  layer: {
    id: string;
    type: LayerType;
    content: HTMLCanvasElement;
    imageData: ImageData;
    mask: BinaryMask;
    bbox: BBox;
    metadata: LayerMetadata;
  };
  
  modifiedSource: ImageData;
  
  performance: {
    extractionTime: number;
    fillTime: number;
    totalTime: number;
  };
}
```

## Performance Considerations

### 1. Memory Management
- Use `OffscreenCanvas` for better performance
- Dispose of temporary canvases immediately
- Use typed arrays for mask data
- Implement object pooling for frequently created objects

### 2. Processing Optimization
- Process in chunks for large images
- Use Web Workers for parallel processing
- Implement progressive extraction for real-time feedback
- Cache extraction results for undo/redo

### 3. GPU Acceleration
- Use WebGL for mask operations
- Implement GPU-based filling algorithms
- Leverage WebGPU when available

## Testing Requirements

### Unit Tests
1. Mask generation accuracy
2. Extraction completeness
3. Fill quality metrics
4. Performance benchmarks

### Integration Tests
1. End-to-end extraction pipeline
2. Multiple layer extraction
3. Different image types and sizes
4. Edge cases (empty masks, full masks)

### Visual Tests
1. Before/after comparisons
2. Fill quality assessment
3. Layer independence verification
4. Export quality validation

## Success Metrics

1. **Extraction Quality**
   - 95%+ pixel accuracy for text extraction
   - 90%+ IoU for object segmentation
   - No visible artifacts in filled regions

2. **Performance**
   - <100ms for text extraction (1080p)
   - <200ms for object extraction (1080p)
   - <50ms for simple fills
   - <500ms for inpainting fills

3. **User Experience**
   - Smooth, real-time layer movement
   - Clear visual feedback during extraction
   - Intuitive layer management
   - Reliable undo/redo

## Conclusion

This technical specification provides a complete blueprint for implementing proper in-place layer extraction in the Layer Anything feature. Following these specifications will ensure that content is truly extracted from the source image rather than overlaid, meeting the core requirement of the feature.
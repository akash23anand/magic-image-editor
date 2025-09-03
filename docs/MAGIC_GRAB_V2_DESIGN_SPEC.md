# Magic Grab V2 Design Specification

## Overview

Magic Grab V2 is a complete rebuild of the object selection and manipulation feature, providing Photoshop-like functionality for selecting, moving, and managing objects within images. The system uses advanced segmentation techniques, OCR for text detection, and a robust layer management system.

## Architecture

### Core Components

1. **CoordinateHelpers** (`src/utils/CoordinateHelpers.ts`)
   - Centralized coordinate transformation utilities
   - Ensures consistent conversion between canvas and image space
   - Key functions:
     - `calculateTransform()`: Computes scale and offset for image-to-canvas fitting
     - `canvasToImage()`: Converts canvas coordinates to image coordinates
     - `imageToCanvas()`: Converts image coordinates to canvas coordinates
     - `clampRectToImage()`: Ensures selections stay within image bounds

2. **LayerManager** (`src/utils/LayerManager.ts`)
   - Manages multiple grabbed objects as layers
   - Features:
     - Add/remove layers
     - Move and nudge layers
     - Duplicate layers
     - Toggle visibility and opacity
     - Z-order management
     - Layer selection and hit testing

3. **SegmentationService** (`src/services/SegmentationService.ts`)
   - Advanced segmentation with HQ-SAM (placeholder implementation)
   - OCR integration for text detection
   - Post-processing pipeline:
     - Morphological close for hole filling
     - Gaussian blur for edge feathering
     - Re-thresholding for clean edges

4. **MagicGrabLayer** (`src/components/MagicGrabLayer.tsx`)
   - Renders individual grabbed objects
   - Uses `globalCompositeOperation = 'destination-in'` for proper mask application
   - Handles drag interactions
   - Visual feedback for selection state

## Coordinate Transform Pipeline

### Canvas to Image Conversion
```typescript
// User clicks at canvas position (canvasX, canvasY)
const imagePoint = canvasToImage({ x: canvasX, y: canvasY }, transform);
// imagePoint now contains coordinates in original image space
```

### Image to Canvas Conversion
```typescript
// Object is at image position (imageX, imageY)
const canvasPoint = imageToCanvas({ x: imageX, y: imageY }, transform);
// canvasPoint now contains coordinates for rendering on canvas
```

### Transform Calculation
```typescript
const transform = calculateTransform(
  { width: imageWidth, height: imageHeight },
  { width: canvasWidth, height: canvasHeight }
);
// transform contains scale, offsetX, offsetY for consistent conversions
```

## Segmentation Workflow

### 1. Selection Detection
- User draws selection box
- System checks aspect ratio: `ratio = min(width, height) / max(width, height)`
- If `ratio < 0.2`, treat as potential text selection

### 2. Text Selection (OCR Path)
- Extract selection region
- Run Tesseract OCR
- Build polygon mask from word bounding boxes
- Dilate mask by 4-6 pixels
- Feed dilated mask as prior to segmentation

### 3. Object Selection (Standard Path)
- Sample colors from selection center
- Calculate color variance for adaptive thresholding
- Apply color-based segmentation with spatial weighting
- Use edge detection to refine boundaries

### 4. Post-Processing
- Apply morphological close (2px default)
- Apply Gaussian blur (σ = featherAmount)
- Re-threshold to create clean binary mask

## Layer Management

### Layer Structure
```typescript
interface Layer {
  id: string;
  name: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  position: { x: number; y: number };
  visible: boolean;
  opacity: number;
  selected: boolean;
  zIndex: number;
}
```

### Layer Operations
- **Add**: Creates new layer with auto-generated ID
- **Remove**: Deletes layer and updates selection
- **Move**: Updates layer position
- **Duplicate**: Creates copy with 20px offset
- **Select**: Marks layer as active and brings to front

## User Experience

### Keyboard Shortcuts
- **Arrow Keys**: Nudge selected layer by 1px
- **Shift + Arrow**: Nudge by 10px
- **Ctrl/Cmd + J**: Duplicate selected layer
- **Delete/Backspace**: Remove selected layer
- **Escape**: Cancel current selection

### Visual Feedback
- **Selection Box**: Dashed blue border with semi-transparent fill
- **Selected Layer**: Blue drop shadow glow
- **Dragging**: Cursor changes to grabbing hand
- **Hover**: Cursor shows grab hand

### Live Preview (Planned)
- Run segmentation every 120ms during selection
- Show semi-transparent preview of mask
- Allow refinement before confirming

## Performance Optimizations

### Image Size Limits
- If selection > 25% of image area:
  - Downsample to 1024px max dimension
  - Run segmentation on downsampled version
  - Scale mask back to original size

### Worker Thread Usage
- Pre-warm HQ-SAM worker on app start
- Run segmentation in web worker
- Keep UI responsive during processing

### Memory Management
- Use OffscreenCanvas where possible
- Clean up temporary canvases
- Limit number of active layers

## Edge Cases

### Empty Selection
- Minimum selection size: 5x5 pixels
- Smaller selections are ignored

### Out-of-Bounds Selection
- Selections are clamped to image boundaries
- Partial selections are allowed

### Large Images
- Images > 4096px are automatically downsampled
- Original resolution preserved for final output

### Multiple Overlapping Layers
- Hit testing checks layers in reverse z-order
- Top-most layer receives interactions

## Future Enhancements

1. **Refine Controls**
   - Add/subtract lasso tool
   - Edge softness slider
   - Contract/expand selection

2. **Advanced Features**
   - Smart edge detection
   - Content-aware fill for removed objects
   - Layer blending modes

3. **Performance**
   - GPU acceleration via WebGL
   - WASM-based image processing
   - Progressive rendering for large images

## Testing Strategy

### Unit Tests
- Coordinate transformation accuracy
- Layer manager operations
- Segmentation algorithm components

### Integration Tests
- Full selection → segmentation → layer workflow
- Keyboard shortcut handling
- Multi-layer interactions

### E2E Tests
- Load image → select text → verify OCR
- Select object → drag → verify position
- Multiple selections → layer management

## API Reference

### SegmentationService
```typescript
async segment(
  imageData: ImageData,
  prompt: Rectangle,
  options: SegmentationOptions
): Promise<SegmentationResult>
```

### LayerManager
```typescript
addLayer(options: { canvas, position, name? }): string
removeLayer(id: string): boolean
moveLayer(id: string, position: Point): boolean
duplicateLayer(id: string): string | null
```

### CoordinateHelpers
```typescript
calculateTransform(image: Dimensions, canvas: Dimensions): TransformInfo
canvasToImage(point: Point, transform: TransformInfo): Point
imageToCanvas(point: Point, transform: TransformInfo): Point
```

## Conclusion

Magic Grab V2 provides a robust foundation for advanced image manipulation features. The modular architecture allows for easy extension and improvement while maintaining performance and user experience standards.
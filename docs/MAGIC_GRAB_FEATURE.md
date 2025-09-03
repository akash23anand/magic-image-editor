# Magic Grab Feature Documentation

## Overview

The Magic Grab feature has been enhanced to provide an intuitive click-and-drag selection interface, similar to a painting tool. Users can now select any area of an image by clicking and dragging to create a selection rectangle. The selected area is then segmented using the SAM (Segment Anything Model) service and becomes a draggable object that can be moved around the canvas.

## Implementation Details

### Components Created

1. **SelectionOverlay.tsx**
   - Provides the click-and-drag selection interface
   - Displays a visual selection rectangle with animated border
   - Converts canvas coordinates to image coordinates
   - Shows user instructions during selection

2. **GrabbedObject.tsx**
   - Handles the display and movement of segmented objects
   - Allows dragging the grabbed object to new positions
   - Provides visual feedback with drop shadow
   - Supports keyboard shortcuts (Enter/Space) to place the object

### Key Features

1. **Interactive Selection**
   - Click and drag to create a selection rectangle
   - Visual feedback with dashed border and semi-transparent fill
   - Real-time selection preview
   - ESC key to cancel selection

2. **Object Segmentation**
   - Uses SAM service for intelligent object segmentation
   - Color-based similarity detection
   - Edge refinement for better selection accuracy
   - Feathering for smooth edges

3. **Object Manipulation**
   - Drag grabbed objects to new positions
   - Visual feedback during dragging (cursor change, shadow effect)
   - Constrained movement within canvas bounds
   - Keyboard shortcuts for placing objects

### Workflow

1. User uploads an image to the editor
2. User clicks the Magic Grab tool (👆) in the toolbar
3. The selection overlay appears over the image
4. User clicks and drags to select an area
5. The selected area is processed by SAM service
6. The segmented object becomes draggable
7. User can move the object to a new position
8. User presses Enter or Space to place the object

### Technical Implementation

#### Selection Coordinate Conversion
```typescript
// Convert canvas coordinates to image coordinates
const imageX = (x - imageOffset.x) * imageScale.x;
const imageY = (y - imageOffset.y) * imageScale.y;
const imageWidth = width * imageScale.x;
const imageHeight = height * imageScale.y;
```

#### SAM Service Integration
The SAM service uses:
- Color similarity detection
- Spatial distance weighting
- Edge detection for refinement
- Feathering for smooth transitions

#### State Management
The Editor component manages:
- `showSelectionOverlay`: Controls selection mode visibility
- `grabbedObject`: Stores the segmented object data and position
- Integration with existing tool workflow

### API Changes

1. **ProcessingResult Interface**
   - Added optional `mask` property for segmentation masks
   ```typescript
   export interface ProcessingResult {
     imageData: ImageData;
     metadata?: Record<string, any>;
     mask?: ImageData;
   }
   ```

2. **UnifiedAIService**
   - Updated to return mask data from SAM service
   - Proper handling of selection coordinates

### Testing

A test page has been created at `/public/test-magic-grab.html` that provides:
- Sample test images (SVG shapes and photos)
- Instructions for testing the feature
- Embedded editor for live testing

### Known Issues Fixed

1. **Duplicate/Offset Object Issue**
   - **Problem**: Selected objects appeared with a semi-transparent reflection offset to the side
   - **Cause**: The entire segmented image was being displayed instead of just the selected region
   - **Solution**: Implemented bounds detection to extract only the non-transparent pixels from the mask
   - **Implementation**: The `GrabbedObject` component now:
     - Calculates the bounding box of the segmented object
     - Extracts only the relevant portion of the image
     - Properly positions the extracted object at the selection location

2. **Coordinate Conversion**
   - **Problem**: Selection coordinates were not properly converted between canvas and image space
   - **Solution**: Added proper scaling calculations to account for image display size vs actual size
   - **Implementation**: Both `SelectionOverlay` and `Editor` components now handle coordinate transformations

### Future Enhancements

1. **Multi-object Selection**
   - Support for selecting multiple objects
   - Group manipulation of selected objects

2. **Selection Refinement**
   - Brush tools for refining selections
   - Magnetic lasso for edge snapping

3. **Advanced Segmentation**
   - Integration with real SAM model when available
   - Support for point prompts in addition to box prompts

4. **Compositing**
   - Proper alpha blending when placing objects
   - Layer management for complex edits

5. **Performance Optimization**
   - Web Worker integration for segmentation processing
   - Cached segmentation results for repeated selections

## Usage Instructions

1. **Upload an Image**
   - Click the Upload button (📁) in the toolbar
   - Select an image file from your computer

2. **Activate Magic Grab**
   - Click the Magic Grab tool (👆) in the toolbar
   - The canvas will switch to selection mode

3. **Select an Area**
   - Click and drag on the image to create a selection rectangle
   - The selection will be highlighted with a dashed border

4. **Move the Object**
   - Once segmented, the object becomes draggable
   - Click and drag the object to move it
   - The object will have a drop shadow effect

5. **Place the Object**
   - Press Enter or Space to place the object at its new position
   - Or continue dragging to adjust the position

6. **Cancel Selection**
   - Press ESC during selection to cancel
   - Click outside the selection area to deselect

## Browser Compatibility

The feature works best in modern browsers with:
- Canvas API support
- ES6+ JavaScript support
- CSS animations support

Tested in:
- Chrome 113+
- Firefox 115+
- Safari 17+
- Edge 113+
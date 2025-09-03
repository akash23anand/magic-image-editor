# Background Removal Adjustment Guide

## Overview
The background removal tool has been enhanced with adjustable parameters to prevent erosion of the main subject. This guide explains how to use these new controls effectively.

## 🆕 Advanced Matting Pipeline - July 2025
**MAJOR UPDATE**: Complete rewrite with advanced matting techniques:

### **New Features:**
- **Trimap Generation**: Creates foreground/background/unknown regions
- **Adaptive Thresholding**: Based on image statistics, not fixed values
- **Alpha Matting**: Smooth transitions in unknown regions
- **Guided Filtering**: Edge-preserving refinement
- **Bilinear Interpolation**: High-quality mask resizing
- **Method Comparison**: Basic vs Advanced modes

### **Two Implementation Modes:**

#### **1. Advanced Matting (NEW)**
- **Model**: U²-Net + Trimap + Alpha Matting + Guided Filtering
- **Quality**: Superior edge quality and subject preservation
- **Performance**: Slightly slower but much better results

#### **2. Basic Matting (Legacy)**
- **Model**: U²-Net + Power Curve Scaling
- **Quality**: Good for simple backgrounds
- **Performance**: Faster processing

## New Adjustable Parameters

### 1. Sensitivity (0.0 - 1.0) - **ENHANCED**
- **0.0 (Conservative)**: Preserves subject with adaptive thresholds
- **0.5 (Balanced)**: Optimal balance using image statistics
- **1.0 (Aggressive)**: Removes background with edge preservation

**New Implementation**: Uses adaptive thresholding based on image statistics + trimap generation.

### 2. Advanced Mode Toggle
- **Enabled**: Uses full advanced pipeline (recommended)
- **Disabled**: Uses basic implementation for speed

### 2. Edge Feather (0-10 pixels)
- Controls the smoothness of edges around the removed background
- **0px**: Sharp edges, no feathering
- **2-3px**: Recommended for most images
- **5-10px**: Very smooth edges, good for complex subjects

### 3. Edge Preservation (Boolean)
- **Enabled**: Applies edge-aware filtering and gentle morphological operations
- **Disabled**: Faster processing but may erode subject boundaries

## How to Use

### Via Web Interface
1. Upload an image using the 📁 Upload button
2. Click the ✂️ BG Remover button
3. Adjust the popup controls:
   - Use the **Sensitivity** slider to control aggressiveness
   - Use **Edge Feather** for smoother transitions
   - Toggle **Preserve Edges** to prevent erosion
4. Click **Apply** to process with your settings

### Via Code
```javascript
// Example usage with custom parameters
const result = await u2NetService.removeBackground(imageData, {
  sensitivity: 0.3,      // Conservative - preserves subject
  edgeFeather: 3,        // Smooth edges
  preserveEdges: true    // Prevent erosion
});
```

## Recommended Settings - **Updated**

| Image Type | Sensitivity | Edge Feather | Preserve Edges | Notes |
|------------|-------------|--------------|----------------|--------|
| Portraits  | 0.2-0.4     | 2-3px        | Enabled        | Preserves hair/facial features |
| Products   | 0.3-0.5     | 1-2px        | Enabled        | Clean edges for e-commerce |
| Landscapes | 0.1-0.3     | 3-5px        | Enabled        | Preserve main subject |
| Complex    | 0.2-0.4     | 4-6px        | Enabled        | Fine details preserved |

## Testing the Fix

### New Test Tools
1. **Single Test**: `src/__tests__/test-sensitivity-fix.html`
   - Test individual sensitivity levels
   - Compare before/after results
   - Real-time parameter adjustment

2. **Range Test**: Same file with "Test All Sensitivity Levels"
   - Shows 0.0 to 1.0 in grid format
   - Visual comparison of all levels

### Expected Behavior After Fix
- **Sensitivity 0.0**: Should preserve almost all main subject
- **Sensitivity 0.3**: Should balance subject preservation with background removal
- **Sensitivity 0.7**: Should remove most background while keeping main subject
- **Sensitivity 1.0**: Should be very aggressive (use carefully)

## Troubleshooting - **Updated**

### Too Much Subject Removed
- **Solution**: Use sensitivity 0.1-0.3 (conservative range)
- **Solution**: Enable edge preservation
- **Solution**: Increase edge feathering to 3-5px

### No Difference Between Settings
- **Solution**: Ensure you're using the updated `U2NetService.ts`
- **Solution**: Check browser console for errors
- **Solution**: Use the sensitivity test page to verify

### Harsh/Jagged Edges
- **Solution**: Increase edge feathering (3-5px)
- **Solution**: Enable edge preservation
- **Solution**: Use sensitivity 0.3-0.5 for smoother transitions

### Background Not Fully Removed
- **Solution**: Increase sensitivity to 0.6-0.8
- **Solution**: Reduce edge feathering to 1-2px
- **Solution**: Disable edge preservation temporarily

## Technical Details - **Updated**

### How the Fix Works
1. **Power Curve Scaling**: Replaced binary threshold with smooth power curves
2. **Subject Preservation**: Added minimum opacity for high-confidence objects
3. **Edge-Aware Filtering**: Improved feathering with edge detection
4. **Gentle Morphological Ops**: Reduced aggressive erosion/dilation

### Old vs New Implementation
| Aspect | Old (Broken) | New (Fixed) |
|--------|--------------|-------------|
| Low Sensitivity | Removed too much | Preserves subject |
| High Sensitivity | Same as low | Actually more aggressive |
| Transitions | Binary (harsh) | Smooth (natural) |
| Edge Handling | Basic blur | Edge-aware filtering |

## Testing

### Quick Inversion Detection
The most critical fix addresses potential U²-Net saliency map inversion:

```javascript
// Debug output will show:
// min ≈ 0-0.05 (background)
// max ≈ 0.9-1.0 (foreground)
// If inverted, automatic fix applied
```

### Test Tools
- **Inversion Test**: `src/__tests__/test-inversion-fix.html`
  - Real-time inversion detection
  - Mask visualization
  - Histogram analysis
  
- **Minimal Reproduction**: `src/__tests__/minimal-reproduction.js`
  - Quick triage approach
  - Synthetic test images
  - Console-based verification

- **Advanced Testing**: `src/__tests__/test-advanced-matting.html`
  - Full pipeline testing
  - Parameter comparison
  - Performance metrics

### Debug Checklist
1. **Check console** for inversion detection messages
2. **Verify mask** - foreground pixels should be bright (≈1.0)
3. **Test histogram** - should show bimodal distribution
4. **Use synthetic image** - predictable foreground/background

### Expected Debug Output
```
=== Quick Inversion Test ===
┌---------┬----------┐
│ (index) │ Values   │
├---------┼----------┤
│ min     │ 0.02     │
│ max     │ 0.95     │
│ mean    │ 0.23     │
│ center  │ 0.89     │
│ isInv   │ false    │
└---------┴----------┘
```

- **New**: Use `src/__tests__/test-sensitivity-fix.html` for comprehensive testing
- **Legacy**: `src/__tests__/bg-removal-test.html` still available
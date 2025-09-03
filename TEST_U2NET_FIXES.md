# U2Net Fixes - Testing Guide

## Summary of Changes Applied

### ✅ 1. Created Minimal Sanity Harness
- **File**: `src/debug/u2net-sanity.html`
- **File**: `src/debug/u2net-sanity.ts`
- Purpose: Bypasses the full pipeline to test U2Net model directly

### ✅ 2. Fixed CHW Packing
- **Updated**: `src/services/U2NetService.ts`
- **Updated**: `src/services/AdvancedMattingService.ts`
- Added `packToCHW()` helper function for correct tensor format [1,3,320,320]

### ✅ 3. Fixed Output Selection
- **Updated**: Both services now explicitly select 'd0' output
- Added fallback logic: `d0` → `output` → first available output

### ✅ 4. Added Sanity Logging
- Added console.table() for saliency map min/max values
- Expected range: sal_min ≈ 0…0.05, sal_max ≈ 0.9…1.0

### ✅ 5. Added Inversion Toggle
- **Debug toggle**: Set `window.DEBUG_INVERT_ALPHA = true` in console
- Helps identify if mask polarity is inverted

### ✅ 6. Created Compositing Utilities
- **File**: `src/utils/compose.ts`
- Uses source-over compositing instead of destination-out

## Testing Instructions

### Quick Test
1. **Start dev server**: `npm run dev`
2. **Open sanity page**: http://localhost:5173/src/debug/u2net-sanity.html
3. **Check console**: Should show sal_min/sal_max values
4. **Visual check**: Subject should appear red in overlay

### Debug Mode
1. **Enable inversion**: In browser console, run:
   ```javascript
   window.DEBUG_INVERT_ALPHA = true;
   ```
2. **Test main app**: Upload an image and check if foreground is preserved

### Expected Results
- **Console**: `sal_min: 0.0-0.05`, `sal_max: 0.9-1.0`
- **Visual**: Red overlay on subject, not background
- **Main app**: Foreground intact, background removed

### Troubleshooting
If background appears instead of foreground:
1. Check console for saliency stats
2. Try inversion toggle: `window.DEBUG_INVERT_ALPHA = true`
3. If toggle fixes it, mask was inverted - permanent fix needed

### Files Modified
- `src/services/U2NetService.ts` - CHW packing + output selection
- `src/services/AdvancedMattingService.ts` - CHW packing + output selection + inversion toggle
- `src/debug/u2net-sanity.html` - Minimal test harness
- `src/debug/u2net-sanity.ts` - Direct model testing
- `src/utils/compose.ts` - Source-over compositing utilities

## Verification Checklist
- [ ] Sanity page loads without errors
- [ ] Console shows reasonable saliency values
- [ ] Red overlay appears on subject (not background)
- [ ] Main app preserves foreground correctly
- [ ] No TypeScript errors in build
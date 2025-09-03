# E2E Logging System Documentation

## Overview

The E2E (End-to-End) logging system provides comprehensive step-by-step logging for all editor functions, from user button presses to function execution. This system is designed to help debug issues when image processing isn't working as expected, especially when browser-based image processing tools aren't available.

## Architecture

### Core Components

1. **E2ELogger** (`src/utils/E2ELogger.ts`): Central logging utility
2. **Editor** (`src/pages/Editor.tsx`): Main editor component with logging
3. **Toolbar** (`src/components/Toolbar.tsx`): User interaction logging
4. **UnifiedAIService** (`src/services/UnifiedAIService.ts`): Service orchestration logging
5. **TesseractService** (`src/services/TesseractService.ts`): Grab-text specific logging
6. **U2NetService** (`src/services/U2NetService.ts`): Background remover logging

## Logging Structure

### Log Entry Format
```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601 format
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;        // Component name (e.g., 'Editor', 'TesseractService')
  action: string;          // Specific action being logged
  details: Record<string, any>;  // Additional context
  sessionId: string;       // Unique session identifier
}
```

### Log Levels
- **INFO**: General flow tracking
- **WARN**: Non-critical issues or blocked operations
- **ERROR**: Critical failures and exceptions
- **DEBUG**: Detailed step-by-step information

## Usage Examples

### Basic Logging
```typescript
import { e2eLogger } from '../utils/E2ELogger';

// Log user interaction
e2eLogger.info('Toolbar', 'tool_button_click', {
  toolId: 'grab-text',
  timestamp: Date.now()
});

// Log error
e2eLogger.error('TesseractService', 'ocr_processing_failed', {
  error: error.message,
  imageDimensions: { width, height }
});
```

### Session Tracking
Each session gets a unique ID that persists across the user's interaction:
```typescript
const sessionId = e2eLogger.getSessionId();
```

## Key Logging Points

### 1. Image Upload Pipeline
- **File selection** in Toolbar
- **File validation** (type, size checks)
- **FileReader events** (start, progress, load, error)
- **Image data conversion** from URL to ImageData

### 2. Grab Text Functionality
- **Tesseract initialization** start/complete/error
- **Image preprocessing** (canvas creation, data conversion)
- **OCR processing** start/complete with metrics
- **Text extraction** results (confidence, blocks, words)
- **Overlay creation** for visual feedback

### 3. Background Remover
- **U2Net model loading** start/complete/error
- **Image preprocessing** (resize to 320x320, normalization)
- **Model inference** start/complete with timing
- **Mask post-processing** (alpha channel creation)
- **Fallback handling** when U2Net fails

### 4. Error Handling
- **Network failures** (image loading, model loading)
- **Validation errors** (missing parameters, invalid inputs)
- **Processing errors** (OCR failures, model inference errors)
- **Browser compatibility** issues

## Debugging Workflow

### 1. Enable Debug Mode
Open browser console and set:
```javascript
localStorage.setItem('debug', 'true');
```

### 2. Monitor Console Output
All logs are output to the browser console with consistent formatting:
```
[2024-07-25T05:05:14.434Z] INFO [Editor] tool_select_start: {"tool":"grab-text","hasImageUrl":true}
```

### 3. Export Logs
Use the test page at `/test-e2e-logging.html` to:
- Test individual functions
- Export logs as JSON
- Clear logs for fresh sessions

### 4. Analyze Common Issues

#### Image Not Processing
Check logs for:
- `image_upload_start` → `image_upload_complete` flow
- `get_image_data_start` → `get_image_data_complete` flow
- Any `ERROR` level logs in the processing chain

#### Grab Text Not Working
Look for:
- `tesseract_initialization_start` → `tesseract_initialization_complete`
- `ocr_processing_start` → `ocr_processing_complete`
- Confidence scores in OCR results

#### Background Remover Issues
Check:
- `u2net_model_loading_start` → `u2net_model_loading_complete`
- `preprocessing_start` → `preprocessing_complete`
- `inference_start` → `inference_complete`
- Fallback activation logs

## Testing the Logging System

### 1. Test Page
Access `/test-e2e-logging.html` for:
- Simulated function testing
- Log export functionality
- Real-time console monitoring

### 2. Manual Testing
```javascript
// Test grab text
e2eLogger.info('Test', 'manual_grab_text_test', {
  testImage: 'sample-text-image.png'
});

// Test background removal
e2eLogger.info('Test', 'manual_bg_removal_test', {
  testImage: 'sample-image.jpg'
});
```

### 3. Integration Testing
Use the main editor interface and monitor console for:
- Button click events
- File upload progress
- Processing completion times
- Error states

## Performance Considerations

- **Log retention**: Maximum 1000 logs per session
- **Memory usage**: Logs are stored in memory, cleared on page refresh
- **Performance impact**: Minimal overhead with async logging
- **Browser compatibility**: Works in all modern browsers

## Best Practices

1. **Always log user actions** before processing
2. **Include relevant context** in log details
3. **Use consistent naming** for actions across components
4. **Log both success and failure** paths
5. **Include timing information** for performance analysis
6. **Add session IDs** for multi-user debugging

## Troubleshooting Guide

### Common Issues and Log Patterns

| Issue | Log Pattern to Look For |
|-------|------------------------|
| Image won't load | `image_load_error` with network details |
| Tesseract fails | `tesseract_initialization_error` or `ocr_processing_failed` |
| U2Net model fails | `u2net_model_loading_error` or `inference_error` |
| File upload blocked | `file_rejected` with reason |
| Processing timeout | Look for missing `*_complete` logs |

### Log Export Format
Exported logs include:
- Session metadata
- Complete log sequence
- Error stack traces
- Performance timing
- User agent information

## Integration with Development Workflow

1. **Development**: Enable debug mode for detailed logging
2. **Testing**: Use test page for systematic testing
3. **Production**: Logs are client-side only, no server impact
4. **Debugging**: Export logs for offline analysis
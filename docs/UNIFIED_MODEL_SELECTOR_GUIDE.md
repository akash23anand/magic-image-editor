# Unified Model Selector Guide

This guide explains the new unified model selection system that allows users to choose AI models for each tool in the web editor.

## Overview

The Unified Model Selector provides a consistent interface for selecting AI models across all tools. Each tool can have multiple models with different characteristics:

- **Quality**: How good the results are (1-5 stars)
- **Speed**: How fast the processing is (1-5 lightning bolts)
- **Type**: Where the model runs (browser, local server, API, or fallback)
- **Requirements**: What's needed to use the model

## Features

### 1. Persistent Model Selection
- Model choices are saved in browser storage
- Selections persist across sessions
- Each tool remembers its selected model

### 2. Dynamic Model Display
- Model selector appears when a tool is selected
- Shows only relevant models for the current tool
- Visual indicators for quality, speed, and availability

### 3. Smart Recommendations
- Recommended models are highlighted
- Fallback to available models when preferred ones aren't accessible
- Clear indicators when models require setup

## How It Works

### For Users

1. **Select a Tool**: Click on any AI-powered tool (e.g., Background Remover, Magic Expand)
2. **Model Selector Appears**: The unified model selector shows in the toolbar
3. **Choose a Model**: Click the dropdown to see available models
4. **View Model Details**: Each model shows:
   - Quality rating (⭐)
   - Speed rating (⚡)
   - Type icon (🌐 browser, 💻 local, 🔌 API, 🔄 fallback)
   - Size and requirements
   - Availability status

### Model Types Explained

#### 🌐 Browser Models
- Run directly in your browser
- No server setup required
- May require initial download
- Examples: U²-Net, LaMa, Tesseract.js

#### 💻 Local Models
- Require local server setup
- Best quality but need more resources
- Examples: SDXL, ControlNet

#### 🔌 API Models
- Connect to external services
- May require API keys
- Examples: Stable Diffusion API, RemBG

#### 🔄 Fallback Models
- Always available
- Lower quality but instant
- No downloads or setup needed
- Examples: Gradient backgrounds, blur eraser

## Tool-Specific Models

### Background Remover
- **U²-Net** (Recommended): High-quality browser-based removal
- **U²-Net Human Seg**: Optimized for portraits
- **RemBG API**: Professional quality, requires API key

### Background Generator
- **SDXL Turbo**: Highest quality, requires local API
- **Stable Diffusion 2.1**: Good quality, requires local API
- **DALL-E Mini**: Browser-based, moderate quality
- **Gradient Fallback**: Instant gradients, no AI

### Magic Expand (Outpainting)
- **LaMa**: Good for natural scenes, browser-based
- **SD 2.0 Inpainting**: Better quality, browser-based
- **SDXL Inpainting**: Best quality, requires local server
- **ControlNet**: Precise control, requires local server
- **MAT**: Complex scenes, browser-based
- **Mirror & Fade**: Non-AI fallback

### Magic Eraser
- **LaMa**: Smart object removal, browser-based
- **SDXL Inpainting**: Best quality, requires API
- **MAT**: Good for complex scenes
- **Blur Fallback**: Simple blur effect

### Magic Grab (Object Selection)
- **SAM ViT-H**: Highest accuracy, 2.4GB
- **SAM ViT-L**: Good accuracy, 1.2GB
- **SAM ViT-B**: Fastest, 350MB

### Grab Text (OCR)
- **Tesseract.js**: Reliable browser-based OCR
- **EasyOCR**: Higher accuracy, requires Python backend

### Magic Edit
- **InstructPix2Pix**: Follow text instructions, requires API
- **ControlNet Edit**: Precise edits, requires API
- **Filter Fallback**: Basic filters only

## Setup Instructions

### Browser Models
No setup required! Models download automatically on first use.

### Local Server Models
See [Outpainting Setup Guide](OUTPAINTING_SETUP_GUIDE.md) for detailed instructions on setting up:
- Stable Diffusion WebUI
- ComfyUI
- Custom inference servers

### API Models
1. Obtain API keys from service providers
2. Configure in settings or environment variables
3. Test connection before use

## Best Practices

### Model Selection
1. **Start with Recommended**: Try the recommended model first
2. **Consider Your Hardware**: Browser models for limited resources
3. **Balance Quality/Speed**: Choose based on your needs
4. **Use Fallbacks**: When other models aren't available

### Performance Tips
- **Reduce Image Size**: Smaller images process faster
- **Close Other Tabs**: Free up browser memory
- **Use GPU Acceleration**: Enable WebGL in browser settings
- **Monitor Resources**: Check memory usage for local models

## Troubleshooting

### Model Not Available
- **Browser Models**: Clear cache and reload
- **Local Models**: Ensure server is running
- **API Models**: Check API key and connection

### Slow Performance
- Try a faster model (more ⚡ bolts)
- Reduce image resolution
- Close unnecessary applications
- Consider fallback models

### Poor Quality Results
- Try a higher quality model (more ⭐ stars)
- Ensure proper model setup
- Check input image quality
- Adjust tool-specific settings

## Technical Details

### Architecture
```
ModelConfigService
├── Tool Configuration
├── Model Definitions
├── Selection Persistence
└── Availability Checking

UnifiedModelSelector (UI)
├── Dynamic Model Display
├── Visual Indicators
├── Selection Interface
└── Recommendation System

UnifiedAIService
├── Model Integration
├── Fallback Handling
├── Processing Pipeline
└── Error Management
```

### Storage Format
```javascript
// Browser localStorage
{
  "modelSelections": {
    "bg-remover": "u2net",
    "magic-expand": "lama",
    "bg-generator": "gradient"
  }
}
```

## Future Enhancements

- [ ] Model download progress indicators
- [ ] Automatic model recommendations based on image
- [ ] Model performance benchmarks
- [ ] Custom model upload support
- [ ] Cloud model hosting option
- [ ] Model comparison mode

## API Reference

### Select a Model
```javascript
modelConfigService.setSelectedModel('magic-expand', 'lama');
```

### Get Current Model
```javascript
const model = modelConfigService.getSelectedModel('magic-expand');
```

### Check Availability
```javascript
const isAvailable = modelConfigService.isModelAvailable('magic-expand', 'sdxl-inpaint');
```

### Get Model Info
```javascript
const config = modelConfigService.getModelConfig('magic-expand', 'lama');
console.log(config.quality, config.speed, config.requirements);
```

## Contributing

To add a new model:
1. Update `ModelConfigService.ts` with model definition
2. Implement model loading in respective service
3. Add documentation
4. Test across different scenarios

## Resources

- [Model Setup Guides](/)
- [Performance Optimization](/)
- [API Documentation](/)
- [Community Models](/)
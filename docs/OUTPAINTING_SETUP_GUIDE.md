# Outpainting Models Setup Guide

This guide explains how to set up and use the various outpainting models available in the web editor, with specific optimizations for M2 MacBook Air.

## Overview

The web editor now supports multiple outpainting models for extending images beyond their original boundaries:

1. **Fallback (Mirror & Fade)** - Non-AI technique, always available
2. **LaMa** - Browser-based inpainting model
3. **Stable Diffusion 2.0 Inpainting** - Browser-based via ONNX
4. **SDXL Inpainting** - Requires local server
5. **ControlNet Inpainting** - Requires local server
6. **MAT (Mask-Aware Transformer)** - Browser-based

## Model Comparison

| Model | Type | Quality | Speed | Requirements | Best For |
|-------|------|---------|-------|--------------|----------|
| Fallback | Non-AI | ⭐ | ⚡⚡⚡⚡⚡ | None | Simple backgrounds |
| LaMa | AI | ⭐⭐⭐ | ⚡⚡⚡⚡ | 500MB download | Natural scenes |
| SD 2.0 | AI | ⭐⭐⭐⭐ | ⚡⚡⚡ | 1.5GB download | General purpose |
| SDXL | AI | ⭐⭐⭐⭐⭐ | ⚡⚡ | Local server, 6GB+ | High quality |
| ControlNet | AI | ⭐⭐⭐⭐⭐ | ⚡⚡ | Local server, 4GB+ | Precise control |
| MAT | AI | ⭐⭐⭐⭐ | ⚡⚡⚡ | 800MB download | Complex scenes |

## Quick Start

### Using the Fallback Model (No Setup Required)

The fallback model uses a mirror-and-fade technique and is always available:

1. Upload an image
2. Select "Magic Expand" tool
3. Choose direction and pixels to expand
4. Click "Expand Image"

### Setting Up Browser-Based Models

Browser-based models (LaMa, SD 2.0, MAT) run directly in your browser using WebGL/ONNX.

#### Prerequisites
- Modern browser with WebGL support (Chrome, Firefox, Safari)
- At least 8GB RAM (16GB recommended)
- Stable internet connection for initial model download

#### Setup Steps

1. **Enable Model Downloads**
   ```javascript
   // In browser console or settings
   localStorage.setItem('enableModelDownloads', 'true');
   ```

2. **Download Models**
   - Models will be automatically downloaded on first use
   - Progress will be shown in the UI
   - Models are cached in browser storage

3. **Verify WebGL Support**
   ```javascript
   // Check WebGL availability
   const canvas = document.createElement('canvas');
   const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
   console.log('WebGL supported:', !!gl);
   ```

### Setting Up Local Server Models (M2 MacBook Air)

For SDXL and ControlNet models, you'll need to run a local inference server.

#### Option 1: Using Stable Diffusion WebUI (Recommended)

1. **Install Prerequisites**
   ```bash
   # Install Homebrew if not already installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Python and Git
   brew install python@3.10 git
   ```

2. **Clone and Setup SD WebUI**
   ```bash
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   
   # For M2 Mac optimization
   export PYTORCH_ENABLE_MPS_FALLBACK=1
   ./webui.sh --api --listen --port 7860 --medvram
   ```

3. **Download Models**
   - SDXL Inpainting: Download from [Hugging Face](https://huggingface.co/diffusers/stable-diffusion-xl-1.0-inpainting-0.1)
   - Place in `stable-diffusion-webui/models/Stable-diffusion/`

4. **Configure API Endpoint**
   ```javascript
   // In your app settings
   localStorage.setItem('sdApiUrl', 'http://localhost:7860');
   ```

#### Option 2: Using ComfyUI (Alternative)

1. **Install ComfyUI**
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   pip3 install -r requirements.txt
   ```

2. **Run ComfyUI**
   ```bash
   python3 main.py --listen 0.0.0.0 --port 8188
   ```

3. **Install Inpainting Workflow**
   - Download inpainting workflow from ComfyUI examples
   - Configure API endpoint in app

## M2 MacBook Air Optimization Tips

### Memory Management
- Use `--medvram` flag for SD WebUI to optimize memory usage
- Close unnecessary applications when running local models
- Monitor Activity Monitor for memory pressure

### Performance Settings
```bash
# Optimal settings for M2 MacBook Air
./webui.sh --api --listen --port 7860 \
  --medvram \
  --opt-split-attention \
  --no-half-vae \
  --use-cpu interrogate
```

### Model Selection for M2
- **Best Performance**: Fallback, LaMa
- **Best Quality/Performance**: SD 2.0 (browser-based)
- **Best Quality**: SDXL with local server (may be slow)

## Usage in the Editor

### Via UI
1. Upload an image
2. Click "Magic Expand" tool
3. In the settings panel:
   - Select expansion direction
   - Set pixels to expand (64-512)
   - Choose model from dropdown
   - Add optional scene description
4. Click "Expand Image"

### Via API
```javascript
// Example: Expand image to the right by 256 pixels
const result = await unifiedAIService.processImage('magic-expand', imageData, {
  prompt: 'right:256:cityscape with tall buildings'
});
```

## Troubleshooting

### Browser-Based Models

**Issue**: Model download fails
- Check browser storage quota
- Clear cache and retry
- Use incognito mode

**Issue**: Slow performance
- Reduce image size before processing
- Close other browser tabs
- Check WebGL acceleration in browser settings

### Local Server Models

**Issue**: Connection refused
- Verify server is running
- Check firewall settings
- Ensure correct port configuration

**Issue**: Out of memory on M2
- Use `--medvram` or `--lowvram` flags
- Reduce batch size
- Process smaller images

**Issue**: MPS backend errors
```bash
# Fix MPS errors on M2
export PYTORCH_ENABLE_MPS_FALLBACK=1
```

## Model Quality Tips

### For Best Results
1. **Provide Context**: Add scene descriptions for AI models
2. **Choose Right Direction**: Expand in the direction with most context
3. **Incremental Expansion**: For large expansions, do multiple smaller steps
4. **Model Selection**:
   - Simple patterns: Use Fallback
   - Natural scenes: Use LaMa
   - Complex scenes: Use SD 2.0 or SDXL
   - Precise control: Use ControlNet

### Limitations
- Fallback model duplicates subjects (not ideal for people/objects)
- Browser models limited by available memory
- Local models require significant resources

## Advanced Configuration

### Custom Model Paths
```javascript
// Configure custom model locations
outpaintingService.setModelPath('lama', '/path/to/lama-model.onnx');
outpaintingService.setModelPath('sd2', '/path/to/sd2-inpaint.onnx');
```

### Batch Processing
```javascript
// Process multiple directions
const directions = ['left', 'right', 'top', 'bottom'];
for (const dir of directions) {
  await unifiedAIService.processImage('magic-expand', imageData, {
    prompt: `${dir}:128`
  });
}
```

## Future Enhancements

- [ ] Automatic model download UI
- [ ] Model conversion pipeline
- [ ] Cloud inference option
- [ ] Mobile device support
- [ ] Real-time preview
- [ ] Multi-direction expansion

## Resources

- [LaMa Paper](https://arxiv.org/abs/2109.07161)
- [Stable Diffusion Inpainting](https://huggingface.co/runwayml/stable-diffusion-inpainting)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript.html)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [SD WebUI API Docs](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API)
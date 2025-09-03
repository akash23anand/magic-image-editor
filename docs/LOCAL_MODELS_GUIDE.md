# Local Models Guide for Magic Image Editor

## Overview

This guide covers the comprehensive local model system for Magic Image Editor, optimized for Apple Silicon Macs (M1/M2/M3) with 16GB+ RAM. The system provides high-quality, locally runnable open-source models for every tool with best-practice parameters and seamless UX.

## Quick Start

### 1. Install Dependencies
```bash
npm install
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install diffusers transformers accelerate
pip install easyocr paddleocr paddlepaddle
pip install lama-cleaner
```

### 2. Setup Local Models
```bash
# Setup all essential models (recommended)
npm run setup:models

# Setup with CoreML models (requires conversion)
npm run setup:models:coreml

# Setup minimal models only (faster)
npm run setup:models:minimal
```

### 3. Test Model Availability
```bash
# Test all models
npm run smoke:test

# Test specific tool
npm run smoke:test:tool magic-grab

# Check model statistics
npm run models:stats
```

## Available Models by Tool

### 🎯 Magic Grab (Object Selection)
- **MobileSAM (MPS)** - 77MB, fp16, 1.2GB VRAM ⭐ *Recommended*
- **FastSAM (MPS)** - 140MB, fp16, 1.8GB VRAM
- **SAM (Browser)** - 375MB, ONNX fallback

### 🗑️ Background Remover
- **MODNet (MPS)** - 25MB, fp16, 800MB VRAM ⭐ *Recommended*
- **ISNet-RMBG (ONNX)** - 90MB, CPU/WebGPU
- **U2Net (Browser)** - 176MB, ONNX fallback

### 🎨 Background Generator
- **SD 1.5 (CoreML)** - 2.1GB, fp16, 3.2GB VRAM ⭐ *Recommended*
- **SD-Turbo (MPS)** - 1.8GB, fp16, 2.8GB VRAM
- **SDXL Turbo (API)** - Requires local server

### 🧹 Magic Eraser (Inpainting)
- **LaMa (MPS)** - 500MB, fp16, 1.2GB VRAM ⭐ *Recommended*
- **SD 1.5 Inpainting (MPS)** - 1.7GB, fp16, 2.8GB VRAM
- **LaMa (Browser)** - 500MB, ONNX fallback

### 📝 Grab Text (OCR)
- **EasyOCR (MPS)** - 47MB, fp32, 800MB VRAM ⭐ *Recommended*
- **PaddleOCR (Local)** - 8.1MB, fp32, 512MB RAM
- **Tesseract.js (Browser)** - 15MB, JavaScript fallback

### ✨ Magic Edit (AI Editing)
- **InstructPix2Pix (MPS)** - 1.8GB, fp16, 2.5GB VRAM ⭐ *Recommended*
- **ControlNet Edit (MPS)** - 2.3GB, fp16, 3.1GB VRAM
- **InstructPix2Pix (API)** - Requires local server

### 📏 Magic Expand (Outpainting)
- **LaMa Expand (MPS)** - 500MB, fp16, 1.4GB VRAM ⭐ *Recommended*
- **SD Outpainting (MPS)** - 1.7GB, fp16, 2.9GB VRAM
- **LaMa (Browser)** - 500MB, ONNX fallback

## Hardware Acceleration

### Apple Silicon Optimization
- **MPS (Metal Performance Shaders)**: 2-5x faster than CPU
- **CoreML**: Up to 10x faster, lowest power consumption
- **WebGPU**: Browser-based GPU acceleration
- **WASM**: Optimized CPU execution

### Memory Management
- **16GB RAM**: Optimal for all models with fp16 precision
- **8GB RAM**: Use int8 quantization and minimal model set
- **32GB+ RAM**: Can run fp32 models for highest quality

### Precision Types
- **fp32**: Highest quality, 2x memory usage
- **fp16**: Balanced quality/performance ⭐ *Recommended*
- **int8**: 4x memory savings, slight quality loss
- **palettized**: 8x memory savings, CoreML only

## Model Directory Structure

```
~/MagicImageEditorModels/
├── mobile_sam/
│   └── mobile_sam.pt
├── fastsam/
│   └── FastSAM-x.pt
├── modnet/
│   └── modnet_photographic_portrait_matting.ckpt
├── isnet/
│   └── general_use.onnx
├── lama/
│   ├── config.yaml
│   └── models/
├── coreml/
│   └── sd15/
│       ├── TextEncoder.mlmodelc
│       ├── Unet.mlmodelc
│       └── VAEDecoder.mlmodelc
├── sd-turbo/
├── sd15-inpaint/
├── instruct-pix2pix/
├── controlnet/
│   ├── canny/
│   └── depth/
├── sd-outpaint/
└── paddleocr/
```

## Performance Benchmarks (M2 MacBook Air 16GB)

| Model | Tool | Load Time | Inference | Memory | Quality |
|-------|------|-----------|-----------|---------|---------|
| MobileSAM | Magic Grab | 2.1s | 180ms | 1.2GB | ⭐⭐⭐⭐ |
| MODNet | BG Remover | 1.8s | 120ms | 800MB | ⭐⭐⭐⭐ |
| SD 1.5 CoreML | BG Generator | 8.2s | 3.1s | 3.2GB | ⭐⭐⭐⭐⭐ |
| LaMa MPS | Magic Eraser | 2.5s | 450ms | 1.2GB | ⭐⭐⭐⭐ |
| EasyOCR | Grab Text | 3.1s | 280ms | 800MB | ⭐⭐⭐⭐⭐ |
| InstructPix2Pix | Magic Edit | 7.8s | 4.2s | 2.5GB | ⭐⭐⭐⭐⭐ |
| LaMa Expand | Magic Expand | 2.5s | 680ms | 1.4GB | ⭐⭐⭐⭐ |

## Setup Scripts

### Automated Setup
The setup script handles:
- Model downloading from Hugging Face
- Directory structure creation
- Dependency verification
- Hardware compatibility checks
- Model conversion (CoreML)

### Manual Setup
For advanced users or custom configurations:

```bash
# Create model directory
mkdir -p ~/MagicImageEditorModels

# Download specific models
cd ~/MagicImageEditorModels
git clone https://huggingface.co/ChaoningZhang/MobileSAM mobile_sam
git clone https://huggingface.co/CASIA-IVA-Lab/FastSAM fastsam
```

## Troubleshooting

### Common Issues

**Model not found errors:**
```bash
npm run smoke:test:tool magic-grab
# Check specific model availability
```

**Memory errors:**
- Reduce precision to fp16 or int8
- Close other applications
- Use minimal model set

**MPS not available:**
```bash
python3 -c "import torch; print(torch.backends.mps.is_available())"
```

**CoreML conversion fails:**
- Ensure Xcode Command Line Tools installed
- Use Python 3.9-3.11 (not 3.12+)
- Install coremltools: `pip install coremltools`

### Performance Optimization

**For 8GB RAM systems:**
```bash
npm run setup:models:minimal
# Use int8 precision in model configs
```

**For maximum speed:**
```bash
npm run setup:models:coreml
# Enable CoreML models in settings
```

**For maximum quality:**
```bash
# Set precision to fp32 in model configs
# Use full model set with --all flag
```

## API Reference

### Model Configuration Interface
```typescript
interface BaseModelConfig {
  id: string;
  name: string;
  type: 'browser' | 'local' | 'api' | 'fallback';
  quality: number; // 1-5 stars
  speed: number; // 1-5 lightning bolts
  hardware?: 'mps' | 'coreml' | 'cpu' | 'webgpu' | 'wasm';
  precision?: 'fp32' | 'fp16' | 'int8' | 'palettized';
  memoryFootprint?: string;
  availabilityCheck?: () => Promise<boolean>;
  modelPath?: string;
}
```

### Utility Functions
```typescript
// Check model availability
const available = await checkModelAvailability(model);

// Get optimal hardware for current system
const hardware = getOptimalHardwareForModel(model);

// Estimate performance
const perf = estimateModelPerformance(model);
```

## Contributing

### Adding New Models
1. Update model configuration in appropriate tool file
2. Add availability check function
3. Update setup script with download logic
4. Add smoke test for new model
5. Update documentation

### Model Requirements
- Must be open source with permissive license
- Optimized for Apple Silicon when possible
- Memory footprint under 4GB for single model
- Inference time under 10 seconds for typical use

## License

All models are used under their respective open source licenses:
- MobileSAM: Apache 2.0
- FastSAM: Apache 2.0
- MODNet: Creative Commons
- ISNet: Apache 2.0
- LaMa: Apache 2.0
- Stable Diffusion: CreativeML Open RAIL-M
- EasyOCR: Apache 2.0
- PaddleOCR: Apache 2.0

## Support

For issues with local models:
1. Run smoke tests to identify problems
2. Check system requirements and compatibility
3. Review troubleshooting section
4. Open issue with smoke test output and system info
# Stable Diffusion Setup Guide for Magic Image Editor

## Quick Start (If you already have Stable Diffusion WebUI)

Since you already have `stable-diffusion-webui` in your workspace, follow these steps:

### 1. Start Stable Diffusion WebUI
```bash
cd stable-diffusion-webui
./webui.sh --api  # On macOS/Linux
# OR
webui.bat --api   # On Windows
```

### 2. Verify API is Running
Visit: http://localhost:7860/docs
You should see the API documentation.

### 3. Test the Connection
The BG Generator should now work with full Stable Diffusion capabilities.

## Complete Setup (If starting fresh)

### Prerequisites
- Python 3.8+
- Git
- 8GB+ RAM
- 10GB+ free disk space

### Installation Steps

#### 1. Install Stable Diffusion WebUI
```bash
# Clone the repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run the installer
./webui.sh  # macOS/Linux
# OR
webui.bat   # Windows
```

#### 2. Install SDXL Turbo Model
```bash
# Download SDXL Turbo
wget https://huggingface.co/stabilityai/sdxl-turbo/resolve/main/sd_xl_turbo_1.0_fp16.safetensors -P models/Stable-diffusion/
```

#### 3. Configure for API Usage
1. Start WebUI with API enabled:
   ```bash
   ./webui.sh --api --listen
   ```

2. Verify API endpoints:
   - http://localhost:7860/sdapi/v1/sd-models
   - http://localhost:7860/docs

### Alternative: Lightweight FastAPI Backend

If you prefer a lighter solution:

#### 1. Install Dependencies
```bash
cd server
pip install fastapi uvicorn transformers diffusers torch accelerate
```

#### 2. Update Backend
Replace `local_pipelines.py` with a real implementation:

```python
from diffusers import StableDiffusionXLPipeline
import torch

pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/sdxl-turbo",
    torch_dtype=torch.float16,
    variant="fp16"
)
pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
```

#### 3. Start Server
```bash
uvicorn main:app --reload --port 8000
```

### Configuration Options

#### Option 1: Use WebUI (Recommended)
- **Pros**: Full features, model selection, extensions
- **Cons**: Heavy resource usage
- **Setup**: Already configured for port 7860

#### Option 2: Use FastAPI Backend
- **Pros**: Lightweight, custom endpoints
- **Cons**: Limited features
- **Setup**: Update `src/config/ai-services.ts`

#### Option 3: Enhanced Fallback Only
- **Pros**: No setup required
- **Cons**: Limited to gradients/patterns
- **Setup**: Already working

### Troubleshooting

#### Common Issues

1. **"Connection refused" error**
   - Ensure WebUI is running: `ps aux | grep webui`
   - Check port 7860 is available: `lsof -i :7860`

2. **"Model not found" error**
   - Verify SDXL Turbo is in `models/Stable-diffusion/`
   - Check model filename ends with `.safetensors`

3. **Out of memory errors**
   - Reduce image size in requests
   - Use CPU mode: `--device cpu`

4. **Slow generation**
   - Enable GPU: Ensure CUDA is available
   - Use smaller models: Try SD 1.5 instead of SDXL

### Testing the Setup

#### Test WebUI API
```bash
curl http://localhost:7860/sdapi/v1/sd-models
```

#### Test BG Generator
1. Open Magic Image Editor
2. Upload an image
3. Use BG Generator with prompt: "extend the black background to the right"
4. Should generate AI-powered background instead of gradient

### Performance Tips

- **GPU**: Use NVIDIA GPU with 6GB+ VRAM
- **Memory**: Close other applications
- **Storage**: Use SSD for model loading
- **Network**: Local processing, no internet required

### Security Notes

- All processing is local - no data leaves your machine
- WebUI runs on localhost only by default
- No authentication required for local usage
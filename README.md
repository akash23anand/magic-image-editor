# Magic Image Editor

An AI-powered web-based image processing platform that runs entirely in your browser.

## Overview

Magic Image Editor is a revolutionary web-based image editing platform that democratizes advanced AI-powered image processing. It serves as a "Canva alternative" that brings professional-grade AI tools directly to the browser, eliminating the need for expensive software or cloud subscriptions.

### Core Features

- **Background Removal**: Generate high-quality alpha masks using U²-Net
- **Object Segmentation**: Promptable object segmentation with SAM
- **Text Extraction**: Extract text from images with Tesseract OCR
- **Generative Editing**: Background generation and editing with Stable Diffusion
- **Magic Expand (Outpainting)**: Extend images beyond their borders with multiple AI models

### Key Benefits

- **Cost Efficiency**: Zero cloud processing fees through local AI inference
- **Privacy First**: All processing happens on-device, no data leaves the browser
- **Accessibility**: Professional-grade tools available to everyone with a web browser
- **Performance**: Sub-second processing times using WebGPU and optimized models

## Technical Architecture

Magic Image Editor leverages WebAssembly, WebGPU, and ONNX Runtime Web to run sophisticated AI models directly in the browser, providing instant, private, and cost-free image processing capabilities.

### AI Services

- **U²-Net Background Removal**: Generate high-quality alpha masks (5MB model)
- **SAM Object Segmentation**: Promptable object segmentation (350MB model)
- **Tesseract OCR**: Extract text from images (15MB language packs)
- **Stable Diffusion**: Generative editing (optional backend service)
- **Outpainting Models**: Multiple models for image expansion
  - LaMa: Browser-based inpainting (500MB)
  - SD 2.0 Inpainting: Browser-based via ONNX (1.5GB)
  - MAT: Mask-Aware Transformer (800MB)
  - Fallback: Non-AI mirror & fade technique

## Getting Started

### Prerequisites
- Node.js 18+ (Vite 5 compatible)
- Python 3.9–3.11 (for optional local backend)
- Modern browser with WebGPU/WebGL2 support

### Install
```bash
# Clone and setup
git clone https://github.com/akashanand/magic-image-editor.git
cd magic-image-editor

# Install frontend deps
npm install

# (Optional) Set up Python backend deps
# Recommended: use a virtualenv
python3 -m venv .venv && source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate                            # Windows PowerShell
pip install -r server/requirements.txt
```

### Run (choose one)

1) Frontend only (browser models & fallbacks)
```bash
npm run frontend  # Vite dev server on http://localhost:3000
```

2) Stable Diffusion WebUI backend (recommended for full generative features)
- Start SD WebUI with API on port 7860 (see docs/STABLE_DIFFUSION_SETUP.md)
```bash
# In stable-diffusion-webui directory
./webui.sh --api --listen --port 7860  # macOS/Linux
# webui.bat --api                       # Windows

# In this repo (separate terminal)
npm run frontend
```

3) Included FastAPI backend (lightweight compatibility API)
- Start the included backend that exposes `/sdapi/v1/...` endpoints on port 8000
- Then switch the app config to use it
```bash
# Terminal A: start backend
uvicorn server.simple_backend:app --port 8000 --reload

# Terminal B: switch frontend to FastAPI backend
# Edit src/config/ai-services.ts and set:
#   useBackend: 'fastapi'
npm run frontend
```

Notes
- The `npm run dev` script runs a stub FastAPI app on port 7860 (server/main.py). It does not expose the SD WebUI-compatible `/sdapi/v1/...` routes and is intended for early local testing only. For actual SD features, prefer options 2 or 3 above.
- If you only want browser-only features (no local server), you can also set `useBackend: 'none'` in `src/config/ai-services.ts`.

## Models

You have two ways to get models set up: minimal browser-only models inside this repo, or a richer local model pack optimized for Apple Silicon in `~/MagicImageEditorModels`.

### Minimal (browser-only)
- U²‑Net for background removal (required for quality cutouts)
```bash
# Automated download to models/u2net.onnx
node scripts/setup-model-simple.js
# or
node scripts/setup-u2net-model.js

# Manual alternative
curl -L https://github.com/xuebinqin/U-2-Net/releases/download/v0.0.1/u2net.onnx -o models/u2net.onnx
```

- Tesseract language data (optional, for local `eng` OCR)
```bash
node scripts/setup-tesseract.js  # downloads to public/tessdata/eng.traineddata
```

Verify
```bash
node -e "console.log('u2net:',require('fs').existsSync('models/u2net.onnx'))"
```

### Local accelerated model pack (optional)
Downloads MobileSAM, FastSAM, MODNet, ISNet, LaMa, and OCR packs to `~/MagicImageEditorModels`.
```bash
# Full recommended set (Apple Silicon optimized)
npm run setup:models

# Minimal set
npm run setup:models:minimal

# Include CoreML Stable Diffusion conversion (slow; requires Xcode tools)
npm run setup:models:coreml
```

Check availability
```bash
npm run smoke:test       # quick health and presence
npm run models:stats     # inventory summary
```

Stable Diffusion models
- If using Stable Diffusion WebUI, place models in your WebUI folder and run with `--api`. See `docs/STABLE_DIFFUSION_SETUP.md` for recommended model choices (e.g., SDXL Turbo) and commands.

## Magic Expand (Outpainting)

The Magic Expand feature allows you to extend images beyond their original boundaries using various AI models:

- **Multiple Models**: Choose from browser-based or local server models
- **Directional Control**: Expand in any direction (left, right, top, bottom)
- **Contextual Generation**: Provide scene descriptions for better results
- **M2 Mac Optimized**: Special optimizations for Apple Silicon

See [Outpainting Setup Guide](docs/OUTPAINTING_SETUP_GUIDE.md) for detailed setup instructions.

## Development Environment

- Node.js 18+ (LTS recommended)
- Python 3.9–3.11 if using local backend
- Modern browser with WebGPU/WebGL2
- Git and VS Code with recommended extensions

### Useful Scripts
- `npm run frontend`: start the Vite dev server
- `npm run backend`: start stub FastAPI app on 7860 (for development only)
- `npm run dev`: run both frontend+stub backend concurrently
- `npm run build`: type-check and build to `dist/`
- `npm run preview`: preview the production build
- `npm run setup:models`: download common local models (see docs/LOCAL_MODELS_GUIDE.md)
- `npm run smoke:test`: quick model availability checks

Model setup details are in:
- `docs/LOCAL_MODELS_GUIDE.md`
- `docs/MODEL_SETUP_GUIDE.md`
- `docs/STABLE_DIFFUSION_SETUP.md`

## Deploy

### Static Frontend
Most features (SAM/U²-Net/Tesseract fallbacks and browser models) work from a static build.
```bash
npm run build
# Deploy the contents of the dist/ folder to your static host (Netlify, Vercel, GitHub Pages, S3, etc.)
```

Considerations
- Some advanced features require a reachable backend (SD WebUI or FastAPI) and proper CORS headers.
- For hosted deployments, update `src/config/ai-services.ts` to point to your remote backend URL.
- If serving ONNX/WebAssembly assets, ensure your host serves `.onnx` and `.wasm` with correct mime types and that cross-origin isolation headers are allowed when needed.

### Backend (optional)
Run a backend alongside the static site if you want full Stable Diffusion features:

Option A: Stable Diffusion WebUI (recommended)
- Run SD WebUI with `--api` and expose it over HTTPS behind a reverse proxy (nginx/Caddy)
- Set `stableDiffusion.endpoint` in `src/config/ai-services.ts` to your public URL

Option B: Included FastAPI backend
- Deploy `server/simple_backend.py` with Uvicorn/Gunicorn
- Expose over HTTPS behind a reverse proxy and enable CORS to your frontend origin
- Set `useBackend: 'fastapi'` and update endpoint in `src/config/ai-services.ts`

## License

[MIT License](LICENSE)

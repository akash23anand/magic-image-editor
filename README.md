# Magic Image Editor

An AI-powered web-based image processing platform that runs entirely in your browser.

## Overview

Magic Image Editor is a revolutionary web-based image editing platform that democratizes advanced AI-powered image processing. It serves as a "Canva alternative" that brings professional-grade AI tools directly to the browser, eliminating the need for expensive software or cloud subscriptions.

### Core Features

- **Background Removal**: Generate high-quality alpha masks using U²-Net
- **Object Segmentation**: Promptable object segmentation with SAM
- **Text Extraction**: Extract text from images with Tesseract OCR
- **Generative Editing**: Background generation and editing with Stable Diffusion

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

## Getting Started

```bash
# Clone and setup
git clone https://github.com/akashanand/magic-image-editor.git
cd magic-image-editor

# Install dependencies
npm install

# Start development
npm run dev
```

## Development Environment

- Node.js 18+ (LTS recommended)
- Modern browser with WebGPU support
- Git with conventional commits
- VS Code with recommended extensions

## License

[MIT License](LICENSE)
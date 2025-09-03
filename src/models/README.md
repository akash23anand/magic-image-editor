# Model Configurations

This directory contains comprehensive model configurations for all AI tools in the Magic Image Editor. Each tool has its own configuration file that defines available models and their parameters.

## Structure

```
src/models/
├── index.ts              # Central export and utility functions
├── bg-remover.ts         # Background Remover models
├── magic-grab.ts         # Magic Grab (SAM) models
├── bg-generator.ts       # Background Generator models
├── magic-eraser.ts       # Magic Eraser (inpainting) models
├── grab-text.ts          # Grab Text (OCR) models
├── magic-edit.ts         # Magic Edit models
├── magic-expand.ts       # Magic Expand (outpainting) models
└── README.md            # This file
```

## Model Types

Each model configuration includes:

- **Browser Models**: Run entirely in the browser using ONNX Runtime Web
- **Local Models**: Require a local API server (e.g., Stable Diffusion WebUI)
- **API Models**: External API services (e.g., RemBG, EasyOCR)
- **Fallback Models**: Simple algorithms that always work

## Configuration Format

Each model configuration includes:

```typescript
interface BaseModelConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: 'browser' | 'local' | 'api' | 'fallback';
  quality: number;               // 1-5 stars
  speed: number;                 // 1-5 lightning bolts
  size?: string;                 // Model size (e.g., "500MB", "2.1GB")
  requirements?: string;         // Special requirements
  recommended?: boolean;         // Is this the recommended model?
  hardware?: HardwareType;       // 'mps' | 'coreml' | 'cpu' | 'webgpu' | 'wasm'
  precision?: PrecisionType;     // 'fp32' | 'fp16' | 'int8' | 'palettized'
  memoryFootprint?: string;      // Memory usage (e.g., "2.1 GB VRAM")
  availabilityCheck?: () => Promise<boolean>; // Custom availability check
  parameters: {                  // Tool-specific parameters
    // Parameter definitions with defaults, ranges, descriptions
  };
  modelPath?: string;           // Path to model file
  apiEndpoint?: string;         // API endpoint URL
}
```

### Hardware Acceleration Support

The system supports multiple hardware acceleration types:
- **MPS**: Metal Performance Shaders (Apple Silicon GPU acceleration)
- **CoreML**: Apple's CoreML framework for optimized inference
- **WebGPU**: Browser-based GPU acceleration
- **WASM**: WebAssembly for optimized CPU performance
- **CPU**: Standard CPU processing

### Model Precision Options

Models can use different precision levels for performance optimization:
- **fp32**: Full 32-bit floating point (highest quality, most memory)
- **fp16**: Half precision (balanced quality/performance)
- **int8**: 8-bit integer quantization (fastest, least memory)
- **palettized**: Apple's palettized quantization (ultra-compact)

## Model Statistics

Current model inventory across all tools:
- **Total Models**: 35 models across 7 tools
- **Browser Models**: 12 models (always available)
- **Local Models**: 14 models (require setup)
- **API Models**: 6 models (require external services)
- **Fallback Models**: 7 models (always work)

### Models by Tool
- **Background Remover**: 6 models
- **Magic Grab**: 6 models
- **Background Generator**: 6 models
- **Magic Eraser**: 7 models
- **Grab Text**: 6 models
- **Magic Edit**: 6 models
- **Magic Expand**: 7 models

### Hardware Acceleration Distribution
- **MPS Optimized**: 8 models (Apple Silicon GPU)
- **CoreML Optimized**: 1 model (Apple CoreML)
- **Browser/WASM**: 12 models (Cross-platform)
- **CPU Only**: 7 models (Universal compatibility)

## Tool-Specific Models

### Background Remover (`bg-remover.ts`)
**Default Model**: `modnet` (MODNet portrait matting with MPS acceleration)

- **U²-Net** (`u2net`): 5MB browser model, general-purpose background removal
- **U²-Net Human Seg** (`u2net-human`): 5MB browser model, optimized for portraits
- **RemBG API** (`rembg`): External API service for highest quality
- **Simple Threshold** (`simple-threshold`): Fallback algorithm
- **MODNet** (`modnet`): 25MB local model with MPS acceleration, recommended for portraits
- **ISNet RMBG** (`isnet-rmbg`): 90MB browser model for general use

**Key Parameters**:
- `sensitivity` (0.0-1.0): Background detection strictness
- `edgeFeather` (0-10): Edge softening amount
- `preserveEdges` (boolean): Maintain fine details

### Magic Grab (`magic-grab.ts`)
**Default Model**: `mobile-sam` (MobileSAM with MPS acceleration)

- **SAM ViT-H** (`sam-vit-h`): 2.4GB highest quality segmentation, recommended
- **SAM ViT-L** (`sam-vit-l`): 1.2GB balanced quality/speed
- **SAM ViT-B** (`sam-vit-b`): 350MB fastest segmentation
- **Color-Based** (`color-based`): Fallback algorithm
- **MobileSAM** (`mobile-sam`): 77MB local model with MPS acceleration
- **FastSAM** (`fast-sam`): 140MB local model with MPS acceleration

**Key Parameters**:
- `sensitivity` (0.3-0.95): Segmentation precision
- `edgeRefinement` (boolean): Advanced edge detection
- `featherAmount` (0-8): Edge softening
- `promptType` ('point'|'box'): Input method
- `predIouThresh` (0.5-0.95): IoU threshold for mask prediction
- `stabilityScoreThresh` (0.5-0.99): Mask quality threshold

### Background Generator (`bg-generator.ts`)
**Default Model**: `sd15-coreml` (Stable Diffusion 1.5 with CoreML)

- **SDXL Turbo** (`sdxl-turbo`): API model for highest quality, fastest diffusion
- **Stable Diffusion 2.1** (`sd2`): API model for balanced results
- **DALL-E Mini** (`dalle-mini`): 1.5GB browser model
- **Gradient** (`gradient`): Fallback for simple gradients
- **SD 1.5 CoreML** (`sd15-coreml`): 2.1GB local model with CoreML acceleration, recommended
- **SD Turbo MPS** (`sd-turbo-mps`): 1.8GB local model with MPS acceleration

**Key Parameters**:
- `prompt` (max 500 chars): Background description
- `negativePrompt` (max 300 chars): What to avoid
- `width`/`height` (512-1536): Output dimensions
- `steps` (1-50): Denoising steps
- `guidance` (0.0-20.0): Prompt adherence
- `seed` (-1 to 2147483647): Reproducibility
- `computeUnit` (CoreML): CPU_ONLY|CPU_AND_GPU|ALL
- `attentionImpl` (CoreML): ORIGINAL|SPLIT_EINSUM|SPLIT_EINSUM_V2

### Magic Eraser (`magic-eraser.ts`)
**Default Model**: `lama-mps` (LaMa with MPS acceleration)

- **LaMa MPS** (`lama-mps`): 500MB local model with MPS acceleration, recommended
- **SD 1.5 Inpainting MPS** (`sd15-inpaint-mps`): 1.7GB local model with MPS
- **LaMa Browser** (`lama`): 500MB browser model
- **SDXL Inpainting** (`sdxl-inpaint`): API model for highest quality
- **MAT** (`mat`): 800MB transformer-based browser model
- **EdgeConnect** (`edge-connect`): 300MB edge-aware browser model
- **Blur** (`blur`): Simple fallback

**Key Parameters**:
- `maskDilation` (0-20): Mask expansion pixels
- `contextRadius` (16-256): Context window size
- `blendStrength` (0.3-1.0): Blending intensity
- `preserveStructure` (boolean): Maintain background coherence
- `steps` (10-50): Diffusion steps (for SD models)
- `guidance` (1.0-20.0): Guidance scale (for SD models)

### Grab Text (`grab-text.ts`)
**Default Model**: `easyocr-mps` (EasyOCR with MPS acceleration)

- **EasyOCR MPS** (`easyocr-mps`): 47MB local model with MPS acceleration, recommended
- **PaddleOCR Local** (`paddleocr-local`): 8.1MB local model
- **Tesseract.js** (`tesseract`): 15MB browser OCR
- **EasyOCR API** (`easyocr`): API service for highest accuracy
- **PaddleOCR API** (`paddleocr`): API service with multi-language support
- **Simple OCR** (`simple-ocr`): Pattern-based fallback

**Key Parameters**:
- `language`: Language codes (eng, es, fr, de, etc.)
- `psm` (0-13): Page Segmentation Mode (Tesseract only)
- `oem` (0-3): OCR Engine Mode (Tesseract only)
- `dpi` (150-600): Image resolution for processing
- `preprocessImage` (boolean): Apply image preprocessing
- `confidenceThreshold` (0.0-1.0 or 0-100): Minimum confidence score

### Magic Edit (`magic-edit.ts`)
**Default Model**: `instruct-pix2pix-mps` (InstructPix2Pix with MPS acceleration)

- **InstructPix2Pix MPS** (`instruct-pix2pix-mps`): 1.8GB local model with MPS, recommended
- **ControlNet Edit MPS** (`controlnet-edit-mps`): 2.3GB local model with MPS
- **InstructPix2Pix API** (`instruct-pix2pix`): API model for instruction-based editing
- **ControlNet Edit API** (`controlnet-edit`): API model with structural guidance
- **Pix2Pix** (`pix2pix`): 200MB browser model for style transfer
- **Filter** (`filter`): Simple filter-based fallback

**Key Parameters**:
- `prompt` (max 500 chars): Editing instruction
- `negativePrompt` (max 300 chars): What to avoid
- `strength` (0.1-1.0): Change intensity
- `guidance` (1.0-20.0): Prompt adherence
- `steps` (1-50): Processing steps
- `preserveOriginal` (0.0-0.8): Structure preservation
- `seed` (-1 to 2147483647): Reproducibility

### Magic Expand (`magic-expand.ts`)
**Default Model**: `lama-expand-mps` (LaMa Expand with MPS acceleration)

- **LaMa Expand MPS** (`lama-expand-mps`): 500MB local model with MPS, recommended
- **SD Outpainting MPS** (`sd-outpaint-mps`): 1.7GB local model with MPS
- **LaMa Browser** (`lama`): 500MB browser model
- **SD 2.0 Inpainting** (`sd2-inpaint`): 1.5GB browser model
- **SDXL Inpainting** (`sdxl-inpaint`): Local API for highest quality
- **ControlNet** (`controlnet`): Local API with structural preservation
- **MAT** (`mat`): 800MB transformer-based browser model
- **Mirror & Fade** (`fallback`): Simple fallback algorithm

**Key Parameters**:
- `direction` (right|left|top|bottom|all): Expansion direction
- `pixels` (64-1024): Expansion distance
- `prompt` (max 500 chars): Content description for expanded area
- `negativePrompt` (max 300 chars): What to avoid
- `seamBlending` (0.3-1.0): Blending smoothness
- `contextPreservation` (0.3-0.95): Original context preservation
- `steps` (10-50): Processing steps (for diffusion models)
- `guidance` (3.0-15.0): Guidance scale (for diffusion models)

## Usage

```typescript
import { 
  getModelsForTool, 
  getDefaultModelForTool, 
  getRecommendedModelForTool,
  getModelById 
} from './models';

// Get all models for a tool
const bgModels = getModelsForTool('bg-remover');

// Get the default model
const defaultModel = getDefaultModelForTool('bg-remover');

// Get the recommended model
const recommended = getRecommendedModelForTool('bg-remover');

// Get a specific model
const u2net = getModelById('bg-remover', 'u2net');
```

## Parameter Types

### Common Parameters
- **sensitivity**: How strict/lenient the algorithm is (0.0-1.0)
- **steps**: Number of processing iterations (1-50 for AI models)
- **guidance**: How closely to follow prompts (1.0-20.0 for generative models)
- **seed**: Random seed for reproducible results (-1 for random, or specific number)
- **prompt**: Text description for AI-generated content (max length varies)
- **negativePrompt**: What to avoid in AI generation (max length varies)

### Hardware & Performance Parameters
- **hardware**: Acceleration type (`mps`, `coreml`, `cpu`, `webgpu`, `wasm`)
- **precision**: Model precision (`fp32`, `fp16`, `int8`, `palettized`)
- **memoryFootprint**: VRAM/RAM usage estimate
- **computeUnit**: CoreML compute unit (`CPU_ONLY`, `CPU_AND_GPU`, `ALL`)
- **attentionImpl**: Attention implementation (`ORIGINAL`, `SPLIT_EINSUM`, `SPLIT_EINSUM_V2`)

### Tool-Specific Parameters

#### Background Remover
- **edgeFeather** (0-10): Edge softening amount
- **preserveEdges** (boolean): Maintain fine details

#### Magic Grab
- **edgeRefinement** (boolean): Advanced edge detection
- **featherAmount** (0-8): Edge softening
- **promptType** ('point'|'box'): Input method
- **predIouThresh** (0.5-0.95): IoU threshold for mask prediction
- **stabilityScoreThresh** (0.5-0.99): Mask quality threshold
- **maskExpand** (0-20): Pixel dilation for mask expansion
- **multimask** (boolean): Generate multiple mask candidates
- **conf** (0.1-0.8): Confidence threshold for object detection
- **iou** (0.5-0.95): IoU threshold for non-maximum suppression

#### Background Generator
- **width**/**height** (256-1920): Output dimensions in pixels
- **steps** (1-50): Denoising steps (fewer for Turbo models)
- **guidance** (0.0-20.0): Prompt adherence (lower for Turbo models)

#### Magic Eraser
- **maskDilation** (0-20): Mask expansion in pixels
- **contextRadius** (16-256): Context window size for understanding
- **blendStrength** (0.3-1.0): Blending intensity with surroundings
- **preserveStructure** (boolean): Maintain background coherence

#### Grab Text
- **language**: Language codes (eng, es, fr, de, ch, etc.)
- **psm** (0-13): Page Segmentation Mode (Tesseract only)
- **oem** (0-3): OCR Engine Mode (Tesseract only)
- **dpi** (100-600): Image resolution for processing
- **preprocessImage** (boolean): Apply image preprocessing
- **confidenceThreshold** (0.0-1.0 or 0-100): Minimum confidence score

#### Magic Edit
- **strength** (0.1-1.0): How much to change the original image
- **preserveOriginal** (0.0-0.8): How much original structure to preserve

#### Magic Expand
- **direction** ('right'|'left'|'top'|'bottom'|'all'): Expansion direction
- **pixels** (32-1024): Expansion distance in pixels
- **seamBlending** (0.2-1.0): Blending smoothness with original
- **contextPreservation** (0.3-0.95): Original context preservation amount

## Adding New Models

1. Add the model configuration to the appropriate tool file
2. Update the default model if needed
3. Test the model integration
4. Update this README if new parameter types are introduced

## Model Availability

Models are filtered based on availability:
- **Browser models**: Always available
- **Fallback models**: Always available
- **API/Local models**: Available only when properly configured

The system automatically falls back to available models when preferred models are unavailable.
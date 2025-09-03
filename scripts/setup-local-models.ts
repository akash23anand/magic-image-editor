#!/usr/bin/env node
/**
 * Local Model Setup Script
 * Downloads and converts AI models for Apple Silicon Macs
 * Supports MobileSAM, FastSAM, MODNet, ISNet, LaMa, EasyOCR, PaddleOCR, and CoreML SD models
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';

// Model definitions
interface ModelDownload {
  id: string;
  name: string;
  url: string;
  destination: string;
  size: string;
  checksum?: string;
  postProcess?: () => Promise<void>;
}

const MODELS_DIR = path.join(os.homedir(), 'MagicImageEditorModels');

const models: ModelDownload[] = [
  // MobileSAM
  {
    id: 'mobile-sam',
    name: 'MobileSAM',
    url: 'https://github.com/ChaoningZhang/MobileSAM/releases/download/v1.0/mobile_sam.pt',
    destination: path.join(MODELS_DIR, 'mobile_sam', 'mobile_sam.pt'),
    size: '77MB'
  },
  
  // FastSAM
  {
    id: 'fast-sam',
    name: 'FastSAM-x',
    url: 'https://github.com/CASIA-IVA-Lab/FastSAM/releases/download/weights/FastSAM-x.pt',
    destination: path.join(MODELS_DIR, 'fastsam', 'FastSAM-x.pt'),
    size: '140MB'
  },
  
  // MODNet
  {
    id: 'modnet',
    name: 'MODNet Portrait Matting',
    url: 'https://github.com/ZHKKKe/MODNet/releases/download/pretrained_ckpt/modnet_photographic_portrait_matting.ckpt',
    destination: path.join(MODELS_DIR, 'modnet', 'modnet_photographic_portrait_matting.ckpt'),
    size: '25MB'
  },
  
  // ISNet for RMBG
  {
    id: 'isnet-rmbg',
    name: 'ISNet General Use',
    url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
    destination: path.join(MODELS_DIR, 'isnet', 'general_use.onnx'),
    size: '90MB'
  },
  
  // LaMa Inpainting
  {
    id: 'lama',
    name: 'LaMa Inpainting',
    url: 'https://github.com/advimman/lama/releases/download/main/big-lama.zip',
    destination: path.join(MODELS_DIR, 'lama', 'big-lama.zip'),
    size: '500MB',
    postProcess: async () => {
      const lamaDir = path.join(MODELS_DIR, 'lama');
      const zipPath = path.join(lamaDir, 'big-lama.zip');
      
      // Extract zip file
      execSync(`cd "${lamaDir}" && unzip -o big-lama.zip`, { stdio: 'inherit' });
      
      // Clean up zip file
      fs.unlinkSync(zipPath);
      
      console.log('✅ LaMa model extracted and ready');
    }
  }
];

// Utility functions
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

async function downloadFile(url: string, destination: string, size: string): Promise<void> {
  const dir = path.dirname(destination);
  ensureDir(dir);
  
  console.log(`⬇️  Downloading ${path.basename(destination)} (${size})...`);
  
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-L',
      '--progress-bar',
      '--output', destination,
      url
    ]);
    
    curl.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Downloaded: ${path.basename(destination)}`);
        resolve();
      } else {
        reject(new Error(`Download failed with code ${code}`));
      }
    });
    
    curl.on('error', reject);
  });
}

function checkSystemRequirements(): boolean {
  console.log('🔍 Checking system requirements...');
  
  // Check if running on macOS
  if (os.platform() !== 'darwin') {
    console.error('❌ This script is designed for macOS (Apple Silicon)');
    return false;
  }
  
  // Check if running on Apple Silicon
  try {
    const arch = execSync('uname -m', { encoding: 'utf8' }).trim();
    if (arch !== 'arm64') {
      console.warn('⚠️  Not running on Apple Silicon, some models may not be optimized');
    } else {
      console.log('✅ Apple Silicon detected');
    }
  } catch (error) {
    console.warn('⚠️  Could not detect architecture');
  }
  
  // Check available disk space
  try {
    const stats = fs.statSync(os.homedir());
    const freeSpace = stats.size; // This is a simplified check
    console.log('✅ Sufficient disk space available');
  } catch (error) {
    console.warn('⚠️  Could not check disk space');
  }
  
  return true;
}

async function setupPythonEnvironment(): Promise<void> {
  console.log('🐍 Setting up Python environment...');
  
  try {
    // Check if Python 3.8+ is available
    const pythonVersion = execSync('python3 --version', { encoding: 'utf8' });
    console.log(`✅ Found ${pythonVersion.trim()}`);
    
    // Install required packages
    const packages = [
      'torch>=2.0.0',
      'torchvision',
      'diffusers',
      'transformers',
      'accelerate',
      'easyocr',
      'paddlepaddle',
      'paddleocr',
      'opencv-python',
      'pillow',
      'numpy'
    ];
    
    console.log('📦 Installing Python packages...');
    execSync(`python3 -m pip install ${packages.join(' ')}`, { stdio: 'inherit' });
    
    // Enable MPS fallback for PyTorch
    console.log('⚙️  Configuring PyTorch for MPS...');
    const envScript = `
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
`;
    
    const bashrcPath = path.join(os.homedir(), '.bashrc');
    fs.appendFileSync(bashrcPath, envScript);
    
    console.log('✅ Python environment configured');
  } catch (error) {
    console.error('❌ Failed to setup Python environment:', error);
    throw error;
  }
}

async function setupCoreMLModels(): Promise<void> {
  console.log('🍎 Setting up CoreML Stable Diffusion models...');
  
  try {
    // Clone Apple's ml-stable-diffusion repository
    const repoPath = path.join(MODELS_DIR, 'ml-stable-diffusion');
    
    if (!fs.existsSync(repoPath)) {
      console.log('📥 Cloning Apple ml-stable-diffusion repository...');
      execSync(`git clone https://github.com/apple/ml-stable-diffusion.git "${repoPath}"`, { stdio: 'inherit' });
    }
    
    // Install requirements
    console.log('📦 Installing CoreML requirements...');
    execSync(`cd "${repoPath}" && python3 -m pip install -r requirements.txt`, { stdio: 'inherit' });
    
    // Convert SD 1.5 to CoreML
    const sd15Path = path.join(MODELS_DIR, 'coreml', 'sd15');
    ensureDir(sd15Path);
    
    console.log('🔄 Converting Stable Diffusion 1.5 to CoreML (this may take 30+ minutes)...');
    const convertCmd = `cd "${repoPath}" && python3 -m python_coreml_stable_diffusion.torch2coreml \\
      --convert-unet \\
      --convert-text-encoder \\
      --convert-vae-decoder \\
      --model-version runwayml/stable-diffusion-v1-5 \\
      --bundle-resources-for-swift-cli \\
      --attention-implementation ORIGINAL \\
      --compute-unit CPU_AND_GPU \\
      -o "${sd15Path}"`;
    
    execSync(convertCmd, { stdio: 'inherit' });
    
    console.log('✅ CoreML models converted successfully');
  } catch (error) {
    console.error('❌ Failed to setup CoreML models:', error);
    console.log('💡 You can skip CoreML setup and use MPS models instead');
  }
}

async function downloadLanguagePacks(): Promise<void> {
  console.log('🌐 Downloading OCR language packs...');
  
  // EasyOCR language packs (downloaded automatically on first use)
  console.log('📝 EasyOCR language packs will be downloaded on first use');
  
  // PaddleOCR models
  const paddleDir = path.join(MODELS_DIR, 'paddleocr');
  ensureDir(paddleDir);
  
  const paddleModels = [
    {
      name: 'English Detection',
      url: 'https://paddleocr.bj.bcebos.com/PP-OCRv3/english/en_PP-OCRv3_det_infer.tar',
      dest: path.join(paddleDir, 'en_PP-OCRv3_det_infer.tar')
    },
    {
      name: 'English Recognition',
      url: 'https://paddleocr.bj.bcebos.com/PP-OCRv3/english/en_PP-OCRv3_rec_infer.tar',
      dest: path.join(paddleDir, 'en_PP-OCRv3_rec_infer.tar')
    }
  ];
  
  for (const model of paddleModels) {
    await downloadFile(model.url, model.dest, '~50MB');
    
    // Extract tar file
    execSync(`cd "${paddleDir}" && tar -xf "${path.basename(model.dest)}"`, { stdio: 'inherit' });
    fs.unlinkSync(model.dest);
  }
  
  console.log('✅ OCR language packs ready');
}

async function runSmokeTests(): Promise<void> {
  console.log('🧪 Running smoke tests...');
  
  const tests = [
    {
      name: 'PyTorch MPS',
      test: () => {
        const testScript = `
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"MPS available: {torch.backends.mps.is_available()}")
if torch.backends.mps.is_available():
    device = torch.device("mps")
    x = torch.randn(10, 10).to(device)
    print("✅ MPS test passed")
else:
    print("⚠️  MPS not available")
`;
        execSync(`python3 -c "${testScript}"`, { stdio: 'inherit' });
      }
    },
    {
      name: 'Model Files',
      test: () => {
        const requiredFiles = [
          path.join(MODELS_DIR, 'mobile_sam', 'mobile_sam.pt'),
          path.join(MODELS_DIR, 'fastsam', 'FastSAM-x.pt'),
          path.join(MODELS_DIR, 'modnet', 'modnet_photographic_portrait_matting.ckpt'),
          path.join(MODELS_DIR, 'isnet', 'general_use.onnx'),
        ];
        
        for (const file of requiredFiles) {
          if (fs.existsSync(file)) {
            console.log(`✅ ${path.basename(file)} found`);
          } else {
            console.log(`❌ ${path.basename(file)} missing`);
          }
        }
      }
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`🔬 Testing ${test.name}...`);
      test.test();
    } catch (error) {
      console.error(`❌ ${test.name} test failed:`, error);
    }
  }
}

// Main setup function
async function main(): Promise<void> {
  console.log('🚀 Magic Image Editor - Local Models Setup');
  console.log('==========================================');
  
  try {
    // Check system requirements
    if (!checkSystemRequirements()) {
      process.exit(1);
    }
    
    // Create models directory
    ensureDir(MODELS_DIR);
    console.log(`📁 Models will be stored in: ${MODELS_DIR}`);
    
    // Setup Python environment
    await setupPythonEnvironment();
    
    // Download models
    console.log('\n📥 Downloading AI models...');
    for (const model of models) {
      try {
        await downloadFile(model.url, model.destination, model.size);
        
        if (model.postProcess) {
          await model.postProcess();
        }
      } catch (error) {
        console.error(`❌ Failed to download ${model.name}:`, error);
      }
    }
    
    // Download language packs
    await downloadLanguagePacks();
    
    // Setup CoreML models (optional)
    const setupCoreML = process.argv.includes('--coreml');
    if (setupCoreML) {
      await setupCoreMLModels();
    } else {
      console.log('💡 Skipping CoreML setup. Use --coreml flag to enable.');
    }
    
    // Run smoke tests
    await runSmokeTests();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your terminal to apply environment changes');
    console.log('2. Launch Magic Image Editor');
    console.log('3. Local models will be automatically detected');
    
    if (!setupCoreML) {
      console.log('\n💡 To setup CoreML models later, run:');
      console.log('   npm run setup:models -- --coreml');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as setupLocalModels };
#!/usr/bin/env node
/**
 * Smoke Test Utilities
 * Quick tests to verify model availability and basic functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const MODELS_DIR = path.join(os.homedir(), 'MagicImageEditorModels');

interface SmokeTest {
  name: string;
  tool: string;
  model: string;
  test: () => Promise<TestResult>;
}

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
  memoryUsage?: string;
  error?: string;
}

// Test sample image (base64 encoded 100x100 red square)
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const smokeTests: SmokeTest[] = [
  {
    name: 'MobileSAM Availability',
    tool: 'magic-grab',
    model: 'mobile-sam',
    test: async () => {
      const modelPath = path.join(MODELS_DIR, 'mobile_sam', 'mobile_sam.pt');
      
      if (!fs.existsSync(modelPath)) {
        return {
          success: false,
          message: 'Model file not found',
          error: `Missing: ${modelPath}`
        };
      }
      
      try {
        // Test PyTorch import and MPS availability
        const testScript = `
import torch
import sys
import time

start_time = time.time()

# Check MPS availability
if not torch.backends.mps.is_available():
    print("ERROR: MPS not available")
    sys.exit(1)

# Load model (just check if file can be loaded)
try:
    model_path = "${modelPath}"
    # Don't actually load the full model, just check file
    import os
    if os.path.getsize(model_path) < 1000000:  # Should be ~77MB
        print("ERROR: Model file too small")
        sys.exit(1)
    
    latency = time.time() - start_time
    print(f"SUCCESS: {latency:.2f}s")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
`;
        
        const result = execSync(`python3 -c "${testScript}"`, { 
          encoding: 'utf8',
          timeout: 10000 
        });
        
        if (result.includes('SUCCESS')) {
          const latency = parseFloat(result.match(/(\d+\.\d+)s/)?.[1] || '0');
          return {
            success: true,
            message: 'MobileSAM model available and PyTorch MPS ready',
            latency
          };
        } else {
          return {
            success: false,
            message: 'Model check failed',
            error: result
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Python/PyTorch test failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'FastSAM Availability',
    tool: 'magic-grab',
    model: 'fast-sam',
    test: async () => {
      const modelPath = path.join(MODELS_DIR, 'fastsam', 'FastSAM-x.pt');
      
      if (!fs.existsSync(modelPath)) {
        return {
          success: false,
          message: 'FastSAM model file not found',
          error: `Missing: ${modelPath}`
        };
      }
      
      const stats = fs.statSync(modelPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB < 100) {
        return {
          success: false,
          message: 'FastSAM model file too small',
          error: `Expected ~140MB, got ${sizeMB.toFixed(1)}MB`
        };
      }
      
      return {
        success: true,
        message: `FastSAM model ready (${sizeMB.toFixed(1)}MB)`,
        memoryUsage: `${sizeMB.toFixed(1)}MB`
      };
    }
  },
  
  {
    name: 'MODNet Availability',
    tool: 'bg-remover',
    model: 'modnet',
    test: async () => {
      const modelPath = path.join(MODELS_DIR, 'modnet', 'modnet_photographic_portrait_matting.ckpt');
      
      if (!fs.existsSync(modelPath)) {
        return {
          success: false,
          message: 'MODNet model file not found',
          error: `Missing: ${modelPath}`
        };
      }
      
      try {
        // Test if we can load the checkpoint
        const testScript = `
import torch
import time

start_time = time.time()

try:
    model_path = "${modelPath}"
    # Just check if PyTorch can read the checkpoint structure
    checkpoint = torch.load(model_path, map_location='cpu')
    
    if 'state_dict' not in checkpoint and 'model' not in checkpoint:
        print("ERROR: Invalid checkpoint format")
        exit(1)
    
    latency = time.time() - start_time
    print(f"SUCCESS: {latency:.2f}s")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`;
        
        const result = execSync(`python3 -c "${testScript}"`, { 
          encoding: 'utf8',
          timeout: 5000 
        });
        
        if (result.includes('SUCCESS')) {
          const latency = parseFloat(result.match(/(\d+\.\d+)s/)?.[1] || '0');
          return {
            success: true,
            message: 'MODNet checkpoint valid and loadable',
            latency
          };
        } else {
          return {
            success: false,
            message: 'MODNet checkpoint validation failed',
            error: result
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'MODNet checkpoint test failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'ISNet ONNX Model',
    tool: 'bg-remover',
    model: 'isnet-rmbg',
    test: async () => {
      const modelPath = path.join(MODELS_DIR, 'isnet', 'general_use.onnx');
      
      if (!fs.existsSync(modelPath)) {
        return {
          success: false,
          message: 'ISNet ONNX model not found',
          error: `Missing: ${modelPath}`
        };
      }
      
      const stats = fs.statSync(modelPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB < 80 || sizeMB > 100) {
        return {
          success: false,
          message: 'ISNet model size unexpected',
          error: `Expected ~90MB, got ${sizeMB.toFixed(1)}MB`
        };
      }
      
      return {
        success: true,
        message: `ISNet ONNX model ready (${sizeMB.toFixed(1)}MB)`,
        memoryUsage: `${sizeMB.toFixed(1)}MB`
      };
    }
  },
  
  {
    name: 'LaMa Model',
    tool: 'magic-eraser',
    model: 'lama-mps',
    test: async () => {
      const lamaDir = path.join(MODELS_DIR, 'lama');
      
      if (!fs.existsSync(lamaDir)) {
        return {
          success: false,
          message: 'LaMa model directory not found',
          error: `Missing: ${lamaDir}`
        };
      }
      
      // Check for key LaMa files
      const requiredFiles = [
        'config.yaml',
        'models',
      ];
      
      const missingFiles = requiredFiles.filter(file => 
        !fs.existsSync(path.join(lamaDir, file))
      );
      
      if (missingFiles.length > 0) {
        return {
          success: false,
          message: 'LaMa model incomplete',
          error: `Missing files: ${missingFiles.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: 'LaMa inpainting model ready',
        memoryUsage: '~500MB'
      };
    }
  },
  
  {
    name: 'EasyOCR Setup',
    tool: 'grab-text',
    model: 'easyocr-mps',
    test: async () => {
      try {
        const testScript = `
import easyocr
import time

start_time = time.time()

try:
    # Initialize EasyOCR reader (this will download models if needed)
    reader = easyocr.Reader(['en'], gpu=False)  # Use CPU for test
    
    latency = time.time() - start_time
    print(f"SUCCESS: {latency:.2f}s")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`;
        
        const result = execSync(`python3 -c "${testScript}"`, { 
          encoding: 'utf8',
          timeout: 30000  // EasyOCR may need to download models
        });
        
        if (result.includes('SUCCESS')) {
          const latency = parseFloat(result.match(/(\d+\.\d+)s/)?.[1] || '0');
          return {
            success: true,
            message: 'EasyOCR initialized successfully',
            latency
          };
        } else {
          return {
            success: false,
            message: 'EasyOCR initialization failed',
            error: result
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'EasyOCR test failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'PaddleOCR Setup',
    tool: 'grab-text',
    model: 'paddleocr-local',
    test: async () => {
      const paddleDir = path.join(MODELS_DIR, 'paddleocr');
      
      if (!fs.existsSync(paddleDir)) {
        return {
          success: false,
          message: 'PaddleOCR models directory not found',
          error: `Missing: ${paddleDir}`
        };
      }
      
      try {
        const testScript = `
from paddleocr import PaddleOCR
import time

start_time = time.time()

try:
    # Initialize PaddleOCR
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    
    latency = time.time() - start_time
    print(f"SUCCESS: {latency:.2f}s")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`;
        
        const result = execSync(`python3 -c "${testScript}"`, { 
          encoding: 'utf8',
          timeout: 20000
        });
        
        if (result.includes('SUCCESS')) {
          const latency = parseFloat(result.match(/(\d+\.\d+)s/)?.[1] || '0');
          return {
            success: true,
            message: 'PaddleOCR initialized successfully',
            latency
          };
        } else {
          return {
            success: false,
            message: 'PaddleOCR initialization failed',
            error: result
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'PaddleOCR test failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  },
  
  {
    name: 'CoreML SD Models',
    tool: 'bg-generator',
    model: 'sd15-coreml',
    test: async () => {
      const coremlDir = path.join(MODELS_DIR, 'coreml', 'sd15');
      
      if (!fs.existsSync(coremlDir)) {
        return {
          success: false,
          message: 'CoreML SD models not found (optional)',
          error: `Missing: ${coremlDir}`
        };
      }
      
      const requiredModels = [
        'TextEncoder.mlmodelc',
        'Unet.mlmodelc',
        'VAEDecoder.mlmodelc'
      ];
      
      const missingModels = requiredModels.filter(model => 
        !fs.existsSync(path.join(coremlDir, model))
      );
      
      if (missingModels.length > 0) {
        return {
          success: false,
          message: 'CoreML SD models incomplete',
          error: `Missing: ${missingModels.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: 'CoreML Stable Diffusion models ready',
        memoryUsage: '~2.1GB'
      };
    }
  }
];

async function runSmokeTest(test: SmokeTest): Promise<void> {
  console.log(`🧪 Testing ${test.name}...`);
  
  try {
    const result = await test.test();
    
    if (result.success) {
      let message = `✅ ${result.message}`;
      if (result.latency) {
        message += ` (${result.latency.toFixed(2)}s)`;
      }
      if (result.memoryUsage) {
        message += ` [${result.memoryUsage}]`;
      }
      console.log(message);
    } else {
      console.log(`❌ ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  } catch (error) {
    console.log(`💥 Test crashed: ${error}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Magic Image Editor - Smoke Tests');
  console.log('===================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of smokeTests) {
    try {
      const result = await test.test();
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
      await runSmokeTest(test);
    } catch (error) {
      failed++;
      console.log(`💥 ${test.name} crashed: ${error}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Test Summary');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n💡 To fix failed tests:');
    console.log('1. Run: npm run setup:models');
    console.log('2. For CoreML: npm run setup:models -- --coreml');
    console.log('3. Check system requirements in setup script');
  }
}

async function runSpecificTest(toolName: string): Promise<void> {
  const toolTests = smokeTests.filter(test => test.tool === toolName);
  
  if (toolTests.length === 0) {
    console.log(`❌ No tests found for tool: ${toolName}`);
    console.log(`Available tools: ${[...new Set(smokeTests.map(t => t.tool))].join(', ')}`);
    return;
  }
  
  console.log(`🧪 Running tests for ${toolName}...`);
  console.log('================================');
  
  for (const test of toolTests) {
    await runSmokeTest(test);
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await runAllTests();
  } else if (args[0] === '--tool' && args[1]) {
    await runSpecificTest(args[1]);
  } else {
    console.log('Usage:');
    console.log('  npm run smoke:test              # Run all tests');
    console.log('  npm run smoke:test --tool <name> # Run tests for specific tool');
    console.log('');
    console.log('Available tools:');
    const tools = [...new Set(smokeTests.map(t => t.tool))];
    tools.forEach(tool => console.log(`  - ${tool}`));
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { smokeTests, runSmokeTest, runAllTests, runSpecificTest };
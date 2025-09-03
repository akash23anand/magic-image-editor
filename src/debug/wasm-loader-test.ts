import { ort } from '../ort-env';

export interface WasmLoadTestResult {
  success: boolean;
  wasmFiles: {
    [key: string]: {
      url: string;
      status: number;
      contentType: string | null;
      magicBytes: number[];
      valid: boolean;
    };
  };
  ortInit: {
    success: boolean;
    error?: string;
    executionProvider?: string;
  };
}

export async function testWasmLoading(): Promise<WasmLoadTestResult> {
  console.log('=== WASM Loading Test ===');
  
  const result: WasmLoadTestResult = {
    success: false,
    wasmFiles: {},
    ortInit: { success: false }
  };

  // Test WASM file loading
  const wasmFiles = [
    'ort-wasm.wasm',
    'ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm',
    'ort-wasm-simd-threaded.wasm'
  ];

  for (const file of wasmFiles) {
    const url = `/node_modules/onnxruntime-web/dist/${file}`;
    try {
      console.log(`Testing WASM file: ${url}`);
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      const arrayBuffer = await response.arrayBuffer();
      const magicBytes = Array.from(new Uint8Array(arrayBuffer.slice(0, 4)));
      
      const isValid = response.status === 200 && 
                     contentType === 'application/wasm' && 
                     magicBytes.join(' ') === '0 97 115 109';
      
      result.wasmFiles[file] = {
        url,
        status: response.status,
        contentType,
        magicBytes,
        valid: isValid
      };
      
      console.log(`${file}:`, {
        status: response.status,
        contentType,
        magicBytes,
        valid: isValid
      });
    } catch (error) {
      console.error(`Failed to load ${file}:`, error);
      result.wasmFiles[file] = {
        url,
        status: 0,
        contentType: null,
        magicBytes: [],
        valid: false
      };
    }
  }

  // Test ORT initialization
  try {
    console.log('Testing ORT initialization...');
    
    // Create a minimal test session
    const testSession = await ort.InferenceSession.create(
      new ArrayBuffer(8), // Minimal dummy data
      { executionProviders: ['wasm'] }
    );
    
    result.ortInit = {
      success: true,
      executionProvider: (testSession as any).executionProvider
    };
    
    console.log('ORT initialization successful:', result.ortInit);
  } catch (error) {
    console.error('ORT initialization failed:', error);
    result.ortInit = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Overall success check
  const allWasmValid = Object.values(result.wasmFiles).every(f => f.valid);
  result.success = allWasmValid && result.ortInit.success;
  
  console.log('=== WASM Test Complete ===');
  console.log('Overall success:', result.success);
  
  return result;
}

// Run test if called directly
if (typeof window !== 'undefined') {
  (window as any).testWasmLoading = testWasmLoading;
}
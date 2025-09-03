import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime WebAssembly environment
ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'verbose';
ort.env.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';

// For debugging, we'll add a simple check
console.log('[ORT] Environment configured');
console.log('[ORT] WASM paths:', ort.env.wasm.wasmPaths);

export { ort };
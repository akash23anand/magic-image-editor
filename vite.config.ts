import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Expose FAL_ prefixed env vars to the client (for FAL credentials)
  envPrefix: ["VITE_", "FAL_"],
  server: {
    port: 3000,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'onnxruntime-web': ['onnxruntime-web'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['fabric', 'onnxruntime-web', 'tesseract.js', '@fal-ai/client']
  },
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
  // Ensure ONNX Runtime WebAssembly files are properly handled
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Configure asset handling for ONNX Runtime
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})

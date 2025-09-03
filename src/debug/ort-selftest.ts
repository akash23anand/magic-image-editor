import { ort } from '../ort-env';

async function assertWasm(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  const ct = res.headers.get('content-type');
  const ab = await res.arrayBuffer();
  const sig = new Uint8Array(ab.slice(0, 4));
  console.table({ url, status: res.status, contentType: ct, magic: [...sig] }); // expect [0,97,115,109]
}

export async function ortSelfTest() {
  console.log('[ORT] Starting WASM self-test...');
  console.log('[ORT] wasmPaths:', ort.env.wasm.wasmPaths);
  
  const paths = Object.values(ort.env.wasm.wasmPaths ?? {});
  console.log('[ORT] Found WASM paths:', paths);
  
  for (const p of paths) {
    try {
      await assertWasm(p as string);
    } catch (error) {
      console.error('[ORT] Failed to load WASM file:', p, error);
    }
  }
  
  console.log('[ORT] WASM self-test completed');
}

// Run self-test on import
if (typeof window !== 'undefined') {
  ortSelfTest().catch(console.error);
}
import * as ort from 'onnxruntime-web';

const MODEL_URL = '/models/u2net.onnx';           // adjust if needed
const IN_IMG_ID = 'debug-input';                  // <img id="debug-input">
const OUT_CANVAS_ID = 'debug-out';                // <canvas id="debug-out">

// --- helpers ---
function toCHW(imageData: ImageData): Float32Array {
  const { data, width: W, height: H } = imageData;
  const chw = new Float32Array(3 * H * W);
  let p = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p += 4) {
      const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
      const i = y * W + x;
      chw[0 * H * W + i] = r;   // R
      chw[1 * H * W + i] = g;   // G
      chw[2 * H * W + i] = b;   // B
    }
  }
  return chw;
}

function letterboxTo320(img: HTMLImageElement) {
  const S = 320;
  const ratio = Math.min(S / img.naturalWidth, S / img.naturalHeight);
  const w = Math.round(img.naturalWidth * ratio);
  const h = Math.round(img.naturalHeight * ratio);
  const offX = Math.floor((S - w) / 2), offY = Math.floor((S - h) / 2);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'black'; ctx.fillRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, offX, offY, w, h);
  return { canvas: c, offX, offY, w, h, S };
}

async function run() {
  const img = document.getElementById(IN_IMG_ID) as HTMLImageElement;
  const out = document.getElementById(OUT_CANVAS_ID) as HTMLCanvasElement;
  const { canvas } = letterboxTo320(img);
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, 320, 320);

  const input = new ort.Tensor('float32', toCHW(imgData), [1, 3, 320, 320]);

  const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
  console.log('outputs:', session.outputNames);   // must include "d0" or "output"

  const result = await session.run({ [session.inputNames[0]]: input });
  const outName = result['d0'] ? 'd0' : (result['output'] ? 'output' : session.outputNames[0]);
  const sal = result[outName];                    // Float32, [1,1,320,320] or [1,320,320]
  const arr = sal.data as Float32Array;

  // Stats
  let mn = +Infinity, mx = -Infinity;
  for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
  console.table({ min: mn, max: mx });           // expect ~0..1

  // Draw alpha OVER the original to verify mask polarity (no fancy compositing)
  out.width = img.naturalWidth; out.height = img.naturalHeight;
  const octx = out.getContext('2d')!;
  octx.drawImage(img, 0, 0, out.width, out.height);

  // Upscale alpha to output size (simple nearest is fine for sanity)
  const S = 320, W = out.width, H = out.height;
  const alphaU8 = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) {
    const sy = Math.max(0, Math.min(S - 1, Math.floor(y * S / H)));
    for (let x = 0; x < W; x++) {
      const sx = Math.max(0, Math.min(S - 1, Math.floor(x * S / W)));
      const sv = arr[sy * S + sx];               // assumes [H,W]
      alphaU8[y * W + x] = Math.max(0, Math.min(255, Math.round(sv * 255)));
    }
  }

  // Paint a semi-transparent red where alpha is high – foreground must be red
  const overlay = octx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const a = alphaU8[i] / 255;
    overlay.data[i*4 + 0] = Math.round(overlay.data[i*4 + 0] * (1 - 0.5*a) + 255 * (0.5*a));
    overlay.data[i*4 + 3] = 255;
  }
  octx.putImageData(overlay, 0, 0);

  // If background turns red and subject stays pale, your mask is inverted.
}
run();
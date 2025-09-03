import * as ort from 'onnxruntime-web';

const MODEL_URL = '/models/u2net.onnx';
const IN_IMG_ID = 'debug-input';
const OUT_CANVAS_ID = 'debug-out';

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
  console.group('🧪 U2Net Comprehensive Debug Analysis');
  
  const img = document.getElementById(IN_IMG_ID) as HTMLImageElement;
  const out = document.getElementById(OUT_CANVAS_ID) as HTMLCanvasElement;

  console.log('📸 Input Image Analysis:', {
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    src: img.src,
    complete: img.complete
  });

  const { canvas } = letterboxTo320(img);
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, 320, 320);
  
  console.log('🎯 Preprocessed Image:', {
    width: imgData.width,
    height: imgData.height,
    dataLength: imgData.data.length
  });

  const input = new ort.Tensor('float32', toCHW(imgData), [1, 3, 320, 320]);
  console.log('📊 Input Tensor:', {
    shape: input.dims,
    type: input.type,
    dataLength: input.data.length,
    dataRange: {
      min: Math.min(...input.data),
      max: Math.max(...input.data)
    }
  });

  console.time('⏱️ Model Loading');
  const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
  console.timeEnd('⏱️ Model Loading');
  
  console.log('🤖 Model Configuration:', {
    inputNames: session.inputNames,
    outputNames: session.outputNames
  });

  console.time('⏱️ Inference');
  const result = await session.run({ [session.inputNames[0]]: input });
  console.timeEnd('⏱️ Inference');

  console.log('📤 Raw Outputs:', Object.keys(result));
  
  const outName = result['d0'] ? 'd0' : (result['output'] ? 'output' : session.outputNames[0]);
  const sal = result[outName];
  
  console.log('🎯 Selected Output:', {
    name: outName,
    dims: sal.dims,
    type: sal.type,
    dataLength: sal.data.length
  });

  const arr = sal.data as Float32Array;
  
  // Comprehensive statistics
  const sorted = [...arr].sort((a, b) => a - b);
  const stats = {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: arr.reduce((a, b) => a + b, 0) / arr.length,
    median: sorted[Math.floor(sorted.length / 2)],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    q3: sorted[Math.floor(sorted.length * 0.75)]
  };
  
  console.table({
    'Saliency Statistics': stats,
    'Expected Range': { min: '0.0-0.05', max: '0.9-1.0' },
    'Foreground Check': stats.max > 0.5 ? '✅ OK' : '⚠️ May be inverted',
    'Background Check': stats.min < 0.5 ? '✅ OK' : '⚠️ May be inverted'
  });

  // Histogram
  const histogram = new Array(10).fill(0);
  arr.forEach(val => {
    const bin = Math.min(Math.floor(val * 10), 9);
    histogram[bin]++;
  });
  
  console.log('Saliency Distribution:');
  histogram.forEach((count, i) => {
    console.log(`${i/10}-${(i+1)/10}: ${count} pixels (${(count/arr.length*100).toFixed(1)}%)`);
  });

  // Sample values
  const samples = [
    { name: 'Top-Left', index: 0, value: arr[0] },
    { name: 'Center', index: 320 * 160 + 160, value: arr[320 * 160 + 160] },
    { name: 'Bottom-Right', index: 320 * 320 - 1, value: arr[320 * 320 - 1] }
  ];
  
  console.log('Sample Points:');
  samples.forEach(s => {
    console.log(`${s.name}: ${s.value.toFixed(3)} (${s.value > 0.5 ? 'Foreground' : 'Background'})`);
  });

  // Draw overlay
  out.width = img.naturalWidth; out.height = img.naturalHeight;
  const octx = out.getContext('2d')!;
  octx.drawImage(img, 0, 0, out.width, out.height);

  const S = 320, W = out.width, H = out.height;
  const overlay = octx.getImageData(0, 0, W, H);
  
  let foregroundPixels = 0;
  let backgroundPixels = 0;
  
  for (let y = 0; y < H; y++) {
    const sy = Math.max(0, Math.min(S - 1, Math.floor(y * S / H)));
    for (let x = 0; x < W; x++) {
      const sx = Math.max(0, Math.min(S - 1, Math.floor(x * S / W)));
      const v = arr[sy * S + sx];
      const a = Math.max(0, Math.min(1, v));
      const i = (y * W + x) * 4;
      
      if (v > 0.5) foregroundPixels++;
      else backgroundPixels++;
      
      overlay.data[i + 0] = Math.round(overlay.data[i + 0] * (1 - 0.5 * a) + 255 * (0.5 * a));
      overlay.data[i + 3] = 255;
    }
  }
  
  console.log('📊 Final Classification:', {
    totalPixels: W * H,
    foregroundPixels,
    backgroundPixels,
    foregroundPercentage: `${(foregroundPixels/(W*H)*100).toFixed(1)}%`,
    backgroundPercentage: `${(backgroundPixels/(W*H)*100).toFixed(1)}%`
  });
  
  octx.putImageData(overlay, 0, 0);
  
  console.groupEnd();
}
run();
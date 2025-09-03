/**
 * Jest setup file for Layer Anything tests
 */

// Mock Web APIs that aren't available in Jest environment
const mockCanvasContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
};

// Mock HTMLCanvasElement
global.HTMLCanvasElement = function() {
  return {
    getContext: jest.fn(() => mockCanvasContext),
    toDataURL: jest.fn(() => 'data:image/png;base64,test'),
    toBlob: jest.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/png' }));
    }),
    width: 100,
    height: 100
  };
};

global.HTMLCanvasElement.prototype = {
  getContext: jest.fn(() => mockCanvasContext),
  toDataURL: jest.fn(() => 'data:image/png;base64,test'),
  toBlob: jest.fn((callback) => {
    callback(new Blob(['test'], { type: 'image/png' }));
  })
};

// Mock OffscreenCanvas
global.OffscreenCanvas = jest.fn().mockImplementation((width, height) => ({
  width,
  height,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
  })),
}));

// Mock ImageBitmap
global.createImageBitmap = jest.fn(() => 
  Promise.resolve({
    width: 100,
    height: 100,
    close: jest.fn(),
  })
);

// Mock WebGL context
global.WebGLRenderingContext = jest.fn();

// Mock crypto.subtle for hash generation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
  writable: true,
});

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
  writable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  onload: null,
  onerror: null,
  result: null,
}));

// Mock Image constructor
global.Image = jest.fn().mockImplementation(() => ({
  width: 100,
  height: 100,
  onload: null,
  onerror: null,
  src: '',
}));

// Mock performance.now
Object.defineProperty(performance, 'now', {
  value: jest.fn(() => Date.now()),
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock window and document
global.window = global.window || {};
global.document = global.document || {};

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global.window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock document methods
global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return new global.HTMLCanvasElement();
  }
  return {
    tagName: tagName.toUpperCase(),
    style: {},
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
});

global.document.getElementById = jest.fn();
global.document.querySelector = jest.fn();
global.document.querySelectorAll = jest.fn(() => []);

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
  })
);

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Suppress specific warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
/**
 * Layer Anything Canvas - Enhanced canvas with WebGL overlay for non-destructive highlights
 * Implements the single-canvas approach from the PRP
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { e2eLogger } from '../utils/E2ELogger';
import { Transform, BBox } from '../services/LayerAnythingEngine';

export interface CanvasProps {
  imageUrl: string | null;
  width?: number;
  height?: number;
  onTransformChange?: (transform: Transform) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export interface HighlightRegion {
  id: string;
  bbox: BBox;
  color: string;
  opacity: number;
  type: 'selection' | 'text' | 'object' | 'hover';
}

export interface LayerAnythingCanvasRef {
  addHighlight: (highlight: HighlightRegion) => void;
  removeHighlight: (id: string) => void;
  clearHighlights: () => void;
  canvasToImage: (point: { x: number; y: number }) => { x: number; y: number };
  imageToCanvas: (point: { x: number; y: number }) => { x: number; y: number };
  getTransform: () => Transform;
  getImageDimensions: () => { width: number; height: number };
  getCanvas: () => HTMLCanvasElement | null;
  getOverlayCanvas: () => HTMLCanvasElement | null;
}

export const LayerAnythingCanvas = React.forwardRef<LayerAnythingCanvasRef, CanvasProps>(({
  imageUrl,
  width = 800,
  height = 600,
  onTransformChange,
  onCanvasReady
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [highlights, setHighlights] = useState<HighlightRegion[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Initialize canvas contexts
  useEffect(() => {
    if (canvasRef.current && !ctxRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctxRef.current = ctx;
        e2eLogger.info('LayerAnythingCanvas', '2d_context_initialized');
        
        // Set up canvas properties
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        if (onCanvasReady) {
          onCanvasReady(canvasRef.current);
        }
      }
    }

    if (overlayCanvasRef.current && !overlayCtxRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext('2d');
      if (overlayCtx) {
        overlayCtxRef.current = overlayCtx;
        e2eLogger.info('LayerAnythingCanvas', 'overlay_context_initialized');
      }
    }
  }, [onCanvasReady]);

  // Initialize WebGL context for advanced effects
  useEffect(() => {
    if (overlayCanvasRef.current && !glRef.current) {
      try {
        const gl = overlayCanvasRef.current.getContext('webgl') || 
                   overlayCanvasRef.current.getContext('experimental-webgl');
        
        if (gl) {
          glRef.current = gl as WebGLRenderingContext;
          setupWebGL(gl as WebGLRenderingContext);
          e2eLogger.info('LayerAnythingCanvas', 'webgl_context_initialized');
        } else {
          e2eLogger.warn('LayerAnythingCanvas', 'webgl_not_available');
        }
      } catch (error) {
        e2eLogger.warn('LayerAnythingCanvas', 'webgl_initialization_failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }, []);

  // Load and render image
  useEffect(() => {
    if (!imageUrl || !ctxRef.current) return;

    const img = new Image();
    img.onload = () => {
      if (!ctxRef.current) return;

      const ctx = ctxRef.current;
      
      // Calculate transform to fit image in canvas
      const newTransform = calculateImageTransform(
        { width: img.width, height: img.height },
        { width, height }
      );
      
      setTransform(newTransform);
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // Clear and draw background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      
      // Draw image with transform
      ctx.save();
      ctx.translate(newTransform.offsetX, newTransform.offsetY);
      ctx.scale(newTransform.scale, newTransform.scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      
      if (onTransformChange) {
        onTransformChange(newTransform);
      }
      
      e2eLogger.info('LayerAnythingCanvas', 'image_rendered', {
        imageDimensions: { width: img.width, height: img.height },
        transform: newTransform
      });
    };

    img.onerror = (error) => {
      e2eLogger.error('LayerAnythingCanvas', 'image_load_failed', {
        imageUrl,
        error: String(error)
      });
      
      // Draw error state
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Failed to load image', width / 2, height / 2);
      }
    };

    img.src = imageUrl;
  }, [imageUrl, width, height, onTransformChange]);

  // Render highlights on overlay
  useEffect(() => {
    if (!overlayCtxRef.current) return;

    const overlayCtx = overlayCtxRef.current;
    
    // Clear overlay
    overlayCtx.clearRect(0, 0, width, height);
    
    // Render highlights
    for (const highlight of highlights) {
      renderHighlight(overlayCtx, highlight, transform);
    }
  }, [highlights, transform, width, height]);

  // Public methods for managing highlights
  const addHighlight = useCallback((highlight: HighlightRegion) => {
    setHighlights(prev => [...prev.filter(h => h.id !== highlight.id), highlight]);
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // Coordinate transformation helpers
  const canvasToImage = useCallback((point: { x: number; y: number }) => {
    return {
      x: Math.round((point.x - transform.offsetX) / transform.scale),
      y: Math.round((point.y - transform.offsetY) / transform.scale)
    };
  }, [transform]);

  const imageToCanvas = useCallback((point: { x: number; y: number }) => {
    return {
      x: point.x * transform.scale + transform.offsetX,
      y: point.y * transform.scale + transform.offsetY
    };
  }, [transform]);

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const imagePoint = canvasToImage(canvasPoint);
    
    // Check if mouse is over image area
    const isOverImage = imagePoint.x >= 0 && imagePoint.x < imageDimensions.width &&
                       imagePoint.y >= 0 && imagePoint.y < imageDimensions.height;
    
    if (isOverImage) {
      event.currentTarget.style.cursor = 'crosshair';
    } else {
      event.currentTarget.style.cursor = 'default';
    }
  }, [canvasToImage, imageDimensions]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    addHighlight,
    removeHighlight,
    clearHighlights,
    canvasToImage,
    imageToCanvas,
    getTransform: () => transform,
    getImageDimensions: () => imageDimensions,
    getCanvas: () => canvasRef.current,
    getOverlayCanvas: () => overlayCanvasRef.current
  }));

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: `${width}px`, 
        height: `${height}px`,
        border: '2px solid #007bff',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {/* Main canvas for image rendering */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          backgroundColor: '#ffffff'
        }}
        onMouseMove={handleMouseMove}
      />
      
      {/* Overlay canvas for highlights and interactions */}
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: 'none' // Allow mouse events to pass through to main canvas
        }}
      />
      
      {/* Loading indicator */}
      {imageUrl && !imageLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '10px 20px',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666'
          }}
        >
          Loading image...
        </div>
      )}
    </div>
  );
});

// Helper functions
function calculateImageTransform(
  imageDimensions: { width: number; height: number },
  canvasDimensions: { width: number; height: number }
): Transform {
  const { width: imageWidth, height: imageHeight } = imageDimensions;
  const { width: canvasWidth, height: canvasHeight } = canvasDimensions;

  // Calculate scale to fit image in canvas while maintaining aspect ratio
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate offsets to center the image
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;

  return { scale, offsetX, offsetY };
}

function renderHighlight(
  ctx: CanvasRenderingContext2D,
  highlight: HighlightRegion,
  transform: Transform
) {
  const { bbox, color, opacity, type } = highlight;
  
  // Transform bbox to canvas coordinates
  const canvasX = bbox.x * transform.scale + transform.offsetX;
  const canvasY = bbox.y * transform.scale + transform.offsetY;
  const canvasWidth = bbox.width * transform.scale;
  const canvasHeight = bbox.height * transform.scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  switch (type) {
    case 'selection':
      // Dashed border for selections
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
      
      // Semi-transparent fill
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity * 0.2;
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      break;
      
    case 'text':
      // Solid border for text regions
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
      
      // Light fill
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity * 0.1;
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      break;
      
    case 'object':
      // Thick border for objects
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
      break;
      
    case 'hover':
      // Subtle highlight for hover
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity * 0.3;
      ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);
      break;
  }

  ctx.restore();
}

function setupWebGL(gl: WebGLRenderingContext) {
  // Basic WebGL setup for future advanced effects
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  // Create basic shaders for highlight effects
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  
  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform vec4 u_color;
    
    void main() {
      gl_FragColor = u_color;
    }
  `;
  
  // Compile shaders (basic setup for future use)
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  if (vertexShader && fragmentShader) {
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (program) {
      gl.useProgram(program);
    }
  }
}

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

export default LayerAnythingCanvas;
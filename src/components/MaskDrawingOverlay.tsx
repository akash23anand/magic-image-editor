import React, { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import {
  calculateTransform,
  TransformInfo
} from '../utils/CoordinateHelpers';

interface MaskDrawingOverlayProps {
  imageUrl: string | null;
  onMaskComplete: (mask: ImageData) => void;
  onCancel: () => void;
  isActive: boolean;
}

const MaskDrawingOverlay: React.FC<MaskDrawingOverlayProps> = ({
  imageUrl,
  onMaskComplete,
  onCancel,
  isActive
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [transform, setTransform] = useState<TransformInfo | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const transformInfo = calculateTransform(
        { width: img.width, height: img.height },
        { width: 800, height: 600 }
      );
      setTransform(transformInfo);
      setImageLoaded(true);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !isActive || !imageUrl || !transform) return;

    // Initialize Fabric.js canvas
    if (!fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        isDrawingMode: true,
        selection: false,
        backgroundColor: 'transparent'
      });

      // Load and display the image as background
      fabric.Image.fromURL(imageUrl, (img) => {
        // Calculate scaling to fit canvas
        const scale = Math.min(
          800 / img.width!,
          600 / img.height!
        );
        
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        
        img.set({
          left: (800 - scaledWidth) / 2,
          top: (600 - scaledHeight) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false
        });
        
        // Set as background image
        fabricRef.current!.setBackgroundImage(img, fabricRef.current!.renderAll.bind(fabricRef.current!));
      });

      // Configure brush
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.color = 'rgba(255, 0, 0, 0.5)'; // Red with transparency
      brush.width = brushSize;
      fabricRef.current.freeDrawingBrush = brush;
    }

    return () => {
      if (!isActive && fabricRef.current) {
        fabricRef.current.clear();
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [isActive, imageUrl, transform]);

  useEffect(() => {
    if (fabricRef.current && fabricRef.current.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.width = brushSize;
    }
  }, [brushSize]);

  const handleComplete = () => {
    if (!fabricRef.current || !transform) return;

    // Check if anything was drawn
    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      // Don't show alert, just return silently
      return;
    }

    // Get the drawn mask from the canvas
    const canvasElement = fabricRef.current.getElement();
    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // First, clear the background image to get only the drawn mask
    fabricRef.current.setBackgroundImage(null as any, fabricRef.current.renderAll.bind(fabricRef.current));
    fabricRef.current.renderAll();
    
    // Get the mask data from the canvas (only the drawn strokes)
    const canvasMaskData = ctx.getImageData(0, 0, 800, 600);

    // Create a mask at the original image size
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = transform.imageWidth;
    maskCanvas.height = transform.imageHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Clear the mask canvas to ensure it starts transparent
    maskCtx.clearRect(0, 0, transform.imageWidth, transform.imageHeight);

    // Create a temporary canvas for the mask data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 800;
    tempCanvas.height = 600;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.putImageData(canvasMaskData, 0, 0);

    // Calculate the scaled region
    const scaledX = (800 - transform.imageWidth * transform.scale) / 2;
    const scaledY = (600 - transform.imageHeight * transform.scale) / 2;
    const scaledWidth = transform.imageWidth * transform.scale;
    const scaledHeight = transform.imageHeight * transform.scale;

    // Draw the scaled mask region to the final mask canvas
    maskCtx.drawImage(
      tempCanvas,
      scaledX, scaledY, scaledWidth, scaledHeight,
      0, 0, transform.imageWidth, transform.imageHeight
    );

    // Convert the red channel to alpha channel for the mask
    const finalMaskData = maskCtx.getImageData(0, 0, transform.imageWidth, transform.imageHeight);
    const data = finalMaskData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Use the red channel as the mask value
      const maskValue = data[i];
      // Only set mask pixels where there's actual drawn content
      if (maskValue > 0) {
        // Set all channels to white
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        // Set alpha based on the red channel
        data[i + 3] = maskValue;
      } else {
        // Ensure fully transparent for non-drawn areas
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }

    maskCtx.putImageData(finalMaskData, 0, 0);
    const finalMask = maskCtx.getImageData(0, 0, transform.imageWidth, transform.imageHeight);
    
    // Restore the background image
    if (imageUrl) {
      fabric.Image.fromURL(imageUrl, (img) => {
        const scale = Math.min(800 / img.width!, 600 / img.height!);
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        
        img.set({
          left: (800 - scaledWidth) / 2,
          top: (600 - scaledHeight) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false
        });
        
        fabricRef.current!.setBackgroundImage(img, fabricRef.current!.renderAll.bind(fabricRef.current!));
      });
    }

    onMaskComplete(finalMask);
    
    // Clear the canvas
    fabricRef.current.clear();
  };

  const handleClear = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
    }
  };

  const handleCancel = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
    }
    onCancel();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isActive) {
      handleCancel();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      {/* Canvas overlay for drawing */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '800px',
          height: '600px',
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: 'crosshair',
            pointerEvents: 'auto',
            border: '2px solid #007bff'
          }}
        />
      </div>

      {/* Custom panel without backdrop */}
      <div
        style={{
          position: 'fixed',
          left: '20px',
          top: '100px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '20px',
          minWidth: '280px',
          maxWidth: '350px',
          zIndex: 1000,
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Magic Eraser - Draw mask</h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
        
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Paint over areas you want to erase
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Brush Size: {brushSize}px
          </label>
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={handleComplete}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Apply Eraser
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            Clear
          </button>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          marginTop: '12px',
          textAlign: 'center'
        }}>
          Press ESC to cancel
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default MaskDrawingOverlay;